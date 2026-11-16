import React, { useState, useEffect } from 'react';
import { Header, AppView } from './components/common/Header';
import { LandingBackground } from './components/common/LandingBackground';
import { StudyContainer } from './features/study/StudyContainer';
import { ResearcherDashboard } from './features/researcher/ResearcherDashboard';

type Theme = 'dark' | 'light';

const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ta-theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  }
  return 'dark';
};

const getInitialView = (): AppView => {
  if (typeof window !== 'undefined') {
    const p = window.location.pathname.toLowerCase();
    if (p.includes('researcher')) return 'researcher';
  }
  return 'study';
};

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(getInitialView);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [isStudyLanding, setIsStudyLanding] = useState(true);

  const isLandingPage = currentView === 'study' && isStudyLanding;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('ta-theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <>
      <div className="shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <Header
          currentView={currentView}
          onNavigate={(view) => {
            setCurrentView(view);
            if (view !== 'study') setIsStudyLanding(false);
          }}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        <main style={{ flex: 1 }}>
          {currentView === 'study' && (
            <StudyContainer
              onNavigate={setCurrentView}
              onStepChange={setIsStudyLanding}
            />
          )}
          {currentView === 'researcher' && <ResearcherDashboard onNavigate={setCurrentView} />}
        </main>
      </div>

      {isLandingPage && <LandingBackground theme={theme} />}
    </>
  );
};
