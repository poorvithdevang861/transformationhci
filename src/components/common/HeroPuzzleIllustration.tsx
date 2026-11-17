import React from 'react';

interface HeroPuzzleIllustrationProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  idPrefix?: string;
}

export const HeroPuzzleIllustration: React.FC<HeroPuzzleIllustrationProps> = ({
  size = 58,
  className = '',
  style,
  idPrefix = 'hero'
}) => {
  const pGrad = `${idPrefix}PuzzleGrad`;
  const amberGrad = `${idPrefix}AmberGrad`;
  const emeraldGrad = `${idPrefix}EmeraldGrad`;
  const roseGrad = `${idPrefix}RoseGrad`;
  const skyGrad = `${idPrefix}SkyGrad`;
  const glow = `${idPrefix}DropGlow`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', overflow: 'visible', margin: '0 auto', ...style }}
      aria-hidden="true"
    >
      <defs>
        {/* Vibrant Gradients */}
        <linearGradient id={pGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id={amberGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id={emeraldGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id={roseGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
        <linearGradient id={skyGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <filter id={glow} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#6366f1" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Floating Geometric Shapes Surrounding the Jigsaw Puzzle Piece */}
      {/* 1. Top-Left: Amber Triangle */}
      <path
        d="M13.5 10.2a1.2 1.2 0 0 1 2.08 0l5.2 8.7a1.2 1.2 0 0 1-1.04 1.8H9.26a1.2 1.2 0 0 1-1.04-1.8l5.28-8.7z"
        fill={`url(#${amberGrad})`}
      />

      {/* 2. Top-Right: Emerald Circle */}
      <circle cx="49" cy="16" r="5.5" fill={`url(#${emeraldGrad})`} />

      {/* 3. Bottom-Left: Rose Rounded Square */}
      <rect x="9" y="42" width="10" height="10" rx="2.5" fill={`url(#${roseGrad})`} />

      {/* 4. Bottom-Right: Sky Blue Rotated Diamond */}
      <rect
        x="48"
        y="42"
        width="9.5"
        height="9.5"
        rx="2.2"
        transform="rotate(45 48 42)"
        fill={`url(#${skyGrad})`}
      />

      {/* Central Solid Colored Jigsaw Puzzle Piece */}
      <g transform="translate(16.5, 17.5) scale(1.3)" filter={`url(#${glow})`}>
        <path
          fill={`url(#${pGrad})`}
          d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z"
        />
      </g>
    </svg>
  );
};
