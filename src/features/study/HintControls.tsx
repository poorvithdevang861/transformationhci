import React from 'react';
import { Icon } from '../../components/common/Icon';

interface HintControlsProps {
  view: number;
  totalHints: number;
  paused: boolean;
  isAnimated: boolean;
  speed: number;
  onPrev: () => void;
  onTogglePause: () => void;
  onReplay: () => void;
  onNext: () => void;
  onSpeedChange: (s: number) => void;
}

export const HintControls: React.FC<HintControlsProps> = ({
  view,
  totalHints,
  paused,
  isAnimated,
  speed,
  onPrev,
  onTogglePause,
  onReplay,
  onNext,
  onSpeedChange
}) => {
  return (
    <div className="hint-ctrl" style={{ marginTop: 'auto', paddingTop: '12px' }}>
      <div className="seg-btns" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          className="ibtn"
          onClick={onPrev}
          disabled={view === 0}
          aria-label="Previous clue"
          title="Previous clue"
        >
          <Icon name="i-prev" size="sm" />
        </button>

        <button
          type="button"
          className="ibtn tb"
          onClick={onTogglePause}
          style={{ minWidth: '82px', justifyContent: 'center' }}
        >
          <Icon name={paused ? 'i-play' : 'i-pause'} size="sm" />
          <span>{paused ? 'Play' : 'Pause'}</span>
        </button>

        {isAnimated && (
          <button
            type="button"
            className="ibtn"
            onClick={onReplay}
            aria-label="Replay transformation"
            title="Replay transformation"
          >
            <Icon name="i-replay" size="sm" />
          </button>
        )}

        <button
          type="button"
          className="ibtn"
          onClick={onNext}
          disabled={view >= totalHints - 1}
          aria-label="Next clue"
          title="Next clue"
        >
          <Icon name="i-s1" size="sm" />
        </button>
      </div>

      {isAnimated && (
        <div className="seg speed" aria-label="Playback speed">
          {[0.5, 1, 1.5].map((s) => (
            <button
              key={s}
              type="button"
              className="t"
              aria-pressed={speed === s}
              onClick={() => onSpeedChange(s)}
            >
              {s}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
