import React from 'react';

export const LandingBackground: React.FC = () => {
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
      <img
        src="/img/landing-bg.png"
        alt=""
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          objectPosition: 'center bottom',
          opacity: 'var(--landing-mound-opacity, 1)',
          filter: 'var(--landing-mound-filter, none)',
          transition: 'opacity 0.25s ease, filter 0.25s ease',
        }}
      />
    </div>
  );
};
