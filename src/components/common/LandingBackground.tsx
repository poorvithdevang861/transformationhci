import React from 'react';

interface LandingBackgroundProps {
  theme?: 'dark' | 'light';
}

export const LandingBackground: React.FC<LandingBackgroundProps> = ({ theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const rawPath = isDark ? 'img/landing-dark-bg.jpg' : 'img/landing-bg.png';
  const imgSrc = typeof document !== 'undefined' && document.baseURI
    ? new URL(rawPath, document.baseURI).href
    : rawPath;

  return (
    <div
      className="landing-bg-container"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Dynamic Background Image:
          - Dark Theme: bg2.jpg (lunar moon over alpine mountains, nebulae & starry cosmos) with soft top blend
          - Light Theme: image.jpeg (wildflower meadow hill) anchored at bottom
      */}
      <img
        src={imgSrc}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          objectPosition: isDark ? 'center 40%' : 'center bottom',
          opacity: isDark ? 0.92 : 1,
          filter: isDark ? 'contrast(1.05) brightness(0.95)' : 'none',
          WebkitMaskImage: isDark
            ? 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 6%, rgba(0,0,0,0.85) 18%, rgba(0,0,0,1) 32%, rgba(0,0,0,1) 100%)'
            : 'none',
          maskImage: isDark
            ? 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 6%, rgba(0,0,0,0.85) 18%, rgba(0,0,0,1) 32%, rgba(0,0,0,1) 100%)'
            : 'none',
          transition: 'opacity 0.25s ease, filter 0.25s ease',
        }}
      />

      {/* Atmospheric top gradient for Dark Theme to guarantee zero abrupt line at top */}
      {isDark && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '200px',
            background: 'linear-gradient(to bottom, var(--bg) 0%, rgba(19, 19, 21, 0.75) 30%, rgba(19, 19, 21, 0.2) 65%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};
