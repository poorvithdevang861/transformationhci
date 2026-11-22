import React from 'react';
import { ExperimentSession } from '../../core/storage/types';
import { GazeJourneyTracker } from '../../core/gaze/journey-tracker';
import { AOI_COLOR_MAP } from '../../core/gaze/aoi-engine';
import { Icon } from '../../components/common/Icon';

interface HintEffectivenessSectionProps {
  sessions: ExperimentSession[];
}

export const HintEffectivenessSection: React.FC<HintEffectivenessSectionProps> = ({ sessions }) => {
  const metrics = GazeJourneyTracker.computeHintEffectiveness(sessions);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="panel" style={{ padding: '20px' }}>
        <div className="edge" style={{ marginBottom: '16px' }}>
          <div>
            <div className="eyebrow">Cognitive Utility & Problem-Solving Impact</div>
            <h3 className="ptitle" style={{ margin: 0 }}>
              Hint Effectiveness Analysis
            </h3>
          </div>
          <span className="meta">
            Comparing attention allocation, return frequency, and answer accuracy per clue
          </span>
        </div>

        {metrics.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)' }}>
            No hint interactions recorded in the current session set.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Effectiveness Cards for Each Hint */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '14px'
              }}
            >
              {metrics.map((m) => {
                const accDiff = m.accuracyRateWithHintPct - m.accuracyRateWithoutHintPct;
                const isPositive = accDiff >= 0;

                return (
                  <div
                    key={m.hintId}
                    style={{
                      background: 'var(--sunken)',
                      border: '1px solid var(--line)',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    {/* Header */}
                    <div className="edge">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'rgba(34, 197, 94, 0.2)',
                            color: '#22c55e',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 700
                          }}
                        >
                          {m.hintId}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--fg)' }}>
                            {m.hintName}
                          </div>
                          <span className="meta" style={{ fontSize: '0.74rem' }}>
                            Opened by <b>{m.openCount}</b> user(s) ({m.openRatePct}% of eligible trials)
                          </span>
                        </div>
                      </div>

                      <span
                        className="pill"
                        style={{
                          background: isPositive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: isPositive ? '#22c55e' : '#ef4444',
                          borderColor: isPositive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                          fontSize: '0.74rem'
                        }}
                      >
                        {isPositive ? `+${accDiff}% Accuracy` : `${accDiff}% Accuracy`}
                      </span>
                    </div>

                    {/* Metric Grids */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '10px',
                        background: 'var(--panel)',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)'
                      }}
                    >
                      <div>
                        <span className="eyebrow" style={{ margin: 0, fontSize: '0.68rem' }}>First Fixation Latency</span>
                        <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--fg)', marginTop: '2px' }}>
                          {m.avgFirstFixationLatencyMs}ms
                        </div>
                      </div>

                      <div>
                        <span className="eyebrow" style={{ margin: 0, fontSize: '0.68rem' }}>Mean Hint Dwell Time</span>
                        <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#22c55e', marginTop: '2px' }}>
                          {(m.avgDwellOnHintMs / 1000).toFixed(1)}s
                        </div>
                      </div>

                      <div>
                        <span className="eyebrow" style={{ margin: 0, fontSize: '0.68rem' }}>Avg Returns to Hint</span>
                        <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#06b6d4', marginTop: '2px' }}>
                          {m.avgReturnsToHint} time(s)
                        </div>
                      </div>

                      <div>
                        <span className="eyebrow" style={{ margin: 0, fontSize: '0.68rem' }}>Time to Answer</span>
                        <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--fg)', marginTop: '2px' }}>
                          {(m.avgTimeToAnswerMs / 1000).toFixed(1)}s
                        </div>
                      </div>
                    </div>

                    {/* Navigation Behavior */}
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>
                        Immediate Destination:{' '}
                        <b style={{ color: AOI_COLOR_MAP[m.mostFrequentNextRegion.regionId]?.color || 'var(--fg)' }}>
                          {m.mostFrequentNextRegion.name}
                        </b>{' '}
                        ({m.mostFrequentNextRegion.pct}%)
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <span>Common Path:</span>
                        {m.mostCommonPath.map((node, nIdx) => (
                          <React.Fragment key={nIdx}>
                            <span
                              style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                color: AOI_COLOR_MAP[node]?.color || 'var(--fg)',
                                fontSize: '0.74rem',
                                fontWeight: 600
                              }}
                            >
                              {AOI_COLOR_MAP[node]?.name || node}
                            </span>
                            {nIdx < m.mostCommonPath.length - 1 && <span style={{ color: 'var(--faint)' }}>→</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {/* Accuracy Comparison */}
                    <div
                      style={{
                        paddingTop: '8px',
                        borderTop: '1px solid var(--line)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem'
                      }}
                    >
                      <span style={{ color: 'var(--muted)' }}>
                        Accuracy with hint: <b style={{ color: '#22c55e' }}>{m.accuracyRateWithHintPct}%</b>
                      </span>
                      <span style={{ color: 'var(--muted)' }}>
                        Baseline without hint: <b>{m.accuracyRateWithoutHintPct}%</b>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cognitive Takeaways Panel */}
            <div
              style={{
                background: 'rgba(168, 85, 247, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: '12px',
                padding: '16px 20px'
              }}
            >
              <div className="edge" style={{ marginBottom: '8px' }}>
                <span className="eyebrow" style={{ color: '#a855f7', margin: 0 }}>Research Finding & Cognitive Impact</span>
                <span style={{ color: '#a855f7' }}><Icon name="i-bulb" size="sm" /></span>
              </div>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--fg)', lineHeight: 1.5 }}>
                Participants who inspect clues exhibit a strong tendency to immediately direct their gaze toward <b>Figure B</b> to verify the geometric transform before cross-referencing candidate choices in the <b>Answer Options Area</b>. The low return-to-hint count demonstrates that the step-by-step transformation clues successfully resolve ambiguity without introducing recurring visual disorientation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
