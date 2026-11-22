import React, { useMemo } from 'react';
import { 
  Users, 
  CalendarCheck, 
  Wallet, 
  CheckSquare, 
  Calendar,
} from 'lucide-react';
import { 
  Member, 
  AttendanceRecord, 
  CashTransaction, 
  Announcement, 
  UserSession, 
  MainTabType 
} from '../types';
import { playClickTick } from '../utils/audioFeedback';
import { isAuthorizedForTab } from '../utils/rbac';
import { useLanguage } from '../utils/i18n';

interface AdminDashboardOverviewProps {
  session: UserSession;
  members: Member[];
  attendance: AttendanceRecord[];
  cash: CashTransaction[];
  announcements: Announcement[];
  isSupabaseConnected?: boolean;
  onNavigateToTab: (tab: MainTabType) => void;
  onOpenAddMemberModal?: () => void;
  onOpenUniversalUploadModal?: () => void;
  onOpenPreRegistrationModal?: () => void;
  onOpenAnnouncementsModal?: () => void;
  onOpenAssignmentsModal?: () => void;
  onOpenSupabaseModal?: () => void;
  onOpenRoleManagement?: () => void;
  onSyncAllData?: () => Promise<void>;
  isSyncing?: boolean;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
  onToggleMemberView?: () => void;
  isMemberViewMode?: boolean;
  onQuickSelfAttendance?: (status: 'Hadir' | 'Izin' | 'Sakit') => Promise<void> | void;
}

