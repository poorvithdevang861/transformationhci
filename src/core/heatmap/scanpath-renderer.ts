import { Fixation } from '../gaze/types';

export interface ScanpathOptions {
  maxStep?: number;
  keepHeatmap?: boolean;
  saccadeColor?: string;
  lineWidth?: number;
  width?: number;
  height?: number;
}

export function drawScanpath(
  canvas: HTMLCanvasElement,
  fixations: Fixation[],
  options: ScanpathOptions = {}
) {
  const width = options.width || canvas.width;
  const height = options.height || canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (!options.keepHeatmap) {
    ctx.clearRect(0, 0, width, height);
  }

  if (!fixations || !fixations.length) return;
  const maxStep = options.maxStep ?? fixations.length;
  const active = fixations.slice(0, maxStep);
  if (!active.length) return;

  // Saccade lines
  ctx.save();
  ctx.strokeStyle = options.saccadeColor || 'rgba(165, 151, 255, 0.75)';
  ctx.lineWidth = options.lineWidth || 2.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(active[0].x, active[0].y);
  for (let i = 1; i < active.length; i++) {
    ctx.lineTo(active[i].x, active[i].y);
  }
  ctx.stroke();
  ctx.restore();

  // Fixation bubbles
  active.forEach((f, idx) => {
    const radius = Math.min(32, Math.max(12, Math.round(Math.sqrt(f.duration) * 1.3)));
    ctx.save();
    ctx.beginPath();
    ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(21, 21, 30, 0.85)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#a597ff';
    ctx.stroke();

    ctx.fillStyle = '#f4f1ea';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(idx + 1), f.x, f.y);
    ctx.restore();
  });
}
