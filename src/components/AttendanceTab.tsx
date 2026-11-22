import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  Printer,
  History,
  CheckCheck,
  RotateCcw,
  Sparkles,
  Users,
  Trash2,
  X,
  FileText,
  RefreshCw,
  Upload,
  ShieldAlert,
  Clock,
  Timer,
  ShieldCheck,
  UserCheck,
  Sliders,
  MoreHorizontal,
  UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, AttendanceRecord, AttendanceStatus } from '../types';
import { exportToCsv, formatIndonesianDate } from '../utils/formatters';
import { exportDailyAttendancePdf, exportAttendanceHistoryPdf } from '../utils/pdfExport';
import { normalizeGrade, formatFullClass } from './MembersTab';
import { triggerCelebration, playClickTick, playSuccessChime } from '../utils/audioFeedback';
import { UniversalDataUploadModal } from './UniversalDataUploadModal';
import { smartFilter } from '../utils/smartSearch';
import { AttendanceRiskModal } from './AttendanceRiskModal';
import { 
  hasPermission, 
  hasSessionPermission, 
  getRoleMetadata, 
  canConfigureCalendar, 
  canManageGroupAttendance, 
  formatTitleLabel,
  getCanonicalRole 
} from '../utils/rbac';
import { MemberAttendanceView } from './MemberAttendanceView';
import { 
  checkAttendanceSchedule, 
  isBypassScheduleEnabled, 
  setBypassScheduleEnabled 
} from '../utils/attendanceWindow';
import { useLanguage } from '../utils/i18n';
import { UserSession } from '../types';

