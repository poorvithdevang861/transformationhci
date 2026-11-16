import React, { useState } from 'react';
import { Icon } from '../../../components/common/Icon';

const TLX_DIMENSIONS = [
  { key: 'mental', name: 'Mental Demand', desc: 'How mentally demanding was the task?' },
  { key: 'physical', name: 'Physical Demand', desc: 'How physically demanding was the task?' },
  { key: 'temporal', name: 'Temporal Demand', desc: 'How hurried or rushed was the pace?' },
  { key: 'performance', name: 'Performance', desc: 'How successful were you in accomplishing what you were asked to do?' },
  { key: 'effort', name: 'Effort', desc: 'How hard did you have to work to accomplish your level of performance?' },
  { key: 'frustration', name: 'Frustration', desc: 'How insecure, discouraged, or irritated did you feel?' }
];

interface NasaTlxStepProps {
  onComplete: (ratings: Record<string, number>) => void;
}

export const NasaTlxStep: React.FC<NasaTlxStepProps> = ({ onComplete }) => {
  const [values, setValues] = useState<Record<string, number>>({
    mental: 50,
    physical: 20,
    temporal: 40,
    performance: 70,
    effort: 50,
    frustration: 25
  });

  return (
    <div className="panel narrow" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className="eyebrow">Part 2 · Workload Assessment</div>
      <h2 className="ptitle" style={{ fontSize: '1.4rem' }}>
        NASA-TLX Workload Rating
      </h2>
      <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>
        Please adjust each slider to reflect your workload experience during the puzzle tasks.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {TLX_DIMENSIONS.map((dim) => (
          <div key={dim.key} style={{ background: 'var(--sunken)', padding: '12px', borderRadius: '12px' }}>
            <div className="edge" style={{ marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{dim.name}</span>
              <span className="meta" style={{ fontFamily: 'var(--f-mono)' }}>
                {values[dim.key]} / 100
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--faint)', marginBottom: '8px' }}>{dim.desc}</div>
            <input
              type="range"
              min="0"
              max="100"
              value={values[dim.key]}
              onChange={(e) => setValues({ ...values, [dim.key]: +e.target.value })}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>
        ))}
      </div>

      <div className="edge" style={{ marginTop: '24px' }}>
        <div className="l meta">Adjust all 6 sliders</div>
        <div className="r">
          <button type="button" className="ibtn tb primary" onClick={() => onComplete(values)}>
            Continue
            <Icon name="i-arrow" />
          </button>
        </div>
      </div>
    </div>
  );
};
