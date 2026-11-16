import React from 'react';
import { ExperimentSession } from '../../core/storage/types';

interface ConditionTableProps {
  sessions: ExperimentSession[];
}

export const ConditionTable: React.FC<ConditionTableProps> = ({ sessions }) => {
  const stats: Record<string, { trials: number; correct: number; timeMs: number; hints: number }> = {
    static: { trials: 0, correct: 0, timeMs: 0, hints: 0 },
    animated: { trials: 0, correct: 0, timeMs: 0, hints: 0 }
  };

  sessions.forEach((s) => {
    (s.trials || []).forEach((t) => {
      const cond = t.condition === 'animated' ? 'animated' : 'static';
      stats[cond].trials++;
      if (t.correct) stats[cond].correct++;
      stats[cond].timeMs += t.timeMs || 0;
      stats[cond].hints += t.hintsUsed || 0;
    });
  });

  return (
    <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--faint)' }}>
            <th style={{ padding: '8px' }}>Condition</th>
            <th style={{ padding: '8px' }}>Trials</th>
            <th style={{ padding: '8px' }}>Accuracy</th>
            <th style={{ padding: '8px' }}>Mean Time</th>
            <th style={{ padding: '8px' }}>Mean Hints</th>
          </tr>
        </thead>
        <tbody>
          {(['static', 'animated'] as const).map((cond) => {
            const row = stats[cond];
            const acc = row.trials > 0 ? ((row.correct / row.trials) * 100).toFixed(1) + '%' : '–';
            const meanTime = row.trials > 0 ? (row.timeMs / row.trials / 1000).toFixed(2) + 's' : '–';
            const meanHints = row.trials > 0 ? (row.hints / row.trials).toFixed(2) : '–';

            return (
              <tr key={cond} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '8px', fontWeight: 600, textTransform: 'capitalize' }}>{cond} Hints</td>
                <td style={{ padding: '8px' }}>{row.trials}</td>
                <td style={{ padding: '8px', color: 'var(--accent)' }}>{acc}</td>
                <td style={{ padding: '8px' }}>{meanTime}</td>
                <td style={{ padding: '8px' }}>{meanHints}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
