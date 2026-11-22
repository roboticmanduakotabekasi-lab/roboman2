import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Clock, LogOut, ArrowRight, ShieldCheck } from 'lucide-react';
import { playClickTick, playWarningBuzzer, playSuccessChime } from '../utils/audioFeedback';
import { useLanguage } from '../utils/i18n';

interface IdleTimeoutModalProps {
  isOpen: boolean;
  countdownSeconds: number;
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
}

export const IdleTimeoutModal: React.FC<IdleTimeoutModalProps> = ({
  isOpen,
  countdownSeconds,
  onStayLoggedIn,
  onLogoutNow,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  useEffect(() => {
    if (isOpen) {
      playWarningBuzzer();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const percentage = Math.max(0, Math.min(100, (countdownSeconds / 60) * 100));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white border border-slate-200/90 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden text-center"
        >
          {/* Top Decorative Amber/Rose Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600" />

          {/* Animated Warning Icon with Pulse Ring */}
          <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-amber-500/20 animate-ping opacity-60 pointer-events-none" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
              <ShieldAlert className="w-8 h-8" />
            </div>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-2">
            {isEn ? 'Session Inactivity Warning' : 'Peringatan Sesi Tidak Aktif'}
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto mb-5 font-normal">
            {isEn
              ? 'No activity detected for 15 minutes. To protect sensitive club data, your session will automatically log out in:'
              : 'Tidak ada aktivitas terdeteksi selama 15 menit. Demi melindungi data ekskul, Anda akan otomatis keluar dalam:'}
          </p>

          {/* Countdown Display Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 text-center">
            <div className="flex items-center justify-center gap-2 text-2xl sm:text-3xl font-black font-mono text-rose-600 tracking-tight">
              <Clock className="w-6 h-6 animate-pulse" />
              <span>{countdownSeconds}s</span>
            </div>
            
            {/* Smooth Progress Bar */}
            <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden mt-3">
              <motion.div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                animate={{ width: `${percentage}%` }}
                transition={{ ease: 'linear', duration: 1 }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-2 block font-medium">
              {isEn ? 'Move mouse or click below to resume work' : 'Gerakkan mouse atau klik di bawah untuk lanjut bekerja'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => {
                playSuccessChime();
                onStayLoggedIn();
              }}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isEn ? 'Stay Logged In' : 'Tetap Masuk'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickTick();
                onLogoutNow();
              }}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>{isEn ? 'Log Out' : 'Keluar'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
