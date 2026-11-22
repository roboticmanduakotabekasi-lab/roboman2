import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Calendar, 
  Send, 
  UserCheck, 
  ShieldCheck, 
  Check, 
  Sparkles,
  HelpCircle,
  Timer,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, AttendanceRecord, AttendanceStatus, UserSession } from '../types';
import { playClickTick, playSuccessChime } from '../utils/audioFeedback';
import { 
  checkAttendanceSchedule, 
  isBypassScheduleEnabled, 
  AttendanceScheduleStatus 
} from '../utils/attendanceWindow';
import { useLanguage } from '../utils/i18n';

export type MemberSelfAttendanceStatus = 'Present' | 'Permitted' | 'Sick' | 'Absent';

export interface MemberAttendanceViewProps {
  member?: Member | null;
  session?: UserSession | null;
  todayDate?: string; // YYYY-MM-DD
  existingAttendance?: AttendanceRecord | null;
  onSaveAttendance?: (record: {
    tanggal: string;
    nisn: string;
    namaAnggota: string;
    status: AttendanceStatus;
    notes?: string;
  }) => Promise<void> | void;
  // Optional window parameters (default: 23:59:59 of active date or custom window)
  windowEndTime?: string; // e.g. "17:00:00" or ISO timestamp
  isWindowOpen?: boolean;
}

