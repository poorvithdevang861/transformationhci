export interface OpMeta {
  name: string;
  short: string;
  say: string;
}

export type BaseOpType =
  | 'rotate_counterclockwise'
  | 'rotate_clockwise'
  | 'reflect'
  | 'scale_up'
  | 'scale_down'
  | 'shear_horizontal'
  | 'shear_vertical'
  | 'none';

export interface TransformOp {
  type: BaseOpType | 'fill';
  color?: string;
}

export const COLORS: Record<string, string> = {
  yellow: '#f2c200',
  blue: '#2f6fe0',
  green: '#2e9e5b',
  red: '#d84a3a',
  orange: '#f08a1c',
  purple: '#8a52c9',
  pink: '#e0609a',
  black: '#222222'
};

export const OPS: Record<BaseOpType, OpMeta> = {
  rotate_counterclockwise: { name: 'Rotate counterclockwise', short: 'Turn left', say: 'Turn it 90° counterclockwise (to the left).' },
  rotate_clockwise: { name: 'Rotate clockwise', short: 'Turn right', say: 'Turn it 90° clockwise (to the right).' },
  reflect: { name: 'Reflect', short: 'Flip', say: 'Reflect it top to bottom, like a mirror on a horizontal line.' },
  scale_up: { name: 'Scale up', short: 'Grow', say: 'Make it bigger, keeping its shape.' },
  scale_down: { name: 'Scale down', short: 'Shrink', say: 'Make it smaller, keeping its shape.' },
  shear_horizontal: { name: 'Shear horizontal', short: 'Slant sideways', say: 'Slant it sideways: the top slides over while the bottom stays put.' },
  shear_vertical: { name: 'Shear vertical', short: 'Slant up', say: 'Slant it vertically: one side slides up while the other stays put.' },
  none: { name: 'No change', short: 'No change', say: 'Leave it as it is.' }
};

export const NONE_OP: TransformOp = { type: 'none' };

export function parseOp(s: string): TransformOp {
  s = s.trim();
  const m = s.match(/^fill\((\w+)\)$/);
  if (m) {
    if (m[1] === 'empty') return { type: 'none' };
    if (!COLORS[m[1]]) throw new Error('Unknown colour: ' + m[1]);
    return { type: 'fill', color: m[1] };
  }
  if (!OPS[s as BaseOpType] || s === 'none') throw new Error('Unknown move: ' + s);
  return { type: s as BaseOpType };
}

export function opName(o: TransformOp): string {
  return o.type === 'fill' ? 'Fill ' + o.color : OPS[o.type as BaseOpType].name;
}

export function opShort(o: TransformOp): string {
  return o.type === 'fill' ? 'Fill ' + o.color : OPS[o.type as BaseOpType].short;
}

export function opSay(o: TransformOp): string {
  return o.type === 'fill' ? 'Fill it with ' + o.color + '.' : OPS[o.type as BaseOpType].say;
}

export function opKey(o: TransformOp): string {
  return o.type === 'fill' ? 'fill(' + o.color + ')' : o.type === 'none' ? 'fill(empty)' : o.type;
}
