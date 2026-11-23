/**
 * src/services/mysqlSyncService.ts
 * Real-time synchronization bridge to Domainesia cPanel MySQL database.
 * Ensures data entered in roboman2 is automatically persisted to Pak Khoir's MySQL database.
 */

import {
  Member,
  AttendanceRecord,
  CashTransaction,
  Announcement,
  MaterialAssignment,
  AssignmentSubmission,
  AllowedMember,
} from '../types';
import { AccountConfig } from '../utils/authConfig';

export async function syncAllToMySQL(
  members: Member[],
  attendance: AttendanceRecord[],
  cash: CashTransaction[]
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('./api.php?action=sync_all', {
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
    await fetch('./api.php?action=upsert_member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    });
  } catch {}
}

export async function deleteMemberFromMySQL(idOrNisn: string): Promise<void> {
  try {
    await fetch('./api.php?action=delete_member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_member: idOrNisn, nisn: idOrNisn }),
    });
  } catch {}
}

export async function syncAttendanceToMySQL(record: AttendanceRecord): Promise<void> {
  try {
    await fetch('./api.php?action=upsert_attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  } catch {}
}

export async function deleteAttendanceFromMySQL(id: string, tanggal?: string, id_member?: string): Promise<void> {
  try {
    await fetch('./api.php?action=delete_attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, tanggal, id_member }),
    });
  } catch {}
}

export async function syncCashToMySQL(tx: CashTransaction): Promise<void> {
  try {
    await fetch('./api.php?action=upsert_cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
  } catch {}
}

export async function deleteCashFromMySQL(id: string): Promise<void> {
  try {
    await fetch('./api.php?action=delete_cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  } catch {}
}

export async function fetchFromMySQL(): Promise<{
  members?: Member[];
  attendance?: AttendanceRecord[];
  cash?: CashTransaction[];
} | null> {
  try {
    const res = await fetch('./api.php?action=fetch_all');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.data) {
        return data.data;
      }
    }
  } catch {}
  return null;
}

// ----------------------------------------------------------------------
// FULL BACKUP IMPLEMENTATION FOR PHP / MYSQL (Domainesia cPanel)
// Allows roboman2 to operate 100% autonomously without Supabase
// ----------------------------------------------------------------------

// ANNOUNCEMENTS
export async function fetchAnnouncementsFromMySQL(): Promise<Announcement[]> {
  try {
    const res = await fetch('./api.php?action=fetch_announcements');
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.announcements)) {
        return data.announcements.map((row: any) => ({
          id: String(row.id),
          title: String(row.title || ''),
          content: String(row.content || ''),
          event_date: row.event_date || undefined,
          location: row.location || 'Workshop Robotika roboman2',
          author_name: row.author_name || 'Pengurus Ekskul',
          created_at: row.created_at || new Date().toISOString(),
        }));
      }
    }
  } catch {}
  return [];
}

export async function upsertAnnouncementToMySQL(announcement: Partial<Announcement>): Promise<boolean> {
  try {
    const res = await fetch('./api.php?action=upsert_announcement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        event_date: announcement.event_date,
        location: announcement.location,
        author_name: announcement.author_name,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data?.success);
    }
  } catch {}
  return false;
}

export async function deleteAnnouncementFromMySQL(id: string): Promise<boolean> {
  try {
    const res = await fetch('./api.php?action=delete_announcement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data?.success);
    }
  } catch {}
  return false;
}

// ASSIGNMENTS & MATERIALS
export async function fetchAssignmentsFromMySQL(): Promise<MaterialAssignment[]> {
  try {
    const res = await fetch('./api.php?action=fetch_assignments');
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.assignments)) {
        return data.assignments.map((row: any) => ({
          id: String(row.id),
          title: String(row.title || ''),
          description: String(row.description || ''),
          type: (row.type === 'assignment' ? 'assignment' : 'material') as 'material' | 'assignment',
          deadline: row.deadline || undefined,
          attachment_url: row.attachment_url || undefined,
          grading_type: (row.grading_type === 'binary' ? 'binary' : 'numeric') as 'numeric' | 'binary',
          max_score: Number(row.max_score || 100),
          created_by: row.created_by || '',
          created_at: row.created_at || new Date().toISOString(),
        }));
      }
    }
  } catch {}
  return [];
}

export async function upsertAssignmentToMySQL(assignment: Partial<MaterialAssignment>): Promise<boolean> {
  try {
    const res = await fetch('./api.php?action=upsert_assignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        type: assignment.type,
        deadline: assignment.deadline,
        attachment_url: assignment.attachment_url,
        grading_type: assignment.grading_type,
        max_score: assignment.max_score,
        created_by: assignment.created_by,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data?.success);
    }
  } catch {}
  return false;
}

