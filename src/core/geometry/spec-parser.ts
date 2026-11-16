import { TransformOp, parseOp } from './operations';
import { SHAPES } from './shapes';

export interface ProblemSpec {
  A: [string, string];
  C: [string, string];
  steps: [TransformOp, TransformOp][];
}

export interface HintItem {
  step: number;
  slot: 0 | 1;
  op: TransformOp;
  shape: string;
}

export function parseSpec(line: string): ProblemSpec {
  const m = line.match(/A=\((\w+),\s*(\w+)\).*?C=\((\w+),\s*(\w+)\)(.*)$/);
  if (!m) throw new Error('Expected: Problem N: A=(shape,shape), C=(shape,shape), transform1=(move,move)');

  const steps: [TransformOp, TransformOp][] = [];
  const re = /transform(\d)=\(((?:[^()]|\([^()]*\))*)\)/g;
  let t: RegExpExecArray | null;

  while ((t = re.exec(m[5])) !== null) {
    if (+t[1] !== steps.length + 1) throw new Error('Expected transform' + (steps.length + 1) + ' next.');
    const parts = t[2].split(/,(?![^(]*\))/);
    if (parts.length !== 2) throw new Error('transform' + t[1] + ' needs exactly two moves, one per shape.');
    steps.push([parseOp(parts[0]), parseOp(parts[1])]);
  }

  if (!steps.length) throw new Error('Add transform1=(move,move).');
  [m[1], m[2], m[3], m[4]].forEach((s) => {
    if (!SHAPES[s]) throw new Error('Unknown shape: ' + s);
  });

  return { A: [m[1], m[2]], C: [m[3], m[4]], steps };
}

export function shapeOps(sp: ProblemSpec, s: 0 | 1): TransformOp[] {
  return sp.steps.map((st) => st[s]);
}

export function hintsFor(sp: ProblemSpec): HintItem[] {
  const out: HintItem[] = [];
  sp.steps.forEach((st, k) => {
    ([0, 1] as const).forEach((s) => {
      if (st[s].type !== 'none') {
        out.push({ step: k, slot: s, op: st[s], shape: sp.A[s] });
      }
    });
  });
  return out;
}
