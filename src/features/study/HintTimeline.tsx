import React from 'react';

interface HintTimelineProps {
  hintsCount: number;
  front: number;
  view: number;
  elapsed: number[];
  getWindowMs: (k: number) => number;
  onSelectHint: (k: number) => void;
}

export const HintTimeline: React.FC<HintTimelineProps> = ({
  hintsCount,
  front,
  view,
  elapsed,
  getWindowMs,
  onSelectHint
}) => {
  return (
    <div className="tl" role="group" aria-label="Hint timeline" style={{ margin: '14px 0 8px' }}>
      {Array.from({ length: hintsCount }).map((_, k) => {
        const winMs = getWindowMs(k);
        const elMs = elapsed[k] || 0;
        const pct = Math.min(100, Math.round((elMs / winMs) * 100));
        const isUnlocked = k <= front;
        const isActive = k === view;

        return (
          <button
            key={k}
            type="button"
            className={`seg-t ${isActive ? 'on' : ''}`}
            disabled={!isUnlocked}
            onClick={() => isUnlocked && onSelectHint(k)}
            aria-label={`Hint ${k + 1}`}
          >
            <span className="bar">
              <i style={{ width: `${pct}%` }} />
            </span>
            <span className="tl-l">
              T{k + 1} <em>{Math.round(winMs / 1000)}s</em>
            </span>
          </button>
        );
      })}
    </div>
  );
};
