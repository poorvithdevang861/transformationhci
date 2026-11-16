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
}

export const HintPlayer: React.FC<HintPlayerProps> = ({
  spec,
  condition,
  windows = [20, 20, 20, 20],
  animSeconds = 1.6,
  onHintsChanged
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
      <div className="panel hpanel" data-aoi="hint-panel" style={{ height: '100%' }}>
        <div className="hint-empty">
          <div className="hint-badge"><Icon name="i-bulb" /></div>
          <div className="hint-copy">
            <b>{n} {n === 1 ? 'hint' : 'hints'} available</b>
            <span>Each hint demonstrates one transformation step for up to {Math.round(getWindowMs(0) / 1000)} seconds</span>
          </div>
          <button type="button" className="ibtn tb primary" onClick={() => { setFront(0); setView(0); onHintsChanged?.(1); }}>
            <Icon name="i-bulb" />
            <span>Show hint 1</span>
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
    <div className={`panel hpanel ${condition}`} data-aoi="hint-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="hint-head" style={{ marginBottom: '10px' }}>
        <div>
          <div className="eyebrow hstep">Hint {view + 1} of {n} · T{view + 1}</div>
          <div className="hname">
            <Icon name="i-bulb" size="sm" />
            <span><b>{sideName}</b> · {opName(curHint.op)}</span>
          </div>
        </div>
        <div className="hleft meta" style={{ fontFamily: 'var(--f-mono)', fontSize: '0.82rem' }}>
          {view === front && curElapsed < targetWin ? (
            <>
              <Icon name="i-start" size="sm" />
              {paused ? 'Paused · ' : ''}{remainingSec}s {front < n - 1 ? 'to next hint' : 'left'}
            </>
          ) : view < front ? (
            <>Earlier hint</>
          ) : (
            <>All hints unlocked</>
          )}
        </div>
      </div>

      {isAnimated ? (
        <AnimatedHintStage spec={spec} hints={hints} viewIndex={view} progress={progress} />
      ) : (
        <div className="hint-text">
          <p className="hsay"><b>{sideName} ({curHint.shape}):</b> {opSay(curHint.op)}</p>
          {curHint.step > 0 && <p className="hwhich meta">This happens after the earlier change to the same shape.</p>}
        </div>
      )}

      <HintTimeline
        hintsCount={n}
        front={front}
        view={view}
        elapsed={elapsed}
        getWindowMs={getWindowMs}
        onSelectHint={setView}
      />

      <HintControls
        view={view}
        totalHints={n}
        paused={paused}
        isAnimated={isAnimated}
        speed={speed}
        onPrev={() => view > 0 && setView((v) => v - 1)}
        onTogglePause={() => setPaused(!paused)}
        onReplay={() => { setProgress(0); holdRef.current = 250; setPaused(false); }}
        onNext={() => {
          if (view < n - 1) {
            const nextIdx = view + 1;
            setView(nextIdx);
            if (nextIdx > front) {
              setFront(nextIdx);
              onHintsChanged?.(nextIdx + 1);
            }
          }
        }}
        onSpeedChange={setSpeed}
      />
    </div>
  );
};
