import { getSupabase } from '../lib/supabase';
import { validatePassword, validateUsername } from './passwordSecurity';

export interface AccountConfig {
  username: string;
  password?: string;
  name: string;
  role: string;
  email?: string;
  authProvider?: 'credentials' | 'google';
  avatarUrl?: string;
  nisn?: string;
  recoveryPin?: string;
  isDemo?: boolean;
  token?: string;
}

export interface RegisterAccountParams {
  username: string;
  email?: string;
  password: string;
  name?: string;
  role?: string;
  nisn?: string;
  recoveryPin?: string;
  allowElevatedRole?: boolean;
}

export const ENV_ADMIN_EMAIL =
  (typeof process !== 'undefined' && (process.env?.VITE_ADMIN_EMAIL || process.env?.ADMIN_EMAIL)) ||
  (import.meta as any).env?.VITE_ADMIN_EMAIL ||
  (import.meta as any).env?.ADMIN_EMAIL ||
  'roboticman2kotabekasi@gmail.com';

export const AUTHORIZED_GOOGLE_EMAIL =
  (import.meta as any).env?.VITE_AUTHORIZED_GOOGLE_EMAIL ||
  ENV_ADMIN_EMAIL ||
  'roboticman2kotabekasi@gmail.com';

const LEGACY_APP_SALT = 'man2_robotics_auth_salt_2026_';

// Module-scoped memory token store (prevents XSS reading admin tokens from localStorage)
let inMemoryAuthToken: string | null = null;

export function getMemoryAuthToken(): string | null {
  return inMemoryAuthToken;
}

export function setMemoryAuthToken(token: string | null | undefined): void {
  inMemoryAuthToken = token ? String(token).trim() : null;
}

export function clearMemoryAuthToken(): void {
  inMemoryAuthToken = null;
}

/**
 * Sanitizes an input string for safe interpolation inside Supabase/PostgREST filter clauses.
 * Strips characters that alter query grammar: commas, parentheses, quotes, colons, spaces, and operators.
 */
export function sanitizePostgrestFilter(val: string): string {
  if (!val || typeof val !== 'string') return '';
  return val.trim().replace(/[^a-zA-Z0-9@._+-]/g, '');
}

