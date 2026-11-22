import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { hashPassword } from '../src/utils/authConfig';
import { INITIAL_MEMBERS } from '../src/data/initialData';

export interface SignedSessionPayload {
  username: string;
  role: string;
  jabatan: string;
  isDemo: boolean;
  iat: number;
  exp: number;
}

export function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, 10000, 16, 'sha256').toString('hex');
}

export function verifyPinMatch(attemptPin: string, storedHashOrPlain: string): boolean {
  if (!attemptPin || !storedHashOrPlain) return false;
  if (storedHashOrPlain.startsWith('pin_v1$')) {
    const parts = storedHashOrPlain.split('$');
    if (parts.length === 3) {
      const derived = hashPin(attemptPin, parts[1]);
      return derived === parts[2];
    }
  }
  return attemptPin === storedHashOrPlain;
}

interface ClaimedAdminCredential {
  salt: string;
  hash: string;
  createdAt: number;
}

interface RateLimitRecord {
  attempts: number;
  firstAttemptTime: number;
  lockedUntil?: number;
}

const SESSION_COOKIE_NAME = 'roboman2_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const globalState = globalThis as typeof globalThis & {
  __roboman2SessionSecret?: string;
  __roboman2ClaimedAdmin?: ClaimedAdminCredential | null;
  __roboman2RateLimitMap?: Map<string, RateLimitRecord>;
  __roboman2RateLimitCleanupStarted?: boolean;
};

if (!globalState.__roboman2RateLimitMap) {
  globalState.__roboman2RateLimitMap = new Map<string, RateLimitRecord>();
}

if (!globalState.__roboman2RateLimitCleanupStarted) {
  globalState.__roboman2RateLimitCleanupStarted = true;
  const timer = setInterval(() => {
    const map = globalState.__roboman2RateLimitMap;
    if (!map) return;
    const now = Date.now();
    for (const [key, record] of map.entries()) {
      if (record.lockedUntil && record.lockedUntil < now) {
        map.delete(key);
      } else if (now - record.firstAttemptTime > RATE_LIMIT_WINDOW_MS && !record.lockedUntil) {
        map.delete(key);
      }
    }
  }, 10 * 60 * 1000);
  if (typeof (timer as any).unref === 'function') {
    (timer as any).unref();
  }
}

