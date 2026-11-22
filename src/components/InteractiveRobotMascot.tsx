import React, { useState } from 'react';

export interface InteractiveRobotMascotProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  statusText?: string;
  variant?: 'mascot' | 'badge' | 'official-image';
}

/**
 * Official Static Robot Mascot for roboman2 (Robotics MAN 2 Kota Bekasi)
 * Strictly matches the official icon asset & branding:
 * - Direct rendering of official mascot badge: /assets/aistudio/Gemini_Generated_Image_aay230aay230aay2_dccf3432.jpg
 * - Circular celestial navy backdrop with glossy ice-cyan dome, cyan glowing heart-pupils, pink blush cheeks, cobalt ear modules, and twinkling stars
 * - STRICTLY STATIC: Fixed, no cursor tracking, no floating bounce, no speech bubbles.
 */
export const InteractiveRobotMascot: React.FC<InteractiveRobotMascotProps> = ({
  className = '',
  size = 'md',
  statusText,
}) => {
  const [hasError, setHasError] = useState(false);

  const sizeStyles = {
    xs: {
      wrapper: 'w-8 h-8',
      img: 'w-full h-full',
      border: 'border border-sky-300/60',
      badge: 'text-[8.5px] px-1.5 py-0.2',
    },
    sm: {
      wrapper: 'w-14 h-14',
      img: 'w-full h-full',
      border: 'border-2 border-sky-300/70',
      badge: 'text-[9.5px] px-2 py-0.5',
    },
    md: {
      wrapper: 'w-24 h-24 sm:w-28 sm:h-28',
      img: 'w-full h-full',
      border: 'border-2 border-sky-300/80',
      badge: 'text-[10px] px-2.5 py-0.5',
    },
    lg: {
      wrapper: 'w-36 h-36 sm:w-40 sm:h-40',
      img: 'w-full h-full',
      border: 'border-2 border-sky-300/90',
      badge: 'text-[11px] px-3 py-1',
    },
    xl: {
      wrapper: 'w-48 h-48 sm:w-52 sm:h-52',
      img: 'w-full h-full',
      border: 'border-3 border-sky-300',
      badge: 'text-xs px-3.5 py-1',
    },
  }[size];

  return (
    <div className={`relative inline-flex flex-col items-center select-none ${className}`}>
      {/* Mascot Circular Emblem Frame */}
      <div
        className={`rounded-full overflow-hidden ${sizeStyles.wrapper} ${sizeStyles.border} shadow-sm bg-[#0a1936] flex items-center justify-center shrink-0 relative`}
      >
        {!hasError ? (
          <img
            src="/assets/aistudio/Gemini_Generated_Image_aay230aay230aay2_dccf3432.jpg"
            alt="roboman2 Official Robot Mascot"
            className={`${sizeStyles.img} object-cover scale-[1.12] transform-gpu pointer-events-none select-none`}
            loading="eager"
            decoding="async"
            onError={() => setHasError(true)}
          />
        ) : (
          /* SVG Fallback in case of image load delay */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-950 text-cyan-300 font-extrabold text-xs">
            🤖
          </div>
        )}
      </div>

      {/* Optional Status text badge */}
      {statusText && (
        <span
          className={`mt-1.5 font-extrabold text-blue-950 bg-sky-100/90 border border-sky-200/90 rounded-full shadow-2xs whitespace-nowrap ${sizeStyles.badge}`}
        >
          {statusText}
        </span>
      )}
    </div>
  );
};
