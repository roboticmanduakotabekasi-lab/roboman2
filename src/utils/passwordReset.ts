// Utility for managing password‑reset tokens stored in ./data/password_reset.json
// The file contains an array of objects:
// {
//   token: string,
//   username: string,
//   expiresAt: number, // epoch ms
//   used: boolean
// }

import fs from 'fs';
import path from 'path';

export interface PasswordResetEntry {
  token: string;
  username: string;
  expiresAt: number;
  used: boolean;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const RESET_FILE = path.join(DATA_DIR, 'password_reset.json');

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('[PasswordReset] ensureDataDir failed:', e);
  }
}

export function loadPasswordResets(): PasswordResetEntry[] {
  try {
    ensureDataDir();
    if (fs.existsSync(RESET_FILE)) {
      const raw = fs.readFileSync(RESET_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as PasswordResetEntry[];
    }
  } catch (e) {
    console.warn('[PasswordReset] load failed:', e);
  }
  return [];
}

export function savePasswordResets(entries: PasswordResetEntry[]): void {
  try {
    ensureDataDir();
    const temp = `${RESET_FILE}.tmp.${Date.now()}`;
    try {
      fs.writeFileSync(temp, JSON.stringify(entries, null, 2), 'utf8');
      fs.renameSync(temp, RESET_FILE);
    } catch {
      fs.writeFileSync(RESET_FILE, JSON.stringify(entries, null, 2), 'utf8');
      try {
        if (fs.existsSync(temp)) fs.unlinkSync(temp);
      } catch {}
    }
  } catch (e) {
    console.error('[PasswordReset] save failed:', e);
  }
}
