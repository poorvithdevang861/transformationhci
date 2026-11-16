import React from 'react';
import { Icon } from './Icon';

export type AppView = 'study' | 'researcher';

interface HeaderProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  statusChip?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, statusChip }) => {
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
              borderRadius: '9px',
              background: 'var(--raised)',
              border: '1px solid var(--line)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--ink)'
            }}
          >
            <Icon name="i-anim" size="sm" />
          </div>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, lineHeight: 1.2 }}>
              Transformation Animator
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
      </div>
    </header>
  );
};
