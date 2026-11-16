import React from 'react';
import { ExperimentSession } from '../../core/storage/types';

interface KpiCardsProps {
  sessions: ExperimentSession[];
}

export const KpiCards: React.FC<KpiCardsProps> = ({ sessions }) => {
  const total = sessions.length;
  const completed = sessions.filter((s) => s.completedAt).length;

  let totalTrials = 0;
  let correctTrials = 0;
  let totalTimeMs = 0;

  sessions.forEach((s) => {
    (s.trials || []).forEach((t) => {
      totalTrials++;
      if (t.correct) correctTrials++;
      totalTimeMs += t.timeMs || 0;
    });
  });

  const accPct = totalTrials > 0 ? ((correctTrials / totalTrials) * 100).toFixed(1) + '%' : '–';
  const meanTimeS = totalTrials > 0 ? (totalTimeMs / totalTrials / 1000).toFixed(1) + 's' : '–';

  const cards = [
    { label: 'Total Sessions', value: total },
    { label: 'Completed', value: completed },
    { label: 'Overall Accuracy', value: accPct },
    { label: 'Mean Solving Time', value: meanTimeS }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', margin: '14px 0' }}>
      {cards.map((c) => (
        <div key={c.label} className="panel" style={{ padding: '14px', background: 'var(--sunken)' }}>
          <div className="eyebrow">{c.label}</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--f-display)', marginTop: '4px', color: 'var(--accent)' }}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
};