interface AttendanceTabProps {
  members: Member[];
  attendance: AttendanceRecord[];
  activeDate?: string;
  initialSearchTerm?: string;
  onAddAttendance: (record: Omit<AttendanceRecord, 'id'>) => Promise<void>;
  onBulkAttendance?: (records: Omit<AttendanceRecord, 'id'>[]) => Promise<void>;
  onDeleteAttendance: (id: string, index?: number, record?: AttendanceRecord) => Promise<void> | void;
  onResetMemberAttendance?: (tanggal: string, member: Member) => Promise<void> | void;
  onResetDateAttendance?: (tanggal: string) => Promise<void> | void;
  onResetAllAttendance?: () => Promise<void> | void;
  isSubmitting: boolean;
  onRefreshData?: () => Promise<void> | void;
  isSyncing?: boolean;
  onAttendanceUpdated?: (updated: AttendanceRecord[]) => void;
  isDemo?: boolean;
  currentUserRole?: string;
  session?: UserSession | null;
  onOpenScheduleConfig?: () => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  members,
  attendance,
  activeDate,
  initialSearchTerm,
  onAddAttendance,
  onBulkAttendance,
  onDeleteAttendance,
  onResetMemberAttendance,
  onResetDateAttendance,
  onResetAllAttendance,
  isSubmitting,
  onRefreshData,
  isSyncing = false,
  onAttendanceUpdated,
  isDemo = false,
  currentUserRole,
  session,
  onOpenScheduleConfig,
}) => {
  const { language, t } = useLanguage();
  const isEn = language === 'en';

  // RBAC Permission checks: Strictly separate group attendance management from treasurer/members
  const canManageGroup = canManageGroupAttendance(session);
  const canInputAttendance = canManageGroup;
  const canResetAttendance = session ? hasSessionPermission(session, 'attendance:reset') : hasPermission(currentUserRole, 'attendance:reset');
  const roleMeta = getRoleMetadata(currentUserRole);

  const cleanRole = (session?.role || '').toLowerCase().trim();
  const cleanTitle = (session?.jabatan || '').toLowerCase().trim();
  const cleanUser = (session?.username || '').toLowerCase().trim();
  const isTreasurer = cleanTitle === 'treasurer' || cleanTitle === 'bendahara' || cleanRole === 'bendahara' || cleanUser === 'bendahara';
  const isAdvisor = 
    cleanRole === 'advisor' || 
    cleanRole === 'pembina' || 
    cleanTitle === 'advisor' || 
    cleanTitle === 'pembina' || 
    cleanUser === 'pembina' || 
    cleanUser === 'demo_pembina' ||
    (session ? getCanonicalRole(session) === 'advisor' : false);

  const isAdmin = 
    cleanRole === 'admin' || 
    cleanRole === 'administrator' || 
    cleanTitle === 'admin' || 
    cleanTitle === 'administrator' || 
    cleanUser === 'admin' || 
    cleanUser === 'demo_admin' ||
    cleanUser === 'roboman2' ||
    (session ? getCanonicalRole(session) === 'admin' : false);

  // Admin and Advisor are supervisors/administrators and are exempt from taking attendance
  const isStaffExemptFromAttendance = isAdmin || isAdvisor;

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(activeDate || todayStr);
  const [searchMember, setSearchMember] = useState(initialSearchTerm || '');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  
  // Executive Board / Staff defaults: Admin & Advisor default to 'daily' (exempt from self check-in), Treasurer defaults to 'self'
  const [viewSubTab, setViewSubTab] = useState<'self' | 'daily' | 'history'>(() => {
    if (isStaffExemptFromAttendance) return 'daily';
    return isTreasurer ? 'self' : 'daily';
  });

  React.useEffect(() => {
    if (isStaffExemptFromAttendance && viewSubTab === 'self') {
      setViewSubTab('daily');
    }
  }, [isStaffExemptFromAttendance, viewSubTab]);

  const [historySearch, setHistorySearch] = useState(initialSearchTerm || '');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('ALL');
  const [resetConfirmOpen, setResetConfirmOpen] = useState<boolean>(false);
  const [resetAllHistoryConfirmOpen, setResetAllHistoryConfirmOpen] = useState<boolean>(false);
  const [resetAllConfirmationInput, setResetAllConfirmationInput] = useState<string>('');
  const [attendanceToDelete, setAttendanceToDelete] = useState<AttendanceRecord | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const exportMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resolve the current logged-in officer as an active club member for self check-in
  const currentOfficerMember = useMemo(() => {
    if (!session) return null;
    const found = members.find(
      (m) =>
        (session.nisn && m.nisn === session.nisn) ||
        (session.nis && m.nisn === session.nis) ||
        (session.email && m.email && m.email.toLowerCase() === session.email.toLowerCase()) ||
        (m.fullName && session.name && m.fullName.toLowerCase() === session.name.toLowerCase()) ||
        (m.email && session.username && m.email.toLowerCase().includes(session.username.toLowerCase()))
    );
    if (found) return found;

    const execId = `EX-${(session.username || 'OFFICER').toUpperCase()}`;
    const fallback: Member = {
      id_member: session.studentId || execId,
      timestamp: new Date().toISOString(),
      email: session.email || `${session.username || 'officer'}@man2kotabekasi.sch.id`,
      fullName: session.name || session.username || 'Pengurus Ekskul',
      full_name: session.name || session.username || 'Pengurus Ekskul',
      grade: 'XI',
      classRoom: 'XI-A',
      gender: 'Laki-laki',
      nisn: session.nisn || `00${Math.abs((session.username || 'officer').split('').reduce((acc, c) => acc + c.charCodeAt(0), 1000))}`,
      nik: '3275000000000000',
      address: 'Kota Bekasi',
      personalPhone: session.noHp || '081200000000',
      parentPhone: session.kontakDarurat || '081200000001',
      role: session.role || 'bph',
      jabatan: session.jabatan || session.role || 'Pengurus',
      status: 'Active',
      isVerified: true
    };
    return fallback;
  }, [session, members]);

  // Check today's attendance record for the current officer
  const currentOfficerTodayAttendance = useMemo(() => {
    if (!session) return null;
    const targetDate = String(selectedDate || new Date().toISOString().split('T')[0]).slice(0, 10).trim();
    const nisn = session.nisn || currentOfficerMember?.nisn || '';
    const name = session.name || session.username || '';
    return attendance.find((a) => {
      const aDate = String(a.tanggal || '').slice(0, 10).trim();
      if (aDate !== targetDate) return false;
      if (nisn && a.nisn && a.nisn === nisn) return true;
      if (name && a.namaAnggota && a.namaAnggota.toLowerCase() === name.toLowerCase()) return true;
      return false;
    }) || null;
  }, [attendance, selectedDate, session, currentOfficerMember]);

  // Jadwal Presensi Mandiri Siswa
  const [bypassSchedule, setBypassSchedule] = useState<boolean>(() => isBypassScheduleEnabled(session));
  const [scheduleTick, setScheduleTick] = useState<number>(0);

  React.useEffect(() => {
    const handleBypassChange = (e: CustomEvent<boolean>) => {
      setBypassSchedule(e.detail);
    };
    const handleScheduleChange = () => {
      setScheduleTick((v) => v + 1);
    };
    window.addEventListener('robotics-attendance-bypass-change' as any, handleBypassChange);
    window.addEventListener('robotics-attendance-schedule-change' as any, handleScheduleChange);
    return () => {
      window.removeEventListener('robotics-attendance-bypass-change' as any, handleBypassChange);
      window.removeEventListener('robotics-attendance-schedule-change' as any, handleScheduleChange);
    };
  }, []);

  const attendanceSchedule = useMemo(() => {
    return checkAttendanceSchedule(new Date(), bypassSchedule, undefined, isEn ? 'en' : 'id');
  }, [bypassSchedule, scheduleTick, isEn]);

  const handleOpenResetModal = () => {
    playClickTick();
    setResetConfirmOpen(true);
  };

  const handleConfirmReset = async () => {
    setResetConfirmOpen(false);
    if (onResetDateAttendance) {
      await onResetDateAttendance(selectedDate);
    }
  };

  React.useEffect(() => {
    if (initialSearchTerm !== undefined) {
      setSearchMember(initialSearchTerm);
      setHistorySearch(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  const handleToggleStatusFilter = (status: string) => {
    playClickTick();
    if (status === 'Kehadiran' || status === 'Attendance Rate' || status === 'ALL') {
      setFilterStatus('ALL');
      return;
    }
    setFilterStatus((prev) => (prev === status ? 'ALL' : status));
  };

  // Step Date forward or backward
  const handleDateOffset = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Helper string normalizers
  const normStr = (str?: string) => (str || '').trim().toLowerCase();
  const normDate = (d?: string) => (d || '').slice(0, 10).trim();

  // Map of selected date's attendance: Map<string, AttendanceStatus>
  const dayAttendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    const curDate = normDate(selectedDate);

    attendance.forEach((rec) => {
      if (normDate(rec.tanggal) === curDate) {
        const recNisn = (rec.nisn || '').trim();
        const recName = normStr(rec.namaAnggota);

        if (recNisn && recNisn !== '-') {
          map.set(`nisn:${recNisn}`, rec.status);
        }
        if (recName) {
          map.set(`name:${recName}`, rec.status);
        }
      }
    });
    return map;
  }, [attendance, selectedDate]);

  // Helper to retrieve status for any member reliably
  const getMemberStatus = (m: Member): AttendanceStatus | undefined => {
    const mNisn = (m.nisn || '').trim();
    const mName = normStr(m.fullName);
    if (mNisn && mNisn !== '-' && dayAttendanceMap.has(`nisn:${mNisn}`)) {
      return dayAttendanceMap.get(`nisn:${mNisn}`);
    }
    if (mName && dayAttendanceMap.has(`name:${mName}`)) {
      return dayAttendanceMap.get(`name:${mName}`);
    }
    return undefined;
  };

  // Check if a member in the roster is an Admin or Advisor (exempt from student attendance)
  const isMemberExemptFromAttendance = (m: Member): boolean => {
    const role = (m.role || '').toLowerCase().trim();
    const jabatan = (m.jabatan || '').toLowerCase().trim();
    const grade = (m.grade || '').toLowerCase().trim();
    const classRoom = (m.classRoom || '').toLowerCase().trim();
    const email = (m.email || '').toLowerCase().trim();
    const fullName = (m.fullName || (m as any).full_name || '').toLowerCase().trim();

    // 1. Advisor / Pembina / Faculty
    if (
      role === 'pembina' || 
      role === 'advisor' || 
      jabatan === 'advisor' || 
      jabatan === 'pembina' || 
      grade === 'faculty' || 
      classRoom.toLowerCase() === 'advisor' ||
      classRoom.toLowerCase().includes('pembina') ||
      email.startsWith('pembina@') ||
      fullName.includes('ahmad fauzi') ||
      fullName.includes('pembina')
    ) {
      return true;
    }

    // 2. Administrator (System/Staff level)
    if (
      (role === 'admin' && (jabatan === 'admin' || jabatan === 'administrator' || grade === 'faculty' || email.startsWith('admin@') || fullName.includes('admin'))) ||
      jabatan === 'admin' ||
      jabatan === 'administrator' ||
      email === 'admin@man2kotabekasi.sch.id'
    ) {
      return true;
    }

    return false;
  };

  // Only student members are required to attend; Admin & Advisor are exempt
  const attendanceEligibleMembers = useMemo(() => {
    return members.filter((m) => !isMemberExemptFromAttendance(m));
  }, [members]);

  // Statistics for selected date (strictly counting students subject to attendance)
  const stats = useMemo(() => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpha = 0;
    let belumAbsen = 0;

    attendanceEligibleMembers.forEach((m) => {
      const st = getMemberStatus(m);
      if (st === 'Hadir') hadir++;
      else if (st === 'Izin') izin++;
      else if (st === 'Sakit') sakit++;
      else if (st === 'Alpha') alpha++;
      else belumAbsen++;
    });

    const total = attendanceEligibleMembers.length;
    const persentaseHadir = total > 0 ? Math.round((hadir / total) * 100) : 0;

    return { hadir, izin, sakit, alpha, belumAbsen, total, persentaseHadir };
  }, [attendanceEligibleMembers, dayAttendanceMap]);

  // Filtered members for daily attendance with Smart Search (Multi-Token & Typo Tolerance)
  const filteredMembers = useMemo(() => {
    const dropdownFiltered = attendanceEligibleMembers.filter((m) => {
      const rawStatus = getMemberStatus(m);
      const activeStatus = rawStatus || 'Unrecorded';

      const matchGrade =
        filterGrade === 'ALL' ||
        normalizeGrade(m.grade) === normalizeGrade(filterGrade) ||
        m.grade === filterGrade;

      const matchStatus = 
        filterStatus === 'ALL' || 
        activeStatus === filterStatus ||
        (filterStatus === 'Unrecorded' && (!rawStatus || (rawStatus as string) === 'Belum Absen')) ||
        (filterStatus === 'Present' && (rawStatus === 'Present' || rawStatus === 'Hadir')) ||
        (filterStatus === 'Permitted' && ((rawStatus as string) === 'Permitted' || rawStatus === 'Excused' || rawStatus === 'Izin')) ||
        (filterStatus === 'Sick' && (rawStatus === 'Sick' || rawStatus === 'Sakit')) ||
        (filterStatus === 'Absent' && ((rawStatus as string) === 'Absent' || rawStatus === 'Unexcused' || rawStatus === 'Alpha'));

      return matchGrade && matchStatus;
    });

    if (!searchMember.trim()) {
      return dropdownFiltered;
    }

    return smartFilter(dropdownFiltered, searchMember, (m) => {
      const rawStatus = getMemberStatus(m);
      const activeStatus = rawStatus || 'Belum Absen Unrecorded';
      return [
        m.fullName,
        (m as any).full_name,
        m.nisn,
        m.classRoom,
        m.grade,
        formatFullClass(m.grade, m.classRoom),
        activeStatus,
      ];
    });
  }, [attendanceEligibleMembers, searchMember, filterGrade, filterStatus, dayAttendanceMap]);

  // Filtered attendance records for history tab with Smart Search
  const filteredHistory = useMemo(() => {
    const statusFiltered = attendance.filter((rec) => {
      return historyStatusFilter === 'ALL' || rec.status === historyStatusFilter;
    });

    const searchFiltered = !historySearch.trim()
      ? statusFiltered
      : smartFilter(statusFiltered, historySearch, (rec) => [
          rec.namaAnggota,
          (rec as any).nama_anggota,
          rec.nisn,
          rec.tanggal,
          rec.status,
          rec.notes,
        ]);

    return searchFiltered.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [attendance, historySearch, historyStatusFilter]);

  // Status changer for single member with instant synchronous execution & audio feedback
  const handleStatusChange = (member: Member, status: AttendanceStatus) => {
    if (!canManageGroup) return;
    playSuccessChime();
    onAddAttendance({
      tanggal: normDate(selectedDate),
      nisn: (member.nisn || '').trim(),
      namaAnggota: (member.fullName || '').trim(),
      status: status,
    });
  };

  // Bulk mark all eligible students as Hadir with celebratory effects (Admin & Advisor exempt)
  const handleMarkAllHadir = async () => {
    if (!canManageGroup || attendanceEligibleMembers.length === 0) return;
    triggerCelebration(['#10B981', '#4338CA', '#38BDF8', '#F59E0B']);
    const records = attendanceEligibleMembers.map((m) => ({
      tanggal: selectedDate,
      nisn: m.nisn,
      namaAnggota: m.fullName,
      status: 'Hadir' as AttendanceStatus,
    }));

    if (onBulkAttendance) {
      await onBulkAttendance(records);
    } else {
      for (const r of records) {
        await onAddAttendance(r);
      }
    }
  };

  const handleExportCsv = () => {
    if (viewSubTab === 'daily') {
      const recordsToExport = attendance.filter((a) => a.tanggal === selectedDate);
      exportToCsv(`attendance_robotic_man_2_kota_bekasi_${selectedDate}.csv`, recordsToExport);
    } else {
      exportToCsv(`all_attendance_history_robotic_man_2_kota_bekasi.csv`, filteredHistory);
    }
  };

  const handleExportPdf = () => {
    if (viewSubTab === 'daily') {
      exportDailyAttendancePdf({
        dateStr: selectedDate,
        members: attendanceEligibleMembers,
        attendanceRecords: attendance,
      });
    } else {
      exportAttendanceHistoryPdf({
        title: 'MEMBER ATTENDANCE RECAPITULATION & HISTORY',
        subtitle: historyStatusFilter !== 'ALL' ? `Status Filter: ${historyStatusFilter}` : '',
        records: filteredHistory,
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-4 w-full"
    >
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isEn ? 'Attendance' : 'Presensi'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEn ? 'Record and monitor session attendance.' : 'Pencatatan dan pemantauan presensi rombel.'}
          </p>
        </div>

        {/* Sub Navigation: Segmented Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 border border-sky-100 p-1.5 rounded-2xl shrink-0 self-start sm:self-center flex-wrap">
          {!isStaffExemptFromAttendance && (
            <button
              type="button"
              onClick={() => {
                playClickTick();
                setViewSubTab('self');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewSubTab === 'self'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{isEn ? 'My Attendance' : 'Absen Mandiri'}</span>
              {currentOfficerTodayAttendance ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Sudah Absen" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Belum Absen" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              playClickTick();
              setViewSubTab('daily');
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewSubTab === 'daily'
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{isEn ? 'Group Roster' : 'Presensi Rombel'}</span>
            {!canManageGroup && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-200">
                {isEn ? 'Read-Only' : 'Lihat'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              playClickTick();
              setViewSubTab('history');
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewSubTab === 'history'
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{isEn ? 'History & Logs' : 'Riwayat'}</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
              viewSubTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
            }`}>
              {attendance.length}
            </span>
          </button>
        </div>
      </div>

      {/* RBAC Read-Only Notice Banner */}
      {!canInputAttendance && (
        <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold">{isEn ? 'Attendance Review Mode (Read-Only):' : 'Mode Tinjauan Presensi (Hanya Lihat):'}</span>
              <span className="text-amber-800 ml-1">
                {isEn 
                  ? <>Your account as <strong>{roleMeta.label}</strong> is restricted to viewing attendance. Recording and modifying attendance is exclusively managed by <strong>Secretary</strong>, <strong>Faculty Advisor</strong>, or <strong>Admin</strong>.</>
                  : <>Akun Anda sebagai <strong>{roleMeta.label}</strong> hanya dapat melihat presensi. Pencatatan dan perubahan presensi dikelola secara khusus oleh <strong>Sekretaris</strong>, <strong>Pembina</strong>, atau <strong>Admin</strong>.</>}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900 border border-amber-300 uppercase tracking-wide shrink-0">
            {isEn ? 'Limited Access' : 'Akses Terbatas'}
          </span>
        </div>
      )}

      {/* Smart Attendance Schedule Window - Clean, refined, non-verbose layout */}
      <div className="rounded-2xl border border-blue-200/90 bg-blue-50/60 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs ring-4 ring-blue-100/80">
            <Clock className="w-5 h-5" />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                {isEn ? 'Schedule' : 'Jadwal'}
              </span>

              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                attendanceSchedule.isOpen
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : bypassSchedule
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  attendanceSchedule.isOpen
                    ? 'bg-emerald-500 animate-pulse'
                    : bypassSchedule
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-slate-400'
                }`} />
                {attendanceSchedule.statusBadge.label}
                {attendanceSchedule.remainingTimeText && attendanceSchedule.isOpen && (
                  <span className="font-normal text-emerald-700 opacity-90">
                    • {attendanceSchedule.remainingTimeText}
                  </span>
                )}
              </span>

              {attendanceSchedule.remainingTimeText && !attendanceSchedule.isOpen && (
                <span className="text-xs font-mono font-medium text-slate-500">
                  {attendanceSchedule.remainingTimeText}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap text-slate-700">
              <span className="text-sm font-bold text-slate-900 tracking-tight">
                {isEn ? attendanceSchedule.scheduleDescription : attendanceSchedule.scheduleDescriptionId}
              </span>
              {attendanceSchedule.nextSessionInfo && !attendanceSchedule.isOpen && (
                <span className="text-xs text-slate-500 font-medium">
                  • {attendanceSchedule.nextSessionInfo}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          {canConfigureCalendar(session) && onOpenScheduleConfig && (
            <button
              type="button"
              id="attendanceTabOpenScheduleBtn"
              onClick={() => {
                playClickTick();
                onOpenScheduleConfig();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 transition cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-95"
              title={isEn ? "Customize attendance schedule" : "Ubah jadwal buka/tutup presensi"}
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>{isEn ? 'Edit Schedule' : 'Ubah Jadwal'}</span>
            </button>
          )}

          {canConfigureCalendar(session) ? (
            <button
              type="button"
              onClick={() => {
                playClickTick();
                const next = !bypassSchedule;
                setBypassSchedule(next);
                setBypassScheduleEnabled(next);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-95 ${
                bypassSchedule
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title={isEn ? "Testing bypass" : "Bypass jadwal untuk pengujian"}
            >
              <Sparkles className={`w-3.5 h-3.5 ${bypassSchedule ? 'text-amber-100' : 'text-amber-500'}`} />
              <span>{bypassSchedule ? (isEn ? 'Bypass: Active' : 'Bypass: Aktif') : 'Bypass'}</span>
            </button>
          ) : bypassSchedule ? (
            <div className="px-3 py-1.5 rounded-xl text-xs font-medium border bg-amber-50 text-amber-900 border-amber-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{isEn ? 'Bypass Active' : 'Bypass Aktif'}</span>
            </div>
          ) : null}
        </div>
      </div>

      {viewSubTab === 'self' && !isStaffExemptFromAttendance ? (
        <div className="space-y-4">
          {/* Executive Self Check-in Profile Card */}
          <div className="bg-white rounded-2xl p-4 border border-[#C7D2FE] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] text-[#4338CA] flex items-center justify-center font-bold text-lg shrink-0">
                👤
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">
                    {isEn ? 'Executive Self Check-in' : 'Presensi Mandiri Pengurus'}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200">
                    {formatTitleLabel(session?.jabatan || session?.role)}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    ({currentOfficerMember?.fullName})
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isEn
                    ? 'As an active robotics club member, record your personal attendance for today’s session.'
                    : 'Sebagai anggota aktif ekskul robotik, catat kehadiran Anda pada pertemuan hari ini.'}
                </p>
              </div>
            </div>
            {canManageGroup && (
              <button
                type="button"
                onClick={() => {
                  playClickTick();
                  setViewSubTab('daily');
                }}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer self-start sm:self-auto"
              >
                {isEn ? 'Switch to Group Roster →' : 'Lihat Presensi Rombel →'}
              </button>
            )}
          </div>

          <MemberAttendanceView
            member={currentOfficerMember}
            session={session}
            todayDate={selectedDate}
            existingAttendance={currentOfficerTodayAttendance}
            onSaveAttendance={async (record) => {
              await onAddAttendance(record);
            }}
          />
        </div>
      ) : viewSubTab === 'daily' ? (
        <>
          {/* Executive Presence Alert Strip in Daily View */}
          {session && !isStaffExemptFromAttendance && (
            <div className="bg-white border border-slate-100 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                  👤
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{isEn ? 'Your Attendance Today:' : 'Presensi Anda Hari Ini:'}</span>
                    <span className="font-bold text-slate-800">{currentOfficerMember?.fullName}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {formatTitleLabel(session.jabatan || session.role)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      currentOfficerTodayAttendance
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {currentOfficerTodayAttendance ? `Status: ${currentOfficerTodayAttendance.status}` : (isEn ? 'Not Yet Checked In' : 'Belum Absen')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    playClickTick();
                    setViewSubTab('self');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer active:scale-95 text-center"
                >
                  {currentOfficerTodayAttendance ? (isEn ? 'Modify Attendance' : 'Ubah / Rincian Absen') : (isEn ? 'Check In Now' : 'Absen Mandiri Sekarang')}
                </button>
              </div>
            </div>
          )}

          {/* Unified Top Toolbar: Date Controls, Search & Filter, Consolidated Utilities & Primary CTA */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-sky-100 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            
            {/* Left: Date Navigation & Quick Date Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleDateOffset(-1)}
                  className="p-1 hover:bg-white text-slate-700 rounded-lg transition cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="px-3 py-1 bg-white rounded-lg shadow-2xs font-bold text-xs text-slate-800 flex items-center gap-1.5 border border-slate-100">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>{formatIndonesianDate(selectedDate)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDateOffset(1)}
                  className="p-1 hover:bg-white text-slate-700 rounded-lg transition cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              />

              {selectedDate !== todayStr && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold hover:bg-blue-100 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isEn ? 'Today' : 'Hari Ini'}</span>
                </button>
              )}
            </div>

            {/* Right: Search, Filter Grade, Consolidated Dropdown Menu & Primary CTA */}
            <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap">
              <div className="relative min-w-[200px] flex-1 sm:flex-none">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  placeholder={isEn ? 'Search student or class...' : 'Cari nama siswa atau kelas...'}
                  className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                />
                {searchMember && (
                  <button
                    type="button"
                    onClick={() => setSearchMember('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">{isEn ? 'All Classes' : 'Semua Kelas'}</option>
                <option value="X">{isEn ? 'Grade X' : 'Kelas X'}</option>
                <option value="XI">{isEn ? 'Grade XI' : 'Kelas XI'}</option>
                <option value="XII">{isEn ? 'Grade XII' : 'Kelas XII'}</option>
              </select>

              {onRefreshData && (
                <button
                  type="button"
                  onClick={onRefreshData}
                  disabled={isSyncing}
                  title="Refresh data"
                  className="p-2 text-slate-500 hover:text-blue-600 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              )}

              {/* Consolidated Secondary Utility Dropdown */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
                >
                  <MoreHorizontal className="w-4 h-4 text-slate-500" />
                  <span>{isEn ? 'Actions' : 'Opsi'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isExportMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        handleExportPdf();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
                    >
                      <Printer className="w-4 h-4 text-slate-400" />
                      <span>{isEn ? 'Print PDF Report' : 'Cetak Laporan PDF'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        handleExportCsv();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
                    >
                      <Download className="w-4 h-4 text-slate-400" />
                      <span>{isEn ? 'Export to CSV' : 'Ekspor ke CSV'}</span>
                    </button>
                    {canInputAttendance && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsExportMenuOpen(false);
                          setIsImportModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
                      >
                        <UploadCloud className="w-4 h-4 text-slate-400" />
                        <span>{isEn ? 'Import CSV Attendance' : 'Impor CSV Presensi'}</span>
                      </button>
                    )}
                    {canResetAttendance && onResetDateAttendance && (
                      <div className="border-t border-slate-100 my-1 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsExportMenuOpen(false);
                            handleOpenResetModal();
                          }}
                          disabled={isSubmitting}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                          <span>{isEn ? 'Reset Date Attendance' : 'Reset Presensi Tanggal Ini'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dropout Risk & Early Warning Modal Trigger */}
              <button
                type="button"
                onClick={() => {
                  playClickTick();
                  setIsRiskModalOpen(true);
                }}
                title={isEn ? 'Retention AI: Detect consecutive absences & dropout risk' : 'Peringatan Dini: Deteksi alpa beruntun & siswa rawan tidak aktif'}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs transition cursor-pointer active:scale-95 shrink-0"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">{isEn ? 'Dropout Risk' : 'Siswa Rawan'}</span>
              </button>

              {/* Primary Action Button: Mark All Present */}
              {canInputAttendance && (
                <button
                  type="button"
                  onClick={handleMarkAllHadir}
                  disabled={isSubmitting || attendanceEligibleMembers.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 active:from-sky-700 active:to-indigo-800 text-white rounded-2xl text-xs font-bold transition shadow-md active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>{isEn ? `Mark All Present (${attendanceEligibleMembers.length})` : `Tandai Semua Hadir (${attendanceEligibleMembers.length})`}</span>
                </button>
              )}
            </div>

          </div>

          {/* Daily Attendance Summary Cards - Interactive Click-to-Filter */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { key: 'Present', label: isEn ? 'Present' : 'Hadir', val: stats.hadir, color: 'text-emerald-700', bg: 'bg-emerald-50', iconColor: 'text-emerald-600', icon: CheckCircle2 },
                { key: 'Permitted', label: isEn ? 'Permitted' : 'Izin', val: stats.izin, color: 'text-amber-700', bg: 'bg-amber-50', iconColor: 'text-amber-600', icon: AlertCircle },
                { key: 'Sick', label: isEn ? 'Sick' : 'Sakit', val: stats.sakit, color: 'text-blue-700', bg: 'bg-blue-50', iconColor: 'text-blue-600', icon: HelpCircle },
                { key: 'Absent', label: isEn ? 'Absent' : 'Alpa', val: stats.alpha, color: 'text-rose-700', bg: 'bg-rose-50', iconColor: 'text-rose-600', icon: XCircle },
                { key: 'Unrecorded', label: isEn ? 'Unrecorded' : 'Belum Absen', val: stats.belumAbsen, color: 'text-slate-700', bg: 'bg-slate-100', iconColor: 'text-slate-500', icon: Users },
                { key: 'Attendance Rate', label: isEn ? 'Rate' : 'Tingkat Hadir', val: `${stats.persentaseHadir}%`, color: 'text-blue-700', bg: 'bg-blue-50', iconColor: 'text-blue-600', icon: Sparkles },
              ].map((st) => {
                const IconComp = st.icon;
                const isSelected = filterStatus === st.key;
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => handleToggleStatusFilter(st.key)}
                    className={`p-3.5 rounded-xl bg-white border transition-all flex items-center gap-2.5 cursor-pointer text-left ${
                      isSelected 
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30 shadow-xs' 
                        : 'border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                    }`}
                    title={st.key === 'Attendance Rate' ? 'Click to reset filter' : `Click to filter ${st.label} status`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${st.bg} flex items-center justify-center ${st.iconColor} shrink-0`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                        {st.label}
                      </span>
                      <span className={`text-base font-extrabold font-mono tabular-nums leading-none ${st.color} block mt-0.5`}>
                        {st.val}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Visual Attendance Progress Bar */}
            <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 flex items-center gap-3 shadow-2xs">
              <span className="text-xs font-bold text-slate-700 shrink-0 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">{isEn ? 'Attendance Rate:' : 'Tingkat Kehadiran:'}</span>
                <span className="font-mono font-extrabold text-blue-600 tabular-nums">{stats.persentaseHadir}%</span>
              </span>
              <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    stats.persentaseHadir >= 80 
                      ? 'bg-emerald-500' 
                      : stats.persentaseHadir >= 50 
                      ? 'bg-amber-500' 
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${stats.persentaseHadir}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 tabular-nums shrink-0">
                {stats.hadir} / {stats.total} {isEn ? 'Students' : 'Siswa'}
              </span>
              {filterStatus !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => {
                    playClickTick();
                    setFilterStatus('ALL');
                  }}
                  className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 hover:bg-blue-100 cursor-pointer ml-1"
                >
                  Reset ({filterStatus})
                </button>
              )}
            </div>
          </div>

          {/* Member Attendance List Table */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-sky-100 shadow-sm overflow-hidden">
            
            {/* Table Header & Active Count */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
              <span className="font-semibold text-slate-700">
                {isEn ? 'Class Roster Attendance' : 'Daftar Presensi Anggota'}
              </span>
              <span className="font-mono text-slate-500">
                {filteredMembers.length} {isEn ? 'students' : 'siswa'}
              </span>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 sticky left-0 sm:static bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] sm:shadow-none min-w-[170px]">{isEn ? 'Student Name & NISN' : 'Nama Siswa & NISN'}</th>
                    <th className="py-3 px-4">{isEn ? 'Class' : 'Kelas'}</th>
                    <th className="py-3 px-4 text-center">{isEn ? 'Attendance Status' : 'Status Presensi'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400 font-medium text-xs">
                        No students match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member, index) => {
                      const currentStatus = getMemberStatus(member);

                      return (
                        <tr key={member.nisn || index} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                          <td className="py-2.5 px-4 text-center font-mono text-xs text-slate-400 font-medium">
                            {index + 1}
                          </td>

                          <td className="py-2.5 px-4 sticky left-0 sm:static bg-white group-hover:bg-slate-50/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] sm:shadow-none">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                                {member.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 leading-tight">{member.fullName}</div>
                                <div className="text-[11px] font-mono text-slate-400 mt-0.5">NISN: {member.nisn || '-'}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs font-mono">
                              {formatFullClass(member.grade, member.classRoom)}
                            </span>
                          </td>

                          <td className="py-2.5 px-4 text-center">
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <div className="relative inline-block">
                                <select
                                  disabled={!canInputAttendance}
                                  value={currentStatus || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) {
                                      if (currentStatus && onResetMemberAttendance) {
                                        onResetMemberAttendance(selectedDate, member);
                                      }
                                    } else {
                                      handleStatusChange(member, val as AttendanceStatus);
                                    }
                                  }}
                                  className={`appearance-none pl-3.5 pr-8 py-2 sm:py-1.5 min-h-[38px] sm:min-h-[34px] rounded-xl text-xs font-bold border transition-all duration-150 shadow-2xs focus:outline-none focus:ring-2 select-none ${
                                    !canInputAttendance ? 'opacity-80 cursor-not-allowed bg-slate-100 text-slate-600 border-slate-300' : 'cursor-pointer active:scale-98'
                                  } ${
                                    currentStatus === 'Hadir'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-400'
                                      : currentStatus === 'Izin'
                                      ? 'bg-amber-50 text-amber-800 border-amber-300 focus:ring-amber-400'
                                      : currentStatus === 'Sakit'
                                      ? 'bg-[#EEF2FF] text-[#312E81] border-[#C7D2FE] focus:ring-[#4338CA]'
                                      : currentStatus === 'Alpha'
                                      ? 'bg-rose-50 text-rose-800 border-rose-300 focus:ring-rose-400'
                                      : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400 focus:ring-slate-300'
                                  }`}
                                  title={canInputAttendance ? `Attendance status for ${member.fullName}` : `View-Only Access (Read-Only) - Executive Access`}
                                >
                                  <option value="" className="text-slate-500 bg-white">{isEn ? '-- Unrecorded --' : '-- Belum Absen --'}</option>
                                  <option value="Hadir" className="text-emerald-700 font-bold bg-white">{isEn ? 'Present' : 'Hadir'}</option>
                                  <option value="Izin" className="text-amber-700 font-bold bg-white">{isEn ? 'Permitted' : 'Izin'}</option>
                                  <option value="Sakit" className="text-[#4338CA] font-bold bg-white">{isEn ? 'Sick' : 'Sakit'}</option>
                                  <option value="Alpha" className="text-rose-700 font-bold bg-white">{isEn ? 'Absent' : 'Alpa'}</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </div>
                              </div>

                              {currentStatus && onResetMemberAttendance && canInputAttendance && (
                                <button
                                  type="button"
                                  onClick={() => onResetMemberAttendance(selectedDate, member)}
                                  title={`Remove / cancel attendance for ${member.fullName}`}
                                  className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer active:scale-90"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </>
      ) : (
        /* REKAP & RIWAYAT LENGKAP */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden space-y-4 p-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder={isEn ? 'Search student name, NISN, or date...' : 'Cari nama siswa, NISN, atau tanggal...'}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => setHistorySearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">{isEn ? 'All Statuses' : 'Semua Status'}</option>
                <option value="Hadir">{isEn ? 'Present' : 'Hadir'}</option>
                <option value="Izin">{isEn ? 'Permitted' : 'Izin'}</option>
                <option value="Sakit">{isEn ? 'Sick' : 'Sakit'}</option>
                <option value="Alpha">{isEn ? 'Absent' : 'Alpa'}</option>
              </select>

              <button
                type="button"
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>{isEn ? 'PDF' : 'PDF'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>{isEn ? 'CSV' : 'CSV'}</span>
              </button>

              {onRefreshData && (
                <button
                  type="button"
                  onClick={onRefreshData}
                  disabled={isSyncing}
                  title="Refresh attendance records from database"
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                  <span className="hidden sm:inline">{isEn ? 'Refresh' : 'Segarkan'}</span>
                </button>
              )}

              {onResetAllAttendance && attendance.length > 0 && (
                <button
                  type="button"
                  id="btnResetAllAttendance"
                  onClick={() => {
                    playClickTick();
                    setResetAllHistoryConfirmOpen(true);
                  }}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 shadow-2xs"
                  title="Reset and clear all attendance records from database"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isEn ? `Reset History (${attendance.length})` : `Reset Riwayat (${attendance.length})`}</span>
                </button>
              )}
            </div>
          </div>

          {/* History Records Table */}
          <div className="overflow-hidden border border-slate-100 rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">{isEn ? 'Attendance Date' : 'Tanggal Presensi'}</th>
                    <th className="py-3 px-4">{isEn ? 'Student Name' : 'Nama Siswa'}</th>
                    <th className="py-3 px-4">NISN</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">{isEn ? 'Action' : 'Aksi'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 font-medium text-xs">
                        No attendance history saved yet.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-[#EEF2FF]/50 transition">
                        <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-[#312E81]">
                          {formatIndonesianDate(item.tanggal)}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#141414]">
                          {item.namaAnggota}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">
                          {item.nisn || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <select
                            disabled={!canInputAttendance}
                            value={item.status}
                            onChange={(e) => {
                              onAddAttendance({
                                tanggal: item.tanggal,
                                nisn: item.nisn,
                                namaAnggota: item.namaAnggota,
                                status: e.target.value as AttendanceStatus,
                              });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border focus:outline-none ${
                              !canInputAttendance ? 'opacity-80 cursor-not-allowed bg-slate-100' : 'cursor-pointer'
                            } ${
                              item.status === 'Hadir'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.status === 'Izin'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : item.status === 'Sakit'
                                ? 'bg-[#EEF2FF] text-[#4338CA] border-[#C7D2FE]'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            <option value="Hadir">Present</option>
                            <option value="Izin">Permitted</option>
                            <option value="Sakit">Sick</option>
                            <option value="Alpha">Absent</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canResetAttendance ? (
                            <button
                              type="button"
                              id={`deleteAttendanceRowBtn_${item.id || index}`}
                              onClick={() => {
                                playClickTick();
                                setAttendanceToDelete(item);
                              }}
                              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-bold px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-rose-200/80 transition cursor-pointer active:scale-95 shadow-2xs"
                              title="Delete this attendance record permanently from database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono italic">Read-Only</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* In-App Confirmation Modal for Reset Date Attendance */}
      <AnimatePresence>
        {resetConfirmOpen && (
          <div 
            id="resetAttendanceModalOverlay"
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => !isSubmitting && setResetConfirmOpen(false)}
          >
            <motion.div
              id="resetAttendanceModalContent"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center relative overflow-hidden"
            >
              {/* Top Danger Accent */}
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4 shadow-2xs">
                <Trash2 className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Reset Attendance for This Date?
              </h3>
              
              <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-700 mb-3 border border-slate-200">
                📅 {formatIndonesianDate(selectedDate)}
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-left mb-4 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Current status:</span>
                  <span className="font-bold text-slate-800">
                    {stats.hadir + stats.izin + stats.sakit + stats.alpha} recorded / {members.length} students
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 pt-1 text-center font-bold">
                  <div className="bg-emerald-50 text-emerald-700 py-1 rounded-lg border border-emerald-200">
                    {stats.hadir} Present
                  </div>
                  <div className="bg-amber-50 text-amber-700 py-1 rounded-lg border border-amber-200">
                    {stats.izin} Permitted
                  </div>
                  <div className="bg-[#EEF2FF] text-[#4338CA] py-1 rounded-lg border border-[#C7D2FE]">
                    {stats.sakit} Sick
                  </div>
                  <div className="bg-rose-50 text-rose-700 py-1 rounded-lg border border-rose-200">
                    {stats.alpha} Absent
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                  All students on this date will be reset to <strong>'Unrecorded'</strong> status and corresponding records will be <strong>permanently deleted</strong>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="cancelResetAttendanceBtn"
                  onClick={() => setResetConfirmOpen(false)}
                  disabled={isSubmitting}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirmResetAttendanceBtn"
                  onClick={handleConfirmReset}
                  disabled={isSubmitting}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm shadow-rose-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Reset Now</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* In-App Confirmation Modal for Deleting Single Attendance Record */}
      <AnimatePresence>
        {attendanceToDelete && (
          <div 
            id="deleteAttendanceRecordModalOverlay"
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => !isSubmitting && setAttendanceToDelete(null)}
          >
            <motion.div
              id="deleteAttendanceRecordModalContent"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center relative overflow-hidden"
            >
              {/* Danger Accent Icon */}
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4 shadow-2xs">
                <Trash2 className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Delete Attendance Record?
              </h3>

              <div className="my-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-bold text-slate-800">{attendanceToDelete.namaAnggota}</span>
                </div>
                {attendanceToDelete.nisn && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">NISN:</span>
                    <span className="font-mono text-slate-600">{attendanceToDelete.nisn}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-semibold text-[#312E81]">{formatIndonesianDate(attendanceToDelete.tanggal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Attendance Status:</span>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                    attendanceToDelete.status === 'Hadir'
                      ? 'bg-emerald-100 text-emerald-800'
                      : attendanceToDelete.status === 'Izin'
                      ? 'bg-amber-100 text-amber-800'
                      : attendanceToDelete.status === 'Sakit'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {attendanceToDelete.status === 'Hadir' ? 'Present' : attendanceToDelete.status === 'Izin' ? 'Permitted' : attendanceToDelete.status === 'Sakit' ? 'Sick' : 'Absent'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                This attendance record will be permanently deleted from local storage and the database.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="cancelDeleteRecordAttendanceBtn"
                  onClick={() => setAttendanceToDelete(null)}
                  disabled={isSubmitting}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirmDeleteRecordAttendanceBtn"
                  onClick={async () => {
                    const toDelete = attendanceToDelete;
                    setAttendanceToDelete(null);
                    await onDeleteAttendance(toDelete.id, undefined, toDelete);
                  }}
                  disabled={isSubmitting}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm shadow-rose-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Delete Now</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* In-App Confirmation Modal for Resetting All Attendance History (Protected with Typing Verification) */}
      <AnimatePresence>
        {resetAllHistoryConfirmOpen && (
          <div 
            id="resetAllAttendanceModalOverlay"
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => {
              if (!isSubmitting) {
                setResetAllHistoryConfirmOpen(false);
                setResetAllConfirmationInput('');
              }
            }}
          >
            <motion.div
              id="resetAllAttendanceModalContent"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 text-center relative overflow-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4 shadow-2xs">
                <RotateCcw className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">
                {isEn ? 'Reset All Attendance History?' : 'Reset Seluruh Riwayat Presensi?'}
              </h3>
              
              <div className="inline-block px-3 py-1 bg-rose-50 text-rose-800 rounded-lg text-xs font-bold mb-3 border border-rose-200">
                {isEn 
                  ? `⚠️ Will permanently delete ${attendance.length} attendance records` 
                  : `⚠️ Akan menghapus permanen ${attendance.length} catatan presensi`}
              </div>

              <p className="text-xs text-slate-600 mb-4 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left">
                {isEn 
                  ? <>This action will <strong>permanently purge all attendance history</strong> from the Supabase database and local storage. Member data will remain safe.</>
                  : <>Tindakan ini akan <strong>menghapus permanen seluruh riwayat presensi</strong> dari database Supabase dan penyimpanan lokal. Data profil anggota tetap aman.</>}
              </p>

              {/* Security Verification Input */}
              <div className="mb-5 text-left">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isEn ? 'Type ' : 'Ketik '}<span className="text-rose-600 font-mono font-black">RESET</span>{isEn ? ' to confirm:' : ' untuk konfirmasi:'}
                </label>
                <input
                  type="text"
                  value={resetAllConfirmationInput}
                  onChange={(e) => setResetAllConfirmationInput(e.target.value)}
                  placeholder={isEn ? "Type RESET here..." : "Ketik RESET di sini..."}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs font-mono font-bold uppercase transition outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="cancelResetAllAttendanceBtn"
                  onClick={() => {
                    setResetAllHistoryConfirmOpen(false);
                    setResetAllConfirmationInput('');
                  }}
                  disabled={isSubmitting}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  id="confirmResetAllAttendanceBtn"
                  onClick={async () => {
                    if (resetAllConfirmationInput.trim().toUpperCase() !== 'RESET') return;
                    setResetAllHistoryConfirmOpen(false);
                    setResetAllConfirmationInput('');
                    if (onResetAllAttendance) {
                      await onResetAllAttendance();
                    }
                  }}
                  disabled={isSubmitting || resetAllConfirmationInput.trim().toUpperCase() !== 'RESET'}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm shadow-rose-600/30 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isEn ? 'Resetting...' : 'Mereset...'}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Yes, Reset Now' : 'Ya, Reset Sekarang'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CSV / Excel / PDF Universal Import Modal for Attendance */}
      <UniversalDataUploadModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        defaultTarget="attendance"
        existingMembers={members}
        existingAttendance={attendance}
        isDemo={isDemo}
        session={session}
        onAttendanceUpdated={(updated) => {
          if (onAttendanceUpdated) {
            onAttendanceUpdated(updated);
          }
          if (onRefreshData) {
            onRefreshData();
          }
        }}
      />

      {/* Attendance Retention & Dropout Risk Modal */}
      <AttendanceRiskModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        members={members}
        attendance={attendance}
      />

    </motion.div>
  );
};
