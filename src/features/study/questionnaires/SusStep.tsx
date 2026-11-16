import React, { useState } from 'react';
import { Icon } from '../../../components/common/Icon';

const SUS_QUESTIONS = [
  { key: 'sus1', text: 'I think that I would like to use this system frequently.' },
  { key: 'sus2', text: 'I found the system unnecessarily complex.' },
  { key: 'sus3', text: 'I thought the system was easy to use.' },
  { key: 'sus4', text: 'I think that I would need the support of a technical person to be able to use this system.' },
  { key: 'sus5', text: 'I felt very confident using the system.' }
];

interface SusStepProps {
  onComplete: (ratings: Record<string, number>, comments: string) => void;
}

export const SusStep: React.FC<SusStepProps> = ({ onComplete }) => {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');

  const isComplete = SUS_QUESTIONS.every((q) => ratings[q.key] !== undefined);

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
          <div className="eyebrow">Experience evaluation</div>
          <h2 className="ptitle" style={{ fontSize: '1.35rem', margin: '4px 0 8px' }}>
            System Usability Scale (SUS)
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Rate your agreement from 1 (Strongly disagree) to 5 (Strongly agree).
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {SUS_QUESTIONS.map((q) => (
            <div
              key={q.key}
              style={{
                background: 'var(--sunken)',
                border: '1px solid var(--line)',
                padding: '12px 16px',
                borderRadius: '12px'
              }}
            >
              <div style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--fg)', marginBottom: '8px', lineHeight: 1.4 }}>
                {q.text}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((num) => (
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

          <div style={{ marginTop: '4px' }}>
            <label className="lbl" style={{ display: 'block', marginBottom: '6px' }}>
              Additional comments (optional)
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Any observations or feedback on the clues or interface..."
              style={{
                width: '100%',
                background: 'var(--sunken)',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                padding: '10px 12px',
                color: 'var(--ink)',
                fontSize: '0.88rem',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        <div className="edge" style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
          <div className="l meta" style={{ fontSize: '0.82rem' }}>
            1: Strongly disagree · 5: Strongly agree
          </div>
          <div className="r">
            <button
              type="button"
              className="ibtn primary"
              disabled={!isComplete}
              onClick={() => onComplete(ratings, comments)}
              style={{
                height: '40px',
                padding: '0 18px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                cursor: !isComplete ? 'default' : 'pointer'
              }}
            >
              <span>Finish study</span>
              <Icon name="i-check" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
