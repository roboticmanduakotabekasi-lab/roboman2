import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  UserPlus,
  Trash2,
  Edit,
  Sparkles,
  Info,
  Check,
  RotateCcw,
  Crown,
  Award,
  Megaphone,
  FileText,
  Wallet,
  UserCheck,
  Lock,
  ChevronDown,
  ArrowRight,
  Eye,
  EyeOff,
  Copy,
  Shield,
  AlertTriangle,
  Clock,
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';
import { UserSession } from '../types';
import { 
  AppRole, 
  ROLE_DEFINITIONS, 
  PRIMARY_APP_ROLES,
  RBAC_MATRIX, 
  normalizeRole, 
  getRoleMetadata,
  getCanonicalRole,
  hasSessionPermission,
  canActorModifyTargetRole,
  Permission,
  getRoleAuthoritiesSummary
} from '../utils/rbac';
import { 
  getCustomAccounts, 
  AccountConfig, 
  updateAccountRole, 
  deleteAccount 
} from '../utils/authConfig';
import { playClickTick, playSuccessChime, playWarningBuzzer } from '../utils/audioFeedback';
import { useLanguage } from '../utils/i18n';

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserSession: UserSession;
  onSessionRoleSwitch?: (newRole: AppRole) => void;
  onRefreshData?: () => void;
}

