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

    // Subtle background fill to visually highlight the AOI boundary tile
    ctx.fillStyle = color.startsWith('#') && color.length === 7 ? color + '18' : 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x, y, w, h);

    if (showLabels) {
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      const label = `${name} ${tag}`.trim();
      ctx.fillText(label, x + 6, Math.max(14, y - 6));
    }
  });
  ctx.restore();
}
