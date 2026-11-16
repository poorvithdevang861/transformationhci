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
    <div style={{ maxWidth: '640px', margin: '32px auto', width: '100%' }}>
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
          <div className="eyebrow">User autonomy</div>
          <h2 className="ptitle" style={{ fontSize: '1.35rem', margin: '4px 0 8px' }}>
            Sense of Agency & Control
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Rate your agreement from 1 (Strongly disagree) to 7 (Strongly agree).
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {AGENCY_QUESTIONS.map((q) => (
            <div
              key={q.key}
              style={{
                background: 'var(--sunken)',
                border: '1px solid var(--line)',
                padding: '14px 16px',
                borderRadius: '12px'
              }}
            >
              <div style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--fg)', marginBottom: '10px', lineHeight: 1.4 }}>
                {q.text}
              </div>
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
                      height: '38px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      background: ratings[q.key] === num ? 'var(--raised)' : 'var(--sunken)',
                      color: ratings[q.key] === num ? 'var(--ink)' : 'var(--muted)',
                      border: ratings[q.key] === num ? '1.5px solid var(--ink)' : '1px solid var(--line)',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease'
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="edge" style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
          <div className="l meta" style={{ fontSize: '0.82rem' }}>
            1: Strongly disagree · 7: Strongly agree
          </div>
          <div className="r">
            <button
              type="button"
              className="ibtn primary"
              disabled={!isAllAnswered}
              onClick={() => onComplete(ratings)}
              style={{
                height: '40px',
                padding: '0 18px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                cursor: !isAllAnswered ? 'default' : 'pointer'
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