export const MemberAttendanceView: React.FC<MemberAttendanceViewProps> = ({
  member,
  session,
  todayDate,
  existingAttendance,
  onSaveAttendance,
  windowEndTime,
  isWindowOpen = true,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  // Current active date (YYYY-MM-DD)
  const activeDate = useMemo(() => {
    return todayDate || new Date().toISOString().split('T')[0];
  }, [todayDate]);

  // Resolve current member's personal identity
  const memberName = member?.fullName || member?.full_name || session?.name || session?.username || 'Club Member';
  const memberNisn = member?.nisn || session?.nisn || session?.nis || '-';
  const memberClass = member ? `${member.grade || ''} ${member.classRoom || ''}`.trim() : (session?.kelas || 'Member');

  // Local state for self-service action and notes
  const [selectedStatus, setSelectedStatus] = useState<MemberSelfAttendanceStatus | null>(() => {
    if (existingAttendance?.status) {
      const s = existingAttendance.status.toLowerCase();
      if (s === 'present' || s === 'hadir') return 'Present';
      if (s === 'permitted' || s === 'excused' || s === 'izin') return 'Permitted';
      if (s === 'sick' || s === 'sakit') return 'Sick';
      if (s === 'absent' || s === 'unexcused' || s === 'alpha') return 'Absent';
    }
    return null;
  });

  const [notes, setNotes] = useState<string>(existingAttendance?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedRecord, setSubmittedRecord] = useState<AttendanceRecord | null>(existingAttendance || null);
  const [isTimeFrameExpired, setIsTimeFrameExpired] = useState<boolean>(false);
  const [remainingTimeText, setRemainingTimeText] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Smart Automated Attendance Window
  const [scheduleStatus, setScheduleStatus] = useState<AttendanceScheduleStatus>(() => {
    return checkAttendanceSchedule(new Date(), isBypassScheduleEnabled(session), undefined, isEn ? 'en' : 'id');
  });

  useEffect(() => {
    const updateSchedule = () => {
      setScheduleStatus(checkAttendanceSchedule(new Date(), isBypassScheduleEnabled(session), undefined, isEn ? 'en' : 'id'));
    };
    updateSchedule();
    const interval = setInterval(updateSchedule, 3000);
    window.addEventListener('robotics-attendance-schedule-change' as any, updateSchedule);
    window.addEventListener('robotics-attendance-bypass-change' as any, updateSchedule);
    return () => {
      clearInterval(interval);
      window.removeEventListener('robotics-attendance-schedule-change' as any, updateSchedule);
      window.removeEventListener('robotics-attendance-bypass-change' as any, updateSchedule);
    };
  }, [session, isEn]);

  const isScheduleBlocked = !scheduleStatus.isOpen;

  // Ref to avoid double auto-absent triggers
  const autoAbsentTriggeredRef = useRef<boolean>(false);

  // Time frame configuration (Defaults to schedule closing time e.g. 19:00:00 WIB)
  const deadlineDate = useMemo(() => {
    if (windowEndTime && windowEndTime.includes('T')) {
      return new Date(windowEndTime);
    }
    const [year, month, day] = activeDate.split('-').map(Number);
    const timeStr = (windowEndTime && windowEndTime.includes(':'))
      ? windowEndTime
      : (scheduleStatus.deadlineTimeString || '19:00:00');
    const [h, m, s = 0] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, h, m, s);
  }, [activeDate, windowEndTime, scheduleStatus.deadlineTimeString]);

  // Real-time evaluation of the designated time frame
  useEffect(() => {
    const evaluateTimeFrame = () => {
      const now = new Date();
      const diffMs = deadlineDate.getTime() - now.getTime();

      if (!isWindowOpen || diffMs <= 0 || isScheduleBlocked) {
        setIsTimeFrameExpired(true);
        setRemainingTimeText(
          isScheduleBlocked 
            ? (isEn ? 'Window Closed' : 'Jadwal Ditutup') 
            : (isEn ? 'Time frame expired' : 'Batas waktu berakhir')
        );

        // Logic 2: If member has not selected a status within the time frame, default to 'Absent'
        if (!submittedRecord && !selectedStatus && !autoAbsentTriggeredRef.current && !isScheduleBlocked) {
          autoAbsentTriggeredRef.current = true;
          setSelectedStatus('Absent');
          const autoNotes = isEn 
            ? 'Automated: Defaulted to Absent (check-in deadline passed)' 
            : 'Otomatis: Ditandai Alpha (melewati batas waktu presensi)';
          setNotes(autoNotes);

          const autoRecord: AttendanceRecord = {
            id: `att_auto_${Date.now()}`,
            tanggal: activeDate,
            nisn: memberNisn,
            namaAnggota: memberName,
            status: 'Alpha',
            notes: autoNotes,
          };

          setSubmittedRecord(autoRecord);
          if (onSaveAttendance) {
            onSaveAttendance({
              tanggal: activeDate,
              nisn: memberNisn,
              namaAnggota: memberName,
              status: 'Alpha',
              notes: autoNotes,
            });
          }
          setToastMessage({
            type: 'info',
            text: isEn 
              ? 'Designated time frame closed. Status has defaulted to Absent.' 
              : 'Batas waktu presensi telah berakhir. Status otomatis tercatat sebagai Alpha.',
          });
        }
      } else {
        setIsTimeFrameExpired(false);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        setRemainingTimeText(
          isEn 
            ? `${hours}h ${minutes}m ${seconds}s remaining` 
            : `Tersisa ${hours}j ${minutes}m ${seconds}d`
        );
      }
    };

    evaluateTimeFrame();
    const interval = setInterval(evaluateTimeFrame, 1000);
    return () => clearInterval(interval);
  }, [deadlineDate, isWindowOpen, isScheduleBlocked, submittedRecord, selectedStatus, activeDate, memberNisn, memberName, onSaveAttendance]);

  // Synchronize when external record updates
  useEffect(() => {
    if (existingAttendance) {
      setSubmittedRecord(existingAttendance);
      if (existingAttendance.status) {
        const s = existingAttendance.status.toLowerCase();
        if (s === 'present' || s === 'hadir') setSelectedStatus('Present');
        else if (s === 'permitted' || s === 'excused' || s === 'izin') setSelectedStatus('Permitted');
        else if (s === 'sick' || s === 'sakit') setSelectedStatus('Sick');
        else if (s === 'absent' || s === 'unexcused' || s === 'alpha') setSelectedStatus('Absent');
      }
      if (existingAttendance.notes) setNotes(existingAttendance.notes);
    }
  }, [existingAttendance]);

  // Status button selection handler
  const handleSelectStatus = (status: 'Present' | 'Permitted' | 'Sick') => {
    if (isScheduleBlocked && !scheduleStatus.isTestingBypass) {
      setToastMessage({ 
        text: isEn
          ? `Attendance Closed: Official schedule is ${scheduleStatus.scheduleDescription}. ${scheduleStatus.nextSessionInfo}`
          : `Presensi Terkunci: Jadwal resmi adalah ${scheduleStatus.scheduleDescriptionId}. ${scheduleStatus.nextSessionInfo}`, 
        type: 'error' 
      });
      return;
    }
    if (isTimeFrameExpired && !submittedRecord) return;
    playClickTick();
    setSelectedStatus(status);
  };

  // Submit attendance record
  const handleSubmitAttendance = async () => {
    if (isScheduleBlocked && !scheduleStatus.isTestingBypass) {
      setToastMessage({ 
        text: isEn
          ? `Submission Rejected: Outside active window (${scheduleStatus.scheduleDescription}). ${scheduleStatus.nextSessionInfo}`
          : `Pengisian Ditolak: Di luar jadwal presensi aktif (${scheduleStatus.scheduleDescriptionId}). ${scheduleStatus.nextSessionInfo}`, 
        type: 'error' 
      });
      return;
    }

    if (!selectedStatus) {
      setToastMessage({ 
        text: isEn ? 'Please select an attendance status first.' : 'Silakan pilih status presensi terlebih dahulu.', 
        type: 'error' 
      });
      return;
    }

    if (!memberNisn || memberNisn === '-' || memberNisn.trim() === '') {
      setToastMessage({
        text: isEn 
          ? 'Student NISN / ID not found. Please complete your student profile before checking in.' 
          : 'NISN / ID Siswa tidak ditemukan. Lengkapi profil anggota Anda terlebih dahulu sebelum mengisi absensi.',
        type: 'error',
      });
      return;
    }

    if (isTimeFrameExpired && !submittedRecord && !scheduleStatus.isOpen) {
      setToastMessage({ 
        text: isEn ? 'Designated attendance window has expired.' : 'Jadwal presensi mandiri telah berakhir.', 
        type: 'error' 
      });
      return;
    }

    setIsSubmitting(true);
    playClickTick();

    try {
      // Map to standard internal status representation
      const statusMapping: Record<MemberSelfAttendanceStatus, AttendanceStatus> = {
        Present: 'Hadir',
        Permitted: 'Izin',
        Sick: 'Sakit',
        Absent: 'Alpha',
      };

      const finalStatus = statusMapping[selectedStatus] || 'Hadir';

      const payload = {
        tanggal: activeDate,
        nisn: memberNisn,
        namaAnggota: memberName,
        status: finalStatus,
        notes: notes.trim() || undefined,
      };

      if (onSaveAttendance) {
        await onSaveAttendance(payload);
      }

      const updatedRec: AttendanceRecord = {
        id: submittedRecord?.id || `att_${Date.now()}`,
        ...payload,
      };

      setSubmittedRecord(updatedRec);
      playSuccessChime();
      const statusLabel = isEn 
        ? selectedStatus 
        : (selectedStatus === 'Present' ? 'Hadir' : selectedStatus === 'Permitted' ? 'Izin' : selectedStatus === 'Sick' ? 'Sakit' : 'Alpha');
      setToastMessage({
        text: isEn ? `Attendance recorded successfully as ${statusLabel}!` : `Presensi berhasil disimpan sebagai ${statusLabel}!`,
        type: 'success',
      });
    } catch {
      setToastMessage({ 
        text: isEn ? 'Failed to record attendance. Please try again.' : 'Gagal menyimpan presensi. Silakan coba lagi.', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3.5 rounded-xl border text-sm font-medium flex items-center justify-between shadow-xs ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : toastMessage.type === 'info'
                ? 'bg-blue-50 text-blue-900 border-blue-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs font-bold hover:underline opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Self-Service Check-In Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Header: Member Identity Summary */}
        <div className="p-6 bg-gradient-to-r from-[#17387F] via-[#1E4EB8] to-[#2563EB] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center font-extrabold text-lg text-white shadow-inner">
              {memberName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-sky-200">
                  {isEn ? 'Individual Member Check-In' : 'Presensi Mandiri Siswa'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/15 text-white border border-white/20">
                  <UserCheck className="w-3 h-3 text-sky-300" />
                  <span>roboman2</span>
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white mt-0.5">
                {memberName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-sky-100/90 mt-1 font-medium">
                <span>NISN: <span className="font-mono text-white font-bold">{memberNisn}</span></span>
                <span aria-hidden="true">·</span>
                <span>{isEn ? 'Class:' : 'Kelas:'} <span className="text-white font-bold">{memberClass}</span></span>
              </div>
            </div>
          </div>

          {/* Date & Countdown Badge */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex flex-col sm:items-end">
            <div className="flex items-center gap-1.5 text-xs text-sky-100 font-bold">
              <Calendar className="w-3.5 h-3.5 text-sky-200" />
              <span>{activeDate}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Timer className={`w-3.5 h-3.5 ${isTimeFrameExpired ? 'text-rose-300' : 'text-amber-300'}`} />
              <span className={`text-xs font-mono font-bold ${isTimeFrameExpired ? 'text-rose-200' : 'text-amber-200'}`}>
                {remainingTimeText}
              </span>
            </div>
          </div>
        </div>

        {/* Current Status Notification Banner */}
        {submittedRecord && (
          <div className={`px-6 py-3.5 border-b flex items-center justify-between text-xs font-bold ${
            submittedRecord.status === 'Hadir' || submittedRecord.status === 'Present'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-100'
              : submittedRecord.status === 'Izin' || (submittedRecord.status as string) === 'Permitted' || submittedRecord.status === 'Excused'
              ? 'bg-amber-50 text-amber-900 border-amber-100'
              : submittedRecord.status === 'Sakit' || submittedRecord.status === 'Sick'
              ? 'bg-rose-50 text-rose-900 border-rose-100'
              : 'bg-slate-50 text-slate-800 border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>
                {isEn ? 'Current Status:' : 'Status Saat Ini:'} <strong>
                  {selectedStatus 
                    ? (selectedStatus === 'Present' ? (isEn ? 'Present' : 'Hadir')
                        : selectedStatus === 'Permitted' ? (isEn ? 'Permitted' : 'Izin')
                        : selectedStatus === 'Sick' ? (isEn ? 'Sick' : 'Sakit')
                        : (isEn ? 'Absent' : 'Alpha'))
                    : submittedRecord.status}
                </strong>
                {submittedRecord.notes ? ` — "${submittedRecord.notes}"` : ''}
              </span>
            </div>
            <span className="text-[11px] opacity-75 font-semibold">
              {isTimeFrameExpired 
                ? (isEn ? 'Window Closed' : 'Jendela Ditutup') 
                : (isEn ? 'Editable while window is open' : 'Dapat diubah selama sesi aktif')}
            </span>
          </div>
        )}

        {/* Smart Attendance Window Policy Banner */}
        <div className={`p-4 border-b transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          isScheduleBlocked && !scheduleStatus.isTestingBypass
            ? 'bg-slate-50 border-slate-200 text-slate-800'
            : scheduleStatus.isTestingBypass
            ? 'bg-amber-50 border-amber-200 text-amber-950'
            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              isScheduleBlocked && !scheduleStatus.isTestingBypass
                ? 'bg-slate-600 text-white'
                : scheduleStatus.isTestingBypass
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-600 text-white'
            }`}>
              {isScheduleBlocked && !scheduleStatus.isTestingBypass ? (
                <Lock className="w-4 h-4" />
              ) : scheduleStatus.isTestingBypass ? (
                <Sparkles className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4 animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900">
                  {isScheduleBlocked && !scheduleStatus.isTestingBypass
                    ? (isEn ? 'Smart Attendance Window Closed' : 'Jadwal Presensi Mandiri Ditutup')
                    : scheduleStatus.isTestingBypass
                    ? (isEn ? 'Testing Mode Active' : 'Mode Pengujian Aktif')
                    : (isEn ? 'Self Check-in Window Active' : 'Jendela Presensi Mandiri Aktif')}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/90 border border-slate-200 font-mono text-[11px] font-semibold text-slate-700 shadow-2xs">
                  <Calendar className="w-3 h-3 text-blue-600" />
                  {isEn ? scheduleStatus.scheduleDescription : scheduleStatus.scheduleDescriptionId}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                {scheduleStatus.reasonText} {scheduleStatus.nextSessionInfo}
              </p>
            </div>
          </div>
          {scheduleStatus.remainingTimeText && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-mono font-bold shrink-0 self-start sm:self-center border bg-white text-slate-800 border-slate-200 shadow-2xs">
              <Timer className="w-3.5 h-3.5 text-blue-600" />
              {scheduleStatus.remainingTimeText}
            </span>
          )}
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6">
          {/* Section 1: Core 3 Action Buttons (Present, Permitted, Sick) */}
          <div className="space-y-3">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
              {isEn ? 'Select Attendance Status' : 'Pilih Status Kehadiran'} <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Button 1: Present */}
              <button
                type="button"
                onClick={() => handleSelectStatus('Present')}
                disabled={(isScheduleBlocked && !scheduleStatus.isTestingBypass) || (isTimeFrameExpired && !submittedRecord)}
                className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all cursor-pointer text-center relative ${
                  selectedStatus === 'Present'
                    ? 'border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-sm ring-2 ring-emerald-400/20'
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 text-slate-700 bg-slate-50/60'
                } ${(isScheduleBlocked && !scheduleStatus.isTestingBypass) || (isTimeFrameExpired && !submittedRecord) ? 'opacity-50 cursor-not-allowed' : 'active:scale-98'}`}
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-2.5 ${
                  selectedStatus === 'Present' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-sm">{isEn ? 'Present' : 'Hadir'}</span>
                <span className="text-[11px] text-slate-500 mt-0.5">{isEn ? 'Attending session' : 'Mengikuti sesi kegiatan'}</span>
              </button>

              {/* Button 2: Permitted */}
              <button
                type="button"
                onClick={() => handleSelectStatus('Permitted')}
                disabled={(isScheduleBlocked && !scheduleStatus.isTestingBypass) || (isTimeFrameExpired && !submittedRecord)}
                className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all cursor-pointer text-center relative ${
                  selectedStatus === 'Permitted'
                    ? 'border-amber-500 bg-amber-50/90 text-amber-950 shadow-sm ring-2 ring-amber-400/20'
                    : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 text-slate-700 bg-slate-50/60'
                } ${(isScheduleBlocked && !scheduleStatus.isTestingBypass) || (isTimeFrameExpired && !submittedRecord) ? 'opacity-50 cursor-not-allowed' : 'active:scale-98'}`}
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-2.5 ${
                  selectedStatus === 'Permitted' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-sm">{isEn ? 'Permitted' : 'Izin'}</span>
                <span className="text-[11px] text-slate-500 mt-0.5">{isEn ? 'Prior permission requested' : 'Izin berhalangan sebelumnya'}</span>
              </button>

              {/* Button 3: Sick */}
              <button
                type="button"
                onClick={() => handleSelectStatus('Sick')}
                disabled={(isScheduleBlocked && !scheduleStatus.isTestingBypass) || (isTimeFrameExpired && !submittedRecord)}
                className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all cursor-pointer text-center relative ${
                  selectedStatus === 'Sick'
                    ? 'border-rose-500 bg-rose-50/90 text-rose-950 shadow-sm ring-2 ring-rose-400/20'
                    : 'border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 text-slate-700 bg-slate-50/60'
                } ${(isScheduleBlocked && !scheduleStatus.isTestingBypass) || (isTimeFrameExpired && !submittedRecord) ? 'opacity-50 cursor-not-allowed' : 'active:scale-98'}`}
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-2.5 ${
                  selectedStatus === 'Sick' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-700'
                }`}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-sm">{isEn ? 'Sick' : 'Sakit'}</span>
                <span className="text-[11px] text-slate-500 mt-0.5">{isEn ? 'Medical recovery' : 'Dalam pemulihan medis'}</span>
              </button>
            </div>
          </div>

          {/* Section 2: Optional Notes/Description text field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="attendance-notes" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                {isEn ? 'Notes / Reason' : 'Catatan / Keterangan'} <span className="text-slate-400 font-normal lowercase">{isEn ? '(optional)' : '(opsional)'}</span>
              </label>
              {(selectedStatus === 'Permitted' || selectedStatus === 'Sick') && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                  {isEn ? `Recommended for ${selectedStatus}` : `Disarankan untuk keterangan ${selectedStatus === 'Permitted' ? 'Izin' : 'Sakit'}`}
                </span>
              )}
            </div>
            <textarea
              id="attendance-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isTimeFrameExpired && !submittedRecord}
              placeholder={
                selectedStatus === 'Permitted'
                  ? (isEn ? 'E.g., Participating in school Olympiad, family emergency...' : 'Contoh: Mengikuti olimpiade sains sekolah, urusan keluarga...')
                  : selectedStatus === 'Sick'
                  ? (isEn ? 'E.g., Flu and fever, doctor rest note submitted...' : 'Contoh: Sakit demam/flu, surat dokter terlampir...')
                  : (isEn ? 'Add any optional remarks or workshop notes...' : 'Tambahkan catatan kegiatan atau keterangan opsional...')
              }
              className="w-full px-4 py-3 rounded-2xl border border-sky-100/90 bg-sky-50/20 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100/80 focus:border-indigo-500 transition disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          {/* Section 3: System Logic Rule Notice */}
          <div className="p-4 rounded-2xl bg-sky-50/40 border border-sky-100 flex items-start gap-3 text-xs text-slate-600">
            <Clock className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-extrabold text-slate-800">{isEn ? 'Automated System Policy:' : 'Kebijakan Sistem Otomatis:'} </span>
              {isEn 
                ? 'Attendance must be selected before the designated time frame ends. If no status is selected within the window, your attendance will automatically be logged as '
                : 'Presensi harus dikirimkan sebelum batas waktu sesi berakhir. Jika tidak mengisi selama jadwal aktif, kehadiran otomatis tercatat sebagai '}
              <strong className="text-rose-600">{isEn ? 'Absent' : 'Alpha'}</strong>.
            </div>
          </div>

          {/* Action Trigger Button */}
          <button
            type="button"
            onClick={handleSubmitAttendance}
            disabled={!selectedStatus || isSubmitting || (isScheduleBlocked && !scheduleStatus.isTestingBypass) || (isTimeFrameExpired && !submittedRecord)}
            className="w-full py-4 px-5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 active:from-sky-700 active:to-indigo-800 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : isScheduleBlocked && !scheduleStatus.isTestingBypass ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {isScheduleBlocked && !scheduleStatus.isTestingBypass
                ? (isEn ? 'Attendance Locked (Outside Wed–Thu Window)' : 'Presensi Terkunci (Di luar Jadwal Rabu–Kamis)')
                : submittedRecord
                ? (isEn ? 'Update My Attendance' : 'Perbarui Presensi Saya')
                : (isEn ? 'Submit Attendance' : 'Kirim Presensi Sekarang')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberAttendanceView;
