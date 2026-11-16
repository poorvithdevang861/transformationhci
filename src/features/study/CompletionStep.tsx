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
    <div style={{ maxWidth: '580px', margin: '32px auto', width: '100%' }}>
      <div
        className="panel"
        style={{
          borderRadius: '20px',
          padding: '32px 28px',
          boxShadow: 'none',
          border: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          textAlign: 'center'
        }}
      >
        <div>
          <div
            style={{
              width: '44px',
              height: '44px',
              margin: '0 auto 12px',
              borderRadius: '12px',
              background: 'var(--raised)',
              border: '1px solid var(--line)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--ok)'
            }}
          >
            <Icon name="i-check" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, margin: '0 0 6px' }}>
            Study Complete & Results Saved
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Thank you for participating. Your trial choices, response times, and gaze tracking have been recorded.
          </p>
        </div>

        <div
          style={{
            textAlign: 'left',
            background: 'var(--sunken)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            padding: '16px'
          }}
        >
          <div className="eyebrow" style={{ marginBottom: '8px' }}>Session overview</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.88rem' }}>
            <div>Participant: <b>{session.id}</b></div>
            <div>Accuracy: <b>{accPct}% ({correctCount}/{n})</b></div>
            <div>Mean Time: <b>{meanTimeS}s</b></div>
            <div>Eye-Tracking: <b>{session.eyeTracking ? 'Active' : 'Mouse Fallback'}</b></div>
          </div>
        </div>

        <div className="edge" style={{ justifyContent: 'center', gap: '12px' }}>
          <button
            type="button"
            className="ibtn primary"
            onClick={handleDownloadTxt}
            style={{ height: '38px', borderRadius: '10px', padding: '0 16px', fontWeight: 600 }}
          >
            <Icon name="i-download" />
            <span>Download results.txt</span>
          </button>
          <button
            type="button"
            className="ibtn"
            onClick={handleDownloadJson}
            style={{ height: '38px', borderRadius: '10px', padding: '0 16px', fontWeight: 500 }}
          >
            <Icon name="i-code" />
            <span>Download JSON</span>
          </button>
        </div>

        <div className="edge" style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', justifyContent: 'center', gap: '12px' }}>
          <button
            type="button"
            className="ibtn"
            onClick={onNewSession}
            style={{ height: '36px', borderRadius: '8px', padding: '0 14px' }}
          >
            <Icon name="i-home" />
            <span>New Session</span>
          </button>
          <button
            type="button"
            className="ibtn"
            onClick={onOpenResearcher}
            style={{ height: '36px', borderRadius: '8px', padding: '0 14px' }}
          >
            <Icon name="i-chart" />
            <span>Researcher Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
