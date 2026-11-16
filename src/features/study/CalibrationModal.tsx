import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: (success: boolean) => void;
}

const POINTS = [
  { id: 0, x: 10, y: 10 }, { id: 1, x: 50, y: 10 }, { id: 2, x: 90, y: 10 },
  { id: 3, x: 10, y: 50 }, { id: 4, x: 50, y: 50 }, { id: 5, x: 90, y: 50 },
  { id: 6, x: 10, y: 90 }, { id: 7, x: 50, y: 90 }, { id: 8, x: 90, y: 90 }
];

export const CalibrationModal: React.FC<CalibrationModalProps> = ({ isOpen, onClose }) => {
  const [clickCounts, setClickCounts] = useState<Record<number, number>>({});
  const CLICKS_PER_POINT = 5;

  const handlePointClick = (id: number) => {
    const cur = (clickCounts[id] || 0) + 1;
    const updated = { ...clickCounts, [id]: cur };
    setClickCounts(updated);

    const allDone = POINTS.every((p) => (updated[p.id] || 0) >= CLICKS_PER_POINT);
    if (allDone) {
      setTimeout(() => onClose(true), 400);
    }
  };

  const totalClicksDone = Object.values(clickCounts).reduce((a, b) => a + Math.min(b, CLICKS_PER_POINT), 0);
  const totalTargetClicks = POINTS.length * CLICKS_PER_POINT;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onClose(false)}
      title="9-Point Gaze Calibration"
      eyebrow="Eye Tracker Setup"
      width="820px"
    >
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Keep your head steady. Look directly at each red dot and click it 5 times until it turns green.
        </p>
        <div className="meta" style={{ justifyContent: 'center', fontWeight: 600 }}>
          Progress: {totalClicksDone} / {totalTargetClicks} clicks ({Math.round((totalClicksDone / totalTargetClicks) * 100)}%)
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '420px',
          background: 'var(--sunken)',
          border: '1px solid var(--line)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        {POINTS.map((pt) => {
          const clicks = clickCounts[pt.id] || 0;
          const isDone = clicks >= CLICKS_PER_POINT;
          const remaining = Math.max(0, CLICKS_PER_POINT - clicks);

          return (
            <button
              key={pt.id}
              type="button"
              onClick={() => handlePointClick(pt.id)}
              disabled={isDone}
              style={{
                position: 'absolute',
                left: `${pt.x}%`,
                top: `${pt.y}%`,
                transform: 'translate(-50%, -50%)',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: isDone ? '2px solid var(--ok)' : '2px solid #fff',
                background: isDone ? 'var(--ok)' : 'rgba(255, 64, 85, 0.9)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '12px',
                cursor: isDone ? 'default' : 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                transition: 'all 0.15s ease'
              }}
            >
              {isDone ? '✓' : remaining}
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
