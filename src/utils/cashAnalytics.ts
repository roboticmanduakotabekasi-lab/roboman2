/**
 * src/utils/cashAnalytics.ts
 * Algoritma Akumulasi Tunggakan Kas Kumulatif (Cumulative Arrears Ledger):
 * 1. Evaluasi total minggu berjalan dalam periode aktif.
 * 2. Perhitungan buku besar tunggakan kumulatif per anggota.
 * 3. Identifikasi minggu-minggu spesifik yang belum lunas.
 * 4. Peringkat penunggak kas untuk prioritas penagihan bendahara.
 * 5. Generator draf rincian tagihan WhatsApp bilingual otomatis.
 */

import { Member, CashTransaction } from '../types';

export interface MemberCashArrears {
  memberNisn: string;
  memberName: string;
  memberClass: string;
  memberPhone?: string;
  totalPaid: number;
  expectedAmount: number;
  totalArrears: number; // Nominal yang belum dibayar
  paidWeeksCount: number;
  unpaidWeeksCount: number;
  unpaidWeeksLabels: string[];
  status: 'lunas' | 'menunggak' | 'lebih_bayar';
  waBillingMessageId: string;
  waBillingMessageEn: string;
}

export interface CashAnalyticsSummary {
  standardWeeklyFee: number;
  totalElapsedWeeks: number;
  totalExpectedFromMembers: number;
  totalCollectedFromMembers: number;
  totalOutstandingArrears: number;
  collectionRate: number; // 0 - 100%
  totalDebtorsCount: number;
  debtorMembers: MemberCashArrears[];
  memberArrearsMap: Map<string, MemberCashArrears>;
}

export function formatRupiahSimple(val: number): string {
  return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
}

function normalizeId(str?: string | number): string {
  if (!str) return '';
  return String(str).trim().toLowerCase();
}

/**
 * Extracts month key and week number from transaction description
 * E.g., "Kas Minggu 2 Bulan November 2026" or "Iuran Kas Mgg 1"
 */
export function extractWeekFromKeterangan(ket: string, txDate: string): { monthKey: string; weekNum: number } {
  const norm = ket.toLowerCase();
  
  // Week number extraction
  let weekNum = 1;
  const weekMatch = norm.match(/(?:minggu|mgg|w)\s*(\d+)/i);
  if (weekMatch && weekMatch[1]) {
    weekNum = Math.min(Math.max(1, parseInt(weekMatch[1], 10)), 5);
  } else if (txDate) {
    const d = new Date(txDate);
    if (!isNaN(d.getTime())) {
      const dayOfMonth = d.getDate();
      weekNum = Math.min(Math.ceil(dayOfMonth / 7), 5);
    }
  }

  // Month extraction
  let monthKey = '';
  const monthNames = [
    { name: 'januari', key: '01' }, { name: 'februari', key: '02' }, { name: 'maret', key: '03' },
    { name: 'april', key: '04' }, { name: 'mei', key: '05' }, { name: 'juni', key: '06' },
    { name: 'juli', key: '07' }, { name: 'agustus', key: '08' }, { name: 'september', key: '09' },
    { name: 'oktober', key: '10' }, { name: 'november', key: '11' }, { name: 'desember', key: '12' },
  ];

  for (const m of monthNames) {
    if (norm.includes(m.name)) {
      const yearMatch = norm.match(/20\d\d/);
      const year = yearMatch ? yearMatch[0] : (txDate ? txDate.split('-')[0] : '2026');
      monthKey = `${year}-${m.key}`;
      break;
    }
  }

  if (!monthKey && txDate && txDate.includes('-')) {
    const parts = txDate.split('-');
    if (parts.length >= 2) {
      monthKey = `${parts[0]}-${parts[1]}`;
    }
  }

  if (!monthKey) {
    monthKey = '2026-11';
  }

  return { monthKey, weekNum };
}

