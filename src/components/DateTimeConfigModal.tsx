import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  RotateCcw, 
  X, 
  Check, 
  GraduationCap, 
  Sparkles, 
  CalendarDays,
  Lock,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  Trash2,
  Edit3,
  CalendarPlus,
  Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DateAcademicConfig, 
  calculateAutoAcademicYear, 
  toDateInputValue, 
  formatFullIndonesianDate 
} from '../utils/dateAcademicConfig';
import { playClickTick, playSuccessChime, playWarningBuzzer } from '../utils/audioFeedback';
import { 
  checkAttendanceSchedule, 
  isBypassScheduleEnabled, 
  setBypassScheduleEnabled,
  getAttendanceScheduleConfig,
  saveAttendanceScheduleConfig,
  AttendanceScheduleConfig,
  ScheduledSessionItem,
  DEFAULT_SCHEDULE_CONFIG,
  INDONESIAN_DAYS,
  ENGLISH_DAYS,
  INDONESIAN_MONTHS,
  ENGLISH_MONTHS,
  parseDateBreakdown,
  getNextWednesdayDateString
} from '../utils/attendanceWindow';
import { useLanguage } from '../utils/i18n';

export interface DateTimeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DateAcademicConfig;
  onSave: (newConfig: DateAcademicConfig) => void;
  initialTab?: 'date' | 'academic' | 'schedule';
  canConfigure?: boolean;
}

