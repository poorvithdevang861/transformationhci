import React from 'react';
import { ExperimentSession } from '../../core/storage/types';
import { formatSessionResultsTxt } from '../../core/storage/results-formatter';
import { downloadBlob } from '../../core/storage/api-client';
import { Icon } from '../../components/common/Icon';

interface CompletionStepProps {
  session: ExperimentSession;
  onNewSession: () => void;
  onOpenResearcher: () => void;
}

export const CompletionStep: React.FC<CompletionStepProps> = ({
  session,
  onNewSession,
  onOpenResearcher
}) => {
  const trials = session.trials || [];
  const correctCount = trials.filter((t) => t.correct).length;
  const n = trials.length;
  const accPct = n > 0 ? ((correctCount / n) * 100).toFixed(1) : 0;
  const meanTimeS = n > 0 ? (trials.reduce((acc, t) => acc + t.timeMs, 0) / n / 1000).toFixed(2) : 0;

  const handleDownloadTxt = () => {
    const txt = formatSessionResultsTxt(session);
    downloadBlob(txt, `results_${session.id}_${Date.now()}.txt`, 'text/plain;charset=utf-8');
  };

  const handleDownloadJson = () => {
    downloadBlob(JSON.stringify(session, null, 2), `session_${session.id}_${Date.now()}.json`, 'application/json');
  };

  return (
    <div className="panel narrow" style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ color: 'var(--ok)', marginBottom: '12px' }}>
        <Icon name="i-check" size="lg" />
      </div>
      <h2 className="ptitle" style={{ fontSize: '1.6rem' }}>
        Study Complete & Progress Saved
      </h2>
      <p style={{ color: 'var(--muted)', marginTop: '8px' }}>
        Thank you for participating! Your responses, trial timings, and eye-gaze tracking metrics across all mapped
        boundaries have been recorded.
      </p>

      <div
        style={{
          margin: '20px 0',
          textAlign: 'left',
          background: 'var(--sunken)',
          border: '1px solid var(--line)',
          borderRadius: '14px',
          padding: '16px'
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--accent)' }}>Executive Summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.88rem' }}>
          <div>Participant: <b>{session.id}</b></div>
          <div>Accuracy: <b>{accPct}% ({correctCount}/{n})</b></div>
          <div>Mean Time: <b>{meanTimeS}s</b></div>
          <div>Eye-Tracking: <b>{session.eyeTracking ? 'Active' : 'Mouse Fallback'}</b></div>
        </div>
      </div>

      <div className="edge" style={{ justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
        <button
          type="button"
          className="ibtn tb primary"
          onClick={handleDownloadTxt}
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 0 }}
        >
          <Icon name="i-download" />
          Download results.txt
        </button>
        <button type="button" className="ibtn tb" onClick={handleDownloadJson}>
          <Icon name="i-code" />
          Download JSON
        </button>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
        <button type="button" className="ibtn tb" onClick={onNewSession}>
          <Icon name="i-home" />
          New Session
        </button>
        <button type="button" className="ibtn tb" onClick={onOpenResearcher}>
          <Icon name="i-chart" />
          Researcher Dashboard
        </button>
      </div>
    </div>
  );
};
