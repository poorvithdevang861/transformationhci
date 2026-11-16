// Unit shapes centered on (0, 0) for SVG rendering
function poly(pts: [number, number][]): string {
  return 'M' + pts.map((p) => p[0].toFixed(3) + ' ' + p[1].toFixed(3)).join('L') + 'Z';
}

function reg(n: number): string {
  const a: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    a.push([Math.cos(t), Math.sin(t)]);
  }
  return poly(a);
}

function star(): string {
  const a: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.45 : 1.1;
    const t = -Math.PI / 2 + (i * Math.PI) / 5;
    a.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return poly(a);
}

export const SHAPES: Record<string, string> = {
  circle: 'M1 0A1 1 0 1 1 -1 0A1 1 0 1 1 1 0Z',
  ellipse: 'M1.3 0A1.3 .65 0 1 1 -1.3 0A1.3 .65 0 1 1 1.3 0Z',
  diamond: 'M0 -1.25L.7 0L0 1.25L-.7 0Z',
  heart: 'M0 .95C-1.3 -.05 -.85 -1 0 -.35C.85 -1 1.3 -.05 0 .95Z',
  star: star(),
  triangle: 'M0 -1L1.05 .8L-1.05 .8Z',
  rectangle: 'M-1.25 -.65H1.25V.65H-1.25Z',
  pentagon: reg(5),
  hexagon: reg(6),
  plus: 'M-.33 -1H.33V-.33H1V.33H.33V1H-.33V.33H-1V-.33H-.33Z',
  arrow: 'M-1.1 -.3H.2V-.8L1.1 0L.2 .8V.3H-1.1Z'
};

export type ShapeName = keyof typeof SHAPES;
