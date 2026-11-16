import React from 'react';
import { Icon } from '../../components/common/Icon';

interface IntroStepProps {
  mode: 'static' | 'animation' | 'randomise';
  onBegin: () => void;
  onBack?: () => void;
}

export const IntroStep: React.FC<IntroStepProps> = ({ mode, onBegin, onBack }) => {
  const isAnim = mode === 'animation';

  return (
    <div style={{ maxWidth: '580px', margin: '32px auto', width: '100%' }}>
      <div
        className="panel"
        style={{
          borderRadius: '20px',
          padding: '32px 28px',
          boxShadow: 'none',
          border: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <div>
          <div className="eyebrow">Study overview</div>
          <h2 className="ptitle" style={{ fontSize: '1.35rem', margin: '4px 0 8px' }}>
            Visual Reasoning Procedure
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            You will solve 10 geometric analogy puzzles. Infer how Figure A transforms into Figure B, and apply the same rules to Figure C.
          </p>
        </div>

        <div
          style={{
            background: 'var(--sunken)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.88rem' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>1.</span>
            <span style={{ color: 'var(--fg)', lineHeight: 1.45 }}>
              Observe figures <b>A</b>, <b>B</b>, and <b>C</b> on the left screen.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.88rem' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>2.</span>
            <span style={{ color: 'var(--fg)', lineHeight: 1.45 }}>
              Use the transformation clues on the right if you need guidance.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.88rem' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>3.</span>
            <span style={{ color: 'var(--fg)', lineHeight: 1.45 }}>
              Select candidate Option 1–4 and click <b>Confirm answer</b> when ready.
            </span>
          </div>
        </div>

        <div className="edge" style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
          <div className="l">
            {onBack && (
              <button
                type="button"
                className="ibtn tb"
                onClick={onBack}
                style={{
                  height: '40px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Icon name="i-arrow-left" size="sm" />
                <span>Back</span>
              </button>
            )}
          </div>
          <div className="r">
            <button
              type="button"
              className="ibtn primary"
              onClick={onBegin}
              style={{
                height: '40px',
                padding: '0 18px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600
              }}
            >
              <span>Begin trial 1</span>
              <Icon name="i-arrow" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
