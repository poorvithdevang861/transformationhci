import React, { useState, useEffect } from 'react';
import { ExperimentSession, StudyConfig } from '../../core/storage/types';
import { LocalStore } from '../../core/storage/local-store';
import { KpiCards } from './KpiCards';
import { ConditionTable } from './ConditionTable';
import { SessionsTable } from './SessionsTable';
import { StudyConfigForm } from './StudyConfigForm';
import { HeatmapDialog } from './HeatmapDialog';
import { exportGazeCsv, exportTrialsCsv, exportSessionsCsv } from '../../core/storage/csv-exporter';
import { downloadBlob, fetchSessionsFromServer } from '../../core/storage/api-client';
import { Icon } from '../../components/common/Icon';
import { AppView } from '../../components/common/Header';

interface ResearcherDashboardProps {
  onNavigate?: (view: AppView) => void;
}

export const ResearcherDashboard: React.FC<ResearcherDashboardProps> = ({ onNavigate }) => {
  const [sessions, setSessions] = useState<ExperimentSession[]>([]);
  const [config, setConfig] = useState<StudyConfig>(() => LocalStore.getConfig());
  const [inspectSession, setInspectSession] = useState<ExperimentSession | null>(null);

  useEffect(() => {
    setSessions(LocalStore.getSessions());
    fetchSessionsFromServer().then((serverSessions) => {
      if (serverSessions && serverSessions.length > 0) {
        serverSessions.forEach((s) => LocalStore.saveSession(s));
        setSessions(LocalStore.getSessions());
      }
    });
  }, []);

  const handleDeleteAll = () => {
    if (window.confirm('Delete all recorded sessions from this device?')) {
      LocalStore.clearAllSessions();
      setSessions([]);
    }
  };

  const handleSaveConfig = (newCfg: StudyConfig) => {
    LocalStore.saveConfig(newCfg);
    setConfig(newCfg);
  };

  const handleExportJson = () => {
    downloadBlob(JSON.stringify(sessions, null, 2), `all_sessions_${Date.now()}.json`, 'application/json');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string);
        if (Array.isArray(imported)) {
          imported.forEach((s) => LocalStore.saveSession(s));
          setSessions(LocalStore.getSessions());
        }
      } catch (err) {
        alert('Invalid JSON file format');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', paddingBottom: '32px' }}>
      <div className="edge" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onNavigate && (
            <button
              type="button"
              className="ibtn tb"
              onClick={() => onNavigate('study')}
              style={{ height: '36px', padding: '0 12px', borderRadius: '8px' }}
              title="Return to Participant Study"
            >
              <Icon name="i-arrow-left" size="sm" />
              <span>Back to Study</span>
            </button>
          )}
          <div>
            <div className="eyebrow">Experiment Control</div>
            <h1 style={{ margin: 0 }}>Researcher Dashboard</h1>
          </div>
        </div>
        <div className="r" style={{ gap: '8px' }}>
          {onNavigate && (
            <button
              type="button"
              className="ibtn tb primary"
              onClick={() => onNavigate('analytics')}
              style={{ height: '34px', borderRadius: '8px', padding: '0 12px' }}
              title="Open Eye-Gaze Journey & Hint Analytics Dashboard"
            >
              <Icon name="i-eye" size="sm" />
              <span>Journey Analytics</span>
            </button>
          )}
          <button type="button" className="ibtn tb" onClick={() => downloadBlob(exportGazeCsv(sessions), 'gaze_metrics.csv', 'text/csv')}>
            <Icon name="i-eye" size="sm" />
            <span>Gaze CSV</span>
          </button>
          <button type="button" className="ibtn tb" onClick={() => downloadBlob(exportTrialsCsv(sessions), 'trials.csv', 'text/csv')}>
            <Icon name="i-file-text" size="sm" />
            <span>Trials CSV</span>
          </button>
          <button type="button" className="ibtn tb" onClick={() => downloadBlob(exportSessionsCsv(sessions), 'sessions.csv', 'text/csv')}>
            <Icon name="i-download" size="sm" />
            <span>Sessions CSV</span>
          </button>
          <button type="button" className="ibtn tb" onClick={handleExportJson}>
            <Icon name="i-code" size="sm" />
            <span>All JSON</span>
          </button>
          <label className="ibtn tb" style={{ cursor: 'pointer' }}>
            <Icon name="i-upload" size="sm" />
            <span>Import JSON</span>
            <input type="file" accept=".json,application/json" onChange={handleImportJson} hidden />
          </label>
        </div>
      </div>

      <KpiCards sessions={sessions} />

      {onNavigate && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.12), rgba(34, 197, 94, 0.12))',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '12px',
            padding: '14px 20px',
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Eye-Gaze Journey Tracking & Hint Interaction Analytics</span>
              <span className="pill" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '0.72rem' }}>
                New Module
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
              Explore chronological visual journeys after hint clicks, interactive Sankey transition flows, boundary heatmaps, and playback.
            </p>
          </div>
          <button
            type="button"
            className="ibtn primary"
            onClick={() => onNavigate('analytics')}
            style={{ height: '34px', padding: '0 16px', borderRadius: '8px', whiteSpace: 'nowrap' }}
          >
            <span>Launch Journey Analytics</span>
            <Icon name="i-arrow" size="sm" />
          </button>
        </div>
      )}

      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="eyebrow">Analysis</div>
        <h2 className="ptitle" style={{ marginBottom: '12px' }}>Performance by Hint Condition</h2>
        <ConditionTable sessions={sessions} />
      </div>

      <SessionsTable sessions={sessions} onInspectSession={setInspectSession} onDeleteAll={handleDeleteAll} />

      <StudyConfigForm config={config} onSave={handleSaveConfig} />

      <HeatmapDialog session={inspectSession} onClose={() => setInspectSession(null)} />
    </div>
  );
};
