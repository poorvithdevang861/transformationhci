import React, { useState, useRef, useEffect } from 'react';
import { ExperimentSession, TrialData } from '../../core/storage/types';
import { Modal } from '../../components/common/Modal';
import { drawHeatmap } from '../../core/heatmap/heatmap-renderer';
import { drawScanpath } from '../../core/heatmap/scanpath-renderer';
import { drawBoundaries } from '../../core/heatmap/boundary-renderer';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { AoiBreakdown } from '../study/AoiBreakdown';
import { Icon } from '../../components/common/Icon';

interface HeatmapDialogProps {
  session: ExperimentSession | null;
  onClose: () => void;
}

export const HeatmapDialog: React.FC<HeatmapDialogProps> = ({ session, onClose }) => {
  const [selectedTrialIdx, setSelectedTrialIdx] = useState(0);
  const [canvasDim, setCanvasDim] = useState({ w: 760, h: 720 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const trials = session?.trials || [];
  const currentTrial: TrialData | undefined = trials[selectedTrialIdx];

  useEffect(() => {
    if (!canvasRef.current || !currentTrial) return;
    const canvas = canvasRef.current;

    // Determine coordinate extent from boundaries to ensure options and hint panel are fully visible
    let maxBoundX = 720;
    let maxBoundY = 680;
    let minBoundX = 0;
    let minBoundY = 0;

    // Ensure all defined boundaries include the complete hint panel box
    const rawBoundaries = currentTrial.boundaries || {};
    const boundaries = { ...rawBoundaries };
    if (!boundaries['hint-panel'] && !boundaries['hints']) {
      const bVals = Object.values(rawBoundaries);
      if (bVals.length > 0) {
        const qMaxX = Math.max(...bVals.map((b) => b.x + b.w));
        const qMaxY = Math.max(...bVals.map((b) => b.y + b.h));
        const hintX = qMaxX + 16;
        const hintW = Math.max(340, Math.round(qMaxX * 0.76));
        const hintH = Math.max(480, qMaxY);
        boundaries['hint-panel'] = {
          x: hintX,
          y: 0,
          w: hintW,
          h: hintH,
          key: 'hint-panel',
          name: 'Hints Panel',
          color: '#22c55e',
          tag: '[Green]'
        };
      }
    }

    const bList = Object.values(boundaries);

    if (bList.length > 0) {
      maxBoundX = Math.max(...bList.map((b) => b.x + b.w));
      maxBoundY = Math.max(...bList.map((b) => b.y + b.h));
      minBoundX = Math.min(...bList.map((b) => b.x));
      minBoundY = Math.min(...bList.map((b) => b.y));
    }

    const targetW = Math.max(760, maxBoundX + 28);
    const targetH = Math.max(720, maxBoundY + 44);
    canvas.width = targetW;
    canvas.height = targetH;
    setCanvasDim({ w: targetW, h: targetH });

    let fixations = currentTrial.fixations || [];
    // Adjust fixations if older runs recorded clientY coordinates
    if (fixations.length > 0 && bList.length > 0) {
      const maxFixY = Math.max(...fixations.map((f) => f.y));
      const minFixY = Math.min(...fixations.map((f) => f.y));
      if (minFixY > maxBoundY * 0.35 && maxFixY > maxBoundY) {
        const shiftY = minFixY - Math.max(10, minBoundY);
        const minFixX = Math.min(...fixations.map((f) => f.x));
        const shiftX = minFixX - Math.max(10, minBoundX);
        fixations = fixations.map((f) => ({
          ...f,
          x: Math.max(5, f.x - (shiftX > 40 ? shiftX : 0)),
          y: Math.max(5, f.y - shiftY)
        }));
      }
    }

    drawHeatmap(canvas, fixations, { radius: 38, opacity: 0.82 });
    drawScanpath(canvas, fixations, { keepHeatmap: true });
    if (bList.length > 0) {
      drawBoundaries(canvas, boundaries, true);
    }
  }, [currentTrial]);

  if (!session) return null;

  return (
    <Modal
      isOpen={!!session}
      onClose={onClose}
      title={`Eye Tracking Heatmap · Participant ${session.id}`}
      eyebrow="Gaze & Attention Analytics"
      width="1060px"
    >
      <div className="edge" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="ibtn tb"
            onClick={onClose}
            style={{ height: '32px', padding: '0 10px', borderRadius: '7px' }}
            title="Return to sessions list"
          >
            <Icon name="i-arrow-left" size="sm" />
            <span>Back</span>
          </button>
          <span className="lbl" style={{ marginLeft: '4px' }}>Trial:</span>
          <SegmentedControl<number>
            value={selectedTrialIdx}
            onChange={setSelectedTrialIdx}
            options={trials.map((_, i) => ({ value: i, label: `Puzzle ${i + 1}` }))}
          />
        </div>

        {currentTrial && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
            <span className="pill">
              <Icon name={currentTrial.condition === 'animated' ? 'i-puzzle-anim' : 'i-puzzle-static'} size="sm" />
              {currentTrial.condition === 'animated' ? 'Animated' : 'Static'}
            </span>
            <span
              className="pill"
              style={{
                color: currentTrial.correct ? 'var(--ok)' : 'var(--danger)',
                borderColor: currentTrial.correct ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
              }}
            >
              <Icon name={currentTrial.correct ? 'i-check' : 'i-x'} size="sm" />
              {currentTrial.correct ? 'Correct' : 'Incorrect'} (Choice: {currentTrial.choice ?? '–'} | Ans: {currentTrial.answer})
            </span>
            <span className="meta" style={{ fontFamily: 'var(--f-mono)' }}>
              {(currentTrial.timeMs / 1000).toFixed(1)}s · {currentTrial.hintsUsed} hints
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '16px', alignItems: 'start' }}>
        <div
          style={{
            position: 'relative',
            background: 'var(--sunken)',
            borderRadius: '14px',
            border: '1px solid var(--line)',
            overflow: 'auto',
            maxHeight: '620px',
            display: 'flex',
            justifyContent: 'center',
            padding: '10px'
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: `${canvasDim.w}px`,
              height: `${canvasDim.h}px`,
              maxWidth: '100%',
              display: 'block'
            }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <AoiBreakdown metrics={currentTrial?.aoi ?? null} />
        </div>
      </div>
    </Modal>
  );
};