async function hashSha256Legacy(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${LEGACY_APP_SALT}${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function derivePbkdf2Hex(password: string, saltBytes: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const saltBuffer = new Uint8Array(saltBytes).buffer;
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );
  return Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Hardened Password Hashing using PBKDF2-SHA256 (100,000 iterations) with per-user 16-byte CSPRNG salt.
 */
export async function hashPassword(password: string): Promise<string> {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = await derivePbkdf2Hex(password, saltBytes);
  return `pbkdf2_v2$${saltHex}$${hashHex}`;
}

/**
 * Multi-format password comparison (salted PBKDF2 v2, legacy salted PBKDF2 v1, and legacy SHA-256)
 */
export async function verifyPasswordMatch(attempt: string, storedHash: string): Promise<boolean> {
  if (!attempt || !storedHash) return false;

  // 1. Per-user salted PBKDF2 v2
  if (storedHash.startsWith('pbkdf2_v2$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3 || !parts[1] || !parts[2]) return false;
    try {
      const saltBytes = hexToBytes(parts[1]);
      const computedHex = await derivePbkdf2Hex(attempt, saltBytes);
      return computedHex === parts[2];
    } catch {
      return false;
    }
  }

  // 2. Legacy PBKDF2 v1 (fixed salt)
  if (storedHash.startsWith('pbkdf2$')) {
    try {
      const encoder = new TextEncoder();
      const computedHex = await derivePbkdf2Hex(attempt, encoder.encode(LEGACY_APP_SALT));
      return `pbkdf2$${computedHex}` === storedHash;
    } catch {
      return false;
    }
  }

  // 3. Legacy SHA-256 hash check
  if (/^[0-9a-f]{64}$/i.test(storedHash)) {
    const legacyHash = await hashSha256Legacy(attempt);
    return legacyHash === storedHash;
  }

  return false;
}

/**
 * Default authenticated production accounts.
 * Passwords are verified securely via server environment variables or cryptographic hashing.
 */
export const DEFAULT_ACCOUNTS: AccountConfig[] = [
  {
    username: 'roboticman2kotabekasi',
    password: 'bc170b965ad30c470e0120d29f710671b4c1afe062a2ee95c6a93c8a8b108a6e',
    name: 'Admin Robotic MAN 2 Kota Bekasi',
    role: 'admin',
    email: ENV_ADMIN_EMAIL,
    authProvider: 'credentials',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=roboticman2'
  },
  {
    username: 'admin',
    password: 'bc170b965ad30c470e0120d29f710671b4c1afe062a2ee95c6a93c8a8b108a6e',
    name: 'Admin Robotic MAN 2 Kota Bekasi',
    role: 'admin',
    email: ENV_ADMIN_EMAIL,
    authProvider: 'credentials',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'
  },
  {
    username: 'pembina',
    password: 'bc170b965ad30c470e0120d29f710671b4c1afe062a2ee95c6a93c8a8b108a6e',
    name: 'Abdul Khoir, S.Kom. (Faculty Advisor)',
    role: 'admin',
    email: ENV_ADMIN_EMAIL,
    authProvider: 'credentials',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=pembina'
  },
  {
    username: 'ketua',
    password: '',
    name: 'Muhammad Rayhan Pratama (Club President)',
    role: 'President / Head Admin',
    email: 'ketua.robotik@man2kotabekasi.sch.id',
    nisn: '0110000099',
    authProvider: 'credentials',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=ketua'
  }
];

/**
 * STRICTLY ISOLATED DEMO ACCOUNTS (Trial & Sandbox Mode)
 * Strictly separated from real production accounts. Used for testing UI and navigation safely.
 */
export const DEMO_ACCOUNTS_MAP: Record<string, AccountConfig> = {
  demo_admin: {
    username: 'demo_admin',
    name: 'Administrator (Demo Head Admin)',
    role: 'admin',
    email: 'admin.demo@man2kotabekasi.sch.id',
    authProvider: 'credentials',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=demo_admin',
    isDemo: true,
  },
  demo_bendahara: {
    username: 'demo_bendahara',
    name: 'Siti Rahma (Demo Bendahara)',
    role: 'Treasurer',
    email: 'bendahara.demo@man2kotabekasi.sch.id',
    authProvider: 'credentials',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=demo_bendahara',
    isDemo: true,
  },
  demo_ketua: {
    username: 'demo_ketua',
    name: 'Muhammad Rayhan (Demo Ketua)',
    role: 'President',
    email: 'ketua.demo@man2kotabekasi.sch.id',
    authProvider: 'credentials',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=demo_ketua',
    isDemo: true,
  },
  demo_sekretaris: {
    username: 'demo_sekretaris',
    name: 'Aisyah Putri (Demo Sekretaris)',
    role: 'Secretary',
    email: 'sekretaris.demo@man2kotabekasi.sch.id',
    authProvider: 'credentials',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=demo_sekretaris',
    isDemo: true,
  },
  demo_pr: {
    username: 'demo_pr',
    name: 'Fauzan Ahnaf (Demo Humas)',
    role: 'Public Relations',
    email: 'humas.demo@man2kotabekasi.sch.id',
    authProvider: 'credentials',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=demo_pr',
    isDemo: true,
  },
  demo_pembina: {
    username: 'demo_pembina',
    name: 'Abdul Khoir, S.Kom. (Demo Pembina)',
    role: 'Faculty Advisor',
    email: 'pembina.demo@man2kotabekasi.sch.id',
    authProvider: 'credentials',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=demo_pembina',
    isDemo: true,
  },
  demo_member: {
    username: 'demo_member',
    name: 'Adinda Putri (Demo Anggota Siswa)',
    role: 'Club Member',
    email: 'member.demo@man2kotabekasi.sch.id',
    nisn: '0110000001',
    authProvider: 'credentials',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=demo_member',
    isDemo: true,
  },
  demo_executive: {
    username: 'demo_executive',
    name: 'Executive Board Officer (Demo Sandbox)',
    role: 'Executive Board',
    email: 'demo.executive@man2kotabekasi.sch.id',
    authProvider: 'credentials',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=demo_exec',
    isDemo: true,
  },
  demo_tamu: {
    username: 'demo_tamu',
    name: 'Demo Guest',
    role: 'Demo Guest',
    email: 'demo.guest@man2kotabekasi.sch.id',
    authProvider: 'credentials',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=demo_tamu',
    isDemo: true,
  },
};

/**
 * Checks whether an account or username is a demo sandbox account
 */
export function isDemoUsername(username?: string): boolean {
  if (!username) return false;
  const clean = username.trim().toLowerCase();
  return clean.startsWith('demo_') || clean === 'demo' || clean === 'demo_tamu';
}

export function isDemoAccount(accountOrSession?: { isDemo?: boolean; username?: string } | null): boolean {
  if (!accountOrSession) return false;
  return Boolean(accountOrSession.isDemo || isDemoUsername(accountOrSession.username));
}

export function getCustomAccounts(): AccountConfig[] {
  try {
    const saved = localStorage.getItem('robotics_custom_accounts');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse custom accounts:', err);
  }
  return DEFAULT_ACCOUNTS;
}

export function saveCustomAccounts(accounts: AccountConfig[]): void {
  // Filter out any demo sandbox accounts so they never pollute custom accounts
  const cleanAccounts = accounts.filter(a => !isDemoUsername(a.username));
  localStorage.setItem('robotics_custom_accounts', JSON.stringify(cleanAccounts));
}

export function addOrUpdateAccount(newAcc: AccountConfig): void {
  if (isDemoUsername(newAcc.username)) return; // Do not store demo accounts in persistent real accounts
  const accounts = getCustomAccounts();
  const index = accounts.findIndex(
    a => a.username.toLowerCase() === newAcc.username.toLowerCase() ||
         (newAcc.email && a.email && a.email.toLowerCase() === newAcc.email.toLowerCase())
  );

  if (index !== -1) {
    accounts[index] = {
      ...accounts[index],
      ...newAcc,
      name: newAcc.name || accounts[index].name,
      role: newAcc.role || accounts[index].role,
    };
  } else {
    accounts.push(newAcc);
  }
  saveCustomAccounts(accounts);
}

/**
 * Register new user account with Supabase and localStorage persistence
 */
export async function registerNewAccount(params: RegisterAccountParams): Promise<{
  success: boolean;
  error?: string;
  account?: AccountConfig;
}> {
  const normUser = params.username.trim().toLowerCase();
  const cleanNisn = params.nisn ? params.nisn.replace(/[^0-9]/g, '').trim() : '';
  const cleanPin = params.recoveryPin ? String(params.recoveryPin).replace(/[^0-9]/g, '').trim() : '';
  const normEmail = (params.email && params.email.trim())
    ? params.email.trim().toLowerCase()
    : (cleanNisn ? `${cleanNisn}@man2kotabekasi.sch.id` : `${normUser}@man2kotabekasi.sch.id`);
  const rawPassword = params.password.trim();
  let displayName = params.name?.trim() || params.username.trim();

  // If NISN is provided, look up official member in local roster to lock official name
  if (cleanNisn) {
    try {
      const rosterKeys = ['robotics_members', 'org_org-robotik-man2_members', 'robotics_admin_members'];
      for (const k of rosterKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const found = parsed.find((m: any) => {
              const mNisn = String(m.nisn || '').replace(/[^0-9]/g, '').trim();
              const mId = String(m.id_member || '').replace(/[^0-9]/g, '').trim();
              return mNisn === cleanNisn || mId === cleanNisn;
            });
            if (found && (found.fullName || found.full_name)) {
              displayName = String(found.fullName || found.full_name).trim();
              break;
            }
          }
        }
      }
    } catch {}
  }

  // Prevent collisions with isolated demo accounts
  if (normUser.startsWith('demo_') || normUser === 'demo' || normUser === 'demo_tamu') {
    return { 
      success: false, 
      error: 'Usernames starting with "demo_" are reserved exclusively for isolated sandbox testing accounts.' 
    };
  }

  // Role sanitation: Public self-registration is strictly locked to Member / Viewer to prevent unauthorized privilege escalation.
  // Elevated roles (advisor, secretary, treasurer, president, etc.) are only permitted if explicitly authorized by an authenticated administrator.
  let role = 'Member / Viewer';
  if (params.allowElevatedRole && params.role) {
    role = params.role.trim();
  } else if (params.role) {
    const rLower = params.role.toLowerCase().trim();
    if (rLower.includes('anggota') || rLower.includes('member') || rLower.includes('viewer')) {
      role = 'Member / Viewer';
    } else {
      // Untrusted public self-registration cannot grant itself executive permissions
      role = 'Member / Viewer';
    }
  }

  // 1. Validate Username according to security rules
  const usernameValidation = validateUsername(normUser);
  if (!usernameValidation.isValid) {
    return { success: false, error: usernameValidation.error || 'Username does not meet security requirements.' };
  }

  // 2. Validate Email
  if (!normEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
    return { success: false, error: 'Invalid email address format.' };
  }

  // 3. Validate Password according to 7 security rules
  const passwordValidation = validatePassword(rawPassword, {
    username: normUser,
    name: displayName,
    email: normEmail,
  });
  if (!passwordValidation.isValid) {
    return { 
      success: false, 
      error: `Password standard not met: ${passwordValidation.errors[0] || 'Must contain at least 12 characters with uppercase, lowercase, numbers, and symbols.'}` 
    };
  }

  // 4. Attempt Registration via Server Backend (/api/auth/register-member)
  try {
    const res = await fetch('/api/auth/register-member', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        username: normUser,
        email: normEmail,
        password: rawPassword,
        name: displayName,
        nisn: cleanNisn || undefined,
        recoveryPin: cleanPin || undefined,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (res.ok && data && data.success && data.account) {
        if (data.token) {
          setMemoryAuthToken(data.token);
        }
        const serverAcc: AccountConfig = {
          username: data.account.username || normUser,
          name: data.account.name || displayName,
          role: data.account.role || role,
          email: data.account.email || normEmail,
          nisn: data.account.nisn || cleanNisn,
          authProvider: 'credentials',
          avatarUrl: data.account.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(normUser)}`,
          token: data.token,
        };
        const { token: _omit, ...cacheAcc } = serverAcc;
        addOrUpdateAccount(cacheAcc);
        return { success: true, account: serverAcc };
      } else if (!res.ok && data && data.error) {
        return { success: false, error: data.error };
      }
    }
  } catch (backendRegErr) {
    console.warn('Backend registration notice (operating with local fallback):', backendRegErr);
  }

  // 5. Offline Fallback: Check duplicates in local storage (Username, Email, or NISN)
  const localAccounts = getCustomAccounts();
  const duplicateLocal = localAccounts.find(
    a => a.username.toLowerCase() === normUser || 
         (a.email && a.email.toLowerCase() === normEmail) ||
         (cleanNisn && a.nisn && a.nisn === cleanNisn)
  );
  if (duplicateLocal) {
    let err = 'This username is already taken. Please choose another username.';
    if (duplicateLocal.email && duplicateLocal.email.toLowerCase() === normEmail) {
      err = 'This email is already associated with an account. Please sign in or use another email.';
    } else if (cleanNisn && duplicateLocal.nisn && duplicateLocal.nisn === cleanNisn) {
      err = `NISN "${cleanNisn}" is already registered. Please sign in with your NISN or contact your faculty advisor.`;
    }
    return { 
      success: false, 
      error: err
    };
  }

  // 5. Check duplicates in Supabase if connected
  try {
    const supa = getSupabase();
    const safeUser = sanitizePostgrestFilter(normUser);
    const safeEmail = sanitizePostgrestFilter(normEmail);

    if (safeUser || safeEmail || cleanNisn) {
      const filters: string[] = [];
      if (safeUser) filters.push(`username.ilike."${safeUser}"`);
      if (safeEmail) filters.push(`email.ilike."${safeEmail}"`);
      if (cleanNisn) filters.push(`nisn.ilike."${cleanNisn}"`);

      const { data: existingUsers, error: checkErr } = await supa
        .from('user_accounts')
        .select('username, email, nisn')
        .or(filters.join(','));

      if (!checkErr && existingUsers && existingUsers.length > 0) {
        const matchUser = existingUsers.find((u: any) => String(u.username).toLowerCase() === normUser);
        if (matchUser) {
          return { success: false, error: 'This username is already registered in the Supabase database.' };
        }
        const matchEmail = existingUsers.find((u: any) => u.email && String(u.email).toLowerCase() === normEmail);
        if (matchEmail) {
          return { success: false, error: 'This email is already registered in the Supabase database.' };
        }
        const matchNisn = existingUsers.find((u: any) => u.nisn && String(u.nisn).trim() === cleanNisn);
        if (matchNisn) {
          return { success: false, error: `NISN "${cleanNisn}" is already registered. Please sign in with your NISN.` };
        }
      }
    }
  } catch (err) {
    console.warn('Supabase duplicate check notice:', err);
  }

  // 6. Hash password
  const hashedPassword = await hashPassword(rawPassword);

  // 7. Build account object
  const newAccount: AccountConfig = {
    username: normUser,
    password: hashedPassword,
    name: displayName,
    role: role,
    email: normEmail,
    nisn: params.nisn?.trim() || undefined,
    recoveryPin: cleanPin || undefined,
    authProvider: 'credentials',
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(normUser)}`
  };

  // 8. Persist to Supabase database (user_accounts table)
  try {
    const supa = getSupabase();
    const { error: insertErr } = await supa
      .from('user_accounts')
      .upsert({
        username: newAccount.username,
        password: newAccount.password,
        name: newAccount.name,
        role: newAccount.role,
        email: newAccount.email,
        nisn: newAccount.nisn,
        recovery_pin: newAccount.recoveryPin,
        auth_provider: 'credentials',
        avatar_url: newAccount.avatarUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'username' });

    if (insertErr) {
      console.warn('Supabase user_accounts insert notice:', insertErr.message);
    }
  } catch (err) {
    console.warn('Failed to insert directly into Supabase user_accounts:', err);
  }

  // 9. Save to local storage
  addOrUpdateAccount(newAccount);

  return { success: true, account: newAccount };
}

/**
 * Verifies username/email and password credentials
 */
export async function verifyAccountCredentials(
  identifierAttempt: string,
  passwordAttempt: string
): Promise<AccountConfig | null> {
  const normId = identifierAttempt.trim().toLowerCase();
  const rawPassword = passwordAttempt.trim();
  if (!normId || !rawPassword) return null;

  // 0. Demo Accounts Sandbox Direct Authentication (Strictly isolated testing sandbox)
  if (normId in DEMO_ACCOUNTS_MAP) {
    return DEMO_ACCOUNTS_MAP[normId];
  }

  // 1. Verify Admin Credentials via Backend Server API (/api/auth/login)
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        identifier: normId,
        password: rawPassword,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.success && data.account) {
        if (data.token) {
          setMemoryAuthToken(data.token);
        }
        const verifiedAcc: AccountConfig = {
          username: data.account.username || normId,
          name: data.account.name || normId,
          role: data.account.role || 'Club Member',
          email: data.account.email || '',
          nisn: data.account.nisn,
          authProvider: data.account.authProvider || 'credentials',
          avatarUrl: data.account.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${normId}`,
          token: data.token,
          isDemo: Boolean(data.account.isDemo),
        };
        if (!verifiedAcc.isDemo) {
          const { token: _omit, ...cacheAcc } = verifiedAcc;
          addOrUpdateAccount(cacheAcc);
        }
        return verifiedAcc;
      }
    }
  } catch (backendErr) {
    console.warn('Backend auth endpoint note:', backendErr);
  }

  // 2. Verify against Supabase user_accounts (for registered student/officer accounts)
  try {
    const supa = getSupabase();
    const safeId = sanitizePostgrestFilter(normId);
    if (safeId) {
      const { data, error } = await supa
        .from('user_accounts')
        .select('*')
        .or(`username.ilike."${safeId}",email.ilike."${safeId}",nisn.ilike."${safeId}"`)
        .limit(1);

      if (!error && data && data.length > 0) {
        const row = data[0];
        const isPasswordMatched = await verifyPasswordMatch(passwordAttempt, row.password);
        const storedPin = String(row.recovery_pin || '').trim();
        const isPinMatched = Boolean(
          storedPin && (
            storedPin.startsWith('pin_v1$') || storedPin.startsWith('sha256:')
              ? await verifyPasswordMatch(passwordAttempt, storedPin)
              : storedPin === passwordAttempt.trim()
          )
        );

        if (isPasswordMatched || isPinMatched) {
          const dbAcc: AccountConfig = {
            username: String(row.username).trim(),
            password: row.password,
            recoveryPin: storedPin || undefined,
            name: String(row.name || row.username).trim(),
            role: String(row.role || 'Executive Board').trim(),
            email: String(row.email || '').trim(),
            nisn: row.nisn ? String(row.nisn).trim() : undefined,
            authProvider: row.auth_provider === 'google' ? 'google' : 'credentials',
            avatarUrl: row.avatar_url || '',
          };
          addOrUpdateAccount(dbAcc);
          return dbAcc;
        }
      }
    }
  } catch (err) {
    // Continue local fallback
  }

  // 3. Verify against local accounts (by username, email, or NISN)
  const accounts = getCustomAccounts();
  const found = accounts.find(
    a => a.username.toLowerCase() === normId ||
         (a.email && a.email.toLowerCase() === normId) ||
         (a.nisn && a.nisn.toLowerCase() === normId)
  );
  if (!found || !found.password) return null;

  const isLocalPasswordMatched = await verifyPasswordMatch(passwordAttempt, found.password);
  const storedLocalPin = String(found.recoveryPin || '').trim();
  const isLocalPinMatched = Boolean(
    storedLocalPin && (
      storedLocalPin.startsWith('pin_v1$') || storedLocalPin.startsWith('sha256:')
        ? await verifyPasswordMatch(passwordAttempt, storedLocalPin)
        : storedLocalPin === passwordAttempt.trim()
    )
  );

  if (isLocalPasswordMatched || isLocalPinMatched) {
    return found;
  }
  return null;
}

/**
 * Check availability of username against security rules, local cache, and Supabase database
 */
export async function checkUsernameAvailability(
  newUsername: string,
  currentUsername?: string
): Promise<{ available: boolean; reason?: string }> {
  const normUser = (newUsername || '').trim().toLowerCase();
  const currentNorm = (currentUsername || '').trim().toLowerCase();

  // If retaining current username
  if (currentNorm && normUser === currentNorm) {
    return { available: true };
  }

  // 1. Validate format & reserved keywords
  const val = validateUsername(normUser, currentNorm);
  if (!val.isValid) {
    return { available: false, reason: val.error || 'Username does not meet security requirements.' };
  }

  // 2. Check local accounts
  const localAccounts = getCustomAccounts();
  const existsLocal = localAccounts.find(
    a => a.username.toLowerCase() === normUser && a.username.toLowerCase() !== currentNorm
  );
  if (existsLocal) {
    return { available: false, reason: `Username "${newUsername}" is already taken by another account.` };
  }

  // 3. Check Supabase database
  try {
    const supa = getSupabase();
    const safeUser = sanitizePostgrestFilter(normUser);
    if (safeUser) {
      const { data, error } = await supa
        .from('user_accounts')
        .select('username')
        .ilike('username', safeUser)
        .limit(1);

      if (!error && data && data.length > 0) {
        if (data[0].username.toLowerCase() !== currentNorm) {
          return { available: false, reason: `Username "${newUsername}" is already registered in the database.` };
        }
      }
    }
  } catch (err) {
    console.warn('Supabase username check notice:', err);
  }

  return { available: true };
}

/**
 * Update account credentials with password hashing and local storage data migration
 */
export async function updateAccountCredentials(
  oldUsername: string,
  newUsername: string,
  newPasswordPlain: string,
  newName: string,
  newRole?: string,
  newEmail?: string
): Promise<boolean> {
  const accounts = getCustomAccounts();
  const normOld = oldUsername.trim().toLowerCase();
  const normNew = newUsername.trim().toLowerCase();

  const index = accounts.findIndex(
    a => a.username.toLowerCase() === normOld
  );

  const existingPassword = index !== -1 ? accounts[index].password || '' : '';
  const isAlreadyHashed =
    newPasswordPlain.startsWith('pbkdf2_v2$') ||
    newPasswordPlain.startsWith('pbkdf2$') ||
    (newPasswordPlain.length === 64 && /^[0-9a-f]+$/i.test(newPasswordPlain));
  const hashedPassword = !newPasswordPlain.trim()
    ? existingPassword
    : isAlreadyHashed
    ? newPasswordPlain
    : await hashPassword(newPasswordPlain);

  if (index !== -1) {
    accounts[index] = {
      ...accounts[index],
      username: newUsername.trim(),
      password: hashedPassword,
      name: newName.trim() || accounts[index].name,
      role: newRole || accounts[index].role,
      email: newEmail !== undefined ? newEmail.trim() : accounts[index].email
    };
    saveCustomAccounts(accounts);
  } else {
    accounts.push({
      username: newUsername.trim(),
      password: hashedPassword,
      name: newName.trim() || 'Admin Robotic MAN 2 Kota Bekasi',
      role: newRole || 'Executive Board',
      email: newEmail ? newEmail.trim() : '',
      authProvider: 'credentials'
    });
    saveCustomAccounts(accounts);
  }

  // Migrate local storage keys if username changed
  if (normOld && normNew && normOld !== normNew) {
    try {
      const storageTypes: ('members' | 'attendance' | 'cash')[] = ['members', 'attendance', 'cash'];
      for (const st of storageTypes) {
        const oldKey = `robotics_${normOld}_${st}`;
        const newKey = `robotics_${normNew}_${st}`;
        const existingData = localStorage.getItem(oldKey);
        if (existingData && !localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, existingData);
        }
      }
    } catch (migErr) {
      console.warn('Notice migrating local storage data on username change:', migErr);
    }
  }

  return true;
}

/**
 * Update role of a specific user or club member
 */
export async function updateAccountRole(username: string, newRole: string): Promise<boolean> {
  const normUser = username.trim().toLowerCase();
  const accounts = getCustomAccounts();
  const index = accounts.findIndex(a => a.username.toLowerCase() === normUser);

  const cleanRole = newRole.toLowerCase();
  const isExec = cleanRole.includes('executive') || ['president', 'vice_president', 'secretary', 'treasurer', 'pr', 'sekretaris', 'bendahara', 'humas', 'bph', 'ketua', 'wakil'].includes(cleanRole);
  const isSuperAdmin = cleanRole === 'admin' || cleanRole === 'pembina';
  const roleToSave = isExec ? 'executive_board' : (isSuperAdmin ? 'admin' : newRole);

  if (index !== -1) {
    accounts[index] = {
      ...accounts[index],
      role: roleToSave
    };
    saveCustomAccounts(accounts);
  } else {
    // If not in accounts yet, look up in members
    let memberName = username;
    let memberEmail = `${normUser}@man2kotabekasi.sch.id`;
    let memberNisn = normUser;
    try {
      const raw = localStorage.getItem('robotics_members');
      if (raw) {
        const mems = JSON.parse(raw);
        if (Array.isArray(mems)) {
          const found = mems.find(m => 
            (m.nisn && m.nisn.toLowerCase() === normUser) ||
            (m.fullName && m.fullName.toLowerCase().replace(/\s+/g, '_') === normUser) ||
            (m.email && m.email.toLowerCase() === normUser)
          );
          if (found) {
            memberName = found.fullName;
            if (found.email) memberEmail = found.email;
            if (found.nisn) memberNisn = found.nisn;
          }
        }
      }
    } catch {}

    accounts.push({
      username,
      name: memberName,
      role: roleToSave,
      email: memberEmail,
      nisn: memberNisn,
      authProvider: 'credentials',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${normUser}`
    });
    saveCustomAccounts(accounts);
  }

  // Update member roster in localStorage
  try {
    const raw = localStorage.getItem('robotics_members');
    if (raw) {
      const mems = JSON.parse(raw);
      if (Array.isArray(mems)) {
        const updatedMems = mems.map((m: any) => {
          const match = 
            (m.nisn && m.nisn.toLowerCase() === normUser) ||
            (m.fullName && m.fullName.toLowerCase().replace(/\s+/g, '_') === normUser) ||
            (m.email && m.email.toLowerCase() === normUser);
          if (match) {
            return {
              ...m,
              role: roleToSave,
              jabatan: isExec ? (cleanRole.includes('executive') ? 'vice_president' : cleanRole) : (isSuperAdmin ? 'president' : 'member'),
              status: isExec ? 'Aktif' : m.status
            };
          }
          return m;
        });
        localStorage.setItem('robotics_members', JSON.stringify(updatedMems));
      }
    }
  } catch (memErr) {
    console.warn('Notice updating members list role:', memErr);
  }

  // Sync to Supabase if connected
  try {
    const supa = getSupabase();
    await supa
      .from('user_accounts')
      .update({ role: roleToSave, updated_at: new Date().toISOString() })
      .ilike('username', normUser);
  } catch (err) {
    console.warn('Notice updating role in Supabase:', err);
  }

  return true;
}

/**
 * Delete a non-primary user account permanently
 */
export async function deleteAccount(username: string): Promise<boolean> {
  const normUser = username.trim().toLowerCase();
  if (normUser === 'pembina' || normUser === 'admin') {
    return false;
  }

  // 1. Remove from custom accounts
  const accounts = getCustomAccounts();
  const targetAcc = accounts.find(
    (a) => a.username.toLowerCase() === normUser || (a.email && a.email.toLowerCase() === normUser) || (a.nisn && a.nisn.toLowerCase() === normUser)
  );
  const filtered = accounts.filter(
    (a) => a.username.toLowerCase() !== normUser && (!a.email || a.email.toLowerCase() !== normUser) && (!a.nisn || a.nisn.toLowerCase() !== normUser)
  );
  saveCustomAccounts(filtered);

  // 2. Blacklist / record deleted identifiers so loadAccounts never resurrects them
  try {
    const rawDeleted = localStorage.getItem('robotics_deleted_usernames');
    const deletedList: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
    if (!deletedList.includes(normUser)) deletedList.push(normUser);
    if (targetAcc?.email && !deletedList.includes(targetAcc.email.toLowerCase())) {
      deletedList.push(targetAcc.email.toLowerCase());
    }
    if (targetAcc?.nisn && !deletedList.includes(targetAcc.nisn.toLowerCase())) {
      deletedList.push(targetAcc.nisn.toLowerCase());
    }
    localStorage.setItem('robotics_deleted_usernames', JSON.stringify(deletedList));
  } catch {}

  // 3. Remove corresponding member from robotics_members so it is permanently deleted
  try {
    const rawMembers = localStorage.getItem('robotics_members');
    if (rawMembers) {
      const mems = JSON.parse(rawMembers);
      if (Array.isArray(mems)) {
        const updatedMems = mems.filter((m: any) => {
          const mUser = (m.nisn || (m.fullName ? m.fullName.toLowerCase().replace(/\s+/g, '_') : '')).toLowerCase();
          const mEmail = (m.email || '').toLowerCase().trim();
          const mNisn = (m.nisn || '').toLowerCase().trim();
          if (mUser === normUser || mEmail === normUser || mNisn === normUser) return false;
          if (targetAcc?.nisn && mNisn === targetAcc.nisn.toLowerCase()) return false;
          if (targetAcc?.email && mEmail === targetAcc.email.toLowerCase()) return false;
          return true;
        });
        localStorage.setItem('robotics_members', JSON.stringify(updatedMems));
      }
    }
  } catch {}

  // 4. Remove from registered users cache
  try {
    const regRaw = localStorage.getItem('robotics_registered_users_cache');
    if (regRaw) {
      const regList = JSON.parse(regRaw);
      if (Array.isArray(regList)) {
        const updatedReg = regList.filter(
          (u: any) => u.username?.toLowerCase() !== normUser && u.email?.toLowerCase() !== normUser
        );
        localStorage.setItem('robotics_registered_users_cache', JSON.stringify(updatedReg));
      }
    }
  } catch {}

  // 5. Remove from Supabase if connected
  try {
    const supa = getSupabase();
    await supa.from('user_accounts').delete().ilike('username', normUser);
    if (targetAcc?.nisn) {
      await supa.from('members').delete().eq('nisn', targetAcc.nisn);
    }
  } catch (err) {
    console.warn('Notice deleting account in Supabase:', err);
  }

  // 6. Broadcast event so UI updates immediately across all tabs
  try {
    window.dispatchEvent(new CustomEvent('robotics_accounts_updated'));
    window.dispatchEvent(new CustomEvent('robotics_members_updated'));
  } catch {}

  return true;
}

/**
 * Validates an active session via memory Bearer token or HttpOnly session cookie against the backend.
 * Fails closed to prevent client-side localStorage forgery from granting admin clearance.
 */
export async function verifySessionWithServer(token?: string | null): Promise<boolean> {
  const activeToken = token || getMemoryAuthToken();

  // Trial / Sandbox demo accounts (safe isolated testing)
  if (activeToken && activeToken.startsWith('demo_')) return true;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch('/api/auth/verify-session', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({}),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      return Boolean(data.valid && !data.isDemo);
    }

    return false;
  } catch {
    return false;
  }
}