export async function deleteAssignmentFromMySQL(id: string): Promise<boolean> {
  try {
    const res = await fetch('./api.php?action=delete_assignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data?.success);
    }
  } catch {}
  return false;
}

// SUBMISSIONS
export async function fetchSubmissionsFromMySQL(assignmentId?: string, studentId?: string): Promise<AssignmentSubmission[]> {
  try {
    let url = './api.php?action=fetch_submissions';
    if (assignmentId) url += `&assignment_id=${encodeURIComponent(assignmentId)}`;
    if (studentId) url += `&student_id=${encodeURIComponent(studentId)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.submissions)) {
        return data.submissions.map((row: any) => ({
          id: String(row.id),
          assignment_id: String(row.assignment_id),
          student_id: String(row.student_id),
          student_email: String(row.student_email || ''),
          student_name: String(row.student_name || ''),
          submission_text: row.submission_text || undefined,
          submission_link: row.submission_link || undefined,
          status: (row.status === 'graded' ? 'graded' : 'submitted') as 'submitted' | 'graded',
          score_numeric: row.score_numeric !== null ? Number(row.score_numeric) : undefined,
          score_binary: row.score_binary as any,
          feedback: row.feedback || undefined,
          submitted_at: row.submitted_at || new Date().toISOString(),
          graded_at: row.graded_at || undefined,
          graded_by: row.graded_by || undefined,
        }));
      }
    }
  } catch {}
  return [];
}

export async function submitAssignmentToMySQL(sub: Partial<AssignmentSubmission>): Promise<boolean> {
  try {
    const res = await fetch('./api.php?action=submit_assignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sub.id,
        assignment_id: sub.assignment_id,
        student_id: sub.student_id,
        student_email: sub.student_email,
        student_name: sub.student_name,
        submission_text: sub.submission_text,
        submission_link: sub.submission_link,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data?.success);
    }
  } catch {}
  return false;
}

export async function gradeSubmissionToMySQL(
  id: string,
  scoreNumeric?: number,
  scoreBinary?: string,
  feedback?: string,
  gradedBy?: string
): Promise<boolean> {
  try {
    const res = await fetch('./api.php?action=grade_submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        score_numeric: scoreNumeric,
        score_binary: scoreBinary,
        feedback,
        graded_by: gradedBy,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data?.success);
    }
  } catch {}
  return false;
}

// USER ACCOUNTS
export async function fetchUsersFromMySQL(): Promise<AccountConfig[]> {
  try {
    const res = await fetch('./api.php?action=fetch_users');
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.users)) {
        return data.users.map((row: any) => ({
          username: String(row.username).trim(),
          name: String(row.name || row.username).trim(),
          role: String(row.role || 'Club Member').trim(),
          email: String(row.email || '').trim(),
          nisn: row.nisn ? String(row.nisn).trim() : undefined,
          recoveryPin: row.recovery_pin || undefined,
          authProvider: row.auth_provider === 'google' ? 'google' : 'credentials',
          avatarUrl: row.avatar_url || '',
        }));
      }
    }
  } catch {}
  return [];
}

export async function deleteUserFromMySQL(username: string): Promise<boolean> {
  try {
    const res = await fetch('./api.php?action=delete_user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data?.success);
    }
  } catch {}
  return false;
}

// ALLOWED MEMBERS
export async function fetchAllowedMembersFromMySQL(): Promise<AllowedMember[]> {
  try {
    const res = await fetch('./api.php?action=fetch_allowed_members');
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.allowed_members)) {
        return data.allowed_members.map((row: any) => ({
          id: String(row.id),
          email: String(row.email),
          namaLengkap: String(row.nama_lengkap || ''),
          nama_lengkap: String(row.nama_lengkap || ''),
          nisAtauKelas: row.nis_atau_kelas || '',
          nis_atau_kelas: row.nis_atau_kelas || '',
          jabatanEkskul: row.jabatan_ekskul || 'member',
          jabatan_ekskul: row.jabatan_ekskul || 'member',
          statusAkun: row.status_akun || 'unclaimed',
          status_akun: row.status_akun || 'unclaimed',
        }));
      }
    }
  } catch {}
  return [];
}

export async function bulkAddAllowedMembersToMySQL(members: any[]): Promise<boolean> {
  try {
    const res = await fetch('./api.php?action=bulk_add_allowed_members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members }),
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data?.success);
    }
  } catch {}
  return false;
}

export async function deleteAllowedMemberFromMySQL(idOrEmail: string): Promise<boolean> {
  try {
    const res = await fetch('./api.php?action=delete_allowed_member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: idOrEmail, email: idOrEmail }),
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data?.success);
    }
  } catch {}
  return false;
}
