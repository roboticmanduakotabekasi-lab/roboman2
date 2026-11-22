import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  CheckSquare, 
  Calendar, 
  Megaphone, 
  Bell, 
  Wallet, 
  Settings, 
  LogOut, 
  LogIn, 
  X, 
  PanelLeftClose, 
  Menu,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserSession, MainTabType } from '../types';
import { playClickTick } from '../utils/audioFeedback';
import { 
  getRoleMetadata, 
  getCanonicalRole, 
  isExecutiveOrAdvisor,
  normalizeRole,
  getRoleAuthoritiesSummary,
  getAuthorizedTabs
} from '../utils/rbac';

import { useLanguage } from '../utils/i18n';

export interface SidebarProps {
  session: UserSession | null;
  activeTab: MainTabType;
  onTabChange: (tab: MainTabType) => void;
  membersCount?: number;
  attendanceCount?: number;
  cashCount?: number;
  assignmentsCount?: number;
  onOpenProfileSettings?: () => void;
  onOpenRoleManagement?: () => void;
  onLogout: () => void;
  isOpenDesktop?: boolean;
  onToggleDesktop?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  onOpenAnnouncements?: () => void;
  onOpenLogin?: () => void;
  isMemberViewMode?: boolean;
  onToggleMemberView?: () => void;
}

