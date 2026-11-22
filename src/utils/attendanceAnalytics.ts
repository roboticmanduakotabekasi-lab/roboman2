/**
 * src/utils/attendanceAnalytics.ts
 * Algoritma Deteksi Risiko Siswa Tidak Aktif / Rawan Drop-Out:
 * 1. Consecutive Absence Detector (Mendeteksi Alpa beruntun).
 * 2. Longitudinal Attendance Rate (Tingkat kehadiran kumulatif per siswa).
 * 3. Early Warning Risk Scorer (Mengklasifikasikan: Normal / Warning / Critical).
 * 4. Automated Check-In Template Generator (Pesan tindak lanjut untuk Humas/Sekretaris).
 */

import { Member, AttendanceRecord } from '../types';

export type RiskLevel = 'good' | 'warning' | 'critical';

export interface MemberAttendanceAnalytics {
  memberNisn: string;
  memberName: string;
  memberClass: string;
  memberPhone?: string;
  totalMeetings: number;
  presentCount: number;
  excusedCount: number;
  sickCount: number;
  alphaCount: number;
  attendanceRate: number; // 0 - 100
  consecutiveAlpha: number; // Jumlah alpa berturut-turut pada sesi-sesi terakhir
  lastAttendedDate?: string;
  riskLevel: RiskLevel;
  riskReason: string;
  riskReasonEn: string;
  waCheckInMessageId: string;
  waCheckInMessageEn: string;
}

export interface AttendanceAnalyticsSummary {
  totalAnalyzedMembers: number;
  criticalCount: number;
  warningCount: number;
  goodCount: number;
  averageRate: number;
  memberMap: Map<string, MemberAttendanceAnalytics>;
  atRiskMembers: MemberAttendanceAnalytics[];
}

function normalizeId(str?: string | number): string {
  if (!str) return '';
  return String(str).trim().toLowerCase();
}

function isPresent(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'present' || s === 'hadir';
}

function isExcused(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'excused' || s === 'izin';
}

function isSick(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'sick' || s === 'sakit';
}

function isAlpha(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'unexcused' || s === 'alpha' || s === 'alpa';
}

