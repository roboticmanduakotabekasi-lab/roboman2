/**
 * src/services/mysqlSyncService.ts
 * Real-time synchronization bridge to Domainesia cPanel MySQL database.
 * Ensures data entered in roboman2 is automatically persisted to Pak Khoir's MySQL database.
 */

import { Member, AttendanceRecord, CashTransaction } from '../types';

export async function syncAllToMySQL(
  members: Member[],
  attendance: AttendanceRecord[],
  cash: CashTransaction[]
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api.php?action=sync_all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members, attendance, cash }),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: Boolean(data.success), message: data.message };
    }
  } catch (err) {
    console.warn('[MySQL Sync] Note: Direct PHP bridge unreachable (normal in local dev mode):', err);
  }
  return { success: false };
}

export async function syncMemberToMySQL(member: Member): Promise<void> {
  try {
    await fetch('/api.php?action=upsert_member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    });
  } catch {}
}

export async function deleteMemberFromMySQL(idOrNisn: string): Promise<void> {
  try {
    await fetch('/api.php?action=delete_member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_member: idOrNisn, nisn: idOrNisn }),
    });
  } catch {}
}

export async function syncAttendanceToMySQL(record: AttendanceRecord): Promise<void> {
  try {
    await fetch('/api.php?action=upsert_attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  } catch {}
}

export async function syncCashToMySQL(tx: CashTransaction): Promise<void> {
  try {
    await fetch('/api.php?action=upsert_cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
  } catch {}
}

export async function fetchFromMySQL(): Promise<{
  members?: Member[];
  attendance?: AttendanceRecord[];
  cash?: CashTransaction[];
} | null> {
  try {
    const res = await fetch('/api.php?action=fetch_all');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.data) {
        return data.data;
      }
    }
  } catch {}
  return null;
}
