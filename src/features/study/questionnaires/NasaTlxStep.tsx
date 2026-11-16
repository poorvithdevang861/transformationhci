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
          <div className="eyebrow">Task workload</div>
          <h2 className="ptitle" style={{ fontSize: '1.35rem', margin: '4px 0 8px' }}>
            NASA-TLX Assessment
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Adjust the sliders to reflect your workload experience across the 6 dimensions.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {TLX_DIMENSIONS.map((dim) => (
            <div
              key={dim.key}
              style={{
                background: 'var(--sunken)',
                border: '1px solid var(--line)',
                padding: '12px 14px',
                borderRadius: '12px'
              }}
            >
              <div className="edge" style={{ marginBottom: '2px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{dim.name}</span>
                <span className="meta" style={{ fontFamily: 'var(--f-mono)', fontSize: '0.82rem' }}>
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
                style={{ width: '100%', accentColor: 'var(--ink)' }}
              />
            </div>
          ))}
        </div>

        <div className="edge" style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
          <div className="l meta" style={{ fontSize: '0.82rem' }}>
            6 workload dimensions
          </div>
          <div className="r">
            <button
              type="button"
              className="ibtn primary"
              onClick={() => onComplete(values)}
              style={{
                height: '40px',
                padding: '0 18px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                cursor: 'pointer'
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