interface NavItemDef {
  id: string;
  tabKey: MainTabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number | null;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  session,
  activeTab,
  onTabChange,
  membersCount = 0,
  attendanceCount = 0,
  cashCount = 0,
  assignmentsCount,
  onOpenProfileSettings,
  onOpenRoleManagement,
  onLogout,
  isOpenDesktop = true,
  onToggleDesktop,
  isMobileOpen = false,
  onCloseMobile,
  unreadNotificationsCount = 2,
  onOpenNotifications,
  onOpenAnnouncements,
  onOpenLogin,
  isMemberViewMode = false,
  onToggleMemberView,
}) => {
  const { language, t } = useLanguage();
  const isEn = language === 'en';

  const canonicalRole = getCanonicalRole(session);
  const isStudentPortal = canonicalRole === 'member' || isMemberViewMode;
  const isAdmin = (canonicalRole === 'admin' || session?.role?.toLowerCase() === 'admin' || session?.username === 'admin') && !isMemberViewMode;
  const authorizedTabs = getAuthorizedTabs(session, isMemberViewMode);

  // Exact 9 items matching Canva navigation hierarchy, strictly filtered by role authority and localized
  const allNavItems: NavItemDef[] = [
    {
      id: 'sidebarDashboard',
      tabKey: 'dashboard',
      label: t.tabDashboard,
      icon: LayoutDashboard,
    },
    {
      id: 'sidebarMembers',
      tabKey: 'members',
      label: t.tabMembers,
      icon: Users,
      count: membersCount > 0 ? membersCount : undefined,
    },
    {
      id: 'sidebarAttendance',
      tabKey: 'attendance',
      label: isStudentPortal ? t.myAttendance : t.tabAttendance,
      icon: CalendarCheck,
      count: attendanceCount > 0 ? attendanceCount : undefined,
    },
    {
      id: 'sidebarTasks',
      tabKey: 'assignments',
      label: isStudentPortal ? (isEn ? 'Tasks & Materials' : 'Tugas & Materi') : t.tabAssignments,
      icon: CheckSquare,
      count: assignmentsCount && assignmentsCount > 0 ? assignmentsCount : undefined,
    },
    {
      id: 'sidebarCalendar',
      tabKey: 'calendar',
      label: t.tabCalendar,
      icon: Calendar,
    },
    {
      id: 'sidebarAnnouncements',
      tabKey: 'announcements',
      label: t.tabAnnouncements,
      icon: Megaphone,
    },
    {
      id: 'sidebarNotifications',
      tabKey: 'notifications',
      label: t.tabNotifications,
      icon: Bell,
      count: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    {
      id: 'sidebarTreasury',
      tabKey: 'cash',
      label: t.tabCash,
      icon: Wallet,
      count: cashCount > 0 ? cashCount : undefined,
    },
    {
      id: 'sidebarSettings',
      tabKey: 'settings',
      label: t.tabSettings,
      icon: Settings,
    },
  ];

  // Strictly filter items to only appear according to authority (no mixing across roles!)
  const navItems: NavItemDef[] = allNavItems.filter((item) => authorizedTabs.includes(item.tabKey));

  const renderContent = (isMobile = false) => {
    return (
      <div className="flex flex-col h-full justify-between overflow-y-auto select-none bg-gradient-to-b from-[#081226] via-[#0E2044] to-[#163166] text-white p-4">
        {/* Top Header & Navigation */}
        <div className="space-y-4">
          {/* Brand header with circular mascot matching Canva screenshot */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl border border-sky-400/40 overflow-hidden shadow-md shrink-0 bg-white p-0.5">
                <img
                  src="/assets/aistudio/Gemini_Generated_Image_aay230aay230aay2_dccf3432.jpg"
                  alt="Official Robot Mascot"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-white font-extrabold text-base tracking-tight leading-tight truncate">
                  roboman<span className="text-sky-300">2</span>
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-sky-200/90 truncate">
                  {isEn ? 'ROBOTICS CLUB' : 'KLUB ROBOTIKA'}
                </p>
              </div>
            </div>

            {/* Mobile / Desktop collapse toggle */}
            {isMobile ? (
              <button
                type="button"
                onClick={() => {
                  playClickTick();
                  onCloseMobile?.();
                }}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  playClickTick();
                  onToggleDesktop?.();
                }}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-sky-200 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
                title={isEn ? "Close sidebar" : "Tutup sidebar"}
                aria-label={isEn ? "Close sidebar" : "Tutup sidebar"}
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Section Kicker matching Canva screenshot */}
          <div className="px-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-sky-200/70">
              {isEn ? 'CLUB SPACE' : 'RUANG KERJA'}
            </span>
          </div>

          {/* Navigation Items - Strictly Filtered By Authority */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.tabKey;

              return (
                <button
                  key={`${isMobile ? 'm-' : ''}${item.tabKey}`}
                  id={item.id}
                  type="button"
                  onClick={() => {
                    playClickTick();
                    onTabChange(item.tabKey);
                    if (isMobile) onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#EBF7F8] text-[#0A6C7E] font-extrabold shadow-sm scale-[1.01]'
                      : 'text-sky-100/90 hover:text-white hover:bg-white/10 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#0A6C7E]' : 'text-sky-200'
                    }`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold leading-none shrink-0 ${
                        isActive
                          ? 'bg-[#0A6C7E] text-white'
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Unauthenticated sign in button (only shown if not signed in) */}
            {!session && (
              <button
                type="button"
                id="sidebarLoginBtn"
                onClick={() => {
                  playClickTick();
                  if (isMobile) onCloseMobile?.();
                  if (onOpenLogin) onOpenLogin();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs text-sky-100 hover:text-white hover:bg-white/10 font-medium transition cursor-pointer mt-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LogIn className="w-4 h-4 text-sky-200 shrink-0" />
                  <span className="truncate">{t.login}</span>
                </div>
              </button>
            )}
          </nav>

          {/* Quick Student View Switcher (Only for Executive Officers to test student view) */}
          {canonicalRole !== 'admin' && canonicalRole !== 'advisor' && isExecutiveOrAdvisor(session) && onToggleMemberView && (
            <div className="pt-2 px-1">
              <button
                type="button"
                onClick={() => {
                  playClickTick();
                  if (isMobile) onCloseMobile?.();
                  onToggleMemberView();
                }}
                className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-sky-100 flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Shield className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isMemberViewMode ? t.executiveMode : t.studentViewMode}</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/20 text-white font-mono">
                  {isMemberViewMode ? (isEn ? 'Active' : 'Aktif') : (isEn ? 'Switch' : 'Ubah')}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Role & Authority Card - Dedicated single authority control (No duplicate buttons) */}
        {isAdmin ? (
          <div className="pt-3 space-y-2">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-white border border-white/15 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200">
                  {t.activeRoleAndAuthority}
                </span>
                {session?.isDemo && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-400/30 text-amber-200 text-[9px] font-bold">
                    Sandbox
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-400/20 border border-sky-300/30 flex items-center justify-center text-xs shrink-0">
                  <ShieldCheck className="w-4 h-4 text-sky-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-extrabold truncate text-white leading-tight">
                    {getRoleMetadata(session?.role).label}
                  </h4>
                  <p className="text-[10px] text-sky-200/80 truncate mt-0.5">
                    {getRoleAuthoritiesSummary(session, language).filter(a => a.allowed).length} {isEn ? 'of 6 modules authorized' : 'dari 6 modul berwenang'}
                  </p>
                </div>
              </div>
              {onOpenRoleManagement && (
                <button
                  type="button"
                  id="sidebarRoleManagementCardBtn"
                  onClick={() => {
                    playClickTick();
                    if (isMobile) onCloseMobile?.();
                    onOpenRoleManagement();
                  }}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{t.viewAuthorityMatrix}</span>
                  <span className="text-sky-300">→</span>
                </button>
              )}
            </div>

            {/* Clean, dedicated Sign Out button for authenticated session */}
            {session && (
              <button
                type="button"
                id="sidebarLogoutBtn"
                onClick={() => {
                  playClickTick();
                  if (isMobile) onCloseMobile?.();
                  onLogout();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-rose-200 hover:text-white hover:bg-rose-500/20 font-medium transition cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <LogOut className="w-4 h-4 text-rose-300 shrink-0" />
                  <span className="truncate">{t.logout}</span>
                </div>
                <span className="text-[10px] font-mono text-rose-300/80">@{session.username}</span>
              </button>
            )}
          </div>
        ) : session ? (
          <div className="pt-3 space-y-2">
            <div 
              onClick={() => {
                playClickTick();
                if (isMobile) onCloseMobile?.();
                onTabChange('settings');
              }}
              className="bg-white/5 hover:bg-white/10 cursor-pointer backdrop-blur-xs rounded-2xl p-3 text-white border border-white/10 flex items-center justify-between gap-2.5 transition group"
              title={isEn ? "Open Settings" : "Buka Pengaturan"}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-xs font-bold text-sky-200 shrink-0">
                  {session.name ? session.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold truncate text-white group-hover:text-sky-200 transition">
                    {session.name}
                  </h4>
                  <p className="text-[10px] text-sky-200/70 truncate">
                    {session.role || 'Member'}
                  </p>
                </div>
              </div>
              <Settings className="w-4 h-4 text-sky-300/70 group-hover:text-white shrink-0 transition" />
            </div>

            {/* Sign Out for members and officers */}
            <button
              type="button"
              id="sidebarLogoutBtnMember"
              onClick={() => {
                playClickTick();
                if (isMobile) onCloseMobile?.();
                onLogout();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-rose-200 hover:text-white hover:bg-rose-500/20 font-medium transition cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <LogOut className="w-4 h-4 text-rose-300 shrink-0" />
                <span className="truncate">{t.logout}</span>
              </div>
              <span className="text-[10px] font-mono text-rose-300/80">@{session.username}</span>
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {/* Desktop & Tablet Fixed Sidebar (Stays pinned when dashboard scrolls) */}
      <aside
        className={`hidden md:block fixed top-0 left-0 bottom-0 z-30 transition-[width,opacity] duration-300 ease-in-out ${
          isOpenDesktop
            ? 'w-64 opacity-100 border-r border-sky-900/20 shadow-md'
            : 'w-0 opacity-0 pointer-events-none border-r-0 overflow-hidden'
        }`}
      >
        <div className="w-64 h-full overflow-y-auto">
          {renderContent(false)}
        </div>
      </aside>

      {/* Mobile Backdrop & Drawer (< md) */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Slide-in Drawer */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10"
            >
              {renderContent(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