export const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  isOpen,
  onClose,
  currentUserSession,
  onSessionRoleSwitch,
  onRefreshData
}) => {
  const { language, t } = useLanguage();
  const isEn = language === 'en';
  const [activeTab, setActiveTab] = useState<'users' | 'matrix' | 'simulate'>('users');
  const [accounts, setAccounts] = useState<AccountConfig[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [accountToDemote, setAccountToDemote] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fast cleanup: Demote any unlinked / standalone accounts with elevated privileges
  const handleDemoteAllStandalone = async () => {
    if (!isSuperAdmin) return;
    playClickTick();
    const standaloneElevated = accounts.filter(
      (a) => !a.nisn && a.username !== 'admin' && a.username !== 'pembina' && normalizeRole(a.role) !== 'anggota'
    );
    if (standaloneElevated.length === 0) {
      setFeedbackMsg({ 
        type: 'success', 
        text: isEn ? 'All accounts are secure and verified in the official member registry.' : 'Semua akun sudah aman & terverifikasi di daftar siswa resmi.' 
      });
      return;
    }
    for (const acc of standaloneElevated) {
      await updateAccountRole(acc.username, 'anggota');
    }
    playSuccessChime();
    loadAccounts();
    onRefreshData?.();
    setFeedbackMsg({
      type: 'success',
      text: isEn 
        ? `${standaloneElevated.length} unlinked officer accounts demoted to standard Member.`
        : `${standaloneElevated.length} akun pengurus lepas berhasil diturunkan (Demote) menjadi Anggota Biasa.`
    });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Matrix Filter
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState<string>('all');

  const canonicalUserRole = getCanonicalRole(currentUserSession);
  const isSuperAdmin = canonicalUserRole === 'admin';
  const canManageUsers = Boolean(
    isSuperAdmin ||
    currentUserSession.role === 'admin' ||
    currentUserSession.role === 'advisor' ||
    currentUserSession.role === 'Faculty Advisor' ||
    currentUserSession.jabatan === 'president' ||
    currentUserSession.jabatan === 'pembina' ||
    currentUserSession.username === 'admin' ||
    currentUserSession.username === 'pembina' ||
    currentUserSession.username === 'ketua' ||
    hasSessionPermission(currentUserSession, 'rbac:manage') ||
    hasSessionPermission(currentUserSession, 'members:promote')
  );

  const loadAccounts = () => {
    // Read deleted blacklist so deleted accounts are never resurrected
    let deletedSet = new Set<string>();
    try {
      const rawDeleted = localStorage.getItem('robotics_deleted_usernames');
      if (rawDeleted) {
        deletedSet = new Set<string>(JSON.parse(rawDeleted).map((s: string) => String(s).toLowerCase().trim()));
      }
    } catch {}

    const list = getCustomAccounts();
    const map = new Map<string, AccountConfig>();
    for (const a of list) {
      const uNorm = a.username.toLowerCase();
      const eNorm = a.email?.toLowerCase();
      const nNorm = a.nisn?.toLowerCase();
      if (deletedSet.has(uNorm) || (eNorm && deletedSet.has(eNorm)) || (nNorm && deletedSet.has(nNorm))) {
        continue;
      }
      map.set(uNorm, a);
      if (a.email) map.set(a.email.toLowerCase(), a);
      if (a.nisn) map.set(a.nisn, a);
    }

    // Include club members from local member roster (unless deleted)
    try {
      const raw = localStorage.getItem('robotics_members');
      if (raw) {
        const members = JSON.parse(raw);
        if (Array.isArray(members)) {
          for (const m of members) {
            const mEmail = (m.email || '').toLowerCase().trim();
            const mNisn = (m.nisn || '').trim();
            const mUser = mNisn || (m.fullName ? m.fullName.toLowerCase().replace(/\s+/g, '_') : `member_${m.id_member || ''}`);

            if (
              deletedSet.has(mUser.toLowerCase()) ||
              (mEmail && deletedSet.has(mEmail)) ||
              (mNisn && deletedSet.has(mNisn.toLowerCase())) ||
              (m.fullName && deletedSet.has(m.fullName.toLowerCase()))
            ) {
              continue;
            }

            const existing = (mEmail && map.get(mEmail)) || (mNisn && map.get(mNisn)) || map.get(mUser.toLowerCase());

            if (!existing) {
              const jLower = (m.jabatan || '').toLowerCase();
              const isExec = jLower.includes('president') || jLower.includes('secretary') || jLower.includes('treasurer') || jLower.includes('pr') || jLower.includes('sekretaris') || jLower.includes('bendahara') || jLower.includes('humas') || (m.status || '').toLowerCase().includes('executive') || (m.role || '').toLowerCase().includes('executive');
              const isAdmin = jLower === 'president' || jLower === 'pembina' || (m.role || '').toLowerCase() === 'admin';

              const roleDisplay = isExec ? (m.jabatan || 'sekretaris') : (isAdmin ? 'admin' : (m.role || 'anggota'));

              const acc: AccountConfig = {
                username: mUser,
                name: m.fullName,
                email: m.email || `${mUser}@man2kotabekasi.sch.id`,
                role: roleDisplay,
                nisn: m.nisn,
                authProvider: 'credentials',
                avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${mUser}`,
              };
              map.set(mUser.toLowerCase(), acc);
              if (mEmail) map.set(mEmail, acc);
              if (mNisn) map.set(mNisn, acc);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error loading members in RoleManagementModal:', e);
    }

    const unique = Array.from(new Set(Array.from(map.values())));
    setAccounts(unique);
  };

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      setFeedbackMsg(null);
    }
    const handleUpdate = () => loadAccounts();
    window.addEventListener('robotics_accounts_updated', handleUpdate);
    window.addEventListener('robotics_members_updated', handleUpdate);
    return () => {
      window.removeEventListener('robotics_accounts_updated', handleUpdate);
      window.removeEventListener('robotics_members_updated', handleUpdate);
    };
  }, [isOpen]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchSearch =
        acc.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (acc.name && acc.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (acc.email && acc.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchRole =
        selectedRoleFilter === 'all' ||
        normalizeRole(acc.role) === selectedRoleFilter;
      return matchSearch && matchRole;
    });
  }, [accounts, searchTerm, selectedRoleFilter]);

  const handleRoleChange = async (username: string, newRoleKey: string) => {
    playClickTick();

    if (!canManageUsers) {
      playWarningBuzzer();
      setFeedbackMsg({
        type: 'error',
        text: 'Akses Ditolak: Hanya Administrator atau Pembina yang memiliki izin untuk mengubah peran.'
      });
      return;
    }

    const targetAcc = accounts.find((a) => a.username.toLowerCase() === username.toLowerCase());
    const validation = canActorModifyTargetRole(
      currentUserSession,
      targetAcc || { username },
      newRoleKey
    );

    if (!validation.allowed) {
      playWarningBuzzer();
      setFeedbackMsg({
        type: 'error',
        text: validation.reason || 'Akses Ditolak: Perubahan peran tidak diizinkan.'
      });
      return;
    }

    const roleToSave = newRoleKey.toLowerCase().includes('executive') || newRoleKey === 'bph' ? 'executive_board' : newRoleKey;
    const success = await updateAccountRole(username, roleToSave);
    if (success) {
      playSuccessChime();
      loadAccounts();
      onRefreshData?.();
      setFeedbackMsg({
        type: 'success',
        text: `Peran akun @${username} berhasil diperbarui menjadi ${newRoleKey}.`
      });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } else {
      setFeedbackMsg({
        type: 'error',
        text: `Gagal memperbarui peran untuk @${username}.`
      });
    }
  };

  const handleDeleteUser = (username: string) => {
    if (!canManageUsers) {
      playWarningBuzzer();
      setFeedbackMsg({
        type: 'error',
        text: 'Akses Ditolak: Hanya Administrator atau Pembina yang memiliki izin untuk menghapus akun.'
      });
      return;
    }
    const norm = username.trim().toLowerCase();
    if (norm === 'admin') {
      playWarningBuzzer();
      setFeedbackMsg({
        type: 'error',
        text: 'Akun utama @admin tidak dapat dihapus untuk kestabilan sistem.'
      });
      return;
    }
    if (norm === currentUserSession.username?.toLowerCase()) {
      playWarningBuzzer();
      setFeedbackMsg({
        type: 'error',
        text: 'Anda tidak dapat menghapus akun Anda sendiri saat sedang aktif.'
      });
      return;
    }
    playClickTick();
    setAccountToDelete(username);
  };

  const confirmDeleteUser = async () => {
    if (!accountToDelete) return;
    playClickTick();
    const username = accountToDelete;
    setAccountToDelete(null);

    // Optimistically remove immediately from UI state
    setAccounts((prev) => prev.filter((a) => a.username.toLowerCase() !== username.toLowerCase()));

    const success = await deleteAccount(username);
    if (success) {
      playSuccessChime();
      loadAccounts();
      onRefreshData?.();
      setFeedbackMsg({
        type: 'success',
        text: `Akun @${username} berhasil dihapus permanen dari sistem.`
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      playWarningBuzzer();
      setFeedbackMsg({
        type: 'error',
        text: `Gagal menghapus akun @${username}.`
      });
    }
  };

  const handleDemoteUser = (username: string) => {
    if (!isSuperAdmin) {
      playWarningBuzzer();
      setFeedbackMsg({
        type: 'error',
        text: 'Access Denied: Only the Primary Administrator has permission to revoke officer privileges.'
      });
      return;
    }
    if (username === 'pembina' || username === 'admin') {
      playWarningBuzzer();
      setFeedbackMsg({
        type: 'error',
        text: 'Core system accounts (@admin, @pembina) cannot be demoted to maintain system stability.'
      });
      return;
    }
    playClickTick();
    setAccountToDemote(username);
  };

  const confirmDemoteUser = async () => {
    if (!accountToDemote) return;
    playClickTick();
    const username = accountToDemote;
    setAccountToDemote(null);

    const success = await updateAccountRole(username, 'anggota');
    if (success) {
      playSuccessChime();
      loadAccounts();
      onRefreshData?.();
      setFeedbackMsg({
        type: 'success',
        text: `Officer privileges for @${username} revoked. Account demoted to Member / Viewer.`
      });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } else {
      playWarningBuzzer();
      setFeedbackMsg({
        type: 'error',
        text: `Failed to demote @${username}.`
      });
    }
  };

  // Security audit calculation
  const securityAudit = useMemo(() => {
    let elevatedCount = 0;
    let regularCount = 0;
    let standaloneCount = 0;
    let linkedCount = 0;

    accounts.forEach((acc) => {
      const canonical = normalizeRole(acc.role);
      const isElevated = canonical !== 'anggota';
      if (isElevated) {
        elevatedCount++;
      } else {
        regularCount++;
      }

      if (acc.nisn) {
        linkedCount++;
      } else if (acc.username !== 'admin' && acc.username !== 'pembina') {
        standaloneCount++;
      }
    });

    return {
      total: accounts.length,
      elevatedCount,
      regularCount,
      standaloneCount,
      linkedCount
    };
  }, [accounts]);

  const matrixCategories = useMemo(() => {
    const set = new Set<string>();
    RBAC_MATRIX.forEach((m) => set.add(m.category));
    return ['all', ...Array.from(set)];
  }, []);

  const filteredMatrix = useMemo(() => {
    if (matrixCategoryFilter === 'all') return RBAC_MATRIX;
    return RBAC_MATRIX.filter((m) => m.category === matrixCategoryFilter);
  }, [matrixCategoryFilter]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600/10 text-indigo-700 flex items-center justify-center border border-indigo-200/50 shadow-2xs shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Role-Based Access Control (RBAC)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                    Active RBAC
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Role-based access control and privilege distribution for Robotics Club MAN 2 Kota Bekasi.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                playClickTick();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback banner */}
          {feedbackMsg && (
            <div className={`mt-3 px-3.5 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium animate-in fade-in duration-200 ${
              feedbackMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Sub Navigation Tabs */}
          <div className="flex items-center justify-between gap-2 mt-4 pb-2 border-b border-slate-100 shrink-0 overflow-x-auto">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  playClickTick();
                  setActiveTab('users');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Officer Accounts ({accounts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickTick();
                  setActiveTab('matrix');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'matrix'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Permission Matrix (RBAC)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickTick();
                  setActiveTab('simulate');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'simulate'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Simulate Role UI</span>
              </button>
            </div>

            {activeTab === 'users' && isSuperAdmin && securityAudit.standaloneCount > 0 && (
              <button
                type="button"
                onClick={handleDemoteAllStandalone}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                title={isEn ? "Demote all standalone officer accounts to standard member" : "Turunkan semua akun pengurus lepas menjadi anggota biasa"}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isEn ? "Clean Standalone Accounts" : "Bersihkan Akun Lepas"} ({securityAudit.standaloneCount})</span>
              </button>
            )}
          </div>

          {/* Modal Body Content */}
          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">

            {/* TAB 1: USERS & ROLES */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                {/* SECURITY AUDIT HEALTH CHECK STATS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Total Accounts</span>
                    <span className="text-lg font-bold text-slate-900 mt-0.5 block">{securityAudit.total}</span>
                    <span className="text-[10px] text-slate-400">Total in directory</span>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                    <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider block">Elevated Officers</span>
                    <span className="text-lg font-bold text-amber-950 mt-0.5 block">{securityAudit.elevatedCount}</span>
                    <span className="text-[10px] text-amber-700 font-medium">Have executive access</span>
                  </div>

                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
                    <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">Verified Students</span>
                    <span className="text-lg font-bold text-emerald-950 mt-0.5 block">{securityAudit.linkedCount}</span>
                    <span className="text-[10px] text-emerald-700 font-medium">Linked to NISN roster</span>
                  </div>

                  <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
                    <span className="text-[10px] font-semibold text-blue-800 uppercase tracking-wider block">Standard Members</span>
                    <span className="text-lg font-bold text-blue-950 mt-0.5 block">{securityAudit.regularCount}</span>
                    <span className="text-[10px] text-blue-700 font-medium">Safe view-only tier</span>
                  </div>
                </div>



                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name, username, or email..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <select
                      value={selectedRoleFilter}
                      onChange={(e) => setSelectedRoleFilter(e.target.value)}
                      className="w-full sm:w-auto px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                    >
                      <option value="all">Semua Peran ({accounts.length})</option>
                      <option value="admin">👑 Administrator (Head Admin)</option>
                      <option value="pembina">🛡️ Guru Pembina (Club Advisor)</option>
                      <option value="ketua">⚡ Ketua Ekskul (President)</option>
                      <option value="bph">⭐ Wakil Ketua (Vice President / BPH)</option>
                      <option value="sekretaris">📝 Sekretaris (Secretary)</option>
                      <option value="bendahara">💰 Bendahara (Treasurer)</option>
                      <option value="pr">📣 Humas (Public Relations)</option>
                      <option value="anggota">👤 Anggota Siswa (Member)</option>
                    </select>
                  </div>
                </div>

                {/* Accounts Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">User</th>
                          <th className="py-2.5 px-3">Identity / Student Link</th>
                          <th className="py-2.5 px-3">Role & Permissions</th>
                          <th className="py-2.5 px-3">Authority Scope</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAccounts.map((acc, accIdx) => {
                          const canonical = normalizeRole(acc.role);
                          const meta = getRoleMetadata(canonical);
                          const isCurrentUser = acc.username.toLowerCase() === currentUserSession.username.toLowerCase();
                          const isProtectedMain = acc.username.toLowerCase() === 'admin';
                          const isElevated = canonical !== 'anggota';

                          return (
                            <tr key={`${acc.username || 'acc'}-${accIdx}`} className={`hover:bg-slate-50/60 transition ${isCurrentUser ? 'bg-indigo-50/40' : ''}`}>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                                    {acc.avatarUrl ? (
                                      <img src={acc.avatarUrl} alt={acc.name} className="w-full h-full object-cover" />
                                    ) : (
                                      acc.name?.charAt(0).toUpperCase() || acc.username.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-slate-900">{acc.name || acc.username}</span>
                                      {isCurrentUser && (
                                        <span className="px-1.5 py-0.2 text-[9px] font-bold bg-indigo-100 text-indigo-700 rounded-md">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[11px] text-slate-400 font-mono">@{acc.username}</span>
                                      {acc.email && (
                                        <span className="text-[11px] text-slate-500 font-mono">· {acc.email}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-2.5 px-3">
                                {acc.nisn ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>NISN {acc.nisn}</span>
                                  </span>
                                ) : isProtectedMain ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                    <Shield className="w-3 h-3 text-slate-500" />
                                    <span>Core Admin</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200" title="Akun Pengguna Mandiri">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <span>Standalone Account</span>
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3">
                                {canManageUsers ? (
                                  <div className="space-y-1">
                                    <select
                                      value={canonical}
                                      disabled={!canManageUsers || isCurrentUser || (acc.username === 'admin' && currentUserSession.username !== 'admin') || (canonical === 'pembina' && !isSuperAdmin)}
                                      onChange={(e) => handleRoleChange(acc.username, ROLE_DEFINITIONS[e.target.value as AppRole].label)}
                                      className={`px-2 py-1 rounded-lg border text-xs font-semibold ${isCurrentUser || (canonical === 'pembina' && !isSuperAdmin) ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'} ${meta.badgeBg} ${meta.badgeBorder}`}
                                      title={isCurrentUser ? 'Akun Anda dilindungi oleh aturan Anti-Self Promotion (Pemisahan Kewenangan)' : (canonical === 'pembina' && !isSuperAdmin) ? 'Akun Guru Pembina hanya dapat diubah oleh Administrator Utama' : undefined}
                                    >
                                      {isSuperAdmin && <option value="admin">👑 Administrator (Head Admin)</option>}
                                      {isSuperAdmin && <option value="pembina">🛡️ Guru Pembina (Club Advisor)</option>}
                                      <option value="ketua">⚡ Ketua Ekskul (President)</option>
                                      <option value="bph">⭐ Wakil Ketua (Vice President / BPH)</option>
                                      <option value="sekretaris">📝 Sekretaris (Secretary)</option>
                                      <option value="bendahara">💰 Bendahara (Treasurer)</option>
                                      <option value="pr">📣 Humas (Public Relations)</option>
                                      <option value="anggota">👤 Anggota Siswa (Member)</option>
                                    </select>
                                    {isCurrentUser ? (
                                      <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                        <Lock className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                        <span>Akun Anda (Terkunci - Anti-Self-Promotion)</span>
                                      </span>
                                    ) : (canonical === 'pembina' && !isSuperAdmin) ? (
                                      <span className="flex items-center gap-1 text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                        <Lock className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                                        <span>Guru Pembina (Terkunci - Otoritas Admin)</span>
                                      </span>
                                    ) : isElevated ? (
                                      <span className="flex items-center gap-1 text-[9px] font-bold text-amber-700 uppercase tracking-wider">
                                        <ShieldAlert className="w-2.5 h-2.5 text-amber-600" />
                                        <span>Elevated Privileges (PII & Write)</span>
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-slate-400 font-medium block">
                                        Standard / View-Only Access
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-semibold ${meta.badgeBg} ${meta.badgeBorder}`}>
                                      {meta.label}
                                    </span>
                                  </div>
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                                <span className="line-clamp-2">{meta.description}</span>
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                {canManageUsers && !isProtectedMain && !isCurrentUser ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    {isElevated && (
                                      <button
                                        type="button"
                                        onClick={() => handleDemoteUser(acc.username)}
                                        className="px-2 py-1 text-[11px] text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition cursor-pointer font-medium"
                                        title={`Cabut akses pengurus @${acc.username}`}
                                      >
                                        Demote
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(acc.username)}
                                      className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200/60 rounded-lg transition cursor-pointer shadow-2xs"
                                      title={`Hapus akun @${acc.username} dari sistem`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-mono italic">
                                    {isProtectedMain ? 'Core Admin' : isCurrentUser ? 'Active Session' : '-'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">RBAC Security Note:</span>
                    <p className="mt-0.5 text-slate-500">
                      Applied role adjustments are instantly effective and synchronized across Supabase Cloud database and local sessions. Advisors and Presidents possess administrator authority to modify officer roles.
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: RBAC MATRIX */}
            {activeTab === 'matrix' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Access Control Matrix & Authority Distribution (RBAC)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Standard Operating Procedures (SOP) for data access across Robotics Club MAN 2 Kota Bekasi.
                    </p>
                  </div>

                  {/* Category Filter */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto w-full sm:w-auto">
                    {matrixCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          playClickTick();
                          setMatrixCategoryFilter(cat);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer shrink-0 ${
                          matrixCategoryFilter === cat
                            ? 'bg-white text-indigo-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {cat === 'all' ? 'All Modules' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Matrix Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                          <th className="py-2.5 px-3 min-w-[200px]">Feature & Action</th>
                          <th className="py-2.5 px-2 text-center bg-blue-100/70 text-blue-900 min-w-[85px]">
                            <div className="font-bold">👑 Admin</div>
                            <span className="text-[9px] font-normal text-blue-700">Full System</span>
                          </th>
                          <th className="py-2.5 px-2 text-center bg-purple-50/60 text-purple-900 min-w-[85px]">
                            <div className="font-bold">🛡️ Advisor</div>
                            <span className="text-[9px] font-normal text-purple-700">Supervision</span>
                          </th>
                          <th className="py-2.5 px-2 text-center bg-amber-50/60 text-amber-900 min-w-[85px]">
                            <div className="font-bold">⚡ President</div>
                            <span className="text-[9px] font-normal text-amber-700">Leadership</span>
                          </th>
                          <th className="py-2.5 px-2 text-center bg-indigo-50/60 text-indigo-900 min-w-[85px]">
                            <div className="font-bold">⭐ Vice Pres</div>
                            <span className="text-[9px] font-normal text-indigo-700">BPH / Tasks</span>
                          </th>
                          <th className="py-2.5 px-2 text-center bg-emerald-50/60 text-emerald-900 min-w-[85px]">
                            <div className="font-bold">📝 Secretary</div>
                            <span className="text-[9px] font-normal text-emerald-700">Attendance</span>
                          </th>
                          <th className="py-2.5 px-2 text-center bg-pink-50/60 text-pink-900 min-w-[85px]">
                            <div className="font-bold">💰 Treasurer</div>
                            <span className="text-[9px] font-normal text-pink-700">Club Dues</span>
                          </th>
                          <th className="py-2.5 px-2 text-center bg-rose-50/60 text-rose-900 min-w-[85px]">
                            <div className="font-bold">📣 Humas</div>
                            <span className="text-[9px] font-normal text-rose-700">Notices</span>
                          </th>
                          <th className="py-2.5 px-2 text-center bg-slate-100 text-slate-800 min-w-[85px]">
                            <div className="font-bold">👤 Member</div>
                            <span className="text-[9px] font-normal text-slate-600">Student</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMatrix.map((row, idx) => (
                           <tr key={idx} className="hover:bg-slate-50/50 transition">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-900">{row.feature}</span>
                                <span className="text-[9px] text-slate-400 font-mono">({row.category})</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">{row.description}</p>
                            </td>

                            {/* Admin */}
                            <td className="py-2.5 px-2 text-center bg-blue-50/40">
                              {row.admin ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold" title="Full Authority">
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono">-</span>
                              )}
                            </td>

                            {/* Pembina */}
                            <td className="py-2.5 px-2 text-center bg-purple-50/20">
                              {row.pembina ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono">-</span>
                              )}
                            </td>

                            {/* Ketua */}
                            <td className="py-2.5 px-2 text-center bg-blue-50/20">
                              {row.ketua ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono">-</span>
                              )}
                            </td>

                            {/* BPH */}
                            <td className="py-2.5 px-2 text-center bg-indigo-50/20">
                              {row.bph ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono">-</span>
                              )}
                            </td>

                            {/* Sekretaris */}
                            <td className="py-2.5 px-2 text-center bg-emerald-50/20">
                              {row.sekretaris ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-50 text-rose-500 text-[11px] font-bold">
                                  ×
                                </span>
                              )}
                            </td>

                            {/* Bendahara */}
                            <td className="py-2.5 px-2 text-center bg-amber-50/20">
                              {row.bendahara ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-50 text-rose-500 text-[11px] font-bold">
                                  ×
                                </span>
                              )}
                            </td>

                            {/* Public Relations */}
                            <td className="py-2.5 px-2 text-center bg-rose-50/20">
                              {row.pr ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono">-</span>
                              )}
                            </td>

                            {/* Anggota */}
                            <td className="py-2.5 px-2 text-center bg-slate-50/40">
                              {row.anggota ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-50 text-rose-500 text-[11px] font-bold">
                                  ×
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Role Responsibility & Module Authority Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {PRIMARY_APP_ROLES.map((rKey) => {
                    const r = ROLE_DEFINITIONS[rKey];
                    if (!r) return null;
                    const authorities = getRoleAuthoritiesSummary(rKey);
                    return (
                      <div key={rKey} className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-lg border text-xs font-bold ${r.badgeBg} ${r.badgeBorder}`}>
                            {r.label}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {r.shortTitle}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{r.description}</p>
                        
                        {/* Module Authority Badges */}
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Otoritas & Hak Akses Modul:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {authorities.map((a) => (
                              <span
                                key={a.key}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${a.colorClass}`}
                                title={`${a.title}: ${a.statusText}`}
                              >
                                {a.badge}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* SOP Responsibilities */}
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                            Tanggung Jawab SOP:
                          </span>
                          {r.responsibilities.map((res, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[10px] text-slate-500">
                              <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="leading-tight">{res}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: SIMULATE ROLE */}
            {activeTab === 'simulate' && (
              <div className="space-y-4">
                <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200/60">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Role Simulation Sandbox (Uji Simulasi Seluruh Role)</span>
                  </div>
                  <p className="text-xs text-indigo-700/90 mt-1">
                    Fitur ini memungkinkan penguji, pembina, dan administrator untuk mencoba secara instan bagaimana antarmuka dan izin sistem disesuaikan secara otomatis untuk tiap peran (Administrator, Pembina, Ketua, Wakil Ketua, Sekretaris, Bendahara, Humas, Anggota Siswa).
                  </p>
                </div>

                {(() => {
                  const currentRoleCanonical = normalizeRole(currentUserSession?.role);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PRIMARY_APP_ROLES.map((rKey) => {
                        const r = ROLE_DEFINITIONS[rKey];
                        if (!r) return null;
                        const isActive = currentRoleCanonical === rKey;
                        const authorities = getRoleAuthoritiesSummary(rKey);

                        return (
                          <div
                            key={rKey}
                            className={`p-4 rounded-2xl border transition-all ${
                              isActive 
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400' 
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-bold mb-1 ${
                                  isActive ? 'bg-white/20 text-white border border-white/30' : `${r.badgeBg} ${r.badgeBorder}`
                                }`}>
                                  {r.label}
                                </span>
                                <h4 className="text-xs font-bold mt-1">{r.shortTitle}</h4>
                              </div>

                              {isActive && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-indigo-700 uppercase tracking-wide">
                                  Sedang Aktif
                                </span>
                              )}
                            </div>

                            <p className={`text-[11px] mt-2 leading-relaxed ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                              {r.description}
                            </p>

                            {/* Module Authorities Breakdown Badges */}
                            <div className="mt-2.5 pt-2 border-t border-current/10">
                              <span className={`text-[9px] font-bold uppercase tracking-wider block mb-1 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                                Otoritas Modul:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {authorities.map((a) => (
                                  <span
                                    key={a.key}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                      isActive
                                        ? 'bg-white/20 text-white'
                                        : a.colorClass
                                    }`}
                                  >
                                    {a.badge}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-current/10 flex items-center justify-between">
                              <span className={`text-[10px] font-mono ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                                {r.permissions.length} Hak Otoritas Sistem
                              </span>

                              <button
                                type="button"
                                disabled={isActive}
                                onClick={() => {
                                  playClickTick();
                                  onSessionRoleSwitch?.(rKey);
                                  onClose();
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                  isActive
                                    ? 'opacity-50 cursor-not-allowed bg-white/20 text-white'
                                    : 'bg-slate-900 hover:bg-indigo-600 text-white shadow-2xs'
                                }`}
                              >
                                <span>{isActive ? 'Sedang Aktif' : `Uji Role ${r.shortTitle}`}</span>
                                {!isActive && <ArrowRight className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

          </div>

          {/* Demote Account Confirmation Dialog */}
          <AnimatePresence>
            {accountToDemote && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xl max-w-sm w-full space-y-3.5 text-center"
                >
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Revoke Officer Privileges</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Are you sure you want to demote <strong>@{accountToDemote}</strong> to standard <strong>Member / Viewer</strong>? This immediately revokes access to sensitive student PII, treasury bookkeeping, and attendance logs.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAccountToDemote(null)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDemoteUser}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition cursor-pointer"
                    >
                      Confirm Demote
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Delete Account Confirmation Dialog */}
          <AnimatePresence>
            {accountToDelete && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xl max-w-sm w-full space-y-3.5 text-center"
                >
                  <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Hapus Akun Pengguna</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Apakah Anda yakin ingin menghapus akun <strong>@{accountToDelete}</strong>? Akun dan akses ini akan dihapus permanen dari sistem.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAccountToDelete(null)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteUser}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition cursor-pointer"
                    >
                      Ya, Hapus Akun
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Your Session: <strong>{currentUserSession.name}</strong> ({currentUserSession.role})</span>
            </div>

            <button
              type="button"
              onClick={() => {
                playClickTick();
                onClose();
              }}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
