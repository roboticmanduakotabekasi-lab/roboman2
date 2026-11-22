import React from 'react';
import { 
  X, 
  Bot, 
  Users, 
  CalendarCheck, 
  Wallet, 
  CalendarDays, 
  Award,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AppInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppInfoModal: React.FC<AppInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-6 text-white relative shrink-0">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shadow-sm shrink-0">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-mono font-black text-white tracking-tight">
                  roboticman2kotabekasi
                </h2>
                <p className="text-xs text-blue-200 mt-0.5 font-medium">
                  MAN 2 Kota Bekasi Robotics Extracurricular Management System
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-700">
            <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">System Overview</h4>
                <p className="text-slate-600 mt-1 leading-relaxed text-xs">
                  A centralized management portal for roboman2 Robotics Club, supporting member directory management, meeting attendance tracking, treasury accounting, assignments evaluation, and cloud database synchronization.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Academic Cycle</span>
                <span className="text-sm font-black text-slate-900 font-mono">2026 / 2027</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Version &amp; Platform</span>
                <span className="text-sm font-black text-blue-600 font-mono">v2.5.0 Pro</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Development Team / Tim Pengembang</span>
              <p className="text-xs font-bold text-slate-900">
                Inashaura Azkazola Ridalistiyanti &amp; Daeniesh Raeisya Achmad
              </p>
              <p className="text-[11px] text-slate-500">
                Advisor: Abdul Khoir, S.Kom. · MAN 2 Kota Bekasi
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Robotic Club · MAN 2 Kota Bekasi</span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