export const AdminDashboardOverview: React.FC<AdminDashboardOverviewProps> = ({
  session,
  members,
  attendance,
  cash,
  announcements,
  onNavigateToTab,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const latestAnnouncement = useMemo(() => {
    return announcements && announcements.length > 0 ? announcements[0] : null;
  }, [announcements]);

  const visibleCards = useMemo(() => {
    return [
      {
        id: 'members',
        tabKey: 'members' as MainTabType,
        title: isEn ? 'Member Directory' : 'Direktori Anggota',
        subtitle: isEn ? 'Meet the club team.' : 'Kenali anggota tim robotik.',
        badgeCount: `${members.length} ${isEn ? 'Members' : 'Anggota'}`,
        icon: Users,
        iconBg: 'bg-blue-50 text-blue-600 border border-blue-200/80 shadow-2xs',
        hoverText: 'group-hover:text-blue-700',
        allowed: isAuthorizedForTab('members', session)
      },
      {
        id: 'attendance',
        tabKey: 'attendance' as MainTabType,
        title: isEn ? 'Attendance' : 'Presensi Kegiatan',
        subtitle: isEn ? 'Check in for a session.' : 'Presensi sesi latihan robotik.',
        badgeCount: `${attendance.length} ${isEn ? 'Logs' : 'Presensi'}`,
        icon: CalendarCheck,
        iconBg: 'bg-sky-50 text-sky-600 border border-sky-200/80 shadow-2xs',
        hoverText: 'group-hover:text-sky-700',
        allowed: isAuthorizedForTab('attendance', session)
      },
      {
        id: 'assignments',
        tabKey: 'assignments' as MainTabType,
        title: isEn ? 'Tasks & Evaluation' : 'Tugas & Evaluasi',
        subtitle: isEn ? 'Follow practice progress.' : 'Pantau progres proyek & tugas.',
        badgeCount: isEn ? 'Assignments' : 'Modul Tugas',
        icon: CheckSquare,
        iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-200/80 shadow-2xs',
        hoverText: 'group-hover:text-indigo-700',
        allowed: isAuthorizedForTab('assignments', session)
      },
      {
        id: 'cash',
        tabKey: 'cash' as MainTabType,
        title: isEn ? 'Club Treasury' : 'Buku Kas Klub',
        subtitle: isEn ? 'View the treasury space.' : 'Kelola iuran & pembukuan ekskul.',
        badgeCount: `${cash.length} ${isEn ? 'Transactions' : 'Transaksi'}`,
        icon: Wallet,
        iconBg: 'bg-cyan-50 text-cyan-700 border border-cyan-200/80 shadow-2xs',
        hoverText: 'group-hover:text-cyan-800',
        allowed: isAuthorizedForTab('cash', session)
      }
    ].filter(card => card.allowed);
  }, [session, isEn, members.length, attendance.length, cash.length]);

  return (
    <div className="w-full space-y-4 select-none">
      
      {/* ========================================================================= */}
      {/* 1. Welcome Hero Banner matching Canva design                              */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-[#17387F] via-[#1E4EB8] to-[#38BDF8] rounded-3xl p-5 sm:p-6 text-white relative shadow-md overflow-hidden flex flex-col md:flex-row items-center justify-between gap-5">
        {/* Left Column: Kicker, Headline, Subtext, Buttons */}
        <div className="space-y-2.5 max-w-xl text-left flex-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] sm:text-[11px] font-bold text-white tracking-wide">
            ✦ {session.role ? session.role.toUpperCase() : 'ROBOTICS CLUB'}
          </span>
          
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold tracking-tight text-white leading-tight">
            {isEn 
              ? `Welcome back, ${(session.name || 'Member').split(' ')[0]}!` 
              : `Selamat Datang, ${(session.name || 'Anggota').split(' ')[0]}!`}
          </h1>
          
          <p className="text-sky-100 text-xs sm:text-sm leading-relaxed max-w-md font-normal">
            {session.nisn 
              ? `${isEn ? 'Student Portal' : 'Portal Anggota'} • NISN: ${session.nisn} • MAN 2 Kota Bekasi`
              : (isEn ? 'Meet the team, check in, and keep building.' : 'Pantau aktivitas tim, presensi mandiri, dan proyek robotika.')}
          </p>
          
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            {isAuthorizedForTab('attendance', session) && (
              <button
                type="button"
                id="dashboardCheckAttendanceBtn"
                onClick={() => {
                  playClickTick();
                  onNavigateToTab('attendance');
                }}
                className="px-4.5 py-2.5 bg-white text-[#17387F] font-extrabold text-xs sm:text-sm rounded-2xl shadow-xs hover:bg-sky-50 transition cursor-pointer active:scale-95"
              >
                {isEn ? 'Check attendance' : 'Presensi Kegiatan'}
              </button>
            )}
            {isAuthorizedForTab('calendar', session) && (
              <button
                type="button"
                id="dashboardViewCalendarBtn"
                onClick={() => {
                  playClickTick();
                  onNavigateToTab('calendar');
                }}
                className="px-4.5 py-2.5 bg-white/20 hover:bg-white/30 text-white font-semibold text-xs sm:text-sm rounded-2xl backdrop-blur-md border border-white/20 transition cursor-pointer active:scale-95"
              >
                {isEn ? 'View calendar' : 'Lihat Kalender'}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Circular Mascot inside pristine rounded-3xl white card */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white p-2 shadow-lg flex items-center justify-center shrink-0 border border-white/60 group hover:scale-105 transition duration-300">
          <img
            src="/assets/aistudio/Gemini_Generated_Image_aay230aay230aay2_dccf3432.jpg"
            alt="roboman2 Mascot"
            className="w-full h-full object-cover rounded-2xl"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2.1. Authority-Gated Primary Cards Grid                                   */}
      {/* ========================================================================= */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${
        visibleCards.length >= 4 
          ? 'lg:grid-cols-4' 
          : visibleCards.length === 3 
          ? 'lg:grid-cols-3' 
          : 'lg:grid-cols-2'
      } gap-4 sm:gap-5`}>
        {visibleCards.map((card) => {
          const IconComp = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => {
                playClickTick();
                onNavigateToTab(card.tabKey);
              }}
              className="group bg-white rounded-3xl p-5 shadow-xs border border-blue-100/80 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-2xl ${card.iconBg} flex items-center justify-center transition-transform group-hover:scale-105`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  {card.badgeCount && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
                      {card.badgeCount}
                    </span>
                  )}
                </div>
                <h3 className={`text-sm sm:text-base font-bold text-slate-900 ${card.hoverText} transition`}>
                  {card.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-normal">
                  {card.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 2.2. Two Bottom Cards: Coming up & Club noticeboard                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Coming up Card matching Canva */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-blue-100 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              {isEn ? 'Coming up' : 'Akan Datang'}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200/60">
              {isEn ? 'Calendar' : 'Kalender'}
            </span>
          </div>

          <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                {isEn ? 'No activities listed yet' : 'Belum ada agenda terdaftar'}
              </h4>
              <p className="text-xs text-slate-500">
                {isEn ? 'Browse dates in the calendar.' : 'Lihat tanggal agenda di kalender kegiatan.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  playClickTick();
                  onNavigateToTab('calendar');
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 pt-1 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{isEn ? 'Open calendar →' : 'Buka kalender →'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Club noticeboard Card matching Canva */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-blue-100 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              {isEn ? 'Club noticeboard' : 'Papan Pengumuman'}
            </h3>
          </div>

          <div className="bg-gradient-to-r from-blue-50/80 via-sky-50/50 to-indigo-50/40 rounded-2xl p-4 border border-blue-100/80 space-y-1.5">
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 text-[10px] font-bold border border-blue-200/70">
              {latestAnnouncement ? (isEn ? 'Official Notice' : 'Pengumuman') : (isEn ? 'Sample Notice' : 'Contoh')}
            </span>
            <p className="text-xs text-slate-700 font-normal leading-relaxed">
              {latestAnnouncement 
                ? latestAnnouncement.content 
                : (isEn 
                    ? 'Explore this official roboman2 workspace. Member roster, attendance, and club treasury books are live and synchronized.'
                    : 'Jelajahi ruang kerja resmi roboman2. Roster anggota, presensi, dan pembukuan kas tersinkronisasi.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
