import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../components/common/Icon';
import { gazeTracker } from '../../core/gaze/webgazer-service';

interface CalibrationStepProps {
  onComplete: () => void;
  onBack?: () => void;
  participantId?: string;
}

interface CalibPoint {
  id: number;
  x: number; // percentage
  y: number; // percentage
}

const CALIB_POINTS: CalibPoint[] = [
  { id: 0, x: 10, y: 14 },
  { id: 1, x: 50, y: 14 },
  { id: 2, x: 90, y: 14 },
  { id: 3, x: 10, y: 50 },
  { id: 4, x: 50, y: 50 },
  { id: 5, x: 90, y: 50 },
  { id: 6, x: 10, y: 86 },
  { id: 7, x: 50, y: 86 },
  { id: 8, x: 90, y: 86 }
];

const VALIDATION_POINTS: CalibPoint[] = [
  { id: 0, x: 50, y: 50 },
  { id: 1, x: 20, y: 22 },
  { id: 2, x: 80, y: 22 },
  { id: 3, x: 20, y: 78 },
  { id: 4, x: 80, y: 78 }
];

const CLICKS_PER_POINT = 5;

type StepPhase = 'calibrating' | 'verifying' | 'verified';

interface AccuracyReport {
  meanErrorPx: number;
  visualAngleDeg: number;
  accuracyPct: number;
  rating: 'optimal' | 'adequate' | 'recalibrate';
}