export function analyzeAttendance(
  members: Member[],
  attendance: AttendanceRecord[]
): AttendanceAnalyticsSummary {
  // 1. Dapatkan daftar semua tanggal pertemuan unik secara kronologis
  const uniqueDates = Array.from(new Set(attendance.map((a) => a.tanggal).filter(Boolean))).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const totalMeetings = uniqueDates.length;
  const memberMap = new Map<string, MemberAttendanceAnalytics>();
  const atRiskList: MemberAttendanceAnalytics[] = [];

  let sumRate = 0;
  let criticalCount = 0;
  let warningCount = 0;
  let goodCount = 0;

  // Filter hanya anggota berstatus aktif
  const activeMembers = members.filter((m) => {
    const st = (m.status || 'aktif').toLowerCase();
    return st === 'aktif' || st === 'active' || st === 'executive_board';
  });

  for (const member of activeMembers) {
    const memNisn = String(member.nisn || member.id_member || '').trim();
    const memName = member.fullName || member.full_name || 'Anggota';
    const memClass = `${member.grade || ''} ${member.classRoom || ''}`.trim();
    const memPhone = member.personalPhone || member.parentPhone || '';

    // Ambil semua catatan absensi siswa ini
    const memberRecords = attendance.filter((a) => {
      const aNisn = normalizeId(a.nisn || a.id_member);
      const aName = normalizeId(a.namaAnggota || a.nama_anggota);
      return (
        (memNisn && aNisn === normalizeId(memNisn)) ||
        (memName && aName === normalizeId(memName))
      );
    });

    // Peta catatan berdasarkan tanggal
    const recordByDate = new Map<string, AttendanceRecord>();
    for (const r of memberRecords) {
      if (r.tanggal) {
        recordByDate.set(r.tanggal, r);
      }
    }

    let presentCount = 0;
    let excusedCount = 0;
    let sickCount = 0;
    let alphaCount = 0;
    let lastAttendedDate: string | undefined = undefined;

    // Evaluasi riwayat per pertemuan yang pernah ada
    for (const d of uniqueDates) {
      const r = recordByDate.get(d);
      if (r) {
        if (isPresent(r.status)) {
          presentCount++;
          lastAttendedDate = d;
        } else if (isExcused(r.status)) {
          excusedCount++;
        } else if (isSick(r.status)) {
          sickCount++;
        } else if (isAlpha(r.status)) {
          alphaCount++;
        }
      }
    }

    // Hitung Alpa Berturut-turut pada sesi-sesi terakhir (mundur dari tanggal terbaru)
    let consecutiveAlpha = 0;
    for (let i = uniqueDates.length - 1; i >= 0; i--) {
      const d = uniqueDates[i];
      const r = recordByDate.get(d);
      if (r && isAlpha(r.status)) {
        consecutiveAlpha++;
      } else if (r && (isPresent(r.status) || isExcused(r.status) || isSick(r.status))) {
        break; // Berhenti jika ada kehadiran atau surat izin/sakit
      }
    }

    // Hitung persentase kehadiran
    const effectiveMeetings = totalMeetings > 0 ? totalMeetings : 1;
    const attendanceRate = totalMeetings > 0 ? Math.round((presentCount / effectiveMeetings) * 100) : 100;
    sumRate += attendanceRate;

    // Klasifikasi Tingkat Risiko (Risk Classification Engine)
    let riskLevel: RiskLevel = 'good';
    let riskReason = 'Kehadiran terpantau aktif dan baik';
    let riskReasonEn = 'Regular attendance, in good standing';

    if (consecutiveAlpha >= 3 || (totalMeetings >= 4 && attendanceRate < 50)) {
      riskLevel = 'critical';
      riskReason =
        consecutiveAlpha >= 3
          ? `Alpa ${consecutiveAlpha}x pertemuan berturut-turut`
          : `Kehadiran kritis (${attendanceRate}%) dari ${totalMeetings} pertemuan`;
      riskReasonEn =
        consecutiveAlpha >= 3
          ? `Absent ${consecutiveAlpha} consecutive meetings`
          : `Critical attendance rate (${attendanceRate}%) across ${totalMeetings} meetings`;
      criticalCount++;
    } else if (consecutiveAlpha >= 2 || (totalMeetings >= 3 && attendanceRate < 70)) {
      riskLevel = 'warning';
      riskReason =
        consecutiveAlpha >= 2
          ? `Alpa ${consecutiveAlpha}x berturut-turut`
          : `Tingkat hadir di bawah target (${attendanceRate}%)`;
      riskReasonEn =
        consecutiveAlpha >= 2
          ? `Absent ${consecutiveAlpha} times consecutively`
          : `Attendance below target (${attendanceRate}%)`;
      warningCount++;
    } else {
      goodCount++;
    }

    // Generator pesan ramah follow-up WhatsApp
    const waCheckInMessageId = `Halo ${memName}! 👋 Kami dari pengurus Ekskul Robotika (roboman2). Kami perhatikan kamu belum dapat hadir di ${consecutiveAlpha > 0 ? `${consecutiveAlpha} sesi latihan terakhir` : 'beberapa sesi workshop'}. Apakah ada kendala atau jadwal bentrok yang bisa kami bantu? Ditunggu kehadirannya di pertemuan berikutnya ya! 🤖✨`;
    const waCheckInMessageEn = `Hi ${memName}! 👋 Greetings from the roboman2 Robotics Club. We noticed you missed ${consecutiveAlpha > 0 ? `the last ${consecutiveAlpha} workshop sessions` : 'recent meetings'}. Is everything alright or do you have any schedule conflicts we can help with? Looking forward to seeing you at our next workshop! 🤖✨`;

    const analytics: MemberAttendanceAnalytics = {
      memberNisn: memNisn,
      memberName: memName,
      memberClass: memClass,
      memberPhone: memPhone,
      totalMeetings,
      presentCount,
      excusedCount,
      sickCount,
      alphaCount,
      attendanceRate,
      consecutiveAlpha,
      lastAttendedDate,
      riskLevel,
      riskReason,
      riskReasonEn,
      waCheckInMessageId,
      waCheckInMessageEn,
    };

    memberMap.set(memNisn, analytics);
    if (riskLevel !== 'good') {
      atRiskList.push(analytics);
    }
  }

  // Urutkan siswa berisiko dari yang paling kritis (critical duluan, lalu alpa terbanyak)
  atRiskList.sort((a, b) => {
    if (a.riskLevel === 'critical' && b.riskLevel !== 'critical') return -1;
    if (b.riskLevel === 'critical' && a.riskLevel !== 'critical') return 1;
    return b.consecutiveAlpha - a.consecutiveAlpha || a.attendanceRate - b.attendanceRate;
  });

  const averageRate = activeMembers.length > 0 ? Math.round(sumRate / activeMembers.length) : 100;

  return {
    totalAnalyzedMembers: activeMembers.length,
    criticalCount,
    warningCount,
    goodCount,
    averageRate,
    memberMap,
    atRiskMembers: atRiskList,
  };
}
