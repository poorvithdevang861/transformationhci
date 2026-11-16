import { TransformOp, COLORS, NONE_OP } from './operations';

export interface ShapeTransformParams {
  rot: number;
  sx: number;
  sy: number;
  kx: number;
  ky: number;
  ry: number;
  f: number;
  color: string | null;
}

export function params(op: TransformOp, g: number): ShapeTransformParams {
  const p: ShapeTransformParams = { rot: 0, sx: 1, sy: 1, kx: 0, ky: 0, ry: 0, f: 0, color: null };
  switch (op.type) {
    case 'rotate_counterclockwise': p.rot = -90 * g; break;
    case 'rotate_clockwise': p.rot = 90 * g; break;
    case 'reflect': p.sy = Math.cos(Math.PI * g); p.ry = (1 - Math.cos(Math.PI * g)) / 2; break;
    case 'scale_up': p.sx = p.sy = 1 + 0.5 * g; break;
    case 'scale_down': p.sx = p.sy = 1 - 0.35 * g; break;
    case 'shear_horizontal': p.kx = 0.7 * g; break;
    case 'shear_vertical': p.ky = 0.7 * g; break;
    case 'fill':
      p.f = g;
      p.color = op.color ? COLORS[op.color] : null;
      break;
  }
  return p;
}

export function paramsWith(ops: TransformOp[], progress: number[]): ShapeTransformParams {
  const p = params(NONE_OP, 0);
  ops.forEach((op, k) => {
    const q = params(op, progress[k]);
    p.rot += q.rot;
    p.sx *= q.sx;
    p.sy *= q.sy;
    p.kx += q.kx;
    p.ky += q.ky;
    p.ry = Math.max(p.ry, q.ry);
    if (q.color) {
      p.color = q.color;
      p.f = q.f;
    }
  });
  return p;
}

export function paramsAt(ops: TransformOp[], g: number): ShapeTransformParams {
  const n = ops.length;
  if (n === 0) return params(NONE_OP, 0);
  return paramsWith(ops, ops.map((_, k) => Math.min(1, Math.max(0, g * n - k))));
}

export function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function xform(p: ShapeTransformParams): string {
  return `rotate(${p.rot}) matrix(1 ${p.ky} ${p.kx} 1 0 0) scale(${p.sx} ${p.sy})`;
}
