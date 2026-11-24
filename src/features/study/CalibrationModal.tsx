import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Icon } from '../../components/common/Icon';
import { gazeTracker } from '../../core/gaze/webgazer-service';

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

  const handlePointClick = (id: number, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = rect.left + rect.width / 2;
    const clickY = rect.top + rect.height / 2;
    gazeTracker.recordCalibrationPoint(clickX, clickY);

    const cur = (clickCounts[id] || 0) + 1;
    const updated = { ...clickCounts, [id]: cur };
    setClickCounts(updated);

    const allDone = POINTS.every((p) => (updated[p.id] || 0) >= CLICKS_PER_POINT);
    if (allDone) {
      setTimeout(() => onClose(true), 300);
    }
  };

  const handleReset = () => {
    gazeTracker.clearCalibration();
    setClickCounts({});
  };

  const totalClicksDone = Object.values(clickCounts).reduce((a, b) => a + Math.min(b, CLICKS_PER_POINT), 0);
  const totalTargetClicks = POINTS.length * CLICKS_PER_POINT;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onClose(false)}
      title="9-point gaze calibration"
      eyebrow="Eye tracker setup"
      width="820px"
    >
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '0 0 6px' }}>
          Keep your head still. Fixate on each red target and click it 5 times until it turns green.
        </p>
        <div className="meta" style={{ justifyContent: 'center' }}>
          Progress: {totalClicksDone} / {totalTargetClicks} ({Math.round((totalClicksDone / totalTargetClicks) * 100)}%)
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '420px',
          background: 'var(--sunken)',
          border: '1px solid var(--line)',
          borderRadius: '10px',
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
              onClick={(e) => handlePointClick(pt.id, e)}
              disabled={isDone}
              aria-label={`Calibration point ${pt.id + 1}`}
              style={{
                position: 'absolute',
                left: `${pt.x}%`,
                top: `${pt.y}%`,
                transform: 'translate(-50%, -50%)',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: isDone ? '2px solid var(--ok)' : '2px solid rgba(255, 255, 255, 0.7)',
                background: isDone ? 'var(--ok)' : 'rgba(239, 68, 68, 0.9)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '11px',
                fontFamily: 'var(--f-mono)',
                cursor: isDone ? 'default' : 'pointer',
                display: 'grid',
                placeItems: 'center',
                boxShadow: 'none',
                transition: 'background-color 0.12s ease, border-color 0.12s ease'
              }}
            >
              {isDone ? '✓' : remaining}
            </button>
          );
        })}
      </div>

      <div className="edge" style={{ marginTop: '14px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
        <div className="l" style={{ gap: '8px' }}>
          <button
            type="button"
            className="ibtn tb"
            onClick={() => onClose(false)}
            style={{ height: '36px', padding: '0 14px', borderRadius: '8px' }}
          >
            <Icon name="i-arrow-left" size="sm" />
            <span>Back to Study</span>
          </button>
          <button
            type="button"
            className="ibtn tb"
            onClick={handleReset}
            style={{ height: '36px', padding: '0 12px', borderRadius: '8px' }}
            title="Reset calibration model and clear data"
          >
            <Icon name="i-replay" size="sm" />
            <span>Reset</span>
          </button>
        </div>
        <span className="meta">Click all 9 points (5x each) to finish calibration</span>
      </div>
    </Modal>
  );
};
