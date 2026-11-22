import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Hash, 
  Calendar, 
  UserCheck, 
  Sparkles, 
  LogOut, 
  HelpCircle,
  School,
  Lock,
  ArrowRight,
  Bot,
  User,
  Eye,
  EyeOff
} from 'lucide-react';
import { Member, UserSession } from '../types';
import { normalizeDateString } from '../utils/universalDataParser';
import { playClickTick, playSuccessChime, playWarningBuzzer } from '../utils/audioFeedback';
import { addOrUpdateAccount, hashPassword } from '../utils/authConfig';

interface StudentVerificationModalProps {
  isOpen: boolean;
  session: UserSession;
  members: Member[];
  onVerificationSuccess: (verifiedMember: Member, updatedSession: UserSession) => void;
  onSkip?: () => void;
  onLogout: () => void;
}

export const StudentVerificationModal: React.FC<StudentVerificationModalProps> = ({
  isOpen,
  session,
  members,
  onVerificationSuccess,
  onSkip,
  onLogout,
}) => {
  const [nameInput, setNameInput] = useState(session.name || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nisnInput, setNisnInput] = useState(session.nisn || '');
  const [birthDateInput, setBirthDateInput] = useState(session.birthDate || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [successMember, setSuccessMember] = useState<Member | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  if (!isOpen) return null;

  // Auto-fill sample student for testing convenience
  const handleAutoFillSample = (sampleMember?: Member) => {
    playClickTick();
    const target = sampleMember || members.find(m => m.birthDate && m.nisn) || members[0];
    if (target) {
      setNameInput(target.fullName);
      setNisnInput(String(target.nisn || target.id_member || ''));
      setBirthDateInput(target.birthDate || '2008-05-12');
      setErrorMsg(null);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsVerifying(true);
    playClickTick();

    const cleanNisn = nisnInput.replace(/[^0-9]/g, '').trim();
    const cleanDate = normalizeDateString(birthDateInput.trim());

    if (!cleanNisn) {
      setErrorMsg('Student NISN is required for verification.');
      setIsVerifying(false);
      playWarningBuzzer();
      return;
    }

    // Match against club members roster
    const matched = members.find((m) => {
      const mNisn = (m.nisn || '').replace(/[^0-9]/g, '').trim();
      const mId = String(m.id_member || '').replace(/[^0-9]/g, '').trim();
      return mNisn === cleanNisn || mId === cleanNisn;
    });

    if (!matched) {
      setErrorMsg(`NISN "${cleanNisn}" is not registered in the official MAN 2 Robotics club roster. Please contact your faculty advisor.`);
      setIsVerifying(false);
      playWarningBuzzer();
      return;
    }

    // Validate birth date match if present in records
    if (matched.birthDate && cleanDate) {
      const normMatched = normalizeDateString(matched.birthDate);
      if (normMatched && cleanDate !== normMatched) {
        setErrorMsg('Birth date does not match school records for this NISN. Please verify your date of birth.');
        setIsVerifying(false);
        playWarningBuzzer();
        return;
      }
    }

    // Update account credentials if password provided
    if (passwordInput && passwordInput.length >= 6) {
      try {
        const hashed = await hashPassword(passwordInput);
        addOrUpdateAccount({
          username: session.username,
          password: hashed,
          name: matched.fullName || nameInput || session.name,
          role: session.role || 'member',
          email: session.email,
          nisn: cleanNisn,
        });
      } catch (err) {
        console.warn('Notice saving verified password:', err);
      }
    }

    setSuccessMember(matched);
    playSuccessChime();

    setTimeout(() => {
      const updatedSession: UserSession = {
        ...session,
        name: matched.fullName || session.name,
        nisn: cleanNisn,
        birthDate: matched.birthDate || cleanDate || session.birthDate,
        isVerifiedMember: true,
        membershipStatus: matched.status === 'executive_board' ? 'executive_board' : 'aktif',
        kelas: `${matched.grade || ''} ${matched.classRoom || ''}`.trim(),
      };
      onVerificationSuccess(matched, updatedSession);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white/95 backdrop-blur-md border border-sky-100 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-6 text-slate-900"
      >
        {/* Banner */}
        <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#312E81] p-6 text-white text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center mx-auto text-white shadow-lg mb-3">
            <School className="w-7 h-7 text-sky-200" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight font-sans text-white">Student Identity Verification</h2>
          <p className="text-xs text-sky-200 mt-1 max-w-sm mx-auto font-medium">
            Verify your active club enrollment in roboman2 (MAN 2 Kota Bekasi) with your Student NISN.
          </p>
        </div>

        {/* Verification Form */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs leading-relaxed font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMember ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-emerald-900 text-sm">Identity Verified!</h4>
              <p className="text-xs text-emerald-700 font-medium">
                Welcome, <strong>{successMember.fullName}</strong> (Class {successMember.grade}-{successMember.classRoom}). Unlocking your roboman2 portal...
              </p>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Your registered full name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-sky-100 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100/80 focus:border-indigo-500 text-xs transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Student ID / NISN <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAutoFillSample()}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline font-bold cursor-pointer"
                  >
                    Auto-Fill Sample NISN
                  </button>
                </div>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={nisnInput}
                    onChange={(e) => setNisnInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="10-digit NISN (e.g., 0110000001)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-sky-100 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100/80 focus:border-indigo-500 text-xs transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Date of Birth (YYYY-MM-DD or DD/MM/YYYY)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={birthDateInput}
                    onChange={(e) => setBirthDateInput(e.target.value)}
                    placeholder="e.g., 2008-05-12 or 12/05/2008"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-sky-100 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100/80 focus:border-indigo-500 text-xs transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  New Password (Optional, to set login credentials)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Create your portal password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-sky-100 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100/80 focus:border-indigo-500 text-xs transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>

                <div className="flex items-center gap-2">
                  {onSkip && (
                    <button
                      type="button"
                      onClick={onSkip}
                      className="px-4 py-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-blue-950 font-bold transition cursor-pointer"
                    >
                      Skip (Testing)
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold shadow-md transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <span>Verifying...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify &amp; Continue</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
