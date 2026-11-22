// Email verification token management
// Tokens are stored in data/email_verifications.json as an array of objects
// { token: string, identifier: string, expiresAt: number }

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const VERIF_FILE = path.join(DATA_DIR, 'email_verifications.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('[EmailVerification] ensureDataDir error', e);
  }
}

export interface EmailVerificationRecord {
  token: string;
  identifier: string; // email or username used for registration
  expiresAt: number; // unix ms
}

export function loadEmailVerifications(): EmailVerificationRecord[] {
  ensureDataDir();
  try {
    if (fs.existsSync(VERIF_FILE)) {
      const raw = fs.readFileSync(VERIF_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as EmailVerificationRecord[];
    }
  } catch (e) {
    console.warn('[EmailVerification] load error', e);
  }
  return [];
}

export function saveEmailVerifications(records: EmailVerificationRecord[]): void {
  ensureDataDir();
  try {
    const temp = `${VERIF_FILE}.tmp.${Date.now()}`;
    try {
      fs.writeFileSync(temp, JSON.stringify(records, null, 2), 'utf8');
      fs.renameSync(temp, VERIF_FILE);
    } catch {
      fs.writeFileSync(VERIF_FILE, JSON.stringify(records, null, 2), 'utf8');
      try {
        if (fs.existsSync(temp)) fs.unlinkSync(temp);
      } catch {}
    }
  } catch (e) {
    console.error('[EmailVerification] save error', e);
  }
}

export function addVerificationRecord(record: EmailVerificationRecord): void {
  const records = loadEmailVerifications();
  records.push(record);
  saveEmailVerifications(records);
}

export function removeVerificationRecord(token: string): void {
  const records = loadEmailVerifications().filter(r => r.token !== token);
  saveEmailVerifications(records);
}
