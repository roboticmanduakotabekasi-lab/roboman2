import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../utils/i18n';
import { playClickTick } from '../utils/audioFeedback';

interface LanguageToggleProps {
  className?: string;
  variant?: 'compact' | 'full';
  theme?: 'light' | 'dark';
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  className = '',
  variant = 'compact',
  theme = 'light',
}) => {
  const { language, toggleLanguage } = useLanguage();

  const handleToggle = () => {
    playClickTick();
    toggleLanguage();
  };

  const isEn = language === 'en';
  const isDark = theme === 'dark';

  if (variant === 'full') {
    return (
      <button
        type="button"
        id="languageToggleBtn"
        onClick={handleToggle}
        className={`flex items-center justify-between w-full px-3 py-2 rounded-xl border transition cursor-pointer text-xs font-semibold shadow-2xs ${
          isDark
            ? 'border-blue-700/50 bg-blue-900/40 hover:bg-blue-800/60 text-blue-100 hover:text-white'
            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
        } ${className}`}
        title={isEn ? 'Switch to Bahasa Indonesia' : 'Switch to English'}
      >
        <div className="flex items-center gap-2">
          <Languages className={`w-4 h-4 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
          <span>{isEn ? 'Language' : 'Bahasa'}</span>
        </div>
        <div className={`flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-lg border text-[11px] ${
          isDark 
            ? 'bg-blue-800/80 text-blue-200 border-blue-600/40' 
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          <span>{isEn ? '🇬🇧 English' : '🇮🇩 Indonesia'}</span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      id="languageToggleBtn"
      onClick={handleToggle}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs select-none active:scale-95 ${
        isDark
          ? 'border-blue-700/60 bg-blue-900/60 hover:bg-blue-800/80 text-blue-100 hover:text-white'
          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
      } ${className}`}
      title={isEn ? 'Switch to Bahasa Indonesia' : 'Switch to English'}
      aria-label="Toggle application language"
    >
      <Languages className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
      <span className="font-mono text-[11px] tracking-wide">
        {isEn ? 'EN' : 'ID'}
      </span>
      <span className="text-xs shrink-0" role="img" aria-hidden="true">
        {isEn ? '🇬🇧' : '🇮🇩'}
      </span>
    </button>
  );
};