export function analyzeCashArrears(
  members: Member[],
  cash: CashTransaction[],
  standardWeeklyFee: number = 5000
): CashAnalyticsSummary {
  // Filter hanya anggota aktif
  const activeMembers = members.filter((m) => {
    const st = (m.status || 'aktif').toLowerCase();
    return st === 'aktif' || st === 'active' || st === 'executive_board';
  });

  // Kumpulkan semua minggu unik yang tercatat dalam transaksi kas masuk anggota
  const memberInflowTxs = cash.filter((c) => {
    if (c.jenis !== 'Masuk') return false;
    const name = (c.namaAnggota || c.namaSiswa || '').toLowerCase();
    return name !== 'kas organisasi' && name !== 'saldo awal' && name !== 'donasi';
  });

  // Himpunan minggu tercatat dalam sistem: misal "2026-10:W1", "2026-10:W2", dll.
  const allRecordedWeekSet = new Set<string>();
  for (const tx of memberInflowTxs) {
    const { monthKey, weekNum } = extractWeekFromKeterangan(tx.keterangan || '', tx.tanggal || '');
    allRecordedWeekSet.add(`${monthKey}:W${weekNum}`);
  }

  // Jika belum ada data transaksi sama sekali, minimal anggap 1 minggu default
  if (allRecordedWeekSet.size === 0) {
    allRecordedWeekSet.add('2026-11:W1');
  }

  const sortedAllWeeks = Array.from(allRecordedWeekSet).sort();
  const totalElapsedWeeks = sortedAllWeeks.length;
  const expectedAmountPerMember = totalElapsedWeeks * standardWeeklyFee;

  const memberArrearsMap = new Map<string, MemberCashArrears>();
  const debtorsList: MemberCashArrears[] = [];

  let totalCollectedFromMembers = 0;
  let totalOutstandingArrears = 0;

  for (const member of activeMembers) {
    const memNisn = String(member.nisn || member.id_member || '').trim();
    const memName = member.fullName || member.full_name || 'Anggota';
    const memClass = `${member.grade || ''} ${member.classRoom || ''}`.trim();
    const memPhone = member.personalPhone || member.parentPhone || '';

    // Ambil semua transaksi pembayaran siswa ini
    const myTxs = memberInflowTxs.filter((tx) => {
      const txNisn = normalizeId(tx.nisn || tx.id_member);
      const txName = normalizeId(tx.namaAnggota || tx.namaSiswa || tx.nama_anggota);
      return (
        (memNisn && txNisn === normalizeId(memNisn)) ||
        (memName && txName === normalizeId(memName))
      );
    });

    const totalPaid = myTxs.reduce((sum, tx) => sum + (Number(tx.jumlah) || 0), 0);
    totalCollectedFromMembers += totalPaid;

    // Catat minggu-minggu yang sudah dibayar oleh siswa ini
    const paidWeeksSet = new Set<string>();
    for (const tx of myTxs) {
      const { monthKey, weekNum } = extractWeekFromKeterangan(tx.keterangan || '', tx.tanggal || '');
      paidWeeksSet.add(`${monthKey}:W${weekNum}`);
    }

    // Cari minggu apa saja yang belum dibayar
    const unpaidWeeksLabels: string[] = [];
    for (const wKey of sortedAllWeeks) {
      if (!paidWeeksSet.has(wKey)) {
        // Format label yang mudah dibaca, e.g. "Nov Mgg 2"
        const [mKey, w] = wKey.split(':');
        const monthNum = mKey.split('-')[1];
        const monthShortNames: Record<string, string> = {
          '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'Mei', '06': 'Jun',
          '07': 'Jul', '08': 'Agu', '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des',
        };
        const mShort = monthShortNames[monthNum] || mKey;
        unpaidWeeksLabels.push(`${mShort} ${w.replace('W', 'Mgg ')}`);
      }
    }

    const totalArrears = Math.max(0, expectedAmountPerMember - totalPaid);
    totalOutstandingArrears += totalArrears;

    let status: 'lunas' | 'menunggak' | 'lebih_bayar' = 'lunas';
    if (totalArrears > 0) {
      status = 'menunggak';
    } else if (totalPaid > expectedAmountPerMember) {
      status = 'lebih_bayar';
    }

    const arrearsFormatted = formatRupiahSimple(totalArrears);
    const unpaidBreakdown = unpaidWeeksLabels.length > 0 ? unpaidWeeksLabels.join(', ') : 'Semua minggu lunas';

    const waBillingMessageId = `Halo ${memName}! 👋 Catatan dari Bendahara Ekskul Robotika (roboman2): kamu memiliki saldo iuran kas tertunggak sebesar ${arrearsFormatted} (${unpaidWeeksLabels.length} minggu: ${unpaidBreakdown}). Mohon diselesaikan pada pertemuan latihan berikutnya ya. Terima kasih banyak atas kerjasamanya! 🤖💰`;
    const waBillingMessageEn = `Hi ${memName}! 👋 Notice from roboman2 Robotics Club Treasurer: you currently have outstanding club dues of ${arrearsFormatted} (${unpaidWeeksLabels.length} unpaid week(s): ${unpaidBreakdown}). Please settle this at our next workshop meeting. Thank you for your support! 🤖💰`;

    const arrearsData: MemberCashArrears = {
      memberNisn: memNisn,
      memberName: memName,
      memberClass: memClass,
      memberPhone: memPhone,
      totalPaid,
      expectedAmount: expectedAmountPerMember,
      totalArrears,
      paidWeeksCount: paidWeeksSet.size,
      unpaidWeeksCount: unpaidWeeksLabels.length,
      unpaidWeeksLabels,
      status,
      waBillingMessageId,
      waBillingMessageEn,
    };

    memberArrearsMap.set(memNisn, arrearsData);
    if (status === 'menunggak') {
      debtorsList.push(arrearsData);
    }
  }

  // Urutkan penunggak dari nominal tunggakan terbesar ke terkecil
  debtorsList.sort((a, b) => b.totalArrears - a.totalArrears);

  const totalExpectedFromMembers = activeMembers.length * expectedAmountPerMember;
  const collectionRate =
    totalExpectedFromMembers > 0
      ? Math.min(100, Math.round((totalCollectedFromMembers / totalExpectedFromMembers) * 100))
      : 100;

  return {
    standardWeeklyFee,
    totalElapsedWeeks,
    totalExpectedFromMembers,
    totalCollectedFromMembers,
    totalOutstandingArrears,
    collectionRate,
    totalDebtorsCount: debtorsList.length,
    debtorMembers: debtorsList,
    memberArrearsMap,
  };
}
