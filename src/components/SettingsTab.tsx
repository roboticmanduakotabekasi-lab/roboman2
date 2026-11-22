import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings as SettingsIcon, 
  Sliders, 
  ShieldCheck, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Key, 
  Eye, 
  EyeOff, 
  LogOut, 
  CheckCircle2, 
  Database, 
  User, 
  Mail, 
  Lock, 
  Check, 
  AlertCircle, 
  KeyRound, 
  Languages, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserSession } from '../types';
import { 
  isSoundEnabled, 
  setSoundEnabled, 
  playClickTick, 
  playSuccessChime, 
  playWarningBuzzer 
} from '../utils/audioFeedback';
import { useLanguage } from '../utils/i18n';
import { 
  getCustomAccounts, 
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
import { 
  getRoleMetadata, 
  getRoleAuthoritiesSummary, 
  isHeadAdmin 
} from '../utils/rbac';

interface SettingsTabProps {
  session: UserSession | null;
  onUpdateSession?: (session: UserSession) => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
  onOpenProfileModal?: () => void;
  onOpenLogoutModal?: () => void;
  onOpenSupabaseModal?: () => void;
  showNotificationShortcut?: boolean;
  onToggleNotificationShortcut?: (show: boolean) => void;
  compactSpacing?: boolean;
  onToggleCompactSpacing?: (compact: boolean) => void;
  reduceMotion?: boolean;
  onToggleReduceMotion?: (reduced: boolean) => void;
  currentTheme?: ThemeColor;
  onThemeChange?: (theme: ThemeColor) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  session,
  onUpdateSession,
  onShowToast,
  onOpenLogoutModal,
  onOpenSupabaseModal,
  showNotificationShortcut = true,
  onToggleNotificationShortcut,
  compactSpacing = false,
  onToggleCompactSpacing,
  reduceMotion = false,
  onToggleReduceMotion,
  currentTheme = 'indigo',
  onThemeChange,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const isEn = language === 'en';

  const roleMeta = useMemo(() => {
    return getRoleMetadata(session?.role);
  }, [session?.role]);

  const roleAuthorities = useMemo(() => {
    return getRoleAuthoritiesSummary(session, language);
  }, [session, language]);

  // Preferensi Display & Audio
  const [isCompact, setIsCompact] = useState(compactSpacing);
  const [isReducedMotion, setIsReducedMotion] = useState(reduceMotion);
  const [showShortcut, setShowShortcut] = useState(showNotificationShortcut);
  const [soundActive, setSoundActive] = useState(() => isSoundEnabled());

  // Form Pengaturan Akun Langsung (Direct Account Form State)
  const [name, setName] = useState(session?.name || '');
  const [username, setUsername] = useState(session?.username || '');
  const [email, setEmail] = useState(session?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [copiedGenerated, setCopiedGenerated] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sinkronkan state saat session berganti
  useEffect(() => {
    if (session) {
      setName(session.name || '');
      setUsername(session.username || '');
      setEmail(session.email || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [session]);

  useEffect(() => {
    setIsCompact(compactSpacing);
  }, [compactSpacing]);

  useEffect(() => {
    setIsReducedMotion(reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    setShowShortcut(showNotificationShortcut);
  }, [showNotificationShortcut]);

  // Evaluasi username realtime
  const usernameCheck = useMemo(() => {
    if (!session) return { isValid: true };
    return validateUsername(username, session.username);
  }, [username, session]);

  // Evaluasi 7 kriteria password realtime
  const passwordCheck = useMemo(() => {
    if (!newPassword) return null;
    return validatePassword(newPassword, {
      username,
      name,
      email,
    });
  }, [newPassword, username, name, email]);

  const handleToggleCompact = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setIsCompact(val);
    onToggleCompactSpacing?.(val);
    try {
      localStorage.setItem('robotics_compact_spacing', String(val));
    } catch {}
  };

  const handleToggleMotion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setIsReducedMotion(val);
    onToggleReduceMotion?.(val);
    try {
      localStorage.setItem('robotics_reduce_motion', String(val));
    } catch {}
  };

  const handleToggleShortcut = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setShowShortcut(val);
    onToggleNotificationShortcut?.(val);
    try {
      localStorage.setItem('robotics_show_notif_shortcut', String(val));
    } catch {}
  };

  const handleToggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
  };

  const handleGeneratePassword = () => {
    playClickTick();
    const strong = generateSecurePassword();
    setNewPassword(strong);
    setConfirmPassword(strong);
    setShowNewPass(true);
    setCopiedGenerated(true);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(strong).catch(() => {});
    }
    setTimeout(() => setCopiedGenerated(false), 2500);
    if (onShowToast) {
      onShowToast(
        isEn ? 'Strong 16-character password generated and copied!' : 'Kata sandi acak kuat (16 karakter) dibuat & disalin ke clipboard!',
        'success'
      );
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setErrorMsg('');
    setSuccessMsg('');

    // 1. Validasi Nama
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      const msg = isEn ? 'Account full name must be at least 2 characters.' : 'Nama lengkap akun minimal 2 karakter.';
      setErrorMsg(msg);
      playWarningBuzzer();
      return;
    }

    // 2. Validasi Username
    const cleanUsername = username.trim().toLowerCase();
    const userVal = validateUsername(cleanUsername, session.username);
    if (!userVal.isValid) {
      const msg = userVal.error || (isEn ? 'Invalid username format (4-20 characters: letters, numbers, dot, underscore).' : 'Format username tidak valid (4-20 karakter: huruf, angka, titik, garis bawah).');
      setErrorMsg(msg);
      playWarningBuzzer();
      return;
    }

    // 3. Validasi Email (HANYA untuk Administrator)
    const cleanEmail = isSuperAdmin ? email.trim().toLowerCase() : (session.email || '');
    if (isSuperAdmin && cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const msg = isEn ? 'Invalid email address format.' : 'Format alamat email tidak valid.';
      setErrorMsg(msg);
      playWarningBuzzer();
      return;
    }

    // 4. Validasi Keunikan Username jika berubah
    const isUsernameChanged = cleanUsername !== session.username.trim().toLowerCase();
    if (isUsernameChanged) {
      const avail = await checkUsernameAvailability(cleanUsername, session.username);
      if (!avail.available) {
        const msg = avail.reason || (isEn ? 'Username is already taken by another account.' : 'Username sudah digunakan oleh akun lain.');
        setErrorMsg(msg);
        playWarningBuzzer();
        return;
      }
    }

    const accounts = getCustomAccounts();
    const currentAccount = accounts.find(
      a => a.username.toLowerCase() === session.username.trim().toLowerCase()
    );

    const isChangingPassword = Boolean(newPassword.trim());

    // 5. Validasi Kata Sandi Saat Ini
    if (isChangingPassword || (isUsernameChanged && currentAccount?.password)) {
      if (!currentPassword) {
        const msg = isChangingPassword
          ? (isEn ? 'Enter your current password to verify password change.' : 'Masukkan kata sandi saat ini untuk memverifikasi perubahan password!')
          : (isEn ? 'Enter your current password to confirm username change.' : 'Masukkan kata sandi saat ini untuk mengonfirmasi perubahan username!');
        setErrorMsg(msg);
        playWarningBuzzer();
        return;
      }

      let isCurrentValid = false;
      if (currentAccount?.password) {
        isCurrentValid = await verifyPasswordMatch(currentPassword, currentAccount.password);
      }

      // Fallback: periksa ke database Supabase
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
          console.warn('Fallback verification notice:', err);
        }
      }

      if (!isCurrentValid) {
        const msg = isEn 
          ? 'Current password is incorrect! Account update request denied.' 
          : 'Kata sandi saat ini salah! Permintaan perubahan ditolak demi keamanan.';
        setErrorMsg(msg);
        playWarningBuzzer();
        return;
      }
    }

    // 6. Validasi 7 Kriteria Password Baru
    if (isChangingPassword) {
      const pwdVal = validatePassword(newPassword.trim(), {
        username: cleanUsername,
        name: cleanName,
        email: cleanEmail,
      });

      if (!pwdVal.isValid) {
        const msg = isEn
          ? `New password does not meet security requirements: ${pwdVal.errors[0] || 'Fulfill all password criteria.'}`
          : `Kata sandi baru belum memenuhi standar: ${pwdVal.errors[0] || 'Lengkapi seluruh kriteria kata sandi di bawah.'}`;
        setErrorMsg(msg);
        playWarningBuzzer();
        return;
      }

      if (newPassword.trim() !== confirmPassword.trim()) {
        const msg = isEn ? 'New password confirmation does not match.' : 'Konfirmasi kata sandi baru tidak cocok. Pastikan keduanya sama.';
        setErrorMsg(msg);
        playWarningBuzzer();
        return;
      }
    }

    setIsSaving(true);

    try {
      const finalPassword = isChangingPassword
        ? await hashPassword(newPassword.trim())
        : (currentAccount?.password || '');

      // Simpan kredensial di lokal
      await updateAccountCredentials(
        session.username,
        cleanUsername,
        finalPassword,
        cleanName,
        session.role,
        cleanEmail
      );

      // Simpan ke Supabase jika bukan demo
      if (!session.isDemo) {
        await saveUserAccountToDB(
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

      const updatedSession: UserSession = {
        ...session,
        username: cleanUsername,
        name: cleanName,
        email: cleanEmail,
      };

      onUpdateSession?.(updatedSession);
      const { token: _t, ...safeSession } = updatedSession;
      localStorage.setItem('robotics_auth', JSON.stringify(safeSession));

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsSaving(false);
      playSuccessChime();

      const successTxt = isEn 
        ? 'Account settings and credentials updated successfully!' 
        : 'Pengaturan akun dan kredensial login berhasil diperbarui!';
      setSuccessMsg(successTxt);
      onShowToast?.(successTxt, 'success');
    } catch (err: any) {
      setIsSaving(false);
      const errTxt = isEn ? `Failed to save changes: ${err.message}` : `Gagal menyimpan perubahan: ${err.message}`;
      setErrorMsg(errTxt);
      playWarningBuzzer();
    }
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header section matching Canva design */}
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-sky-600 border-l-2 border-sky-500 pl-2.5 inline-block mb-1.5">
          {isEn ? 'WORKSPACE & ACCOUNT' : 'PENGATURAN RUANG KERJA & AKUN'}
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          {isEn ? 'Settings' : 'Pengaturan'}
        </h1>
        <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
          {isEn 
            ? 'Manage your personal profile, account credentials, and interface preferences directly.' 
            : 'Kelola profil pribadi, kata sandi akun, serta preferensi tampilan antarmuka Anda secara langsung.'}
        </p>
      </div>

      {/* Main Grid: Account Settings (Left/Top) + Preferences & Session (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* =============================================================== */}
        {/* SECTION 1: DIRECT ACCOUNT SETTINGS & SECURITY (Lg: 7 cols)     */}
        {/* =============================================================== */}
        <div className="lg:col-span-7 bg-white/95 rounded-3xl p-6 sm:p-7 shadow-sm border border-sky-100 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                  {isEn ? 'Account Profile & Login' : 'Profil Akun & Kredensial Login'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {isEn ? 'Update your display name, username, and password.' : 'Perbarui nama lengkap, nama pengguna, dan kata sandi Anda.'}
                </p>
              </div>
            </div>

            {session?.role && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {getRoleMetadata(session.role).shortTitle}
              </span>
            )}
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{successMsg}</span>
            </motion.div>
          )}

          <form onSubmit={handleSaveAccount} className="space-y-4">
            {/* Nama Lengkap & Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <span>{isEn ? 'Full Name' : 'Nama Lengkap'}</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isEn ? "e.g. Robotics Club Member" : "Contoh: Anggota Robotik"}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>{isEn ? 'Login Username' : 'Username Login'}</span>
                    <span className="text-rose-500">*</span>
                  </span>
                  {usernameCheck.isValid && (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> {isEn ? 'Valid' : 'Sesuai'}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:bg-white transition ${
                    usernameCheck.isValid
                      ? 'border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                      : 'border-amber-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                  }`}
                />
              </div>
            </div>

            {/* Email & Peran (Email hanya untuk Administrator) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isSuperAdmin ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isEn ? 'Admin Email Address' : 'Alamat Email Admin'}</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@organization.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {isEn ? 'Official administrator email' : 'Alamat email resmi administrator'}
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isEn ? 'Authentication Method' : 'Metode Autentikasi'}</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      PIN Aktif
                    </span>
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center justify-between">
                    <span className="font-mono text-slate-700 font-semibold">NISN + 4-Digit Recovery PIN</span>
                    <span className="text-[10px] text-slate-400">{isEn ? 'No Email' : 'Tanpa Email'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {isEn ? 'Account recovery uses personal NISN and 4-digit PIN.' : 'Pemulihan akun menggunakan NISN dan PIN 4-digit pribadi.'}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isEn ? 'Assigned Role' : 'Peran & Hak Akses'}</span>
                </label>
                <div className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold flex items-center justify-between">
                  <span>{session?.role || 'Member'}</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Section: Change Password (In-Line) */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900">
                    {isEn ? 'Change Password' : 'Ganti Kata Sandi'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {isEn ? '(Leave empty if not changing)' : '(Kosongkan jika tidak diubah)'}
                </span>
              </div>

              {/* Current Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  <span>{isEn ? 'Current Password' : 'Kata Sandi Saat Ini'}</span>{' '}
                  {newPassword || (session && username.trim().toLowerCase() !== session.username.toLowerCase()) ? (
                    <span className="text-rose-500 font-bold">* {isEn ? '(Required to verify)' : '(Wajib diisi)'}</span>
                  ) : null}
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={isEn ? "Enter current password" : "Ketik kata sandi saat ini"}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Password Generator Shortcut */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-semibold text-slate-600">
                  {isEn ? 'New Password Setup' : 'Kata Sandi Baru'}
                </span>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>
                    {copiedGenerated 
                      ? (isEn ? 'Generated & Copied!' : 'Berhasil Dibuat & Disalin!') 
                      : (isEn ? 'Generate Strong Password' : 'Buat Password Acak Kuat')}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isEn ? 'New Password' : 'Kata Sandi Baru'}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={isEn ? "Min. 12 characters" : "Min. 12 karakter"}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isEn ? 'Confirm New Password' : 'Ulangi Kata Sandi Baru'}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={isEn ? "Repeat new password" : "Ketik ulang password"}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Rules Checklist */}
              {passwordCheck && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-[11px]">
                  <span className="font-bold text-slate-700 block mb-1">
                    {isEn ? 'Password Security Checklist:' : 'Standar Keamanan Kata Sandi:'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px]">
                    {passwordCheck.rules.map((rule) => (
                      <span
                        key={rule.id}
                        className={rule.isValid ? 'text-emerald-600 font-semibold flex items-center gap-1' : 'text-slate-400 flex items-center gap-1'}
                        title={rule.hint}
                      >
                        {rule.isValid ? '✓' : '•'} {rule.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <span>{isEn ? 'Saving Changes...' : 'Menyimpan Perubahan...'}</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isEn ? 'Save Account Changes' : 'Simpan Perubahan Akun'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* =============================================================== */}
        {/* SECTION 2: WORKSPACE PREFERENCES & SESSION (Lg: 5 cols)         */}
        {/* =============================================================== */}
        <div className="lg:col-span-5 space-y-6">

          {/* Display & Layout Card */}
          <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-sky-100 space-y-5">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {isEn ? 'Display & Interface' : 'Tampilan & Antarmuka'}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isEn ? 'Adjust visual spacing and animation effects.' : 'Atur kepadatan tata letak dan efek animasi.'}
              </p>
            </div>

            <div className="space-y-3.5">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isCompact}
                  onChange={handleToggleCompact}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {isEn ? 'Use compact spacing' : 'Gunakan tata letak ringkas'}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isReducedMotion}
                  onChange={handleToggleMotion}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {isEn ? 'Reduce motion & transitions' : 'Kurangi animasi transisi'}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showShortcut}
                  onChange={handleToggleShortcut}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {isEn ? 'Show notification icon in header' : 'Tampilkan ikon notifikasi di bilah atas'}
                </span>
              </label>
            </div>

            {/* Audio Sound Effects */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                {!soundActive ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-blue-600" />}
                <span>{isEn ? 'Sound Effects' : 'Efek Suara Audio'}</span>
              </span>
              <button
                type="button"
                onClick={handleToggleSound}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  !soundActive
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                {!soundActive ? (isEn ? 'Muted' : 'Senyap') : (isEn ? 'Enabled' : 'Aktif')}
              </button>
            </div>

            {/* Language Switcher in Settings */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <Languages className="w-4 h-4 text-blue-600" />
                <span>{isEn ? 'Language' : 'Bahasa'}</span>
              </span>
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLanguage('id')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    language === 'id' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🇮🇩 ID
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    language === 'en' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🇬🇧 EN
                </button>
              </div>
            </div>
          </div>

          {/* Active Session & Logout Card */}
          <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-sky-100 space-y-4">
            <h2 className="text-base font-extrabold text-slate-900">
              {isEn ? 'Active Session' : 'Sesi Aktif Saat Ini'}
            </h2>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                {session?.name ? session.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {session?.name || 'User'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono truncate">
                  @{session?.username || 'user'} • {session?.role || 'Member'}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{isEn ? 'Authenticated Session' : 'Sesi Terotentikasi'}</span>
              </div>

              {onOpenLogoutModal && (
                <button
                  type="button"
                  onClick={onOpenLogoutModal}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Sign out' : 'Keluar'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Role Authorities & Scope Card (Customized for each role) */}
          <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-sky-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {isEn ? 'My Role & Authority' : 'Peran & Otoritas Saya'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {isEn ? 'Permissions and modules granted to your account.' : 'Daftar hak akses modul sesuai peran Anda.'}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {roleMeta.label}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              {roleMeta.description}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {roleAuthorities.map((auth) => (
                <div
                  key={auth.key}
                  className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${auth.colorClass}`}
                >
                  <span className="font-bold truncate">{auth.title}</span>
                  <span className="text-[10px] opacity-90 truncate mt-0.5">{auth.badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Database Setup Card (STRICTLY Admin Only - Hidden from all other roles) */}
          {isHeadAdmin(session) && onOpenSupabaseModal && (
            <div className="bg-gradient-to-br from-[#0B1528] via-[#0E2044] to-[#163166] text-white rounded-3xl p-6 shadow-md border border-sky-500/30 space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 text-emerald-400 border border-white/15 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    {isEn ? 'Cloud Database Storage' : 'Koneksi Database Cloud'}
                  </h3>
                  <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                    {isEn ? 'Head Admin Only' : 'Khusus Admin Utama'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {isEn 
                  ? 'Manage your Supabase connection parameters and synchronized club database schema.'
                  : 'Kelola kredensial Supabase dan status sinkronisasi basis data roboman2.'}
              </p>

              <button
                type="button"
                onClick={() => {
                  playClickTick();
                  onOpenSupabaseModal();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{isEn ? 'Configure Supabase Database' : 'Konfigurasi Database Supabase'}</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
