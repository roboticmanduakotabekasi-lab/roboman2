import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Member } from '../types';
import { generateRolloverPreview, applyBatchRollover } from '../utils/academicRollover';
import { useLanguage } from '../utils/i18n';
import { GraduationCap, ArrowRight, CheckCircle2, AlertTriangle, X, ShieldAlert, Sparkles, Filter } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onConfirmRollover: (updatedMembers: Member[]) => Promise<void> | void;
}

const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

export const AcademicRolloverModal: React.FC<Props> = ({
  isOpen,
  onClose,
  members,
  onConfirmRollover,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [classRoomOverrides, setClassRoomOverrides] = useState<Record<string, string>>({});
  const [batchGrade11Room, setBatchGrade11Room] = useState<string>('');

  const getMemberKey = (member: Member) => member.nisn || String(member.id_member || member.fullName);

  const preview = useMemo(() => generateRolloverPreview(members), [members]);

  const filteredDetails = useMemo(() => {
    if (filterAction === 'ALL') return preview.details;
    return preview.details.filter((d) => d.actionType === filterAction);
  }, [preview, filterAction]);

  const handleExecute = async () => {
    if (preview.totalActiveMembers === 0) return;
    const confirmMsg = isEn
      ? `Are you sure you want to execute Academic Year Rollover for ${preview.totalActiveMembers} members?\n- ${preview.promotedTo11Count} promoted to Grade 11\n- ${preview.promotedTo12Count} promoted to Grade 12\n- ${preview.graduatedToAlumniCount} graduated to Alumni`
      : `Apakah Anda yakin ingin menjalankan Kenaikan Kelas Otomatis untuk ${preview.totalActiveMembers} anggota?\n- ${preview.promotedTo11Count} naik ke Kelas 11\n- ${preview.promotedTo12Count} naik ke Kelas 12\n- ${preview.graduatedToAlumniCount} lulus menjadi Alumni`;

    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      const updated = applyBatchRollover(members, classRoomOverrides);
      await onConfirmRollover(updated);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-sky-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300 border border-white/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  {isEn ? 'Academic Year Grade Rollover' : 'Kenaikan Kelas Otomatis'}
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-indigo-950 font-bold uppercase tracking-wider">
                    Batch Engine
                  </span>
                </h3>
                <p className="text-xs text-indigo-200 mt-0.5">
                  {isEn
                    ? 'Automated class progression and graduation to alumni for active club members'
                    : 'Transformasi tingkat kelas otomatis (10 ➔ 11 ➔ 12 ➔ Alumni) untuk tahun ajaran baru'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-2 rounded-xl text-indigo-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 bg-slate-50 border-b border-slate-200 text-center">
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'To Grade 11' : 'Naik ke Kelas 11'}
              </span>
              <span className="text-xl font-black text-indigo-600 font-mono">
                {preview.promotedTo11Count}
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'To Grade 12' : 'Naik ke Kelas 12'}
              </span>
              <span className="text-xl font-black text-sky-600 font-mono">
                {preview.promotedTo12Count}
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'Graduate Alumni' : 'Lulus Alumni'}
              </span>
              <span className="text-xl font-black text-purple-600 font-mono">
                {preview.graduatedToAlumniCount}
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'Unchanged' : 'Tetap / Alumni'}
              </span>
              <span className="text-xl font-black text-slate-500 font-mono">
                {preview.unchangedCount}
              </span>
            </div>
          </div>

          {/* Table Preview */}
          <div className="p-6">
            {/* Grade 10 to 11 Classroom Batch Setter */}
            {preview.promotedTo11Count > 0 && (
              <div className="mb-4 p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs text-indigo-950 font-semibold">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    {isEn
                      ? 'Grade 10 ➔ 11 Classroom: Room/section (A-H) can be customized individually or batch applied:'
                      : 'Siswa Kelas X ➔ XI: Ruang kelas (Rentang A-H) dapat dipilih per siswa atau disamakan:'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <select
                    value={batchGrade11Room}
                    onChange={(e) => setBatchGrade11Room(e.target.value)}
                    className="px-2.5 py-1 text-xs uppercase font-bold border border-indigo-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-36 cursor-pointer"
                  >
                    <option value="">{isEn ? '-- Select Class A-H --' : '-- Pilih Rombel A-H --'}</option>
                    {SECTION_OPTIONS.map((sec) => (
                      <option key={sec} value={sec}>
                        {isEn ? `Section ${sec}` : `Kelas / Rombel ${sec}`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!batchGrade11Room.trim()) return;
                      const val = batchGrade11Room.trim().toUpperCase();
                      const newOverrides: Record<string, string> = { ...classRoomOverrides };
                      preview.details.forEach((d) => {
                        if (d.actionType === 'promote_11') {
                          newOverrides[getMemberKey(d.member)] = val;
                        }
                      });
                      setClassRoomOverrides(newOverrides);
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 transition cursor-pointer"
                  >
                    {isEn ? 'Set for All' : 'Terapkan ke Semua'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700">
                {isEn ? 'Roster Impact Preview' : 'Pratinjau Perubahan Anggota'} ({filteredDetails.length})
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium cursor-pointer"
                >
                  <option value="ALL">{isEn ? 'All Actions' : 'Semua Aksi'}</option>
                  <option value="promote_11">{isEn ? 'Promote to 11' : 'Naik ke 11'}</option>
                  <option value="promote_12">{isEn ? 'Promote to 12' : 'Naik ke 12'}</option>
                  <option value="graduate_alumni">{isEn ? 'Graduate Alumni' : 'Lulus Alumni'}</option>
                </select>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">{isEn ? 'Member Name' : 'Nama Anggota'}</th>
                    <th className="px-3 py-2.5">{isEn ? 'Current Class' : 'Kelas Saat Ini'}</th>
                    <th className="px-2 py-2.5 text-center">➔</th>
                    <th className="px-3 py-2.5">{isEn ? 'New Class' : 'Kelas Baru'}</th>
                    <th className="px-4 py-2.5 text-right">{isEn ? 'Result' : 'Hasil Aksi'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDetails.map((d, i) => {
                    const memberKey = getMemberKey(d.member);
                    const effectiveRoom =
                      classRoomOverrides[memberKey] !== undefined
                        ? classRoomOverrides[memberKey]
                        : d.newClassRoom;

                    return (
                      <tr key={i} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-2.5 font-bold text-slate-800">
                          {d.member.fullName || d.member.full_name}
                          <span className="block text-[10px] font-normal text-slate-400 font-mono">
                            {d.member.nisn || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 font-medium">
                          {d.oldGrade} {d.oldClassRoom}
                        </td>
                        <td className="px-2 py-2.5 text-center text-slate-400">
                          <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                        </td>
                        <td className="px-3 py-2.5 font-bold text-indigo-600">
                          {d.actionType === 'graduate_alumni' ? (
                            <span className="text-purple-600 font-bold">Alumni</span>
                          ) : d.actionType === 'promote_11' ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-indigo-700 font-mono">{d.newGrade} -</span>
                              <select
                                value={effectiveRoom}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  setClassRoomOverrides((prev) => ({ ...prev, [memberKey]: val }));
                                }}
                                title={isEn ? 'Section for Grade 11 (A-H)' : 'Rombel Kelas 11 (Rentang A-H)'}
                                className="px-2 py-0.5 text-xs font-bold text-indigo-950 uppercase border border-indigo-300 rounded-lg bg-indigo-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
                              >
                                {SECTION_OPTIONS.map((sec) => (
                                  <option key={sec} value={sec}>
                                    {sec}
                                  </option>
                                ))}
                                {!SECTION_OPTIONS.includes(effectiveRoom as any) && effectiveRoom && (
                                  <option value={effectiveRoom}>{effectiveRoom}</option>
                                )}
                              </select>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sky-700 font-mono">{d.newGrade}</span>
                              <span className="font-bold text-slate-700">{d.oldClassRoom || '-'}</span>
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                {isEn ? 'Preserved' : 'Tetap'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.actionType === 'promote_11'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : d.actionType === 'promote_12'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : d.actionType === 'graduate_alumni'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isEn ? d.actionLabelEn : d.actionLabelId}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredDetails.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        {isEn ? 'No members found for this action filter.' : 'Tidak ada anggota untuk filter ini.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Warning Note */}
            <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px]">
                <strong>{isEn ? 'Permanent Audit Safety Notice:' : 'Catatan Keamanan Audit:'}</strong>{' '}
                {isEn
                  ? 'All historical meeting attendance records and treasury cash logs will remain safely attached to each member. Graduated Grade 12 students will retain their profiles as Alumni.'
                  : 'Seluruh riwayat absensi dan kas masa lalu anggota tetap tersimpan aman. Siswa kelas 12 yang lulus akan otomatis beralih ke status Alumni dan dapat dilihat pada arsip demisioner.'}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Batal'}
            </button>

            <button
              onClick={handleExecute}
              disabled={isProcessing || preview.totalActiveMembers === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isEn ? 'Processing...' : 'Memproses...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  {isEn
                    ? `Execute Rollover (${preview.totalActiveMembers} Members)`
                    : `Terapkan Kenaikan Kelas (${preview.totalActiveMembers} Anggota)`}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
