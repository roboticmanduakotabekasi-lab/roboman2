import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, CashTransaction } from '../types';
import { analyzeCashArrears, MemberCashArrears, formatRupiahSimple } from '../utils/cashAnalytics';
import { useLanguage } from '../utils/i18n';
import { smartFilter } from '../utils/smartSearch';
import { Receipt, Search, Send, AlertCircle, CheckCircle2, X, Wallet, Users, ArrowUpRight, Copy, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  cash: CashTransaction[];
  standardWeeklyFee?: number;
}

export const CashArrearsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  members,
  cash,
  standardWeeklyFee = 5000,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [searchQ, setSearchQ] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'MENUNGGAK' | 'LUNAS'>('MENUNGGAK');
  const [copiedNisn, setCopiedNisn] = useState<string | null>(null);

  const summary = useMemo(() => {
    return analyzeCashArrears(members, cash, standardWeeklyFee);
  }, [members, cash, standardWeeklyFee]);

  const allMembersArrears = useMemo(() => {
    return Array.from(summary.memberArrearsMap.values());
  }, [summary]);

  const filteredList = useMemo(() => {
    let list = allMembersArrears;
    if (filterStatus === 'MENUNGGAK') {
      list = list.filter((m) => m.status === 'menunggak');
    } else if (filterStatus === 'LUNAS') {
      list = list.filter((m) => m.status === 'lunas' || m.status === 'lebih_bayar');
    }

    if (!searchQ.trim()) return list;

    return smartFilter(list, searchQ, (item) => [
      item.memberName,
      item.memberNisn,
      item.memberClass,
      item.memberPhone,
      item.status,
    ]);
  }, [allMembersArrears, filterStatus, searchQ]);

  const handleOpenWhatsApp = (member: MemberCashArrears) => {
    const rawPhone = (member.memberPhone || '').replace(/\D/g, '');
    let cleanPhone = rawPhone;
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    const msg = isEn ? member.waBillingMessageEn : member.waBillingMessageId;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyMessage = (member: MemberCashArrears) => {
    const msg = isEn ? member.waBillingMessageEn : member.waBillingMessageId;
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedNisn(member.memberNisn);
      setTimeout(() => setCopiedNisn(null), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-sky-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300 border border-white/20">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  {isEn ? 'Cumulative Arrears Audit & Ledger' : 'Buku Besar Tunggakan Kas Kumulatif'}
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-400 text-teal-950 font-bold uppercase tracking-wider">
                    Finance Engine
                  </span>
                </h3>
                <p className="text-xs text-emerald-200 mt-0.5">
                  {isEn
                    ? 'Automated multi-week audit, individual arrears calculation, and WhatsApp billing'
                    : 'Audit tunggakan akumulasi kas otomatis, rincian minggu yang belum lunas & penagihan WA'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 bg-slate-50 border-b border-slate-200 text-center">
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'Total Arrears' : 'Total Tunggakan'}
              </span>
              <span className="text-lg sm:text-xl font-black text-rose-600 font-mono">
                {formatRupiahSimple(summary.totalOutstandingArrears)}
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'Debtor Members' : 'Siswa Menunggak'}
              </span>
              <span className="text-lg sm:text-xl font-black text-amber-600 font-mono">
                {summary.totalDebtorsCount} / {allMembersArrears.length}
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'Collected Rate' : 'Rasio Terkumpul'}
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-600 font-mono">
                {summary.collectionRate}%
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'Total Weeks' : 'Total Minggu Kas'}
              </span>
              <span className="text-lg sm:text-xl font-black text-slate-700 font-mono">
                {summary.totalElapsedWeeks} {isEn ? 'Weeks' : 'Mgg'}
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-6 pb-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder={isEn ? 'Smart search member, class, NISN...' : 'Pencarian cerdas nama, kelas, NISN...'}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                onClick={() => setFilterStatus('MENUNGGAK')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterStatus === 'MENUNGGAK'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {isEn ? 'Debtors Only' : 'Menunggak Saja'} ({summary.totalDebtorsCount})
              </button>
              <button
                onClick={() => setFilterStatus('LUNAS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterStatus === 'LUNAS'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {isEn ? 'Settled' : 'Lunas'}
              </button>
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterStatus === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {isEn ? 'All Members' : 'Semua'} ({allMembersArrears.length})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="px-6 pb-6">
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">{isEn ? 'Member Name' : 'Nama Siswa'}</th>
                    <th className="px-3 py-2.5">{isEn ? 'Class' : 'Kelas'}</th>
                    <th className="px-3 py-2.5 text-right">{isEn ? 'Paid Amount' : 'Sudah Masuk'}</th>
                    <th className="px-3 py-2.5 text-right">{isEn ? 'Arrears' : 'Tunggakan'}</th>
                    <th className="px-4 py-2.5">{isEn ? 'Unpaid Weeks' : 'Rincian Belum Lunas'}</th>
                    <th className="px-4 py-2.5 text-right">{isEn ? 'Action' : 'Aksi'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredList.map((m) => (
                    <tr key={m.memberNisn} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-2.5 font-bold text-slate-900">
                        {m.memberName}
                        <span className="block text-[10px] font-normal text-slate-400 font-mono">
                          {m.memberNisn || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 font-medium">
                        {m.memberClass || '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-emerald-700">
                        {formatRupiahSimple(m.totalPaid)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold">
                        {m.totalArrears > 0 ? (
                          <span className="text-rose-600">
                            {formatRupiahSimple(m.totalArrears)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isEn ? 'Settled' : 'Lunas'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {m.unpaidWeeksLabels.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {m.unpaidWeeksLabels.slice(0, 3).map((w, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                              >
                                {w}
                              </span>
                            ))}
                            {m.unpaidWeeksLabels.length > 3 && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                                +{m.unpaidWeeksLabels.length - 3} {isEn ? 'more' : 'lagi'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            {isEn ? 'All weeks paid' : 'Lunas semua minggu'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {m.totalArrears > 0 ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleCopyMessage(m)}
                              title={isEn ? 'Copy billing reminder text' : 'Salin rincian tagihan'}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                            >
                              {copiedNisn === m.memberNisn ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleOpenWhatsApp(m)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-xs active:scale-95 transition cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>{isEn ? 'Bill WA' : 'Tagih WA'}</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        {isEn ? 'No records match this criteria.' : 'Tidak ada data untuk kriteria ini.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {isEn
                ? `Active Standard Fee: ${formatRupiahSimple(summary.standardWeeklyFee)} / week`
                : `Standar Iuran Aktif: ${formatRupiahSimple(summary.standardWeeklyFee)} / minggu`}
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              {isEn ? 'Close Ledger' : 'Tutup Buku Besar'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
