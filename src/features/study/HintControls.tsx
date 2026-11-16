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
    <div className="hint-ctrl">
      <div className="seg-btns">
        <button type="button" className="ibtn" onClick={onPrev} disabled={view === 0} aria-label="Previous hint">
          <Icon name="i-prev" size="sm" />
        </button>
        <button
          type="button"
          className={`ibtn tb ${isAnimated ? 'primary' : ''}`}
          onClick={onTogglePause}
        >
          <Icon name={paused ? 'i-play' : 'i-pause'} size="sm" />
          {paused ? (isAnimated ? 'Play' : 'Resume timer') : (isAnimated ? 'Pause' : 'Pause timer')}
        </button>
        {isAnimated && (
          <button type="button" className="ibtn" onClick={onReplay} aria-label="Replay hint">
            <Icon name="i-replay" size="sm" />
          </button>
        )}
        <button type="button" className="ibtn tb" onClick={onNext} disabled={view >= totalHints - 1}>
          <span>{view >= totalHints - 1 ? 'Last hint' : `Hint ${view + 2}`}</span>
          <Icon name="i-s1" size="sm" />
        </button>
      </div>

      {isAnimated && (
        <div className="seg speed">
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
