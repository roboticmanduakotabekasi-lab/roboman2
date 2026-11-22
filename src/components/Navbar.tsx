import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  LogOut, 
  RefreshCw, 
  Check, 
  Settings, 
  ShieldCheck, 
  Bell, 
  Calendar, 
  ChevronDown, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Menu,
  ArrowLeft,
  UserCheck,
  Shield,
  MoreHorizontal,
  Database,
  SlidersHorizontal,
  Info,
  Maximize,
  Minimize
} from 'lucide-react';
import { motion } from 'motion/react';
import { UserSession, MainTabType } from '../types';
import { ThemeColor, THEMES } from '../utils/theme';
import { Organization } from '../utils/organizerStore';
import { 
  getCanonicalRole, 
  CanonicalUserRole, 
  getRoleMetadata, 
  canConfigureCalendar, 
  isExecutiveOrAdvisor, 
  hasSessionPermission,
  AppRole,
  PRIMARY_APP_ROLES,
  ROLE_DEFINITIONS,
  normalizeRole,
  getRoleAuthoritiesSummary,
  isHeadAdmin
} from '../utils/rbac';
import { playClickTick } from '../utils/audioFeedback';
import { useLanguage } from '../utils/i18n';
import { LanguageToggle } from './LanguageToggle';

export interface NavbarProps {
  session: UserSession | null;
  activeTab?: MainTabType;
  onTabChange?: (tab: MainTabType) => void;
  membersCount?: number;
  attendanceCount?: number;
  cashCount?: number;
  assignmentsCount?: number;
  isSyncing?: boolean;
  isSupabaseConnected?: boolean;
  onRefreshData?: () => Promise<void> | void;
  onOpenProfileSettings?: () => void;
  onOpenSupabaseModal?: () => void;
  onOpenRoleManagement?: () => void;
  onSessionRoleSwitch?: (role: AppRole) => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  onLogout?: () => void;
  // Layout & Contextual Navigation
  activeOrganization?: Organization;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  displayDateStr?: string;
  onOpenDateConfig?: () => void;
  // Theme & Appearance
  currentTheme?: ThemeColor;
  onThemeChange?: (theme: ThemeColor) => void;
  showAllTabs?: boolean;
  className?: string;
  // Executive Member View Mode toggle
  isMemberViewMode?: boolean;
  onToggleMemberView?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  activeTab = 'dashboard',
  onTabChange,
  membersCount = 0,
  attendanceCount = 0,
  cashCount = 0,
  assignmentsCount = 0,
  isSyncing = false,
  isSupabaseConnected = true,
  onRefreshData,
  onOpenProfileSettings,
  onOpenSupabaseModal,
  onOpenRoleManagement,
  onSessionRoleSwitch,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onLogout,
  activeOrganization,
  isSidebarOpen,
  onToggleSidebar,
  displayDateStr,
  onOpenDateConfig,
  currentTheme = 'indigo',
  showAllTabs = false,
  className = '',
  isMemberViewMode = false,
  onToggleMemberView,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const themeConfig = THEMES[currentTheme] || THEMES.indigo;
  const { language, t } = useLanguage();
  const isEn = language === 'en';

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    playClickTick();
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch {}
  };

  // Outside click listener for More Actions and Role Dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };
    if (isMoreMenuOpen || isRoleMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMoreMenuOpen, isRoleMenuOpen]);

  // Resolve role dynamically (admin, executive_board, advisor, member)
  const canonicalRole: CanonicalUserRole = getCanonicalRole(session);
  const isStrictAdmin = isHeadAdmin(session) && !isMemberViewMode;
  const isAdmin = (canonicalRole === 'admin' || isHeadAdmin(session) || session?.username === 'admin') && !isMemberViewMode;
  const canAdminCalendar = canConfigureCalendar(session) && Boolean(onOpenDateConfig);
  const canConfigureDB = isStrictAdmin && Boolean(onOpenSupabaseModal);
  const canManageRoles = isAdmin && Boolean(onOpenRoleManagement);

  const handleRefreshClick = async () => {
    if (!onRefreshData || isSyncing) return;
    playClickTick();
    try {
      await onRefreshData();
      setJustRefreshed(true);
      setTimeout(() => setJustRefreshed(false), 2000);
    } catch (e) {
      console.error('Navbar refresh error:', e);
    }
  };

  const getBreadcrumbLabel = (tabKey: string | undefined): string => {
    if (!tabKey) return isEn ? 'Dashboard' : 'Dasbor';
    switch (tabKey) {
      case 'dashboard': return isEn ? 'Dashboard' : 'Dasbor';
      case 'members': return isEn ? 'Member Directory' : 'Daftar Anggota';
      case 'attendance': return isEn ? 'Daily Attendance' : 'Presensi Harian';
      case 'assignments': return isEn ? 'Tasks & Evaluation' : 'Tugas & Nilai';
      case 'cash': return isEn ? 'Club Treasury' : 'Buku Kas';
      case 'calendar': return isEn ? 'Activity Calendar' : 'Jadwal Kegiatan';
      default: return tabKey;
    }
  };

  return (
    <header className={`hidden md:block sticky top-0 z-20 w-full bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-xs select-none ${className}`}>
      <div className="w-full px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-10 md:h-11 gap-2.5">
          
          {/* ========================================================= */}
          {/* LEFT: Sidebar Toggle + Brand Identity + Active Section    */}
          {/* ========================================================= */}
          <div className="flex items-center gap-2 min-w-0">
            {/* Sidebar Toggle Button (Desktop & Tablet) */}
            {onToggleSidebar && (
              <button
                type="button"
                id="navbarSidebarToggleBtn"
                onClick={() => {
                  playClickTick();
                  onToggleSidebar();
                }}
                className={`w-7.5 h-7.5 flex items-center justify-center rounded-lg border transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0 ${
                  isSidebarOpen
                    ? 'border-sky-200/90 bg-white hover:bg-sky-50 text-slate-700 hover:text-blue-700'
                    : 'border-blue-300 bg-blue-50/90 hover:bg-blue-100 text-blue-700 shadow-xs'
                }`}
                title={isSidebarOpen ? (isEn ? 'Close Sidebar (Ctrl+B)' : 'Tutup Sidebar (Ctrl+B)') : (isEn ? 'Open Sidebar (Ctrl+B)' : 'Buka Sidebar (Ctrl+B)')}
                aria-label={isSidebarOpen ? 'Close Navigation Sidebar' : 'Open Navigation Sidebar'}
              >
                <Menu className="w-4 h-4 text-slate-700 hover:text-slate-900" />
              </button>
            )}

            {/* App Brand Title */}
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold tracking-tight min-w-0">
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight shrink-0 flex items-center">
                <span>roboman</span>
                <span className="text-blue-600 font-black">2</span>
              </span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT: Top Navbar Actions                                 */}
          {/* ========================================================= */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Role & Authority Indicator & Interactive RBAC Switcher (Admin view only) */}
            {isAdmin && (
              <div className="relative" ref={roleMenuRef}>
                <button
                  type="button"
                  id="navbarRoleAuthorityBtn"
                  onClick={() => {
                    playClickTick();
                    setIsRoleMenuOpen(!isRoleMenuOpen);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold transition cursor-pointer shadow-2xs active:scale-95 ${
                    isRoleMenuOpen 
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-200 hover:border-blue-300'
                  }`}
                  title={isEn ? "Role & Authority (RBAC)" : "Peran & Otoritas (RBAC)"}
                  aria-expanded={isRoleMenuOpen}
                >
                  <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isRoleMenuOpen ? 'text-white' : 'text-blue-600'}`} />
                  <span className="truncate max-w-[120px]">
                    {getRoleMetadata(session?.role).shortTitle || 'Admin'}
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isRoleMenuOpen ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                </button>

                {/* Role & Authority Dropdown */}
                {isRoleMenuOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-800">
                    {/* Active Role Header */}
                    <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                          {isEn ? 'Current Role & Authority' : 'Peran & Otoritas Aktif'}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                          <span className="text-blue-600">✦</span>
                          <span>{getRoleMetadata(session?.role).label}</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {getRoleMetadata(session?.role).description}
                        </p>
                      </div>
                    </div>

                    {/* Dynamic Permissions Summary Badges */}
                    <div className="py-2.5 border-b border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          {isEn ? 'Active Authorities (Module Permissions)' : 'Otoritas & Hak Akses Modul'}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                          {getRoleAuthoritiesSummary(session, language).filter(a => a.allowed).length}/6 {isEn ? 'Modules' : 'Modul'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {getRoleAuthoritiesSummary(session, language).map((auth) => (
                          <div
                            key={auth.key}
                            className={`px-2 py-1.5 rounded-xl border text-[10px] font-semibold flex flex-col justify-between ${auth.colorClass}`}
                            title={auth.statusText}
                          >
                            <span className="truncate block font-bold">{auth.title}</span>
                            <span className="text-[9px] opacity-90 truncate">{auth.badge}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Role Simulation / Switcher (All 8 Roles Complete) */}
                    {onSessionRoleSwitch && (
                      <div className="py-2.5 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            {isEn ? 'Simulate Role (Test Access)' : 'Coba Simulasi Peran (Cek Otoritas)'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">{isEn ? '8 Roles' : '8 Peran'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                          {[
                            { key: 'admin' as AppRole, label: isEn ? '👑 Administrator' : '👑 Administrator', scope: isEn ? 'Full Super-Admin' : 'Super-Admin Penuh' },
                            { key: 'pembina' as AppRole, label: isEn ? '🛡️ Faculty Advisor' : '🛡️ Guru Pembina', scope: isEn ? 'Supervision & Audit' : 'Supervisi & Audit' },
                            { key: 'ketua' as AppRole, label: isEn ? '⚡ President' : '⚡ Ketua Ekskul', scope: isEn ? 'Leadership & Ops' : 'Pimpinan & Tim' },
                            { key: 'bph' as AppRole, label: isEn ? '⭐ Vice President' : '⭐ Wakil Ketua', scope: isEn ? 'VP & Coordination' : 'Wakil & Koordinasi' },
                            { key: 'sekretaris' as AppRole, label: isEn ? '📝 Secretary' : '📝 Sekretaris', scope: isEn ? 'Attendance & Notices' : 'Presensi & Dokumen' },
                            { key: 'bendahara' as AppRole, label: isEn ? '💰 Treasurer' : '💰 Bendahara', scope: isEn ? 'Cashbook & Dues' : 'Kas & Keuangan' },
                            { key: 'pr' as AppRole, label: isEn ? '📣 Public Relations' : '📣 Humas', scope: isEn ? 'Broadcasts & PR' : 'Pengumuman & Humas' },
                            { key: 'anggota' as AppRole, label: isEn ? '👤 Student Member' : '👤 Anggota Siswa', scope: isEn ? 'Self Check-in & Tasks' : 'Presensi Mandiri' },
                          ].map((r) => {
                            const isActive = normalizeRole(session?.role) === r.key;
                            return (
                              <button
                                key={r.key}
                                type="button"
                                onClick={() => {
                                  playClickTick();
                                  onSessionRoleSwitch(r.key);
                                  setIsRoleMenuOpen(false);
                                }}
                                className={`p-2 rounded-xl text-left transition cursor-pointer flex items-center justify-between border ${
                                  isActive
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 hover:text-blue-700 border-slate-200/80'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="block text-xs font-bold truncate">{r.label}</span>
                                  <span className={`block text-[9px] truncate ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                                    {r.scope}
                                  </span>
                                </div>
                                {isActive && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Open Comprehensive Role Management Modal */}
                    {onOpenRoleManagement && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            playClickTick();
                            setIsRoleMenuOpen(false);
                            onOpenRoleManagement();
                          }}
                          className="w-full py-2 px-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-indigo-200/80 shadow-2xs"
                        >
                          <ShieldCheck className="w-4 h-4 text-indigo-600" />
                          <span>{isEn ? 'Manage All Roles & RBAC Matrix' : 'Kelola Seluruh Role & Matriks Otoritas'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              id="navbarFullscreenToggleBtn"
              onClick={handleToggleFullscreen}
              className="w-7.5 h-7.5 flex items-center justify-center rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title={isFullscreen ? (isEn ? "Exit Fullscreen" : "Keluar Layar Penuh") : (isEn ? "Fullscreen View" : "Tampilan Layar Penuh")}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <Maximize className="w-3.5 h-3.5 text-slate-600" />
              )}
            </button>

            {/* Quick Settings Shortcut Button */}
            {session && onTabChange && (
              <button
                type="button"
                id="navbarSettingsShortcutBtn"
                onClick={() => {
                  playClickTick();
                  onTabChange('settings');
                }}
                className={`w-7.5 h-7.5 flex items-center justify-center rounded-lg border transition cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600'
                }`}
                title={isEn ? "Account & Workspace Settings" : "Setelan Akun & Aplikasi"}
                aria-label="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Language Switcher */}
            <LanguageToggle variant="compact" />

            {/* Direct Logout Button */}
            {onLogout && (
              <button
                type="button"
                id="navbarDirectLogoutBtn"
                onClick={() => {
                  playClickTick();
                  onLogout();
                }}
                className="w-7.5 h-7.5 flex items-center justify-center rounded-lg border border-rose-200/90 bg-white hover:bg-rose-50 text-rose-600 transition cursor-pointer shadow-2xs active:scale-95 shrink-0"
                title={isEn ? "Log Out to Login Page" : "Keluar ke Halaman Login"}
                aria-label="Log Out"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
              </button>
            )}

            {/* Consolidated Secondary Actions: "More" Dropdown Menu */}
            {(canAdminCalendar || canConfigureDB || canManageRoles) && (
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  id="navbarMoreActionsBtn"
                  onClick={() => {
                    playClickTick();
                    setIsMoreMenuOpen(!isMoreMenuOpen);
                  }}
                  className={`w-7.5 h-7.5 flex items-center justify-center rounded-lg border text-slate-600 transition cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
                    isMoreMenuOpen ? 'bg-slate-100 border-slate-300 text-slate-900 font-bold' : 'bg-white hover:bg-slate-50 border-slate-200/90'
                  }`}
                  title={isEn ? "More Management Tools" : "Alat & Pengaturan Tambahan"}
                  aria-label="More Management Tools"
                  aria-expanded={isMoreMenuOpen}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>

                {/* Dropdown Menu Panel */}
                {isMoreMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {isEn ? 'Management Tools' : 'Menu Manajemen'}
                      </span>
                    </div>

                    <div className="py-1 space-y-0.5">
                      {/* Date & Calendar Config */}
                      {canAdminCalendar && onOpenDateConfig && (
                        <button
                          type="button"
                          onClick={() => {
                            playClickTick();
                            setIsMoreMenuOpen(false);
                            onOpenDateConfig();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition text-left cursor-pointer"
                        >
                          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="block font-semibold truncate">
                              {isEn ? 'Academic Calendar & Date' : 'Atur Kalender & Tanggal'}
                            </span>
                            {displayDateStr && (
                              <span className="block text-[10px] font-mono text-slate-400 truncate">
                                {displayDateStr}
                              </span>
                            )}
                          </div>
                        </button>
                      )}

                      {/* RBAC Role Management */}
                      {canManageRoles && onOpenRoleManagement && (
                        <button
                          type="button"
                          onClick={() => {
                            playClickTick();
                            setIsMoreMenuOpen(false);
                            onOpenRoleManagement();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition text-left cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="block font-semibold truncate">
                              {isEn ? 'RBAC Role Management' : 'Manajemen Hak Akses (RBAC)'}
                            </span>
                            <span className="block text-[10px] text-slate-400 truncate">
                              {isEn ? 'Officer and member permissions' : 'Izin pengurus & siswa'}
                            </span>
                          </div>
                        </button>
                      )}

                      {/* Database Credentials & Config */}
                      {canConfigureDB && onOpenSupabaseModal && (
                        <button
                          type="button"
                          onClick={() => {
                            playClickTick();
                            setIsMoreMenuOpen(false);
                            onOpenSupabaseModal();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition text-left cursor-pointer"
                        >
                          <Database className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="block font-semibold truncate">
                              {isEn ? 'Supabase Database Config' : 'Konfigurasi Database Cloud'}
                            </span>
                            <span className="block text-[10px] text-slate-400 truncate">
                              {isSupabaseConnected ? (isEn ? 'Live Connected' : 'Terhubung Langsung') : (isEn ? 'Local Storage Mode' : 'Mode Offline')}
                            </span>
                          </div>
                        </button>
                      )}

                      {/* Log Out to Login Page */}
                      {onLogout && (
                        <div className="pt-1 mt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              playClickTick();
                              setIsMoreMenuOpen(false);
                              onLogout();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition text-left cursor-pointer"
                          >
                            <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="block truncate">
                                {isEn ? 'Log Out to Login' : 'Keluar ke Halaman Login'}
                              </span>
                              <span className="block text-[10px] text-slate-400 truncate">
                                {isEn ? 'End session and switch account' : 'Akhiri sesi & ganti akun'}
                              </span>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
