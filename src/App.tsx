import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, 
  CalendarCheck, 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  LogOut, 
  X, 
  Sparkles, 
  ArrowRight, 
  CalendarDays, 
  Calendar, 
  Bell, 
  ChevronDown, 
  Maximize, 
  Minimize, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Compass, 
  Bot, 
  ShieldCheck, 
  ShieldAlert,
  Building2,
  Plus,
  KeyRound,
  Copy,
  Layers,
  Check,
  ArrowLeft,
  Settings,
  School,
  UploadCloud,
  BookOpen,
  MessageSquare,
  Megaphone,
  LayoutDashboard,
  UserCheck,
  Shield
} from 'lucide-react';
import { playClickTick, playSuccessChime } from './utils/audioFeedback';
import { downloadTextFile } from './utils/formatters';
import { Member, AttendanceRecord, CashTransaction, UserSession, AppNotification, Announcement, MainTabType } from './types';
import { INITIAL_MEMBERS, INITIAL_ATTENDANCE, INITIAL_CASH, INITIAL_ASSIGNMENTS } from './data/initialData';
import { motion, AnimatePresence } from 'motion/react';

// Supabase services
import { getSupabase } from './lib/supabase';
import { 
  fetchAllSupabaseData, 
  upsertMemberToDB, 
  deleteMemberFromDB, 
  upsertAttendanceToDB, 
  bulkUpsertAttendanceToDB, 
  deleteAttendanceFromDB, 
  deleteAttendanceByMemberAndDate, 
  deleteAttendanceByDate, 
  deleteAllAttendanceFromDB, 
  upsertCashToDB, 
  bulkUpsertCashToDB, 
  deleteCashFromDB, 
  deleteMultipleCashFromDB, 
  deleteAllMembersCashFromDB, 
  deleteAllCashFromDB, 
  deleteCashByMemberAndPeriod, 
  syncAllLocalDataToSupabase, 
  mapMemberFromDB, 
  mapAttendanceFromDB, 
  mapCashFromDB, 
  deduplicateAttendance, 
  sanitizeRealName,
  fetchAnnouncementsFromDB,
  createAnnouncementInDB,
  deleteAnnouncementInDB,
  fetchMaterialsAssignmentsFromDB
} from './services/supabaseService';

// Components
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileHeader } from './components/MobileHeader';
import { LoginView } from './components/LoginView';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { saveCustomAccounts, addOrUpdateAccount, verifySessionWithServer, logoutFromServer } from './utils/authConfig';
import { MembersTab } from './components/MembersTab';
import { AttendanceTab } from './components/AttendanceTab';
import { CashTab } from './components/CashTab';
import { CalendarTab } from './components/CalendarTab';
import { MemberFormModal } from './components/MemberFormModal';
import { MemberDetailModal } from './components/MemberDetailModal';
import { SupabaseSetupModal } from './components/SupabaseSetupModal';
import { DateTimeConfigModal } from './components/DateTimeConfigModal';
import { NotificationModal } from './components/NotificationModal';
import { RoleManagementModal } from './components/RoleManagementModal';
import { StudentAssignmentsView } from './components/StudentAssignmentsView';
import { AdminPreRegistrationModal } from './components/AdminPreRegistrationModal';
import { AnnouncementsModal } from './components/AnnouncementsModal';
import { AdminTasksGradingView } from './components/AdminTasksGradingView';
import { AdminDashboardOverview } from './components/AdminDashboardOverview';
import { AdminRouteGuard } from './components/AdminRouteGuard';
import { MemberAttendanceView } from './components/MemberAttendanceView';
import { AnnouncementsTab } from './components/AnnouncementsTab';
import { NotificationsTab } from './components/NotificationsTab';
import { SettingsTab } from './components/SettingsTab';
import { IdleTimeoutModal } from './components/IdleTimeoutModal';
import { 
  AppRole, 
  normalizeRole, 
  getRoleMetadata, 
  ROLE_DEFINITIONS, 
  hasPermission, 
  isExecutiveRole,
  canViewJoinCode,
  isRoomCreator,
  isExecutiveOrAdvisor,
  formatTitleLabel,
  getCanonicalRole,
  canManageAnnouncements,
  hasSessionPermission,
  maskNik,
  maskParentPhone,
  canConfigureCalendar,
  canManageMemberData,
  canManageCashData,
  canManageGroupAttendance,
  canPromoteUserRole,
  isHeadAdmin,
  isTreasurer,
  getAuthorizedTabs,
  isAuthorizedForTab,
  canActorModifyTargetRole,
  canViewMemberDirectory
} from './utils/rbac';
import { 
  checkAttendanceSchedule, 
  isBypassScheduleEnabled 
} from './utils/attendanceWindow';

// Sistem Manajemen Ekstrakurikuler Robotic MAN 2 Kota Bekasi Store & Modals
import { 
  Organization, 
  getUserOrganizations, 
  saveUserOrganizations, 
  getActiveOrganizationId, 
  setActiveOrganizationId, 
  DEFAULT_ORGANIZATIONS,
  registerKnownOrganization,
  updateKnownOrganization
} from './utils/organizerStore';
import { EditOrganizationModal } from './components/EditOrganizationModal';
import { StudentVerificationModal } from './components/StudentVerificationModal';
import { UniversalDataUploadModal } from './components/UniversalDataUploadModal';
import { AppFooter } from './components/AppFooter';
import { ThemeColor, getStoredTheme, saveStoredTheme } from './utils/theme';

const INITIAL_SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-welcome',
    title: 'Robotics Management Active',
    message: 'Welcome to roboticman2kotabekasi. Member directory, meeting attendance, and club treasury books are live and synchronized.',
    type: 'success',
    category: 'system',
    timestamp: new Date().toISOString(),
    isRead: false,
    linkTab: 'members'
  },
  {
    id: 'notif-sync',
    title: 'Unified Synchronization',
    message: 'All attendance records, club dues, and student profiles synchronize seamlessly across devices.',
    type: 'info',
    category: 'system',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    isRead: false
  },
  {
    id: 'notif-academic',
    title: 'Academic Calendar Active',
    message: 'Academic year 2026/2027 is active. Customize workshop schedules and dates anytime via the calendar icon.',
    type: 'info',
    category: 'attendance',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    isRead: true,
    linkTab: 'calendar'
  }
];
import { 
  DateAcademicConfig, 
  getInitialDateAcademicConfig, 
  saveDateAcademicConfigToStorage, 
  calculateAutoAcademicYear,
  formatCompactDate
} from './utils/dateAcademicConfig';
import { useLanguage } from './utils/i18n';

const stripSessionToken = (s: UserSession): UserSession => {
  const { token: _token, ...safe } = s;
  return safe;
};

