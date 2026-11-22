import React from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Clock, 
  ExternalLink
} from 'lucide-react';
import { AppNotification, MainTabType, UserSession } from '../types';

interface NotificationsTabProps {
  notifications: AppNotification[];
  session: UserSession | null;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onClearAll?: () => void;
  onNavigateToTab?: (tab: MainTabType) => void;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onNavigateToTab,
}) => {
  const defaultSampleNotifications: AppNotification[] = [
    {
      id: 'sample-notif-1',
      title: 'Your workspace is ready',
      message: 'Explore the sections to get started.',
      timestamp: new Date().toISOString(),
      isRead: false,
      type: 'info',
      category: 'system',
      linkTab: 'dashboard',
    },
    {
      id: 'sample-notif-2',
      title: 'Sample tasks are available',
      message: 'Try a filter or mark a task complete.',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      isRead: false,
      type: 'info',
      category: 'system',
      linkTab: 'assignments',
    },
  ];

  const list = notifications.length > 0 ? notifications : defaultSampleNotifications;
  const unreadCount = list.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600 border-l-2 border-sky-500 pl-2.5 inline-block mb-1.5">
            ACTIVITY CENTER
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Notifications
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
            The latest updates across your club workspace.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-2xl bg-sky-100 text-sky-800 text-xs font-bold shadow-2xs">
            {unreadCount} unread
          </span>

          {unreadCount > 0 && onMarkAllAsRead && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>Mark all read</span>
            </button>
          )}

          {list.length > 0 && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium transition cursor-pointer"
              title="Clear all notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Notifications Card Container */}
      <div className="bg-white/95 rounded-3xl p-6 md:p-8 shadow-sm border border-sky-100 space-y-4">
        {list.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">You're all caught up!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No new notifications right now. Check back when updates or assignments are posted.
            </p>
          </div>
        ) : (
          list.map((item) => {
            const isUnread = !item.isRead;
            const targetTab = item.linkTab && item.linkTab !== 'staging' ? item.linkTab : undefined;

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isUnread && onMarkAsRead) {
                    onMarkAsRead(item.id);
                  }
                  if (targetTab && onNavigateToTab) {
                    onNavigateToTab(targetTab);
                  }
                }}
                className={`group flex items-start justify-between gap-4 p-4 rounded-2xl transition-all cursor-pointer ${
                  isUnread
                    ? 'bg-sky-50/40 hover:bg-sky-50 border border-sky-100/80 shadow-2xs'
                    : 'hover:bg-slate-50/80 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bell className="w-5 h-5" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm md:text-base font-bold text-slate-900 group-hover:text-indigo-950 transition truncate">
                        {item.title}
                      </h4>
                      {targetTab && (
                        <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-sky-600 font-semibold group-hover:underline">
                          <span>View</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-slate-500 leading-relaxed font-normal">
                      {item.message}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium pt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center pt-2">
                  {isUnread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100 shadow-2xs animate-pulse" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
