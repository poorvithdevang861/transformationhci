import React, { useState } from 'react';
import { Header, AppView } from './components/common/Header';
import { StudyContainer } from './features/study/StudyContainer';
import { ResearcherDashboard } from './features/researcher/ResearcherDashboard';

const getInitialView = (): AppView => {
  if (typeof window !== 'undefined') {
    const p = window.location.pathname.toLowerCase();
    if (p.includes('researcher')) return 'researcher';
  }
  return 'study';
};

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(getInitialView);

  return (
    <div className="shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header currentView={currentView} onNavigate={setCurrentView} />

      <main style={{ flex: 1 }}>
        {currentView === 'study' && <StudyContainer onNavigate={setCurrentView} />}
        {currentView === 'researcher' && <ResearcherDashboard />}
      </main>
    </div>
  );
};
