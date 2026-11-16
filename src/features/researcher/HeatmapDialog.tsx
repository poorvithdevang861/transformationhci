import React, { useState, useRef, useEffect } from 'react';
import { ExperimentSession, TrialData } from '../../core/storage/types';
import { Modal } from '../../components/common/Modal';
import { drawHeatmap } from '../../core/heatmap/heatmap-renderer';
import { drawScanpath } from '../../core/heatmap/scanpath-renderer';
import { drawBoundaries } from '../../core/heatmap/boundary-renderer';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { AoiBreakdown } from '../study/AoiBreakdown';

interface HeatmapDialogProps {
  session: ExperimentSession | null;
  onClose: () => void;
}

export const HeatmapDialog: React.FC<HeatmapDialogProps> = ({ session, onClose }) => {
  const [selectedTrialIdx, setSelectedTrialIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const trials = session?.trials || [];
  const currentTrial: TrialData | undefined = trials[selectedTrialIdx];

  useEffect(() => {
    if (!canvasRef.current || !currentTrial) return;
    const canvas = canvasRef.current;
    canvas.width = 720;
    canvas.height = 420;

    const fixations = currentTrial.fixations || [];
    drawHeatmap(canvas, fixations, { radius: 36, opacity: 0.8 });
    drawScanpath(canvas, fixations, { keepHeatmap: true });
    if (currentTrial.boundaries) {
      drawBoundaries(canvas, currentTrial.boundaries, true);
    }
  }, [currentTrial]);

  if (!session) return null;

  return (
    <Modal
      isOpen={!!session}
      onClose={onClose}
      title={`Heatmap Explorer · Participant ${session.id}`}
      eyebrow="Eye Tracking Analytics"
      width="1000px"
    >
      <div className="edge" style={{ marginBottom: '14px' }}>
        <span className="lbl">Select Trial:</span>
        <SegmentedControl<number>
          value={selectedTrialIdx}
          onChange={setSelectedTrialIdx}
          options={trials.map((_, i) => ({ value: i, label: `Puzzle ${i + 1}` }))}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px' }}>
        <div style={{ position: 'relative', background: 'var(--sunken)', borderRadius: '14px', overflow: 'hidden', height: '420px' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
        </div>
        <div>
          <AoiBreakdown metrics={currentTrial?.aoi ?? null} />
        </div>
      </div>
    </Modal>
  );
};
