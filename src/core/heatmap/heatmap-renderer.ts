import { defaultPalette } from './palette';

export interface HeatmapOptions {
  radius?: number;
  opacity?: number;
  minDwell?: number;
  maxDwell?: number;
  width?: number;
  height?: number;
}

export function drawHeatmap(
  canvas: HTMLCanvasElement,
  points: { x: number; y: number; duration?: number; dwell?: number }[],
  options: HeatmapOptions = {}
) {
  const width = options.width || canvas.width;
  const height = options.height || canvas.height;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  if (!points || !points.length) return;

  const radius = options.radius ?? 38;
  const opacity = options.opacity ?? 0.8;
  const minDwell = options.minDwell ?? 0;
  const maxDwell = options.maxDwell ?? 1800;

  // Offscreen canvas for grayscale/alpha accumulation
  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) return;

  // Radial brush
  const brushCanvas = document.createElement('canvas');
  const brushRadius = radius * 2;
  brushCanvas.width = brushRadius * 2;
  brushCanvas.height = brushRadius * 2;
  const brushCtx = brushCanvas.getContext('2d');
  if (brushCtx) {
    const grad = brushCtx.createRadialGradient(brushRadius, brushRadius, 0, brushRadius, brushRadius, brushRadius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    brushCtx.fillStyle = grad;
    brushCtx.fillRect(0, 0, brushRadius * 2, brushRadius * 2);
  }

  points.forEach((pt) => {
    const dwell = pt.duration ?? pt.dwell ?? 50;
    if (dwell < minDwell) return;
    const weight = Math.min(1.0, Math.max(0.12, dwell / maxDwell));
    offCtx.globalAlpha = weight * 0.7;
    offCtx.drawImage(brushCanvas, pt.x - brushRadius, pt.y - brushRadius, brushRadius * 2, brushRadius * 2);
  });

  // Apply color ramp
  const imgData = offCtx.getImageData(0, 0, width, height);
  const pixels = imgData.data;
  const palette = defaultPalette;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha > 0) {
      const idx = alpha * 4;
      pixels[i] = palette[idx];
      pixels[i + 1] = palette[idx + 1];
      pixels[i + 2] = palette[idx + 2];
      pixels[i + 3] = Math.round(alpha * opacity);
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
