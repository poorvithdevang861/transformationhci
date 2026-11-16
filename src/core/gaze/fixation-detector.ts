import { GazePoint, Fixation } from './types';

export interface FixationOptions {
  dispersionThresholdPx?: number; // max distance between points in fixation cluster
  minDurationMs?: number;        // minimum fixation duration (e.g. 100ms)
}

export function detectFixations(samples: GazePoint[], options: FixationOptions = {}): Fixation[] {
  const dispersionThreshold = options.dispersionThresholdPx ?? 45;
  const minDuration = options.minDurationMs ?? 100;
  const fixations: Fixation[] = [];

  if (samples.length < 2) return fixations;

  let windowStart = 0;
  let fixId = 1;

  while (windowStart < samples.length) {
    let windowEnd = windowStart;
    let minX = samples[windowStart].x;
    let maxX = samples[windowStart].x;
    let minY = samples[windowStart].y;
    let maxY = samples[windowStart].y;

    // Expand window while spatial dispersion is within threshold
    while (windowEnd + 1 < samples.length) {
      const next = samples[windowEnd + 1];
      const nMinX = Math.min(minX, next.x);
      const nMaxX = Math.max(maxX, next.x);
      const nMinY = Math.min(minY, next.y);
      const nMaxY = Math.max(maxY, next.y);
      const disp = nMaxX - nMinX + (nMaxY - nMinY);

      if (disp <= dispersionThreshold) {
        minX = nMinX;
        maxX = nMaxX;
        minY = nMinY;
        maxY = nMaxY;
        windowEnd++;
      } else {
        break;
      }
    }

    const duration = samples[windowEnd].t - samples[windowStart].t;
    if (duration >= minDuration) {
      // Centroid average of the cluster
      let sumX = 0, sumY = 0;
      for (let i = windowStart; i <= windowEnd; i++) {
        sumX += samples[i].x;
        sumY += samples[i].y;
      }
      const count = windowEnd - windowStart + 1;
      fixations.push({
        id: fixId++,
        t: samples[windowStart].t,
        x: sumX / count,
        y: sumY / count,
        duration: Math.round(duration),
        target: samples[windowStart].target
      });
      windowStart = windowEnd + 1;
    } else {
      windowStart++;
    }
  }

  return fixations;
}
