import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserSession } from '../types';
import {
  verifyAccountCredentials,
  registerNewAccount,
  ENV_ADMIN_EMAIL,
  updateAccountCredentials,
  hashPassword,
  getCustomAccounts,
  sanitizePostgrestFilter,
  setMemoryAuthToken,
  verifyStudentRecoveryPin,
  updateAccountPasswordByNisn
} from '../utils/authConfig';
import { getSupabase } from '../lib/supabase';
import { fetchProfileFromDB } from '../services/supabaseService';
import { normalizeDateString } from '../utils/universalDataParser';
import {
  validatePassword,
  validateUsername,
  generateSecurePassword,
  generateAntiBotChallenge,
  BotChallenge,
} from '../utils/passwordSecurity';
import {
  LogIn,
  UserPlus,
  User,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Shield,
  Crown,
  Award,
  Megaphone,
  FileText,
  UserCheck,
  Sparkles,
  RefreshCw,
  KeyRound,
  Check,
  Clock,
  ArrowRight,
  ArrowLeft,
  School,
  Wallet,
  CalendarCheck,
  Calendar,
  Users
} from 'lucide-react';
import { INITIAL_MEMBERS } from '../data/initialData';
import { AppFooter } from './AppFooter';
import { useLanguage } from '../utils/i18n';
import { LanguageToggle } from './LanguageToggle';