function getSessionSecret(): string {
  const envSecret = (process.env.SESSION_SECRET || '').replace(/^["']|["']$/g, '').trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  if (!globalState.__roboman2SessionSecret) {
    globalState.__roboman2SessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return globalState.__roboman2SessionSecret;
}

export function getAdminCredentials() {
  const rawEmail =
    process.env.ADMIN_EMAIL ||
    process.env.VITE_ADMIN_EMAIL ||
    'roboticman2kotabekasi@gmail.com';
  const rawPass = process.env.ADMIN_PASSWORD || '';
  const adminEmail = rawEmail.replace(/^["']|["']$/g, '').trim().toLowerCase();
  const adminPassword = rawPass.replace(/^["']|["']$/g, '').trim();
  const claimedAdmin = globalState.__roboman2ClaimedAdmin || null;
  const adminConfigured = Boolean(adminPassword || claimedAdmin);

  return {
    adminEmail,
    adminPassword,
    claimedAdmin,
    adminConfigured,
    usingEnvSecret: Boolean(adminPassword),
    firstRunSetupRequired: !adminConfigured,
  };
}

function sha256Buffer(value: string): Buffer {
  return crypto.createHash('sha256').update(value, 'utf8').digest();
}

function verifyAdminPassword(rawPasswordAttempt: string): boolean {
  if (!rawPasswordAttempt) return false;
  const { adminPassword, claimedAdmin } = getAdminCredentials();

  if (adminPassword) {
    const attemptBuf = sha256Buffer(rawPasswordAttempt);
    const expectedBuf = sha256Buffer(adminPassword);
    return crypto.timingSafeEqual(attemptBuf, expectedBuf);
  }

  if (claimedAdmin) {
    try {
      const derived = crypto.scryptSync(rawPasswordAttempt, claimedAdmin.salt, 64);
      const expected = Buffer.from(claimedAdmin.hash, 'hex');
      if (derived.length !== expected.length) return false;
      return crypto.timingSafeEqual(derived, expected);
    } catch {
      return false;
    }
  }

  return false;
}

function getBackendSupabase() {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/^["']|["']$/g, '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').replace(/^["']|["']$/g, '').trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

function verifyPbkdf2PasswordMatch(attempt: string, storedHash: string): boolean {
  if (!attempt || !storedHash) return false;

  // 1. Per-user salted PBKDF2 v2
  if (storedHash.startsWith('pbkdf2_v2$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3 || !parts[1] || !parts[2]) return false;
    try {
      const saltBytes = Buffer.from(parts[1], 'hex');
      const derived = crypto.pbkdf2Sync(attempt, saltBytes, 100000, 32, 'sha256').toString('hex');
      const recBuf = Buffer.from(derived, 'hex');
      const expBuf = Buffer.from(parts[2], 'hex');
      return recBuf.length === expBuf.length && crypto.timingSafeEqual(recBuf, expBuf);
    } catch {
      return false;
    }
  }

  // 2. Legacy PBKDF2 v1 (fixed salt)
  if (storedHash.startsWith('pbkdf2$')) {
    try {
      const derived = crypto.pbkdf2Sync(attempt, 'man2_robotics_auth_salt_2026_', 100000, 32, 'sha256').toString('hex');
      const recBuf = Buffer.from(`pbkdf2$${derived}`);
      const expBuf = Buffer.from(storedHash);
      return recBuf.length === expBuf.length && crypto.timingSafeEqual(recBuf, expBuf);
    } catch {
      return false;
    }
  }

  // 3. Legacy SHA-256
  if (/^[0-9a-f]{64}$/i.test(storedHash)) {
    const legacy = crypto.createHash('sha256').update(`man2_robotics_auth_salt_2026_${attempt}`).digest('hex');
    const recBuf = Buffer.from(legacy, 'hex');
    const expBuf = Buffer.from(storedHash, 'hex');
    return recBuf.length === expBuf.length && crypto.timingSafeEqual(recBuf, expBuf);
  }

  return false;
}

export interface StoredMemberUser {
  username: string;
  name: string;
  email: string;
  nisn?: string;
  recoveryPin?: string;
  role: string;
  jabatan: string;
  membershipStatus: string;
  hash: string;
  avatarUrl?: string;
  createdAt: number;
  updatedAt: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'registered_users.json');

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[Data Dir Notice]', err);
  }
}

export function loadRegisteredUsers(): StoredMemberUser[] {
  try {
    ensureDataDir();
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[Load Registered Users Notice]', err);
  }
  return [];
}

export function saveRegisteredUsers(users: StoredMemberUser[]): void {
  try {
    ensureDataDir();
    const tempFile = `${USERS_FILE}.tmp.${Date.now()}`;
    try {
      fs.writeFileSync(tempFile, JSON.stringify(users, null, 2), 'utf8');
      fs.renameSync(tempFile, USERS_FILE);
    } catch {
      // Direct write fallback for volume mounts with restricted atomic rename (Docker/NFS)
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch {}
    }
  } catch (err) {
    console.error('[Save Registered Users Error]', err);
  }
}

function signSessionToken(payload: Omit<SignedSessionPayload, 'iat' | 'exp'>): string {
  const now = Date.now();
  const fullPayload: SignedSessionPayload = {
    ...payload,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const hmac = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('hex');
  return `${encoded}.${hmac}`;
}

export function verifySignedSessionToken(token: string): SignedSessionPayload | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, receivedHmac] = parts;
  if (!encoded || !receivedHmac || !/^[0-9a-f]+$/i.test(receivedHmac)) return null;

  try {
    const expectedHmac = crypto
      .createHmac('sha256', getSessionSecret())
      .update(encoded)
      .digest('hex');
    const recBuf = Buffer.from(receivedHmac, 'hex');
    const expBuf = Buffer.from(expectedHmac, 'hex');
    if (recBuf.length !== expBuf.length || !crypto.timingSafeEqual(recBuf, expBuf)) {
      return null;
    }

    const decodedJson = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = JSON.parse(decodedJson) as SignedSessionPayload;
    if (!parsed || !parsed.username || typeof parsed.exp !== 'number') {
      return null;
    }
    if (Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      result[key] = decodeURIComponent(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

function extractRequestToken(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[SESSION_COOKIE_NAME]) {
    return cookies[SESSION_COOKIE_NAME].trim();
  }
  return '';
}

function isSecureRequest(req: Request): boolean {
  const protoHeader = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  return Boolean(req.secure || protoHeader === 'https');
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const secure = isSecureRequest(req);
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (secure) {
    attrs.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    attrs.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearSessionCookie(req: Request, res: Response): void {
  const secure = isSecureRequest(req);
  const attrs = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
  ];
  if (secure) {
    attrs.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    attrs.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function validateCsrfOrigin(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  const requestedWith = String(req.headers['x-requested-with'] || '').trim();
  if (requestedWith === 'XMLHttpRequest') {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const expectedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();

  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      if (expectedHost && originHost === expectedHost) {
        return next();
      }
    } catch {
      return res.status(403).json({ success: false, error: 'Invalid request origin.' });
    }
    return res.status(403).json({ success: false, error: 'Cross-site request blocked.' });
  }

  if (referer) {
    try {
      const refererHost = new URL(referer).host.toLowerCase();
      if (expectedHost && refererHost === expectedHost) {
        return next();
      }
    } catch {
      return res.status(403).json({ success: false, error: 'Invalid referer.' });
    }
    return res.status(403).json({ success: false, error: 'Cross-site referer blocked.' });
  }

  // Fallback check if bearer token is present in header (non-cookie API client)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Missing CSRF header or same-origin verification.',
  });
}

function validateSetupPasswordStrength(password: string): string | null {
  if (!password || password.length < 12) {
    return 'Admin password must be at least 12 characters.';
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    return 'Admin password must include uppercase, lowercase, numbers, and symbols.';
  }
  return null;
}

export function requireAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractRequestToken(req);
  if (!token || token.startsWith('demo_')) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Strict Administrator Clearance Required.',
      message: 'You do not have permission to access protected admin routes.',
    });
  }

  const verified = verifySignedSessionToken(token);
  if (!verified || verified.isDemo) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Strict Administrator Clearance Required.',
      message: 'Invalid or expired administrator session.',
    });
  }

  const cleanRole = verified.role.toLowerCase();
  const isPrivilegedAdmin = cleanRole === 'admin' || cleanRole === 'advisor' || cleanRole === 'ketua';
  if (!isPrivilegedAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Strict Administrator Clearance Required.',
    });
  }

  (req as any).adminSession = verified;
  return next();
}

