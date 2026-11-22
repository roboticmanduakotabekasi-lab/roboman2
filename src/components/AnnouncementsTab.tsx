import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Megaphone, 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  Pin, 
  Trash2, 
  Sparkles,
  Tag,
  Lock
} from 'lucide-react';
import { Announcement, UserSession } from '../types';
import { canManageAnnouncements } from '../utils/rbac';

interface AnnouncementsTabProps {
  announcements: Announcement[];
  session: UserSession | null;
  onOpenAnnouncementsModal?: () => void;
  onDeleteAnnouncement?: (id: string) => void;
  onSaveAnnouncement?: (announcement: Partial<Announcement>) => Promise<boolean>;
}

export const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({
  announcements,
  session,
  onOpenAnnouncementsModal,
  onDeleteAnnouncement,
  onSaveAnnouncement,
}) => {
  const [filter, setFilter] = useState<'All' | 'Info' | 'Schedule'>('All');
  const [isPosting, setIsPosting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [channel, setChannel] = useState<'Info' | 'Schedule'>('Info');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canPost = canManageAnnouncements(session);

  // Sample announcements to display if empty, matching Canva mockup
  const sampleAnnouncements: Announcement[] = [
    {
      id: 'sample-1',
      title: 'Welcome to the club workspace',
      content: 'A sample announcement to preview club updates. Get ready for an exciting semester of robot mechanics, sensors, and programming competitions!',
      channel: 'Info',
      author_name: 'Club Lead',
      created_at: new Date().toISOString(),
      priority: 'highlight',
      pinned: true,
    },
    {
      id: 'sample-2',
      title: 'Activity schedule',
      content: 'Weekly robotics practice meets every Wednesday and Saturday in the Robotics Lab. Check the Activity Calendar for full topic details.',
      channel: 'Schedule',
      author_name: 'Coordinator',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      priority: 'normal',
    },
  ];

  const displayList = announcements.length > 0 ? announcements : sampleAnnouncements;

  const filteredAnnouncements = displayList.filter((item) => {
    if (filter === 'All') return true;
    const itemChannel = (item.channel || '').toLowerCase();
    if (filter === 'Info') return itemChannel.includes('info') || !itemChannel.includes('sched');
    if (filter === 'Schedule') return itemChannel.includes('sched') || itemChannel.includes('kalender') || itemChannel.includes('activity');
    return true;
  });

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (onSaveAnnouncement) {
      setIsSubmitting(true);
      try {
        await onSaveAnnouncement({
          title: title.trim(),
          content: content.trim(),
          channel: channel === 'Info' ? 'announcements' : 'important',
          priority: 'normal',
          author_name: session?.name || 'Club Officer',
          author_role: session?.role || 'officer',
          created_at: new Date().toISOString(),
        });
        setTitle('');
        setContent('');
        setIsPosting(false);
      } finally {
        setIsSubmitting(false);
      }
    } else if (onOpenAnnouncementsModal) {
      onOpenAnnouncementsModal();
    }
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header section matching Canva screenshot 4 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600 border-l-2 border-sky-500 pl-2.5 inline-block mb-1.5">
            CLUB UPDATES
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Announcements
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
            Club updates in one place.
          </p>
        </div>

        {canPost ? (
          <button
            type="button"
            onClick={() => {
              if (onOpenAnnouncementsModal) {
                onOpenAnnouncementsModal();
              } else {
                setIsPosting(!isPosting);
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-sky-500/20 active:scale-95 transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Post Announcement</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200 text-slate-500 text-xs font-medium self-start sm:self-auto">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Mode Baca (Siaran Eksklusif Humas / Public Relations)</span>
          </div>
        )}
      </div>

      {/* Filter Tabs matching Canva pill style */}
      <div className="flex items-center gap-2">
        {(['All', 'Info', 'Schedule'] as const).map((cat) => {
          const isActive = filter === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-sky-100 text-sky-800 shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Quick Post Form Accordion */}
      <AnimatePresence>
        {isPosting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreateAnnouncement} className="bg-white rounded-3xl p-6 shadow-sm border border-sky-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-500" />
                <span>Create New Announcement</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Upcoming Robotics Lab Workshop"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Category Tag
                    </label>
                    <select
                      value={channel}
                      onChange={(e) => setChannel(e.target.value as 'Info' | 'Schedule')}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-sky-400 focus:outline-none"
                    >
                      <option value="Info">Info</option>
                      <option value="Schedule">Schedule</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Announcement Details
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write details for all club members..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPosting(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow transition cursor-pointer"
                >
                  {isSubmitting ? 'Posting...' : 'Publish'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcements List Container */}
      <div className="bg-white/95 rounded-3xl p-6 md:p-8 shadow-sm border border-sky-100 space-y-6">
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mx-auto">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No announcements found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No updates match the selected filter. Check back soon for club schedule announcements!
            </p>
          </div>
        ) : (
          filteredAnnouncements.map((item) => {
            const isSchedule = (item.channel || '').toLowerCase().includes('sched') || 
                               (item.channel || '').toLowerCase().includes('kalender') ||
                               item.channel === 'Schedule';
            const badgeLabel = isSchedule ? 'Schedule' : 'Info';
            const badgeClass = isSchedule
              ? 'bg-amber-100 text-amber-800 border-amber-200'
              : 'bg-sky-100 text-sky-800 border-sky-200';

            return (
              <div
                key={item.id}
                className="group relative pb-5 border-b border-slate-100 last:border-b-0 last:pb-0 space-y-2 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className={isSchedule ? 'text-amber-700 font-bold' : 'text-blue-700 font-bold'}>
                      {badgeLabel}
                    </span>
                    {item.created_at && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-slate-400 font-normal">
                          {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </>
                    )}
                    {item.author_name && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-slate-400 font-normal">{item.author_name}</span>
                      </>
                    )}
                    {item.pinned && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-sky-600 font-semibold inline-flex items-center gap-1">
                          <Pin className="w-3 h-3" />
                          <span>Pinned</span>
                        </span>
                      </>
                    )}
                  </div>

                  {canPost && onDeleteAnnouncement && !item.id.startsWith('sample-') && (
                    <button
                      type="button"
                      onClick={() => onDeleteAnnouncement(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-900 transition">
                    {item.title}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600 leading-relaxed mt-1 font-normal">
                    {item.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
