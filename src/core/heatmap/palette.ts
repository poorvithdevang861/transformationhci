export interface GradientStop {
  stop: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

export const DEFAULT_GRADIENT: GradientStop[] = [
  { stop: 0.0, r: 0, g: 100, b: 255, a: 0.0 },
  { stop: 0.2, r: 0, g: 210, b: 255, a: 0.4 },
  { stop: 0.45, r: 40, g: 240, b: 120, a: 0.65 },
  { stop: 0.7, r: 255, g: 220, b: 0, a: 0.82 },
  { stop: 0.88, r: 255, g: 100, b: 20, a: 0.92 },
  { stop: 1.0, r: 255, g: 30, b: 60, a: 0.98 }
];

export function buildPalette(gradient: GradientStop[] = DEFAULT_GRADIENT): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Uint8ClampedArray(256 * 4);

  const linear = ctx.createLinearGradient(0, 0, 256, 0);
  gradient.forEach((g) => {
    linear.addColorStop(g.stop, `rgba(${g.r},${g.g},${g.b},${g.a})`);
  });
  ctx.fillStyle = linear;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
}

export const defaultPalette = buildPalette();
