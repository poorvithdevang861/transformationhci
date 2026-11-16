import React, { useState } from 'react';
import { ProblemSpec, hintsFor } from '../../core/geometry/spec-parser';
import { opName, opSay } from '../../core/geometry/operations';
import { Icon } from '../../components/common/Icon';

interface HintPanelProps {
  spec: ProblemSpec;
  mode: 'static' | 'animated';
  hintsRevealed: number;
  onRevealNextHint: () => void;
}

export const HintPanel: React.FC<HintPanelProps> = ({
  spec,
  mode,
  hintsRevealed,
  onRevealNextHint
}) => {
  const hints = hintsFor(spec);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="panel hpanel" data-aoi="hint-panel" style={{ height: '100%' }}>
      <div className="edge" style={{ marginBottom: '12px' }}>
        <div>
          <div className="eyebrow">{mode === 'animated' ? 'Animated Hints' : 'Text Hints'}</div>
          <h3 className="ptitle" style={{ margin: 0 }}>
            {hintsRevealed === 0 ? 'Need a clue?' : `Hint ${hintsRevealed} of ${hints.length}`}
          </h3>
        </div>
        {hintsRevealed < hints.length && (
          <button type="button" className="ibtn tb" onClick={onRevealNextHint}>
            <Icon name="i-bulb" />
            Reveal Next
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {hintsRevealed === 0 ? (
          <div className="meta wrap" style={{ color: 'var(--faint)', padding: '16px 0' }}>
            Look closely at how Figure A transforms into B. If you are stuck, tap "Reveal Next".
          </div>
        ) : (
          hints.slice(0, hintsRevealed).map((hint, idx) => {
            const slotName = hint.slot === 0 ? 'Left' : 'Right';
            const actionName = opName(hint.op);
            const explanation = opSay(hint.op);

            return (
              <div
                key={idx}
                style={{
                  background: 'var(--sunken)',
                  border: '1px solid var(--line)',
                  borderRadius: '12px',
                  padding: '12px'
                }}
              >
                <div className="edge" style={{ marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)' }}>
                    Step {hint.step + 1}: {slotName} Shape ({hint.shape})
                  </span>
                  <span className="pill" style={{ height: '22px', fontSize: '0.72rem' }}>
                    {actionName}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{explanation}</div>
                {mode === 'animated' && (
                  <div className="edge" style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      className="ibtn"
                      style={{ height: '28px', width: '28px' }}
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      <Icon name={isPlaying ? 'i-pause' : 'i-play'} size="sm" />
                    </button>
                    <span className="meta" style={{ fontSize: '0.74rem' }}>
                      Animated transition
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
