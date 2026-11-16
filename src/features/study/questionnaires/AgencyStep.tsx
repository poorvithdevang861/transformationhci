import React, { useState } from 'react';
import { Icon } from '../../../components/common/Icon';

const AGENCY_QUESTIONS = [
  { key: 'q1', text: 'I felt that I was the one controlling the problem-solving steps.' },
  { key: 'q2', text: 'The hints helped me understand the transformation rules rather than giving away the answer.' },
  { key: 'q3', text: 'I felt confident in my ability to solve similar puzzles in the future.' }
];

interface AgencyStepProps {
  onComplete: (ratings: Record<string, number>) => void;
}

export const AgencyStep: React.FC<AgencyStepProps> = ({ onComplete }) => {
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const isAllAnswered = AGENCY_QUESTIONS.every((q) => ratings[q.key] !== undefined);

  return (
    <div className="panel narrow" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className="eyebrow">Part 2 · Control & Agency</div>
      <h2 className="ptitle" style={{ fontSize: '1.4rem' }}>
        Sense of Control
      </h2>
      <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>
        Rate your agreement from 1 (Strongly Disagree) to 7 (Strongly Agree).
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {AGENCY_QUESTIONS.map((q) => (
          <div key={q.key} style={{ background: 'var(--sunken)', padding: '14px', borderRadius: '12px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '10px' }}>{q.text}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <button
                  key={num}
                  type="button"
                  className="ibtn"
                  aria-pressed={ratings[q.key] === num}
                  onClick={() => setRatings({ ...ratings, [q.key]: num })}
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    background: ratings[q.key] === num ? 'var(--accent)' : 'var(--panel)',
                    color: ratings[q.key] === num ? 'var(--accent-ink)' : 'var(--muted)',
                    border: '1px solid var(--line)'
                  }}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="edge" style={{ marginTop: '24px' }}>
        <div className="l meta">1: Strongly Disagree · 7: Strongly Agree</div>
        <div className="r">
          <button
            type="button"
            className="ibtn tb primary"
            disabled={!isAllAnswered}
            onClick={() => onComplete(ratings)}
          >
            Continue
            <Icon name="i-arrow" />
          </button>
        </div>
      </div>
    </div>
  );
};