export default function App() {
  const { language, t } = useLanguage();
  const isEn = language === 'en';
  // Session authentication state (requires explicit authentication when no valid session exists)
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const hasLoggedOut = localStorage.getItem('robotics_has_logged_out');
      if (hasLoggedOut === 'true') {
        return null;
      }
      const saved = localStorage.getItem('robotics_auth') || localStorage.getItem('robotics_saved_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.username) {
          return stripSessionToken(parsed);
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  // Dedicated Login Modal / Screen toggle
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Sinkronisasi otomatis session (tanpa token sensitif) ke localStorage setiap kali state session berubah
  useEffect(() => {
    if (session) {
      try {
        const safeSess = stripSessionToken(session);
        localStorage.setItem('robotics_auth', JSON.stringify(safeSess));
        localStorage.setItem('robotics_saved_session', JSON.stringify(safeSess));
      } catch (e) {
        console.warn('Failed to save login session:', e);
      }
    }
  }, [session]);

  // Strict Role Escalation Prevention: Sanitize session state and revert forged roles
  useEffect(() => {
    if (session) {
      const canonical = getCanonicalRole(session);
      if (canonical === 'member') {
        const cleanRole = (session.role || '').toLowerCase();
        if (cleanRole === 'admin' || cleanRole.includes('admin') || cleanRole === 'executive_board' || cleanRole.includes('executive')) {
          console.warn('[Security Guard] Unauthorized role escalation attempt detected. Reverting to member.');
          const sanitized: UserSession = {
            ...session,
            role: 'member',
            membershipStatus: 'aktif',
            jabatan: 'member',
          };
          setSession(sanitized);
          localStorage.setItem('robotics_auth', JSON.stringify(stripSessionToken(sanitized)));
        }
      }
    }
  }, [session]);

  // Verifikasi keaslian sesi admin dengan backend server (via HttpOnly cookie atau memory token) saat aplikasi dimuat
  useEffect(() => {
    let isMounted = true;
    const verifyStoredAdminSession = async () => {
      if (
        session &&
        (session.role === 'admin' || session.role?.toLowerCase().includes('admin')) &&
        !session.isDemo &&
        session.authProvider !== 'google'
      ) {
        const isValid = await verifySessionWithServer(session.token);
        if (!isValid && isMounted) {
          console.warn('[Security Guard] Sesi admin tidak valid atau telah kedaluwarsa.');
          setSession(null);
          localStorage.removeItem('robotics_auth');
          localStorage.removeItem('robotics_saved_session');
          setIsLoginModalOpen(true);
        }
      }
    };

    verifyStoredAdminSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Visual Theme state
  const [currentTheme, setCurrentTheme] = useState<ThemeColor>(() => getStoredTheme());

  const handleThemeChange = (newTheme: ThemeColor) => {
    setCurrentTheme(newTheme);
    saveStoredTheme(newTheme);
  };

  // Navigation / Modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isRoleManagementOpen, setIsRoleManagementOpen] = useState(false);

  // 15-minute Inactivity (Idle) Session Timeout Guard
  const [isIdleWarningOpen, setIsIdleWarningOpen] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(60);

  // Network Connectivity State Guard
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // New Admin Feature Modals
  const [isPreRegistrationOpen, setIsPreRegistrationOpen] = useState(false);
  const [isUniversalUploadOpen, setIsUniversalUploadOpen] = useState(false);
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);
  const [assignmentsCount, setAssignmentsCount] = useState<number>(() => {
    return INITIAL_ASSIGNMENTS.filter(m => m.type === 'assignment').length;
  });

  // Keep assignments count synchronized across sidebar, navbar, and mobile navigation
  useEffect(() => {
    let isMounted = true;
    const syncCount = async () => {
      try {
        const mats = await fetchMaterialsAssignmentsFromDB();
        if (!isMounted) return;
        if (mats && mats.length > 0) {
          setAssignmentsCount(mats.filter(m => m.type === 'assignment').length);
        } else {
          setAssignmentsCount(INITIAL_ASSIGNMENTS.filter(m => m.type === 'assignment').length);
        }
      } catch {
        if (isMounted) setAssignmentsCount(INITIAL_ASSIGNMENTS.filter(m => m.type === 'assignment').length);
      }
    };
    syncCount();

    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ count?: number }>;
      if (custom.detail && typeof custom.detail.count === 'number') {
        setAssignmentsCount(custom.detail.count);
      } else {
        syncCount();
      }
    };

    window.addEventListener('robotics_assignments_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('robotics_assignments_updated', handleUpdate);
    };
  }, []);

  // Check Supabase session on mount & subscribe to auth state changes
  useEffect(() => {
    let isMounted = true;
    const supa = getSupabase();

    const checkSupabaseSession = async () => {
      try {
        const { data: { session: supaSession } } = await supa.auth.getSession();
        if (supaSession?.user && isMounted) {
          const { data: profile } = await supa
            .from('profiles')
            .select('*')
            .eq('id', supaSession.user.id)
            .maybeSingle();

          const userEmail = supaSession.user.email || profile?.email || '';
          const userFullName = profile?.full_name || supaSession.user.user_metadata?.full_name || supaSession.user.user_metadata?.name || userEmail.split('@')[0];
          const rawRole = profile?.role || 'member';
          const userStatus = profile?.status_keanggotaan || 'aktif';
          const isStrictAdmin = rawRole === 'admin' || userEmail === 'roboticman2kotabekasi@gmail.com';
          const isExec = !isStrictAdmin && (userStatus === 'executive_board' || rawRole === 'executive_board' || (profile?.jabatan && ['president', 'vice_president', 'secretary', 'treasurer', 'pr'].includes(profile.jabatan)));
          const userRole = isStrictAdmin ? 'admin' : (isExec ? 'executive_board' : rawRole);
          const userJabatan = isStrictAdmin ? 'admin' : (profile?.jabatan || (isExec ? 'vice_president' : 'member'));

          const activeSess: UserSession = {
            username: userEmail.split('@')[0],
            name: userFullName,
            role: userRole,
            email: userEmail,
            authProvider: 'google',
            userId: supaSession.user.id,
            avatarUrl: profile?.avatar_url || supaSession.user.user_metadata?.avatar_url || supaSession.user.user_metadata?.picture,
            loginTime: new Date().toISOString(),
            isGoogleAuth: true,
            membershipStatus: isStrictAdmin ? 'admin' : (isExec ? 'executive_board' : userStatus),
            jabatan: userJabatan,
            bypassNisnVerification: isStrictAdmin || isExec,
            nis: profile?.nis || '',
            kelas: profile?.kelas || '',
            noHp: profile?.no_hp || '',
            kontakDarurat: profile?.kontak_darurat || '',
            pendingApproval: userStatus === 'pending_approval'
          };

          setSession(activeSess);
          localStorage.setItem('robotics_auth', JSON.stringify(stripSessionToken(activeSess)));
        }
      } catch (err) {
        console.warn('Error reading Supabase session on mount:', err);
      }
    };

    checkSupabaseSession();

    const { data: { subscription } } = supa.auth.onAuthStateChange(async (event, newSupaSession) => {
      if (event === 'SIGNED_IN' && newSupaSession?.user && isMounted) {
        const { data: profile } = await supa
          .from('profiles')
          .select('*')
          .eq('id', newSupaSession.user.id)
          .maybeSingle();

        const userEmail = newSupaSession.user.email || profile?.email || '';
        const userFullName = profile?.full_name || newSupaSession.user.user_metadata?.full_name || userEmail.split('@')[0];
        const rawRole = profile?.role || 'member';
        const userStatus = profile?.status_keanggotaan || 'aktif';
        const isStrictAdmin = rawRole === 'admin' || userEmail === 'roboticman2kotabekasi@gmail.com';
        const isExec = !isStrictAdmin && (userStatus === 'executive_board' || rawRole === 'executive_board' || (profile?.jabatan && ['president', 'vice_president', 'secretary', 'treasurer', 'pr'].includes(profile.jabatan)));
        const userRole = isStrictAdmin ? 'admin' : (isExec ? 'executive_board' : rawRole);
        const userJabatan = isStrictAdmin ? 'admin' : (profile?.jabatan || (isExec ? 'vice_president' : 'member'));

        const activeSess: UserSession = {
          username: userEmail.split('@')[0],
          name: userFullName,
          role: userRole,
          email: userEmail,
          authProvider: 'google',
          userId: newSupaSession.user.id,
          avatarUrl: profile?.avatar_url || newSupaSession.user.user_metadata?.avatar_url,
          loginTime: new Date().toISOString(),
          isGoogleAuth: true,
          membershipStatus: isStrictAdmin ? 'admin' : (isExec ? 'executive_board' : userStatus),
          jabatan: userJabatan,
          bypassNisnVerification: isStrictAdmin || isExec,
          nis: profile?.nis || '',
          kelas: profile?.kelas || '',
          noHp: profile?.no_hp || '',
          kontakDarurat: profile?.kontak_darurat || '',
          pendingApproval: userStatus === 'pending_approval'
        };

        setSession(activeSess);
        localStorage.setItem('robotics_auth', JSON.stringify(stripSessionToken(activeSess)));
        showToast(`Welcome, ${userFullName}! Signed in as ${isExec || userRole === 'admin' ? 'Executive Board / Officer' : 'Club Member'}.`, 'success');
      } else if (event === 'SIGNED_OUT' && isMounted) {
        // PERBAIKAN: Hanya bersihkan sesi jika akun login saat ini adalah otentikasi Google Supabase!
        // Jangan pernah me-logout pengguna yang login via Kredensial / ENV Admin / Password / Demo
        try {
          const currentSaved = localStorage.getItem('robotics_auth') || localStorage.getItem('robotics_saved_session');
          if (currentSaved) {
            const parsed = JSON.parse(currentSaved);
            if (parsed && (parsed.authProvider === 'google' || parsed.isGoogleAuth)) {
              setSession(null);
              localStorage.removeItem('robotics_auth');
              localStorage.removeItem('robotics_saved_session');
            }
          }
        } catch {
          // Tetap pertahankan sesi jika terjadi kesalahan baca JSON
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Instantly switch session role for testing / RBAC verification (Gated for admin or demo sandbox)
  const handleSessionRoleSwitch = (newRoleKey: AppRole) => {
    if (!session) return;
    const isDemoUser = Boolean(session.isDemo || session.username.startsWith('demo_'));
    if (canonicalRole !== 'admin' && !isHeadAdmin(session) && !isDemoUser) {
      showToast(isEn ? 'Access Denied: Only Administrators or Demo Sandbox mode can switch roles.' : 'Akses ditolak: Hanya Administrator atau mode Demo Sandbox yang dapat berganti role.', 'error');
      return;
    }

    const roleDef = ROLE_DEFINITIONS[newRoleKey];
    let targetJabatan = 'member';
    let targetStatus = 'Aktif';

    if (newRoleKey === 'admin') {
      targetJabatan = 'admin';
      targetStatus = 'Aktif';
    } else if (newRoleKey === 'pembina') {
      targetJabatan = 'advisor';
      targetStatus = 'Aktif';
    } else if (newRoleKey === 'ketua') {
      targetJabatan = 'president';
      targetStatus = 'executive_board';
    } else if (newRoleKey === 'bph') {
      targetJabatan = 'vice_president';
      targetStatus = 'executive_board';
    } else if (newRoleKey === 'sekretaris') {
      targetJabatan = 'secretary';
      targetStatus = 'executive_board';
    } else if (newRoleKey === 'bendahara') {
      targetJabatan = 'treasurer';
      targetStatus = 'executive_board';
    } else if (newRoleKey === 'pr') {
      targetJabatan = 'pr';
      targetStatus = 'executive_board';
    } else {
      targetJabatan = 'member';
      targetStatus = 'Aktif';
    }

    const updated: UserSession = {
      ...session,
      username: newRoleKey === 'admin' ? (session.isDemo ? 'demo_admin' : 'admin') : `demo_${newRoleKey}`,
      role: roleDef.label,
      jabatan: targetJabatan,
      membershipStatus: targetStatus,
      isDemo: Boolean(session.isDemo || session.username.startsWith('demo_') || newRoleKey !== 'admin'),
      bypassNisnVerification: true,
      isVerifiedMember: true,
      name: newRoleKey === 'admin' ? 'Administrator Robotik' : `${roleDef.label} (Demo)`,
      token: newRoleKey === 'admin' && !session.isDemo ? session.token : undefined
    };
    setSession(updated);
    try {
      localStorage.setItem('robotics_auth', JSON.stringify(stripSessionToken(updated)));
    } catch (e) {
      console.warn('Failed to update local session storage:', e);
    }

    // Auto-adjust active tab if the newly selected role does not have access to current tab
    const newAllowedTabs = getAuthorizedTabs(updated, false);
    if (!newAllowedTabs.includes(activeTab)) {
      setActiveTab(newAllowedTabs[0] || 'calendar');
    }

    showToast(isEn ? `Active Simulation Role: ${roleDef.label} (${roleDef.permissions.length} permissions)` : `Role simulasi aktif: ${roleDef.label} (${roleDef.permissions.length} izin otoritas)`, 'info');
  };

  // Strictly align navigation tabs with logged-in user canonical role ('admin' | 'executive_board' | 'advisor' | 'member')
  const canonicalRole = getCanonicalRole(session);

  // Executive Board Student Member View Mode (Allows student officers to experience the student interface & self-check-in)
  // Admin and Advisor are pure management dashboards and NEVER have student mode
  const isEligibleForStudentView = canonicalRole !== 'admin' && canonicalRole !== 'advisor';
  const [isExecutiveMemberView, setIsExecutiveMemberView] = useState<boolean>(() => {
    try {
      if (canonicalRole === 'admin' || canonicalRole === 'advisor') return false;
      return localStorage.getItem('robotics_executive_member_view') === 'true';
    } catch {
      return false;
    }
  });

  // Strictly compute authorized tabs for current session & student view mode
  const authorizedTabs = useMemo(() => {
    return getAuthorizedTabs(session, isEligibleForStudentView && isExecutiveMemberView);
  }, [session, isEligibleForStudentView, isExecutiveMemberView]);

  // Determine if the current view is strictly the Admin view (Strictly Primary Administrator Only)
  const isAdminView = useMemo(() => {
    if (!session) return false;
    const isMemberView = isEligibleForStudentView && isExecutiveMemberView;
    if (isMemberView) return false;
    return isHeadAdmin(session);
  }, [session, isEligibleForStudentView, isExecutiveMemberView]);

  // Active Tab initialized to first authorized tab
  const [activeTab, setActiveTab] = useState<MainTabType>(() => {
    const allowed = getAuthorizedTabs(session, false);
    return allowed[0] || 'dashboard';
  });
  const [activeAttendanceDate, setActiveAttendanceDate] = useState<string | undefined>(undefined);
  const [activeCashMonthKey, setActiveCashMonthKey] = useState<string | undefined>(undefined);

  // Strict RBAC Tab Guard: Automatically route user to an authorized tab if current tab is restricted
  useEffect(() => {
    if (!authorizedTabs.includes(activeTab)) {
      const fallbackTab = authorizedTabs[0] || 'calendar';
      setActiveTab(fallbackTab);
    }
  }, [authorizedTabs, activeTab]);

  // Strict enforcement: Admin and Advisor never have student mode
  useEffect(() => {
    if (!isEligibleForStudentView && isExecutiveMemberView) {
      setIsExecutiveMemberView(false);
      try {
        localStorage.setItem('robotics_executive_member_view', 'false');
      } catch {}
    }
  }, [isEligibleForStudentView, isExecutiveMemberView]);

  const handleToggleExecutiveMemberView = () => {
    if (!isEligibleForStudentView) return;
    setIsExecutiveMemberView((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('robotics_executive_member_view', String(next));
      } catch {}
      showToast(
        next
          ? 'Mode Siswa Aktif: Menampilkan sistem dari sudut pandang Siswa / Anggota.'
          : 'Mode Pengurus Aktif: Kembali ke Dasbor & Panel Pengurus Robotik.',
        'info'
      );
      return next;
    });
  };

  // Announcements State for Official Club Broadcasts (Instant Stale-While-Revalidate)
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      const local = localStorage.getItem('robotics_announcements');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  useEffect(() => {
    fetchAnnouncementsFromDB().then((data) => setAnnouncements(data));
    const handleUpdate = () => {
      fetchAnnouncementsFromDB().then((data) => setAnnouncements(data));
    };
    window.addEventListener('robotics_announcements_updated', handleUpdate);
    return () => window.removeEventListener('robotics_announcements_updated', handleUpdate);
  }, []);

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteAnnouncementInDB(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast('Announcement deleted successfully.', 'success');
    } catch {
      showToast('Failed to delete announcement.', 'error');
    }
  };

  const handleSaveAnnouncement = async (partial: Partial<Announcement>): Promise<boolean> => {
    try {
      const res = await createAnnouncementInDB({
        title: partial.title || '',
        content: partial.content || '',
        channel: partial.channel || 'announcements',
        priority: partial.priority || 'normal',
        author_name: session?.name || 'Club Lead',
        author_role: session?.role || 'officer',
        event_date: partial.event_date,
        location: partial.location,
      });
      if (res.success && res.data) {
        setAnnouncements((prev) => [res.data!, ...prev]);
        showToast('Announcement posted successfully.', 'success');
        return true;
      }
      showToast(res.error || 'Failed to post announcement.', 'error');
      return false;
    } catch {
      showToast('Failed to post announcement.', 'error');
      return false;
    }
  };

  // Real-time vs Custom Date & Academic Year State
  const [dateAcademicConfig, setDateAcademicConfig] = useState<DateAcademicConfig>(() => getInitialDateAcademicConfig());
  const [isDateAcademicModalOpen, setIsDateAcademicModalOpen] = useState(false);
  const [dateAcademicModalTab, setDateAcademicModalTab] = useState<'date' | 'academic' | 'schedule'>('schedule');

  // Real-time tick to update clock/calendar live every minute
  const [nowDate, setNowDate] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const isDateAuto = dateAcademicConfig.dateMode === 'auto';
  const displayDateStr = isDateAuto
    ? nowDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : formatCompactDate(dateAcademicConfig.customDate);

  const isAcademicYearAuto = dateAcademicConfig.academicYearMode === 'auto';
  const effectiveDateForAcademic = isDateAuto ? nowDate : new Date(dateAcademicConfig.customDate + 'T00:00:00');
  const currentAcademicYear = isAcademicYearAuto
    ? calculateAutoAcademicYear(effectiveDateForAcademic)
    : (dateAcademicConfig.customAcademicYear || calculateAutoAcademicYear(effectiveDateForAcademic));

  const handleSaveDateAcademicConfig = (newConfig: DateAcademicConfig) => {
    if (!canConfigureCalendar(session)) {
      showToast('Akses ditolak: Hanya Administrator atau Pembina yang berwenang mengubah setelan kalender & tanggal.', 'error');
      return;
    }
    setDateAcademicConfig(newConfig);
    saveDateAcademicConfigToStorage(newConfig);
    const dateDesc = newConfig.dateMode === 'auto' ? 'Automatic (Real-time)' : `Custom (${newConfig.customDate})`;
    const academicDesc = newConfig.academicYearMode === 'auto' ? `Automatic (${calculateAutoAcademicYear(nowDate)})` : `Custom (${newConfig.customAcademicYear})`;
    showToast(`Settings saved: Date ${dateDesc}, Academic Year ${academicDesc}.`, 'success');
  };

  // Master Data Versioning to ensure client preview always syncs with safe repository seed
  const DATA_VERSION = 'v2026_10_13_safe_dummy_seed_v4';

  // Otomatis bersihkan cache lawas saat mount agar pengguna mendapatkan seed aman baru dan isolasi penuh
  useEffect(() => {
    try {
      const cachedVer = localStorage.getItem('robotics_master_data_version');
      if (cachedVer !== DATA_VERSION) {
        localStorage.setItem('robotics_master_data_version', DATA_VERSION);
        localStorage.removeItem('robotics_members');
        localStorage.removeItem('robotics_admin_members');
        localStorage.removeItem('robotics_attendance');
        localStorage.removeItem('robotics_admin_attendance');
        localStorage.removeItem('robotics_cash');
        localStorage.removeItem('robotics_admin_cash');
        localStorage.removeItem('robotics_custom_accounts');
        const allKeys = Object.keys(localStorage);
        for (const k of allKeys) {
          if (k.startsWith('org_') && (k.endsWith('_members') || k.endsWith('_attendance') || k.endsWith('_cash'))) {
            localStorage.removeItem(k);
          }
          if (k.startsWith('robotics_demo_sandbox_')) {
            localStorage.removeItem(k);
          }
        }
      }
    } catch {}
  }, []);

  // Helper to ensure any cached member records have sanitized names
  const sanitizeMemberList = (list: Member[]): Member[] => {
    return list.map(m => {
      const rawName = m.fullName || (m as any).full_name || '';
      const safeName = sanitizeRealName(rawName, String(m.id_member || m.nisn || ''));
      return {
        ...m,
        fullName: safeName,
        full_name: safeName,
      };
    });
  };

  // Helper to ensure any cached attendance records have sanitized names
  const sanitizeAttendanceList = (list: AttendanceRecord[]): AttendanceRecord[] => {
    return list.map(a => {
      const rawName = a.namaAnggota || (a as any).nama_anggota || '';
      const safeName = sanitizeRealName(rawName, String(a.id_member || a.nisn || ''));
      return {
        ...a,
        namaAnggota: safeName,
        nama_anggota: safeName,
      };
    });
  };

  // Helper to ensure any cached cash records have sanitized names
  const sanitizeCashList = (list: CashTransaction[]): CashTransaction[] => {
    return list.map(c => {
      const rawName = c.namaAnggota || (c as any).nama_anggota || '';
      const safeName = sanitizeRealName(rawName, String(c.id_member || c.nisn || ''));
      return {
        ...c,
        namaAnggota: safeName,
        nama_anggota: safeName,
        namaSiswa: safeName,
      };
    });
  };

  // Helper to isolate localStorage data per account
  const getAccountStorageKey = (username: string | undefined, key: 'members' | 'attendance' | 'cash') => {
    const cleanUser = (username || 'guest').trim().toLowerCase();
    return `robotics_${cleanUser}_${key}`;
  };

  // User's joined organizations list
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>(() => {
    return getUserOrganizations(session?.username);
  });

  // Active organization ID
  const [activeOrgId, setActiveOrgId] = useState<string>(() => {
    return getActiveOrganizationId(session?.username);
  });

  const activeOrganization = useMemo(() => {
    const found = userOrganizations.find((o) => o.id === activeOrgId);
    return found || userOrganizations[0] || DEFAULT_ORGANIZATIONS[0];
  }, [userOrganizations, activeOrgId]);

  // Organization customization modal
  const [isEditOrgModalOpen, setIsEditOrgModalOpen] = useState(false);
  const [orgToEdit, setOrgToEdit] = useState<Organization | null>(null);

  // Helper to isolate localStorage data per organization & account
  // Helper to isolate localStorage data per organization & account (Strict Demo Sandbox Isolation)
  const loadOrgMembers = (orgId: string, username?: string, isDemo?: boolean): Member[] => {
    try {
      if (isDemo) {
        const cleanUser = (username || 'demo').trim().toLowerCase();
        const demoScoped = localStorage.getItem(`robotics_demo_sandbox_${cleanUser}_members`);
        if (demoScoped) {
          const parsed = JSON.parse(demoScoped);
          if (Array.isArray(parsed) && parsed.length > 0) return sanitizeMemberList(parsed);
        }
        return INITIAL_MEMBERS;
      }
      const scoped = localStorage.getItem(`org_${orgId}_members`);
      if (scoped) {
        const parsed = JSON.parse(scoped);
        if (Array.isArray(parsed) && parsed.length > 0) return sanitizeMemberList(parsed);
      }
      const legacy = localStorage.getItem('robotics_admin_members') || localStorage.getItem('robotics_members');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) return sanitizeMemberList(parsed);
      }
      return INITIAL_MEMBERS;
    } catch {
      return INITIAL_MEMBERS;
    }
  };

  const loadOrgAttendance = (orgId: string, username?: string, isDemo?: boolean): AttendanceRecord[] => {
    try {
      if (isDemo) {
        const cleanUser = (username || 'demo').trim().toLowerCase();
        const demoScoped = localStorage.getItem(`robotics_demo_sandbox_${cleanUser}_attendance`);
        if (demoScoped) {
          const parsed = JSON.parse(demoScoped);
          if (Array.isArray(parsed) && parsed.length > 0) return deduplicateAttendance(sanitizeAttendanceList(parsed));
        }
        return deduplicateAttendance(INITIAL_ATTENDANCE);
      }
      const scoped = localStorage.getItem(`org_${orgId}_attendance`);
      if (scoped) {
        const parsed = JSON.parse(scoped);
        if (Array.isArray(parsed) && parsed.length > 0) return deduplicateAttendance(sanitizeAttendanceList(parsed));
      }
      const legacy = localStorage.getItem('robotics_admin_attendance') || localStorage.getItem('robotics_attendance');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) return deduplicateAttendance(sanitizeAttendanceList(parsed));
      }
      return deduplicateAttendance(INITIAL_ATTENDANCE);
    } catch {
      return deduplicateAttendance(INITIAL_ATTENDANCE);
    }
  };

  const loadOrgCash = (orgId: string, username?: string, isDemo?: boolean): CashTransaction[] => {
    try {
      if (isDemo) {
        const cleanUser = (username || 'demo').trim().toLowerCase();
        const demoScoped = localStorage.getItem(`robotics_demo_sandbox_${cleanUser}_cash`);
        if (demoScoped) {
          const parsed = JSON.parse(demoScoped);
          if (Array.isArray(parsed) && parsed.length > 0) return sanitizeCashList(parsed);
        }
        return INITIAL_CASH;
      }
      const scoped = localStorage.getItem(`org_${orgId}_cash`);
      if (scoped) {
        const parsed = JSON.parse(scoped);
        if (Array.isArray(parsed) && parsed.length > 0) return sanitizeCashList(parsed);
      }
      const legacy = localStorage.getItem('robotics_admin_cash') || localStorage.getItem('robotics_cash');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) return sanitizeCashList(parsed);
      }
      return INITIAL_CASH;
    } catch {
      return INITIAL_CASH;
    }
  };

  // Data collections with Per-Organization LocalStorage persistence & Sandbox Isolation
  const [members, setMembers] = useState<Member[]>(() => {
    return loadOrgMembers(activeOrgId, session?.username, session?.isDemo);
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    return loadOrgAttendance(activeOrgId, session?.username, session?.isDemo);
  });

  const [cash, setCash] = useState<CashTransaction[]>(() => {
    return loadOrgCash(activeOrgId, session?.username, session?.isDemo);
  });

  // Resolve member object corresponding to the current logged-in user
  const currentMemberForSession = useMemo(() => {
    if (!session) return null;
    return (
      members.find(
        (m) =>
          (session.nisn && m.nisn === session.nisn) ||
          (session.nis && m.nisn === session.nis) ||
          (session.email && m.email && m.email.toLowerCase() === session.email.toLowerCase()) ||
          (m.fullName && session.name && m.fullName.toLowerCase() === session.name.toLowerCase())
      ) || null
    );
  }, [session, members]);

  // Guaranteed valid member object (synthesizes profile for executive officers if not yet in initial roster)
  const effectiveMemberForSession: Member | null = useMemo(() => {
    if (currentMemberForSession) return currentMemberForSession;
    if (!session) return null;
    const rawKelas = String(session.kelas || 'XI MIPA 1').trim();
    const [parsedGrade, ...restClass] = rawKelas.split(/[\s-]+/);
    return {
      id_member: session.userId || `exec-${session.username}`,
      nisn: session.nisn || session.nis || '9999999999',
      timestamp: session.loginTime || new Date().toISOString(),
      email: session.email || `${session.username}@man2kotabekasi.sch.id`,
      fullName: session.name || session.username || 'Anggota Pengurus Robotik',
      full_name: session.name || session.username || 'Anggota Pengurus Robotik',
      grade: parsedGrade || 'XI',
      classRoom: restClass.join(' ') || 'A',
      kelas: rawKelas,
      gender: 'Other',
      nik: '-',
      address: '-',
      personalPhone: session.noHp || '-',
      parentPhone: session.kontakDarurat || '-',
      telepon: session.noHp || '-',
      jabatan: session.jabatan || 'Anggota',
      status: 'aktif',
      tanggalBergabung: '2026-07-15',
      isVerified: true
    };
  }, [currentMemberForSession, session]);

  // Find attendance record for the active date for the current member
  const currentMemberExistingAttendance = useMemo(() => {
    if (!session) return null;
    const targetDate = String(activeAttendanceDate || new Date().toISOString().split('T')[0]).slice(0, 10).trim();
    const nisn = session.nisn || session.nis || currentMemberForSession?.nisn || '';
    const name = session.name || session.username || '';
    return (
      attendance.find((a) => {
        const aDate = String(a.tanggal || '').slice(0, 10).trim();
        if (aDate !== targetDate) return false;
        if (nisn && a.nisn && a.nisn === nisn) return true;
        if (name && a.namaAnggota && a.namaAnggota.toLowerCase() === name.toLowerCase()) return true;
        return false;
      }) || null
    );
  }, [attendance, activeAttendanceDate, session, currentMemberForSession]);

  // Supabase Database Connection State
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);
  const [isTablesCreated, setIsTablesCreated] = useState(false);

  // Async sync status
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Notifications State & Persistence
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const storageKey = session?.username ? `robotics_notifications_${session.username}` : 'robotics_notifications_default';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_SEED_NOTIFICATIONS;
    } catch {
      return INITIAL_SEED_NOTIFICATIONS;
    }
  });

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    try {
      const storageKey = session?.username ? `robotics_notifications_${session.username}` : 'robotics_notifications_default';
      localStorage.setItem(storageKey, JSON.stringify(notifications));
    } catch {}
  }, [notifications, session?.username]);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Modals state
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<Member | null>(null);

  // Desktop Sidebar toggle state (open/close) with local storage persistence
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('robotics_sidebar_open');
      if (saved !== null) return saved === 'true';
      return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
    } catch {
      return true;
    }
  });
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('robotics_sidebar_open', String(isSidebarOpen));
    } catch {}
  }, [isSidebarOpen]);

  const openSidebar = () => {
    setIsSidebarOpen(true);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleSidebarTabSelect = (tab: MainTabType) => {
    setActiveTab(tab);
    setIsMobileSidebarOpen(false);
  };

  // Keyboard shortcuts: Ctrl+B (sidebar) and Ctrl+K (focus search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      
      // Ctrl+B / Cmd+B: Toggle desktop sidebar
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        if (!isInput) {
          e.preventDefault();
          playClickTick();
          toggleSidebar();
        }
      }

      // Ctrl+K / Cmd+K: Quick focus search on any active tab
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        playClickTick();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="text"][placeholder*="Search" i], input[type="text"][placeholder*="Cari" i], input[type="search"]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save changes to localStorage scoped per organization & per account with Strict Demo Sandbox Isolation
  useEffect(() => {
    // Privacy Safeguard (UU PDP): Redact other students' sensitive NIK and parent contact details
    // in browser storage if the current user session is a general student member (not Executive/Advisor)
    const isElevated = isExecutiveOrAdvisor(session?.role, session?.jabatan);
    const storageMembers = isElevated ? members : members.map((m) => {
      const isSelf = (session?.nisn && m.nisn === session.nisn) || 
                     (session?.email && m.email && m.email.toLowerCase() === session.email.toLowerCase()) ||
                     (session?.name && m.fullName && m.fullName.toLowerCase() === session.name.toLowerCase());
      if (isSelf) return m;
      return {
        ...m,
        nik: m.nik ? maskNik(m.nik) : '',
        parentPhone: m.parentPhone ? maskParentPhone(m.parentPhone) : '',
        birthDate: undefined,
      };
    });

    if (session?.isDemo) {
      const cleanUser = (session.username || 'demo').trim().toLowerCase();
      localStorage.setItem(`robotics_demo_sandbox_${cleanUser}_members`, JSON.stringify(storageMembers));
      return;
    }
    if (activeOrgId) {
      localStorage.setItem(`org_${activeOrgId}_members`, JSON.stringify(storageMembers));
    }
    if (session?.username) {
      const key = getAccountStorageKey(session.username, 'members');
      localStorage.setItem(key, JSON.stringify(storageMembers));
      if (session.username === 'admin') {
        localStorage.setItem('robotics_members', JSON.stringify(storageMembers));
      }
    }
  }, [members, session?.username, session?.isDemo, session?.role, session?.jabatan, session?.nisn, session?.email, session?.name, activeOrgId]);

  useEffect(() => {
    if (session?.isDemo) {
      const cleanUser = (session.username || 'demo').trim().toLowerCase();
      localStorage.setItem(`robotics_demo_sandbox_${cleanUser}_attendance`, JSON.stringify(attendance));
      return;
    }
    if (activeOrgId) {
      localStorage.setItem(`org_${activeOrgId}_attendance`, JSON.stringify(attendance));
    }
    if (session?.username) {
      const key = getAccountStorageKey(session.username, 'attendance');
      localStorage.setItem(key, JSON.stringify(attendance));
      if (session.username === 'admin') {
        localStorage.setItem('robotics_attendance', JSON.stringify(attendance));
      }
    }
  }, [attendance, session?.username, session?.isDemo, activeOrgId]);

  useEffect(() => {
    if (session?.isDemo) {
      const cleanUser = (session.username || 'demo').trim().toLowerCase();
      localStorage.setItem(`robotics_demo_sandbox_${cleanUser}_cash`, JSON.stringify(cash));
      return;
    }
    if (activeOrgId) {
      localStorage.setItem(`org_${activeOrgId}_cash`, JSON.stringify(cash));
    }
    if (session?.username) {
      const key = getAccountStorageKey(session.username, 'cash');
      localStorage.setItem(key, JSON.stringify(cash));
      if (session.username === 'admin') {
        localStorage.setItem('robotics_cash', JSON.stringify(cash));
      }
    }
  }, [cash, session?.username, session?.isDemo, activeOrgId]);

  const showToast = (
    text: string, 
    type: 'success' | 'error' | 'info' = 'success',
    options?: {
      title?: string;
      category?: 'attendance' | 'cash' | 'member' | 'system';
      linkTab?: 'members' | 'attendance' | 'cash' | 'calendar';
    }
  ) => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);

    // Save into persistent notification history so user can view all notifications anytime
    try {
      const lower = text.toLowerCase();
      let category: 'attendance' | 'cash' | 'member' | 'system' = options?.category || 'system';
      let linkTab: 'members' | 'attendance' | 'cash' | 'calendar' | undefined = options?.linkTab;
      let title = options?.title || '';

      if (!options?.category) {
        if (lower.includes('presensi') || lower.includes('kehadiran') || lower.includes('absen') || lower.includes('hadir') || lower.includes('attendance') || lower.includes('present')) {
          category = 'attendance';
          linkTab = linkTab || 'attendance';
          title = title || (type === 'error' ? 'Attendance Issue' : 'Attendance Update');
        } else if (lower.includes('kas') || lower.includes('iuran') || lower.includes('bayar') || lower.includes('transaksi') || lower.includes('cash') || lower.includes('treasury')) {
          category = 'cash';
          linkTab = linkTab || 'cash';
          title = title || (type === 'error' ? 'Transaction Failed' : 'Treasury Update');
        } else if (lower.includes('anggota') || lower.includes('siswa') || lower.includes('member') || lower.includes('student')) {
          category = 'member';
          linkTab = linkTab || 'members';
          title = title || (type === 'error' ? 'Member Data Failed' : 'Member Data');
        } else if (lower.includes('welcome') || lower.includes('selamat datang') || lower.includes('keluar') || lower.includes('logout') || lower.includes('login')) {
          category = 'system';
          title = title || 'Account Activity';
        } else {
          category = 'system';
          title = title || (type === 'error' ? 'System Alert' : 'System Notification');
        }
      }

      const cleanText = text.replace(/^[✅⚠️❌ℹ️\s]+/, '').trim();
      const newNotif: AppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: title || (type === 'error' ? 'Alert' : 'Notification'),
        message: cleanText,
        type,
        category,
        timestamp: new Date().toISOString(),
        isRead: false,
        linkTab
      };

      setNotifications(prev => [newNotif, ...prev.slice(0, 79)]);
    } catch {
      // safe fallback
    }
  };

  // ----------------------------------------------------
  // Sync Data with Supabase Cloud (Scoped per Account)
  // ----------------------------------------------------
  const fetchAllData = useCallback(async () => {
    // 1. ISOLATION: If in Demo Mode, DO NOT fetch or touch Supabase database!
    if (!session || session.isDemo || session.username === 'demo_tamu') {
      setIsSyncing(false);
      setIsSupabaseConnected(true);
      return;
    }

    setIsSyncing(true);
    try {
      const supaResult = await fetchAllSupabaseData(session.username);
      
      if (supaResult.success && !supaResult.needsSetup) {
        setIsTablesCreated(true);
        setIsSupabaseConnected(true);

        const storageKeyPrefix = session.username.trim().toLowerCase();

        if (supaResult.members && supaResult.members.length > 0) {
          const safeMembers = sanitizeMemberList(supaResult.members);
          setMembers(safeMembers);
          localStorage.setItem(`robotics_${storageKeyPrefix}_members`, JSON.stringify(safeMembers));
          if (session.username === 'admin') {
            localStorage.setItem('robotics_members', JSON.stringify(safeMembers));
          }
        }

        if (supaResult.attendance && supaResult.attendance.length > 0) {
          const safeAttendance = sanitizeAttendanceList(supaResult.attendance);
          setAttendance(safeAttendance);
          localStorage.setItem(`robotics_${storageKeyPrefix}_attendance`, JSON.stringify(safeAttendance));
          if (session.username === 'admin') {
            localStorage.setItem('robotics_attendance', JSON.stringify(safeAttendance));
          }
        }

        if (supaResult.cash && supaResult.cash.length > 0) {
          const safeCash = sanitizeCashList(supaResult.cash);
          setCash(safeCash);
          localStorage.setItem(`robotics_${storageKeyPrefix}_cash`, JSON.stringify(safeCash));
          if (session.username === 'admin') {
            localStorage.setItem('robotics_cash', JSON.stringify(safeCash));
          }
        }

        if (supaResult.accounts && supaResult.accounts.length > 0) {
          saveCustomAccounts(supaResult.accounts);
        }
        return;
      }

      if (supaResult.needsSetup) {
        setIsTablesCreated(false);
      }
      setIsSupabaseConnected(!supaResult.error || supaResult.needsSetup);

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Fetch error:', error);
      setIsSupabaseConnected(false);
    } finally {
      setIsSyncing(false);
    }
  }, [session]);

  // Initial Fetch on Login & Realtime Listener (Disabled for Demo Sandbox to prevent cross-leak)
  useEffect(() => {
    if (session) {
      if (session.isDemo || session.username === 'demo_tamu') {
        // Demo sandbox: isolated purely to local storage
        setIsSyncing(false);
        setIsSupabaseConnected(true);
        return;
      }

      fetchAllData();

      const supa = getSupabase();
      // Setup Supabase Realtime Channels for registered accounts
      const channel = supa
        .channel(`realtime_${session.username}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMem = mapMemberFromDB(payload.new);
            setMembers((prev) => [newMem, ...prev.filter((m) => m.nisn !== newMem.nisn)]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapMemberFromDB(payload.new);
            setMembers((prev) => prev.map((m) => (m.nisn === updated.nisn ? updated : m)));
          } else if (payload.eventType === 'DELETE') {
            const deletedNisn = (payload.old as any)?.id_member || (payload.old as any)?.nisn;
            if (deletedNisn) {
              setMembers((prev) => prev.filter((m) => m.nisn !== deletedNisn && m.id_member !== deletedNisn));
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const rec = mapAttendanceFromDB(payload.new);
            const recDate = String(rec.tanggal || '').slice(0, 10).trim();
            const recNisn = String(rec.nisn || '').trim();
            const recName = String(rec.namaAnggota || '').trim().toLowerCase();

            setAttendance((prev) => {
              const filtered = prev.filter((a) => {
                if (a.id === rec.id) return false;
                const aDate = String(a.tanggal || '').slice(0, 10).trim();
                const aNisn = String(a.nisn || '').trim();
                const aName = String(a.namaAnggota || '').trim().toLowerCase();

                if (aDate !== recDate) return true;
                const matchNisn = recNisn && recNisn !== '-' && aNisn && aNisn === recNisn;
                const matchName = recName && aName && aName === recName;
                return !matchNisn && !matchName;
              });

              return [rec, ...filtered];
            });
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id?: string } | undefined;
            if (deleted?.id) {
              setAttendance((prev) => prev.filter((a) => a.id !== deleted.id));
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_transactions' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const tx = mapCashFromDB(payload.new);
            setCash((prev) => {
              const idx = prev.findIndex((c) => c.id === tx.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = tx;
                return next;
              }
              return [tx, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id?: string } | undefined;
            if (deleted?.id) {
              setCash((prev) => prev.filter((c) => c.id !== deleted.id));
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_accounts' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row: any = payload.new;
            if (row && row.username) {
              const updatedAcc = {
                username: String(row.username || '').trim(),
                password: String(row.password || ''),
                name: String(row.name || '').trim(),
                role: String(row.role || 'Pengurus Inti').trim(),
                email: String(row.email || '').trim(),
                authProvider: (row.auth_provider === 'google' ? 'google' : 'credentials') as 'credentials' | 'google',
                avatarUrl: row.avatar_url || '',
              };
              addOrUpdateAccount(updatedAcc);
            }
          }
        })
        .subscribe();

      return () => {
        supa.removeChannel(channel);
      };
    }
  }, [session, fetchAllData]);

  const handleSyncAllData = async () => {
    setIsSyncing(true);
    try {
      await syncAllLocalDataToSupabase(members, attendance, cash);
      await fetchAllData();
      showToast('All data successfully synchronized with Supabase database!', 'success');
    } catch {
      showToast('Supabase sync encountered an issue.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // ----------------------------------------------------
  // Member CRUD Operations
  // ----------------------------------------------------
  const handleSaveMember = async (memberData: Member, originalNisn?: string) => {
    if (!canManageMemberData(session)) {
      showToast('Akses ditolak: Anda tidak memiliki wewenang untuk menambah atau mengedit data siswa.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const isEditing = Boolean(originalNisn);

      if (!isEditing && !memberData.id_member) {
        const maxId = members.reduce((max, m) => {
          const parsed = Number(m.id_member);
          return Math.max(max, Number.isFinite(parsed) ? parsed : 0);
        }, 0);
        memberData.id_member = maxId + 1;
      }

      // 1. Optimistic Local State Update with robust matching
      if (isEditing) {
        setMembers((prev) => {
          const updated = prev.map((m) => {
            const isMatch = (originalNisn && String(m.nisn).trim() === String(originalNisn).trim()) ||
                            (memberData.id_member && m.id_member === memberData.id_member) ||
                            (memberToEdit && (m.nisn === memberToEdit.nisn || (m.id_member && m.id_member === memberToEdit.id_member)));
            return isMatch ? { ...m, ...memberData } : m;
          });
          try {
            localStorage.setItem('robotics_members', JSON.stringify(updated));
          } catch {}
          return updated;
        });

        // Update attendance records if NISN or name changed
        if (originalNisn) {
          setAttendance((prev) => {
            const updated = prev.map((a) => {
              if (String(a.nisn).trim() === String(originalNisn).trim() || (memberToEdit && a.namaAnggota === memberToEdit.fullName)) {
                return {
                  ...a,
                  nisn: memberData.nisn,
                  namaAnggota: memberData.fullName,
                  kelas: `${memberData.grade}-${memberData.classRoom}`,
                };
              }
              return a;
            });
            try {
              localStorage.setItem('robotics_attendance', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }

        // Update selected detail modal if currently displaying this member
        setSelectedMemberDetail((prev) => {
          if (!prev) return null;
          const isCurrent = (originalNisn && String(prev.nisn).trim() === String(originalNisn).trim()) ||
                            (memberData.id_member && prev.id_member === memberData.id_member);
          return isCurrent ? { ...prev, ...memberData } : prev;
        });
      } else {
        setMembers((prev) => {
          const updated = [memberData, ...prev.filter(m => String(m.nisn).trim() !== String(memberData.nisn).trim())];
          try {
            localStorage.setItem('robotics_members', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }

      // If in demo mode, do not write to Supabase database
      if (session?.isDemo) {
        showToast(`✅ [Mode Demo] Data anggota ${memberData.fullName} tersimpan di sandbox lokal akun demo!`, 'success');
        setIsMemberFormOpen(false);
        setMemberToEdit(null);
        return;
      }

      // 2. Write directly to Supabase
      const res = await upsertMemberToDB(memberData, originalNisn);
      if (res.success) {
        setIsTablesCreated(true);
        setIsSupabaseConnected(true);
        showToast(`✅ Member record for ${memberData.fullName} saved successfully!`, 'success');
      } else {
        console.warn('Supabase members save error:', res.error);
        showToast(`⚠️ Saved on device, but failed to sync to Supabase: ${res.error}. Open Supabase Setup to initialize tables.`, 'error');
        if (res.error?.includes('does not exist')) {
          setIsTablesCreated(false);
        }
      }

      setIsMemberFormOpen(false);
      setMemberToEdit(null);
    } catch (err: unknown) {
      const error = err as Error;
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (nisn: string) => {
    if (!canManageMemberData(session)) {
      showToast('Akses ditolak: Anda tidak memiliki wewenang untuk menghapus data siswa.', 'error');
      return;
    }

    const member = members.find((m) => m.nisn === nisn || String(m.nisn).trim() === String(nisn).trim());
    const memberName = member?.fullName || 'Member';
    const targetNisn = member?.nisn || nisn;

    setIsSubmitting(true);
    try {
      // 1. Optimistic Update (instant UI removal from list and localStorage)
      setMembers((prev) => {
        const updated = prev.filter((m) => m.nisn !== targetNisn && (!member || m.fullName !== member.fullName));
        return updated;
      });

      // Also clean up attendance of deleted member in local state
      setAttendance((prev) => {
        const updated = prev.filter((a) => a.nisn !== targetNisn && (!member || a.namaAnggota !== member.fullName));
        return updated;
      });

      // If in demo mode, do not delete from Supabase database
      if (session?.isDemo) {
        showToast(`✅ [Demo Mode] Member record for ${memberName} deleted from demo sandbox.`, 'success');
        return;
      }

      // 2. Delete from Supabase Cloud Database
      const res = await deleteMemberFromDB(targetNisn, member?.fullName);
      if (res.success) {
        showToast(`✅ Member record for ${memberName} permanently deleted from database!`, 'success');
      } else {
        showToast(`Member record for ${memberName} deleted from local list.`, 'info');
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast(`Failed to delete member: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDefaultMembers = () => {
    if (!isHeadAdmin(session)) {
      showToast('Akses ditolak: Hanya Administrator Utama yang berwenang mengatur ulang seluruh data siswa ke data bawaan.', 'error');
      return;
    }

    setMembers(INITIAL_MEMBERS);
    if (session?.username) {
      localStorage.setItem(getAccountStorageKey(session.username, 'members'), JSON.stringify(INITIAL_MEMBERS));
      if (session.username === 'admin') {
        localStorage.setItem('robotics_members', JSON.stringify(INITIAL_MEMBERS));
      }
    }
    showToast('Member roster reset to initial sample students.', 'info');
  };

  const handleClearAllMembers = () => {
    if (!isHeadAdmin(session)) {
      showToast('Akses ditolak: Hanya Administrator Utama yang berwenang mengosongkan seluruh direktori data siswa.', 'error');
      return;
    }

    // 0. Safety: Save emergency snapshot and trigger auto-download before clearing members
    if (members.length > 0) {
      try {
        const timeSlug = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        downloadTextFile(`emergency_backup_members_${timeSlug}.json`, JSON.stringify(members, null, 2), 'application/json');
        const backupKey = `robotics_backup_members_${timeSlug}`;
        localStorage.setItem(backupKey, JSON.stringify(members));
      } catch (err) {
        console.warn('Emergency members backup note:', err);
      }
    }

    setMembers([]);
    if (session?.username) {
      localStorage.setItem(getAccountStorageKey(session.username, 'members'), JSON.stringify([]));
      if (session.username === 'admin') {
        localStorage.setItem('robotics_members', JSON.stringify([]));
      }
    }
    showToast('Member roster cleared. Emergency JSON backup downloaded automatically to your device.', 'info');
  };

  const handleRoleTitleChange = async (member: Member, newRole: string, newTitle: string) => {
    // Segregation of Duties & Anti-Self-Promotion verification
    const validation = canActorModifyTargetRole(
      session,
      {
        username: member.nisn,
        nisn: member.nisn,
        fullName: member.fullName,
        email: member.email,
        role: member.role,
      },
      newTitle
    );

    if (!validation.allowed) {
      showToast(validation.reason || 'Akses ditolak: Operasi penugasan peran tidak diizinkan.', 'error');
      return;
    }

    const isAdvisor = newTitle === 'advisor' || newRole === 'admin';
    const isExec = ['president', 'vice_president', 'secretary', 'treasurer', 'pr'].includes(newTitle);
    const targetRole = isAdvisor || newTitle === 'president' ? 'admin' : (isExec ? 'executive_board' : 'member');
    const isPromotedToExec = newTitle !== 'member';

    const updatedMember: Member = {
      ...member,
      role: targetRole,
      jabatan: newTitle,
      status: isPromotedToExec ? 'executive_board' : (member.status === 'executive_board' ? 'Aktif' : (member.status || 'Aktif'))
    };

    setMembers(prev => {
      const updated = prev.map(m => (m.nisn === member.nisn || (m.id_member && m.id_member === member.id_member)) ? updatedMember : m);
      try {
        localStorage.setItem('robotics_members', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (selectedMemberDetail?.nisn === member.nisn) {
      setSelectedMemberDetail(updatedMember);
    }

    if (!session?.isDemo) {
      await upsertMemberToDB(updatedMember, member.nisn);
    }

    const accountUsername = member.email ? member.email.split('@')[0] : (member.nisn || member.fullName.toLowerCase().replace(/\s+/g, '_'));
    const roleLabel = newTitle !== 'member' ? (newTitle === 'advisor' ? 'Faculty Advisor' : `Executive Board (${formatTitleLabel(newTitle)})`) : 'Club Member';
    addOrUpdateAccount({
      username: accountUsername,
      password: '',
      name: member.fullName,
      role: roleLabel,
      email: member.email || `${accountUsername}@man2kotabekasi.sch.id`,
      nisn: member.nisn,
      authProvider: 'credentials',
    });

    try {
      window.dispatchEvent(new CustomEvent('robotics_members_updated'));
      window.dispatchEvent(new CustomEvent('robotics_accounts_updated'));
    } catch {}

    // Jika member yang diubah perannya adalah user yang sedang login saat ini, perbarui sesi aktif seketika
    if (session && (
      (session.nisn && member.nisn && session.nisn === member.nisn) ||
      (session.email && member.email && session.email.toLowerCase() === member.email.toLowerCase()) ||
      (session.username && session.username.toLowerCase() === accountUsername.toLowerCase())
    )) {
      const updatedSess: UserSession = {
        ...session,
        role: roleLabel,
        jabatan: newTitle,
        membershipStatus: isPromotedToExec ? 'executive_board' : 'Aktif',
      };
      setSession(updatedSess);
      try {
        localStorage.setItem('robotics_auth', JSON.stringify(stripSessionToken(updatedSess)));
      } catch {}
    }

    showToast(`Jabatan ${member.fullName} diperbarui menjadi ${formatTitleLabel(newTitle)}.`, 'success');
  };

  const handleMemberStatusChange = async (member: Member, newStatus: string) => {
    if (!canManageMemberData(session)) {
      showToast('Akses ditolak: Anda tidak memiliki izin untuk mengubah status keanggotaan.', 'error');
      return;
    }

    const updatedMember: Member = {
      ...member,
      status: newStatus
    };
    setMembers(prev => prev.map(m => (m.nisn === member.nisn || (m.id_member && m.id_member === member.id_member)) ? updatedMember : m));
    setSelectedMemberDetail(updatedMember);
    if (!session?.isDemo) {
      await upsertMemberToDB(updatedMember, member.nisn);
    }
    showToast(`Membership status for ${member.fullName} updated to ${newStatus}.`, 'success');
  };

  // ----------------------------------------------------
  // Attendance Operations
  // ----------------------------------------------------
  const handleAddAttendance = async (record: Omit<AttendanceRecord, 'id'>) => {
    try {
      const targetDate = String(record.tanggal || '').slice(0, 10).trim();
      const targetNisn = String(record.nisn || '').trim();
      const targetName = String(record.namaAnggota || '').trim();
      const targetNameLower = targetName.toLowerCase();

      // Attendance Spoofing Guard: General members can only submit attendance for their own account
      const isElevated = canManageGroupAttendance(session);
      if (!isElevated && session && !session.isDemo) {
        const sessionNisn = String(session.nisn || session.nis || '').trim();
        const sessionName = String(session.name || session.username || '').toLowerCase().trim();
        const matchesNisn = Boolean(sessionNisn && targetNisn && sessionNisn === targetNisn);
        const matchesName = Boolean(sessionName && targetNameLower && (sessionName === targetNameLower || targetNameLower.includes(sessionName)));

        if (!matchesNisn && !matchesName) {
          showToast('Security Alert: You can only record attendance for your own verified student profile.', 'error');
          return;
        }
      }

      // Smart Attendance Window Check (Wed 00:00 to Thu 23:59 WIB)
      if (!isElevated) {
        const scheduleCheck = checkAttendanceSchedule(new Date(), isBypassScheduleEnabled(session));
        if (!scheduleCheck.isOpen) {
          showToast(`Submission Rejected: Outside weekly attendance window (Wednesday 00:00 to Thursday 23:59 WIB). ${scheduleCheck.nextSessionInfo}`, 'error');
          return;
        }
      }

      const id = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const newRecord: AttendanceRecord = {
        id,
        tanggal: targetDate,
        nisn: targetNisn,
        namaAnggota: targetName,
        status: record.status,
      };

      // 1. Instant Optimistic State Update: purge ANY previous matching record for this student on this date
      setAttendance((prev) => {
        const filtered = prev.filter((a) => {
          const aDate = String(a.tanggal || '').slice(0, 10).trim();
          const aNisn = String(a.nisn || '').trim();
          const aName = String(a.namaAnggota || '').trim().toLowerCase();

          if (aDate !== targetDate) return true;

          const matchNisn = targetNisn && targetNisn !== '-' && aNisn && aNisn === targetNisn;
          const matchName = targetNameLower && aName && aName === targetNameLower;

          return !matchNisn && !matchName;
        });

        const updated = [newRecord, ...filtered];
        return updated;
      });

      // If in demo mode, do not write to Supabase database
      if (session?.isDemo) {
        return;
      }

      // 2. Synchronize to Supabase asynchronously
      upsertAttendanceToDB(newRecord).then((res) => {
        if (!res.success && res.error) {
          console.warn('Supabase attendance sync note:', res.error);
        }
      }).catch((err) => {
        console.warn('Supabase attendance sync error:', err);
      });

    } catch (err: unknown) {
      const error = err as Error;
      showToast(`Failed to save attendance: ${error.message}`, 'error');
    }
  };

  const handleBulkAttendance = async (records: Omit<AttendanceRecord, 'id'>[]) => {
    if (!canManageGroupAttendance(session)) {
      showToast('Akses ditolak: Anda tidak memiliki izin untuk merekam presensi massal.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (records.length === 0) return;
      const targetDate = String(records[0].tanggal || '').slice(0, 10).trim();
      const generatedRecords: AttendanceRecord[] = records.map((r, idx) => ({
        id: `att_${Date.now()}_${idx}`,
        tanggal: targetDate,
        nisn: String(r.nisn || '').trim(),
        namaAnggota: String(r.namaAnggota || '').trim(),
        status: r.status,
      }));

      // 1. Update local state & localStorage
      setAttendance((prev) => {
        const filtered = prev.filter((a) => String(a.tanggal || '').slice(0, 10).trim() !== targetDate);
        const updated = [...generatedRecords, ...filtered];
        return updated;
      });

      // If in demo mode, do not write to Supabase
      if (session?.isDemo) {
        showToast(`✅ [Demo Mode] ${records.length} students marked Present in demo sandbox!`, 'success');
        return;
      }

      // 2. Batch write to Supabase
      const res = await bulkUpsertAttendanceToDB(generatedRecords, true);
      if (res.success) {
        showToast(`✅ ${records.length} students marked Present in Supabase Cloud!`, 'success');
      } else {
        showToast(`Attendance recorded locally (Supabase: ${res.error})`, 'info');
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAttendance = async (id: string, index?: number, record?: AttendanceRecord) => {
    if (!canManageGroupAttendance(session)) {
      showToast('Akses ditolak: Anda tidak memiliki izin untuk menghapus catatan presensi.', 'error');
      return;
    }

    setIsSubmitting(true);
    // 1. Optimistic remove from local state & sync to localStorage
    setAttendance((prev) => {
      const updated = prev.filter((a, idx) => {
        if (id && a.id === id) return false;
        if (record && a.tanggal === record.tanggal && (
          (record.nisn && a.nisn === record.nisn) || 
          (record.namaAnggota && a.namaAnggota === record.namaAnggota)
        )) return false;
        if (index !== undefined && idx === index) return false;
        return true;
      });
      return updated;
    });

    // If in demo mode, do not delete from Supabase
    if (session?.isDemo) {
      setIsSubmitting(false);
      showToast('[Demo Mode] Attendance record deleted from demo sandbox.', 'info');
      return;
    }

    // 2. Delete from Supabase Database
    try {
      const res = await deleteAttendanceFromDB(id, record);
      if (res.success) {
        showToast('✅ Attendance record permanently deleted from Supabase database!', 'success');
      } else {
        showToast('Attendance record deleted locally.', 'info');
      }
    } catch (dbErr: any) {
      console.warn('Supabase delete attendance error:', dbErr);
      showToast('Attendance record deleted locally.', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetMemberAttendance = async (tanggal: string, member: Member) => {
    if (!canManageGroupAttendance(session)) {
      showToast('Akses ditolak: Anda tidak memiliki izin untuk membatalkan presensi siswa.', 'error');
      return;
    }

    const targetDate = String(tanggal || '').slice(0, 10).trim();
    const targetNisn = String(member.nisn || '').trim();
    const targetNameLower = String(member.fullName || '').trim().toLowerCase();

    // 1. Optimistic remove from local state and update localStorage
    setAttendance((prev) => {
      const updated = prev.filter((a) => {
        const aDate = String(a.tanggal || '').slice(0, 10).trim();
        const aNisn = String(a.nisn || '').trim();
        const aName = String(a.namaAnggota || '').trim().toLowerCase();

        if (aDate !== targetDate) return true;
        const matchNisn = targetNisn && targetNisn !== '-' && aNisn && aNisn === targetNisn;
        const matchName = targetNameLower && aName && aName === targetNameLower;
        return !matchNisn && !matchName;
      });
      return updated;
    });

    // If in demo mode, do not delete from Supabase
    if (session?.isDemo) {
      showToast(`[Demo Mode] Attendance for ${member.fullName} cancelled in demo sandbox.`, 'info');
      return;
    }

    // 2. Delete from Supabase
    try {
      const res = await deleteAttendanceByMemberAndDate(targetDate, targetNisn, member.fullName);
      if (res.success) {
        showToast(`✅ Attendance for ${member.fullName} on ${targetDate} cancelled from database!`, 'success');
      } else {
        showToast(`Attendance for ${member.fullName} cancelled locally.`, 'info');
      }
    } catch (err) {
      console.warn('Reset member attendance error:', err);
      showToast(`Attendance for ${member.fullName} cancelled locally.`, 'info');
    }
  };

  const handleResetDateAttendance = async (tanggal: string) => {
    if (!canManageGroupAttendance(session)) {
      showToast('Akses ditolak: Anda tidak memiliki izin untuk mengatur ulang presensi tanggal ini.', 'error');
      return;
    }

    const targetDate = String(tanggal || '').slice(0, 10).trim();

    // Collect IDs of all records on this date before removing from local state
    const recordsToDelete = attendance.filter((a) => String(a.tanggal || '').slice(0, 10).trim() === targetDate);
    const targetIds = recordsToDelete.map((a) => a.id).filter(Boolean) as string[];

    // 1. Optimistic instant local removal & localStorage sync
    setAttendance((prev) => {
      const updated = prev.filter((a) => String(a.tanggal || '').slice(0, 10).trim() !== targetDate);
      return updated;
    });

    // If in demo mode, do not delete from Supabase
    if (session?.isDemo) {
      showToast(`[Demo Mode] All attendance for ${targetDate} reset in demo sandbox.`, 'info');
      return;
    }

    // 2. Delete permanently from Supabase Cloud Database
    setIsSubmitting(true);
    try {
      const res = await deleteAttendanceByDate(targetDate, targetIds);
      if (res.success) {
        showToast(`✅ All attendance for ${targetDate} successfully reset and removed from database!`, 'success');
      } else {
        showToast(`Attendance reset locally (database note: ${res.error || 'ok'}).`, 'info');
      }
    } catch (err: any) {
      console.warn('Reset date attendance error:', err);
      showToast(`Attendance reset locally. Sync note: ${err?.message || err}`, 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAllAttendance = async () => {
    if (!isHeadAdmin(session)) {
      showToast('Akses ditolak: Hanya Administrator Utama yang berwenang mengatur ulang seluruh riwayat presensi.', 'error');
      return;
    }
    setIsSubmitting(true);
    const count = attendance.length;
    const allIds = attendance.map((a) => a.id).filter(Boolean) as string[];

    // 0. Safety: Save emergency snapshot and trigger auto-download before destructive reset
    if (attendance.length > 0) {
      try {
        const timeSlug = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        downloadTextFile(`emergency_backup_attendance_${timeSlug}.json`, JSON.stringify(attendance, null, 2), 'application/json');
        const backupKey = `robotics_backup_attendance_${timeSlug}`;
        localStorage.setItem(backupKey, JSON.stringify(attendance));
      } catch (err) {
        console.warn('Emergency attendance backup note:', err);
      }
    }

    // 1. Optimistic instant local removal & localStorage sync
    setAttendance([]);
    if (session?.username) {
      const key = getAccountStorageKey(session.username, 'attendance');
      localStorage.setItem(key, JSON.stringify([]));
      if (session.username === 'admin') {
        localStorage.setItem('robotics_attendance', JSON.stringify([]));
      }
    }

    // If in demo mode, do not delete from Supabase
    if (session?.isDemo) {
      setIsSubmitting(false);
      showToast(`[Demo Mode] All attendance history (${count} records) reset in demo sandbox.`, 'info');
      return;
    }

    // 2. Delete permanently from Supabase Cloud Database
    try {
      const res = await deleteAllAttendanceFromDB(session?.username, allIds);
      if (res.success) {
        showToast(`✅ All attendance history (${count} records) successfully reset and removed from database!`, 'success');
      } else {
        showToast(`Attendance history reset locally (database note: ${res.error || 'ok'}).`, 'info');
      }
    } catch (err: any) {
      console.warn('Reset all attendance error:', err);
      showToast(`Attendance history reset locally. Sync note: ${err?.message || err}`, 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Cash Operations
  // ----------------------------------------------------
  const handleAddCash = async (transaction: Omit<CashTransaction, 'id'>) => {
    if (!canManageCashData(session)) {
      showToast('Akses ditolak: Hanya Bendahara atau Administrator yang berwenang mencatat transaksi kas.', 'error');
      return;
    }

    // Double Submission & Duplicate Entry Guard
    const targetDate = String(transaction.tanggal || '').slice(0, 10).trim();
    const targetNisn = String(transaction.nisn || '').trim();
    const targetName = String(transaction.namaAnggota || '').trim().toLowerCase();
    const targetAmount = Math.abs(Number(transaction.jumlah || 0));
    const targetDesc = String(transaction.keterangan || '').trim().toLowerCase();

    const isDuplicate = cash.some((c) => {
      const sameDate = String(c.tanggal || '').slice(0, 10).trim() === targetDate;
      const sameMember = Boolean(
        (targetNisn && targetNisn !== '-' && c.nisn && c.nisn === targetNisn) ||
        (targetName && c.namaAnggota && c.namaAnggota.toLowerCase().trim() === targetName)
      );
      const sameType = c.jenis === transaction.jenis;
      const sameAmount = Math.abs(Number(c.jumlah || 0)) === targetAmount;
      const sameDesc = String(c.keterangan || '').trim().toLowerCase() === targetDesc;
      return sameDate && sameMember && sameType && sameAmount && (sameDesc || !targetDesc);
    });

    if (isDuplicate) {
      showToast('Peringatan: Transaksi kas untuk siswa ini dengan tanggal dan nominal yang sama sudah tercatat. Sistem mencegah pencatatan ganda.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const id = `cash_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newTx: CashTransaction = {
        id,
        ...transaction,
      };

      // 1. Optimistic Update
      setCash((prev) => [newTx, ...prev]);

      // If in demo mode, do not write to Supabase
      if (session?.isDemo) {
        showToast(`✅ [Demo Mode] Treasury ${transaction.jenis === 'Masuk' || transaction.jenis === 'Inflow' ? 'Inflow' : 'Outflow'} (Rp ${Number(transaction.jumlah).toLocaleString('en-US')}) recorded in demo sandbox!`, 'success');
        return;
      }

      // 2. Write to Supabase
      const res = await upsertCashToDB(newTx);
      if (res.success) {
        showToast(`✅ Treasury ${transaction.jenis === 'Masuk' || transaction.jenis === 'Inflow' ? 'Inflow' : 'Outflow'} (Rp ${Number(transaction.jumlah).toLocaleString('en-US')}) saved successfully!`, 'success');
      } else {
        showToast(`Transaction saved locally (Supabase note: ${res.error})`, 'info');
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkAddCash = async (transactions: Omit<CashTransaction, 'id'>[]) => {
    if (!canManageCashData(session)) {
      showToast('Akses ditolak: Hanya Bendahara atau Administrator yang berwenang mencatat transaksi kas massal.', 'error');
      return;
    }

    if (transactions.length === 0) return;

    // Filter out transactions that already exist to prevent duplicate bulk recordings
    const nonDuplicateTxs = transactions.filter((t) => {
      const tDate = String(t.tanggal || '').slice(0, 10).trim();
      const tNisn = String(t.nisn || '').trim();
      const tName = String(t.namaAnggota || '').trim().toLowerCase();
      const tAmount = Math.abs(Number(t.jumlah || 0));

      const exists = cash.some((c) => {
        const cDate = String(c.tanggal || '').slice(0, 10).trim();
        const cNisn = String(c.nisn || '').trim();
        const cName = String(c.namaAnggota || '').trim().toLowerCase();
        const cAmount = Math.abs(Number(c.jumlah || 0));
        const matchMember = Boolean((tNisn && tNisn !== '-' && cNisn && tNisn === cNisn) || (tName && cName && tName === cName));
        return cDate === tDate && matchMember && c.jenis === t.jenis && cAmount === tAmount;
      });
      return !exists;
    });

    if (nonDuplicateTxs.length === 0) {
      showToast('Semua pembayaran iuran yang dipilih sudah pernah tercatat pada tanggal tersebut (Data duplikat diabaikan).', 'info');
      return;
    }

    const skippedCount = transactions.length - nonDuplicateTxs.length;

    setIsSubmitting(true);
    try {
      const generatedTxs: CashTransaction[] = nonDuplicateTxs.map((t, idx) => ({
        id: `cash_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
        ...t,
      }));

      // 1. Optimistic Update
      setCash((prev) => [...generatedTxs, ...prev]);

      // If in demo mode, do not write to Supabase
      if (session?.isDemo) {
        showToast(`✅ [Demo Mode] ${generatedTxs.length} treasury payments recorded in demo sandbox!${skippedCount > 0 ? (isEn ? ` (${skippedCount} duplicates skipped)` : ` (${skippedCount} data ganda dilewati)`) : ''}`, 'success');
        return;
      }

      // 2. Batch write to Supabase
      const res = await bulkUpsertCashToDB(generatedTxs);
      if (res.success) {
        showToast(`✅ ${generatedTxs.length} treasury payments recorded in Supabase!${skippedCount > 0 ? (isEn ? ` (${skippedCount} duplicates skipped)` : ` (${skippedCount} data ganda dilewati)`) : ''}`, 'success');
      } else {
        showToast(`Treasury payments recorded locally (Supabase note: ${res.error})`, 'info');
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelMemberCash = async (txId?: string, memberName?: string, txObject?: CashTransaction) => {
    if (!canManageCashData(session)) {
      showToast('Akses ditolak: Hanya Bendahara atau Administrator yang berwenang membatalkan transaksi kas.', 'error');
      return;
    }

    setIsSubmitting(true);
    let targetId = txId;
    let targetObj = txObject;

    setCash((prev) => {
      let next: CashTransaction[];
      if (targetId) {
        if (!targetObj) targetObj = prev.find((c) => c.id === targetId);
        next = prev.filter((c) => c.id !== targetId);
      } else if (targetObj) {
        targetId = targetObj.id;
        next = prev.filter((c) => {
          if (targetObj?.id && c.id === targetObj.id) return false;
          if (c === targetObj) return false;
          const sameNisn = c.nisn && targetObj?.nisn && c.nisn === targetObj.nisn;
          const sameName = c.namaAnggota && targetObj?.namaAnggota && c.namaAnggota === targetObj.namaAnggota;
          const sameDate = c.tanggal === targetObj?.tanggal;
          const sameAmount = Number(c.jumlah) === Number(targetObj?.jumlah);
          if ((sameNisn || sameName) && sameDate && sameAmount) return false;
          return true;
        });
      } else {
        next = prev;
      }
      return next;
    });

    if (session?.isDemo) {
      setIsSubmitting(false);
      showToast(`[Demo Mode] Treasury payment for ${memberName || 'student'} cancelled in demo sandbox.`, 'info');
      return;
    }

    try {
      const idToDelete = targetId || targetObj?.id;
      if (idToDelete) {
        await deleteCashFromDB(idToDelete);
      }
    } catch (dbErr) {
      console.warn('Supabase delete cash error:', dbErr);
    } finally {
      setIsSubmitting(false);
    }
    showToast(`Treasury payment for ${memberName || 'student'} cancelled/deleted (status: Unpaid).`, 'info');
  };

  const handleResetPeriodCash = async (periodMonthKey: string, periodLabel: string) => {
    if (!canManageCashData(session)) {
      showToast('Akses ditolak: Hanya Bendahara atau Administrator yang berwenang mengatur ulang kas periode.', 'error');
      return;
    }

    const removedIds: string[] = [];
    setCash((prev) => {
      const next = prev.filter((c) => {
        const isPeriodMatch = c.jenis === 'Masuk' && (
          (c.tanggal && c.tanggal.startsWith(periodMonthKey)) ||
          (c.keterangan && c.keterangan.toLowerCase().includes(periodLabel.toLowerCase()))
        );
        if (isPeriodMatch && c.id) {
          removedIds.push(c.id);
        }
        return !isPeriodMatch;
      });
      return next;
    });

    if (session?.isDemo) {
      showToast(`[Demo Mode] All treasury dues for period ${periodLabel} reset in demo sandbox.`, 'info');
      return;
    }

    try {
      if (removedIds.length > 0) {
        await deleteMultipleCashFromDB(removedIds);
      }
      showToast(`All treasury dues for period ${periodLabel} reset successfully.`, 'success');
    } catch (err) {
      console.warn('Reset period cash error:', err);
    }
  };

  const handleDeleteMultipleCash = async (ids: string[], message?: string) => {
    if (!canManageCashData(session)) {
      showToast('Akses ditolak: Hanya Bendahara atau Administrator yang berwenang menghapus transaksi kas.', 'error');
      return;
    }

    if (!ids || ids.length === 0) return;
    setIsSubmitting(true);

    setCash((prev) => {
      const idSet = new Set(ids);
      const next = prev.filter((c) => !c.id || !idSet.has(c.id));
      return next;
    });

    if (session?.isDemo) {
      setIsSubmitting(false);
      showToast(message || `[Demo Mode] ${ids.length} cash transactions deleted in demo sandbox.`, 'info');
      return;
    }

    try {
      const res = await deleteMultipleCashFromDB(ids);
      if (res.success) {
        showToast(message || `${ids.length} cash transactions successfully deleted from local data & Supabase.`, 'success');
      } else {
        console.warn('Delete multiple cash warning:', res.error);
        showToast(message || `${ids.length} cash transactions successfully deleted from local data.`, 'info');
      }
    } catch (err) {
      console.warn('Delete multiple cash error:', err);
      showToast(message || `${ids.length} cash transactions successfully deleted from local data.`, 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAllMembersCash = async () => {
    if (!canManageCashData(session)) {
      showToast('Akses ditolak: Hanya Bendahara atau Administrator yang berwenang menghapus seluruh transaksi kas anggota.', 'error');
      return;
    }

    setIsSubmitting(true);
    let memberTxCount = 0;

    setCash((prev) => {
      const next = prev.filter((c) => {
        const isMemberTx = c.jenis === 'Masuk' && (
          (c.nisn && c.nisn.trim() !== '-' && c.nisn.trim() !== '') ||
          (c.namaAnggota && c.namaAnggota !== 'Kas Organisasi') ||
          (c.namaSiswa && c.namaSiswa !== 'Kas Organisasi')
        );
        if (isMemberTx) {
          memberTxCount++;
        }
        return !isMemberTx;
      });
      return next;
    });

    if (session?.isDemo) {
      setIsSubmitting(false);
      showToast(`[Demo Mode] All member dues records (${memberTxCount} transactions) deleted from demo sandbox.`, 'info');
      return;
    }

    try {
      const res = await deleteAllMembersCashFromDB();
      if (res.success) {
        showToast(`All member dues records across all members (${memberTxCount} transactions) successfully deleted from local data & Supabase.`, 'success');
      } else {
        console.warn('Delete all members cash warning:', res.error);
        showToast(`All member dues records across all members (${memberTxCount} transactions) deleted from local data.`, 'info');
      }
    } catch (err) {
      console.warn('Delete all members cash error:', err);
      showToast(`All member dues records deleted from local data.`, 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAllCash = async () => {
    if (!canManageCashData(session)) {
      showToast('Akses ditolak: Hanya Bendahara atau Administrator yang berwenang mengatur ulang buku kas.', 'error');
      return;
    }

    setIsSubmitting(true);
    const count = cash.length;
    const allIds = cash.map((c) => c.id).filter(Boolean) as string[];

    // 0. Safety: Save emergency snapshot and trigger auto-download before destructive reset
    if (cash.length > 0) {
      try {
        const timeSlug = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        downloadTextFile(`emergency_backup_cash_ledger_${timeSlug}.json`, JSON.stringify(cash, null, 2), 'application/json');
        const backupKey = `robotics_backup_cash_${timeSlug}`;
        localStorage.setItem(backupKey, JSON.stringify(cash));
      } catch (err) {
        console.warn('Emergency cash backup note:', err);
      }
    }

    // 1. Optimistic instant local removal & localStorage sync
    setCash([]);
    if (session?.username) {
      const key = getAccountStorageKey(session.username, 'cash');
      localStorage.setItem(key, JSON.stringify([]));
      if (session.username === 'admin') {
        localStorage.setItem('robotics_cash', JSON.stringify([]));
      }
    }

    // If in demo mode, do not delete from Supabase
    if (session?.isDemo) {
      setIsSubmitting(false);
      showToast(`[Demo Mode] All treasury transactions (${count} transactions) reset in demo sandbox.`, 'info');
      return;
    }

    // 2. Delete permanently from Supabase Cloud Database
    try {
      const res = await deleteAllCashFromDB(session?.username, allIds);
      if (res.success) {
        showToast(`✅ All treasury transaction records (${count} transactions) reset and permanently deleted from Supabase database!`, 'success');
      } else {
        showToast(`Treasury history reset locally (database note: ${res.error || 'ok'}).`, 'info');
      }
    } catch (err: any) {
      console.warn('Reset all cash error:', err);
      showToast(`Treasury history reset locally. Sync note: ${err?.message || err}`, 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCash = async (id?: string, index?: number, txObject?: CashTransaction) => {
    if (!canManageCashData(session)) {
      showToast('Akses ditolak: Hanya Bendahara atau Administrator yang berwenang menghapus transaksi kas.', 'error');
      return;
    }

    setIsSubmitting(true);
    let targetId = id;
    let removedItem: CashTransaction | undefined = txObject;

    setCash((prev) => {
      let next: CashTransaction[];
      if (targetId) {
        if (!removedItem) removedItem = prev.find((c) => c.id === targetId);
        next = prev.filter((c) => c.id !== targetId);
      } else if (txObject) {
        targetId = txObject.id;
        next = prev.filter((c) => {
          if (txObject.id && c.id === txObject.id) return false;
          return c !== txObject;
        });
      } else if (index !== undefined && prev[index]) {
        removedItem = prev[index];
        targetId = removedItem?.id;
        next = prev.filter((_, idx) => idx !== index);
      } else {
        next = prev;
      }
      return next;
    });

    if (session?.isDemo) {
      setIsSubmitting(false);
      showToast('[Demo Mode] Cash transaction deleted from demo sandbox.', 'info');
      return;
    }

    try {
      const idToDelete = targetId || removedItem?.id;
      if (idToDelete) {
        const res = await deleteCashFromDB(idToDelete);
        if (res.success) {
          showToast('Cash transaction deleted from local data & Supabase.', 'success');
        } else {
          console.warn('Supabase cash delete note:', res.error);
          showToast('Cash transaction deleted from local data.', 'info');
        }
      } else {
        showToast('Cash transaction deleted successfully.', 'info');
      }
    } catch (dbErr) {
      console.warn('Supabase cash delete error:', dbErr);
      showToast('Cash transaction deleted from local data.', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Organization Handlers (MAN 2 Kota Bekasi Robotics Club)
  // ----------------------------------------------------
  const handleSelectOrganization = (
    org: Organization, 
    initialTab?: MainTabType
  ) => {
    setActiveOrgId(org.id);
    setActiveOrganizationId(session?.username, org.id);

    const loadedM = loadOrgMembers(org.id, session?.username, session?.isDemo);
    const loadedA = loadOrgAttendance(org.id, session?.username, session?.isDemo);
    const loadedC = loadOrgCash(org.id, session?.username, session?.isDemo);
    setMembers(loadedM);
    setAttendance(loadedA);
    setCash(loadedC);

    const userRoleStr = (session?.role || '').toLowerCase();
    const isAdminUser = userRoleStr === 'admin' || session?.bypassNisnVerification || userRoleStr.includes('admin');
    const sessionIsMember = 
      !isAdminUser && (
        userRoleStr === 'member' || 
        userRoleStr === 'club member' || 
        userRoleStr.includes('member') || 
        normalizeRole(session?.role) === 'anggota'
      );

    if (session && !sessionIsMember && org.role) {
      const updatedSession = { ...session, role: isAdminUser ? 'admin' : org.role };
      setSession(updatedSession);
      try {
        localStorage.setItem('robotics_auth', JSON.stringify(stripSessionToken(updatedSession)));
      } catch {}
    } else if (session && sessionIsMember) {
      const updatedSession = { ...session, role: 'Club Member' };
      setSession(updatedSession);
      try {
        localStorage.setItem('robotics_auth', JSON.stringify(stripSessionToken(updatedSession)));
      } catch {}
    }

    if (initialTab) {
      setActiveTab(initialTab);
    } else if (sessionIsMember) {
      setActiveTab('calendar');
    } else if (isAdminUser) {
      setActiveTab('dashboard');
    }
    showToast(`Opening club room: ${org.name}`, 'info');
  };

  const handleCreateOrgSuccess = (newOrg: Organization) => {
    const updated = [newOrg, ...userOrganizations.filter((o) => o.id !== newOrg.id)];
    setUserOrganizations(updated);
    saveUserOrganizations(session?.username, updated);
    handleSelectOrganization(newOrg);
    showToast(`New club room "${newOrg.name}" created successfully!`, 'success');
  };

  const handleJoinOrgSuccess = (org: Organization, selectedRole: string) => {
    const joinedOrg: Organization = {
      ...org,
      role: selectedRole,
    };
    const updated = [joinedOrg, ...userOrganizations.filter((o) => o.id !== org.id)];
    setUserOrganizations(updated);
    saveUserOrganizations(session?.username, updated);
    handleSelectOrganization(joinedOrg);
    showToast(`Successfully joined "${org.name}" as ${selectedRole}!`, 'success');
  };

  const handleSaveOrgCustomization = (updatedOrg: Organization) => {
    const updatedList = userOrganizations.map((o) => (o.id === updatedOrg.id ? updatedOrg : o));
    setUserOrganizations(updatedList);
    saveUserOrganizations(session?.username, updatedList);
    updateKnownOrganization(updatedOrg.id, updatedOrg);

    if (updatedOrg.id === activeOrgId && session && updatedOrg.role) {
      const updatedSession = { ...session, role: updatedOrg.role };
      setSession(updatedSession);
      try {
        localStorage.setItem('robotics_auth', JSON.stringify(stripSessionToken(updatedSession)));
      } catch {}
    }
    showToast(`Room customization for "${updatedOrg.name}" saved!`, 'success');
  };

  const handleResetOrgData = (orgId: string) => {
    localStorage.removeItem(`org_${orgId}_members`);
    localStorage.removeItem(`org_${orgId}_attendance`);
    localStorage.removeItem(`org_${orgId}_cash`);
    if (orgId === activeOrgId) {
      setMembers([]);
      setAttendance([]);
      setCash([]);
    }
    showToast('Roster, attendance, and treasury records for this room have been cleared.', 'info');
  };

  const handleLeaveOrganization = (orgId: string) => {
    if (userOrganizations.length <= 1) {
      showToast('Cannot leave your only club room.', 'error');
      return;
    }
    const targetOrg = userOrganizations.find((o) => o.id === orgId);
    const updated = userOrganizations.filter((o) => o.id !== orgId);
    setUserOrganizations(updated);
    saveUserOrganizations(session?.username, updated);

    if (activeOrgId === orgId) {
      handleSelectOrganization(updated[0]);
    }
    showToast(`You left room "${targetOrg?.name || orgId}".`, 'info');
  };

  // ----------------------------------------------------
  // Auth Handlers
  // ----------------------------------------------------
  const handleLogin = (newSession: UserSession) => {
    localStorage.removeItem('robotics_has_logged_out');
    setSession(newSession);
    const safeSess = stripSessionToken(newSession);
    localStorage.setItem('robotics_auth', JSON.stringify(safeSess));
    localStorage.setItem('robotics_saved_session', JSON.stringify(safeSess));
    
    // Refresh user's organizations
    const orgs = getUserOrganizations(newSession.username);
    setUserOrganizations(orgs);

    const initialOrgId = getActiveOrganizationId(newSession.username) || orgs[0]?.id || DEFAULT_ORGANIZATIONS[0].id;
    setActiveOrgId(initialOrgId);

    // Immediately isolate and load the authenticated account's data
    const loadedMembers = loadOrgMembers(initialOrgId, newSession.username, newSession.isDemo);
    const loadedAtt = loadOrgAttendance(initialOrgId, newSession.username, newSession.isDemo);
    const loadedCash = loadOrgCash(initialOrgId, newSession.username, newSession.isDemo);
    setMembers(loadedMembers);
    setAttendance(loadedAtt);
    setCash(loadedCash);

    // Route dynamic starting tab based strictly on role
    const canonical = getCanonicalRole(newSession);
    if (canonical === 'member') {
      setActiveTab('calendar');
    } else {
      setActiveTab('dashboard');
    }
    showToast(`Welcome, ${newSession.name}! Session signed in successfully.`, 'success');
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    await logoutFromServer();
    try {
      const supa = getSupabase();
      await supa.auth.signOut();
    } catch (e) {
      console.warn('Supabase sign out error:', e);
    }
    // Fully clear active session and set persistent logout flag
    setSession(null);
    localStorage.removeItem('robotics_auth');
    localStorage.removeItem('robotics_saved_session');
    localStorage.setItem('robotics_has_logged_out', 'true');
    setMembers(INITIAL_MEMBERS);
    setAttendance(INITIAL_ATTENDANCE);
    setCash(INITIAL_CASH);
    setIsLogoutModalOpen(false);
    setIsProfileModalOpen(false);
    setIsMobileSidebarOpen(false);
    setIsExecutiveMemberView(false);
    setIsLoginModalOpen(true);
    showToast('Berhasil keluar. Silakan masuk kembali.', 'info');
  };

  // 15-minute Inactivity (Idle) Session Timeout Guard
  useEffect(() => {
    if (!session || isLoginModalOpen) {
      setIsIdleWarningOpen(false);
      return;
    }

    const IDLE_LIMIT_MS = 15 * 60 * 1000; // 15 minutes of continuous inactivity
    let lastActivity = Date.now();

    let throttleTimer = false;
    const handleUserInteraction = () => {
      if (throttleTimer) return;
      throttleTimer = true;
      setTimeout(() => { throttleTimer = false; }, 3000);
      lastActivity = Date.now();
    };

    window.addEventListener('mousemove', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);
    window.addEventListener('scroll', handleUserInteraction);
    window.addEventListener('click', handleUserInteraction);

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivity;
      if (elapsed >= IDLE_LIMIT_MS && !isIdleWarningOpen) {
        setIsIdleWarningOpen(true);
        setIdleCountdown(60);
      }
    }, 5000);

    return () => {
      window.removeEventListener('mousemove', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('scroll', handleUserInteraction);
      window.removeEventListener('click', handleUserInteraction);
      clearInterval(checkInterval);
    };
  }, [session, isLoginModalOpen, isIdleWarningOpen]);

  // Handle 60-second countdown when idle warning dialog is open
  useEffect(() => {
    if (!isIdleWarningOpen) return;

    const timer = setInterval(() => {
      setIdleCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsIdleWarningOpen(false);
          confirmLogout();
          showToast(
            isEn ? 'Session automatically logged out due to 15 minutes of inactivity.' : 'Sesi berakhir otomatis demi keamanan data.',
            'info'
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isIdleWarningOpen, isEn]);

  // If user explicitly opened the dedicated Login View OR has no active session
  if (isLoginModalOpen || !session) {
    return (
      <LoginView
        onLoginSuccess={(newSession) => {
          localStorage.removeItem('robotics_has_logged_out');
          handleLogin(newSession);
          setIsLoginModalOpen(false);
        }}
        onBackToDashboard={session ? () => setIsLoginModalOpen(false) : undefined}
      />
    );
  }

  // Check whether active session has member role (General Student Member)
  const isMember = (() => {
    if (!session) return false;
    const canonical = getCanonicalRole(session);
    return canonical === 'member';
  })();

  // Check if member account has verified NISN and birth date credentials
  // Admin role, credentials bypass, and Demo accounts have relaxed restrictions for UI/navigation testing
  const isMemberVerified = Boolean(
    !isMember ||
    session?.isDemo ||
    session?.role?.toLowerCase() === 'admin' ||
    session?.bypassNisnVerification ||
    session?.isVerifiedMember ||
    (session?.nisn && session?.nisn.trim().length >= 8 && session?.birthDate)
  );

  // If account is student member and unverified, display mandatory StudentVerificationModal
  if (isMember && !isMemberVerified) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#312E81] flex items-center justify-center p-4 font-sans overflow-y-auto">
        {/* Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 max-w-md ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20'
                  : toastMessage.type === 'error'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20'
                  : 'bg-slate-900 text-white border-slate-800 shadow-slate-900/20'
              }`}
            >
              {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
              {toastMessage.type === 'info' && <Database className="w-4 h-4 shrink-0" />}
              <span className="leading-snug">{toastMessage.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <StudentVerificationModal
          isOpen={true}
          session={session}
          members={members}
          onVerificationSuccess={(verifiedMember, updatedSession) => {
            setSession(updatedSession);
            try {
              localStorage.setItem('robotics_auth', JSON.stringify(stripSessionToken(updatedSession)));
            } catch {}
            // Update local member roster for synchronized verification status
            setMembers((prev) =>
              prev.map((m) =>
                m.nisn === verifiedMember.nisn || (m.id_member && m.id_member === verifiedMember.id_member)
                  ? { ...m, isVerified: true, birthDate: verifiedMember.birthDate }
                  : m
              )
            );
            showToast(`Student identity for ${verifiedMember.fullName} (NISN: ${verifiedMember.nisn}) has been verified successfully!`, 'success');
          }}
          onSkip={session?.isDemo ? () => {
            const updatedSession: UserSession = {
              ...session,
              isVerifiedMember: true,
            };
            setSession(updatedSession);
            try {
              localStorage.setItem('robotics_auth', JSON.stringify(stripSessionToken(updatedSession)));
            } catch {}
            showToast('Verification skipped temporarily (Demo/Testing mode). You may now access the student portal.', 'info');
          } : undefined}
          onLogout={confirmLogout}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F0F5FA] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 max-w-md ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20'
                : toastMessage.type === 'error'
                ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20'
                : 'bg-[#061838] text-white border-blue-900/80 shadow-blue-950/30'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            {toastMessage.type === 'info' && <Database className="w-4 h-4 shrink-0" />}
            <span className="leading-snug">{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Top Header (hidden on md+) */}
      <MobileHeader
        session={session}
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
        isSupabaseConnected={isSupabaseConnected}
        onOpenSupabaseModal={isAdminView ? () => setIsSupabaseModalOpen(true) : undefined}
        onOpenProfileSettings={() => setIsProfileModalOpen(true)}
        onOpenRoleManagement={isAdminView ? () => setIsRoleManagementOpen(true) : undefined}
        onLogout={handleLogout}
        onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setActiveTab('notifications')}
        activeOrganization={activeOrganization}
      />

      {/* Desktop Left Sidebar & Mobile Drawer (collapsible & responsive) */}
      <Sidebar
        session={session}
        activeTab={activeTab}
        onTabChange={handleSidebarTabSelect}
        membersCount={members.length}
        attendanceCount={attendance.length}
        cashCount={cash.length}
        assignmentsCount={assignmentsCount}
        onOpenProfileSettings={() => setIsProfileModalOpen(true)}
        onOpenRoleManagement={isAdminView ? () => setIsRoleManagementOpen(true) : undefined}
        onLogout={handleLogout}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        isOpenDesktop={isSidebarOpen}
        onToggleDesktop={toggleSidebar}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setActiveTab('notifications')}
        onOpenAnnouncements={() => setActiveTab('announcements')}
        isMemberViewMode={isEligibleForStudentView && isExecutiveMemberView}
        onToggleMemberView={isEligibleForStudentView ? handleToggleExecutiveMemberView : undefined}
      />

      {/* Main Content Area: Scrolls naturally with window while sidebar stays fixed on desktop */}
      <div className={`flex-1 flex flex-col min-w-0 w-full min-h-screen bg-transparent transition-[padding] duration-300 ease-in-out ${isSidebarOpen ? 'md:pl-64' : 'md:pl-0'}`}>
        {/* Desktop & Tablet Top Navigation Bar (md+) */}
        <Navbar
          session={session}
          activeTab={activeTab}
          onTabChange={handleSidebarTabSelect}
          membersCount={members.length}
          attendanceCount={attendance.length}
          cashCount={cash.length}
          assignmentsCount={assignmentsCount}
          isSyncing={isSyncing}
          isSupabaseConnected={isSupabaseConnected}
          onRefreshData={handleSyncAllData}
          onOpenProfileSettings={() => setIsProfileModalOpen(true)}
          onOpenSupabaseModal={isAdminView ? () => setIsSupabaseModalOpen(true) : undefined}
          onOpenRoleManagement={isAdminView ? () => setIsRoleManagementOpen(true) : undefined}
          onOpenNotifications={() => setActiveTab('notifications')}
          unreadNotificationsCount={unreadNotificationsCount}
          onLogout={handleLogout}
          activeOrganization={activeOrganization}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
          displayDateStr={displayDateStr}
          onOpenDateConfig={() => {
            setDateAcademicModalTab('date');
            setIsDateAcademicModalOpen(true);
          }}
          currentTheme={currentTheme}
          onThemeChange={handleThemeChange}
          showAllTabs={false}
          onSessionRoleSwitch={handleSessionRoleSwitch}
          isMemberViewMode={isEligibleForStudentView && isExecutiveMemberView}
          onToggleMemberView={isEligibleForStudentView ? handleToggleExecutiveMemberView : undefined}
        />

        <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-3 sm:py-4 pb-28 sm:pb-32 md:pb-6 min-w-0">

          {/* Executive Member View Banner (Active when inspecting student portal) */}
          {isExecutiveMemberView && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl sm:rounded-3xl border border-sky-200/90 p-3.5 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs mb-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200 text-blue-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm">Student View Active</span>
                    <span className="text-slate-300 select-none" aria-hidden="true">·</span>
                    <span className="text-[11px] text-blue-700 font-bold">
                      Member Portal Preview
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">
                    Viewing application from the Student / Club Member perspective (Self Check-In, Tasks, Calendar).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleExecutiveMemberView}
                className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-95 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>Return to Executive Board</span>
              </button>
            </motion.div>
          )}

          {/* Main Tab Content with Smooth AnimatePresence Transitions */}
          <AnimatePresence mode="wait">

            {/* Tab 0: Admin Dashboard Overview (Protected by Strict AdminRouteGuard) */}
            {activeTab === 'dashboard' && (
              !isAuthorizedForTab('dashboard', session, isEligibleForStudentView && isExecutiveMemberView) ? (
                <AdminRouteGuard
                  session={session}
                  onRedirectToPortal={() => setActiveTab(authorizedTabs[0] || 'attendance')}
                  fallbackTitle={isEn ? "Access Restricted: Executive & Administrator Area" : "Akses Dibatasi: Area Pengurus & Administrator"}
                  fallbackMessage={isEn ? "This summary dashboard is restricted to Advisors, Primary Administrators, and Executive Board officers." : "Dasbor ringkasan ini hanya dapat diakses oleh Pembina, Administrator, dan Pengurus Inti Robotik."}
                >
                  <div />
                </AdminRouteGuard>
              ) : (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-5"
                >
                  <AdminDashboardOverview
                    session={session}
                    members={members}
                    attendance={attendance}
                    cash={cash}
                    announcements={announcements}
                    isSupabaseConnected={isSupabaseConnected}
                    onNavigateToTab={(tab) => {
                      playClickTick();
                      setActiveTab(tab);
                    }}
                    onOpenAddMemberModal={() => {
                      setMemberToEdit(null);
                      setIsMemberFormOpen(true);
                    }}
                    onOpenUniversalUploadModal={() => setIsUniversalUploadOpen(true)}
                    onOpenPreRegistrationModal={() => setIsPreRegistrationOpen(true)}
                    onOpenAnnouncementsModal={() => setActiveTab('announcements')}
                    onOpenAssignmentsModal={() => setActiveTab('assignments')}
                    onOpenRoleManagement={isAdminView ? () => setIsRoleManagementOpen(true) : undefined}
                    onOpenSupabaseModal={isAdminView ? () => setIsSupabaseModalOpen(true) : undefined}
                    onSyncAllData={handleSyncAllData}
                    isSyncing={isSyncing}
                    onShowToast={showToast}
                    onToggleMemberView={isEligibleForStudentView ? handleToggleExecutiveMemberView : undefined}
                    isMemberViewMode={isEligibleForStudentView && isExecutiveMemberView}
                    onQuickSelfAttendance={() => setActiveTab('attendance')}
                  />
                </motion.div>
              )
            )}

            {/* Tab 1: Member Directory (Members) */}
            {activeTab === 'members' && (
              !isAuthorizedForTab('members', session, isEligibleForStudentView && isExecutiveMemberView) ? (
                <AdminRouteGuard
                  session={session}
                  onRedirectToPortal={() => setActiveTab(authorizedTabs[0] || 'attendance')}
                  fallbackTitle={isEn ? "Access Restricted: Member Directory" : "Akses Dibatasi: Direktori Anggota"}
                  fallbackMessage={isEn ? "Student roster and profile records are protected and accessible to Officers and Advisors only." : "Data roster dan informasi anggota dilindungi dan hanya dapat diakses oleh Pengurus dan Pembina."}
                >
                  <div />
                </AdminRouteGuard>
              ) : (
                <motion.div
                  key="members"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-5"
                >
                  <MembersTab
                    members={members}
                    isDemo={Boolean(session?.isDemo)}
                    currentAcademicYear={currentAcademicYear}
                    isAcademicYearAuto={isAcademicYearAuto}
                    onOpenDateAcademicModal={(tab) => {
                      setDateAcademicModalTab(tab || 'academic');
                      setIsDateAcademicModalOpen(true);
                    }}
                    onOpenAddModal={() => {
                      setMemberToEdit(null);
                      setIsMemberFormOpen(true);
                    }}
                    onOpenEditModal={(member) => {
                      setMemberToEdit(member);
                      setIsMemberFormOpen(true);
                    }}
                    onOpenDetailModal={(member) => {
                      setSelectedMemberDetail(member);
                      setIsDetailOpen(true);
                    }}
                    onDeleteMember={handleDeleteMember}
                    onResetDefaultMembers={handleResetDefaultMembers}
                    onClearAllMembers={handleClearAllMembers}
                    onMembersUpdated={(updated) => {
                      setMembers(updated);
                      if (session?.isDemo) {
                        const cleanUser = (session.username || 'demo').trim().toLowerCase();
                        localStorage.setItem(`robotics_demo_sandbox_${cleanUser}_members`, JSON.stringify(updated));
                        showToast(`[Demo Sandbox] Member roster updated (${updated.length} students stored in sandbox).`, 'info');
                        return;
                      }
                      localStorage.setItem('robotics_members', JSON.stringify(updated));
                      if (activeOrgId) {
                        localStorage.setItem(`org_${activeOrgId}_members`, JSON.stringify(updated));
                      }
                      if (session?.username) {
                        const key = getAccountStorageKey(session.username, 'members');
                        localStorage.setItem(key, JSON.stringify(updated));
                      }
                      showToast(`Member roster updated (${updated.length} members enrolled).`, 'success');
                    }}
                    onRefreshData={fetchAllData}
                    isSyncing={isSyncing}
                    currentUserRole={session?.role}
                    session={session}
                    onRoleTitleChange={handleRoleTitleChange}
                    onOpenRoleManagement={isAdminView ? () => setIsRoleManagementOpen(true) : undefined}
                  />
                </motion.div>
              )
            )}

            {/* Tab 2: Attendance Tracking (Attendance) */}
            {activeTab === 'attendance' && (
              <motion.div
                key="attendance"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                {(canonicalRole === 'member' || (isEligibleForStudentView && isExecutiveMemberView)) && session ? (
                  <MemberAttendanceView
                    member={effectiveMemberForSession}
                    session={session}
                    todayDate={activeAttendanceDate}
                    existingAttendance={currentMemberExistingAttendance}
                    onSaveAttendance={async (record) => {
                      await handleAddAttendance(record);
                      showToast(`Attendance recorded: ${record.status}`, 'success');
                    }}
                  />
                ) : (
                  <AttendanceTab
                    members={members}
                    attendance={attendance}
                    activeDate={activeAttendanceDate}
                    isDemo={Boolean(session?.isDemo)}
                    isSubmitting={isSubmitting}
                    onAddAttendance={handleAddAttendance}
                    onBulkAttendance={handleBulkAttendance}
                    onDeleteAttendance={handleDeleteAttendance}
                    onResetMemberAttendance={handleResetMemberAttendance}
                    onResetDateAttendance={handleResetDateAttendance}
                    onResetAllAttendance={handleResetAllAttendance}
                    onAttendanceUpdated={(updated) => {
                      setAttendance(updated);
                      if (session?.isDemo) {
                        const cleanUser = (session.username || 'demo').trim().toLowerCase();
                        localStorage.setItem(`robotics_demo_sandbox_${cleanUser}_attendance`, JSON.stringify(updated));
                        showToast(`[Demo Sandbox] Attendance records updated (${updated.length} entries stored in sandbox).`, 'info');
                        return;
                      }
                      if (activeOrgId) {
                        localStorage.setItem(`org_${activeOrgId}_attendance`, JSON.stringify(updated));
                      }
                      if (session?.username) {
                        const key = getAccountStorageKey(session.username, 'attendance');
                        localStorage.setItem(key, JSON.stringify(updated));
                        if (session.username === 'admin') {
                          localStorage.setItem('robotics_attendance', JSON.stringify(updated));
                        }
                      } else {
                        localStorage.setItem('robotics_attendance', JSON.stringify(updated));
                      }
                      showToast(`Attendance records updated (${updated.length} entries).`, 'success');
                    }}
                    onRefreshData={fetchAllData}
                    isSyncing={isSyncing}
                    currentUserRole={session?.role}
                    session={session}
                    onOpenScheduleConfig={() => {
                      setDateAcademicModalTab('schedule');
                      setIsDateAcademicModalOpen(true);
                    }}
                  />
                )}
              </motion.div>
            )}

            {/* Tab 3: Treasurer Cash Ledger (Cash) - STRICTLY Treasurer & Admin only */}
            {activeTab === 'cash' && (
              !isAuthorizedForTab('cash', session, isEligibleForStudentView && isExecutiveMemberView) ? (
                <AdminRouteGuard
                  session={session}
                  onRedirectToPortal={() => setActiveTab(authorizedTabs[0] || 'attendance')}
                  fallbackTitle={isEn ? "Access Restricted: Club Treasury" : "Akses Dibatasi: Buku Kas & Iuran"}
                  fallbackMessage={isEn ? "Club cash ledger and dues transactions are managed strictly by the Treasurer and Primary Administrator." : "Buku kas dan pencatatan iuran ekskul strictly dikelola oleh Bendahara dan Administrator."}
                >
                  <div />
                </AdminRouteGuard>
              ) : canManageCashData(session) ? (
                <motion.div
                  key="cash"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  id="tab-kas"
                  className="space-y-5"
                >
                  <CashTab
                    members={members}
                    cash={cash}
                    activeMonthKey={activeCashMonthKey}
                    isDemo={Boolean(session?.isDemo)}
                    isSubmitting={isSubmitting}
                    onAddCash={handleAddCash}
                    onBulkAddCash={handleBulkAddCash}
                    onCancelMemberCash={handleCancelMemberCash}
                    onResetPeriodCash={handleResetPeriodCash}
                    onDeleteCash={handleDeleteCash}
                    onDeleteMultipleCash={handleDeleteMultipleCash}
                    onDeleteAllMembersCash={handleDeleteAllMembersCash}
                    onResetAllCash={handleResetAllCash}
                    onCashUpdated={(updated) => {
                      setCash(updated);
                      if (session?.isDemo) {
                        const cleanUser = (session.username || 'demo').trim().toLowerCase();
                        localStorage.setItem(`robotics_demo_sandbox_${cleanUser}_cash`, JSON.stringify(updated));
                        showToast(`[Demo Sandbox] Treasury records updated (${updated.length} transactions stored in sandbox).`, 'info');
                        return;
                      }
                      if (activeOrgId) {
                        localStorage.setItem(`org_${activeOrgId}_cash`, JSON.stringify(updated));
                      }
                      if (session?.username) {
                        const key = getAccountStorageKey(session.username, 'cash');
                        localStorage.setItem(key, JSON.stringify(updated));
                        if (session.username === 'admin') {
                          localStorage.setItem('robotics_cash', JSON.stringify(updated));
                        }
                      } else {
                        localStorage.setItem('robotics_cash', JSON.stringify(updated));
                      }
                      showToast(`Club treasury records updated (${updated.length} transactions).`, 'success');
                    }}
                    onRefreshData={fetchAllData}
                    isSyncing={isSyncing}
                    currentUserRole={session?.role}
                    currentUserTitle={session?.jabatan}
                    session={session}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="cash-restricted"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-6"
                >
                  {/* Category Header matching Canva screenshot 6 */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-sky-600 border-l-2 border-sky-500 pl-2.5 inline-block mb-1">
                      CLUB FINANCES
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      Club Treasury
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      A space for club finance updates.
                    </p>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-2xl mx-auto shadow-sm space-y-4 my-6">
                    <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100">
                      <Wallet className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        No treasury records yet
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                        A balance and transactions are not shown without club-provided records.
                      </p>
                    </div>
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200">
                        Awaiting club records
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            )}

            {/* Tab 4: Activities & Treasury Calendar (Calendar Dashboard) */}
            {activeTab === 'calendar' && (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                <CalendarTab
                  members={members}
                  attendance={attendance}
                  cash={cash}
                  session={session}
                  announcements={announcements}
                  onOpenAnnouncementsModal={() => setIsAnnouncementsOpen(true)}
                  onNavigateToAttendanceDate={(dateStr) => {
                    setActiveAttendanceDate(dateStr);
                    setActiveTab('attendance');
                  }}
                  onNavigateToCashMonth={(monthKey) => {
                    setActiveCashMonthKey(monthKey);
                    setActiveTab('cash');
                  }}
                  onNavigateToAssignments={() => {
                    setActiveTab('assignments');
                  }}
                />
              </motion.div>
            )}

            {/* Tab 5: Assignments & Challenges (Student View for members, Admin Grading for officers/advisors) */}
            {/* Tab 5: Assignments & Challenges */}
            {activeTab === 'assignments' && (
              <motion.div
                key="assignments"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                {(canonicalRole === 'member' || (isEligibleForStudentView && isExecutiveMemberView)) && session ? (
                  <StudentAssignmentsView
                    session={session}
                    onShowToast={showToast}
                    onAssignmentsCountChange={setAssignmentsCount}
                  />
                ) : (
                  <AdminTasksGradingView
                    members={members}
                    session={session}
                    onShowToast={showToast}
                    onAssignmentsCountChange={setAssignmentsCount}
                  />
                )}
              </motion.div>
            )}

            {/* Tab 6: Announcements View matching Canva screenshot 4 */}
            {activeTab === 'announcements' && (
              <motion.div
                key="announcements"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                <AnnouncementsTab
                  announcements={announcements}
                  session={session}
                  onOpenAnnouncementsModal={() => setIsAnnouncementsOpen(true)}
                  onDeleteAnnouncement={handleDeleteAnnouncement}
                  onSaveAnnouncement={async (partial) => {
                    return handleSaveAnnouncement({
                      title: partial.title || '',
                      content: partial.content || '',
                      channel: partial.channel || 'announcements',
                      priority: partial.priority || 'normal',
                      event_date: partial.event_date,
                      location: partial.location,
                    });
                  }}
                />
              </motion.div>
            )}

            {/* Tab 7: Notifications View matching Canva screenshot 8 */}
            {activeTab === 'notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                <NotificationsTab
                  notifications={notifications}
                  session={session}
                  onMarkAsRead={handleMarkAsRead}
                  onMarkAllAsRead={handleMarkAllAsRead}
                  onClearAll={handleClearAllNotifications}
                  onNavigateToTab={(tab) => {
                    setActiveTab(tab);
                  }}
                />
              </motion.div>
            )}

            {/* Tab 8: Settings View matching Canva screenshot 5 */}
            {activeTab === 'settings' && (
              !isAuthorizedForTab('settings', session, isEligibleForStudentView && isExecutiveMemberView) ? (
                <AdminRouteGuard
                  session={session}
                  onRedirectToPortal={() => setActiveTab(authorizedTabs[0] || 'calendar')}
                  fallbackTitle={isEn ? "Access Restricted: Please Log In" : "Akses Dibatasi: Silakan Masuk"}
                  fallbackMessage={isEn ? "Please log in with your club account to configure your personal profile and preferences." : "Silakan masuk dengan akun ekskul Anda untuk mengatur profil pribadi dan preferensi."}
                >
                  <div />
                </AdminRouteGuard>
              ) : (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-5"
                >
                  <SettingsTab
                    session={session}
                    onUpdateSession={setSession}
                    onShowToast={showToast}
                    onOpenProfileModal={() => setIsProfileModalOpen(true)}
                    onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
                    onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
                    showNotificationShortcut={true}
                    currentTheme={currentTheme}
                    onThemeChange={handleThemeChange}
                  />
                </motion.div>
              )
            )}
          </AnimatePresence>
        </main>

        {/* Footer visible across all pages including the main dashboard */}
        <AppFooter 
          variant="simple"
          className="pb-20 md:pb-6" 
        />
      </div>

      {/* Member Form Modal (Add / Edit) */}
      <MemberFormModal
        isOpen={isMemberFormOpen}
        onClose={() => {
          setIsMemberFormOpen(false);
          setMemberToEdit(null);
        }}
        onSave={handleSaveMember}
        memberToEdit={memberToEdit}
        initialData={memberToEdit}
        isSubmitting={isSubmitting}
        session={session}
      />

      {/* Member Detail Modal */}
      <MemberDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedMemberDetail(null);
        }}
        member={selectedMemberDetail}
        attendanceHistory={attendance || []}
        currentUserSession={session}
        canManageRoles={canPromoteUserRole(session)}
        onRoleTitleChange={handleRoleTitleChange}
        onStatusChange={handleMemberStatusChange}
        onEdit={hasPermission(session?.role, 'members:edit') ? (member) => {
          setIsDetailOpen(false);
          setMemberToEdit(member);
          setIsMemberFormOpen(true);
        } : undefined}
      />

      {/* Universal Data Upload Modal (Roster, Attendance, Cash) */}
      <UniversalDataUploadModal
        isOpen={isUniversalUploadOpen}
        onClose={() => setIsUniversalUploadOpen(false)}
        defaultTarget="members"
        existingMembers={members}
        existingCash={cash}
        existingAttendance={attendance}
        isDemo={Boolean(session?.isDemo)}
        session={session}
        onMembersUpdated={(updated) => {
          setMembers(updated);
          localStorage.setItem('robotics_members', JSON.stringify(updated));
          showToast(`Member roster updated (${updated.length} members enrolled).`, 'success');
        }}
        onCashUpdated={(updated) => {
          setCash(updated);
          localStorage.setItem('robotics_cash', JSON.stringify(updated));
          showToast(`Club treasury records updated (${updated.length} transactions).`, 'success');
        }}
        onAttendanceUpdated={(updated) => {
          setAttendance(updated);
          localStorage.setItem('robotics_attendance', JSON.stringify(updated));
          showToast(`Attendance records updated (${updated.length} entries).`, 'success');
        }}
        onShowToast={showToast}
      />

      {/* Profile Settings Modal */}
      {session && (
        <ProfileSettingsModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          session={session}
          onUpdateSession={setSession}
          onShowToast={showToast}
          currentTheme={currentTheme}
          onThemeChange={handleThemeChange}
          activeOrganization={activeOrganization}
          members={members}
          onOpenEditModal={(org) => {
            setIsProfileModalOpen(false);
            setOrgToEdit(org);
            setIsEditOrgModalOpen(true);
          }}
          onOpenRoleManagement={isAdminView ? () => {
            setIsProfileModalOpen(false);
            setIsRoleManagementOpen(true);
          } : undefined}
        />
      )}

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-center relative"
            >
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto shadow-xs">
                <LogOut className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {t.confirmLogoutTitle || (isEn ? "Confirm Sign Out" : "Konfirmasi Keluar")}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isEn 
                    ? `Are you sure you want to sign out of session "${session?.name || 'roboman2'}" and return to login?`
                    : `Apakah Anda yakin ingin keluar dari sesi "${session?.name || 'roboman2'}" dan kembali ke halaman login?`
                  }
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  {t.cancel || (isEn ? "Cancel" : "Batal")}
                </button>
                <button
                  type="button"
                  id="confirmLogoutBtn"
                  onClick={confirmLogout}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition active:scale-95 cursor-pointer"
                >
                  {t.logout || (isEn ? "Sign Out" : "Keluar")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Offline Connectivity Banner */}
      {!isOnline && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900/95 text-amber-300 text-xs font-semibold shadow-2xl border border-amber-500/30 backdrop-blur-md animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>
            {isEn
              ? 'Offline: Network connection lost. Changes will sync once back online.'
              : 'Mode Offline: Koneksi internet terputus. Data akan disinkronkan saat online kembali.'}
          </span>
        </div>
      )}

      {/* Inactivity (Idle) Session Timeout Modal */}
      <IdleTimeoutModal
        isOpen={isIdleWarningOpen}
        countdownSeconds={idleCountdown}
        onStayLoggedIn={() => {
          setIsIdleWarningOpen(false);
          setIdleCountdown(60);
        }}
        onLogoutNow={() => {
          setIsIdleWarningOpen(false);
          confirmLogout();
        }}
      />

      {/* Supabase Setup & Diagnostics Modal (Strictly Primary Administrator Only) */}
      {session && isAdminView && (
        <SupabaseSetupModal
          isOpen={isSupabaseModalOpen}
          onClose={() => setIsSupabaseModalOpen(false)}
          onRefreshData={fetchAllData}
          isTablesCreated={isTablesCreated}
          members={members}
          attendance={attendance}
          cash={cash}
          isDemo={Boolean(session?.isDemo)}
          onShowToast={showToast}
        />
      )}

      {/* Date & Academic Year Configuration Modal */}
      <DateTimeConfigModal
        isOpen={isDateAcademicModalOpen}
        onClose={() => setIsDateAcademicModalOpen(false)}
        config={dateAcademicConfig}
        onSave={handleSaveDateAcademicConfig}
        initialTab={dateAcademicModalTab}
        canConfigure={canConfigureCalendar(session)}
      />

      {/* Persistent Notification Center Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onClearAll={handleClearAllNotifications}
        onDeleteNotification={handleDeleteNotification}
        onNavigateToTab={(tab) => {
          if (tab === 'members' && !canViewMemberDirectory(session)) {
            setActiveTab(authorizedTabs[0] || 'calendar');
          } else if (!isAuthorizedForTab(tab, session, isEligibleForStudentView && isExecutiveMemberView)) {
            setActiveTab(authorizedTabs[0] || 'calendar');
          } else {
            setActiveTab(tab);
          }
          setIsNotificationModalOpen(false);
        }}
      />

      {/* RBAC Role & Access Control Management Modal (Admin View Only) */}
      {session && isAdminView && (
        <RoleManagementModal
          isOpen={isRoleManagementOpen}
          onClose={() => setIsRoleManagementOpen(false)}
          currentUserSession={session}
          onSessionRoleSwitch={handleSessionRoleSwitch}
          onRefreshData={fetchAllData}
        />
      )}

      {/* Organization & Enrollment Modals */}
      <EditOrganizationModal
        isOpen={isEditOrgModalOpen}
        onClose={() => {
          setIsEditOrgModalOpen(false);
          setOrgToEdit(null);
        }}
        organization={orgToEdit || activeOrganization}
        onSave={handleSaveOrgCustomization}
        onResetOrgData={handleResetOrgData}
        currentUserRole={session?.role}
        session={session}
      />

      {/* Admin Pre-Registration CSV Staging Modal */}
      <AdminPreRegistrationModal
        isOpen={isPreRegistrationOpen}
        onClose={() => setIsPreRegistrationOpen(false)}
        onShowToast={showToast}
        session={session}
      />

      {/* Announcements & Agenda Modal */}
      <AnnouncementsModal
        isOpen={isAnnouncementsOpen}
        onClose={() => setIsAnnouncementsOpen(false)}
        onShowToast={showToast}
        session={session}
      />

    </div>
  );
}
