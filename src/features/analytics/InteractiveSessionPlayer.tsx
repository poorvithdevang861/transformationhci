import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ExperimentSession, TrialData } from '../../core/storage/types';
import { GazeJourneyTracker } from '../../core/gaze/journey-tracker';
import { AOI_COLOR_MAP } from '../../core/gaze/aoi-engine';
import { GazePoint, BoundaryRect } from '../../core/gaze/types';
import { Icon } from '../../components/common/Icon';

interface InteractiveSessionPlayerProps {
  sessions: ExperimentSession[];
  selectedSessionId: string;
  selectedPuzzleId: number | 'all';
  onSelectSession: (id: string) => void;
  onSelectPuzzle: (id: number | 'all') => void;
}

export const InteractiveSessionPlayer: React.FC<InteractiveSessionPlayerProps> = ({
  sessions,
  selectedSessionId,
  selectedPuzzleId,
  onSelectSession,
  onSelectPuzzle
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(performance.now());

  const currentSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];
  const trials = currentSession?.trials || [];

  const currentTrial: TrialData | undefined = selectedPuzzleId === 'all'
    ? trials[0]
    : trials.find((t) => (t.problemIdx + 1) === Number(selectedPuzzleId)) || trials[0];

  const totalDurationMs = currentTrial?.timeMs || 10000;

  // Reconstructed events and samples
  const { events } = useMemo(() => {
    if (!currentTrial) return { events: [] };
    return GazeJourneyTracker.reconstructFromTrial(currentTrial, currentSession?.id || '', currentSession?.id || '');
  }, [currentTrial, currentSession]);

  const samples: GazePoint[] = useMemo(() => {
    return currentTrial?.samples || [];
  }, [currentTrial]);

  // Boundaries matching interface
  const boundaries = useMemo<Record<string, BoundaryRect>>(() => {
    if (!currentTrial) return {};
    const raw = currentTrial.boundaries || {};
    const b = { ...raw };

    if (Object.keys(b).length === 0) {
      b['fig-A'] = { x: 30, y: 70, w: 105, h: 105, key: 'fig-A', name: 'Figure A', color: '#ff4055', tag: '[Red]' };
      b['fig-B'] = { x: 145, y: 70, w: 105, h: 105, key: 'fig-B', name: 'Figure B', color: '#3b82f6', tag: '[Blue]' };
      b['fig-C'] = { x: 260, y: 70, w: 105, h: 105, key: 'fig-C', name: 'Figure C', color: '#ff9800', tag: '[Orange]' };
      b['fig-D'] = { x: 375, y: 70, w: 105, h: 105, key: 'fig-D', name: 'Figure D (Target ?)', color: '#facc15', tag: '[Yellow]' };

      b['choose-d'] = { x: 25, y: 220, w: 460, h: 170, key: 'choose-d', name: 'Answer Choices Area', color: '#eab308', tag: '[Yellow]' };
      b['option-1'] = { x: 35, y: 255, w: 98, h: 110, key: 'option-1', name: 'Option 1', color: '#a855f7', tag: '[Purple]' };
      b['option-2'] = { x: 148, y: 255, w: 98, h: 110, key: 'option-2', name: 'Option 2', color: '#a855f7', tag: '[Purple]' };
      b['option-3'] = { x: 261, y: 255, w: 98, h: 110, key: 'option-3', name: 'Option 3', color: '#a855f7', tag: '[Purple]' };
      b['option-4'] = { x: 374, y: 255, w: 98, h: 110, key: 'option-4', name: 'Option 4', color: '#a855f7', tag: '[Purple]' };

      b['hint-panel'] = { x: 520, y: 30, w: 320, h: 360, key: 'hint-panel', name: 'Hint Panel', color: '#22c55e', tag: '[Green]' };
      b['hint-controls'] = { x: 535, y: 310, w: 290, h: 60, key: 'hint-controls', name: 'Hint Controls', color: '#10b981', tag: '[Teal]' };
    }

    return b;
  }, [currentTrial]);

  // Current gaze sample and active region at currentTimeMs
  const activeState = useMemo(() => {
    // Find closest gaze point
    let closestSample: GazePoint | null = null;
    if (samples.length > 0) {
      for (let i = 0; i < samples.length; i++) {
        if (samples[i].t <= currentTimeMs) {
          closestSample = samples[i];
        } else {
          break;
        }
      }
    }

    // Find active transition event up to currentTimeMs
    const pastTransitions = events.filter((e) => e.event_type === 'gaze_transition' && e.elapsed_time <= currentTimeMs);
    const lastTransition = pastTransitions.length > 0 ? pastTransitions[pastTransitions.length - 1] : null;

    const activeRegionId = lastTransition ? lastTransition.current_region_id || lastTransition.region_id : 'OUTSIDE_REGION';
    const activeRegionName = AOI_COLOR_MAP[activeRegionId]?.name || activeRegionId;
    const dwellElapsed = lastTransition ? Math.max(0, currentTimeMs - lastTransition.elapsed_time) : 0;

    // Check if any hint event occurred recently
    const pastHintEvents = events.filter((e) => e.event_type === 'hint_clicked' && e.elapsed_time <= currentTimeMs);
    const activeHintNum = pastHintEvents.length > 0 ? pastHintEvents[pastHintEvents.length - 1].hint_id : null;

    return {
      sample: closestSample,
      regionId: activeRegionId,
      regionName: activeRegionName,
      dwellMs: dwellElapsed,
      activeHintNum
    };
  }, [currentTimeMs, samples, events]);

  // Main playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    lastTickRef.current = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTickRef.current) * playbackSpeed;
      lastTickRef.current = now;

      setCurrentTimeMs((prev) => {
        const next = prev + dt;
        if (next >= totalDurationMs) {
          setIsPlaying(false);
          return totalDurationMs;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, playbackSpeed, totalDurationMs]);

  const handleRestart = () => {
    setCurrentTimeMs(0);
    setIsPlaying(true);
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTimeMs(Number(e.target.value));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Session / Puzzle Selector Toolbar */}
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
              style={{ height: '32px', minWidth: '150px', background: 'var(--panel)', padding: '0 8px' }}
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
              style={{ height: '32px', minWidth: '130px', background: 'var(--panel)', padding: '0 8px' }}
            >
              <option value="all">Trial 1 (Default)</option>
              {trials.map((t) => (
                <option key={t.idx} value={t.problemIdx + 1}>
                  Trial {t.idx} (Puzzle {t.problemIdx + 1})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real-time HUD Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              background: 'rgba(15, 17, 24, 0.95)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div>
              <span className="eyebrow" style={{ margin: 0, fontSize: '0.64rem' }}>Current Gaze Target</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: AOI_COLOR_MAP[activeState.regionId]?.color || '#94a3b8'
                  }}
                />
                <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--fg)' }}>
                  {activeState.regionName}
                </span>
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: '10px' }}>
              <span className="eyebrow" style={{ margin: 0, fontSize: '0.64rem' }}>Region Dwell</span>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#22c55e', marginTop: '2px' }}>
                {Math.round(activeState.dwellMs)}ms
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: '10px' }}>
              <span className="eyebrow" style={{ margin: 0, fontSize: '0.64rem' }}>Active Clue</span>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#a855f7', marginTop: '2px' }}>
                {activeState.activeHintNum ? `Clue ${activeState.activeHintNum}` : 'None'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Playback Arena */}
      <div className="panel" style={{ padding: '20px' }}>
        <div className="edge" style={{ marginBottom: '16px' }}>
          <div>
            <div className="eyebrow">Session Explorer & Gaze Playback</div>
            <h3 className="ptitle" style={{ margin: 0 }}>
              Live Journey Playback Simulator
            </h3>
          </div>
          <span className="meta" style={{ fontSize: '0.78rem', fontFamily: 'var(--f-mono)' }}>
            {(currentTimeMs / 1000).toFixed(2)}s / {(totalDurationMs / 1000).toFixed(2)}s
          </span>
        </div>

        {/* Playback Controls Bar */}
        <div
          style={{
            background: 'var(--sunken)',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '16px'
          }}
        >
          {/* Play / Pause */}
          <button
            type="button"
            className="ibtn tb primary"
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ width: '36px', height: '36px', padding: 0, borderRadius: '8px', justifyContent: 'center' }}
            title={isPlaying ? 'Pause playback' : 'Start playback'}
          >
            <Icon name={isPlaying ? 'i-pause' : 'i-play'} size="sm" />
          </button>

          {/* Restart */}
          <button
            type="button"
            className="ibtn tb"
            onClick={handleRestart}
            style={{ width: '36px', height: '36px', padding: 0, borderRadius: '8px', justifyContent: 'center' }}
            title="Restart from beginning"
          >
            <Icon name="i-replay" size="sm" />
          </button>

          {/* Scrubber Slider */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="range"
              min={0}
              max={totalDurationMs}
              value={currentTimeMs}
              onChange={handleScrub}
              style={{
                width: '100%',
                accentColor: 'var(--accent)',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Playback Speed Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {[0.5, 1, 1.5, 2].map((sp) => (
              <button
                key={sp}
                type="button"
                className={`ibtn tb ${playbackSpeed === sp ? 'active' : ''}`}
                onClick={() => setPlaybackSpeed(sp)}
                style={{
                  height: '28px',
                  padding: '0 8px',
                  fontSize: '0.74rem',
                  borderRadius: '6px',
                  background: playbackSpeed === sp ? 'var(--raised)' : undefined
                }}
              >
                {sp}×
              </button>
            ))}
          </div>
        </div>

        {/* Interface Visualizer with Synchronized Boundary Highlighting */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '460px',
            background: 'radial-gradient(ellipse at 50% 50%, #151824 0%, #0a0b10 100%)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
        >
          {/* Render All Registered Boundaries on Interface Canvas */}
          {Object.values(boundaries).map((b) => {
            const normKey = b.key.replace(/-([a-zA-Z0-9])/g, (_, ch) => ch.toUpperCase());
            const isActive = activeState.regionId === normKey || activeState.regionId === b.key || (activeState.regionId === 'hints' && b.key.includes('hint'));

            return (
              <div
                key={b.key}
                style={{
                  position: 'absolute',
                  left: `${b.x}px`,
                  top: `${b.y}px`,
                  width: `${b.w}px`,
                  height: `${b.h}px`,
                  borderRadius: '8px',
                  border: isActive ? `2px solid ${b.color}` : '1px dashed rgba(255, 255, 255, 0.12)',
                  background: isActive ? `${b.color}24` : 'rgba(255, 255, 255, 0.02)',
                  boxShadow: isActive ? `0 0 20px ${b.color}40, inset 0 0 12px ${b.color}20` : 'none',
                  transition: 'all 0.15s ease',
                  pointerEvents: 'none',
                  zIndex: isActive ? 5 : 2
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-18px',
                    left: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: isActive ? b.color : 'rgba(255, 255, 255, 0.35)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  {b.name}
                </div>
              </div>
            );
          })}

          {/* Animated Eye-Gaze Cursor Dot */}
          {activeState.sample && (
            <div
              style={{
                position: 'absolute',
                left: `${activeState.sample.x}px`,
                top: `${activeState.sample.y}px`,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.85)',
                border: '2px solid #fff',
                boxShadow: '0 0 16px rgba(239, 68, 68, 0.9)',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 20,
                transition: 'left 0.05s ease-out, top 0.05s ease-out'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: '-6px',
                  borderRadius: '50%',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  animation: 'pulse 1.5s infinite'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
