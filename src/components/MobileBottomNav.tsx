import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  Wallet, 
  BookOpen, 
  CalendarDays,
  Settings,
  Menu
} from 'lucide-react';
import { MainTabType, UserSession } from '../types';
import { playClickTick } from '../utils/audioFeedback';
import { getCanonicalRole, CanonicalUserRole, isHeadAdmin, isTreasurer, getAuthorizedTabs } from '../utils/rbac';

import { useLanguage } from '../utils/i18n';

interface MobileBottomNavProps {
  session: UserSession | null;
  activeTab: MainTabType;
  onTabChange: (tab: MainTabType) => void;
  onOpenMobileMenu?: () => void;
  membersCount?: number;
  attendanceCount?: number;
  cashCount?: number;
  assignmentsCount?: number;
  isMemberViewMode?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  session,
  activeTab,
  onTabChange,
  onOpenMobileMenu,
  membersCount = 0,
  attendanceCount = 0,
  cashCount = 0,
  assignmentsCount = 0,
  isMemberViewMode = false,
}) => {
  const canonicalRole: CanonicalUserRole = getCanonicalRole(session);
  const authorizedTabs = getAuthorizedTabs(session, isMemberViewMode);
  const { language } = useLanguage();
  const isEn = language === 'en';

  // Configure navigation buttons based on authority and language
  const navItems = React.useMemo(() => {
    const isStudent = canonicalRole === 'member' || (canonicalRole !== 'admin' && canonicalRole !== 'advisor' && isMemberViewMode);

    if (isStudent) {
      return [
        {
          tab: 'attendance' as MainTabType,
          label: isEn ? 'Attendance' : 'Presensi',
          icon: CalendarCheck,
          badge: attendanceCount > 0 ? attendanceCount : null,
        },
        {
          tab: 'assignments' as MainTabType,
          label: isEn ? 'Tasks' : 'Tugas',
          icon: BookOpen,
          badge: assignmentsCount > 0 ? assignmentsCount : null,
        },
        {
          tab: 'calendar' as MainTabType,
          label: isEn ? 'Schedule' : 'Jadwal',
          icon: CalendarDays,
          badge: null,
        },
        {
          tab: 'settings' as MainTabType,
          label: isEn ? 'Settings' : 'Setelan',
          icon: Settings,
          badge: null,
        },
      ];
    }

    // Role-tailored items for officers / admin
    const candidateItems: { tab: MainTabType; label: string; icon: any; badge: any }[] = [
      {
        tab: 'dashboard' as MainTabType,
        label: isEn ? 'Dashboard' : 'Beranda',
        icon: LayoutDashboard,
        badge: null,
      },
      {
        tab: 'cash' as MainTabType,
        label: isEn ? 'Treasury' : 'Buku Kas',
        icon: Wallet,
        badge: cashCount > 0 ? (cashCount > 99 ? '99+' : cashCount) : null,
      },
      {
        tab: 'members' as MainTabType,
        label: isEn ? 'Members' : 'Anggota',
        icon: Users,
        badge: membersCount > 0 ? (membersCount > 99 ? '99+' : membersCount) : null,
      },
      {
        tab: 'attendance' as MainTabType,
        label: isEn ? 'Attendance' : 'Presensi',
        icon: CalendarCheck,
        badge: attendanceCount > 0 ? attendanceCount : null,
      },
      {
        tab: 'assignments' as MainTabType,
        label: isEn ? 'Tasks' : 'Tugas',
        icon: BookOpen,
        badge: assignmentsCount > 0 ? assignmentsCount : null,
      },
      {
        tab: 'settings' as MainTabType,
        label: isEn ? 'Settings' : 'Setelan',
        icon: Settings,
        badge: null,
      },
      {
        tab: 'calendar' as MainTabType,
        label: isEn ? 'Schedule' : 'Jadwal',
        icon: CalendarDays,
        badge: null,
      },
    ];

    // Filter strictly to tabs authorized for this session, max 4 items on mobile
    return candidateItems
      .filter((item) => authorizedTabs.includes(item.tab))
      .slice(0, 4);
  }, [canonicalRole, isMemberViewMode, authorizedTabs, isEn, membersCount, attendanceCount, cashCount, assignmentsCount]);

  return (
    <nav 
      aria-label="Mobile Navigation Bar" 
      className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-md px-2 py-1.5 select-none max-w-lg mx-auto"
      style={{ paddingBottom: 'max(0.45rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.tab;
          const Icon = item.icon;

          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => {
                playClickTick();
                onTabChange(item.tab);
              }}
              className={`relative flex flex-col items-center justify-center flex-1 min-h-[46px] min-w-[44px] py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer active:scale-95 ${
                isActive
                  ? 'text-blue-700 font-bold bg-blue-50 border border-blue-200/80 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium border border-transparent'
              }`}
            >
              {/* Icon Container with Badge */}
              <div className="relative flex items-center justify-center">
                <Icon className={`w-4.5 h-4.5 transition-transform duration-150 ${isActive ? 'scale-105 text-blue-600' : 'text-slate-500'}`} />
                {item.badge !== null && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-1 rounded-full bg-blue-600 text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-2xs">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={`text-[10px] tracking-tight mt-1 transition-colors line-clamp-1 leading-none ${
                isActive ? 'text-blue-700 font-bold' : 'text-slate-500 font-medium'
              }`}>
                {item.label}
              </span>

              {/* Active Indicator Bar */}
              {isActive && (
                <span className="w-3.5 h-0.5 rounded-full bg-blue-600 mt-1 transition-all" />
              )}
            </button>
          );
        })}

        {/* Dedicated Menu Toggle Button to open the full drawer */}
        {onOpenMobileMenu && (
          <button
            type="button"
            id="mobileBottomMenuBtn"
            onClick={() => {
              playClickTick();
              onOpenMobileMenu();
            }}
            className="relative flex flex-col items-center justify-center flex-1 min-h-[46px] min-w-[44px] py-1 px-1 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium border border-transparent transition-all duration-150 cursor-pointer active:scale-95"
            aria-label="Open Navigation Menu"
          >
            <div className="relative flex items-center justify-center">
              <Menu className="w-4.5 h-4.5 text-slate-500" />
            </div>
            <span className="text-[10px] tracking-tight mt-1 transition-colors line-clamp-1 leading-none text-slate-500 font-medium">
              Menu
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
