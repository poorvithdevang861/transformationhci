import React, { useState, useEffect, useRef } from 'react';
import { ProblemSpec, hintsFor } from '../../core/geometry/spec-parser';
import { opName, opSay } from '../../core/geometry/operations';
import { AnimatedHintStage } from './AnimatedHintStage';
import { HintTimeline } from './HintTimeline';
import { HintControls } from './HintControls';
import { Icon } from '../../components/common/Icon';

interface HintPlayerProps {
  spec: ProblemSpec;
  condition: 'static' | 'animated';
  windows?: number[];
  animSeconds?: number;
  onHintsChanged?: (count: number) => void;
  onHintAction?: (action: 'reveal' | 'select' | 'prev' | 'next' | 'replay' | 'pause', hintIdx: number) => void;
}

export const HintPlayer: React.FC<HintPlayerProps> = ({
  spec,
  condition,
  windows = [20, 20, 20, 20],
  animSeconds = 1.6,
  onHintsChanged,
  onHintAction
}) => {
  const hints = hintsFor(spec);
  const n = hints.length;
  const isAnimated = condition === 'animated';

  const [front, setFront] = useState(-1);
  const [view, setView] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState<number[]>(() => hints.map(() => 0));

  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number | null>(null);
  const holdRef = useRef(0);

  const getWindowMs = (k: number) => (windows[Math.min(k, windows.length - 1)] || 20) * 1000;

  // Main timing & animation tick
  useEffect(() => {
    if (front < 0) return;
    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(100, now - lastTimeRef.current);
      lastTimeRef.current = now;

      if (!paused) {
        setElapsed((prev) => {
          const next = [...prev];
          const targetWin = getWindowMs(front);
          if (next[front] < targetWin) {
            next[front] = Math.min(targetWin, next[front] + dt);
            if (next[front] >= targetWin && front < n - 1) {
              setFront((f) => {
                const nextF = f + 1;
                setView(nextF);
                onHintsChanged?.(nextF + 1);
                onHintAction?.('reveal', nextF);
                return nextF;
              });
            }
          }
          return next;
        });

        if (isAnimated) {
          if (holdRef.current > 0) {
            holdRef.current -= dt * speed;
            if (holdRef.current <= 0 && progress >= 1) {
              setProgress(0);
              holdRef.current = 350;
            }
          } else {
            const nextP = progress + (dt * speed) / (animSeconds * 1000);
            if (nextP >= 1) {
              setProgress(1);
              holdRef.current = 900;
            } else {
              setProgress(nextP);
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [front, paused, speed, progress, isAnimated, animSeconds, n]);

  if (n === 0) return null;

  if (front < 0) {
    return (
      <div
        className="panel hpanel"
        data-aoi="hint-panel"
        style={{ height: '100%', minHeight: '360px', flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <div className="hint-head" style={{ marginBottom: '12px' }}>
          <div>
            <div className="eyebrow">Transformation clues</div>
            <h3 className="ptitle" style={{ margin: 0 }}>Hint assistant</h3>
          </div>
          <span className="pill">{n} clues available</span>
        </div>

        <div className="hint-empty" style={{ flex: 1, minHeight: '220px' }}>
          <div className="hint-badge">
            <Icon name="i-bulb" />
          </div>
          <div className="hint-copy">
            <b>Need a clue?</b>
            <span>Shows how Figure A turns into Figure B</span>
          </div>
          <button
            type="button"
            className="ibtn tb primary"
            onClick={() => {
              setFront(0);
              setView(0);
              onHintsChanged?.(1);
              onHintAction?.('reveal', 0);
            }}
            style={{ height: '36px', padding: '0 16px', borderRadius: '8px' }}
          >
            <Icon name="i-bulb" />
            <span>Reveal clue 1</span>
          </button>
        </div>
      </div>
    );
  }

  const curHint = hints[view];
  const targetWin = getWindowMs(front);
  const curElapsed = elapsed[front] || 0;
  const remainingSec = Math.max(0, Math.ceil((targetWin - curElapsed) / 1000));
  const sideName = curHint.slot === 0 ? 'Left shape' : 'Right shape';

  return (
    <div
      className={`panel hpanel ${condition}`}
      data-aoi="hint-panel"
      style={{ height: '100%', minHeight: '360px', flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <div className="hint-head" style={{ marginBottom: '10px' }}>
        <div>
          <div className="eyebrow hstep">Clue {view + 1} of {n}</div>
          <div className="hname">
            <Icon name="i-bulb" size="sm" />
            <span><b>{sideName}</b> · {opName(curHint.op)}</span>
          </div>
        </div>
        <div
          className="meta"
          style={{
            minWidth: '90px',
            textAlign: 'right',
            justifyContent: 'flex-end',
            fontFamily: 'var(--f-mono)',
            fontSize: '0.8rem',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {view === front && curElapsed < targetWin ? (
            <>
              <Icon name="i-timer" size="sm" />
              <span>{paused ? 'Paused' : `${remainingSec}s`}</span>
            </>
          ) : view < front ? (
            <span>Earlier clue</span>
          ) : (
            <span>Unlocked</span>
          )}
        </div>
      </div>

      {isAnimated ? (
        <AnimatedHintStage spec={spec} hints={hints} viewIndex={view} progress={progress} />
      ) : (
        <div className="hint-text">
          <p className="hsay"><b>{sideName} ({curHint.shape}):</b> {opSay(curHint.op)}</p>
          {curHint.step > 0 && <p className="hwhich meta">Follows earlier transformation on this shape</p>}
        </div>
      )}

      <HintTimeline
        hintsCount={n}
        front={front}
        view={view}
        elapsed={elapsed}
        getWindowMs={getWindowMs}
        onSelectHint={(k) => {
          if (k > front) {
            setFront(k);
            setElapsed((prev) => {
              const nextE = [...prev];
              for (let i = 0; i < k; i++) {
                nextE[i] = getWindowMs(i);
              }
              return nextE;
            });
            onHintsChanged?.(k + 1);
            onHintAction?.('reveal', k);
          } else {
            onHintAction?.('select', k);
          }
          setView(k);
          setProgress(0);
        }}
      />

      <HintControls
        view={view}
        totalHints={n}
        paused={paused}
        isAnimated={isAnimated}
        speed={speed}
        onPrev={() => {
          const nextV = Math.max(0, view - 1);
          setView(nextV);
          setProgress(0);
          onHintAction?.('prev', nextV);
        }}
        onTogglePause={() => {
          setPaused((p) => {
            const nextP = !p;
            onHintAction?.('pause', view);
            return nextP;
          });
        }}
        onReplay={() => {
          setProgress(0);
          setPaused(false);
          onHintAction?.('replay', view);
        }}
        onNext={() => {
          if (view < n - 1) {
            const nextV = view + 1;
            // Advance to next hint immediately even if previous hint has time left
            if (nextV > front) {
              setFront(nextV);
              setElapsed((prev) => {
                const nextE = [...prev];
                for (let i = 0; i < nextV; i++) {
                  nextE[i] = getWindowMs(i);
                }
                return nextE;
              });
              onHintsChanged?.(nextV + 1);
              onHintAction?.('reveal', nextV);
            } else {
              onHintAction?.('next', nextV);
            }
            setView(nextV);
            setProgress(0);
          }
        }}
        onSpeedChange={setSpeed}
      />
    </div>
  );
};
