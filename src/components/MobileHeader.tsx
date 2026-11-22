import React from 'react';
import { 
  Bot, 
  LogOut, 
  Menu, 
  Bell
} from 'lucide-react';
import { UserSession } from '../types';
import { playClickTick } from '../utils/audioFeedback';
import { Organization } from '../utils/organizerStore';
import { ThemeColor, THEMES } from '../utils/theme';
import { getRoleMetadata } from '../utils/rbac';

export interface MobileHeaderProps {
  session: UserSession | null;
  currentTheme?: ThemeColor;
  onThemeChange?: (theme: ThemeColor) => void;
  isSupabaseConnected: boolean;
  onOpenSupabaseModal?: () => void;
  onOpenProfileSettings?: () => void;
  onLogout: () => void;
  onOpenMobileMenu?: () => void;
  onOpenRoleManagement?: () => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  activeOrganization?: Organization;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  session,
  currentTheme = 'indigo',
  onOpenProfileSettings,
  onOpenRoleManagement,
  onLogout,
  onOpenMobileMenu,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  activeOrganization,
}) => {
  const themeConfig = THEMES[currentTheme] || THEMES.indigo;

  return (
    <header className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-sky-100 shadow-sm px-2.5 py-1.5 select-none">
      <div className="flex items-center justify-between gap-2 h-11">
        
        {/* Left: Mobile Menu Toggle Button (>= 44x44px touch target) + Brand */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            id="mobileMenuToggleBtn"
            onClick={() => {
              playClickTick();
              onOpenMobileMenu?.();
            }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-sky-200/80 bg-white/90 hover:bg-sky-50 text-slate-700 transition-all cursor-pointer active:scale-95 shrink-0"
            title="Open Navigation Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>

          {/* Clean Typography Brand */}
          <div className="min-w-0 text-left">
            <span className="font-extrabold text-slate-900 text-sm tracking-tight leading-tight flex items-center">
              <span>roboman</span>
              <span className="text-blue-600 font-black">2</span>
            </span>
            <span className="text-[10px] text-slate-500 block truncate font-medium leading-none mt-0.5">
              MAN 2 Kota Bekasi
            </span>
          </div>
        </div>

        {/* Right Tools: Notification Bell & Profile Avatar (All >= 44x44px touch targets) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Notification Bell Button (>= 44x44px touch target) */}
          <button
            type="button"
            id="mobileNotificationBellBtn"
            onClick={() => {
              playClickTick();
              onOpenNotifications?.();
            }}
            className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shadow-2xs active:scale-95"
            title="Open Notification Center"
            aria-label="Notification Center"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-2 right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[8px] font-mono font-bold flex items-center justify-center ring-2 ring-white">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Profile Avatar & Controls */}
          {session && (
            <div className="flex items-center gap-1">
              {/* Role Indicator - Clean typographic tag */}
              <button
                type="button"
                onClick={() => {
                  playClickTick();
                  if (session.role?.toLowerCase() === 'admin') {
                    onOpenRoleManagement?.();
                  } else {
                    onOpenProfileSettings?.();
                  }
                }}
                className="hidden xs:inline-flex px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 transition cursor-pointer shrink-0"
                title={session.role?.toLowerCase() === 'admin' ? "Manage Role-Based Access Control (RBAC)" : "View Profile"}
              >
                {getRoleMetadata(session.role).shortTitle}
              </button>

              {/* Profile Avatar Button (>= 44x44px touch target) */}
              <button
                type="button"
                id="mobileProfileAvatarBtn"
                onClick={() => {
                  playClickTick();
                  onOpenProfileSettings?.();
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-slate-50 transition cursor-pointer active:scale-95"
                title={`Profile: ${session.name} (${session.role})`}
                aria-label={`Profile: ${session.name}`}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                  {session.name.charAt(0)}
                </div>
              </button>

              {/* Logout Button (>= 44x44px touch target on sm+) */}
              <button
                type="button"
                onClick={() => {
                  playClickTick();
                  onLogout();
                }}
                title="Sign Out"
                aria-label="Sign Out"
                className="hidden sm:flex min-w-[44px] min-h-[44px] items-center justify-center rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/90 hover:border-rose-200 transition cursor-pointer active:scale-95"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
