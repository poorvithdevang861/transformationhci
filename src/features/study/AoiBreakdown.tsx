import React from 'react';
import { AoiMetric } from '../../core/gaze/types';
import { AOI_COLOR_MAP } from '../../core/gaze/aoi-engine';

interface AoiBreakdownProps {
  metrics: Record<string, AoiMetric> | null;
}

export const AoiBreakdown: React.FC<AoiBreakdownProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="panel" style={{ gap: '10px' }}>
        <div className="eyebrow">AOI Dwell Breakdown</div>
        <div className="meta wrap" style={{ color: 'var(--faint)' }}>
          No gaze recording yet. Track dwell across Figure A–D, Candidate Options, and Hints.
        </div>
      </div>
    );
  }

  const keys = Object.keys(metrics).filter((k) => metrics[k].dwellTimeMs > 0);
  keys.sort((a, b) => metrics[b].dwellTimeMs - metrics[a].dwellTimeMs);

  return (
    <div className="panel" style={{ gap: '10px' }}>
      <div className="eyebrow">Area of Interest (AOI) Breakdown</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {keys.map((k) => {
          const m = metrics[k];
          const info = AOI_COLOR_MAP[k] || { color: '#64748b', tag: '' };
          const sec = (m.dwellTimeMs / 1000).toFixed(1);

          return (
            <div key={k} style={{ background: 'var(--sunken)', padding: '8px 10px', borderRadius: '8px' }}>
              <div className="edge" style={{ fontSize: '0.82rem', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: info.color }} />
                  <span>{m.name}</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: info.color }}>{info.tag}</span>
                </span>
                <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--accent)' }}>
                  {sec}s ({m.pctTotal}%)
                </span>
              </div>
              <div style={{ height: '4px', background: 'var(--track)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${m.pctTotal}%`, height: '100%', background: info.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
