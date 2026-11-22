import React from 'react';
import { Icon } from './Icon';
import { HeroPuzzleIllustration } from './HeroPuzzleIllustration';

export type AppView = 'study' | 'researcher' | 'analytics';

interface HeaderProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  statusChip?: React.ReactNode;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  statusChip,
  theme,
  onToggleTheme
}) => {
  return (
    <header
      className="edge app-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: 'var(--bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        paddingTop: '14px',
        paddingBottom: '14px',
        borderBottom: '1px solid var(--line)',
        width: '100%'
      }}
    >
      <div className="l">
        <button
          type="button"
          onClick={() => onNavigate('study')}
          style={{
            border: 0,
            background: 'transparent',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              display: 'grid',
              placeItems: 'center',
              flex: 'none'
            }}
          >
            <HeroPuzzleIllustration size={30} idPrefix="nav" />
          </div>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, lineHeight: 1.2 }}>
              Transformation-EyeGaze Study
            </h1>
            <span className="meta" style={{ fontSize: '0.74rem' }}>Cognitive Science Experiment</span>
          </div>
        </button>
      </div>

      <div className="r" style={{ gap: '8px' }}>
        {statusChip}
        <button
          type="button"
          className={`ibtn tb ${currentView === 'study' ? 'primary' : ''}`}
          onClick={() => onNavigate('study')}
          style={{ height: '34px', borderRadius: '8px', padding: '0 14px', fontSize: '0.84rem' }}
        >
          <Icon name="i-book-open" size="sm" />
          <span>Study</span>
        </button>
        <button
          type="button"
          className={`ibtn tb ${currentView === 'researcher' ? 'primary' : ''}`}
          onClick={() => onNavigate('researcher')}
          style={{ height: '34px', borderRadius: '8px', padding: '0 14px', fontSize: '0.84rem' }}
        >
          <Icon name="i-chart" size="sm" />
          <span>Researcher</span>
        </button>
        <button
          type="button"
          className={`ibtn tb ${currentView === 'analytics' ? 'primary' : ''}`}
          onClick={() => onNavigate('analytics')}
          style={{ height: '34px', borderRadius: '8px', padding: '0 14px', fontSize: '0.84rem' }}
          title="Eye-Gaze Journey & Hint Interaction Analytics"
        >
          <Icon name="i-eye" size="sm" />
          <span>Journey Analytics</span>
        </button>
        <button
          type="button"
          className="ibtn tb"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ width: '34px', height: '34px', padding: 0, borderRadius: '8px', justifyContent: 'center' }}
        >
          <Icon name={theme === 'dark' ? 'i-sun' : 'i-moon'} size="sm" />
        </button>
      </div>
    </header>
  );
};
