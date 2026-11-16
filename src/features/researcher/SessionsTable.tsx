import React from 'react';
import { ExperimentSession } from '../../core/storage/types';
import { Icon } from '../../components/common/Icon';

interface SessionsTableProps {
  sessions: ExperimentSession[];
  onInspectSession: (session: ExperimentSession) => void;
  onDeleteAll: () => void;
}

export const SessionsTable: React.FC<SessionsTableProps> = ({
  sessions,
  onInspectSession,
  onDeleteAll
}) => {
  // Sort sessions descending by creation time (newest at the top)
  const sortedSessions = [...sessions].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return (
    <div className="panel" style={{ marginTop: '16px' }}>
      <div className="edge" style={{ marginBottom: '12px' }}>
        <div>
          <div className="eyebrow">Participants</div>
          <h2 className="ptitle">Recorded Sessions</h2>
        </div>
        {sessions.length > 0 && (
          <button
            type="button"
            className="ibtn tb danger"
            onClick={onDeleteAll}
            style={{ height: '32px', borderRadius: '8px', padding: '0 12px' }}
          >
            <Icon name="i-trash" size="sm" />
            <span>Delete All</span>
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--faint)' }}>
              <th style={{ padding: '8px' }}>Participant ID</th>
              <th style={{ padding: '8px' }}>Mode</th>
              <th style={{ padding: '8px' }}>Progress</th>
              <th style={{ padding: '8px' }}>Accuracy</th>
              <th style={{ padding: '8px' }}>Mean Time</th>
              <th style={{ padding: '8px' }}>Workload (TLX)</th>
              <th style={{ padding: '8px' }}>Usability (SUS)</th>
              <th style={{ padding: '8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedSessions.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--faint)' }}>
                  No sessions recorded yet on this machine.
                </td>
              </tr>
            ) : (
              sortedSessions.map((s) => {
                const trials = s.trials || [];
                const correct = trials.filter((t) => t.correct).length;
                const acc = trials.length > 0 ? `${((correct / trials.length) * 100).toFixed(0)}%` : '–';
                const meanTime = trials.length > 0 ? `${(trials.reduce((acc, t) => acc + t.timeMs, 0) / trials.length / 1000).toFixed(1)}s` : '–';
                const tlx = s.survey.tlx ? (Object.values(s.survey.tlx).reduce((a, b) => a + b, 0) / 6).toFixed(0) : '–';
                const sus = s.survey.sus ? (Object.values(s.survey.sus).reduce((a, b) => a + b, 0) * 2.5).toFixed(0) : '–';

                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '8px', fontWeight: 600, fontFamily: 'var(--f-mono)' }}>{s.id}</td>
                    <td style={{ padding: '8px', textTransform: 'capitalize' }}>{s.mode}</td>
                    <td style={{ padding: '8px' }}>{trials.length} / 10</td>
                    <td style={{ padding: '8px', color: 'var(--accent)' }}>{acc}</td>
                    <td style={{ padding: '8px' }}>{meanTime}</td>
                    <td style={{ padding: '8px' }}>{tlx}</td>
                    <td style={{ padding: '8px' }}>{sus}</td>
                    <td style={{ padding: '8px' }}>
                      <button
                        type="button"
                        className="ibtn tb"
                        onClick={() => onInspectSession(s)}
                        style={{ height: '30px', fontSize: '0.78rem' }}
                      >
                        <Icon name="i-eye" size="sm" />
                        Heatmap
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
