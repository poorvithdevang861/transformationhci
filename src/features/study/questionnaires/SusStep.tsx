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
    <div className="panel narrow" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className="eyebrow">Part 2 · System Usability</div>
      <h2 className="ptitle" style={{ fontSize: '1.4rem' }}>
        Usability Feedback (SUS)
      </h2>
      <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>
        Rate from 1 (Strongly Disagree) to 5 (Strongly Agree).
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {SUS_QUESTIONS.map((q) => (
          <div key={q.key} style={{ background: 'var(--sunken)', padding: '12px', borderRadius: '12px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '8px' }}>{q.text}</div>
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

        <div style={{ marginTop: '10px' }}>
          <label className="lbl" style={{ display: 'block', marginBottom: '6px' }}>
            Additional Comments (Optional)
          </label>
          <textarea
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--sunken)',
              border: '1px solid var(--line)',
              borderRadius: '10px',
              padding: '10px',
              color: 'var(--ink)'
            }}
          />
        </div>
      </div>

      <div className="edge" style={{ marginTop: '24px' }}>
        <div className="l meta">1: Strongly Disagree · 5: Strongly Agree</div>
        <div className="r">
          <button
            type="button"
            className="ibtn tb primary"
            disabled={!isComplete}
            onClick={() => onComplete(ratings, comments)}
          >
            Finish Study
            <Icon name="i-check" />
          </button>
        </div>
      </div>
    </div>
  );
};
