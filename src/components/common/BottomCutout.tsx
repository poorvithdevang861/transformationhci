import React from 'react';

export const BottomCutout: React.FC = () => {
  return (
    <div
      className="bottom-cutout"
      aria-hidden="true"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '160px',
        pointerEvents: 'none',
        zIndex: 0,
        userSelect: 'none',
        overflow: 'hidden',
        WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
        maskImage: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
      }}
    >
      {/* Photo cutout image */}
      <img
        src="/img/bottom-cutout.jpg"
        alt=""
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '1600px',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center bottom',
          opacity: 'var(--cutout-opacity, 0.16)',
          filter: 'var(--cutout-filter, contrast(1.15) brightness(0.9))',
          mixBlendMode: 'var(--cutout-blend, normal)' as React.CSSProperties['mixBlendMode'],
          transition: 'opacity 0.25s ease, filter 0.25s ease',
        }}
      />

      {/* Subtle architectural faceted origami vector overlay */}
      <svg
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 'var(--cutout-svg-opacity, 0.08)',
          fill: 'var(--ink)',
        }}
      >
        <polygon points="0,160 0,90 120,120 260,75 380,135 520,60 680,110 820,50 960,125 1100,65 1240,115 1380,70 1440,100 1440,160" />
        <polygon points="60,160 180,95 320,140 460,85 600,130 760,80 900,145 1040,90 1200,135 1340,80 1440,120 1440,160" opacity="0.6" />
        <polygon points="0,160 140,125 280,150 420,110 560,145 700,95 860,140 1020,105 1160,150 1300,100 1440,140 1440,160" opacity="0.3" />
      </svg>
    </div>
  );
};
