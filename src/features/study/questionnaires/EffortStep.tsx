import React, { useState } from 'react';
import { Icon } from '../../../components/common/Icon';

interface EffortStepProps {
  onComplete: (rating: number) => void;
}

export const EffortStep: React.FC<EffortStepProps> = ({ onComplete }) => {
  const [rating, setRating] = useState<number | null>(null);
  const scale = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="panel narrow" style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="eyebrow">Part 2 · Mental Effort</div>
      <h2 className="ptitle" style={{ fontSize: '1.4rem' }}>
        Overall Mental Effort
      </h2>
      <p style={{ color: 'var(--muted)' }}>
        In your opinion, how much mental effort did solving these visual reasoning puzzles require overall?
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '6px', margin: '24px 0' }}>
        {scale.map((num) => (
          <button
            key={num}
            type="button"
            className="ibtn"
            aria-pressed={rating === num}
            onClick={() => setRating(num)}
            style={{
              width: '100%',
              height: '48px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '1.1rem',
              background: rating === num ? 'var(--accent)' : 'var(--sunken)',
              color: rating === num ? 'var(--accent-ink)' : 'var(--ink)',
              border: '1px solid var(--line)'
            }}
          >
            {num}
          </button>
        ))}
      </div>

      <div className="edge" style={{ color: 'var(--faint)', fontSize: '0.8rem' }}>
        <span>1: Very Low Effort</span>
        <span>5: Moderate Effort</span>
        <span>9: Very High Effort</span>
      </div>

      <div className="edge" style={{ marginTop: '24px' }}>
        <div className="l meta">{rating ? `Selected rating: ${rating} / 9` : 'Select a rating to continue'}</div>
        <div className="r">
          <button
            type="button"
            className="ibtn tb primary"
            disabled={rating === null}
            onClick={() => rating !== null && onComplete(rating)}
          >
            Continue
            <Icon name="i-arrow" />
          </button>
        </div>
      </div>
    </div>
  );
};
