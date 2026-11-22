import React, { useState } from 'react';
import { ExperimentSession, TrialData } from '../../core/storage/types';
import { GazeJourneyTracker } from '../../core/gaze/journey-tracker';
import { GazeJourneyEvent } from '../../core/gaze/journey-types';
import { AOI_COLOR_MAP } from '../../core/gaze/aoi-engine';
import { Icon } from '../../components/common/Icon';
import { Modal } from '../../components/common/Modal';

interface HintTimelineSectionProps {
  sessions: ExperimentSession[];
  selectedSessionId: string;
  selectedPuzzleId: number | 'all';
  selectedHintId: number | 'all';
  onSelectSession: (id: string) => void;
  onSelectPuzzle: (id: number | 'all') => void;
  onSelectHint: (id: number | 'all') => void;
}

export const HintTimelineSection: React.FC<HintTimelineSectionProps> = ({
  sessions,
  selectedSessionId,
  selectedPuzzleId,
  selectedHintId,
  onSelectSession,
  onSelectPuzzle,
  onSelectHint
}) => {
  const [inspectedEvent, setInspectedEvent] = useState<GazeJourneyEvent | null>(null);

  const currentSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];
  const trials = currentSession?.trials || [];

  // Filter trial
  const selectedTrial: TrialData | undefined = selectedPuzzleId === 'all'
    ? trials[0]
    : trials.find((t) => (t.problemIdx + 1) === Number(selectedPuzzleId)) || trials[0];

  const { events, hintJourneys } = selectedTrial
    ? GazeJourneyTracker.reconstructFromTrial(selectedTrial, currentSession?.id || '', currentSession?.id || '')
    : { events: [], hintJourneys: [] };

  // Filter events by hint if selected
  let displayedEvents = events;
  if (selectedHintId !== 'all') {
    const hintNum = Number(selectedHintId);
    // Include events where hint_id matches or transitions occurring after hint_clicked
    const hintClickEv = events.find((e) => e.event_type === 'hint_clicked' && e.hint_id === hintNum);
    if (hintClickEv) {
      displayedEvents = events.filter(
        (e) => (e.hint_id === hintNum || (e.elapsed_time >= hintClickEv.elapsed_time))
      );
    } else {
      displayedEvents = events.filter((e) => e.hint_id === hintNum);
    }
  }

  const activeHintJourney = hintJourneys.find((hj) => hj.hint_id === Number(selectedHintId)) || hintJourneys[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Filter Toolbar */}
      <div
        className="edge"
        style={{
          background: 'var(--sunken)',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid var(--line)',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
              Participant Session
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => onSelectSession(e.target.value)}
              className="ibtn tb"
              style={{ height: '34px', minWidth: '150px', background: 'var(--panel)', padding: '0 10px' }}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} ({s.trials.length} trials)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
              Puzzle Problem
            </label>
            <select
              value={selectedPuzzleId}
              onChange={(e) => onSelectPuzzle(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="ibtn tb"
              style={{ height: '34px', minWidth: '140px', background: 'var(--panel)', padding: '0 10px' }}
            >
              <option value="all">All / First Trial</option>
              {trials.map((t, idx) => (
                <option key={idx} value={t.problemIdx + 1}>
                  Puzzle {t.problemIdx + 1} ({t.condition})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
              Hint Interaction Focus
            </label>
            <select
              value={selectedHintId}
              onChange={(e) => onSelectHint(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="ibtn tb"
              style={{ height: '34px', minWidth: '160px', background: 'var(--panel)', padding: '0 10px' }}
            >
              <option value="all">Entire Trial Timeline</option>
              {hintJourneys.map((hj) => (
                <option key={hj.hint_id} value={hj.hint_id}>
                  {hj.hint_name || `Clue ${hj.hint_id}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedTrial && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="pill"
              style={{
                background: selectedTrial.correct ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: selectedTrial.correct ? '#22c55e' : '#ef4444',
                borderColor: selectedTrial.correct ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
              }}
            >
              <Icon name={selectedTrial.correct ? 'i-check' : 'i-target'} size="sm" />
              <span>{selectedTrial.correct ? 'Correct Answer' : 'Incorrect Choice'}</span>
            </span>
            <span className="pill">
              <span>Time: {(selectedTrial.timeMs / 1000).toFixed(1)}s</span>
            </span>
          </div>
        )}
      </div>

      {/* Hint Journey Summary Highlights */}
      {activeHintJourney && selectedHintId !== 'all' && (
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}
        >
          <div>
            <div className="eyebrow" style={{ margin: 0 }}>Active Clue</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#22c55e', marginTop: '2px' }}>
              {activeHintJourney.hint_name}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ margin: 0 }}>First Fixation Latency</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--fg)', marginTop: '2px' }}>
              {activeHintJourney.firstFixationLatencyMs !== null ? `${activeHintJourney.firstFixationLatencyMs}ms` : 'Immediate'}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ margin: 0 }}>Returns to Clue</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a855f7', marginTop: '2px' }}>
              {activeHintJourney.returnsToHintCount} return(s)
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ margin: 0 }}>Time to Answer Choice</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--fg)', marginTop: '2px' }}>
              {activeHintJourney.timeToAnswerMs !== null ? `${(activeHintJourney.timeToAnswerMs / 1000).toFixed(1)}s` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Chronological Sequence of Visited Regions */}
      <div className="panel" style={{ padding: '20px' }}>
        <div className="edge" style={{ marginBottom: '16px' }}>
          <div>
            <div className="eyebrow">Visual Attention Path</div>
            <h3 className="ptitle" style={{ margin: 0 }}>
              Chronological Journey Timeline
            </h3>
          </div>
          <span className="meta">
            Showing {displayedEvents.length} sequential event(s) · Click any step to inspect
          </span>
        </div>

        {displayedEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--muted)' }}>
            No journey events recorded for the selected filter combination.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            {displayedEvents.map((ev, index) => {
              const info = AOI_COLOR_MAP[ev.region_id] || { color: '#94a3b8', name: ev.region_name || ev.region_id };
              const isHintClick = ev.event_type === 'hint_clicked';
              const isAnsView = ev.event_type === 'answer_option_viewed';
              const isAnsSel = ev.event_type === 'answer_selected';
              const isComplete = ev.event_type === 'puzzle_completed';
              const isTransition = ev.event_type === 'gaze_transition';

              const dwellStr = ev.dwell_duration_ms ? `${ev.dwell_duration_ms}ms` : '—';
              const timeSinceHint = ev.time_since_hint_click_ms !== null && ev.time_since_hint_click_ms !== undefined
                ? `+${ev.time_since_hint_click_ms}ms`
                : null;

              return (
                <div
                  key={ev.id || index}
                  onClick={() => setInspectedEvent(ev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: isHintClick
                      ? 'rgba(34, 197, 94, 0.08)'
                      : isAnsSel
                      ? 'rgba(168, 85, 247, 0.12)'
                      : 'var(--sunken)',
                    border: `1px solid ${
                      isHintClick
                        ? 'rgba(34, 197, 94, 0.35)'
                        : isAnsSel
                        ? 'rgba(168, 85, 247, 0.4)'
                        : 'var(--line)'
                    }`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = isHintClick ? 'rgba(34, 197, 94, 0.35)' : isAnsSel ? 'rgba(168, 85, 247, 0.4)' : 'var(--line)')}
                >
                  {/* Sequence Badge */}
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid var(--line)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--muted)',
                      flex: 'none'
                    }}
                  >
                    {index + 1}
                  </span>

                  {/* Flow Arrow if transition */}
                  {isTransition ? (
                    <span style={{ color: 'var(--faint)', fontSize: '0.85rem' }}>→</span>
                  ) : (
                    <span style={{ color: info.color, display: 'grid', placeItems: 'center' }}>
                      <Icon name={isHintClick ? 'i-bulb' : isAnsSel ? 'i-check' : 'i-eye'} size="sm" />
                    </span>
                  )}

                  {/* Region Badge & Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '170px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '3px',
                        background: info.color,
                        flex: 'none'
                      }}
                    />
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--fg)' }}>
                      {info.name}
                    </span>
                  </div>

                  {/* Event Type Badge */}
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: isHintClick
                        ? 'rgba(34, 197, 94, 0.2)'
                        : isAnsSel
                        ? 'rgba(168, 85, 247, 0.25)'
                        : isAnsView
                        ? 'rgba(168, 85, 247, 0.15)'
                        : 'rgba(255, 255, 255, 0.06)',
                      color: isHintClick ? '#22c55e' : isAnsSel ? '#c084fc' : isAnsView ? '#a855f7' : 'var(--muted)'
                    }}
                  >
                    {isHintClick
                      ? 'Hint Clicked'
                      : isAnsSel
                      ? 'Answer Selected'
                      : isAnsView
                      ? 'Option Viewed'
                      : isComplete
                      ? 'Trial Completed'
                      : 'Boundary Transition'}
                  </span>

                  {/* Dwell Duration */}
                  {ev.dwell_duration_ms !== undefined && ev.dwell_duration_ms > 0 && (
                    <span
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--muted)',
                        fontFamily: 'var(--f-mono)',
                        marginLeft: 'auto'
                      }}
                    >
                      Dwell: <b>{dwellStr}</b>
                    </span>
                  )}

                  {/* Time since hint click */}
                  {timeSinceHint && (
                    <span
                      style={{
                        fontSize: '0.74rem',
                        color: '#22c55e',
                        fontFamily: 'var(--f-mono)',
                        background: 'rgba(34, 197, 94, 0.08)',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      {timeSinceHint} after hint
                    </span>
                  )}

                  {/* Elapsed Trial Time */}
                  <span
                    style={{
                      fontSize: '0.76rem',
                      color: 'var(--faint)',
                      fontFamily: 'var(--f-mono)',
                      marginLeft: ev.dwell_duration_ms ? '8px' : 'auto'
                    }}
                  >
                    @ {(ev.elapsed_time / 1000).toFixed(2)}s
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Event Details Inspector Modal */}
      {inspectedEvent && (
        <Modal
          isOpen={Boolean(inspectedEvent)}
          onClose={() => setInspectedEvent(null)}
          title="Journey Event Inspector"
          eyebrow="Event telemetry details"
          width="560px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                background: 'var(--sunken)',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid var(--line)'
              }}
            >
              <div>
                <span className="eyebrow">Event Type</span>
                <div style={{ fontWeight: 600, color: 'var(--fg)', marginTop: '2px' }}>
                  {inspectedEvent.event_type}
                </div>
              </div>
              <div>
                <span className="eyebrow">Region Target</span>
                <div style={{ fontWeight: 600, color: AOI_COLOR_MAP[inspectedEvent.region_id]?.color || 'var(--fg)', marginTop: '2px' }}>
                  {AOI_COLOR_MAP[inspectedEvent.region_id]?.name || inspectedEvent.region_id}
                </div>
              </div>
              <div>
                <span className="eyebrow">Dwell Duration</span>
                <div style={{ fontWeight: 600, color: 'var(--fg)', marginTop: '2px' }}>
                  {inspectedEvent.dwell_duration_ms ? `${inspectedEvent.dwell_duration_ms} ms` : 'N/A'}
                </div>
              </div>
              <div>
                <span className="eyebrow">Time Since Hint Click</span>
                <div style={{ fontWeight: 600, color: '#22c55e', marginTop: '2px' }}>
                  {inspectedEvent.time_since_hint_click_ms !== null && inspectedEvent.time_since_hint_click_ms !== undefined
                    ? `${inspectedEvent.time_since_hint_click_ms} ms`
                    : 'N/A'}
                </div>
              </div>
              <div>
                <span className="eyebrow">Origin Region</span>
                <div style={{ color: 'var(--muted)', marginTop: '2px' }}>
                  {inspectedEvent.previous_region_id
                    ? AOI_COLOR_MAP[inspectedEvent.previous_region_id]?.name || inspectedEvent.previous_region_id
                    : 'Initial Entry'}
                </div>
              </div>
              <div>
                <span className="eyebrow">Elapsed In Trial</span>
                <div style={{ color: 'var(--muted)', marginTop: '2px' }}>
                  {(inspectedEvent.elapsed_time / 1000).toFixed(2)}s ({inspectedEvent.elapsed_time} ms)
                </div>
              </div>
            </div>

            {inspectedEvent.details && Object.keys(inspectedEvent.details).length > 0 && (
              <div
                style={{
                  background: 'var(--sunken)',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--line)'
                }}
              >
                <span className="eyebrow">Payload Details</span>
                <pre
                  style={{
                    margin: '6px 0 0',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--f-mono)',
                    color: 'var(--fg)',
                    overflowX: 'auto'
                  }}
                >
                  {JSON.stringify(inspectedEvent.details, null, 2)}
                </pre>
              </div>
            )}

            <div className="edge" style={{ justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                className="ibtn primary"
                onClick={() => setInspectedEvent(null)}
                style={{ height: '34px', padding: '0 16px', borderRadius: '8px' }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