export const DateTimeConfigModal: React.FC<DateTimeConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  initialTab = 'schedule',
  canConfigure = true
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [activeTab, setActiveTab] = useState<'date' | 'academic' | 'schedule'>(initialTab);

  const [dateMode, setDateMode] = useState<'auto' | 'custom'>(config.dateMode);
  const [customDate, setCustomDate] = useState<string>(config.customDate || toDateInputValue(new Date()));

  const [academicYearMode, setAcademicYearMode] = useState<'auto' | 'custom'>(config.academicYearMode);
  const [customAcademicYear, setCustomAcademicYear] = useState<string>(
    config.customAcademicYear || calculateAutoAcademicYear(new Date())
  );
  
  const [scheduleConfig, setScheduleConfig] = useState<AttendanceScheduleConfig>(() => getAttendanceScheduleConfig());
  const [bypassSchedule, setBypassSchedule] = useState<boolean>(() => isBypassScheduleEnabled());
  const liveScheduleStatus = checkAttendanceSchedule(new Date(), bypassSchedule, scheduleConfig, isEn ? 'en' : 'id');

  // Editing state for new or selected session in the list
  const [editingSessionTitle, setEditingSessionTitle] = useState<string>(
    isEn ? 'Robotics Club Meeting' : 'Pertemuan Ekskul Robotik'
  );

  // Calendar Picker Sub-state (Month & Year navigation)
  const initialDateObj = useMemo(() => {
    if (scheduleConfig.specificDate && scheduleConfig.specificDate.includes('-')) {
      const [y, m, d] = scheduleConfig.specificDate.split('-').map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    }
    return new Date();
  }, [scheduleConfig.specificDate]);

  const [calMonth, setCalMonth] = useState<number>(() => initialDateObj.getMonth());
  const [calYear, setCalYear] = useState<number>(() => initialDateObj.getFullYear());

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDateMode(config.dateMode);
      setCustomDate(config.customDate || toDateInputValue(new Date()));
      setAcademicYearMode(config.academicYearMode);
      setCustomAcademicYear(config.customAcademicYear || calculateAutoAcademicYear(new Date()));
      const currentSched = getAttendanceScheduleConfig();
      setScheduleConfig(currentSched);
      if (currentSched.specificDate) {
        const [y, m] = currentSched.specificDate.split('-').map(Number);
        if (y && m) {
          setCalYear(y);
          setCalMonth(m - 1);
        }
      }
      setBypassSchedule(isBypassScheduleEnabled());
      setActiveTab(initialTab);
    }
  }, [isOpen, config, initialTab]);

  const todayStr = toDateInputValue(new Date());
  const autoYear = calculateAutoAcademicYear(new Date());

  // Parse breakdown of currently selected specific date
  const selectedSpecificDateBreakdown = useMemo(() => {
    return parseDateBreakdown(scheduleConfig.specificDate || getNextWednesdayDateString());
  }, [scheduleConfig.specificDate]);

  const handleResetToAutoAll = () => {
    if (!canConfigure) {
      playWarningBuzzer();
      return;
    }
    playClickTick();
    setDateMode('auto');
    setCustomDate(todayStr);
    setAcademicYearMode('auto');
    setCustomAcademicYear(autoYear);
    setScheduleConfig(DEFAULT_SCHEDULE_CONFIG);
  };

  const handleSave = () => {
    if (!canConfigure) {
      playWarningBuzzer();
      return;
    }
    playSuccessChime();
    saveAttendanceScheduleConfig(scheduleConfig);
    onSave({
      dateMode,
      customDate: customDate || todayStr,
      academicYearMode,
      customAcademicYear: customAcademicYear.trim() || autoYear,
    });
    onClose();
  };

  // Mini Calendar Generation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isWednesday: boolean;
    }> = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthDays - i;
      const mStr = String(calMonth === 0 ? 12 : calMonth).padStart(2, '0');
      const yStr = calMonth === 0 ? calYear - 1 : calYear;
      const dStr = `${yStr}-${mStr}-${String(dNum).padStart(2, '0')}`;
      days.push({
        dayNumber: dNum,
        dateString: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: scheduleConfig.specificDate === dStr,
        isWednesday: new Date(yStr, (calMonth === 0 ? 12 : calMonth) - 1, dNum).getDay() === 3,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateString: dStr,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        isSelected: scheduleConfig.specificDate === dStr,
        isWednesday: new Date(calYear, calMonth, d).getDay() === 3,
      });
    }

    const totalCells = days.length > 35 ? 42 : 35;
    const remainingCells = totalCells - days.length;
    for (let d = 1; d <= remainingCells; d++) {
      const mStr = String(calMonth === 11 ? 1 : calMonth + 2).padStart(2, '0');
      const yStr = calMonth === 11 ? calYear + 1 : calYear;
      const dStr = `${yStr}-${mStr}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateString: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: scheduleConfig.specificDate === dStr,
        isWednesday: new Date(yStr, (calMonth === 11 ? 0 : calMonth + 1), d).getDay() === 3,
      });
    }

    return days;
  }, [calYear, calMonth, scheduleConfig.specificDate, todayStr]);

  const handlePrevCalMonth = () => {
    playClickTick();
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextCalMonth = () => {
    playClickTick();
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleSelectCalendarDate = (dateStr: string) => {
    if (!canConfigure) return;
    playClickTick();
    setScheduleConfig((prev) => ({
      ...prev,
      preset: 'specific_date',
      specificDate: dateStr,
      isPaused: false, // Re-enable if was paused
      customLabel: isEn ? `Session Date: ${dateStr}` : `Tanggal Sesi: ${dateStr}`
    }));
  };

  const handleQuickPickWednesday = (weekOffset: number = 0) => {
    if (!canConfigure) return;
    playClickTick();
    const d = new Date();
    const curDay = d.getDay();
    const diffToWed = (3 - curDay + 7) % 7;
    d.setDate(d.getDate() + (diffToWed === 0 && weekOffset === 0 ? 0 : diffToWed + weekOffset * 7));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    const targetStr = `${y}-${m}-${dt}`;
    setCalYear(y);
    setCalMonth(d.getMonth());
    handleSelectCalendarDate(targetStr);
  };

  // Actions for Edit / Delete / Cancel Sessions
  const handleTogglePauseSession = () => {
    if (!canConfigure) return;
    playClickTick();
    setScheduleConfig((prev) => ({
      ...prev,
      isPaused: !prev.isPaused,
    }));
  };

  // Add current configured specific date to scheduled sessions list
  const handleAddSessionToList = () => {
    if (!canConfigure) return;
    playSuccessChime();
    const targetDate = scheduleConfig.specificDate || getNextWednesdayDateString();
    const newSession: ScheduledSessionItem = {
      id: `session-${Date.now()}`,
      date: targetDate,
      startHour: scheduleConfig.startHour,
      startMinute: scheduleConfig.startMinute,
      endHour: scheduleConfig.endHour,
      endMinute: scheduleConfig.endMinute,
      title: editingSessionTitle.trim() || (isEn ? 'Robotics Club Meeting' : 'Pertemuan Ekskul Robotik')
    };

    setScheduleConfig((prev) => {
      const existing = prev.scheduledSessions || [];
      // Remove any duplicate for the same date and replace with new
      const filtered = existing.filter((s) => s.date !== targetDate);
      const updated = [...filtered, newSession].sort((a, b) => a.date.localeCompare(b.date));
      return {
        ...prev,
        scheduledSessions: updated
      };
    });
  };

  // Delete a session from the list
  const handleDeleteSessionFromList = (sessionId: string) => {
    if (!canConfigure) return;
    playClickTick();
    setScheduleConfig((prev) => {
      const existing = prev.scheduledSessions || [];
      const updated = existing.filter((s) => s.id !== sessionId);
      return {
        ...prev,
        scheduledSessions: updated
      };
    });
  };

  // Load a session from the list to edit it
  const handleEditSessionFromList = (session: ScheduledSessionItem) => {
    if (!canConfigure) return;
    playClickTick();
    const [y, m] = session.date.split('-').map(Number);
    if (y && m) {
      setCalYear(y);
      setCalMonth(m - 1);
    }
    setEditingSessionTitle(session.title || (isEn ? 'Robotics Club Meeting' : 'Pertemuan Ekskul Robotik'));
    setScheduleConfig((prev) => ({
      ...prev,
      preset: 'specific_date',
      specificDate: session.date,
      startHour: session.startHour,
      startMinute: session.startMinute,
      endHour: session.endHour,
      endMinute: session.endMinute,
      isPaused: false
    }));
  };

  const ACADEMIC_YEAR_PRESETS = [
    '2023/2024',
    '2024/2025',
    '2025/2026',
    '2026/2027',
    '2027/2028',
    '2028/2029'
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          id="dateTimeConfigModalOverlay"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={onClose}
        >
          <motion.div 
            id="dateTimeConfigModalContent"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {isEn ? 'Calendar & Attendance Schedule Settings' : 'Pengaturan Kalender & Jadwal Presensi'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isEn ? 'Select, edit, or delete club meeting sessions from the calendar' : 'Pilih, edit, atau hapus sesi pertemuan ekskul dari kalender'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="closeDateTimeModalBtn"
            onClick={() => {
              playClickTick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-Only RBAC Security Notice if non-admin */}
        {!canConfigure && (
          <div className="mx-4 sm:mx-5 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-950 text-xs leading-relaxed shadow-2xs">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">
                {isEn ? 'Read-Only Mode (Locked): Calendar & Schedule Settings' : 'Mode Hanya Lihat (Terkunci): Setelan Kalender & Jadwal'}
              </span>
              <span className="text-[11px] text-amber-800 block mt-0.5">
                {isEn 
                  ? 'Only Administrators, Advisors, or Presidents are authorized to configure, edit, or delete attendance schedule sessions.' 
                  : 'Hanya Administrator, Pembina, atau Ketua yang berwenang mengubah, mengedit, atau menghapus sesi jadwal absensi.'}
              </span>
            </div>
          </div>
        )}

        {/* Tab Selector: Schedule vs Academic Year vs Date */}
        <div className="p-3 bg-slate-100/70 border-b border-slate-200/80">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              id="tabScheduleBtn"
              onClick={() => {
                playClickTick();
                setActiveTab('schedule');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>{isEn ? 'Schedule Calendar' : 'Kalender Jadwal'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-white shrink-0" />
            </button>

            <button
              type="button"
              id="tabAcademicYearBtn"
              onClick={() => {
                playClickTick();
                setActiveTab('academic');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'academic'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
              <span>{isEn ? 'Academic Year' : 'Tahun Ajaran'}</span>
              {academicYearMode === 'custom' ? (
                <span className="w-2 h-2 rounded-full bg-amber-400 ring-1 ring-white shrink-0" title={isEn ? "Custom Mode Active" : "Mode Kustom Aktif"} />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-white shrink-0" title={isEn ? "Auto Mode Active" : "Mode Otomatis Aktif"} />
              )}
            </button>

            <button
              type="button"
              id="tabDateBtn"
              onClick={() => {
                playClickTick();
                setActiveTab('date');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'date'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{isEn ? 'Session Date' : 'Tanggal Sesi'}</span>
              {dateMode === 'custom' ? (
                <span className="w-2 h-2 rounded-full bg-amber-400 ring-1 ring-white shrink-0" title={isEn ? "Custom Mode Active" : "Mode Kustom Aktif"} />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-white shrink-0" title={isEn ? "Auto Mode Active" : "Mode Otomatis Aktif"} />
              )}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* ======================================================== */}
          {/* TAB 1: ATTENDANCE SCHEDULE & CALENDAR PICKER */}
          {/* ======================================================== */}
          {activeTab === 'schedule' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Header Status Card */}
              <div className={`rounded-2xl p-4 border transition-all ${
                scheduleConfig.isPaused
                  ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                  : 'bg-indigo-50/60 border-indigo-200/80 text-indigo-950'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    {scheduleConfig.isPaused ? (
                      <Ban className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <CalendarCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                    {scheduleConfig.isPaused 
                      ? (isEn ? 'Attendance Session is Currently Paused (Holiday)' : 'Sesi Presensi Sedang Ditiadakan (Libur)') 
                      : (isEn ? 'Automated Attendance Schedule Status' : 'Status Otomasi Jadwal Presensi')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${liveScheduleStatus.statusBadge.bgColor}`}>
                    {isEn ? (liveScheduleStatus.statusBadge.labelEn || liveScheduleStatus.statusBadge.label) : (liveScheduleStatus.statusBadge.labelId || liveScheduleStatus.statusBadge.label)}
                  </span>
                </div>
                <p className="text-xs opacity-90 leading-relaxed">
                  {scheduleConfig.isPaused 
                    ? (isEn 
                        ? 'Sessions are currently paused. Students cannot submit attendance until you reactivate the schedule.' 
                        : 'Pertemuan sedang dinonaktifkan. Siswa tidak dapat mengisi absensi sampai Anda mengaktifkan kembali jadwal sesi.')
                    : (isEn 
                        ? 'Select and edit session dates directly from the visual calendar below, or use weekly recurring presets.' 
                        : 'Pilih dan edit tanggal sesi langsung dari kalender visual di bawah ini, atau gunakan preset mingguan.')}
                </p>
              </div>

              {/* ACTION: TOMBOL CEPAT TIADAKAN / AKTIFKAN SESI */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {isEn ? 'Club Session Implementation Status:' : 'Status Pelaksanaan Sesi Ekskul:'}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {scheduleConfig.isPaused
                      ? (isEn ? 'Currently cancelled / paused (holiday).' : 'Saat ini presensi ditiadakan / libur.')
                      : (isEn ? 'Attendance actively running per calendar schedule.' : 'Presensi aktif berjalan sesuai jadwal kalender.')}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={!canConfigure}
                  onClick={handleTogglePauseSession}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    scheduleConfig.isPaused
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  }`}
                  title={scheduleConfig.isPaused 
                    ? (isEn ? "Re-enable attendance session" : "Aktifkan kembali sesi presensi") 
                    : (isEn ? "Cancel meeting session / holiday" : "Tiadakan pertemuan ekskul / libur")}
                >
                  {scheduleConfig.isPaused ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Re-enable This Session' : 'Aktifkan Sesi Ini'}</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5 text-rose-600" />
                      <span>{isEn ? 'Cancel / Holiday' : 'Tiadakan / Libur'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* SECTION: KALENDER VISUAL (TANGGAL, BULAN, HARI, TAHUN) */}
              <div className={`p-4 rounded-2xl border transition-all ${
                scheduleConfig.preset === 'specific_date' && !scheduleConfig.isPaused
                  ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="schedulePresetRadio"
                      id="radioSpecificDate"
                      checked={scheduleConfig.preset === 'specific_date' && !scheduleConfig.isPaused}
                      disabled={!canConfigure}
                      onChange={() => {
                        if (canConfigure) {
                          setScheduleConfig((prev) => ({
                            ...prev,
                            preset: 'specific_date',
                            isPaused: false,
                            specificDate: prev.specificDate || getNextWednesdayDateString()
                          }));
                        }
                      }}
                      className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="radioSpecificDate" className="text-xs font-bold text-slate-900 cursor-pointer flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>{isEn ? 'Custom Calendar: Date, Month, Day, Year' : 'Kustom Kalender: Tanggal, Bulan, Hari, Tahun'}</span>
                    </label>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                    {isEn ? 'Editable / Clickable' : 'Bisa Di-edit / Di-klik'}
                  </span>
                </div>

                {/* Quick Helper Buttons */}
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1">
                    {isEn ? 'Quick Pick:' : 'Pilih Cepat:'}
                  </span>
                  <button
                    type="button"
                    disabled={!canConfigure}
                    onClick={() => handleSelectCalendarDate(todayStr)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition cursor-pointer"
                  >
                    {isEn ? 'Today' : 'Hari Ini'}
                  </button>
                  <button
                    type="button"
                    disabled={!canConfigure}
                    onClick={() => handleQuickPickWednesday(0)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 transition cursor-pointer"
                  >
                    {isEn ? 'This Wednesday' : 'Rabu Minggu Ini'}
                  </button>
                  <button
                    type="button"
                    disabled={!canConfigure}
                    onClick={() => handleQuickPickWednesday(1)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition cursor-pointer"
                  >
                    {isEn ? 'Next Wednesday' : 'Rabu Depan'}
                  </button>
                </div>

                {/* Mini Calendar Interactive Widget */}
                <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs select-none">
                  {/* Calendar Header with Month/Year Navigation */}
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={handlePrevCalMonth}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                      title={isEn ? "Previous Month" : "Bulan Sebelumnya"}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                      <span>{isEn ? ENGLISH_MONTHS[calMonth] : INDONESIAN_MONTHS[calMonth]}</span>
                      <span className="text-indigo-600 font-extrabold">{calYear}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleNextCalMonth}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                      title={isEn ? "Next Month" : "Bulan Berikutnya"}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day of week headers */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {(isEn ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']).map((dName, idx) => (
                      <span key={dName} className={`text-[10px] font-bold py-0.5 ${idx === 3 ? 'text-indigo-600 font-extrabold' : 'text-slate-400'}`}>
                        {dName}
                      </span>
                    ))}
                  </div>

                  {/* Calendar Days Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((cell, index) => {
                      const isSelected = scheduleConfig.specificDate === cell.dateString;
                      return (
                        <button
                          key={`${cell.dateString}-${index}`}
                          type="button"
                          disabled={!canConfigure}
                          onClick={() => handleSelectCalendarDate(cell.dateString)}
                          className={`h-8 rounded-xl text-xs font-medium relative flex flex-col items-center justify-center transition cursor-pointer ${
                            !cell.isCurrentMonth
                              ? 'text-slate-300 hover:text-slate-500'
                              : isSelected
                              ? 'bg-indigo-600 text-white font-extrabold shadow-xs ring-2 ring-indigo-200'
                              : cell.isToday
                              ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-300'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>{cell.dayNumber}</span>
                          {cell.isWednesday && !isSelected && (
                            <span className="w-1 h-1 rounded-full bg-indigo-500 -mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Structured Date Breakdown & Edit Card */}
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">
                      {isEn ? 'Selected Calendar Session Details:' : 'Rincian Sesi Kalender Terpilih:'}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded border border-indigo-200">
                      {isEn ? selectedSpecificDateBreakdown.formattedEn : selectedSpecificDateBreakdown.formattedId}
                    </span>
                  </div>
                  
                  {/* Four Columns Breakdown: Hari, Tanggal, Bulan, Tahun */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        {isEn ? 'Day' : 'Hari'}
                      </span>
                      <span className="text-xs font-bold text-indigo-700 block">
                        {isEn ? selectedSpecificDateBreakdown.dayNameEn : selectedSpecificDateBreakdown.dayNameId}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        {isEn ? 'Date' : 'Tanggal'}
                      </span>
                      <span className="text-xs font-bold text-slate-800 block">
                        {String(selectedSpecificDateBreakdown.dayNumber).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        {isEn ? 'Month' : 'Bulan'}
                      </span>
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        {isEn ? selectedSpecificDateBreakdown.monthNameEn : selectedSpecificDateBreakdown.monthNameId}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        {isEn ? 'Year' : 'Tahun'}
                      </span>
                      <span className="text-xs font-bold text-slate-800 block">
                        {selectedSpecificDateBreakdown.year}
                      </span>
                    </div>
                  </div>

                  {/* Title / Description of this Session */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      {isEn ? 'Session Title / Meeting Description:' : 'Judul / Keterangan Sesi Pertemuan:'}
                    </label>
                    <input
                      type="text"
                      disabled={!canConfigure}
                      value={editingSessionTitle}
                      onChange={(e) => setEditingSessionTitle(e.target.value)}
                      placeholder={isEn ? "e.g. Weekly Robotics Meeting / IoT Workshop" : "Contoh: Pertemuan Rutin Robotika / Workshop IoT"}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Hours Inputs (Start and End Time) */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-200">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        {isEn ? 'Check-in Opens:' : 'Jam Buka Presensi:'}
                      </label>
                      <input
                        type="time"
                        disabled={!canConfigure}
                        value={`${String(scheduleConfig.startHour).padStart(2, '0')}:${String(scheduleConfig.startMinute).padStart(2, '0')}`}
                        onChange={(e) => {
                          const [h, m] = e.target.value.split(':').map(Number);
                          if (!isNaN(h) && !isNaN(m)) {
                            setScheduleConfig((prev) => ({
                              ...prev,
                              startHour: h,
                              startMinute: m
                            }));
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        {isEn ? 'Check-in Closes:' : 'Jam Tutup Presensi:'}
                      </label>
                      <input
                        type="time"
                        disabled={!canConfigure}
                        value={`${String(scheduleConfig.endHour).padStart(2, '0')}:${String(scheduleConfig.endMinute).padStart(2, '0')}`}
                        onChange={(e) => {
                          const [h, m] = e.target.value.split(':').map(Number);
                          if (!isNaN(h) && !isNaN(m)) {
                            setScheduleConfig((prev) => ({
                              ...prev,
                              endHour: h,
                              endMinute: m
                            }));
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Action to Save / Add to Scheduled Sessions List */}
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={!canConfigure}
                      onClick={handleAddSessionToList}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Save / Add to Session Agenda' : 'Simpan / Tambahkan ke Daftar Sesi'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={!canConfigure}
                      onClick={() => handleSelectCalendarDate(getNextWednesdayDateString())}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                      {isEn ? 'Reset Date' : 'Reset Tanggal'}
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION: DAFTAR AGENDA SESI TERJADWAL (BISA DI-EDIT & DI-HAPUS) */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-indigo-600" />
                    <span>
                      {isEn 
                        ? `Scheduled Session Agenda (${scheduleConfig.scheduledSessions?.length || 0})` 
                        : `Daftar Agenda Sesi Pertemuan (${scheduleConfig.scheduledSessions?.length || 0})`}
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {isEn ? 'Can be edited & deleted at any time' : 'Bisa di-edit & di-hapus kapan saja'}
                  </span>
                </div>

                {(!scheduleConfig.scheduledSessions || scheduleConfig.scheduledSessions.length === 0) ? (
                  <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    {isEn 
                      ? 'No scheduled sessions in the list yet. Click "Save / Add to Session Agenda" above to add.' 
                      : 'Belum ada sesi pertemuan dalam daftar. Klik tombol "Simpan / Tambahkan ke Daftar Sesi" di atas untuk menambahkan.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scheduleConfig.scheduledSessions.map((sessionItem) => {
                      const breakdown = parseDateBreakdown(sessionItem.date);
                      const isCurrentActive = scheduleConfig.specificDate === sessionItem.date && scheduleConfig.preset === 'specific_date';
                      return (
                        <div 
                          key={sessionItem.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${
                            isCurrentActive 
                              ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300' 
                              : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 truncate">
                                {sessionItem.title || (isEn ? 'Robotics Meeting' : 'Pertemuan Ekskul')}
                              </span>
                              {isCurrentActive && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[9px] font-bold">
                                  {isEn ? 'Active' : 'Aktif'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                              <span className="font-mono text-indigo-700 font-semibold">
                                📅 {isEn ? breakdown.formattedEn : breakdown.formattedId}
                              </span>
                              <span>•</span>
                              <span className="font-mono text-slate-600">
                                ⏰ {String(sessionItem.startHour).padStart(2, '0')}:{String(sessionItem.startMinute).padStart(2, '0')} - {String(sessionItem.endHour).padStart(2, '0')}:{String(sessionItem.endMinute).padStart(2, '0')} WIB
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons: Edit & Delete */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={!canConfigure}
                              onClick={() => handleEditSessionFromList(sessionItem)}
                              className="p-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-indigo-700 transition cursor-pointer"
                              title={isEn ? "Edit date or time for this session" : "Edit tanggal atau jam sesi ini"}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={!canConfigure}
                              onClick={() => handleDeleteSessionFromList(sessionItem.id)}
                              className="p-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 transition cursor-pointer"
                              title={isEn ? "Delete this session from schedule" : "Hapus sesi pertemuan ini dari jadwal"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ALTERNATIVE PRESET: RECURRING WEEKLY */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-slate-700 block">
                  {isEn ? 'Or Choose Recurring Weekly Schedule:' : 'Atau Pilih Jadwal Mingguan Rutin:'}
                </span>

                {/* Preset: Rabu 16:00 - 19:00 WIB (Setiap Minggu) */}
                <label 
                  onClick={() => {
                    if (!canConfigure) return;
                    playClickTick();
                    setScheduleConfig({
                      preset: 'wednesday_afternoon',
                      startHour: 16,
                      startMinute: 0,
                      endHour: 19,
                      endMinute: 0,
                      activeDays: [3],
                      specificDate: scheduleConfig.specificDate,
                      isPaused: false,
                      customLabel: isEn ? 'Every Wednesday, 16:00 - 19:00 WIB (4 PM - 7 PM)' : 'Hari Rabu, 16:00 - 19:00 WIB (4 Sore - 7 Malam)',
                      scheduledSessions: scheduleConfig.scheduledSessions
                    });
                  }}
                  className={`flex items-start gap-3 p-3 rounded-2xl border transition ${
                    !canConfigure ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                  } ${
                    scheduleConfig.preset === 'wednesday_afternoon' && !scheduleConfig.isPaused
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-2xs ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="schedulePresetRadio"
                    checked={scheduleConfig.preset === 'wednesday_afternoon' && !scheduleConfig.isPaused}
                    disabled={!canConfigure}
                    onChange={() => {}}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{isEn ? 'Every Wednesday: 16:00 – 19:00 WIB' : 'Setiap Hari Rabu: 16:00 – 19:00 WIB'}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                          {isEn ? '⭐ Club Routine' : '⭐ Rutin Ekskul'}
                        </span>
                      </span>
                      <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md border border-indigo-200">
                        {isEn ? '4 PM – 7 PM' : '4 Sore – 7 Malam'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {isEn 
                        ? 'Automatically repeats every Wednesday across the semester without needing manual date picks every week.' 
                        : 'Otomatis berulang setiap hari Rabu sepanjang semester tanpa perlu memilih tanggal manual setiap minggu.'}
                    </p>
                  </div>
                </label>

                {/* Preset: Rabu Seharian 00:00 - 23:59 WIB */}
                <label 
                  onClick={() => {
                    if (!canConfigure) return;
                    playClickTick();
                    setScheduleConfig({
                      preset: 'wednesday_full',
                      startHour: 0,
                      startMinute: 0,
                      endHour: 23,
                      endMinute: 59,
                      activeDays: [3],
                      specificDate: scheduleConfig.specificDate,
                      isPaused: false,
                      customLabel: isEn ? 'Every Wednesday, 00:00 - 23:59 WIB (Full Day)' : 'Hari Rabu, 00:00 - 23:59 WIB (Seharian Penuh)',
                      scheduledSessions: scheduleConfig.scheduledSessions
                    });
                  }}
                  className={`flex items-start gap-3 p-3 rounded-2xl border transition ${
                    !canConfigure ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                  } ${
                    scheduleConfig.preset === 'wednesday_full' && !scheduleConfig.isPaused
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-2xs ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="schedulePresetRadio"
                    checked={scheduleConfig.preset === 'wednesday_full' && !scheduleConfig.isPaused}
                    disabled={!canConfigure}
                    onChange={() => {}}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {isEn ? 'Every Wednesday: 00:00 – 23:59 WIB (Full Day)' : 'Setiap Hari Rabu: 00:00 – 23:59 WIB (Seharian)'}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {isEn ? '24 Hours' : '24 Jam'}
                      </span>
                    </div>
                  </div>
                </label>
              </div>

              {/* Testing Bypass Option */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {isEn ? 'Bypass Schedule for Testing (Demo Mode)' : 'Bypass Jadwal untuk Pengujian (Testing Mode)'}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {isEn 
                        ? 'Unlocks self check-in immediately for administrator testing and demonstration purposes.' 
                        : 'Membuka kunci presensi mandiri saat ini juga untuk keperluan demo & pengetesan admin.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!canConfigure}
                    onClick={() => {
                      if (!canConfigure) return;
                      playClickTick();
                      const next = !bypassSchedule;
                      setBypassSchedule(next);
                      setBypassScheduleEnabled(next);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shrink-0 ${
                      !canConfigure
                        ? 'opacity-60 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                        : bypassSchedule
                        ? 'bg-amber-100 text-amber-900 border-amber-300 cursor-pointer shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>{bypassSchedule ? (isEn ? 'Active' : 'Aktif') : (isEn ? 'Inactive' : 'Nonaktif')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: ACADEMIC YEAR */}
          {/* ======================================================== */}
          {activeTab === 'academic' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                    {isEn ? 'Academic Year Mode' : 'Mode Tahun Ajaran'}
                  </span>
                  {academicYearMode === 'auto' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {isEn ? 'Real-time Automatic' : 'Real-time Otomatis'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      {isEn ? 'Manual Custom' : 'Kustom Manual'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isEn 
                    ? 'By default, the academic year rolls over automatically every July following the standard academic calendar.' 
                    : 'Secara default, tahun ajaran berganti otomatis setiap bulan Juli mengikuti kalender akademik sekolah.'}
                </p>
              </div>

              {/* Radio Selector */}
              <div className="space-y-2.5">
                {/* Option 1: Automatic */}
                <label 
                  onClick={() => {
                    if (!canConfigure) return;
                    playClickTick();
                    setAcademicYearMode('auto');
                  }}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition ${
                    !canConfigure ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                  } ${
                    academicYearMode === 'auto'
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-2xs ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="academicYearModeRadio"
                    checked={academicYearMode === 'auto'}
                    disabled={!canConfigure}
                    onChange={() => {
                      if (canConfigure) setAcademicYearMode('auto');
                    }}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {isEn ? 'Automatic (Follows Real-time Calendar)' : 'Otomatis (Mengikuti Kalender Real-time)'}
                      </span>
                      <span className="font-mono text-xs font-extrabold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md border border-indigo-200">
                        {autoYear}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isEn ? "Calculated automatically based on today's date." : 'Dihitung secara otomatis berdasarkan tanggal hari ini.'}
                    </p>
                  </div>
                </label>

                {/* Option 2: Custom */}
                <label 
                  onClick={() => {
                    if (!canConfigure) return;
                    playClickTick();
                    setAcademicYearMode('custom');
                  }}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition ${
                    !canConfigure ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                  } ${
                    academicYearMode === 'custom'
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-2xs ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="academicYearModeRadio"
                    checked={academicYearMode === 'custom'}
                    disabled={!canConfigure}
                    onChange={() => {
                      if (canConfigure) setAcademicYearMode('custom');
                    }}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-800 block">
                      {isEn ? 'Custom Academic Year' : 'Tahun Ajaran Kustom'}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isEn ? 'Choose from quick presets or enter a specific academic period.' : 'Pilih dari preset cepat atau masukkan periode akademik tertentu.'}
                    </p>

                    {academicYearMode === 'custom' && (
                      <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2.5 animate-in fade-in duration-150">
                        <span className="text-[11px] font-bold text-slate-600 block">
                          {isEn ? 'Quick Presets:' : 'Preset Cepat:'}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {ACADEMIC_YEAR_PRESETS.map((yearStr) => {
                            const isSelected = customAcademicYear.trim() === yearStr;
                            return (
                              <button
                                key={yearStr}
                                type="button"
                                disabled={!canConfigure}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!canConfigure) return;
                                  playClickTick();
                                  setCustomAcademicYear(yearStr);
                                }}
                                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition border ${
                                  !canConfigure ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                                } ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {yearStr}
                              </button>
                            );
                          })}
                        </div>

                        <div className="pt-1.5">
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            {isEn ? 'Or type custom:' : 'Atau ketik kustom:'}
                          </label>
                          <input
                            type="text"
                            value={customAcademicYear}
                            disabled={!canConfigure}
                            onChange={(e) => {
                              if (canConfigure) setCustomAcademicYear(e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder={isEn ? "e.g. 2026/2027" : "Contoh: 2026/2027"}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: SESSION DATE */}
          {/* ======================================================== */}
          {activeTab === 'date' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                    {isEn ? 'System Date Mode' : 'Mode Tanggal Sistem'}
                  </span>
                  {dateMode === 'auto' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {isEn ? 'Real-time Automatic' : 'Real-time Otomatis'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      {isEn ? 'Manual Custom' : 'Kustom Manual'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isEn 
                    ? "By default, the application displays today's date in real time. You can choose a custom date to review past attendance records." 
                    : 'Secara default, aplikasi menampilkan tanggal hari ini secara langsung. Anda dapat memilih tanggal kustom untuk mereview catatan absensi terdahulu.'}
                </p>
              </div>

              {/* Radio Selector */}
              <div className="space-y-2.5">
                {/* Option 1: Automatic */}
                <label 
                  onClick={() => {
                    if (!canConfigure) return;
                    playClickTick();
                    setDateMode('auto');
                  }}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition ${
                    !canConfigure ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                  } ${
                    dateMode === 'auto'
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-2xs ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="dateModeRadio"
                    checked={dateMode === 'auto'}
                    disabled={!canConfigure}
                    onChange={() => {
                      if (canConfigure) setDateMode('auto');
                    }}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-800 block">
                      {isEn ? "Automatic (Follows Today's Date)" : 'Otomatis (Mengikuti Tanggal Hari Ini)'}
                    </span>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{isEn ? new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : formatFullIndonesianDate(new Date())}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {isEn ? 'Header will automatically roll over at midnight.' : 'Header akan otomatis berganti hari setiap tengah malam.'}
                    </p>
                  </div>
                </label>

                {/* Option 2: Custom */}
                <label 
                  onClick={() => {
                    if (!canConfigure) return;
                    playClickTick();
                    setDateMode('custom');
                  }}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition ${
                    !canConfigure ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                  } ${
                    dateMode === 'custom'
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-2xs ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="dateModeRadio"
                    checked={dateMode === 'custom'}
                    disabled={!canConfigure}
                    onChange={() => {
                      if (canConfigure) setDateMode('custom');
                    }}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-800 block">
                      {isEn ? 'Select Custom Date' : 'Pilih Tanggal Kustom'}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isEn ? 'Set a specific date to filter and review attendance data.' : 'Tetapkan tanggal tertentu untuk memfilter dan menampilkan data presensi.'}
                    </p>

                    {dateMode === 'custom' && (
                      <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2.5 animate-in fade-in duration-150">
                        <label className="text-[11px] font-bold text-slate-600 block">
                          {isEn ? 'Choose Date:' : 'Pilih Tanggal:'}
                        </label>
                        <input
                          type="date"
                          value={customDate}
                          disabled={!canConfigure}
                          onChange={(e) => {
                            if (canConfigure) setCustomDate(e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed cursor-pointer"
                        />
                        {customDate && (
                          <div className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                            <span>
                              {isEn 
                                ? `Selected: ${new Date(customDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` 
                                : `Terpilih: ${formatFullIndonesianDate(customDate)}`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            id="resetToAutoAllBtn"
            onClick={handleResetToAutoAll}
            disabled={!canConfigure}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-700 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title={canConfigure 
              ? (isEn ? "Reset all settings to default (Wednesday 16:00-19:00 WIB & Real-time)" : "Reset semua pengaturan ke default (Rabu 16:00-19:00 WIB & Real-time)") 
              : (isEn ? "Administrator Only" : "Khusus Administrator")}
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>{isEn ? 'Reset to Default (Wed 16:00–19:00 WIB)' : 'Reset ke Default (Rabu 16:00–19:00 WIB)'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              id="cancelDateTimeConfigBtn"
              onClick={() => {
                playClickTick();
                onClose();
              }}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              {canConfigure ? (isEn ? 'Cancel' : 'Batal') : (isEn ? 'Close' : 'Tutup')}
            </button>
            <button
              type="button"
              id="saveDateTimeConfigBtn"
              onClick={handleSave}
              disabled={!canConfigure}
              className={`flex-1 sm:flex-none px-4 py-2 font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 ${
                !canConfigure
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white cursor-pointer'
              }`}
            >
              {canConfigure ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Apply Settings' : 'Terapkan Pengaturan'}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isEn ? 'Locked (Admin Only)' : 'Terkunci (Admin Only)'}</span>
                </>
              )}
            </button>
          </div>
        </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
