import React from 'react';
import { ExperimentSession } from '../../core/storage/types';
import { GazeJourneyTracker } from '../../core/gaze/journey-tracker';
import { Icon } from '../../components/common/Icon';

interface SessionOverviewSectionProps {
  sessions: ExperimentSession[];
  isSampleData: boolean;
}

export const SessionOverviewSection: React.FC<SessionOverviewSectionProps> = ({ sessions, isSampleData }) => {
  // Aggregate KPI metrics
  const totalParticipants = new Set(sessions.map((s) => s.id)).size;
  const totalSessions = sessions.length;

  let totalHintInteractions = 0;
  let totalHintDwellMs = 0;
  let hintDwellCount = 0;
  let totalTransitions = 0;
  let totalAnswerTimeMs = 0;
  let totalTrials = 0;
  let correctCount = 0;

  sessions.forEach((s) => {
    s.trials.forEach((t) => {
      totalTrials += 1;
      if (t.correct) correctCount += 1;
      totalAnswerTimeMs += t.timeMs || 0;

      const { events, hintJourneys } = GazeJourneyTracker.reconstructFromTrial(t, s.id, s.id);
      totalHintInteractions += hintJourneys.length;
      hintJourneys.forEach((hj) => {
        if (hj.dwellTimeOnHintMs > 0) {
          totalHintDwellMs += hj.dwellTimeOnHintMs;
          hintDwellCount += 1;
        }
      });

      const trEvents = events.filter((e) => e.event_type === 'gaze_transition');
      totalTransitions += trEvents.length;
    });
  });

  const avgHintDwellSec = hintDwellCount > 0 ? (totalHintDwellMs / hintDwellCount / 1000).toFixed(1) : '0.0';
  const avgTransitionsPerTrial = totalTrials > 0 ? (totalTransitions / totalTrials).toFixed(1) : '0';
  const avgAnswerTimeSec = totalTrials > 0 ? (totalAnswerTimeMs / totalTrials / 1000).toFixed(1) : '0.0';
  const accuracyPct = totalTrials > 0 ? Math.round((correctCount / totalTrials) * 100) : 0;
  const incorrectCount = totalTrials - correctCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {isSampleData && (
        <div
          style={{
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '10px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                background: '#a855f7',
                color: '#fff',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase'
              }}
            >
              Demo Dataset
            </span>
            <span style={{ fontSize: '0.86rem', color: 'var(--fg)' }}>
              Viewing isolated sample journey data with rich eye-gaze and hint transitions.
            </span>
          </div>
          <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
            Real recorded trials will automatically appear here once completed.
          </span>
        </div>
      )}

      {/* Grid of 7 core KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px'
        }}
      >
        <div className="panel" style={{ padding: '16px' }}>
          <div className="edge" style={{ marginBottom: '8px' }}>
            <span className="eyebrow" style={{ margin: 0 }}>Participants</span>
            <span style={{ color: '#a855f7' }}><Icon name="i-user" size="sm" /></span>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--ink)' }}>{totalParticipants}</div>
          <div className="meta" style={{ fontSize: '0.76rem', marginTop: '4px' }}>Across {totalSessions} study session(s)</div>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <div className="edge" style={{ marginBottom: '8px' }}>
            <span className="eyebrow" style={{ margin: 0 }}>Hint Interactions</span>
            <span style={{ color: '#22c55e' }}><Icon name="i-bulb" size="sm" /></span>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--ink)' }}>{totalHintInteractions}</div>
          <div className="meta" style={{ fontSize: '0.76rem', marginTop: '4px' }}>Recorded clue interactions</div>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <div className="edge" style={{ marginBottom: '8px' }}>
            <span className="eyebrow" style={{ margin: 0 }}>Avg Hint Dwell Time</span>
            <span style={{ color: '#06b6d4' }}><Icon name="i-timer" size="sm" /></span>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--ink)' }}>{avgHintDwellSec}s</div>
          <div className="meta" style={{ fontSize: '0.76rem', marginTop: '4px' }}>Mean attention on hints</div>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <div className="edge" style={{ marginBottom: '8px' }}>
            <span className="eyebrow" style={{ margin: 0 }}>Avg Boundary Transitions</span>
            <span style={{ color: '#f59e0b' }}><Icon name="i-layers" size="sm" /></span>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--ink)' }}>{avgTransitionsPerTrial}</div>
          <div className="meta" style={{ fontSize: '0.76rem', marginTop: '4px' }}>Region switches per puzzle</div>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <div className="edge" style={{ marginBottom: '8px' }}>
            <span className="eyebrow" style={{ margin: 0 }}>Avg Time to Answer</span>
            <span style={{ color: '#8b5cf6' }}><Icon name="i-timer" size="sm" /></span>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--ink)' }}>{avgAnswerTimeSec}s</div>
          <div className="meta" style={{ fontSize: '0.76rem', marginTop: '4px' }}>From start to confirmation</div>
        </div>

        <div className="panel" style={{ padding: '16px', gridColumn: 'span 2' }}>
          <div className="edge" style={{ marginBottom: '8px' }}>
            <span className="eyebrow" style={{ margin: 0 }}>Accuracy (Correct vs Incorrect)</span>
            <span style={{ color: accuracyPct >= 70 ? '#22c55e' : '#f59e0b' }}>
              <Icon name="i-check" size="sm" />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--ink)' }}>{accuracyPct}%</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              <b>{correctCount}</b> correct · <b>{incorrectCount}</b> incorrect
            </span>
          </div>
          {/* Progress bar */}
          <div
            style={{
              height: '8px',
              borderRadius: '999px',
              background: 'rgba(239, 68, 68, 0.4)',
              overflow: 'hidden',
              marginTop: '10px',
              display: 'flex'
            }}
          >
            <div
              style={{
                width: `${accuracyPct}%`,
                background: 'linear-gradient(90deg, #22c55e, #10b981)',
                borderRadius: '999px',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