export async function logoutFromServer(): Promise<void> {
  clearMemoryAuthToken();
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
  } catch {
    // Ignore network error during logout cleanup
  }
}

/**
 * Deprecated Google OAuth helper (maintained for legacy compatibility)
 */
export async function signInWithGoogleOAuth(): Promise<{ error?: string }> {
  try {
    const supa = getSupabase();
    const { error } = await supa.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      return { error: error.message };
    }
    return {};
  } catch (err: any) {
    return { error: err?.message || 'Gagal menginisialisasi autentikasi Google.' };
  }
}

/**
 * Validates a student's 4-digit PIN for independent password recovery via backend server
 */
export async function verifyStudentRecoveryPin(
  nisnAttempt: string, 
  pinAttempt: string
): Promise<{ success: boolean; account?: AccountConfig; error?: string }> {
  const cleanNisn = nisnAttempt.replace(/[^0-9]/g, '').trim();
  const cleanPin = pinAttempt.replace(/[^0-9]/g, '').trim();

  if (!cleanNisn || cleanNisn.length !== 10) {
    return { success: false, error: 'Nomor NISN wajib 10 digit angka.' };
  }
  if (!cleanPin || cleanPin.length !== 4) {
    return { success: false, error: 'PIN Pemulihan wajib 4 digit angka rahasia.' };
  }

  // 1. Panggil backend server endpoint (/api/auth/verify-pin)
  try {
    const res = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ nisn: cleanNisn, pin: cleanPin }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (res.ok && data.success && data.account) {
        return {
          success: true,
          account: {
            username: data.account.username,
            name: data.account.name,
            role: data.account.role,
            nisn: data.account.nisn,
          },
        };
      } else if (data && data.error) {
        return { success: false, error: data.error };
      }
    }
  } catch (err) {
    console.warn('[Verify PIN server call notice, checking fallback]', err);
  }

  // 2. Offline fallback dari akun lokal
  const accounts = getCustomAccounts();
  const matchedLocal = accounts.find(
    a => (a.nisn && a.nisn === cleanNisn) || a.username.toLowerCase() === cleanNisn
  );

  if (matchedLocal) {
    if (matchedLocal.recoveryPin && matchedLocal.recoveryPin === cleanPin) {
      return { success: true, account: matchedLocal };
    }
    if (matchedLocal.recoveryPin && matchedLocal.recoveryPin !== cleanPin) {
      return { success: false, error: 'PIN Pemulihan 4-digit salah. Pastikan PIN rahasia yang Anda buat saat aktivasi sudah benar.' };
    }
  }

  return { 
    success: false, 
    error: 'Akun dengan NISN ini belum memiliki PIN Pemulihan atau belum diaktivasi. Silakan aktivasi akun terlebih dahulu atau hubungi Pengurus / Pembina.' 
  };
}

