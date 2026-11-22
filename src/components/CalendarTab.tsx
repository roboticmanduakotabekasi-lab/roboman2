import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  Clock, 
  Users, 
  Wallet, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  Filter,
  Sparkles,
  Search,
  X,
  Bot,
  Pin,
  Plus,
  BookOpen,
  Edit3,
  Trash2,
  AlertCircle,
  CalendarCheck,
  Check,
  ChevronDown,
  MapPin,
  ExternalLink,
  AlertTriangle,
  Megaphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Member, 
  AttendanceRecord, 
  CashTransaction, 
  MaterialAssignment, 
  UserSession,
  Announcement
} from '../types';
import { formatRupiah, formatIndonesianDate } from '../utils/formatters';
import { 
  fetchMaterialsAssignmentsFromDB,
  fetchAnnouncementsFromDB
} from '../services/supabaseService';
import { INITIAL_ASSIGNMENTS, INITIAL_ANNOUNCEMENTS } from '../data/initialData';
import { playClickTick, playSuccessChime, playWarningBuzzer } from '../utils/audioFeedback';
import { getSupabase } from '../lib/supabase';
import { useLanguage } from '../utils/i18n';
import { canManageAnnouncements, canConfigureCalendar } from '../utils/rbac';

interface CalendarTabProps {
  members: Member[];
  attendance: AttendanceRecord[];
  cash: CashTransaction[];
  session?: UserSession | null;
  announcements?: Announcement[];
  initialSearchTerm?: string;
  onNavigateToAttendanceDate?: (dateStr: string) => void;
  onNavigateToCashMonth?: (monthKey: string) => void;
  onNavigateToAssignments?: () => void;
  onOpenAnnouncementsModal?: () => void;
}

const CALENDAR_MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CALENDAR_MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_HEADERS_EN = [
  { key: 'sun', label: 'Sun', full: 'Sunday' },
  { key: 'mon', label: 'Mon', full: 'Monday' },
  { key: 'tue', label: 'Tue', full: 'Tuesday' },
  { key: 'wed', label: 'Wed', full: 'Wednesday', isRoboticsDay: true },
  { key: 'thu', label: 'Thu', full: 'Thursday' },
  { key: 'fri', label: 'Fri', full: 'Friday' },
  { key: 'sat', label: 'Sat', full: 'Saturday' },
];

const DAY_HEADERS_ID = [
  { key: 'sun', label: 'Min', full: 'Minggu' },
  { key: 'mon', label: 'Sen', full: 'Senin' },
  { key: 'tue', label: 'Sel', full: 'Selasa' },
  { key: 'wed', label: 'Rab', full: 'Rabu', isRoboticsDay: true },
  { key: 'thu', label: 'Kam', full: 'Kamis' },
  { key: 'fri', label: 'Jum', full: 'Jumat' },
  { key: 'sat', label: 'Sab', full: 'Sabtu' },
];

