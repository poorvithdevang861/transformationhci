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
    <header className="edge" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--line)' }}>
      <div className="l">
        <button
          type="button"
          className="ibtn"
          onClick={() => onNavigate('study')}
          aria-label="Home Study"
          title="Home Study"
        >
          <Icon name="i-home" />
        </button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <h1>Transformation Animator</h1>
          <span className="meta">Cognitive Science Experiment</span>
        </div>
      </div>

      <div className="r">
        {statusChip}
        <button
          type="button"
          className={`ibtn tb ${currentView === 'study' ? 'primary' : ''}`}
          onClick={() => onNavigate('study')}
        >
          <Icon name="i-home" />
          Study
        </button>
        <button
          type="button"
          className={`ibtn tb ${currentView === 'researcher' ? 'primary' : ''}`}
          onClick={() => onNavigate('researcher')}
        >
          <Icon name="i-chart" />
          Researcher
        </button>
      </div>
    </header>
  );
};