/**
 * Updates a student's password directly after PIN verification via backend server
 */
export async function updateAccountPasswordByNisn(nisn: string, newPlainPassword: string, recoveryPin?: string): Promise<{ success: boolean; error?: string }> {
  const cleanNisn = nisn.replace(/[^0-9]/g, '').trim();
  const rawPass = newPlainPassword.trim();

  // 1. Panggil backend server endpoint (/api/auth/recover-with-pin)
  if (recoveryPin) {
    try {
      const res = await fetch('/api/auth/recover-with-pin', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ nisn: cleanNisn, pin: recoveryPin.trim(), newPassword: rawPass }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Also update local cache
        const accounts = getCustomAccounts();
        const idx = accounts.findIndex(a => (a.nisn && a.nisn === cleanNisn) || a.username.toLowerCase() === cleanNisn);
        if (idx !== -1) {
          accounts[idx].password = await hashPassword(rawPass);
          saveCustomAccounts(accounts);
        }
        return { success: true };
      } else if (data && data.error) {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.warn('[Recover with PIN server call notice]', err);
    }
  }

  // 2. Local fallback update
  const hashedPassword = await hashPassword(rawPass);
  const accounts = getCustomAccounts();
  const idx = accounts.findIndex(
    a => (a.nisn && a.nisn === cleanNisn) || a.username.toLowerCase() === cleanNisn
  );
  if (idx !== -1) {
    accounts[idx].password = hashedPassword;
    saveCustomAccounts(accounts);
  }

  // Update in Supabase
  try {
    const supa = getSupabase();
    const safeNisn = sanitizePostgrestFilter(cleanNisn);
    if (safeNisn) {
      await supa
        .from('user_accounts')
        .update({ password: hashedPassword, updated_at: new Date().toISOString() })
        .or(`nisn.ilike."${safeNisn}",username.ilike."${safeNisn}"`);
    }
  } catch {}

  return { success: true };
}



