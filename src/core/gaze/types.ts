export interface GazePoint {
  t: number;
  x: number;
  y: number;
  target?: string;
}

export interface Fixation {
  id: number;
  t: number;
  x: number;
  y: number;
  duration: number;
  target?: string;
}

export interface AoiMetric {
  name: string;
  dwellTimeMs: number;
  fixationsCount: number;
  pctTotal: number;
  ttffMs?: number | null;
}

export interface BoundaryRect {
  x: number;
  y: number;
  w: number;
  h: number;
  key: string;
  name: string;
  color: string;
  tag: string;
}

export interface GazeSessionResult {
  samples: GazePoint[];
  fixations: Fixation[];
  aoiMetrics: Record<string, AoiMetric>;
  boundaries: Record<string, BoundaryRect>;
  durationMs: number;
}

export interface CalibrationPoint {
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  clicksNeeded: number;
  clicksCount: number;
  done: boolean;
}
