import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, AttendanceRecord } from '../types';
import { analyzeAttendance, MemberAttendanceAnalytics } from '../utils/attendanceAnalytics';
import { useLanguage } from '../utils/i18n';
import { smartFilter } from '../utils/smartSearch';
import { ShieldAlert, Search, Send, AlertTriangle, CheckCircle2, X, Users, Copy, Check, MessageSquare } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  attendance: AttendanceRecord[];
}

export const AttendanceRiskModal: React.FC<Props> = ({
  isOpen,
  onClose,
  members,
  attendance,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [searchQ, setSearchQ] = useState('');
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'critical' | 'warning'>('ALL');
  const [copiedNisn, setCopiedNisn] = useState<string | null>(null);

  const summary = useMemo(() => {
    return analyzeAttendance(members, attendance);
  }, [members, attendance]);

  const displayedList = useMemo(() => {
    let list = summary.atRiskMembers;
    if (filterLevel !== 'ALL') {
      list = list.filter((m) => m.riskLevel === filterLevel);
    }

    if (!searchQ.trim()) return list;

    return smartFilter(list, searchQ, (item) => [
      item.memberName,
      item.memberNisn,
      item.memberClass,
      item.riskReason,
      item.riskReasonEn,
    ]);
  }, [summary, filterLevel, searchQ]);

  const handleOpenWhatsApp = (member: MemberAttendanceAnalytics) => {
    const rawPhone = (member.memberPhone || '').replace(/\D/g, '');
    let cleanPhone = rawPhone;
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    const msg = isEn ? member.waCheckInMessageEn : member.waCheckInMessageId;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyMessage = (member: MemberAttendanceAnalytics) => {
    const msg = isEn ? member.waCheckInMessageEn : member.waCheckInMessageId;
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
          <div className="p-6 bg-gradient-to-r from-rose-950 via-rose-900 to-indigo-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-rose-300 border border-white/20">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  {isEn ? 'Attendance Dropout Risk & Early Warning' : 'Deteksi Siswa Rawan & Peringatan Dini'}
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold uppercase tracking-wider">
                    Retention AI
                  </span>
                </h3>
                <p className="text-xs text-rose-200 mt-0.5">
                  {isEn
                    ? 'Identifies consecutive absence streaks and triggers friendly PR check-in reminders'
                    : 'Mendeteksi alpa berturut-turut & memicu penjangkauan ramah oleh Humas/Sekretaris'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-rose-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 bg-slate-50 border-b border-slate-200 text-center">
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'Critical (3+ Absences)' : 'Kritis (Alpa 3x+)'}
              </span>
              <span className="text-lg sm:text-xl font-black text-rose-600 font-mono">
                {summary.criticalCount}
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'Warning (2 Absences)' : 'Peringatan (Alpa 2x)'}
              </span>
              <span className="text-lg sm:text-xl font-black text-amber-600 font-mono">
                {summary.warningCount}
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'Good Standing' : 'Kehadiran Baik'}
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-600 font-mono">
                {summary.goodCount}
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'Average Rate' : 'Rerata Hadir'}
              </span>
              <span className="text-lg sm:text-xl font-black text-indigo-600 font-mono">
                {summary.averageRate}%
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-6 pb-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder={isEn ? 'Smart search member, class, NISN...' : 'Pencarian cerdas nama, kelas, NISN...'}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                onClick={() => setFilterLevel('critical')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterLevel === 'critical'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {isEn ? 'Critical Only' : 'Kritis Saja'} ({summary.criticalCount})
              </button>
              <button
                onClick={() => setFilterLevel('warning')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterLevel === 'warning'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {isEn ? 'Warning Only' : 'Peringatan'} ({summary.warningCount})
              </button>
              <button
                onClick={() => setFilterLevel('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterLevel === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {isEn ? 'All At-Risk' : 'Semua Rawan'} ({summary.atRiskMembers.length})
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
                    <th className="px-3 py-2.5 text-center">{isEn ? 'Attendance Rate' : 'Tingkat Hadir'}</th>
                    <th className="px-3 py-2.5 text-center">{isEn ? 'Streak Alpa' : 'Alpa Beruntun'}</th>
                    <th className="px-4 py-2.5">{isEn ? 'Risk Diagnosis' : 'Analisis Risiko'}</th>
                    <th className="px-4 py-2.5 text-right">{isEn ? 'Action' : 'Aksi Humas'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedList.map((m) => (
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
                      <td className="px-3 py-2.5 text-center font-mono font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] ${
                            m.attendanceRate < 50
                              ? 'bg-rose-50 text-rose-700'
                              : m.attendanceRate < 70
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {m.attendanceRate}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-black text-rose-600">
                        {m.consecutiveAlpha > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px]">
                            {m.consecutiveAlpha}x
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            m.riskLevel === 'critical'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {isEn ? m.riskReasonEn : m.riskReason}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCopyMessage(m)}
                            title={isEn ? 'Copy check-in text' : 'Salin pesan konfirmasi'}
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
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-xs active:scale-95 transition cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>{isEn ? 'Check-in WA' : 'Tanya WA'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {displayedList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        {isEn
                          ? '🎉 Excellent! No members are currently at risk of dropout.'
                          : '🎉 Luar biasa! Tidak ada anggota yang terdeteksi rawan tidak aktif saat ini.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              {isEn
                ? 'Coordinated directly by Public Relations (PR / Humas) & Secretary'
                : 'Dikelola oleh Public Relations (Humas) & Sekretaris'}
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              {isEn ? 'Close Risk Audit' : 'Tutup Audit'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