interface LoginViewProps {
  onLoginSuccess: (session: UserSession) => void;
  onBackToDashboard?: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot' | 'demo';

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_SECONDS = 30;

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onBackToDashboard }) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [authMode, setAuthMode] = useState<AuthMode>('signin');

  // Sign In state
  const [signInIdentifier, setSignInIdentifier] = useState<string>(() => {
    try {
      return localStorage.getItem('robotics_remembered_identifier') || '';
    } catch {
      return '';
    }
  });
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign In NISN live detection from school roster
  const matchedSignInStudent = useMemo(() => {
    const clean = signInIdentifier.replace(/[^0-9]/g, '').trim();
    if (!clean || clean.length !== 10) return null;
    try {
      const rosterKeys = [
        'robotics_members',
        'org_org-robotik-man2_members',
        'robotics_admin_members',
        'robotics_pre_registered_members'
      ];
      for (const key of rosterKeys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const found = parsed.find((m: any) => {
              const mNisn = String(m.nisn || '').replace(/[^0-9]/g, '').trim();
              const mId = String(m.id_member || '').replace(/[^0-9]/g, '').trim();
              return (mNisn && mNisn === clean) || (mId && mId === clean);
            });
            if (found) {
              return {
                fullName: found.fullName || found.full_name || 'Siswa Robotik',
                grade: found.grade || 'X',
                classRoom: found.classRoom || found.classroom || 'A',
              };
            }
          }
        }
      }
    } catch { }

    const initMatch = INITIAL_MEMBERS.find((m) => {
      const mNisn = (m.nisn || '').replace(/[^0-9]/g, '').trim();
      return mNisn === clean || (m.id_member && String(m.id_member) === clean);
    });
    if (initMatch) {
      return {
        fullName: initMatch.fullName,
        grade: initMatch.grade,
        classRoom: initMatch.classRoom,
      };
    }
    return null;
  }, [signInIdentifier]);

  // Sign Up / Activation state
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpNisn, setSignUpNisn] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpPin, setSignUpPin] = useState('');
  const [showSignUpPin, setShowSignUpPin] = useState(false);
  const [signUpRole, setSignUpRole] = useState<string>('Club Member');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Forgot Password / Self-Service PIN Recovery state
  const [forgotNisn, setForgotNisn] = useState('');
  const [forgotPin, setForgotPin] = useState('');
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [isForgotStepVerified, setIsForgotStepVerified] = useState(false);
  const [forgotVerifiedAccount, setForgotVerifiedAccount] = useState<{
    username: string;
    name: string;
    email: string;
    nisn: string;
    role: string;
    grade?: string;
    classRoom?: string;
  } | null>(null);

  // NISN Verification
  const matchedStudentFromNisn = useMemo(() => {
    const clean = signUpNisn.replace(/[^0-9]/g, '').trim();
    if (!clean || clean.length < 8) return null;

    try {
      const rosterKeys = [
        'robotics_members',
        'org_org-robotik-man2_members',
        'robotics_admin_members',
        'robotics_pre_registered_members'
      ];
      for (const key of rosterKeys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const found = parsed.find((m: any) => {
              const mNisn = String(m.nisn || '').replace(/[^0-9]/g, '').trim();
              const mId = String(m.id_member || '').replace(/[^0-9]/g, '').trim();
              return (mNisn && mNisn === clean) || (mId && mId === clean);
            });
            if (found) {
              return {
                id_member: found.id_member || 0,
                fullName: found.fullName || found.full_name || 'Active Member',
                nisn: found.nisn || clean,
                grade: found.grade || 'X',
                classRoom: found.classRoom || found.classroom || 'A',
                status: found.status || 'aktif',
                role: 'member',
                jabatan: 'member',
              } as any;
            }
          }
        }
      }
    } catch { }

    return INITIAL_MEMBERS.find((m) => {
      const mNisn = (m.nisn || '').replace(/[^0-9]/g, '').trim();
      return mNisn === clean || (m.id_member && String(m.id_member) === clean);
    }) || null;
  }, [signUpNisn]);

  // Otomatis isi Nama Lengkap resmi dan jadikan NISN sebagai username saat NISN terdeteksi
  useEffect(() => {
    const clean = signUpNisn.replace(/[^0-9]/g, '').trim();
    if (clean) {
      setSignUpUsername(clean);
    }
    if (matchedStudentFromNisn && matchedStudentFromNisn.fullName) {
      setSignUpName(matchedStudentFromNisn.fullName);
    }
  }, [matchedStudentFromNisn, signUpNisn]);

  // Anti-Bot Protection
  const [honeypotField, setHoneypotField] = useState('');
  const [antiBotChallenge, setAntiBotChallenge] = useState<BotChallenge>(() => generateAntiBotChallenge());
  const [antiBotAnswer, setAntiBotAnswer] = useState('');
  const formMountTime = useRef<number>(Date.now());

  // Brute-force & Lockout Protection
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    const saved = sessionStorage.getItem('robotics_login_failed_attempts');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });
  const [lockoutTimer, setLockoutTimer] = useState<number>(() => {
    const lockoutUntil = sessionStorage.getItem('robotics_login_lockout_until');
    if (lockoutUntil) {
      const remaining = Math.ceil((parseInt(lockoutUntil, 10) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedGenerated, setCopiedGenerated] = useState(false);

  // First-run Administrator Setup (when server ADMIN_PASSWORD env is unset)
  const [firstRunSetupRequired, setFirstRunSetupRequired] = useState(false);
  const [showAdminSetupForm, setShowAdminSetupForm] = useState(false);
  const [setupAdminPassword, setSetupAdminPassword] = useState('');
  const [setupAdminConfirm, setSetupAdminConfirm] = useState('');

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/admin-status', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data && data.firstRunSetupRequired) {
          setFirstRunSetupRequired(true);
        }
      })
      .catch(() => { });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) {
          sessionStorage.removeItem('robotics_login_lockout_until');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const usernameCheck = useMemo(() => {
    if (!signUpUsername) return null;
    return validateUsername(signUpUsername);
  }, [signUpUsername]);

  const passwordCheck = useMemo(() => {
    if (!signUpPassword) return null;
    return validatePassword(signUpPassword, {
      username: signUpUsername,
      name: matchedStudentFromNisn?.fullName || signUpName,
      email: signUpEmail,
    });
  }, [signUpPassword, signUpUsername, matchedStudentFromNisn, signUpName, signUpEmail]);

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setError(null);
    setSuccessMessage(null);
    setAntiBotChallenge(generateAntiBotChallenge());
    setAntiBotAnswer('');
    setHoneypotField('');
    formMountTime.current = Date.now();
  };

  const handleRefreshChallenge = () => {
    setAntiBotChallenge(generateAntiBotChallenge());
    setAntiBotAnswer('');
  };

  const handleGeneratePassword = () => {
    const strong = generateSecurePassword();
    setSignUpPassword(strong);
    setSignUpConfirmPassword(strong);
    setShowSignUpPassword(true);
    setCopiedGenerated(true);
    navigator.clipboard?.writeText(strong).catch(() => { });
    setTimeout(() => setCopiedGenerated(false), 3000);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (lockoutTimer > 0) {
      setError(`Login temporarily restricted for security. Please wait ${lockoutTimer} seconds.`);
      return;
    }

    if (honeypotField.trim() !== '') {
      setError('Suspicious activity detected. Request rejected.');
      return;
    }

    const elapsedMs = Date.now() - formMountTime.current;
    if (elapsedMs < 500) {
      setError('Submission too fast detected. Please try again.');
      formMountTime.current = Date.now();
      return;
    }

    setIsLoading(true);

    try {
      const account = await verifyAccountCredentials(signInIdentifier, signInPassword);

      if (account) {
        setFailedAttempts(0);
        sessionStorage.removeItem('robotics_login_failed_attempts');
        sessionStorage.removeItem('robotics_login_lockout_until');

        if (rememberMe) {
          try {
            localStorage.setItem('robotics_remembered_identifier', signInIdentifier.trim());
          } catch { }
        } else {
          try {
            localStorage.removeItem('robotics_remembered_identifier');
          } catch { }
        }

        const cleanRole = (account.role || '').toLowerCase();
        const normUser = (account.username || '').toLowerCase();
        const envEmail = (ENV_ADMIN_EMAIL || 'roboticman2kotabekasi@gmail.com').toLowerCase().trim();
        const isStrictAdmin =
          (account.role === 'admin' ||
            account.username === 'admin' ||
            account.username === 'demo_admin' ||
            account.username === 'roboticman2kotabekasi' ||
            (account.email && account.email.toLowerCase().trim() === envEmail)) &&
          !['demo_bendahara', 'demo_ketua', 'demo_sekretaris', 'demo_pr', 'demo_pembina', 'demo_member', 'demo_executive', 'demo_tamu'].includes(normUser);

        let resolvedJabatan = 'member';
        let resolvedMembershipStatus = 'aktif';

        if (isStrictAdmin) {
          resolvedJabatan = 'admin';
          resolvedMembershipStatus = 'admin';
        } else if (cleanRole === 'bendahara' || cleanRole === 'treasurer' || normUser === 'demo_bendahara') {
          resolvedJabatan = 'treasurer';
          resolvedMembershipStatus = 'executive_board';
        } else if (cleanRole === 'sekretaris' || cleanRole === 'secretary' || normUser === 'demo_sekretaris') {
          resolvedJabatan = 'secretary';
          resolvedMembershipStatus = 'executive_board';
        } else if (cleanRole === 'ketua' || cleanRole === 'president' || normUser === 'demo_ketua') {
          resolvedJabatan = 'president';
          resolvedMembershipStatus = 'executive_board';
        } else if (cleanRole === 'pr' || cleanRole === 'humas' || normUser === 'demo_pr') {
          resolvedJabatan = 'pr';
          resolvedMembershipStatus = 'executive_board';
        } else if (cleanRole.includes('pembina') || cleanRole.includes('advisor') || normUser === 'demo_pembina') {
          resolvedJabatan = 'advisor';
          resolvedMembershipStatus = 'aktif';
        } else if (cleanRole === 'executive_board' || cleanRole.includes('executive') || cleanRole.includes('vice')) {
          resolvedJabatan = 'vice_president';
          resolvedMembershipStatus = 'executive_board';
        }

        const isExecutiveOrAdmin = isStrictAdmin || resolvedMembershipStatus === 'executive_board';
        const isDemo = Boolean(account.isDemo || account.username.startsWith('demo_') || account.username === 'demo_tamu');
        const isVerifiedStudent = Boolean(account.nisn);
        const isBypass = isStrictAdmin || isExecutiveOrAdmin || isDemo || isVerifiedStudent;

        setSuccessMessage('Sign in verified. Opening dashboard...');
        setTimeout(() => {
          onLoginSuccess({
            username: account.username,
            name: account.name,
            role: isStrictAdmin ? 'admin' : account.role,
            email: account.email,
            token: account.token,
            authProvider: account.authProvider || 'credentials',
            isDemo: isDemo,
            loginTime: new Date().toISOString(),
            rememberMe: rememberMe,
            nisn: account.nisn,
            bypassNisnVerification: isBypass,
            isVerifiedMember: isBypass,
            membershipStatus: resolvedMembershipStatus,
            jabatan: resolvedJabatan,
          });
        }, 300);
      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        sessionStorage.setItem('robotics_login_failed_attempts', String(newAttempts));

        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          const lockoutUntil = Date.now() + LOCKOUT_DURATION_SECONDS * 1000;
          sessionStorage.setItem('robotics_login_lockout_until', String(lockoutUntil));
          setLockoutTimer(LOCKOUT_DURATION_SECONDS);
          setError(`Invalid credentials. For security, sign in is locked for ${LOCKOUT_DURATION_SECONDS} seconds.`);
        } else {
          const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
          setError(`Invalid username or password. Remaining attempts before lockout: ${remaining}.`);
        }
      }
    } catch {
      setError('An error occurred during authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const pwd = setupAdminPassword.trim();
    if (pwd !== setupAdminConfirm.trim()) {
      setError(isEn ? 'Administrator password confirmation does not match.' : 'Konfirmasi kata sandi administrator tidak cocok.');
      return;
    }

    const validation = validatePassword(pwd, { username: 'admin', name: 'Admin Robotic' });
    if (!validation.isValid) {
      setError(validation.errors[0] || 'Password must be at least 12 characters with upper, lower, numbers, and symbols.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/setup-admin', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ password: pwd }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setError(data?.message || 'Failed to configure initial administrator password.');
        setIsLoading(false);
        return;
      }

      if (data.token) {
        setMemoryAuthToken(data.token);
      }
      setFirstRunSetupRequired(false);
      setShowAdminSetupForm(false);
      setSuccessMessage(isEn ? 'Administrator password configured! Opening workspace...' : 'Kata sandi administrator berhasil diatur! Membuka ruang kerja...');
      setTimeout(() => {
        onLoginSuccess({
          username: data.account?.username || 'admin',
          name: data.account?.name || 'Admin Robotic MAN 2 Kota Bekasi',
          role: 'admin',
          email: data.account?.email || ENV_ADMIN_EMAIL,
          token: data.token,
          authProvider: 'credentials',
          isDemo: false,
          loginTime: new Date().toISOString(),
          rememberMe: true,
          bypassNisnVerification: true,
          isVerifiedMember: true,
          membershipStatus: 'admin',
          jabatan: 'admin',
        });
      }, 300);
    } catch {
      setError('Failed to connect to authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (honeypotField.trim() !== '') {
      setError('Automated submission rejected.');
      return;
    }

    if (!antiBotAnswer || parseInt(antiBotAnswer.trim(), 10) !== antiBotChallenge.answer) {
      setError(isEn ? 'Please answer the security math question correctly.' : 'Jawab pertanyaan matematika keamanan dengan benar.');
      return;
    }

    const studentNisn = signUpNisn.replace(/[^0-9]/g, '').trim();
    if (!studentNisn || studentNisn.length !== 10) {
      setError(isEn ? 'Student NISN must be a 10-digit number to verify your identity.' : 'Nomor NISN wajib 10 digit angka untuk mendeteksi identitas siswa.');
      return;
    }

    if (!matchedStudentFromNisn) {
      setError(
        isEn
          ? 'NISN is not registered in the Robotics Club member database. Only registered club members may activate an account.'
          : 'NISN tidak terdaftar di Buku Induk Anggota Robotik MAN 2 Kota Bekasi. Hanya siswa yang sudah tercatat di ekskul yang dapat mengaktifkan akun.'
      );
      return;
    }

    const cleanPin = signUpPin.replace(/[^0-9]/g, '').trim();
    if (!cleanPin || cleanPin.length !== 4) {
      setError(isEn ? 'Personal Recovery PIN must be exactly 4 digits.' : 'PIN Pemulihan Akun wajib tepat 4 digit angka rahasia.');
      return;
    }

    const officialName = matchedStudentFromNisn.fullName;
    const targetUsername = studentNisn;
    const defaultStudentEmail = signUpEmail.trim().toLowerCase() || `${studentNisn}@man2kotabekasi.sch.id`;

    if (!passwordCheck || !passwordCheck.isValid) {
      setError(passwordCheck?.errors[0] || (isEn ? 'Password does not meet security requirements.' : 'Kata sandi belum memenuhi standar keamanan.'));
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setError(isEn ? 'Password confirmation does not match.' : 'Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await registerNewAccount({
        username: targetUsername,
        name: officialName,
        email: defaultStudentEmail,
        password: signUpPassword,
        role: 'Club Member',
        nisn: studentNisn,
        recoveryPin: cleanPin,
      });

      if (!result.success) {
        setError(result.error || (isEn ? 'Activation failed.' : 'Aktivasi akun gagal.'));
        setIsLoading(false);
        return;
      }

      setSuccessMessage(isEn ? 'Account activated successfully! Signing in...' : 'Akun siswa berhasil diaktivasi! Membuka sistem...');
      setTimeout(() => {
        onLoginSuccess({
          username: targetUsername,
          name: officialName,
          role: 'Club Member',
          email: defaultStudentEmail,
          authProvider: 'credentials',
          isDemo: false,
          loginTime: new Date().toISOString(),
          rememberMe: true,
          nisn: studentNisn,
          kelas: matchedStudentFromNisn ? `${matchedStudentFromNisn.grade} - ${matchedStudentFromNisn.classRoom}` : undefined,
          isVerifiedMember: true,
          bypassNisnVerification: true,
          membershipStatus: 'aktif',
          jabatan: 'member',
        });
      }, 400);
    } catch (err: any) {
      setError(err?.message || (isEn ? 'Error activating account.' : 'Terjadi kendala saat mengaktifkan akun.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanNisn = forgotNisn.replace(/[^0-9]/g, '').trim();
    const cleanPin = forgotPin.replace(/[^0-9]/g, '').trim();

    if (!cleanNisn || cleanNisn.length !== 10) {
      setError(isEn ? 'Please enter a valid 10-digit Student NISN.' : 'Nomor NISN wajib 10 digit angka.');
      return;
    }
    if (!cleanPin || cleanPin.length !== 4) {
      setError(isEn ? 'Please enter your 4-digit Personal Recovery PIN.' : 'PIN Pemulihan wajib 4 digit angka rahasia.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await verifyStudentRecoveryPin(cleanNisn, cleanPin);
      if (!res.success || !res.account) {
        setError(
          res.error ||
          (isEn
            ? 'Invalid NISN or Recovery PIN. If you forgot your PIN, please contact your club supervisor.'
            : 'NISN atau PIN Pemulihan salah. Jika lupa PIN 4 digit, hubungi Pembina / Pengurus ekskul di sekolah.')
        );
        setIsLoading(false);
        return;
      }

      const acc = res.account;
      setForgotVerifiedAccount({
        username: acc.username,
        name: acc.name,
        email: acc.email || `${cleanNisn}@man2kotabekasi.sch.id`,
        nisn: cleanNisn,
        role: acc.role || 'Club Member',
      });

      setIsForgotStepVerified(true);
      setSuccessMessage(
        isEn
          ? `Identity Verified: ${acc.name}. You can now create a new password.`
          : `Identitas Terverifikasi: ${acc.name}. Silakan tentukan kata sandi baru Anda.`
      );
    } catch {
      setError(isEn ? 'Failed to verify recovery PIN. Please try again.' : 'Terjadi kendala saat memverifikasi PIN pemulihan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!forgotVerifiedAccount) {
      setError(isEn ? 'Verification session expired. Please verify NISN and PIN again.' : 'Sesi verifikasi telah kedaluwarsa. Silakan ulangi verifikasi NISN & PIN.');
      return;
    }

    const newPwd = forgotNewPassword.trim();
    if (newPwd !== forgotConfirmPassword.trim()) {
      setError(isEn ? 'New password confirmation does not match.' : 'Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    const pwdCheck = validatePassword(newPwd, {
      username: forgotVerifiedAccount.username,
      name: forgotVerifiedAccount.name,
      email: forgotVerifiedAccount.email,
    });

    if (!pwdCheck.isValid) {
      setError(
        isEn
          ? `Password does not meet standards: ${pwdCheck.errors[0] || 'Minimum 12 characters combining letters, numbers, and symbols.'}`
          : `Kata sandi belum memenuhi standar: ${pwdCheck.errors[0] || 'Minimal 12 karakter dengan kombinasi huruf, angka, dan simbol.'}`
      );
      return;
    }

    setIsLoading(true);

    try {
      const res = await updateAccountPasswordByNisn(forgotVerifiedAccount.nisn, newPwd, forgotPin);
      if (!res.success) {
        setError(res.error || (isEn ? 'Failed to save new password. Please try again.' : 'Gagal menyimpan kata sandi baru. Silakan coba lagi.'));
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        isEn
          ? 'Password updated successfully! Redirecting to sign in...'
          : 'Kata sandi berhasil diperbarui! Mengalihkan ke halaman masuk...'
      );
      setTimeout(() => {
        setSignInIdentifier(forgotVerifiedAccount.nisn || forgotVerifiedAccount.username);
        setSignInPassword('');
        setIsForgotStepVerified(false);
        setForgotVerifiedAccount(null);
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setForgotPin('');
        switchMode('signin');
      }, 1500);
    } catch {
      setError(isEn ? 'Failed to save new password. Please try again.' : 'Gagal menyimpan kata sandi baru. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickDemoLogin = (roleKey: 'admin' | 'ketua' | 'bph' | 'sekretaris' | 'bendahara' | 'pr' | 'pembina' | 'anggota' | 'tamu') => {
    setError(null);
    const configs: Record<string, { username: string; name: string; role: string; jabatan: string; status: string; email: string }> = {
      admin: {
        username: 'demo_admin',
        name: 'Head Administrator',
        role: 'Primary Administrator',
        jabatan: 'admin',
        status: 'admin',
        email: 'admin.demo@man2kotabekasi.sch.id'
      },
      bendahara: {
        username: 'demo_bendahara',
        name: 'Club Treasurer',
        role: 'Treasurer',
        jabatan: 'treasurer',
        status: 'executive_board',
        email: 'treasurer.demo@man2kotabekasi.sch.id'
      },
      ketua: {
        username: 'demo_ketua',
        name: 'Club President',
        role: 'President',
        jabatan: 'president',
        status: 'executive_board',
        email: 'president.demo@man2kotabekasi.sch.id'
      },
      bph: {
        username: 'demo_executive',
        name: 'Vice President',
        role: 'Vice President',
        jabatan: 'vice_president',
        status: 'executive_board',
        email: 'vp.demo@man2kotabekasi.sch.id'
      },
      sekretaris: {
        username: 'demo_sekretaris',
        name: 'Club Secretary',
        role: 'Secretary',
        jabatan: 'secretary',
        status: 'executive_board',
        email: 'secretary.demo@man2kotabekasi.sch.id'
      },
      pr: {
        username: 'demo_pr',
        name: 'Public Relations Officer',
        role: 'Public Relations',
        jabatan: 'pr',
        status: 'executive_board',
        email: 'pr.demo@man2kotabekasi.sch.id'
      },
      pembina: {
        username: 'demo_pembina',
        name: 'Faculty Advisor',
        role: 'Faculty Advisor',
        jabatan: 'advisor',
        status: 'aktif',
        email: 'advisor.demo@man2kotabekasi.sch.id'
      },
      anggota: {
        username: 'demo_member',
        name: 'Student Member',
        role: 'Club Member',
        jabatan: 'member',
        status: 'aktif',
        email: 'member.demo@man2kotabekasi.sch.id'
      },
      tamu: {
        username: 'demo_tamu',
        name: 'Demo Guest',
        role: 'Demo Guest',
        jabatan: 'guest',
        status: 'aktif',
        email: 'guest.demo@man2kotabekasi.sch.id'
      }
    };

    const target = configs[roleKey] || configs.anggota;
    setSuccessMessage(isEn ? `Signing in as ${target.role} (Demo Sandbox)...` : `Masuk sebagai ${target.role} (Demo Sandbox)...`);
    setTimeout(() => {
      onLoginSuccess({
        username: target.username,
        name: target.name,
        role: target.role,
        jabatan: target.jabatan,
        email: target.email,
        authProvider: 'credentials',
        isDemo: true,
        bypassNisnVerification: true,
        isVerifiedMember: true,
        membershipStatus: target.status,
        loginTime: new Date().toISOString(),
      });
    }, 300);
  };

  return (
    <div className="min-h-screen w-full bg-[#EBF3FB] flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white">
      {/* Centered Login Hero Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10 w-full">
        {/* Container Card with Split-Screen Layout and Ambient Glow */}
        <div className="w-full max-w-5xl glow-card-ambient">
          <div className="w-full glass-card rounded-[2rem] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">

            {/* Left / Main Section: Authentication Card */}
            <div className="lg:col-span-7 p-6 sm:p-10 md:p-12 flex flex-col justify-between bg-white/95">
              <div>
                {/* Header Brand */}
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-600/10 border border-blue-200/60 p-1 flex items-center justify-center shadow-xs">
                      <img
                        src="/assets/aistudio/Gemini_Generated_Image_aay230aay230aay2_dccf3432.jpg"
                        alt="Robot Mascot"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>
                    <div>
                      <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                        roboman<span className="text-blue-600 font-black">2</span>
                      </h1>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                        roboman2 Workspace
                      </p>
                    </div>
                  </div>

                  {/* Quick Mode Toggle & Language Toggle */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <LanguageToggle />
                    <div className="inline-flex p-1 bg-slate-100/90 rounded-2xl text-xs font-bold text-slate-600 border border-slate-200/60 relative">
                      <button
                        type="button"
                        onClick={() => switchMode('signin')}
                        className={`relative px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 z-10 ${authMode === 'signin' ? 'text-blue-700 font-extrabold' : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        {authMode === 'signin' && (
                          <motion.div
                            layoutId="activeAuthTab"
                            className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/60 -z-10"
                            transition={{ type: 'spring', bounce: 0.18, duration: 0.35 }}
                          />
                        )}
                        <LogIn className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Sign In' : 'Masuk'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => switchMode('signup')}
                        className={`relative px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 z-10 ${authMode === 'signup' ? 'text-blue-700 font-extrabold' : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        {authMode === 'signup' && (
                          <motion.div
                            layoutId="activeAuthTab"
                            className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/60 -z-10"
                            transition={{ type: 'spring', bounce: 0.18, duration: 0.35 }}
                          />
                        )}
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Activation' : 'Aktivasi Akun'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => switchMode('demo')}
                        className={`relative px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 z-10 ${authMode === 'demo' ? 'text-blue-700 font-extrabold' : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        {authMode === 'demo' && (
                          <motion.div
                            layoutId="activeAuthTab"
                            className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/60 -z-10"
                            transition={{ type: 'spring', bounce: 0.18, duration: 0.35 }}
                          />
                        )}
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isEn ? 'Demo Mode' : 'Mode Demo'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Title Section */}
                <div className="mb-6">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {authMode === 'signin' && (isEn ? 'Sign In' : 'Masuk Akun')}
                    {authMode === 'signup' && (isEn ? 'Student Account Activation' : 'Aktivasi Akun Siswa')}
                    {authMode === 'forgot' && (isEn ? 'Self-Service Password Recovery' : 'Pemulihan Kata Sandi Mandiri')}
                    {authMode === 'demo' && (isEn ? 'Try Demo Mode' : 'Mode Demo Sandbox')}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    {authMode === 'signin' && (isEn ? 'Enter your 10-digit NISN or staff credentials to access the workspace.' : 'Masukkan 10 digit NISN atau kredensial akun untuk mengakses sistem.')}
                    {authMode === 'signup' && (isEn ? 'Registered club members: Enter your 10-digit NISN, set your password, and create a 4-digit Recovery PIN.' : 'Khusus siswa terdaftar di Buku Induk: masukkan 10 digit NISN, atur password, dan PIN pemulihan 4 digit.')}
                    {authMode === 'forgot' && (isEn ? 'Reset your password independently using your NISN and 4-digit Recovery PIN. No email required.' : 'Pulihkan kata sandi secara mandiri menggunakan NISN dan PIN Pemulihan 4 digit Anda. Bebas tanpa email.')}
                    {authMode === 'demo' && (isEn ? 'Test the workspace instantly across all leadership and student roles.' : 'Uji sistem secara instan di semua role kepengurusan dan anggota.')}
                  </p>
                </div>

                {/* Error & Feedback Alerts */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span className="leading-relaxed">{error}</span>
                  </motion.div>
                )}

                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span className="leading-relaxed">{successMessage}</span>
                  </motion.div>
                )}

                {lockoutTimer > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Security cooldown active: Try again in {lockoutTimer}s.</span>
                  </div>
                )}

                {/* ==================== FIRST-RUN ADMIN SETUP BANNER ==================== */}
                {authMode === 'signin' && firstRunSetupRequired && (
                  <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 text-xs text-amber-900">
                        <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">
                            {isEn ? 'First-Run Admin Setup Required' : 'Pengaturan Kata Sandi Admin Pertama Kali'}
                          </p>
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            {isEn
                              ? 'No administrator password is set in server environment yet. Set a strong initial password to claim the administrator account.'
                              : 'Belum ada kata sandi administrator di server. Atur kata sandi awal yang kuat untuk mengklaim akses administrator.'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAdminSetupForm((prev) => !prev)}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                      >
                        {showAdminSetupForm ? (isEn ? 'Close' : 'Tutup') : (isEn ? 'Claim Admin' : 'Atur Sandi')}
                      </button>
                    </div>

                    {showAdminSetupForm && (
                      <form onSubmit={handleSetupAdmin} className="space-y-2 pt-2 border-t border-amber-200/80">
                        <input
                          type="password"
                          required
                          placeholder={isEn ? 'Admin password (min. 12 chars, upper/lower/number/symbol)' : 'Sandi admin (min. 12 karakter, huruf/angka/simbol)'}
                          value={setupAdminPassword}
                          onChange={(e) => setSetupAdminPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs text-slate-900"
                        />
                        <input
                          type="password"
                          required
                          placeholder={isEn ? 'Confirm admin password' : 'Ulangi kata sandi admin'}
                          value={setupAdminConfirm}
                          onChange={(e) => setSetupAdminConfirm(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs text-slate-900"
                        />
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full py-2 px-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                        >
                          {isEn ? 'Save Initial Administrator Password' : 'Simpan Sandi Administrator'}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* ==================== SIGN IN TAB ==================== */}
                {authMode === 'signin' && (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    {/* Honeypot */}
                    <input
                      type="text"
                      name="website_hp"
                      value={honeypotField}
                      onChange={(e) => setHoneypotField(e.target.value)}
                      className="hidden"
                      tabIndex={-1}
                      autoComplete="off"
                    />

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          {isEn ? 'Student NISN or Staff Username' : 'NISN Siswa / ID Pengurus'}
                        </label>
                        <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {isEn ? 'Direct NISN / Staff Login' : 'Login NISN / ID Langsung'}
                        </span>
                      </div>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          required
                          placeholder={isEn ? 'Enter 10-digit NISN or staff username' : 'Ketik 10 digit NISN siswa atau username pengurus'}
                          value={signInIdentifier}
                          onChange={(e) => setSignInIdentifier(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition"
                        />
                      </div>

                      {/* Real-time Student Recognition Banner */}
                      {matchedSignInStudent && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-1.5 p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 text-xs flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate font-semibold text-[11px]">
                              {isEn ? 'Student Verified: ' : 'Siswa Terdaftar: '}
                              <strong className="text-emerald-800">{matchedSignInStudent.fullName}</strong>
                              <span className="text-emerald-700 ml-1">({matchedSignInStudent.grade} - {matchedSignInStudent.classRoom})</span>
                            </span>
                          </div>
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-200/60 text-emerald-800 px-1.5 py-0.5 rounded-md shrink-0">
                            {isEn ? 'Master Roster' : 'Buku Induk'}
                          </span>
                        </motion.div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          {isEn ? 'Password' : 'Kata Sandi'}
                        </label>
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {isEn ? 'Forgot Password?' : 'Lupa Password?'}
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type={showSignInPassword ? 'text' : 'password'}
                          required
                          placeholder={isEn ? 'Enter account password' : 'Masukkan kata sandi akun'}
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignInPassword(!showSignInPassword)}
                          className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600 select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span>{isEn ? 'Remember Session' : 'Ingat Sesi Saya'}</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{isEn ? 'Verifying...' : 'Memeriksa...'}</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>{isEn ? 'Sign In to System' : 'Masuk ke Sistem'}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* ==================== FORGOT PASSWORD TAB ==================== */}
                {authMode === 'forgot' && (
                  <div className="space-y-4">
                    {!isForgotStepVerified ? (
                      <form onSubmit={handleVerifyForgotPassword} className="space-y-3.5">
                        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5 shadow-2xs">
                          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div className="leading-relaxed">
                            <span className="font-bold">{isEn ? 'Self-Service Recovery (No Email Required):' : 'Pemulihan Mandiri Tanpa Email:'}</span>
                            <p className="mt-0.5 text-[11px] text-blue-800">
                              {isEn
                                ? 'Enter your 10-digit Student NISN and the secret 4-digit Recovery PIN you created during account activation.'
                                : 'Cukup masukkan 10 digit NISN dan PIN Pemulihan 4 angka rahasia yang Anda buat saat aktivasi akun untuk mereset kata sandi.'}
                            </p>
                          </div>
                        </div>

                        {/* 1. NISN */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isEn ? 'Student NISN (10 Digits) *' : 'Nomor NISN Siswa (10 Digit) *'}
                          </label>
                          <div className="relative">
                            <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                            <input
                              type="text"
                              maxLength={10}
                              required
                              placeholder={isEn ? 'e.g. 0081234567' : 'Contoh: 0081234567'}
                              value={forgotNisn}
                              onChange={(e) => setForgotNisn(e.target.value.replace(/[^0-9]/g, ''))}
                              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                            />
                          </div>
                        </div>

                        {/* 2. PIN Pemulihan 4 Digit */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-slate-700">
                              {isEn ? '4-Digit Recovery PIN *' : 'PIN Pemulihan 4 Digit Rahasia *'}
                            </label>
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md border border-blue-200">
                              {isEn ? 'Self-Service Key' : 'Kunci Mandiri'}
                            </span>
                          </div>
                          <div className="relative">
                            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                            <input
                              type={showForgotPin ? 'text' : 'password'}
                              maxLength={4}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              required
                              placeholder={isEn ? '4 digits (e.g. 1234)' : '4 angka (contoh: 1234)'}
                              value={forgotPin}
                              onChange={(e) => setForgotPin(e.target.value.replace(/[^0-9]/g, ''))}
                              className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold tracking-widest text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                            />
                            <button
                              type="button"
                              onClick={() => setShowForgotPin(!showForgotPin)}
                              className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showForgotPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {isEn
                              ? 'PIN created during student account activation.'
                              : 'PIN yang Anda tentukan sendiri saat aktivasi akun pertama kali.'}
                          </p>
                        </div>

                        {/* Help text when PIN is forgotten */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 leading-snug">
                          <span className="font-semibold text-slate-700">
                            {isEn ? 'Forgot your 4-digit PIN too?' : 'Lupa PIN 4-digit Anda juga?'}
                          </span>
                          <p className="mt-0.5 text-slate-500 text-[10px]">
                            {isEn
                              ? 'Please contact your Faculty Advisor or Club Officer directly at school for identity verification and manual reset.'
                              : 'Silakan temui langsung Pembina atau Pengurus ekskul di sekolah untuk verifikasi fisik identitas dan reset manual.'}
                          </p>
                        </div>

                        <div className="pt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => switchMode('signin')}
                            className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Back to Sign In' : 'Batal / Masuk'}</span>
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                          >
                            {isLoading ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>{isEn ? 'Verifying PIN...' : 'Memeriksa PIN...'}</span>
                              </>
                            ) : (
                              <>
                                <KeyRound className="w-4 h-4" />
                                <span>{isEn ? 'Verify Recovery PIN' : 'Verifikasi PIN Pemulihan'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleSaveNewPassword} className="space-y-3.5">
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="leading-tight">
                            <div className="font-bold">
                              {isEn ? `Verified: ${forgotVerifiedAccount?.name}` : `Terverifikasi: ${forgotVerifiedAccount?.name}`}
                            </div>
                            <div className="text-[11px] text-emerald-700 mt-0.5">
                              Username: <span className="font-mono font-bold">{forgotVerifiedAccount?.username}</span> | {isEn ? 'NISN' : 'NISN'}: {forgotVerifiedAccount?.nisn}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isEn ? 'New Password (Minimum 12 Characters) *' : 'Kata Sandi Baru (Minimal 12 Karakter) *'}
                          </label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                            <input
                              type={showForgotNewPassword ? 'text' : 'password'}
                              required
                              placeholder={isEn ? 'Enter strong new password' : 'Masukkan kata sandi baru yang kuat'}
                              value={forgotNewPassword}
                              onChange={(e) => setForgotNewPassword(e.target.value)}
                              className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                            />
                            <button
                              type="button"
                              onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showForgotNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isEn ? 'Confirm New Password *' : 'Konfirmasi Kata Sandi Baru *'}
                          </label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                            <input
                              type={showForgotConfirmPassword ? 'text' : 'password'}
                              required
                              placeholder={isEn ? 'Re-enter new password' : 'Ulangi kata sandi baru'}
                              value={forgotConfirmPassword}
                              onChange={(e) => setForgotConfirmPassword(e.target.value)}
                              className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                            />
                            <button
                              type="button"
                              onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showForgotConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsForgotStepVerified(false);
                              setForgotVerifiedAccount(null);
                            }}
                            className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                          >
                            {isEn ? 'Cancel' : 'Batal'}
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                          >
                            {isLoading ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>{isEn ? 'Saving Password...' : 'Menyimpan Sandi...'}</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>{isEn ? 'Save New Password' : 'Simpan Sandi Baru'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* ==================== SIGN UP TAB ==================== */}
                {authMode === 'signup' && (
                  <form onSubmit={handleSignUp} className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                    <input
                      type="text"
                      name="website_hp"
                      value={honeypotField}
                      onChange={(e) => setHoneypotField(e.target.value)}
                      className="hidden"
                      tabIndex={-1}
                      autoComplete="off"
                    />

                    {/* 1. Student NISN - Primary Identifier */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          {isEn ? 'National Student ID Number (NISN)' : 'Nomor Induk Siswa Nasional (NISN)'}
                        </label>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {isEn ? 'Auto-Detect Profile' : 'Kunci Otomatisasi Profil'}
                        </span>
                      </div>
                      <div className="relative">
                        <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                        <input
                          type="text"
                          maxLength={10}
                          required
                          placeholder={isEn ? 'Enter your 10-digit NISN (e.g. 0081234567)' : 'Ketik 10 digit NISN Anda (contoh: 0081234567)'}
                          value={signUpNisn}
                          onChange={(e) => setSignUpNisn(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {isEn
                          ? 'Enter your NISN to automatically link your official full name and classroom from the club roster.'
                          : 'Ketik NISN untuk mendeteksi nama lengkap dan kelas Anda dari buku induk anggota.'}
                      </span>
                    </div>

                    {/* Status banner when NISN is found */}
                    {matchedStudentFromNisn && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 text-emerald-900 shadow-2xs"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                            {matchedStudentFromNisn.fullName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                {matchedStudentFromNisn.fullName}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                                <Lock className="w-2.5 h-2.5 text-emerald-600" /> {isEn ? 'Official School Registry' : 'Resmi Buku Induk'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                              <span>{isEn ? 'Class' : 'Kelas'}: <strong className="text-slate-800">{matchedStudentFromNisn.grade} - {matchedStudentFromNisn.classRoom}</strong></span>
                              <span>•</span>
                              <span>NISN: <strong className="font-mono text-slate-800">{matchedStudentFromNisn.nisn || signUpNisn}</strong></span>
                            </div>
                            <p className="text-[10px] text-emerald-700 mt-1.5 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{isEn ? 'Official name linked automatically. No manual name input required!' : 'Nama resmi otomatis digunakan. Tidak perlu mengisi nama lengkap lagi!'}</span>
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Warning if 10 digits entered but not found in member database */}
                    {signUpNisn.replace(/[^0-9]/g, '').length === 10 && !matchedStudentFromNisn && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">{isEn ? 'NISN Not Registered:' : 'NISN Belum Terdaftar:'}</span>
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            {isEn
                              ? `NISN ${signUpNisn} is not yet registered in the Robotics Club member database. Please verify the number or contact a club supervisor.`
                              : `NISN ${signUpNisn} belum ada di Buku Induk Anggota. Pastikan nomor sudah benar atau hubungi Pembina / Pengurus Robotik MAN 2 Kota Bekasi.`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 2. Login ID - Otomatis Menggunakan NISN Siswa */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          <KeyRound className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">
                            {isEn ? 'Account Login ID' : 'ID Akun / Login'}
                          </span>
                          <p className="text-[10px] text-slate-500">
                            {isEn ? 'Automatically linked to your 10-digit NISN' : 'Otomatis menggunakan 10 digit NISN siswa'}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                        {signUpNisn.trim() || (isEn ? 'Follows NISN' : 'Sesuai NISN')}
                      </span>
                    </div>

                    {/* 3. Password & Confirm Password */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          {isEn ? 'Create Password *' : 'Buat Kata Sandi *'}
                        </label>
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>{copiedGenerated ? (isEn ? 'Copied!' : 'Tersalin!') : (isEn ? 'Suggest Strong' : 'Saran Kuat')}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type={showSignUpPassword ? 'text' : 'password'}
                          required
                          placeholder={isEn ? 'Minimum 12 characters' : 'Minimal 12 karakter'}
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showSignUpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isEn ? 'Confirm Password *' : 'Konfirmasi Kata Sandi *'}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="password"
                          required
                          placeholder={isEn ? 'Repeat password' : 'Ketik ulang kata sandi'}
                          value={signUpConfirmPassword}
                          onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                        />
                      </div>
                    </div>

                    {/* 4. PIN Pemulihan 4 Digit Rahasia Pribadi */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          {isEn ? '4-Digit Recovery PIN (Personal Secret) *' : 'PIN Pemulihan 4 Digit Rahasia Pribadi *'}
                        </label>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {isEn ? 'Mandatory for Recovery' : 'Kunci Mandiri Tanpa Email'}
                        </span>
                      </div>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                        <input
                          type={showSignUpPin ? 'text' : 'password'}
                          maxLength={4}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          required
                          placeholder={isEn ? 'Set 4 digits (e.g. 5821)' : 'Buat 4 angka rahasia Anda (contoh: 5821)'}
                          value={signUpPin}
                          onChange={(e) => setSignUpPin(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold tracking-widest text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPin(!showSignUpPin)}
                          className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showSignUpPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {isEn
                          ? 'Create a secret 4-digit numeric PIN to independently recover your password if forgotten. No email needed.'
                          : 'Kunci 4 angka rahasia Anda sendiri untuk pemulihan mandiri jika lupa kata sandi di kemudian hari. Bebas tanpa email.'}
                      </p>
                    </div>

                    {/* Anti-bot Math Challenge */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div className="font-semibold text-slate-700">
                        {isEn ? 'Security check: ' : 'Pemeriksaan keamanan: '}
                        <span className="font-mono text-blue-600 font-bold">{antiBotChallenge.question}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={4}
                          placeholder={isEn ? 'Answer' : 'Hasil'}
                          value={antiBotAnswer}
                          onChange={(e) => setAntiBotAnswer(e.target.value)}
                          className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-center"
                        />
                        <button
                          type="button"
                          onClick={handleRefreshChallenge}
                          className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{isEn ? 'Activating Account...' : 'Mengaktifkan Akun...'}</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>{isEn ? 'Activate Student Account' : 'Aktivasi Akun Siswa'}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* ==================== DEMO MODE TAB ==================== */}
                {authMode === 'demo' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-2xl">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{isEn ? 'Demo Role Sandbox (Select Role & Test Authority)' : 'Sandbox Uji Coba Peran (Pilih Hak Akses & Uji Sistem)'}</span>
                      </div>
                      <p className="text-[11px] text-blue-800/80 mt-1 leading-relaxed font-medium">
                        {isEn
                          ? 'Simulate workspace access and feature permissions instantly across 9 role profiles in an isolated sandbox.'
                          : 'Simulasi instan 9 peran struktural ekskul dalam ruang uji terisolasi tanpa mengubah data asli.'}
                      </p>
                    </div>

                    <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                      {/* Category 1: Pimpinan & Pengawas */}
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 block">
                          👑 {isEn ? 'Leadership & Oversight' : 'Pimpinan & Pengawas'}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* 1. Admin */}
                          <button
                            type="button"
                            onClick={() => quickDemoLogin('admin')}
                            className="p-3 rounded-2xl border border-blue-200/90 bg-blue-50/50 hover:bg-blue-100/70 text-left transition cursor-pointer group shadow-2xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">Super Admin</span>
                              <ShieldCheck className="w-4 h-4 text-blue-600" />
                            </div>
                            <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition">
                              {isEn ? 'Administrator' : 'Administrator'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              {isEn
                                ? 'Comprehensive access across all modules, system configurations, and cloud databases'
                                : 'Akses menyeluruh seluruh modul, pengaturan sistem, dan database'}
                            </p>
                            <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-100 text-blue-800">
                              Full Authority
                            </span>
                          </button>

                          {/* 2. Guru Pembina */}
                          <button
                            type="button"
                            onClick={() => quickDemoLogin('pembina')}
                            className="p-3 rounded-2xl border border-purple-200/90 bg-purple-50/50 hover:bg-purple-100/70 text-left transition cursor-pointer group shadow-2xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider">
                                {isEn ? 'Advisor' : 'Pembina'}
                              </span>
                              <Shield className="w-4 h-4 text-purple-600" />
                            </div>
                            <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition">
                              {isEn ? 'Faculty Advisor' : 'Guru Pembina'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              {isEn
                                ? 'Institutional oversight, treasury audit, and student roster verification'
                                : 'Pengawasan sekolah, audit kas, dan verifikasi anggota ekskul'}
                            </p>
                            <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-100 text-purple-800">
                              Supervisory & Audit
                            </span>
                          </button>

                          {/* 3. Ketua Ekskul */}
                          <button
                            type="button"
                            onClick={() => quickDemoLogin('ketua')}
                            className="p-3 rounded-2xl border border-amber-200/90 bg-amber-50/50 hover:bg-amber-100/70 text-left transition cursor-pointer group shadow-2xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">
                                {isEn ? 'President' : 'Ketua'}
                              </span>
                              <Crown className="w-4 h-4 text-amber-600" />
                            </div>
                            <p className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition">
                              {isEn ? 'Club President' : 'Ketua Ekskul'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              {isEn
                                ? 'Team leadership, program disposition, and general executive coordination'
                                : 'Kepemimpinan tim, disposisi program kerja, dan koordinasi umum'}
                            </p>
                            <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-800">
                              Team Leadership
                            </span>
                          </button>

                          {/* 4. Wakil Ketua */}
                          <button
                            type="button"
                            onClick={() => quickDemoLogin('bph')}
                            className="p-3 rounded-2xl border border-indigo-200/90 bg-indigo-50/50 hover:bg-indigo-100/70 text-left transition cursor-pointer group shadow-2xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider">
                                {isEn ? 'Vice President' : 'Wakil Ketua'}
                              </span>
                              <Award className="w-4 h-4 text-indigo-600" />
                            </div>
                            <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition">
                              {isEn ? 'Vice President' : 'Wakil Ketua'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              {isEn
                                ? 'Workshop operations, training schedules, and robotics assignment grading'
                                : 'Operasional workshop, jadwal latihan rutin, dan evaluasi tugas robotik'}
                            </p>
                            <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-100 text-indigo-800">
                              Operations & Grading
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Category 2: Pengurus Fungsional BPH */}
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 block">
                          💼 {isEn ? 'Executive Board Officers' : 'Pengurus Fungsional BPH'}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {/* 5. Sekretaris */}
                          <button
                            type="button"
                            onClick={() => quickDemoLogin('sekretaris')}
                            className="p-3 rounded-2xl border border-emerald-200/90 bg-emerald-50/50 hover:bg-emerald-100/70 text-left transition cursor-pointer group shadow-2xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
                                {isEn ? 'Secretary' : 'Sekretaris'}
                              </span>
                              <CalendarCheck className="w-4 h-4 text-emerald-600" />
                            </div>
                            <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
                              {isEn ? 'Club Secretary' : 'Sekretaris'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              {isEn
                                ? 'Session attendance recap, student registry, and general administration'
                                : 'Rekap presensi sesi, data anggota, dan administrasi'}
                            </p>
                            <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              Attendance & Logs
                            </span>
                          </button>

                          {/* 6. Bendahara */}
                          <button
                            type="button"
                            onClick={() => quickDemoLogin('bendahara')}
                            className="p-3 rounded-2xl border border-pink-200/90 bg-pink-50/50 hover:bg-pink-100/70 text-left transition cursor-pointer group shadow-2xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-extrabold text-pink-700 uppercase tracking-wider">
                                {isEn ? 'Treasurer' : 'Bendahara'}
                              </span>
                              <Wallet className="w-4 h-4 text-pink-600" />
                            </div>
                            <p className="text-xs font-bold text-slate-900 group-hover:text-pink-700 transition">
                              {isEn ? 'Club Treasurer' : 'Bendahara'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              {isEn
                                ? 'Manage club treasury, weekly dues, and electronic component procurement'
                                : 'Kelola kas ekskul, iuran mingguan, dan belanja komponen'}
                            </p>
                            <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-pink-100 text-pink-800">
                              Treasury Control
                            </span>
                          </button>

                          {/* 7. Humas */}
                          <button
                            type="button"
                            onClick={() => quickDemoLogin('pr')}
                            className="p-3 rounded-2xl border border-rose-200/90 bg-rose-50/50 hover:bg-rose-100/70 text-left transition cursor-pointer group shadow-2xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider">
                                {isEn ? 'Public Relations' : 'Humas / PR'}
                              </span>
                              <Megaphone className="w-4 h-4 text-rose-600" />
                            </div>
                            <p className="text-xs font-bold text-slate-900 group-hover:text-rose-700 transition">
                              {isEn ? 'Public Relations' : 'Humas'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              {isEn
                                ? 'Official bulletin broadcasts, announcements, and competition updates'
                                : 'Publikasi pengumuman resmi dan info lomba robotik'}
                            </p>
                            <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-100 text-rose-800">
                              Broadcasts & PR
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Category 3: Anggota Siswa & Tamu */}
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 block">
                          🎓 {isEn ? 'Student Members & Public' : 'Anggota Siswa & Publik'}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* 8. Anggota */}
                          <button
                            type="button"
                            onClick={() => quickDemoLogin('anggota')}
                            className="p-3 rounded-2xl border border-sky-200/90 bg-sky-50/50 hover:bg-sky-100/70 text-left transition cursor-pointer group shadow-2xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-extrabold text-sky-700 uppercase tracking-wider">
                                {isEn ? 'Student' : 'Siswa'}
                              </span>
                              <UserCheck className="w-4 h-4 text-sky-600" />
                            </div>
                            <p className="text-xs font-bold text-slate-900 group-hover:text-sky-700 transition">
                              {isEn ? 'Student Member' : 'Siswa Anggota Robotik'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              {isEn
                                ? 'Self-service attendance check-in, practical task submissions, and digital ID card'
                                : 'Presensi mandiri, kumpul tugas praktikum, dan lihat modul materi'}
                            </p>
                            <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-sky-100 text-sky-800">
                              Student Portal
                            </span>
                          </button>

                          {/* 9. Tamu Demo */}
                          <button
                            type="button"
                            onClick={() => quickDemoLogin('tamu')}
                            className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition cursor-pointer group shadow-2xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                                {isEn ? 'Demo Guest' : 'Tamu Demo'}
                              </span>
                              <School className="w-4 h-4 text-slate-500" />
                            </div>
                            <p className="text-xs font-bold text-slate-900 group-hover:text-slate-700 transition">
                              {isEn ? 'Sandbox Guest' : 'Tamu Sandbox'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              {isEn
                                ? 'Explore club activity schedules and public announcements in read-only mode'
                                : 'Jelajahi jadwal kegiatan ekskul dan pengumuman dalam mode baca'}
                            </p>
                            <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-200 text-slate-700">
                              Read-Only Preview
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-xs text-slate-400">
                <span>roboman2 Workspace</span>
                <span className="font-semibold text-slate-600">MAN 2 Kota Bekasi</span>
              </div>
            </div>

            {/* Right Section: Dark Navy Gradient Panel with Robot Mascot */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#071120] via-[#0D1F40] to-[#183670] p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden">
              {/* Subtle Circuit Star Background Accents */}
              <div className="absolute inset-0 opacity-15 pointer-events-none circuit-pattern-overlay" />
              <div className="absolute top-10 right-10 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
              <div className="absolute bottom-10 left-10 w-48 h-48 bg-blue-600/25 rounded-full blur-3xl pointer-events-none" />

              {/* Top Tag & System Status */}
              <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold text-sky-200 border border-white/15 shadow-xs">
                  <Sparkles className="w-3 h-3 text-sky-300" />
                  <span>Official Robotics Portal</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>System Online</span>
                </span>
              </div>

              {/* Center Mascot & Bold Intro */}
              <div className="my-auto py-8 text-center relative z-10 flex flex-col items-center">
                <div className="relative mb-6 group">
                  <div className="absolute -inset-1.5 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 rounded-full blur-md opacity-40 group-hover:opacity-75 transition duration-500 animate-pulse pointer-events-none" />
                  <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 p-1 shadow-2xl shadow-blue-500/30">
                    <img
                      src="/assets/aistudio/Gemini_Generated_Image_aay230aay230aay2_dccf3432.jpg"
                      alt="Official Robot Mascot"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <div className="absolute -bottom-2.5 bg-white text-slate-900 font-extrabold text-[11px] px-3.5 py-1 rounded-full shadow-lg border border-sky-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>Hi, team! ✨</span>
                  </div>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                  Welcome to<br />
                  <span className="text-sky-300">roboman2</span>
                </h3>
                <p className="text-xs text-sky-100/80 mt-2.5 max-w-xs mx-auto leading-relaxed font-medium">
                  Robotics Club Management & Workshop System • MAN 2 Kota Bekasi
                </p>
              </div>

              {/* Bottom Quick Feature Highlights */}
              <div className="relative z-10 pt-4 border-t border-white/10 grid grid-cols-3 gap-2.5 text-center text-[10px] text-sky-100/80 font-semibold">
                <div className="p-2.5 rounded-2xl bg-white/5 backdrop-blur-xs border border-white/10 hover:bg-white/10 transition">
                  <p className="text-white font-bold text-xs">{isEn ? 'Roster' : 'Buku Induk'}</p>
                  <span className="text-sky-200/70">{isEn ? 'Directory' : 'Buku Induk'}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-white/5 backdrop-blur-xs border border-white/10 hover:bg-white/10 transition">
                  <p className="text-white font-bold text-xs">{isEn ? 'Attendance' : 'Presensi'}</p>
                  <span className="text-sky-200/70">{isEn ? 'Self & RFID' : 'Mandiri & RFID'}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-white/5 backdrop-blur-xs border border-white/10 hover:bg-white/10 transition">
                  <p className="text-white font-bold text-xs">{isEn ? 'Treasury & Projects' : 'Kas & Proyek'}</p>
                  <span className="text-sky-200/70">{isEn ? 'Components' : 'Komponen'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Official School & Team Footer on Initial Page */}
      <AppFooter className="border-t border-slate-200/90 bg-white/80 backdrop-blur-md" />
    </div>
  );
};