export function createApiRouter() {
  const router = express.Router();

  // Public client Supabase config (no secrets)
  router.get('/env-config', (_req: Request, res: Response) => {
    const { adminEmail } = getAdminCredentials();
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/^["']|["']$/g, '').trim();
    const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').replace(/^["']|["']$/g, '').trim();
    res.json({
      adminEmail,
      supabaseUrl,
      supabaseAnonKey,
      nodeEnv: process.env.NODE_ENV || 'production',
    });
  });

  // Health check
  router.get('/health', (_req: Request, res: Response) => {
    const { adminEmail, adminConfigured, usingEnvSecret, firstRunSetupRequired } = getAdminCredentials();
    res.json({
      status: 'ok',
      adminConfigured,
      usingEnvSecret,
      firstRunSetupRequired,
      adminEmail,
      timestamp: new Date().toISOString(),
    });
  });

  // Public check whether initial admin setup is needed
  router.get('/auth/admin-status', (_req: Request, res: Response) => {
    const { adminEmail, adminConfigured, usingEnvSecret, firstRunSetupRequired } = getAdminCredentials();
    res.json({
      adminConfigured,
      usingEnvSecret,
      firstRunSetupRequired,
      adminEmail,
    });
  });

  // First-run atomic admin claim route (only available when ADMIN_PASSWORD env is unset and no claimed hash exists)
  router.post('/auth/setup-admin', validateCsrfOrigin, (req: Request, res: Response) => {
    const { adminEmail, adminPassword, claimedAdmin } = getAdminCredentials();
    if (adminPassword || claimedAdmin) {
      return res.status(409).json({
        success: false,
        message: 'Administrator password is already configured.',
      });
    }

    const password = String(req.body?.password || '').trim();
    const validationError = validateSetupPasswordStrength(password);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    globalState.__roboman2ClaimedAdmin = {
      salt,
      hash,
      createdAt: Date.now(),
    };

    const token = signSessionToken({
      username: 'admin',
      role: 'admin',
      jabatan: 'admin',
      isDemo: false,
    });
    setSessionCookie(req, res, token);

    return res.json({
      success: true,
      message: 'Initial administrator password configured and signed in.',
      token,
      account: {
        username: 'admin',
        name: 'Admin Robotic MAN 2 Kota Bekasi',
        role: 'admin',
        email: adminEmail,
        authProvider: 'credentials',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
        bypassNisnVerification: true,
        isVerifiedMember: true,
        membershipStatus: 'admin',
        jabatan: 'admin',
      },
    });
  });

  // Authenticate administrator or issue isolated demo sandbox session
  router.post('/auth/login', validateCsrfOrigin, async (req: Request, res: Response) => {
    try {
      const { identifier, password } = req.body || {};
      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username/Email and password are required.',
        });
      }

      const normId = String(identifier).trim().toLowerCase();
      const rawPass = String(password).trim();
      const rateLimitMap = globalState.__roboman2RateLimitMap!;

      // Isolated Demo Sandbox accounts
      const demoRoles: Record<string, { name: string; role: string; jabatan: string; bypass: boolean; membershipStatus: string }> = {
        demo_admin: { name: 'Administrator (Demo Head Admin)', role: 'admin', jabatan: 'admin', bypass: true, membershipStatus: 'admin' },
        demo_executive: { name: 'Executive Board Officer (Demo Sandbox)', role: 'Executive Board', jabatan: 'vice_president', bypass: true, membershipStatus: 'executive_board' },
        demo_pembina: { name: 'Abdul Khoir, S.Kom. (Demo Advisor)', role: 'Faculty Advisor', jabatan: 'pembina', bypass: true, membershipStatus: 'aktif' },
        demo_ketua: { name: 'Muhammad Rayhan (Demo Ketua)', role: 'President', jabatan: 'president', bypass: true, membershipStatus: 'executive_board' },
        demo_sekretaris: { name: 'Aisyah Putri (Demo Sekretaris)', role: 'Secretary', jabatan: 'secretary', bypass: true, membershipStatus: 'executive_board' },
        demo_bendahara: { name: 'Siti Rahma (Demo Bendahara)', role: 'Treasurer', jabatan: 'treasurer', bypass: true, membershipStatus: 'executive_board' },
        demo_pr: { name: 'Fauzan Ahnaf (Demo Humas)', role: 'Public Relations', jabatan: 'pr', bypass: true, membershipStatus: 'executive_board' },
        demo_member: { name: 'Adinda Putri (Demo Member)', role: 'Club Member', jabatan: 'member', bypass: false, membershipStatus: 'aktif' },
        demo_tamu: { name: 'Demo Guest', role: 'Demo Guest', jabatan: 'guest', bypass: false, membershipStatus: 'aktif' },
      };

      if (normId in demoRoles) {
        const info = demoRoles[normId];
        const demoToken = `demo_${crypto.randomBytes(16).toString('hex')}`;
        return res.json({
          success: true,
          message: 'Signed in as Demo Sandbox account (Isolated testing environment).',
          token: demoToken,
          account: {
            username: normId,
            name: info.name,
            role: info.role,
            email: `${normId}@man2kotabekasi.sch.id`,
            authProvider: 'credentials',
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${normId}`,
            isDemo: true,
            bypassNisnVerification: info.bypass,
            isVerifiedMember: true,
            membershipStatus: info.membershipStatus,
            jabatan: info.jabatan,
          },
        });
      }

      const clientIp = req.ip || req.socket.remoteAddress || 'ip_unknown';
      const rateLimitKey = `${clientIp}__${normId}`;
      const accountRateKey = `acc__${normId}`;
      const now = Date.now();

      const rateRecord = rateLimitMap.get(rateLimitKey) || rateLimitMap.get(accountRateKey);
      if (rateRecord && rateRecord.lockedUntil && rateRecord.lockedUntil > now) {
        const remainingSeconds = Math.ceil((rateRecord.lockedUntil - now) / 1000);
        return res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: `Terlalu banyak percobaan login yang gagal. Akun/IP ini diblokir sementara selama ${remainingSeconds} detik.`,
          retryAfter: remainingSeconds,
        });
      }

      const { adminEmail, adminConfigured } = getAdminCredentials();
      const envUsername = adminEmail.split('@')[0].toLowerCase();

      const isMatchedAdminId =
        normId === adminEmail ||
        normId === envUsername ||
        normId === 'admin' ||
        normId === 'roboticman2kotabekasi';

      if (isMatchedAdminId && !adminConfigured) {
        return res.status(401).json({
          success: false,
          firstRunSetupRequired: true,
          message: 'Administrator password is not configured yet in .env file. Contact server administrator.',
        });
      }

      if (isMatchedAdminId && verifyAdminPassword(rawPass)) {
        rateLimitMap.delete(rateLimitKey);
        rateLimitMap.delete(accountRateKey);

        const username = 'admin';
        const name = 'Admin Robotic MAN 2 Kota Bekasi';
        const role = 'admin';
        const jabatan = 'admin';
        const membershipStatus = 'admin';

        const sessionToken = signSessionToken({
          username,
          role,
          jabatan,
          isDemo: false,
        });

        setSessionCookie(req, res, sessionToken);

        return res.json({
          success: true,
          message: 'Administrator login verified successfully.',
          token: sessionToken,
          account: {
            username,
            name,
            role,
            email: adminEmail,
            authProvider: 'credentials',
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=admin`,
            bypassNisnVerification: true,
            isVerifiedMember: true,
            membershipStatus,
            jabatan,
          },
        });
      }

      // Check registered student / member accounts in local self-hosted store
      if (!isMatchedAdminId) {
        const localUsers = loadRegisteredUsers();
        const matchedLocal = localUsers.find(
          (u) =>
            u.username.toLowerCase() === normId ||
            (u.email && u.email.toLowerCase() === normId) ||
            (u.nisn && u.nisn.toLowerCase() === normId)
        );

        if (matchedLocal) {
          if (verifyPbkdf2PasswordMatch(rawPass, matchedLocal.hash)) {
            rateLimitMap.delete(rateLimitKey);
            rateLimitMap.delete(accountRateKey);

            const userRole = String(matchedLocal.role || 'Club Member').trim();
            const isPrivileged =
              userRole.toLowerCase().includes('admin') ||
              userRole.toLowerCase().includes('pembina') ||
              userRole.toLowerCase().includes('ketua') ||
              userRole.toLowerCase().includes('president');

            const sessionToken = signSessionToken({
              username: matchedLocal.username,
              role: userRole,
              jabatan: matchedLocal.jabatan || (isPrivileged ? 'admin' : 'member'),
              isDemo: false,
            });

            setSessionCookie(req, res, sessionToken);

            return res.json({
              success: true,
              message: 'User login verified successfully.',
              token: sessionToken,
              account: {
                username: matchedLocal.username,
                name: matchedLocal.name || matchedLocal.username,
                role: userRole,
                email: matchedLocal.email || '',
                authProvider: 'credentials',
                avatarUrl: matchedLocal.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${matchedLocal.username}`,
                nisn: matchedLocal.nisn || undefined,
                isVerifiedMember: true,
                bypassNisnVerification: Boolean(matchedLocal.nisn || isPrivileged),
                membershipStatus: matchedLocal.membershipStatus || (isPrivileged ? 'admin' : 'aktif'),
                jabatan: matchedLocal.jabatan || (isPrivileged ? 'admin' : 'member'),
              },
            });
          }
        }
      }

      // Check registered student / member accounts in Supabase backend
      if (!isMatchedAdminId) {
        try {
          const supa = getBackendSupabase();
          if (supa) {
            const safeId = normId.replace(/[^a-zA-Z0-9@._+-]/g, '');
            if (safeId) {
              let users: any[] | null = null;
              try {
                const { data: rpcUsers, error: rpcErr } = await supa
                  .rpc('verify_student_account', { p_identifier: safeId });
                if (!rpcErr && rpcUsers && rpcUsers.length > 0) {
                  users = rpcUsers;
                }
              } catch {}

              if (!users || users.length === 0) {
                const { data: directUsers, error: uErr } = await supa
                  .from('user_accounts')
                  .select('*')
                  .or(`username.ilike."${safeId}",email.ilike."${safeId}",nisn.ilike."${safeId}"`)
                  .limit(1);
                if (!uErr && directUsers && directUsers.length > 0) {
                  users = directUsers;
                }
              }

              if (users && users.length > 0) {
                const user = users[0];
                if (verifyPbkdf2PasswordMatch(rawPass, user.password)) {
                  rateLimitMap.delete(rateLimitKey);
                  rateLimitMap.delete(accountRateKey);

                  const userRole = String(user.role || 'Club Member').trim();
                  const isPrivileged =
                    userRole.toLowerCase().includes('admin') ||
                    userRole.toLowerCase().includes('pembina') ||
                    userRole.toLowerCase().includes('ketua') ||
                    userRole.toLowerCase().includes('president');

                  const sessionToken = signSessionToken({
                    username: user.username,
                    role: userRole,
                    jabatan: isPrivileged ? 'admin' : 'member',
                    isDemo: false,
                  });

                  setSessionCookie(req, res, sessionToken);

                  return res.json({
                    success: true,
                    message: 'User login verified successfully.',
                    token: sessionToken,
                    account: {
                      username: user.username,
                      name: user.name || user.username,
                      role: userRole,
                      email: user.email || '',
                      authProvider: user.auth_provider || 'credentials',
                      avatarUrl: user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`,
                      nisn: user.nisn || undefined,
                      isVerifiedMember: true,
                      bypassNisnVerification: Boolean(user.nisn || isPrivileged),
                      membershipStatus: isPrivileged ? 'admin' : 'aktif',
                      jabatan: isPrivileged ? 'admin' : 'member',
                    },
                  });
                }
              }
            }
          }
        } catch (supaLoginErr) {
          console.warn('[Server Auth Warning] Supabase backend verification notice:', supaLoginErr);
        }
      }

      // Only record failed attempts when targeting privileged/admin accounts or unmatched credentials
      const updateRateRecord = (key: string) => {
        const rec = rateLimitMap.get(key);
        if (!rec || (now - rec.firstAttemptTime > RATE_LIMIT_WINDOW_MS && !rec.lockedUntil)) {
          rateLimitMap.set(key, { attempts: 1, firstAttemptTime: now });
          return 1;
        }
        rec.attempts += 1;
        if (rec.attempts >= MAX_LOGIN_ATTEMPTS) {
          rec.lockedUntil = now + LOCKOUT_DURATION_MS;
        }
        return rec.attempts;
      };

      const ipAttempts = updateRateRecord(rateLimitKey);
      const accAttempts = updateRateRecord(accountRateKey);

      if (ipAttempts >= MAX_LOGIN_ATTEMPTS || accAttempts >= MAX_LOGIN_ATTEMPTS) {
        const seconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
        return res.status(429).json({
          success: false,
          error: 'Account Temporarily Locked',
          message: `Terlalu banyak percobaan kata sandi yang salah (${MAX_LOGIN_ATTEMPTS} kali). Server mengunci percobaan login selama 15 menit.`,
          retryAfter: seconds,
        });
      }

      return res.status(401).json({
        success: false,
        notAdmin: !isMatchedAdminId,
        message: isMatchedAdminId ? 'Invalid administrator credentials.' : 'Invalid username, NISN, or password.',
      });
    } catch (error) {
      console.error('Error during backend auth verification:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication verification.',
      });
    }
  });

  // Register new member/student account with server-side PBKDF2 hashing and session issuance
  router.post('/auth/register-member', validateCsrfOrigin, async (req: Request, res: Response) => {
    try {
      const { username, email, password, name, nisn, recoveryPin, honeypot } = req.body || {};
      if (honeypot && String(honeypot).trim() !== '') {
        return res.status(403).json({ success: false, error: 'Anti-bot guard triggered.' });
      }
      if (!username || !email || !password) {
        return res.status(400).json({ success: false, error: 'Username, email, and password are required.' });
      }

      const normUser = String(username).trim().toLowerCase();
      const normEmail = String(email).trim().toLowerCase();
      const rawPass = String(password).trim();
      const cleanNisn = nisn ? String(nisn).replace(/[^0-9]/g, '').trim() : undefined;
      const cleanRecoveryPin = recoveryPin ? String(recoveryPin).replace(/[^0-9]/g, '').trim() : undefined;
      let displayName = String(name || username).trim();

      // Gatekeeper: NISN is strictly required and must be 10 digits
      if (!cleanNisn || cleanNisn.length !== 10) {
        return res.status(400).json({ success: false, error: 'Nomor NISN wajib 10 digit angka.' });
      }

      // Gatekeeper: Recovery PIN is strictly required and must be 4 digits
      if (!cleanRecoveryPin || cleanRecoveryPin.length !== 4) {
        return res.status(400).json({ success: false, error: 'PIN Pemulihan wajib tepat 4 digit angka rahasia.' });
      }

      // Gatekeeper: Verify NISN against official member roster in INITIAL_MEMBERS and Supabase
      let matchedRosterMember: any = INITIAL_MEMBERS.find((m) => {
        const mNisn = String(m.nisn || '').replace(/[^0-9]/g, '').trim();
        return mNisn === cleanNisn || (m.id_member && String(m.id_member) === cleanNisn);
      });

      if (!matchedRosterMember) {
        try {
          const supa = getBackendSupabase();
          if (supa) {
            const { data: supaMems } = await supa
              .from('members')
              .select('*')
              .eq('nisn', cleanNisn)
              .limit(1);
            if (supaMems && supaMems.length > 0) {
              matchedRosterMember = supaMems[0];
            }
          }
        } catch {}
      }

      if (!matchedRosterMember) {
        return res.status(403).json({
          success: false,
          error: `NISN "${cleanNisn}" tidak terdaftar di Buku Induk Anggota Robotik MAN 2 Kota Bekasi. Hanya siswa yang terdaftar yang dapat mengaktifkan akun.`
        });
      }

      // Lock display name to official roster full name
      if (matchedRosterMember.fullName || matchedRosterMember.full_name) {
        displayName = matchedRosterMember.fullName || matchedRosterMember.full_name;
      }

      // Validate username format
      if (normUser.length < 3 || normUser.length > 30 || !/^[a-zA-Z0-9_.-]+$/.test(normUser)) {
        return res.status(400).json({ success: false, error: 'Username must be 3-30 characters alphanumeric.' });
      }

      // Reserved usernames check
      const reserved = ['admin', 'administrator', 'root', 'pembina', 'ketua', 'system', 'api', 'guest', 'demo'];
      if (reserved.includes(normUser) || normUser.startsWith('demo_')) {
        return res.status(400).json({ success: false, error: 'This username is reserved.' });
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
        return res.status(400).json({ success: false, error: 'Invalid email address format.' });
      }

      // Validate password length
      if (rawPass.length < 8) {
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
      }

      // Strict Anti-Role Escalation: Members registered via public form are always 'Club Member'
      const assignedRole = 'Club Member';
      const assignedJabatan = 'member';
      const assignedStatus = 'aktif';

      // Check duplicates in local store
      const localUsers = loadRegisteredUsers();
      const duplicate = localUsers.find(
        (u) =>
          u.username.toLowerCase() === normUser ||
          (u.email && u.email.toLowerCase() === normEmail) ||
          (cleanNisn && u.nisn && u.nisn === cleanNisn)
      );
      if (duplicate) {
        if (duplicate.username.toLowerCase() === normUser) {
          return res.status(409).json({ success: false, error: 'Username is already taken.' });
        }
        if (duplicate.email && duplicate.email.toLowerCase() === normEmail) {
          return res.status(409).json({ success: false, error: 'Email is already registered.' });
        }
        if (cleanNisn && duplicate.nisn && duplicate.nisn === cleanNisn) {
          return res.status(409).json({ success: false, error: `NISN "${cleanNisn}" sudah diaktivasi sebelumnya. Silakan masuk.` });
        }
      }

      // Hash password with PBKDF2 v2
      const saltHex = crypto.randomBytes(16).toString('hex');
      const saltBytes = Buffer.from(saltHex, 'hex');
      const hashHex = crypto.pbkdf2Sync(rawPass, saltBytes, 100000, 32, 'sha256').toString('hex');
      const passwordHash = `pbkdf2_v2$${saltHex}$${hashHex}`;

      // Hash 4-digit Recovery PIN with PBKDF2
      const pinSalt = crypto.randomBytes(8).toString('hex');
      const hashedPin = `pin_v1$${pinSalt}$${hashPin(cleanRecoveryPin, pinSalt)}`;

      const newUserRecord: StoredMemberUser = {
        username: normUser,
        name: displayName,
        email: normEmail,
        nisn: cleanNisn,
        recoveryPin: hashedPin,
        role: assignedRole,
        jabatan: assignedJabatan,
        membershipStatus: assignedStatus,
        hash: passwordHash,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${normUser}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      localUsers.push(newUserRecord);
      saveRegisteredUsers(localUsers);

      // Sync to Supabase if backend Supabase is configured
      try {
        const supa = getBackendSupabase();
        if (supa) {
          await supa.from('user_accounts').upsert({
            username: normUser,
            name: displayName,
            email: normEmail,
            nisn: cleanNisn || null,
            recovery_pin: hashedPin,
            password: passwordHash,
            role: assignedRole,
            auth_provider: 'credentials',
            avatar_url: newUserRecord.avatarUrl,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'username' });
        }
      } catch (supaErr) {
        console.warn('[Server Registration] Supabase background sync notice:', supaErr);
      }

      // Sign session token and set HttpOnly cookie
      const sessionToken = signSessionToken({
        username: normUser,
        role: assignedRole,
        jabatan: assignedJabatan,
        isDemo: false,
      });

      setSessionCookie(req, res, sessionToken);

      return res.status(201).json({
        success: true,
        message: 'Account successfully registered and authenticated.',
        token: sessionToken,
        account: {
          username: normUser,
          name: displayName,
          role: assignedRole,
          email: normEmail,
          nisn: cleanNisn,
          authProvider: 'credentials',
          avatarUrl: newUserRecord.avatarUrl,
          isVerifiedMember: true,
          membershipStatus: assignedStatus,
          jabatan: assignedJabatan,
        },
      });
    } catch (err: any) {
      console.error('[Register Member Error]', err);
      return res.status(500).json({ success: false, error: 'Internal server error during registration.' });
    }
  });

  // Get current session profile from cookie or Bearer token
  router.get('/auth/me', (req: Request, res: Response) => {
    try {
      const token = extractRequestToken(req);
      if (!token) {
        return res.status(401).json({ authenticated: false, message: 'No active session.' });
      }

      if (token.startsWith('demo_')) {
        return res.json({
          authenticated: true,
          isDemo: true,
          user: {
            username: 'demo_user',
            name: 'Demo Sandbox User',
            role: 'Demo Sandbox',
            isDemo: true,
          },
        });
      }

      const verified = verifySignedSessionToken(token);
      if (!verified) {
        return res.status(401).json({ authenticated: false, message: 'Session expired or invalid.' });
      }

      const { adminEmail } = getAdminCredentials();
      const normUser = verified.username.toLowerCase();
      const isAdmin = verified.role.toLowerCase() === 'admin' || normUser === 'admin';

      if (isAdmin) {
        return res.json({
          authenticated: true,
          isDemo: false,
          user: {
            username: verified.username,
            name: 'Admin Robotic MAN 2 Kota Bekasi',
            role: 'admin',
            email: adminEmail,
            jabatan: verified.jabatan || 'admin',
          },
        });
      }

      const localUsers = loadRegisteredUsers();
      const found = localUsers.find((u) => u.username.toLowerCase() === normUser);
      if (found) {
        return res.json({
          authenticated: true,
          isDemo: false,
          user: {
            username: found.username,
            name: found.name,
            email: found.email,
            nisn: found.nisn,
            role: found.role,
            jabatan: found.jabatan,
            membershipStatus: found.membershipStatus,
            avatarUrl: found.avatarUrl,
          },
        });
      }

      return res.json({
        authenticated: true,
        isDemo: false,
        user: {
          username: verified.username,
          role: verified.role,
          jabatan: verified.jabatan,
        },
      });
    } catch {
      return res.status(500).json({ authenticated: false, message: 'Server session error.' });
    }
  });

  // Verify Bearer token or HttpOnly session cookie
  router.post('/auth/verify-session', (req: Request, res: Response) => {
    try {
      const token = extractRequestToken(req);
      if (!token) {
        return res.status(401).json({ valid: false, message: 'Missing session token.' });
      }

      if (token.startsWith('demo_')) {
        return res.json({
          valid: true,
          isDemo: true,
          username: 'demo_user',
          role: 'Demo Sandbox',
        });
      }

      const verified = verifySignedSessionToken(token);
      if (verified) {
        return res.json({
          valid: true,
          isDemo: verified.isDemo,
          username: verified.username,
          role: verified.role,
          jabatan: verified.jabatan,
          expiresAt: verified.exp,
        });
      }

      return res.status(401).json({ valid: false, message: 'Session token expired or invalid.' });
    } catch {
      return res.status(500).json({ valid: false, message: 'Session verification error.' });
    }
  });

  // Clear HttpOnly session cookie on logout
router.post('/auth/logout', validateCsrfOrigin, (req: Request, res: Response) => {
  clearSessionCookie(req, res);
  return res.json({ success: true, message: 'Logged out successfully.' });
});
  // -------------------------------------------------------------------
  // Self-Service PIN-based Password Recovery (100% email-free & rate-limited)
  // -------------------------------------------------------------------

  // 1. Verify NISN & 4-Digit Recovery PIN
  router.post('/auth/verify-pin', validateCsrfOrigin, async (req: Request, res: Response) => {
    try {
      const { nisn, pin, recoveryPin } = req.body || {};
      const cleanNisn = String(nisn || '').replace(/[^0-9]/g, '').trim();
      const cleanPin = String(pin || recoveryPin || '').replace(/[^0-9]/g, '').trim();

      if (!cleanNisn || cleanNisn.length !== 10) {
        return res.status(400).json({ success: false, error: 'Nomor NISN wajib 10 digit angka.' });
      }
      if (!cleanPin || cleanPin.length !== 4) {
        return res.status(400).json({ success: false, error: 'PIN Pemulihan wajib 4 digit angka.' });
      }

      const clientIp = req.ip || req.socket.remoteAddress || 'ip_unknown';
      const pinRateKey = `pin__${clientIp}__${cleanNisn}`;
      const rateLimitMap = globalState.__roboman2RateLimitMap || new Map();
      const now = Date.now();

      const record = rateLimitMap.get(pinRateKey);
      if (record && record.lockedUntil && record.lockedUntil > now) {
        const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
        return res.status(429).json({
          success: false,
          error: `Terlalu banyak percobaan PIN salah. Percobaan pemulihan dikunci sementara selama ${remainingSeconds} detik demi keamanan.`,
        });
      }

      // Find user in local registered_users.json or Supabase
      const localUsers = loadRegisteredUsers();
      let matchedUser = localUsers.find(u => (u.nisn && u.nisn === cleanNisn) || u.username === cleanNisn);

      if (!matchedUser) {
        try {
          const supa = getBackendSupabase();
          if (supa) {
            const { data } = await supa
              .from('user_accounts')
              .select('*')
              .or(`nisn.eq."${cleanNisn}",username.eq."${cleanNisn}"`)
              .limit(1);
            if (data && data.length > 0) {
              matchedUser = {
                username: data[0].username,
                name: data[0].name,
                email: data[0].email,
                nisn: data[0].nisn,
                recoveryPin: data[0].recovery_pin,
                role: data[0].role,
                jabatan: 'member',
                membershipStatus: 'aktif',
                hash: data[0].password,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
            }
          }
        } catch {}
      }

      if (!matchedUser) {
        return res.status(404).json({
          success: false,
          error: `Akun dengan NISN ${cleanNisn} belum diaktivasi. Silakan aktivasi akun terlebih dahulu.`,
        });
      }

      const storedPin = matchedUser.recoveryPin;
      if (!storedPin) {
        return res.status(400).json({
          success: false,
          error: 'Akun ini belum memiliki PIN Pemulihan. Silakan hubungi Pembina di sekolah untuk verifikasi fisik.',
        });
      }

      const isPinMatch = verifyPinMatch(cleanPin, storedPin);
      if (!isPinMatch) {
        const attempts = (record?.attempts || 0) + 1;
        if (attempts >= 5) {
          rateLimitMap.set(pinRateKey, {
            attempts,
            firstAttemptTime: record?.firstAttemptTime || now,
            lockedUntil: now + 15 * 60 * 1000,
          });
          return res.status(429).json({
            success: false,
            error: 'PIN Pemulihan salah 5 kali berturut-turut. Pemulihan dikunci selama 15 menit demi keamanan.',
          });
        }
        rateLimitMap.set(pinRateKey, {
          attempts,
          firstAttemptTime: record?.firstAttemptTime || now,
        });
        return res.status(401).json({
          success: false,
          error: `PIN Pemulihan salah. Sisa kesempatan sebelum terkunci: ${5 - attempts} kali.`,
        });
      }

      // Success: Clear rate limit record
      rateLimitMap.delete(pinRateKey);

      return res.json({
        success: true,
        message: 'PIN Pemulihan valid.',
        account: {
          username: matchedUser.username,
          name: matchedUser.name,
          role: matchedUser.role,
          nisn: cleanNisn,
        },
      });
    } catch (err) {
      console.error('[Verify PIN error]', err);
      return res.status(500).json({ success: false, error: 'Terjadi kendala saat memeriksa PIN pemulihan.' });
    }
  });

  // 2. Atomic Password Reset via Verified PIN
  router.post('/auth/recover-with-pin', validateCsrfOrigin, async (req: Request, res: Response) => {
    try {
      const { nisn, pin, recoveryPin, newPassword } = req.body || {};
      const cleanNisn = String(nisn || '').replace(/[^0-9]/g, '').trim();
      const cleanPin = String(pin || recoveryPin || '').replace(/[^0-9]/g, '').trim();
      const rawNewPass = String(newPassword || '').trim();

      if (!cleanNisn || cleanNisn.length !== 10) {
        return res.status(400).json({ success: false, error: 'Nomor NISN wajib 10 digit angka.' });
      }
      if (!cleanPin || cleanPin.length !== 4) {
        return res.status(400).json({ success: false, error: 'PIN Pemulihan wajib 4 digit angka.' });
      }
      if (rawNewPass.length < 8) {
        return res.status(400).json({ success: false, error: 'Kata sandi baru minimal 8 karakter.' });
      }

      const clientIp = req.ip || req.socket.remoteAddress || 'ip_unknown';
      const pinRateKey = `pin__${clientIp}__${cleanNisn}`;
      const rateLimitMap = globalState.__roboman2RateLimitMap || new Map();
      const now = Date.now();

      const record = rateLimitMap.get(pinRateKey);
      if (record && record.lockedUntil && record.lockedUntil > now) {
        const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
        return res.status(429).json({
          success: false,
          error: `Percobaan pemulihan dikunci sementara selama ${remainingSeconds} detik.`,
        });
      }

      const localUsers = loadRegisteredUsers();
      const userIdx = localUsers.findIndex(u => (u.nisn && u.nisn === cleanNisn) || u.username === cleanNisn);

      if (userIdx === -1) {
        return res.status(404).json({ success: false, error: 'Akun siswa tidak ditemukan.' });
      }

      const user = localUsers[userIdx];
      const isPinMatch = user.recoveryPin && verifyPinMatch(cleanPin, user.recoveryPin);
      if (!isPinMatch) {
        return res.status(401).json({ success: false, error: 'PIN Pemulihan tidak cocok.' });
      }

      // Hash new password with PBKDF2 v2
      const saltHex = crypto.randomBytes(16).toString('hex');
      const saltBytes = Buffer.from(saltHex, 'hex');
      const hashHex = crypto.pbkdf2Sync(rawNewPass, saltBytes, 100000, 32, 'sha256').toString('hex');
      const newPasswordHash = `pbkdf2_v2$${saltHex}$${hashHex}`;

      user.hash = newPasswordHash;
      user.updatedAt = Date.now();
      saveRegisteredUsers(localUsers);

      // Sync to Supabase
      try {
        const supa = getBackendSupabase();
        if (supa) {
          await supa
            .from('user_accounts')
            .update({ password: newPasswordHash, updated_at: new Date().toISOString() })
            .or(`nisn.eq."${cleanNisn}",username.eq."${user.username}"`);
        }
      } catch (syncErr) {
        console.warn('[Recover with PIN Supabase sync notice]', syncErr);
      }

      rateLimitMap.delete(pinRateKey);

      return res.json({
        success: true,
        message: 'Kata sandi berhasil diperbarui dengan aman.',
      });
    } catch (err) {
      console.error('[Recover with PIN error]', err);
      return res.status(500).json({ success: false, error: 'Terjadi kendala server saat mereset kata sandi.' });
    }
  });

  // Logout all sessions for current user
  router.post('/auth/logout-all', validateCsrfOrigin, (req: Request, res: Response) => {
    clearSessionCookie(req, res);
    const token = extractRequestToken(req);
    if (token) {
      const decoded = verifySignedSessionToken(token);
      if (decoded) {
        const map = globalState.__roboman2RateLimitMap;
        if (map) {
          for (const key of Array.from(map.keys())) {
            if (key.includes(decoded.username)) map.delete(key);
          }
        }
      }
    }
    return res.json({ success: true, message: 'All sessions logged out.' });
  });



  // Protected Admin Verification Route
  router.get('/admin/verify', requireAdminMiddleware, (req: Request, res: Response) => {
    const { adminEmail } = getAdminCredentials();
    const adminSession = (req as any).adminSession as SignedSessionPayload | undefined;
    res.json({
      success: true,
      status: 'authorized',
      clearance: adminSession?.role || 'administrator',
      username: adminSession?.username,
      adminEmail,
      timestamp: new Date().toISOString(),
    });
  });

  // Protected Admin Action: Promote / change user role (persists to local store + Supabase)
  router.post('/admin/promote-user', validateCsrfOrigin, requireAdminMiddleware, async (req: Request, res: Response) => {
    const { userId, username, newRole, newJabatan } = req.body || {};
    if (!userId && !username) {
      return res.status(400).json({
        success: false,
        error: 'User ID or username is required for role modification.',
      });
    }

    // Demo token guard
    const rawToken = extractRequestToken(req) || '';
    if (rawToken.startsWith('demo_')) {
      return res.status(403).json({ success: false, error: 'Demo accounts cannot perform admin actions.' });
    }

    const adminSession = (req as any).adminSession as SignedSessionPayload | undefined;
    const targetIdentifier = String(username || userId).toLowerCase().trim();
    if (adminSession && adminSession.username.toLowerCase().trim() === targetIdentifier) {
      return res.status(403).json({
        success: false,
        error: 'Anti-Self-Promotion Guard: Anda tidak dapat mengubah peran akun Anda sendiri.',
      });
    }

    const roleToAssign = String(newRole || 'Club Member').trim();
    const jabatanToAssign = String(newJabatan || 'member').trim();

    // Persist to local JSON store
    const users = loadRegisteredUsers();
    const userIndex = users.findIndex((u) => u.username.toLowerCase() === targetIdentifier);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: `User '${targetIdentifier}' not found in local store.` });
    }
    users[userIndex].role = roleToAssign;
    users[userIndex].jabatan = jabatanToAssign;
    users[userIndex].updatedAt = Date.now();
    saveRegisteredUsers(users);

    // Sync to Supabase if configured
    try {
      const supa = getBackendSupabase();
      if (supa) {
        await supa.from('user_accounts').update({
          role: roleToAssign,
          jabatan: jabatanToAssign,
          updated_at: new Date().toISOString(),
        }).eq('username', targetIdentifier);
      }
    } catch (supaErr) {
      console.warn('[Promote User] Supabase sync notice:', supaErr);
    }

    return res.json({
      success: true,
      message: `User '${targetIdentifier}' role updated to '${roleToAssign}'.`,
      username: targetIdentifier,
      assignedRole: roleToAssign,
      assignedJabatan: jabatanToAssign,
      updatedAt: new Date().toISOString(),
    });
  });

  // Protected Admin: List all members (hashes stripped)
  router.get('/admin/members', requireAdminMiddleware, (req: Request, res: Response) => {
    const rawToken = extractRequestToken(req) || '';
    if (rawToken.startsWith('demo_')) {
      return res.status(403).json({ success: false, error: 'Demo accounts cannot access member data.' });
    }
    const users = loadRegisteredUsers();
    const safeUsers = users.map(({ hash: _hash, ...rest }) => rest);
    return res.json({ success: true, total: safeUsers.length, members: safeUsers });
  });

  // Protected Admin: Delete a member account
  router.delete('/admin/members/:username', validateCsrfOrigin, requireAdminMiddleware, async (req: Request, res: Response) => {
    const rawToken = extractRequestToken(req) || '';
    if (rawToken.startsWith('demo_')) {
      return res.status(403).json({ success: false, error: 'Demo accounts cannot perform admin actions.' });
    }

    const adminSession = (req as any).adminSession as SignedSessionPayload | undefined;
    const targetUsername = String(req.params.username || '').toLowerCase().trim();
    if (!targetUsername) {
      return res.status(400).json({ success: false, error: 'Username parameter is required.' });
    }
    if (adminSession && adminSession.username.toLowerCase() === targetUsername) {
      return res.status(403).json({ success: false, error: 'Cannot delete your own admin account.' });
    }

    const users = loadRegisteredUsers();
    const before = users.length;
    const filtered = users.filter((u) => u.username.toLowerCase() !== targetUsername);
    if (filtered.length === before) {
      return res.status(404).json({ success: false, error: `User '${targetUsername}' not found.` });
    }
    saveRegisteredUsers(filtered);

    // Sync to Supabase if configured
    try {
      const supa = getBackendSupabase();
      if (supa) {
        await supa.from('user_accounts').delete().eq('username', targetUsername);
      }
    } catch (supaErr) {
      console.warn('[Delete Member] Supabase sync notice:', supaErr);
    }

    return res.json({ success: true, message: `User '${targetUsername}' has been deleted.`, deletedUsername: targetUsername });
  });

  return router;
}
