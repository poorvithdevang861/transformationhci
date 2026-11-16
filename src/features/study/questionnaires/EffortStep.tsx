import React, { useState } from 'react';
import { Icon } from '../../../components/common/Icon';

interface EffortStepProps {
  onComplete: (rating: number) => void;
}

export const EffortStep: React.FC<EffortStepProps> = ({ onComplete }) => {
  const [rating, setRating] = useState<number | null>(null);
  const scale = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div style={{ maxWidth: '600px', margin: '32px auto', width: '100%' }}>
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
          <div className="eyebrow">Post-study assessment</div>
          <h2 className="ptitle" style={{ fontSize: '1.35rem', margin: '4px 0 8px' }}>
            Overall Mental Effort
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            How much mental effort did solving these visual analogy puzzles require?
          </p>
        </div>

        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '6px', margin: '16px 0 10px' }}>
            {scale.map((num) => (
              <button
                key={num}
                type="button"
                className="ibtn"
                aria-pressed={rating === num}
                onClick={() => setRating(num)}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  background: rating === num ? 'var(--raised)' : 'var(--sunken)',
                  color: rating === num ? 'var(--ink)' : 'var(--muted)',
                  border: rating === num ? '1.5px solid var(--ink)' : '1px solid var(--line)',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
              >
                {num}
              </button>
            ))}
          </div>

          <div className="edge" style={{ color: 'var(--faint)', fontSize: '0.78rem' }}>
            <span>1: Very Low Effort</span>
            <span>5: Moderate Effort</span>
            <span>9: Very High Effort</span>
          </div>
        </div>

        <div className="edge" style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
          <div className="l meta" style={{ fontSize: '0.82rem' }}>
            {rating ? `Rating: ${rating} / 9` : 'Select a rating to proceed'}
          </div>
          <div className="r">
            <button
              type="button"
              className="ibtn primary"
              disabled={rating === null}
              onClick={() => rating !== null && onComplete(rating)}
              style={{
                height: '40px',
                padding: '0 18px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                cursor: rating === null ? 'default' : 'pointer'
              }}
            >
              <span>Continue</span>
              <Icon name="i-arrow" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
