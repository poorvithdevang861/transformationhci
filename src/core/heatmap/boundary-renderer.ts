import { BoundaryRect } from '../gaze/types';

export function drawBoundaries(
  canvas: HTMLCanvasElement,
  boundaries: Record<string, BoundaryRect>,
  showLabels = true
) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !boundaries) return;

  ctx.save();
  Object.values(boundaries).forEach((b) => {
    if (!b || b.w <= 0 || b.h <= 0) return;
    const { x, y, w, h, color, tag, name } = b;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x, y, w, h);

    if (showLabels) {
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.font = '700 11px "JetBrains Mono", monospace';
      const label = `${name} ${tag}`;
      ctx.fillText(label, x + 4, Math.max(14, y - 4));
    }
  });
  ctx.restore();
}