export const CalendarTab: React.FC<CalendarTabProps> = ({
  members,
  attendance,
  cash,
  session,
  announcements: propsAnnouncements,
  initialSearchTerm,
  onNavigateToAttendanceDate,
  onNavigateToCashMonth,
  onNavigateToAssignments,
  onOpenAnnouncementsModal,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const calendarMonths = isEn ? CALENDAR_MONTHS_EN : CALENDAR_MONTHS_ID;
  const dayHeaders = isEn ? DAY_HEADERS_EN : DAY_HEADERS_ID;

  // Strict Calendar Authority: Only Administrator, Club President, or Faculty Advisor can configure/edit calendar
  const canEditCalendar = canConfigureCalendar(session);
  const canPostAnnouncements = canManageAnnouncements(session);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Current view date (year and month)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDayStr, setSelectedDayStr] = useState<string>(todayStr);
  const [calendarSearch, setCalendarSearch] = useState<string>(initialSearchTerm || '');

  // Quick Date Picker Popover State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
  const [pickerYear, setPickerYear] = useState<number>(today.getFullYear());
  const [customJumpDate, setCustomJumpDate] = useState<string>(todayStr);

  // Materials & Assignments with deadlines
  const [assignments, setAssignments] = useState<MaterialAssignment[]>([]);

  // Official Announcements & Schedules
  const [localAnnouncements, setLocalAnnouncements] = useState<Announcement[]>(() => {
    if (propsAnnouncements && propsAnnouncements.length > 0) return propsAnnouncements;
    try {
      const saved = localStorage.getItem('robotics_announcements');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_ANNOUNCEMENTS as Announcement[];
  });

  useEffect(() => {
    if (propsAnnouncements && propsAnnouncements.length > 0) {
      setLocalAnnouncements(propsAnnouncements);
    }
  }, [propsAnnouncements]);

  const loadAnnouncements = useCallback(async () => {
    try {
      const data = await fetchAnnouncementsFromDB();
      if (data && data.length > 0) {
        setLocalAnnouncements(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadAnnouncements();

    const handleAnnouncementsUpdate = () => {
      try {
        const saved = localStorage.getItem('robotics_announcements');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setLocalAnnouncements(parsed);
          }
        }
      } catch {}
      loadAnnouncements();
    };

    window.addEventListener('robotics_announcements_updated', handleAnnouncementsUpdate);
    return () => {
      window.removeEventListener('robotics_announcements_updated', handleAnnouncementsUpdate);
    };
  }, [loadAnnouncements]);
  
  // Toast Notification state
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Delete Confirmation Modal State (Zero window.confirm)
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'assignment_deadline';
    id: string;
    title: string;
    dateStr?: string;
  } | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Load assignments and task deadlines
  const loadAssignments = useCallback(async () => {
    try {
      const mats = await fetchMaterialsAssignmentsFromDB();
      const resolved = (mats && mats.length > 0) ? mats : (INITIAL_ASSIGNMENTS as MaterialAssignment[]);
      setAssignments(resolved);
    } catch {
      const local = localStorage.getItem('robotics_materials_assignments');
      if (local) {
        try {
          setAssignments(JSON.parse(local));
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    loadAssignments();

    const handleAssignmentsUpdate = () => loadAssignments();
    window.addEventListener('robotics_assignments_updated', handleAssignmentsUpdate);

    return () => {
      window.removeEventListener('robotics_assignments_updated', handleAssignmentsUpdate);
    };
  }, [loadAssignments]);

  useEffect(() => {
    if (initialSearchTerm !== undefined) {
      setCalendarSearch(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0 - 11
  const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Helper: Detect whether a given YYYY-MM-DD date is Wednesday (Day index 3)
  const isWednesday = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return false;
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    return dt.getDay() === 3;
  };

  // Navigation functions
  const handlePrevMonth = () => {
    playClickTick();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    playClickTick();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    playClickTick();
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDayStr(now.toISOString().split('T')[0]);
    setIsDatePickerOpen(false);
  };

  const handleSelectMonth = (mIndex: number) => {
    playClickTick();
    setCurrentDate(new Date(pickerYear, mIndex, 1));
    setIsDatePickerOpen(false);
  };

  const handleJumpToCustomDate = (targetDateStr: string) => {
    if (!targetDateStr) return;
    playClickTick();
    const [y, m, d] = targetDateStr.split('-').map(Number);
    if (y && m && d) {
      setCurrentDate(new Date(y, m - 1, 1));
      setSelectedDayStr(targetDateStr);
      setIsDatePickerOpen(false);
    }
  };

  // Pre-calculate month days & calendar cells
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: {
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isWednesday: boolean;
    }[] = [];

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      const prevY = prevDate.getFullYear();
      const prevM = String(prevDate.getMonth() + 1).padStart(2, '0');
      const prevD = String(prevDate.getDate()).padStart(2, '0');
      const dateStr = `${prevY}-${prevM}-${prevD}`;
      cells.push({
        day: prevDate.getDate(),
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWednesday: prevDate.getDay() === 3,
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dt = new Date(year, month, d, 12, 0, 0);
      cells.push({
        day: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isWednesday: dt.getDay() === 3,
      });
    }

    // 3. Next month leading days to complete full grid (multiple of 7)
    const totalCellsNeeded = Math.ceil(cells.length / 7) * 7;
    const remaining = totalCellsNeeded - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const nextY = nextDate.getFullYear();
      const nextM = String(nextDate.getMonth() + 1).padStart(2, '0');
      const nextD = String(nextDate.getDate()).padStart(2, '0');
      const dateStr = `${nextY}-${nextM}-${nextD}`;
      cells.push({
        day: nextDate.getDate(),
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWednesday: nextDate.getDay() === 3,
      });
    }

    return cells;
  }, [year, month, todayStr]);

  // Map task deadlines by date (YYYY-MM-DD)
  const assignmentsByDateMap = useMemo(() => {
    const map = new Map<string, MaterialAssignment[]>();
    assignments.forEach((assign) => {
      if (!assign.deadline) return;
      const dateKey = assign.deadline.slice(0, 10);
      if (!dateKey) return;
      const list = map.get(dateKey) || [];
      list.push(assign);
      map.set(dateKey, list);
    });
    return map;
  }, [assignments]);

  // Map announcements by date (event_date and created_at)
  const announcementsByDateMap = useMemo(() => {
    const map = new Map<string, Announcement[]>();
    localAnnouncements.forEach((ann) => {
      const dates = new Set<string>();
      if (ann.event_date) dates.add(ann.event_date.slice(0, 10));
      if (ann.created_at) dates.add(ann.created_at.slice(0, 10));
      dates.forEach((dStr) => {
        if (dStr) {
          const list = map.get(dStr) || [];
          if (!list.some(existing => existing.id === ann.id)) {
            list.push(ann);
          }
          map.set(dStr, list);
        }
      });
    });
    return map;
  }, [localAnnouncements]);

  // Count announcements in current view month
  const monthAnnouncementsCount = useMemo(() => {
    return localAnnouncements.filter((a) => {
      const d1 = a.event_date?.slice(0, 7);
      const d2 = a.created_at?.slice(0, 7);
      return d1 === currentMonthKey || d2 === currentMonthKey;
    }).length;
  }, [localAnnouncements, currentMonthKey]);

  // Aggregate stats per date for fast lookup (attendance, cash)
  const dateDataMap = useMemo(() => {
    const map = new Map<
      string,
      {
        attendanceCount: number;
        hadirCount: number;
        izinCount: number;
        sakitCount: number;
        alpaCount: number;
        cashIn: number;
        cashOut: number;
        cashTxs: CashTransaction[];
        attendanceRecords: AttendanceRecord[];
      }
    >();

    // Index attendance
    attendance.forEach((att) => {
      if (!att.tanggal) return;
      const cleanDate = att.tanggal.slice(0, 10);
      const existing = map.get(cleanDate) || {
        attendanceCount: 0,
        hadirCount: 0,
        izinCount: 0,
        sakitCount: 0,
        alpaCount: 0,
        cashIn: 0,
        cashOut: 0,
        cashTxs: [],
        attendanceRecords: [],
      };

      existing.attendanceCount += 1;
      if (att.status === 'Hadir' || att.status === 'Present') existing.hadirCount += 1;
      else if (att.status === 'Izin' || att.status === 'Excused') existing.izinCount += 1;
      else if (att.status === 'Sakit' || att.status === 'Sick') existing.sakitCount += 1;
      else if (att.status === 'Alpha' || (att.status as string) === 'Alpa' || att.status === 'Unexcused') existing.alpaCount += 1;

      existing.attendanceRecords.push(att);
      map.set(cleanDate, existing);
    });

    // Index cash transactions
    cash.forEach((tx) => {
      if (!tx.tanggal) return;
      const cleanDate = tx.tanggal.slice(0, 10);
      const existing = map.get(cleanDate) || {
        attendanceCount: 0,
        hadirCount: 0,
        izinCount: 0,
        sakitCount: 0,
        alpaCount: 0,
        cashIn: 0,
        cashOut: 0,
        cashTxs: [],
        attendanceRecords: [],
      };

      if (tx.jenis === 'Masuk' || tx.jenis === 'Inflow') {
        existing.cashIn += Number(tx.jumlah) || 0;
      } else {
        existing.cashOut += Number(tx.jumlah) || 0;
      }
      existing.cashTxs.push(tx);
      map.set(cleanDate, existing);
    });

    return map;
  }, [attendance, cash]);

  // Selected Day Details
  const selectedDayData = useMemo(() => {
    return (
      dateDataMap.get(selectedDayStr) || {
        attendanceCount: 0,
        hadirCount: 0,
        izinCount: 0,
        sakitCount: 0,
        alpaCount: 0,
        cashIn: 0,
        cashOut: 0,
        cashTxs: [],
        attendanceRecords: [],
      }
    );
  }, [dateDataMap, selectedDayStr]);

  // Deadlines for selected day
  const selectedDayDeadlines = useMemo(() => {
    return assignmentsByDateMap.get(selectedDayStr) || [];
  }, [assignmentsByDateMap, selectedDayStr]);

  // Announcements for selected day
  const selectedDayAnnouncements = useMemo(() => {
    return announcementsByDateMap.get(selectedDayStr) || [];
  }, [announcementsByDateMap, selectedDayStr]);

  const isSelectedDateWednesday = useMemo(() => {
    return isWednesday(selectedDayStr);
  }, [selectedDayStr]);

  // Search matching dates & items across attendance, cash, assignments, and announcements
  const searchResults = useMemo(() => {
    const q = calendarSearch.toLowerCase().trim();
    if (!q) return { matchingDates: new Set<string>(), count: 0 };

    const matchingDates = new Set<string>();
    let count = 0;

    // Search announcements
    localAnnouncements.forEach((ann) => {
      const title = (ann.title || '').toLowerCase();
      const content = (ann.content || '').toLowerCase();
      const author = (ann.author_name || '').toLowerCase();
      const loc = (ann.location || '').toLowerCase();
      if (title.includes(q) || content.includes(q) || author.includes(q) || loc.includes(q)) {
        if (ann.event_date) matchingDates.add(ann.event_date.slice(0, 10));
        if (ann.created_at) matchingDates.add(ann.created_at.slice(0, 10));
        count++;
      }
    });

    // Search attendance
    attendance.forEach((rec) => {
      const name = (rec.namaAnggota || (rec as any).nama_anggota || '').toLowerCase();
      const nisn = (rec.nisn || '').toLowerCase();
      const date = (rec.tanggal || '').slice(0, 10);
      const status = (rec.status || '').toLowerCase();
      if (name.includes(q) || nisn.includes(q) || date.includes(q) || status.includes(q)) {
        matchingDates.add(date);
        count++;
      }
    });

    // Search cash
    cash.forEach((item) => {
      const name = (item.namaAnggota || (item as any).nama_anggota || item.namaSiswa || '').toLowerCase();
      const ket = (item.keterangan || '').toLowerCase();
      const date = (item.tanggal || '').slice(0, 10);
      const jenis = (item.jenis || '').toLowerCase();
      const amount = String(item.jumlah || '');
      if (name.includes(q) || ket.includes(q) || date.includes(q) || jenis.includes(q) || amount.includes(q)) {
        matchingDates.add(date);
        count++;
      }
    });

    // Search assignment deadlines
    assignments.forEach((assign) => {
      const title = (assign.title || '').toLowerCase();
      const desc = (assign.description || '').toLowerCase();
      const deadline = (assign.deadline || '').toLowerCase();
      if (title.includes(q) || desc.includes(q) || deadline.includes(q)) {
        if (assign.deadline) {
          matchingDates.add(assign.deadline.slice(0, 10));
          count++;
        }
      }
    });

    return { matchingDates, count };
  }, [calendarSearch, attendance, cash, assignments, localAnnouncements]);

  // --------------------------------------------------------------------------
  // Reliable In-App Deletion Execution (Zero window.confirm)
  // --------------------------------------------------------------------------
  const executeDeleteItem = async () => {
    if (!itemToDelete) return;
    if (!canEditCalendar) {
      playWarningBuzzer();
      setToastNotice(isEn ? 'Access denied: Only Administrators can modify calendar schedules and settings.' : 'Akses ditolak: Hanya Administrator yang berwenang mengubah setelan & jadwal kalender.');
      setItemToDelete(null);
      return;
    }
    setIsDeletingItem(true);
    playClickTick();

    const { id, title } = itemToDelete;

    try {
      // Remove deadline from assignment
      const updated = assignments.map((a) => {
        if (a.id === id) {
          return { ...a, deadline: undefined };
        }
        return a;
      });
      localStorage.setItem('robotics_materials_assignments', JSON.stringify(updated));
      setAssignments(updated);

      try {
        const supa = getSupabase();
        await supa.from('materials_assignments').update({ deadline: null }).eq('id', id);
      } catch {}

      playSuccessChime();
      try {
        window.dispatchEvent(new CustomEvent('robotics_assignments_updated'));
      } catch {}

      setToastNotice(isEn ? `Deadline for task "${title}" removed from calendar.` : `Tenggat tugas "${title}" berhasil dihapus dari kalender.`);

      setItemToDelete(null);
      setTimeout(() => setToastNotice(null), 4000);
    } catch (err: any) {
      console.error('Error deleting item from calendar:', err);
      playWarningBuzzer();
      setToastNotice(isEn ? 'Failed to remove item.' : 'Gagal menghapus penanda kalender.');
      setTimeout(() => setToastNotice(null), 4000);
    } finally {
      setIsDeletingItem(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toastNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastNotice(null)}
              className="p-1 hover:bg-emerald-700 rounded transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Month Navigation & Summary matching Canva screenshot 6 */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sky-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-sky-600 border-l-2 border-sky-500 pl-2.5 inline-block mb-1">
              PLAN AHEAD
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Activity Calendar
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Browse the month and choose a date.
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative min-w-[180px] sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={calendarSearch}
                onChange={(e) => setCalendarSearch(e.target.value)}
                placeholder={isEn ? "Search calendar events..." : "Cari kegiatan, tugas, kas..."}
                className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
              />
              {calendarSearch && (
                <button
                  type="button"
                  onClick={() => setCalendarSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title={isEn ? "Clear search" : "Hapus pencarian"}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Today Button */}
            <button
              type="button"
              onClick={handleGoToday}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
              title={isEn ? "Jump directly to Today" : "Loncat ke Hari Ini"}
            >
              {isEn ? 'Today' : 'Hari Ini'}
            </button>

            {/* Month Navigation Prev/Next with Interactive Dropdown */}
            <div className="relative">
              <div className="flex items-center bg-slate-100 rounded-xl border border-slate-200 p-0.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-white transition cursor-pointer"
                  title={isEn ? "Previous Month" : "Bulan Sebelumnya"}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClickTick();
                    setPickerYear(year);
                    setCustomJumpDate(selectedDayStr);
                    setIsDatePickerOpen(!isDatePickerOpen);
                  }}
                  className={`px-3 py-1 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-[145px] text-center select-none ${
                    isDatePickerOpen
                      ? 'bg-white text-blue-600 shadow-2xs ring-2 ring-blue-500/20'
                      : 'text-slate-800 hover:bg-white hover:text-blue-600'
                  }`}
                  title={isEn ? "Click to select month, year, or jump to any date" : "Klik untuk memilih bulan, tahun, atau loncat tanggal"}
                >
                  <span>{calendarMonths[month]} {year}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDatePickerOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
                </button>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-white transition cursor-pointer"
                  title={isEn ? "Next Month" : "Bulan Berikutnya"}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Custom Date Picker Dropdown Popover */}
              <AnimatePresence>
                {isDatePickerOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsDatePickerOpen(false)} 
                      aria-hidden="true" 
                    />

                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-4 space-y-3.5"
                    >
                      {/* Year Stepper */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          {isEn ? 'Quick Date Selector' : 'Pemilih Tanggal Cepat'}
                        </span>
                        
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              playClickTick();
                              setPickerYear((prev) => prev - 1);
                            }}
                            className="p-1 rounded hover:bg-white text-slate-600 hover:text-blue-600 transition cursor-pointer"
                            title={isEn ? "Previous Year" : "Tahun Sebelumnya"}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-xs font-black font-mono text-blue-900 min-w-[50px] text-center">
                            {pickerYear}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              playClickTick();
                              setPickerYear((prev) => prev + 1);
                            }}
                            className="p-1 rounded hover:bg-white text-slate-600 hover:text-blue-600 transition cursor-pointer"
                            title={isEn ? "Next Year" : "Tahun Berikutnya"}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 12-Month Quick Select Grid */}
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          {isEn ? 'Jump To Month:' : 'Pilih Bulan:'}
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {calendarMonths.map((mName, mIdx) => {
                            const isCurrentViewMonth = year === pickerYear && month === mIdx;
                            return (
                              <button
                                key={mName}
                                type="button"
                                onClick={() => handleSelectMonth(mIdx)}
                                className={`py-2 px-1 text-xs rounded-xl font-bold transition cursor-pointer relative text-center active:scale-95 ${
                                  isCurrentViewMonth
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200'
                                }`}
                              >
                                {mName.slice(0, 3)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Direct Date Jump */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {isEn ? 'Jump to Specific Date:' : 'Loncat ke Tanggal Tertentu:'}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={customJumpDate}
                            onChange={(e) => setCustomJumpDate(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => handleJumpToCustomDate(customJumpDate)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer active:scale-95"
                          >
                            {isEn ? 'Go' : 'Buka'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Month Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'Robotics Sessions' : 'Sesi Robotik (Rabu)'}
              </span>
              <span className="text-base font-extrabold text-blue-700">
                {calendarGrid.filter(c => c.isCurrentMonth && c.isWednesday).length} {isEn ? 'Days' : 'Hari'}
              </span>
            </div>
            <Bot className="w-5 h-5 text-blue-600" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'Announcements' : 'Pengumuman'}
              </span>
              <span className="text-base font-extrabold text-amber-700">
                {monthAnnouncementsCount} {isEn ? 'Notices' : 'Info'}
              </span>
            </div>
            <Megaphone className="w-5 h-5 text-amber-600" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'Active Deadlines' : 'Tenggat Tugas'}
              </span>
              <span className="text-base font-extrabold text-purple-700">
                {assignments.filter(a => a.deadline && a.deadline.startsWith(currentMonthKey)).length} {isEn ? 'Tasks' : 'Tugas'}
              </span>
            </div>
            <Pin className="w-5 h-5 text-purple-600" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'Attendance Meetings' : 'Presensi Tercatat'}
              </span>
              <span className="text-base font-extrabold text-emerald-700">
                {Array.from(dateDataMap.entries()).filter(([k, v]) => k.startsWith(currentMonthKey) && v.attendanceCount > 0).length} {isEn ? 'Dates' : 'Pertemuan'}
              </span>
            </div>
            <Users className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isEn ? 'Treasury Activity' : 'Aktivitas Kas'}
              </span>
              <span className="text-base font-extrabold text-blue-700">
                {Array.from(dateDataMap.entries()).filter(([k, v]) => k.startsWith(currentMonthKey) && (v.cashIn > 0 || v.cashOut > 0)).length} {isEn ? 'Dates' : 'Transaksi'}
              </span>
            </div>
            <Wallet className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Main Split: Calendar Grid (Left/Top) & Date Detail Inspector (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Calendar Grid (8 cols) */}
        <div className="lg:col-span-8 bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sky-100 shadow-sm space-y-3">
          
          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
            {dayHeaders.map((dh) => (
              <div
                key={dh.key}
                className={`py-1.5 px-1 text-xs font-extrabold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 ${
                  dh.key === 'sun' 
                    ? 'text-rose-600 bg-rose-50/70 border border-rose-100' 
                    : dh.isRoboticsDay 
                    ? 'text-indigo-700 bg-indigo-50 border border-indigo-200 shadow-2xs font-black' 
                    : 'text-slate-600 bg-slate-100/70 border border-slate-200/60'
                }`}
                title={dh.isRoboticsDay ? (isEn ? 'Weekly Robotics Club Session (15:30 - 17:30 WIB)' : 'Sesi Mingguan Klub Robotik (15:30 - 17:30 WIB)') : dh.full}
              >
                {dh.isRoboticsDay && <Bot className="w-3 h-3 text-indigo-600 shrink-0" />}
                <span>{dh.label}</span>
                {dh.isRoboticsDay && <span className="hidden sm:inline text-[9px] text-indigo-600 font-bold lowercase">({isEn ? 'club' : 'robotik'})</span>}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarGrid.map((cell, idx) => {
              const data = dateDataMap.get(cell.dateStr);
              const isSelected = cell.dateStr === selectedDayStr;
              const isSearchMatch = searchResults.matchingDates.has(cell.dateStr);
              const hasAttendance = data && data.attendanceCount > 0;
              const hasCash = data && (data.cashIn > 0 || data.cashOut > 0);
              
              const dayDeadlines = assignmentsByDateMap.get(cell.dateStr) || [];
              const hasDeadlines = dayDeadlines.length > 0;

              const dayAnnouncements = announcementsByDateMap.get(cell.dateStr) || [];
              const hasAnnouncements = dayAnnouncements.length > 0;

              return (
                <button
                  key={`${cell.dateStr}-${idx}`}
                  type="button"
                  onClick={() => {
                    playClickTick();
                    setSelectedDayStr(cell.dateStr);
                  }}
                  className={`min-h-[84px] sm:min-h-[102px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition relative cursor-pointer group ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-600 ring-2 ring-indigo-600/30 shadow-xs'
                      : isSearchMatch
                      ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/40 shadow-xs'
                      : cell.isToday
                      ? 'bg-amber-50/40 border-amber-300 hover:border-amber-400'
                      : cell.isWednesday && cell.isCurrentMonth
                      ? 'bg-blue-50/30 border-blue-200 hover:border-indigo-400 hover:bg-blue-50/60'
                      : cell.isCurrentMonth
                      ? 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                      : 'bg-slate-50/40 border-slate-100 text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {/* Day Number and Today / Wednesday / Match Badges */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          isSelected
                            ? 'text-indigo-700 font-extrabold'
                            : isSearchMatch
                            ? 'text-amber-900 font-extrabold'
                            : cell.isToday
                            ? 'text-amber-800 font-black'
                            : cell.isWednesday && cell.isCurrentMonth
                            ? 'text-indigo-800 font-extrabold'
                            : cell.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {cell.day}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isSearchMatch && !cell.isToday && (
                        <span className="text-[8px] font-black bg-amber-500 text-white px-1 py-0.2 rounded leading-tight">
                          Match
                        </span>
                      )}

                      {cell.isToday && (
                        <span className="text-[8px] sm:text-[9px] font-extrabold bg-amber-500 text-white px-1.5 py-0.2 rounded-md leading-tight shadow-2xs">
                          Today
                        </span>
                      )}

                      {cell.isWednesday && cell.isCurrentMonth && !cell.isToday && (
                        <span 
                          className="w-4 h-4 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]"
                          title="Weekly Robotics Club Day"
                        >
                          🤖
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day Activity Indicators */}
                  <div className="space-y-1 mt-1 w-full">
                    {/* 1. Automated Wednesday Robotics Schedule Marker */}
                    {cell.isWednesday && cell.isCurrentMonth && (
                      <div 
                        className="flex items-center gap-1 bg-indigo-100/90 border border-indigo-200 text-indigo-800 px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-bold truncate shadow-2xs"
                        title="Robotics Club Session (15:30 - 17:30 WIB)"
                      >
                        <Bot className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-600 shrink-0" />
                        <span className="truncate">Sesi Robotik</span>
                      </div>
                    )}

                    {/* 2. Official Announcements Marker */}
                    {hasAnnouncements && (
                      <div 
                        className="flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-900 px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-bold truncate shadow-2xs"
                        title={`${dayAnnouncements.length} Pengumuman: ${dayAnnouncements.map(a => a.title).join(', ')}`}
                      >
                        <Megaphone className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-700 shrink-0" />
                        <span className="truncate">
                          {dayAnnouncements.length === 1 ? dayAnnouncements[0].title : `${dayAnnouncements.length} Info`}
                        </span>
                      </div>
                    )}

                    {/* 3. Assignment Deadlines Marker */}
                    {hasDeadlines && (
                      <div 
                        className="flex items-center gap-1 bg-purple-100 border border-purple-300 text-purple-900 px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-bold truncate shadow-2xs"
                        title={`${dayDeadlines.length} Tugas: ${dayDeadlines.map(d => d.title).join(', ')}`}
                      >
                        <Pin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-700 shrink-0" />
                        <span className="truncate">
                          {dayDeadlines.length === 1 ? dayDeadlines[0].title : `${dayDeadlines.length} Tugas`}
                        </span>
                      </div>
                    )}

                    {/* 4. Attendance Status Indicator */}
                    {hasAttendance && (
                      <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-bold text-emerald-800 truncate shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate">{data.hadirCount} Hadir</span>
                      </div>
                    )}

                    {/* 5. Cash In/Out Indicator */}
                    {hasCash && (
                      <div className={`flex items-center gap-1 px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-bold truncate border shadow-2xs ${
                        data.cashIn > 0 
                          ? 'bg-blue-50 text-blue-800 border-blue-200' 
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${data.cashIn > 0 ? 'bg-blue-600' : 'bg-rose-500'}`} />
                        <span className="truncate">
                          {data.cashIn > 0 ? `+${data.cashIn / 1000}k` : `-${data.cashOut / 1000}k`}
                        </span>
                      </div>
                    )}

                    {!cell.isWednesday && !hasAttendance && !hasDeadlines && !hasAnnouncements && !hasCash && cell.isCurrentMonth && (
                      <div className="h-3" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] text-slate-500 border-t border-slate-100">
            <span className="font-bold text-slate-700">{isEn ? 'Legend:' : 'Keterangan:'}</span>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold flex items-center gap-1 text-[10px]">
                <Bot className="w-3 h-3 text-indigo-600" />
                <span>{isEn ? 'Robotics Club (Wednesdays)' : 'Sesi Robotik (Setiap Rabu)'}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold flex items-center gap-1 text-[10px]">
                <Megaphone className="w-3 h-3 text-amber-700" />
                <span>{isEn ? 'Official Announcement' : 'Pengumuman / Agenda'}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold flex items-center gap-1 text-[10px]">
                <Pin className="w-3 h-3 text-purple-700" />
                <span>{isEn ? 'Assignment Deadline' : 'Tenggat Tugas'}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>{isEn ? 'Recorded Attendance' : 'Presensi Tercatat'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
              <span>{isEn ? 'Treasury' : 'Kas Masuk / Keluar'}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Selected Day Inspector */}
        <div className="lg:col-span-4 bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sky-100 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            {/* Header Selected Date */}
            <div className="pb-3 border-b border-slate-100">
              <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{isEn ? 'Selected Date Details:' : 'Rincian Tanggal Terpilih:'}</span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mt-1">
                {formatIndonesianDate(selectedDayStr)}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedDayStr}</p>
            </div>

            {/* 1. Automated Wednesday Robotics Schedule Box */}
            {isSelectedDateWednesday && (
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50 via-blue-50/70 to-indigo-50 border border-indigo-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{isEn ? 'Weekly Robotics Club Session' : 'Sesi Mingguan Klub Robotik'}</span>
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs">
                    {isEn ? 'Every Wednesday' : 'Setiap Rabu'}
                  </span>
                </div>
                <div className="text-xs text-indigo-950 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-900">
                    <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>15:30 - 17:30 WIB</span>
                  </div>
                  <div className="text-[11px] text-indigo-800 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{isEn ? 'Computer & Robotics Lab (MAN 2 Kota Bekasi)' : 'Laboratorium Komputer & Robotik (MAN 2 Kota Bekasi)'}</span>
                  </div>
                  <p className="text-[10px] text-indigo-700/90 leading-relaxed pt-0.5">
                    {isEn 
                      ? 'Agenda: Mechanical assembly, microcontroller programming (Arduino & ESP32), sensor calibration, and competition prep.'
                      : 'Agenda: Perakitan mekanik, pemrograman mikrokontroler sensor Arduino/ESP32, dan persiapan kompetisi.'}
                  </p>
                </div>
              </div>
            )}

            {/* 2. Official Announcements & Notice Box for this Date */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{isEn ? 'Announcements & Club Notice' : 'Pengumuman & Agenda Terkait'}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    {selectedDayAnnouncements.length} {isEn ? 'Notice' : 'Info'}
                  </span>
                  {onOpenAnnouncementsModal && (
                    <button
                      type="button"
                      onClick={() => {
                        playClickTick();
                        onOpenAnnouncementsModal();
                      }}
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-bold px-1.5 py-0.5 rounded hover:bg-amber-100 transition cursor-pointer"
                      title={isEn ? "Open Announcement Center" : "Buka Pusat Pengumuman"}
                    >
                      {canPostAnnouncements ? (isEn ? '+ Post' : '+ Buat') : (isEn ? 'View All' : 'Lihat Semua')}
                    </button>
                  )}
                </div>
              </div>

              {selectedDayAnnouncements.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {selectedDayAnnouncements.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-2.5 rounded-xl bg-white border border-amber-200/90 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {ann.title}
                          </span>
                          <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line mt-0.5">
                            {ann.content}
                          </p>
                        </div>
                        {ann.target_role && ann.target_role !== 'all' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 shrink-0 capitalize">
                            {ann.target_role}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500 gap-1">
                        <span className="font-semibold text-slate-700">
                          {ann.author_name || (isEn ? 'Robotics Officer' : 'Pengurus Robotik')}
                        </span>
                        {ann.location && (
                          <span className="flex items-center gap-0.5 text-amber-800 font-medium">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate max-w-[120px]">{ann.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-amber-900/70">
                  <p className="italic text-[11px]">
                    {isEn ? 'No announcements scheduled on this date.' : 'Tidak ada agenda pengumuman pada tanggal ini.'}
                  </p>
                </div>
              )}
            </div>

            {/* 3. Task Deadlines Box (Synced with Assignments) */}
            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <Pin className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>{isEn ? 'Assignment Deadlines on this Date' : 'Tenggat Tugas pada Tanggal Ini'}</span>
                </span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  {selectedDayDeadlines.length} {isEn ? 'Deadlines' : 'Tenggat'}
                </span>
              </div>

              {selectedDayDeadlines.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {selectedDayDeadlines.map((task) => {
                    const timeStr = task.deadline?.includes('T') ? task.deadline.split('T')[1].slice(0, 5) : '23:59';
                    return (
                      <div
                        key={task.id}
                        className="p-2.5 rounded-xl bg-white border border-purple-200 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-900 block truncate">
                              {task.title}
                            </span>
                            {task.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200 shrink-0">
                            {timeStr} WIB
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                          <span className="text-slate-500">
                            {isEn ? 'Max Score:' : 'Bobot:'} <strong className="text-slate-800">{task.max_score || 100} poin</strong>
                          </span>
                          <div className="flex items-center gap-1">
                            {onNavigateToAssignments && (
                              <button
                                type="button"
                                onClick={onNavigateToAssignments}
                                className="px-2 py-0.5 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded font-semibold transition cursor-pointer"
                                title={isEn ? "Open in Tasks tab" : "Buka di Tab Tugas"}
                              >
                                {isEn ? 'View' : 'Lihat'}
                              </button>
                            )}
                            {canEditCalendar && (
                              <button
                                type="button"
                                onClick={() => {
                                  playClickTick();
                                  setItemToDelete({
                                    type: 'assignment_deadline',
                                    id: task.id,
                                    title: task.title,
                                    dateStr: selectedDayStr,
                                  });
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                title={isEn ? "Remove deadline from calendar (Admin only)" : "Hapus tenggat tugas dari kalender (Khusus Admin)"}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-purple-900/70">
                  <p className="italic text-[11px]">
                    {isEn ? 'No assignment deadlines scheduled on this date.' : 'Tidak ada tenggat tugas terjadwal pada tanggal ini.'}
                  </p>
                </div>
              )}
            </div>

            {/* 4. Attendance Box for this Date */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  {isEn ? 'Attendance Summary' : 'Ringkasan Presensi'}
                </span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {selectedDayData.attendanceCount} {isEn ? 'Members' : 'Siswa'}
                </span>
              </div>

              {selectedDayData.attendanceCount > 0 ? (
                <div className="grid grid-cols-4 gap-1.5 text-center pt-1">
                  <div className="bg-emerald-100/70 p-1.5 rounded-lg border border-emerald-200">
                    <div className="text-[10px] font-bold text-emerald-800">{isEn ? 'Present' : 'Hadir'}</div>
                    <div className="text-sm font-extrabold text-emerald-900">{selectedDayData.hadirCount}</div>
                  </div>
                  <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-200">
                    <div className="text-[10px] font-bold text-blue-800">{isEn ? 'Excused' : 'Izin'}</div>
                    <div className="text-sm font-extrabold text-blue-900">{selectedDayData.izinCount}</div>
                  </div>
                  <div className="bg-amber-100/70 p-1.5 rounded-lg border border-amber-200">
                    <div className="text-[10px] font-bold text-amber-800">{isEn ? 'Sick' : 'Sakit'}</div>
                    <div className="text-sm font-extrabold text-amber-900">{selectedDayData.sakitCount}</div>
                  </div>
                  <div className="bg-rose-100/70 p-1.5 rounded-lg border border-rose-200">
                    <div className="text-[10px] font-bold text-rose-800">{isEn ? 'Absent' : 'Alpha'}</div>
                    <div className="text-sm font-extrabold text-rose-900">{selectedDayData.alpaCount}</div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  {isEn ? 'No attendance recorded on this date.' : 'Belum ada presensi tercatat pada tanggal ini.'}
                </p>
              )}

              {onNavigateToAttendanceDate && (
                <button
                  type="button"
                  onClick={() => onNavigateToAttendanceDate(selectedDayStr)}
                  className="w-full mt-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Record / Open Attendance for Date' : 'Buka Presensi Tanggal Ini'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 5. Cash Box for this Date */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-indigo-600" />
                  {isEn ? 'Treasury on this Date' : 'Kas pada Tanggal Ini'}
                </span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                  {selectedDayData.cashTxs.length} {isEn ? 'Transactions' : 'Transaksi'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-500">{isEn ? 'Inflow' : 'Pemasukan'}</div>
                  <div className="text-xs sm:text-sm font-extrabold text-emerald-700">
                    {formatRupiah(selectedDayData.cashIn)}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-500">{isEn ? 'Outflow' : 'Pengeluaran'}</div>
                  <div className="text-xs sm:text-sm font-extrabold text-rose-700">
                    {formatRupiah(selectedDayData.cashOut)}
                  </div>
                </div>
              </div>

              {selectedDayData.cashTxs.length > 0 && (
                <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {selectedDayData.cashTxs.map((tx, i) => (
                    <div
                      key={tx.id || i}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-[11px]"
                    >
                      <div className="truncate max-w-[140px]">
                        <span className="font-bold text-slate-800 block truncate">
                          {tx.namaAnggota || tx.namaSiswa || tx.keterangan || (isEn ? 'Transaction' : 'Transaksi')}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">{tx.keterangan}</span>
                      </div>
                      <span
                        className={`font-extrabold whitespace-nowrap ${
                          tx.jenis === 'Masuk' || tx.jenis === 'Inflow' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {tx.jenis === 'Masuk' || tx.jenis === 'Inflow' ? '+' : '-'}
                        {formatRupiah(tx.jumlah)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {onNavigateToCashMonth && (
                <button
                  type="button"
                  onClick={() => onNavigateToCashMonth(selectedDayStr.slice(0, 7))}
                  className="w-full mt-1.5 py-1.5 px-3 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <span>{isEn ? `Open Treasury for ${calendarMonths[month]}` : `Buka Kas Bulan ${calendarMonths[month]}`}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* Reliable In-App Confirmation Modal (Zero window.confirm, 100% Reliable)     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 border border-slate-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shadow-2xs">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isEn ? 'Remove Deadline from Calendar?' : 'Hapus Tenggat Tugas dari Kalender?'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEn ? 'The deadline marker will be removed from this date.' : 'Penanda batas waktu tugas akan dihapus dari tanggal ini.'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isEn ? 'Target Assignment:' : 'Judul Tugas:'}
                </span>
                <p className="font-bold text-slate-800">{itemToDelete.title}</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeletingItem}
                  onClick={() => setItemToDelete(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Batal'}
                </button>
                <button
                  type="button"
                  disabled={isDeletingItem}
                  onClick={executeDeleteItem}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isDeletingItem ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{isEn ? 'Deleting...' : 'Menghapus...'}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Confirm Delete' : 'Ya, Hapus Penanda'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