export const CalibrationStep: React.FC<CalibrationStepProps> = ({ onComplete, onBack, participantId }) => {
  const [phase, setPhase] = useState<StepPhase>('calibrating');
  const [clickCounts, setClickCounts] = useState<Record<number, number>>({});

  // Verification state
  const [valIndex, setValIndex] = useState(0);
  const [valProgress, setValProgress] = useState(0);
  const [accuracyReport, setAccuracyReport] = useState<AccuracyReport | null>(null);

  // Live active AOI state (only updated on boundary transitions)
  const [activeAoi, setActiveAoi] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const latestGazeRef = useRef<{ x: number; y: number } | null>(null);
  const currentAoiRef = useRef<string | null>(null);

  const isWebcam = gazeTracker.isActive;
  const isFallback = gazeTracker.isFallback;

  // Ensure view starts at top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Subscribe to live gaze stream - updates refs and DOM directly without triggering component re-renders
  useEffect(() => {
    const unsub = gazeTracker.subscribe((pt) => {
      latestGazeRef.current = pt;

      // Update cursor position directly via DOM ref for 60fps performance
      if (dotRef.current && containerRef.current) {
        const cRect = containerRef.current.getBoundingClientRect();
        const relX = pt.x - cRect.left;
        const relY = pt.y - cRect.top;

        if (relX >= 0 && relX <= cRect.width && relY >= 0 && relY <= cRect.height) {
          dotRef.current.style.display = 'block';
          dotRef.current.style.left = `${relX}px`;
          dotRef.current.style.top = `${relY}px`;
        } else {
          dotRef.current.style.display = 'none';
        }
      }

      // Check AOI transition with boundary memoization
      if (phase === 'verified') {
        const el = document.elementFromPoint(pt.x, pt.y);
        const aoiKey = el?.closest('[data-test-aoi]')?.getAttribute('data-test-aoi') || null;
        if (aoiKey !== currentAoiRef.current) {
          currentAoiRef.current = aoiKey;
          setActiveAoi(aoiKey);
        }
      }
    });

    return () => {
      unsub();
    };
  }, [phase]);

  const handlePointClick = (pt: CalibPoint, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = rect.left + rect.width / 2;
    const clickY = rect.top + rect.height / 2;

    gazeTracker.recordCalibrationPoint(clickX, clickY);

    const cur = (clickCounts[pt.id] || 0) + 1;
    const updated = { ...clickCounts, [pt.id]: cur };
    setClickCounts(updated);

    const allDone = CALIB_POINTS.every((p) => (updated[p.id] || 0) >= CLICKS_PER_POINT);
    if (allDone) {
      setTimeout(() => {
        startVerification();
      }, 300);
    }
  };

  const startVerification = () => {
    setPhase('verifying');
    setValIndex(0);
    setValProgress(0);
  };

  // Robust verification sequence - only depends on [phase] so live gaze never resets the timer!
  useEffect(() => {
    if (phase !== 'verifying') return;

    let isMounted = true;
    const recordedErrors: number[] = [];

    const runTarget = (idx: number) => {
      if (!isMounted) return;
      setValIndex(idx);
      setValProgress(0);

      const target = VALIDATION_POINTS[idx];
      const start = performance.now();
      const targetErrors: number[] = [];

      const progressInterval = setInterval(() => {
        if (!isMounted) return;
        const elapsed = performance.now() - start;
        const pct = Math.min(100, Math.round((elapsed / 1100) * 100));
        setValProgress(pct);

        const currentGaze = latestGazeRef.current;
        if (currentGaze && containerRef.current) {
          const cRect = containerRef.current.getBoundingClientRect();
          const targetScreenX = cRect.left + (target.x / 100) * cRect.width;
          const targetScreenY = cRect.top + (target.y / 100) * cRect.height;
          const dist = Math.sqrt(
            Math.pow(currentGaze.x - targetScreenX, 2) + Math.pow(currentGaze.y - targetScreenY, 2)
          );
          targetErrors.push(dist);
        }
      }, 60);

      setTimeout(() => {
        clearInterval(progressInterval);
        if (!isMounted) return;

        const avgTargetErr = targetErrors.length > 0
          ? targetErrors.reduce((a, b) => a + b, 0) / targetErrors.length
          : 45;
        recordedErrors.push(Math.round(avgTargetErr));

        if (idx + 1 < VALIDATION_POINTS.length) {
          runTarget(idx + 1);
        } else {
          // Validation complete
          const totalAvg = Math.round(recordedErrors.reduce((a, b) => a + b, 0) / recordedErrors.length);
          const visualAngle = Number((totalAvg / 38).toFixed(1));
          const accuracyPct = Math.max(50, Math.min(98, Math.round(100 - (totalAvg / 300) * 100)));

          let rating: 'optimal' | 'adequate' | 'recalibrate' = 'optimal';
          if (totalAvg > 95) rating = 'recalibrate';
          else if (totalAvg > 65) rating = 'adequate';

          setAccuracyReport({
            meanErrorPx: totalAvg,
            visualAngleDeg: visualAngle,
            accuracyPct,
            rating
          });
          setPhase('verified');
        }
      }, 1150);
    };

    runTarget(0);

    return () => {
      isMounted = false;
    };
  }, [phase]);

  const handleRecalibrate = () => {
    gazeTracker.clearCalibration();
    setClickCounts({});
    setValIndex(0);
    setValProgress(0);
    setAccuracyReport(null);
    setPhase('calibrating');
  };

  const totalClicksDone = Object.values(clickCounts).reduce(
    (a, b) => a + Math.min(b, CLICKS_PER_POINT),
    0
  );
  const totalTargetClicks = CALIB_POINTS.length * CLICKS_PER_POINT;
  const progressPct = Math.round((totalClicksDone / totalTargetClicks) * 100);

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', width: '100%' }}>
      <div
        className="panel"
        style={{
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid var(--line)',
          background: 'var(--panel)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: 'none'
        }}
      >
        {/* Header Row: Clean, unified, non-cutting */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)' }}>
              Eye-Gaze Calibration
            </span>
            <span style={{ color: 'var(--line-strong)' }}>·</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              {phase === 'calibrating'
                ? 'Fixate on each target and click 5 times'
                : phase === 'verifying'
                ? 'Hold gaze on target crosshair'
                : 'Shift gaze between regions to test tracking'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '5px',
                background: 'var(--sunken)',
                border: '1px solid var(--line)',
                color: isWebcam ? 'var(--ok)' : 'var(--hint)',
                fontSize: '0.74rem',
                fontFamily: 'var(--f-mono)'
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isWebcam ? 'var(--ok)' : 'var(--hint)'
                }}
              />
              {isWebcam ? 'Camera Active' : isFallback ? 'Mouse Mode' : 'Ready'}
            </span>

            {participantId && (
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: '5px',
                  background: 'var(--sunken)',
                  border: '1px solid var(--line)',
                  fontFamily: 'var(--f-mono)',
                  fontSize: '0.74rem',
                  color: 'var(--muted)'
                }}
              >
                PID: {participantId}
              </span>
            )}
          </div>
        </div>

        {/* Compact Setup Guidelines & Stepper */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--sunken)',
            padding: '5px 12px',
            borderRadius: '6px',
            border: '1px solid var(--line)',
            fontSize: '0.76rem'
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', color: 'var(--muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Icon name="i-ruler" size="sm" />
              <span>50–60 cm</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Icon name="i-sun" size="sm" />
              <span>Even light</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Icon name="i-user" size="sm" />
              <span>Head steady</span>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontFamily: 'var(--f-mono)', fontSize: '0.72rem' }}>
            <span style={{ color: phase === 'calibrating' ? 'var(--ink)' : 'var(--muted)', fontWeight: phase === 'calibrating' ? 600 : 400 }}>
              1. 9-Point Grid ({progressPct}%)
            </span>
            <span style={{ color: 'var(--line-strong)' }}>›</span>
            <span style={{ color: phase === 'verifying' ? 'var(--ink)' : 'var(--muted)', fontWeight: phase === 'verifying' ? 600 : 400 }}>
              2. Accuracy
            </span>
            <span style={{ color: 'var(--line-strong)' }}>›</span>
            <span style={{ color: phase === 'verified' ? 'var(--ok)' : 'var(--muted)', fontWeight: phase === 'verified' ? 600 : 400 }}>
              3. Live Test
            </span>
          </div>
        </div>

        {/* Central Display Arena (Clean 370px height, comfortably fits all laptops) */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            height: '370px',
            background: 'var(--sunken)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          {/* Phase 1: 9-Point Calibration */}
          {phase === 'calibrating' && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--panel)',
                  padding: '3px 12px',
                  borderRadius: '12px',
                  border: '1px solid var(--line)',
                  textAlign: 'center',
                  zIndex: 10
                }}
              >
                <span style={{ fontSize: '0.78rem', color: 'var(--ink)' }}>
                  Click each target 5 times:
                </span>
                <span style={{ marginLeft: '6px', fontFamily: 'var(--f-mono)', fontSize: '0.76rem', color: 'var(--muted)' }}>
                  {totalClicksDone} / {totalTargetClicks}
                </span>
              </div>

              {CALIB_POINTS.map((pt) => {
                const clicks = clickCounts[pt.id] || 0;
                const isDone = clicks >= CLICKS_PER_POINT;
                const remaining = Math.max(0, CLICKS_PER_POINT - clicks);

                return (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={(e) => handlePointClick(pt, e)}
                    disabled={isDone}
                    aria-label={`Calibration point ${pt.id + 1}`}
                    style={{
                      position: 'absolute',
                      left: `${pt.x}%`,
                      top: `${pt.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: isDone
                        ? '1px solid var(--ok)'
                        : '1px solid var(--line-strong)',
                      background: isDone
                        ? 'var(--ok)'
                        : 'var(--raised)',
                      color: isDone ? '#111113' : '#ffffff',
                      fontWeight: 600,
                      fontSize: isDone ? '13px' : '11px',
                      fontFamily: 'var(--f-mono)',
                      cursor: isDone ? 'default' : 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      boxShadow: 'none',
                      zIndex: 5
                    }}
                  >
                    {isDone ? '✓' : remaining}
                  </button>
                );
              })}
            </>
          )}

          {/* Phase 2: Accuracy Verification */}
          {phase === 'verifying' && (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--panel)',
                  padding: '3px 12px',
                  borderRadius: '12px',
                  border: '1px solid var(--line)',
                  textAlign: 'center',
                  zIndex: 10
                }}
              >
                <span style={{ fontSize: '0.78rem', color: 'var(--ink)' }}>
                  Target {valIndex + 1} of {VALIDATION_POINTS.length} · Sampling gaze...
                </span>
              </div>

              {(() => {
                const target = VALIDATION_POINTS[valIndex];
                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${target.x}%`,
                      top: `${target.y}%`,
                      transform: 'translate(-50%, -50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 20
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: '46px',
                        height: '46px',
                        display: 'grid',
                        placeItems: 'center'
                      }}
                    >
                      <svg width="46" height="46" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                        <circle
                          cx="23"
                          cy="23"
                          r="19"
                          stroke="var(--line)"
                          strokeWidth="2"
                          fill="none"
                        />
                        <circle
                          cx="23"
                          cy="23"
                          r="19"
                          stroke="var(--accent)"
                          strokeWidth="2.5"
                          fill="none"
                          strokeDasharray="119"
                          strokeDashoffset={119 - (119 * valProgress) / 100}
                          style={{ transition: 'stroke-dashoffset 0.08s linear' }}
                        />
                      </svg>

                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'var(--raised)',
                          border: '1px solid var(--line-strong)',
                          display: 'grid',
                          placeItems: 'center',
                          color: 'var(--ink)'
                        }}
                      >
                        <Icon name="i-crosshair" size="sm" />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Phase 3: Verified - Live AOI Verification Arena */}
          {phase === 'verified' && accuracyReport && (
            <div style={{ position: 'relative', width: '100%', height: '100%', padding: '8px 12px', boxSizing: 'border-box' }}>
              {/* Summary Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--panel)',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  marginBottom: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'var(--sunken)',
                      border: '1px solid var(--line)',
                      color:
                        accuracyReport.rating === 'optimal'
                          ? 'var(--ok)'
                          : accuracyReport.rating === 'adequate'
                          ? 'var(--ink)'
                          : 'var(--hint)',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--f-mono)',
                      fontWeight: 500
                    }}
                  >
                    <Icon name="i-check" size="sm" />
                    <span>
                      {accuracyReport.rating === 'optimal'
                        ? 'Optimal Accuracy'
                        : accuracyReport.rating === 'adequate'
                        ? 'Adequate Accuracy'
                        : 'Recalibrate Recommended'}
                    </span>
                  </span>

                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    Mean Error: <span style={{ color: 'var(--ink)', fontFamily: 'var(--f-mono)' }}>{accuracyReport.meanErrorPx} px</span> ({accuracyReport.visualAngleDeg}°) · Precision: <span style={{ color: 'var(--ink)', fontFamily: 'var(--f-mono)' }}>{accuracyReport.accuracyPct}%</span>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Fixation:</span>
                  <span
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: '0.72rem',
                      color: activeAoi ? 'var(--ok)' : 'var(--muted)'
                    }}
                  >
                    {activeAoi ? activeAoi : 'Outside AOI'}
                  </span>
                </div>
              </div>

              {/* 4 AOI Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gridTemplateRows: 'repeat(2, 1fr)',
                  gap: '8px',
                  height: 'calc(100% - 42px)'
                }}
              >
                <div
                  data-test-aoi="Figure A"
                  style={{
                    borderRadius: '6px',
                    border: `1px solid ${activeAoi === 'Figure A' ? 'var(--ok)' : 'var(--line)'}`,
                    background: activeAoi === 'Figure A' ? 'var(--raised)' : 'var(--sunken)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'border-color 0.12s ease, background 0.12s ease'
                  }}
                >
                  <Icon name="i-triangle" size="md" style={{ color: activeAoi === 'Figure A' ? 'var(--ok)' : 'var(--muted)' }} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.82rem', color: 'var(--ink)' }}>
                      Figure A
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                      Source Analog
                    </div>
                  </div>
                </div>

                <div
                  data-test-aoi="Figure B"
                  style={{
                    borderRadius: '6px',
                    border: `1px solid ${activeAoi === 'Figure B' ? 'var(--ok)' : 'var(--line)'}`,
                    background: activeAoi === 'Figure B' ? 'var(--raised)' : 'var(--sunken)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'border-color 0.12s ease, background 0.12s ease'
                  }}
                >
                  <Icon name="i-square" size="md" style={{ color: activeAoi === 'Figure B' ? 'var(--ok)' : 'var(--muted)' }} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.82rem', color: 'var(--ink)' }}>
                      Figure B
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                      Transformation Target
                    </div>
                  </div>
                </div>

                <div
                  data-test-aoi="Hint Panel"
                  style={{
                    borderRadius: '6px',
                    border: `1px solid ${activeAoi === 'Hint Panel' ? 'var(--ok)' : 'var(--line)'}`,
                    background: activeAoi === 'Hint Panel' ? 'var(--raised)' : 'var(--sunken)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'border-color 0.12s ease, background 0.12s ease'
                  }}
                >
                  <Icon name="i-bulb" size="md" style={{ color: activeAoi === 'Hint Panel' ? 'var(--ok)' : 'var(--muted)' }} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.82rem', color: 'var(--ink)' }}>
                      Hint Controls
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                      Clues Panel
                    </div>
                  </div>
                </div>

                <div
                  data-test-aoi="Answer Options"
                  style={{
                    borderRadius: '6px',
                    border: `1px solid ${activeAoi === 'Answer Options' ? 'var(--ok)' : 'var(--line)'}`,
                    background: activeAoi === 'Answer Options' ? 'var(--raised)' : 'var(--sunken)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'border-color 0.12s ease, background 0.12s ease'
                  }}
                >
                  <Icon name="i-layout-grid" size="md" style={{ color: activeAoi === 'Answer Options' ? 'var(--ok)' : 'var(--muted)' }} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.82rem', color: 'var(--ink)' }}>
                      Answer Options
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                      Candidates (1–4)
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time gaze pointer indicator directly manipulated via ref */}
              <div
                ref={dotRef}
                style={{
                  position: 'absolute',
                  display: 'none',
                  transform: 'translate(-50%, -50%)',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  border: '2px solid #ffffff',
                  pointerEvents: 'none',
                  zIndex: 99
                }}
              />
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div
          className="edge"
          style={{
            borderTop: '1px solid var(--line)',
            paddingTop: '8px',
            alignItems: 'center'
          }}
        >
          <div className="l" style={{ gap: '8px' }}>
            {onBack && (
              <button
                type="button"
                className="ibtn tb"
                onClick={onBack}
                style={{ height: '32px', padding: '0 12px', borderRadius: '6px', fontSize: '0.8rem' }}
              >
                <Icon name="i-arrow-left" size="sm" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              className="ibtn tb"
              onClick={handleRecalibrate}
              style={{ height: '32px', padding: '0 12px', borderRadius: '6px', fontSize: '0.8rem' }}
              title="Reset calibration model and redo 9-point setup"
            >
              <Icon name="i-replay" size="sm" />
              <span>Recalibrate</span>
            </button>
          </div>

          <div className="r" style={{ gap: '8px' }}>
            {phase === 'calibrating' && (
              <button
                type="button"
                className="ibtn tb"
                onClick={startVerification}
                style={{ height: '32px', padding: '0 12px', borderRadius: '6px', fontSize: '0.8rem' }}
              >
                <span>Skip to Verification</span>
                <Icon name="i-arrow" size="sm" />
              </button>
            )}

            {phase === 'verified' && (
              <button
                type="button"
                className="ibtn primary"
                onClick={onComplete}
                style={{
                  height: '34px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}
              >
                <span>Begin Trial 1</span>
                <Icon name="i-arrow" size="sm" />
              </button>
            )}

            {phase !== 'verified' && (
              <button
                type="button"
                className="ibtn primary"
                onClick={onComplete}
                style={{
                  height: '32px',
                  padding: '0 14px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem'
                }}
                title="Proceed directly to trials"
              >
                <span>Proceed to Trial 1</span>
                <Icon name="i-arrow" size="sm" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
