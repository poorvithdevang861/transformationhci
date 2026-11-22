import React, { useState, useEffect } from 'react';
import { ExperimentSession } from '../../core/storage/types';
import { LocalStore } from '../../core/storage/local-store';
import { fetchSessionsFromServer, downloadBlob } from '../../core/storage/api-client';
import { GazeJourneyTracker } from '../../core/gaze/journey-tracker';
import { SessionOverviewSection } from './SessionOverviewSection';
import { HintTimelineSection } from './HintTimelineSection';
import { GazeFlowSankeySection } from './GazeFlowSankeySection';
import { BoundaryOverlaySection } from './BoundaryOverlaySection';
import { HintEffectivenessSection } from './HintEffectivenessSection';
import { InteractiveSessionPlayer } from './InteractiveSessionPlayer';
import { Icon } from '../../components/common/Icon';
import { AppView } from '../../components/common/Header';

export type AnalyticsTab = 'overview' | 'timeline' | 'sankey' | 'overlay' | 'effectiveness' | 'player';

interface JourneyDashboardProps {
  onNavigate?: (view: AppView) => void;
}

export const JourneyDashboard: React.FC<JourneyDashboardProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [sessions, setSessions] = useState<ExperimentSession[]>([]);
  const [isSampleData, setIsSampleData] = useState(false);

  // Common Selection state
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<number | 'all'>('all');
  const [selectedHintId, setSelectedHintId] = useState<number | 'all'>('all');

  useEffect(() => {
    const localSessions = LocalStore.getSessions();
    if (localSessions.length > 0) {
      setSessions(localSessions);
      setSelectedSessionId(localSessions[0].id);
    } else {
      // If no local sessions, initialize with the isolated sample session so researcher has instant rich visualizations
      const demoSession = GazeJourneyTracker.generateSampleJourneySession();
      setSessions([demoSession]);
      setSelectedSessionId(demoSession.id);
      setIsSampleData(true);
    }

    fetchSessionsFromServer().then((srvSessions) => {
      if (srvSessions && srvSessions.length > 0) {
        setSessions(srvSessions);
        setSelectedSessionId(srvSessions[0].id);
        setIsSampleData(false);
      }
    });
  }, []);

  const handleToggleSampleData = () => {
    if (isSampleData) {
      const real = LocalStore.getSessions();
      setSessions(real);
      setSelectedSessionId(real.length > 0 ? real[0].id : '');
      setIsSampleData(false);
    } else {
      const demoSession = GazeJourneyTracker.generateSampleJourneySession();
      setSessions([demoSession]);
      setSelectedSessionId(demoSession.id);
      setIsSampleData(true);
    }
  };

  const handleExportJourneyJson = () => {
    const allEvents: any[] = [];
    sessions.forEach((s) => {
      s.trials.forEach((t) => {
        const { events } = GazeJourneyTracker.reconstructFromTrial(t, s.id, s.id);
        allEvents.push(...events);
      });
    });
    downloadBlob(JSON.stringify(allEvents, null, 2), `gaze_journey_events_${Date.now()}.json`, 'application/json');
  };

  const handleExportTransitionsCsv = () => {
    const rows = [
      'session_id,participant_id,puzzle_id,hint_id,event_type,previous_region,current_region,dwell_duration_ms,time_since_hint_click_ms,elapsed_time_ms,timestamp'
    ];

    sessions.forEach((s) => {
      s.trials.forEach((t) => {
        const { events } = GazeJourneyTracker.reconstructFromTrial(t, s.id, s.id);
        events.forEach((e) => {
          rows.push(
            [
              `"${e.session_id}"`,
              `"${e.participant_id}"`,
              e.puzzle_id,
              e.hint_id ?? '',
              `"${e.event_type}"`,
              `"${e.previous_region_id || ''}"`,
              `"${e.current_region_id || e.region_id}"`,
              e.dwell_duration_ms ?? '',
              e.time_since_hint_click_ms ?? '',
              e.elapsed_time,
              e.timestamp
            ].join(',')
          );
        });
      });
    });

    downloadBlob(rows.join('\n'), `gaze_transitions_${Date.now()}.csv`, 'text/csv');
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', width: '100%', padding: '16px 20px 48px' }}>
      {/* Top Header & Global Actions */}
      <div className="edge" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onNavigate && (
            <button
              type="button"
              className="ibtn tb"
              onClick={() => onNavigate('study')}
              style={{ height: '36px', padding: '0 12px', borderRadius: '8px' }}
              title="Return to Study"
            >
              <Icon name="i-arrow-left" size="sm" />
              <span>Back to Study</span>
            </button>
          )}
          <div>
            <div className="eyebrow">Cognitive Analytics & UX Telemetry</div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700 }}>
              Eye-Gaze Journey & Hint Analytics
            </h1>
          </div>
        </div>

        <div className="r" style={{ gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`ibtn tb ${isSampleData ? 'active' : ''}`}
            onClick={handleToggleSampleData}
            style={{
              height: '34px',
              borderRadius: '8px',
              padding: '0 12px',
              background: isSampleData ? 'rgba(168, 85, 247, 0.2)' : undefined,
              borderColor: isSampleData ? 'var(--accent)' : undefined
            }}
            title={isSampleData ? 'Switch back to actual recorded sessions' : 'Load sample journey data for testing'}
          >
            <Icon name="i-layers" size="sm" />
            <span>{isSampleData ? 'Clear Demo Data' : 'Load Demo Dataset'}</span>
          </button>

          <button
            type="button"
            className="ibtn tb"
            onClick={handleExportTransitionsCsv}
            style={{ height: '34px', borderRadius: '8px', padding: '0 12px' }}
            title="Export all boundary transitions to CSV"
          >
            <Icon name="i-file-text" size="sm" />
            <span>Transitions CSV</span>
          </button>

          <button
            type="button"
            className="ibtn tb"
            onClick={handleExportJourneyJson}
            style={{ height: '34px', borderRadius: '8px', padding: '0 12px' }}
            title="Export all journey events to JSON"
          >
            <Icon name="i-code" size="sm" />
            <span>Journey JSON</span>
          </button>
        </div>
      </div>

      {/* Primary Section Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          background: 'var(--sunken)',
          padding: '6px',
          borderRadius: '12px',
          border: '1px solid var(--line)',
          marginBottom: '20px',
          overflowX: 'auto'
        }}
      >
        <button
          type="button"
          className={`ibtn tb ${activeTab === 'overview' ? 'primary' : ''}`}
          onClick={() => setActiveTab('overview')}
          style={{ height: '36px', borderRadius: '8px', padding: '0 16px', fontSize: '0.84rem' }}
        >
          <Icon name="i-user" size="sm" />
          <span>Session Overview</span>
        </button>

        <button
          type="button"
          className={`ibtn tb ${activeTab === 'timeline' ? 'primary' : ''}`}
          onClick={() => setActiveTab('timeline')}
          style={{ height: '36px', borderRadius: '8px', padding: '0 16px', fontSize: '0.84rem' }}
        >
          <Icon name="i-timer" size="sm" />
          <span>Hint Timeline</span>
        </button>

        <button
          type="button"
          className={`ibtn tb ${activeTab === 'sankey' ? 'primary' : ''}`}
          onClick={() => setActiveTab('sankey')}
          style={{ height: '36px', borderRadius: '8px', padding: '0 16px', fontSize: '0.84rem' }}
        >
          <Icon name="i-layers" size="sm" />
          <span>Transition Flow (Sankey)</span>
        </button>

        <button
          type="button"
          className={`ibtn tb ${activeTab === 'overlay' ? 'primary' : ''}`}
          onClick={() => setActiveTab('overlay')}
          style={{ height: '36px', borderRadius: '8px', padding: '0 16px', fontSize: '0.84rem' }}
        >
          <Icon name="i-eye" size="sm" />
          <span>Boundary Overlay & Heatmap</span>
        </button>

        <button
          type="button"
          className={`ibtn tb ${activeTab === 'effectiveness' ? 'primary' : ''}`}
          onClick={() => setActiveTab('effectiveness')}
          style={{ height: '36px', borderRadius: '8px', padding: '0 16px', fontSize: '0.84rem' }}
        >
          <Icon name="i-bulb" size="sm" />
          <span>Hint Effectiveness</span>
        </button>

        <button
          type="button"
          className={`ibtn tb ${activeTab === 'player' ? 'primary' : ''}`}
          onClick={() => setActiveTab('player')}
          style={{ height: '36px', borderRadius: '8px', padding: '0 16px', fontSize: '0.84rem' }}
        >
          <Icon name="i-play" size="sm" />
          <span>Interactive Player</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <SessionOverviewSection sessions={sessions} isSampleData={isSampleData} />
      )}

      {activeTab === 'timeline' && (
        <HintTimelineSection
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          selectedPuzzleId={selectedPuzzleId}
          selectedHintId={selectedHintId}
          onSelectSession={setSelectedSessionId}
          onSelectPuzzle={setSelectedPuzzleId}
          onSelectHint={setSelectedHintId}
        />
      )}

      {activeTab === 'sankey' && (
        <GazeFlowSankeySection sessions={sessions} />
      )}

      {activeTab === 'overlay' && (
        <BoundaryOverlaySection
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          selectedPuzzleId={selectedPuzzleId}
          onSelectSession={setSelectedSessionId}
          onSelectPuzzle={setSelectedPuzzleId}
        />
      )}

      {activeTab === 'effectiveness' && (
        <HintEffectivenessSection sessions={sessions} />
      )}

      {activeTab === 'player' && (
        <InteractiveSessionPlayer
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          selectedPuzzleId={selectedPuzzleId}
          onSelectSession={setSelectedSessionId}
          onSelectPuzzle={setSelectedPuzzleId}
        />
      )}
    </div>
  );
};
