import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  User, 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  RotateCcw,
  KeyRound,
  ShieldCheck,
  Mail,
  Lock,
  Info,
  Database,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../utils/i18n';
import { UserSession, Member } from '../types';
import { 
  getCustomAccounts, 
  saveCustomAccounts, 
  DEFAULT_ACCOUNTS, 
  updateAccountCredentials,
  checkUsernameAvailability,
  hashPassword,
  verifyPasswordMatch,
  sanitizePostgrestFilter
} from '../utils/authConfig';
import { 
  validatePassword, 
  validateUsername, 
  generateSecurePassword 
} from '../utils/passwordSecurity';
import { getSupabase } from '../lib/supabase';
import { saveUserAccountToDB } from '../services/supabaseService';
import { ThemeColor, THEMES } from '../utils/theme';
import { Organization } from '../utils/organizerStore';
import { getRoleMetadata, getCanonicalRole } from '../utils/rbac';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession;
  onUpdateSession: (updatedSession: UserSession) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  currentTheme?: ThemeColor;
  onThemeChange?: (theme: ThemeColor) => void;
  activeOrganization?: Organization;
  onOpenEditModal?: (org: Organization) => void;
  onOpenRoleManagement?: () => void;
  members?: Member[];
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  session,
  onUpdateSession,
  onShowToast,
  currentTheme = 'emerald',
  onThemeChange,
  activeOrganization,
  onOpenEditModal,
  onOpenRoleManagement,
  members = [],
}) => {
  const { language, setLanguage } = useLanguage();
  const canonicalRole = getCanonicalRole(session);
  const isAdmin = canonicalRole === 'admin' || session.role?.toLowerCase() === 'admin' || session.username === 'admin';
  const [activeSettingTab, setActiveSettingTab] = useState<'profile' | 'rbac'>('profile');

  // Deteksi data anggota resmi berbasis NISN atau username
  const matchedMember = useMemo(() => {
    if (!members || members.length === 0) return null;
    const cleanNisn = (session.nisn || '').replace(/[^0-9]/g, '').trim();
    const cleanUser = (session.username || '').toLowerCase().trim();
    return members.find(m => {
      const mNisn = (m.nisn || '').replace(/[^0-9]/g, '').trim();
      const mId = String(m.id_member || '').replace(/[^0-9]/g, '').trim();
      const mUser = (m.fullName || '').toLowerCase().replace(/\s+/g, '_');
      return (cleanNisn && (mNisn === cleanNisn || mId === cleanNisn)) ||
             (cleanUser && (mNisn === cleanUser || mUser === cleanUser || (m.email && m.email.toLowerCase() === cleanUser)));
    }) || null;
  }, [members, session.nisn, session.username]);

  const isNisnBound = Boolean(session.nisn || matchedMember?.nisn || session.isVerifiedMember);
  const officialNisn = session.nisn || matchedMember?.nisn || '';
  const officialName = matchedMember?.fullName || session.name;

  const [name, setName] = useState(isNisnBound && officialName ? officialName : session.name);
  const [username, setUsername] = useState(session.username);
  const [email, setEmail] = useState(session.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [copiedGenerated, setCopiedGenerated] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showResetDefaultsConfirm, setShowResetDefaultsConfirm] = useState(false);

  // Sinkronkan form setiap kali modal dibuka atau session berubah
  useEffect(() => {
    if (isOpen) {
      if (!isAdmin) {
        setActiveSettingTab('profile');
      }
      setName(isNisnBound && officialName ? officialName : session.name);
      setUsername(session.username);
      setEmail(session.email || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      setShowCurrentPass(false);
      setShowNewPass(false);
      setShowConfirmPass(false);
      setCopiedGenerated(false);
    }
  }, [isOpen, session, isAdmin, isNisnBound, officialName]);

  // Evaluasi real-time aturan username
  const usernameCheck = useMemo(() => {
    return validateUsername(username, session.username);
  }, [username, session.username]);

  // Evaluasi real-time 7 aturan keamanan kata sandi baru
  const passwordCheck = useMemo(() => {
    if (!newPassword) return null;
    return validatePassword(newPassword, {
      username,
      name,
      email,
    });
  }, [newPassword, username, name, email]);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const strong = generateSecurePassword();
    setNewPassword(strong);
    setConfirmPassword(strong);
    setShowNewPass(true);
    setCopiedGenerated(true);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(strong).catch(() => {});
    }
    setTimeout(() => setCopiedGenerated(false), 2500);
    onShowToast('Strong random password (16 characters) generated and copied to clipboard!', 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. Aturan Validasi Nama (Otomatis terkunci ke nama resmi jika terikat NISN)
    const cleanName = isNisnBound && officialName ? officialName.trim() : name.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Account full name must be at least 2 characters.');
      return;
    }

    // 2. Aturan Format Username
    const cleanUsername = username.trim().toLowerCase();
    const userVal = validateUsername(cleanUsername, session.username);
    if (!userVal.isValid) {
      setErrorMsg(userVal.error || 'Invalid username format (4-20 characters: letters, numbers, dot, underscore).');
      return;
    }

    // 3. Aturan Email: HANYA wajib untuk Administrator
    const cleanEmail = email.trim().toLowerCase();
    if (isAdmin) {
      if (!cleanEmail) {
        setErrorMsg(language === 'id' ? 'Alamat email wajib diisi untuk administrator.' : 'Email address is required for administrator.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setErrorMsg('Invalid email address format.');
        return;
      }
    }

    // 4. Aturan Keunikan Username jika diubah
    const isUsernameChanged = cleanUsername !== session.username.trim().toLowerCase();
    if (isUsernameChanged) {
      const avail = await checkUsernameAvailability(cleanUsername, session.username);
      if (!avail.available) {
        setErrorMsg(avail.reason || 'Username is already taken by another account.');
        return;
      }
    }

    // Ambil data akun lokal saat ini
    const accounts = getCustomAccounts();
    const currentAccount = accounts.find(
      a => a.username.toLowerCase() === session.username.trim().toLowerCase()
    );

    const isChangingPassword = Boolean(newPassword.trim());

    // 5. Aturan Verifikasi Kata Sandi Saat Ini
    // Wajib memasukkan kata sandi saat ini jika mengganti kata sandi atau mengubah username pada akun terproteksi
    if (isChangingPassword || (isUsernameChanged && currentAccount?.password)) {
      if (!currentPassword) {
        setErrorMsg(
          isChangingPassword
            ? 'Enter your current password to verify password change!'
            : 'Enter your current password to confirm username change!'
        );
        return;
      }

      // Verifikasi kata sandi saat ini terhadap hash tersimpan (PBKDF2 / SHA-256)
      let isCurrentValid = false;
      if (currentAccount?.password) {
        isCurrentValid = await verifyPasswordMatch(currentPassword, currentAccount.password);
      }

      // Fallback: periksa langsung ke Supabase user_accounts jika di lokal tidak cocok (misal password diperbarui dari device lain)
      if (!isCurrentValid && !session.isDemo) {
        try {
          const supa = getSupabase();
          const safeUser = sanitizePostgrestFilter(session.username);
          if (safeUser) {
            const { data } = await supa
              .from('user_accounts')
              .select('password')
              .ilike('username', safeUser)
              .limit(1);
            if (data && data.length > 0 && data[0].password) {
              isCurrentValid = await verifyPasswordMatch(currentPassword, data[0].password);
            }
          }
        } catch (err) {
          console.warn('Fallback verification against DB notice:', err);
        }
      }

      if (!isCurrentValid) {
        setErrorMsg('Current password is incorrect! Account update request denied for security.');
        return;
      }
    }

    // 6. Aturan 7 Keamanan Kata Sandi Baru
    if (isChangingPassword) {
      const pwdVal = validatePassword(newPassword.trim(), {
        username: cleanUsername,
        name: cleanName,
        email: cleanEmail,
      });

      if (!pwdVal.isValid) {
        setErrorMsg(
          `New password does not meet security requirements: ${
            pwdVal.errors[0] || 'Fulfill all password criteria below.'
          }`
        );
        return;
      }

      if (newPassword.trim() !== confirmPassword.trim()) {
        setErrorMsg('New password confirmation does not match. Please ensure both passwords match.');
        return;
      }
    }

    setIsSaving(true);

    try {
      // Compute hashed password only when password was explicitly changed; otherwise preserve existing hash
      const finalPassword = isChangingPassword
        ? await hashPassword(newPassword.trim())
        : (currentAccount?.password || '');

      // 1. Perbarui kredensial akun di penyimpanan lokal dan migrasi key data jika username berganti
      await updateAccountCredentials(
        session.username,
        cleanUsername,
        finalPassword,
        cleanName,
        session.role,
        cleanEmail
      );

      // 2. Persist to Supabase database (public.user_accounts table) if not running in demo sandbox mode
      let saveRes: { success: boolean; error?: string } = { success: true };
      if (!session.isDemo) {
        saveRes = await saveUserAccountToDB(
          {
            username: cleanUsername,
            password: finalPassword,
            name: cleanName,
            role: session.role,
            email: cleanEmail,
            authProvider: session.authProvider || 'credentials',
            avatarUrl: session.avatarUrl,
          },
          session.username
        );
      }

      // 3. Perbarui state session aktif di aplikasi
      const updatedSession: UserSession = {
        ...session,
        username: cleanUsername,
        name: cleanName,
        email: cleanEmail,
      };

      onUpdateSession(updatedSession);
      const { token: _omitToken, ...safeSession } = updatedSession;
      localStorage.setItem('robotics_auth', JSON.stringify(safeSession));

      setIsSaving(false);
      onClose();

      if (session.isDemo) {
        onShowToast('[Demo Sandbox] Demo account profile saved in local session.', 'info');
      } else if (saveRes.success) {
        onShowToast('Profile and account settings saved successfully!', 'success');
      } else {
        onShowToast('Profile and account settings saved successfully!', 'success');
      }
    } catch (err: any) {
      setIsSaving(false);
      setErrorMsg(`Failed to save changes: ${err.message || 'Connection issue occurred'}`);
    }
  };

  const handleResetToDefaults = () => {
    setShowResetDefaultsConfirm(true);
  };

  const confirmResetToDefaults = async () => {
    setShowResetDefaultsConfirm(false);
    saveCustomAccounts(DEFAULT_ACCOUNTS);
    const defaultUser = DEFAULT_ACCOUNTS[0];
    const updatedSession: UserSession = {
      ...session,
      username: defaultUser.username,
      name: defaultUser.name,
    };
    onUpdateSession(updatedSession);
    const { token: _t, ...safeSession } = updatedSession;
    localStorage.setItem('robotics_auth', JSON.stringify(safeSession));
    setUsername(defaultUser.username);
    setName(defaultUser.name);
    setEmail(defaultUser.email || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    // Resave default accounts to Supabase if not running in demo sandbox
    if (!session.isDemo) {
      try {
        for (const acc of DEFAULT_ACCOUNTS) {
          await saveUserAccountToDB(acc);
        }
      } catch (e) {
        console.warn('Reset accounts in DB error:', e);
      }
    }

    onShowToast('Accounts reset to official default settings.', 'info');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white/95 backdrop-blur-md border border-sky-100 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-6"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#312E81] p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-sky-200 shadow-inner">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">Profile & Account Settings</h2>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-sky-200 border border-white/20">
                    {session.role}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-emerald-400" />
                  <span>Saved</span>
                  {session.isDemo && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200 ml-1">
                      Demo Sandbox Mode
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Settings Tabs Navigation */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2.5 gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveSettingTab('profile')}
              className={`py-2 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeSettingTab === 'profile'
                  ? 'border-indigo-600 text-indigo-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile & Account</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveSettingTab('rbac')}
                className={`py-2 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  activeSettingTab === 'rbac'
                    ? 'border-indigo-600 text-indigo-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Access Control (RBAC)</span>
              </button>
            )}
          </div>

          {/* Tab 2: RBAC Access Control - Admin view only */}
          {isAdmin && activeSettingTab === 'rbac' && (
            <div className="p-6 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto text-xs">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    Current User Role
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                    {getRoleMetadata(session.role).shortTitle}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {getRoleMetadata(session.role).label}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {getRoleMetadata(session.role).description}
                  </p>
                </div>
              </div>

              {/* Action Button to Open Full RBAC Modal */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <h4 className="font-bold text-sm text-slate-900">
                  Access Control & Permissions Matrix (RBAC)
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Manage access privileges for Advisors, Presidents, Secretaries, Treasurers, and Members according to organization SOP.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRoleManagement?.();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Open SOP Matrix & Manage RBAC Roles</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Profile & Credentials Form Content */}
          {activeSettingTab === 'profile' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[calc(85vh-120px)] overflow-y-auto">
            {/* Error Message Box */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5 font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {/* Account Change Notice Info */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-2.5 text-[11px] text-slate-600">
              <Info className="w-4 h-4 text-[#4338CA] shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-relaxed">
                <span className="font-bold text-slate-800">Account Change Policy:</span>
                <p>
                  Profile and username changes will be saved. When modifying password or username, current password verification is required for security.
                </p>
              </div>
            </div>

            {/* Section 1: Profile Identity & Account */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-[#4338CA]" />
                <span>User Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>{language === 'id' ? 'Nama Lengkap' : 'Full Name'}</span>
                      <span className="text-rose-500">*</span>
                    </span>
                    {isNisnBound && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <Lock className="w-2.5 h-2.5 text-emerald-600" />
                        <span>{language === 'id' ? `Terkunci NISN: ${officialNisn}` : `NISN Locked: ${officialNisn}`}</span>
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      readOnly={isNisnBound}
                      disabled={isNisnBound}
                      value={name}
                      onChange={(e) => !isNisnBound && setName(e.target.value)}
                      placeholder={isNisnBound ? officialName : 'e.g. Robotics Club Member'}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                        isNisnBound
                          ? 'bg-slate-100/90 border border-slate-200 text-slate-700 cursor-not-allowed select-none pl-9'
                          : 'bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA]'
                      }`}
                    />
                    {isNisnBound && (
                      <div className="absolute left-3 top-3 text-slate-400">
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {isNisnBound
                      ? (language === 'id'
                          ? 'Nama lengkap resmi terdeteksi otomatis dari NISN Buku Induk Ekskul. Hubungi Pembina / Admin jika ada ralat ejaan.'
                          : 'Official full name is auto-detected & locked from official NISN student records.')
                      : (language === 'id' ? 'Minimal 2 karakter' : 'Minimum 2 characters')}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>{isNisnBound ? (language === 'id' ? 'ID Akun / NISN' : 'Account ID / NISN') : (language === 'id' ? 'Username Login' : 'Login Username')}</span>
                      <span className="text-rose-500">*</span>
                    </span>
                    {isNisnBound ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <Lock className="w-2.5 h-2.5 text-emerald-600" />
                        <span>{language === 'id' ? 'Sesuai NISN' : 'Linked to NISN'}</span>
                      </span>
                    ) : (
                      usernameCheck.isValid && (
                        <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Valid
                        </span>
                      )
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      readOnly={isNisnBound}
                      disabled={isNisnBound}
                      value={username}
                      onChange={(e) => !isNisnBound && setUsername(e.target.value)}
                      placeholder="Login username"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-semibold transition ${
                        isNisnBound
                          ? 'bg-slate-100/90 border border-slate-200 text-slate-700 cursor-not-allowed select-none pl-9'
                          : `bg-slate-50 border ${
                              usernameCheck.isValid
                                ? 'border-slate-200 focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA]'
                                : 'border-amber-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                            } text-slate-900 focus:outline-none focus:bg-white`
                      }`}
                    />
                    {isNisnBound && (
                      <div className="absolute left-3 top-3 text-slate-400">
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {isNisnBound
                      ? (language === 'id'
                          ? 'ID login akun otomatis menggunakan NISN resmi siswa Anda.'
                          : 'Login ID is automatically linked to your official student NISN.')
                      : (language === 'id'
                          ? '4-20 karakter: huruf, angka, titik (.), atau garis bawah (_)'
                          : '4-20 characters: letters, numbers, dot (.), underscore (_)')}
                  </span>
                </div>
              </div>

              {/* Email & Role Display (Email only shown & required for Administrator) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isAdmin ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{language === 'id' ? 'Alamat Email Admin' : 'Admin Email Address'}</span>
                        <span className="text-rose-500">*</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {language === 'id' ? 'Wajib' : 'Required'}
                      </span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@organization.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] transition"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {language === 'id'
                        ? 'Email resmi administrator sistem'
                        : 'Official system administrator email'}
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{language === 'id' ? 'Metode Autentikasi' : 'Authentication Method'}</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        PIN Aktif
                      </span>
                    </label>
                    <div className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center justify-between">
                      <span className="font-mono text-slate-700 font-semibold">NISN + 4-Digit Recovery PIN</span>
                      <span className="text-[10px] text-slate-400">Tanpa Email</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {language === 'id'
                        ? 'Akun siswa & pengurus menggunakan NISN & PIN 4-digit pribadi untuk pemulihan akun.'
                        : 'Student & board accounts use NISN & personal 4-digit PIN for account recovery.'}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Role & Access Privileges</span>
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold flex items-center justify-between">
                    <span>{session.role}</span>
                    <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      Active
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Configured according to system authorization</span>
                </div>
              </div>
            </div>

            {/* Section: Language Preference (EN / ID) */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-blue-600" />
                  <span>Language / Bahasa Antarmuka</span>
                </span>
                <span className="text-[11px] text-slate-500">Switch display language</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                    language === 'en'
                      ? 'bg-blue-50/90 border-blue-600 shadow-2xs ring-2 ring-blue-500/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🇬🇧</span>
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">English</span>
                      <span className="text-[10px] text-slate-500">International standard</span>
                    </div>
                  </div>
                  {language === 'en' && <Check className="w-4 h-4 text-blue-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setLanguage('id')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                    language === 'id'
                      ? 'bg-blue-50/90 border-blue-600 shadow-2xs ring-2 ring-blue-500/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🇮🇩</span>
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">Bahasa Indonesia</span>
                      <span className="text-[10px] text-slate-500">Standar baku</span>
                    </div>
                  </div>
                  {language === 'id' && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              </div>
            </div>

            {/* Section 2: Color Scheme & Theme */}
            {onThemeChange && (
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Color Scheme & Theme</span>
                  <span className="text-[11px] text-slate-500">Select application visual appearance</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(Object.keys(THEMES) as ThemeColor[]).map((tKey) => {
                    const t = THEMES[tKey];
                    const isSelected = currentTheme === tKey;
                    return (
                      <button
                        key={tKey}
                        type="button"
                        onClick={() => onThemeChange(tKey)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-slate-50 border-[#4338CA] shadow-2xs ring-2 ring-[#4338CA]/30'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full shrink-0 ring-1 ring-slate-300"
                          style={{ backgroundColor: t.colorHex }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                            {t.shortName}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {t.badge}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 3: Change Password */}
            <div className="pt-3 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#4338CA]" />
                  <span className="text-xs font-bold text-slate-900">Change Password</span>
                </div>
                <span className="text-[11px] text-slate-400">(Leave blank if not changing)</span>
              </div>

              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>
                    Current Password {newPassword || (username.trim().toLowerCase() !== session.username.toLowerCase()) ? <span className="text-rose-500">* (Required)</span> : <span className="text-slate-400 font-normal">(Required if modifying password/username)</span>}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* New Password & Generator */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Criteria: 7 Password Security Standards
                  </span>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#4338CA] hover:text-[#312E81] hover:underline cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{copiedGenerated ? 'Password Generated & Copied!' : 'Generate Strong Password (16 Chars)'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 12 diverse characters"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] transition font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Confirm New Password</span>
                      {newPassword && confirmPassword && (
                        <span className={`text-[10px] font-semibold ${newPassword === confirmPassword ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {newPassword === confirmPassword ? 'Match' : 'Mismatch'}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] transition font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Strength Meter & 7 Live Rule Badges */}
                {newPassword && passwordCheck && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Password Strength:</span>
                      <span className={`font-bold px-2.5 py-0.5 rounded-full border text-[11px] ${passwordCheck.strengthColor}`}>
                        {passwordCheck.strengthLabel} ({passwordCheck.score}%)
                      </span>
                    </div>

                    {/* Score Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordCheck.score >= 85
                            ? 'bg-emerald-500'
                            : passwordCheck.score >= 60
                            ? 'bg-teal-500'
                            : passwordCheck.score >= 40
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${passwordCheck.score}%` }}
                      />
                    </div>

                    {/* Detailed Rules Checklist */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1 text-[10px]">
                      {passwordCheck.rules.map((rule) => (
                        <div
                          key={rule.id}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${
                            rule.isValid
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                        >
                          {rule.isValid ? (
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="w-3 h-3 rounded-full border border-slate-300 shrink-0 inline-block text-center text-[9px] leading-none text-slate-400">
                              ○
                            </span>
                          )}
                          <span className="truncate">{rule.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default Accounts</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 active:from-sky-700 active:to-indigo-800 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
          )}

          {/* Reset Accounts Confirmation Dialog */}
          <AnimatePresence>
            {showResetDefaultsConfirm && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xl max-w-sm w-full space-y-3.5 text-center"
                >
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Reset Default Accounts</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Are you sure you want to reset all accounts to official organization configuration defaults?
                    </p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowResetDefaultsConfirm(false)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmResetToDefaults}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition cursor-pointer"
                    >
                      Reset Defaults
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
