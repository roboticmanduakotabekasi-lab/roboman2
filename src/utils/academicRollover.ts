/**
 * src/utils/academicRollover.ts
 * Algoritma Kenaikan Kelas Otomatis (Batch Academic Grade Rollover):
 * 1. Transformasi Cerdas Tingkat Kelas (Regex & Roman/Arabic Numeral Parser):
 *    - Kelas 10 / X  ➔ Naik ke Kelas 11 / XI (Status: Aktif)
 *    - Kelas 11 / XI ➔ Naik ke Kelas 12 / XII (Status: Aktif)
 *    - Kelas 12 / XII ➔ Lulus Demisioner menjadi Alumni (Status: Alumni)
 * 2. Preview & Impact Audit: Memberikan ringkasan sebelum perubahan dieksekusi.
 * 3. Preservasi Riwayat: Tidak menghapus data lama, menjaga riwayat kas & presensi.
 */

import { Member } from '../types';

export interface RolloverMemberDetail {
  member: Member;
  oldGrade: string;
  newGrade: string;
  oldClassRoom: string;
  newClassRoom: string;
  oldStatus: string;
  newStatus: string;
  actionType: 'promote_11' | 'promote_12' | 'graduate_alumni' | 'unchanged';
  actionLabelId: string;
  actionLabelEn: string;
}

export interface RolloverPreviewSummary {
  totalActiveMembers: number;
  promotedTo11Count: number;
  promotedTo12Count: number;
  graduatedToAlumniCount: number;
  unchangedCount: number;
  details: RolloverMemberDetail[];
}

export function parseGradeLevel(rawGrade?: string, rawClassRoom?: string): 10 | 11 | 12 | null {
  const combined = `${rawGrade || ''} ${rawClassRoom || ''}`.toUpperCase().trim();

  // Check Roman first (order matters: XII before XI before X)
  if (/\bXII\b/i.test(combined) || combined.startsWith('XII') || combined.startsWith('12')) {
    return 12;
  }
  if (/\bXI\b/i.test(combined) || combined.startsWith('XI') || combined.startsWith('11')) {
    return 11;
  }
  if (/\bX\b/i.test(combined) || combined.startsWith('X') || combined.startsWith('10')) {
    return 10;
  }

  // Fallback to checking pure grade
  const g = (rawGrade || '').toUpperCase().trim();
  if (g === '12' || g === 'XII') return 12;
  if (g === '11' || g === 'XI') return 11;
  if (g === '10' || g === 'X') return 10;

  return null;
}

export function generateRolloverPreview(members: Member[]): RolloverPreviewSummary {
  const details: RolloverMemberDetail[] = [];
  let promotedTo11Count = 0;
  let promotedTo12Count = 0;
  let graduatedToAlumniCount = 0;
  let unchangedCount = 0;

  for (const m of members) {
    const curStatus = m.status || 'Aktif';
    const isAlreadyInactive =
      curStatus.toLowerCase() === 'alumni' ||
      curStatus.toLowerCase() === 'keluar' ||
      curStatus.toLowerCase() === 'resigned';

    if (isAlreadyInactive) {
      unchangedCount++;
      details.push({
        member: m,
        oldGrade: m.grade || '-',
        newGrade: m.grade || '-',
        oldClassRoom: m.classRoom || '-',
        newClassRoom: m.classRoom || '-',
        oldStatus: curStatus,
        newStatus: curStatus,
        actionType: 'unchanged',
        actionLabelId: 'Sudah Alumni / Keluar',
        actionLabelEn: 'Already Alumni / Resigned',
      });
      continue;
    }

    const level = parseGradeLevel(m.grade, m.classRoom);

    if (level === 10) {
      promotedTo11Count++;
      const isRoman = (m.grade || '').toUpperCase().includes('X');
      const newGrade = isRoman ? 'XI' : '11';
      details.push({
        member: m,
        oldGrade: m.grade || '10',
        newGrade,
        oldClassRoom: m.classRoom || '',
        newClassRoom: m.classRoom || '',
        oldStatus: curStatus,
        newStatus: 'Aktif',
        actionType: 'promote_11',
        actionLabelId: 'Naik ke Kelas 11',
        actionLabelEn: 'Promoted to Grade 11',
      });
    } else if (level === 11) {
      promotedTo12Count++;
      const isRoman = (m.grade || '').toUpperCase().includes('XI');
      const newGrade = isRoman ? 'XII' : '12';
      details.push({
        member: m,
        oldGrade: m.grade || '11',
        newGrade,
        oldClassRoom: m.classRoom || '',
        newClassRoom: m.classRoom || '',
        oldStatus: curStatus,
        newStatus: 'Aktif',
        actionType: 'promote_12',
        actionLabelId: 'Naik ke Kelas 12',
        actionLabelEn: 'Promoted to Grade 12',
      });
    } else if (level === 12) {
      graduatedToAlumniCount++;
      details.push({
        member: m,
        oldGrade: m.grade || '12',
        newGrade: m.grade || '12',
        oldClassRoom: m.classRoom || '',
        newClassRoom: m.classRoom || '',
        oldStatus: curStatus,
        newStatus: 'Alumni',
        actionType: 'graduate_alumni',
        actionLabelId: 'Lulus menjadi Alumni',
        actionLabelEn: 'Graduated to Alumni',
      });
    } else {
      unchangedCount++;
      details.push({
        member: m,
        oldGrade: m.grade || '-',
        newGrade: m.grade || '-',
        oldClassRoom: m.classRoom || '-',
        newClassRoom: m.classRoom || '-',
        oldStatus: curStatus,
        newStatus: curStatus,
        actionType: 'unchanged',
        actionLabelId: 'Format Kelas Tidak Dikenali',
        actionLabelEn: 'Unrecognized Class Format',
      });
    }
  }

  return {
    totalActiveMembers: members.length - unchangedCount,
    promotedTo11Count,
    promotedTo12Count,
    graduatedToAlumniCount,
    unchangedCount,
    details,
  };
}

export function applyBatchRollover(
  members: Member[],
  customClassRoomOverrides?: Record<string, string>
): Member[] {
  const preview = generateRolloverPreview(members);
  const detailMap = new Map(
    preview.details.map((d) => [d.member.nisn || String(d.member.id_member || d.member.fullName), d])
  );

  return members.map((m) => {
    const key = m.nisn || String(m.id_member || m.fullName);
    const plan = detailMap.get(key);
    if (!plan || plan.actionType === 'unchanged') {
      return m;
    }

    const overriddenRoom =
      customClassRoomOverrides && customClassRoomOverrides[key] !== undefined
        ? customClassRoomOverrides[key].trim().toUpperCase()
        : plan.newClassRoom;

    return {
      ...m,
      grade: plan.newGrade,
      classRoom: overriddenRoom,
      status: plan.newStatus as any,
    };
  });
}
