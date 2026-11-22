import { GazePoint, Fixation, AoiMetric, BoundaryRect } from './types';

export const AOI_COLOR_MAP: Record<string, { color: string; name: string; tag: string }> = {
  figA: { color: '#ff4055', name: 'Figure A', tag: '[Red]' },
  figB: { color: '#3b82f6', name: 'Figure B', tag: '[Blue]' },
  figC: { color: '#ff9800', name: 'Figure C', tag: '[Orange]' },
  figD: { color: '#facc15', name: 'Figure D (Target ?)', tag: '[Yellow]' },
  chooseD: { color: '#eab308', name: 'Answer Choices Area', tag: '[Yellow]' },
  option1: { color: '#a855f7', name: 'Option 1', tag: '[Purple]' },
  option2: { color: '#a855f7', name: 'Option 2', tag: '[Purple]' },
  option3: { color: '#a855f7', name: 'Option 3', tag: '[Purple]' },
  option4: { color: '#a855f7', name: 'Option 4', tag: '[Purple]' },
  hints: { color: '#22c55e', name: 'Hint Panel', tag: '[Green]' },
  hintControls: { color: '#10b981', name: 'Hint Controls', tag: '[Teal]' },
  hintTimeline: { color: '#06b6d4', name: 'Hint Timeline', tag: '[Cyan]' },
  hintStage: { color: '#84cc16', name: 'Transformation Stage', tag: '[Lime]' },
  OUTSIDE_REGION: { color: '#64748b', name: 'Outside Boundaries', tag: '[Gray]' },
  other: { color: '#64748b', name: 'Outside Boundaries', tag: '[Gray]' }
};

export function getElementAoiKey(el: Element | null): string {
  if (!el) return 'OUTSIDE_REGION';
  const target = el.closest('[data-aoi]');
  if (target) {
    const aoi = target.getAttribute('data-aoi') || '';
    // Most specific sub-boundaries first
    if (aoi.includes('option-1') || aoi === 'option1') return 'option1';
    if (aoi.includes('option-2') || aoi === 'option2') return 'option2';
    if (aoi.includes('option-3') || aoi === 'option3') return 'option3';
    if (aoi.includes('option-4') || aoi === 'option4') return 'option4';
    if (aoi === 'hint-controls' || aoi === 'hintControls') return 'hintControls';
    if (aoi === 'hint-timeline' || aoi === 'hintTimeline') return 'hintTimeline';
    if (aoi === 'hint-stage' || aoi === 'hintStage') return 'hintStage';
    if (aoi.includes('fig-A') || aoi === 'figA') return 'figA';
    if (aoi.includes('fig-B') || aoi === 'figB') return 'figB';
    if (aoi.includes('fig-C') || aoi === 'figC') return 'figC';
    if (aoi.includes('fig-D') || aoi === 'figD') return 'figD';
    if (aoi.includes('choose')) return 'chooseD';
    if (aoi.includes('hint')) return 'hints';
  }

  // Fallbacks by class or structure
  const fig = el.closest('.fig');
  if (fig) {
    if (fig.classList.contains('fig-static-a')) return 'figA';
    if (fig.classList.contains('fig-static-b')) return 'figB';
    if (fig.classList.contains('fig-static-c')) return 'figC';
    if (fig.classList.contains('fig-static-d')) return 'figD';
  }

  if (el.closest('.cell') && el.closest('.opts4')) {
    // If inside an option cell without data-aoi
    const cells = Array.from(document.querySelectorAll('.opts4 .cell'));
    const idx = cells.indexOf(el.closest('.cell')!);
    if (idx >= 0 && idx < 4) return `option${idx + 1}`;
  }

  if (el.closest('.hint-ctrl')) return 'hintControls';
  if (el.closest('.tl')) return 'hintTimeline';
  if (el.closest('.stage-wrap') || el.closest('.anim-stage')) return 'hintStage';
  if (el.closest('.choose') || el.closest('.opts4')) return 'chooseD';
  if (el.closest('.hpanel') || el.closest('.hint-player')) return 'hints';

  return 'OUTSIDE_REGION';
}

export function computeAoiMetrics(samples: GazePoint[], fixations: Fixation[], totalDurationMs: number): Record<string, AoiMetric> {
  const metrics: Record<string, AoiMetric> = {};
  Object.keys(AOI_COLOR_MAP).forEach((k) => {
    metrics[k] = {
      name: AOI_COLOR_MAP[k].name,
      dwellTimeMs: 0,
      fixationsCount: 0,
      pctTotal: 0,
      ttffMs: null
    };
  });

  if (samples.length === 0) return metrics;

  for (let i = 0; i < samples.length; i++) {
    const cur = samples[i];
    const dt = i < samples.length - 1 ? Math.min(200, samples[i + 1].t - cur.t) : 33;
    const key = cur.target && metrics[cur.target] ? cur.target : (metrics['OUTSIDE_REGION'] ? 'OUTSIDE_REGION' : 'other');
    metrics[key].dwellTimeMs += dt;

    if (metrics[key].ttffMs === null && key !== 'other' && key !== 'OUTSIDE_REGION') {
      metrics[key].ttffMs = cur.t;
    }
  }

  fixations.forEach((f) => {
    const key = f.target && metrics[f.target] ? f.target : (metrics['OUTSIDE_REGION'] ? 'OUTSIDE_REGION' : 'other');
    metrics[key].fixationsCount += 1;
  });

  const grandTotal = Object.keys(metrics).reduce((acc, k) => acc + metrics[k].dwellTimeMs, 0) || totalDurationMs || 1;
  Object.keys(metrics).forEach((k) => {
    metrics[k].pctTotal = Math.round((metrics[k].dwellTimeMs / grandTotal) * 1000) / 10;
  });

  return metrics;
}

export function extractDomBoundaries(rootElement: HTMLElement | null): Record<string, BoundaryRect> {
  const boundaries: Record<string, BoundaryRect> = {};
  if (!rootElement) return boundaries;
  const elements = rootElement.querySelectorAll('[data-aoi]');
  const rootRect = rootElement.getBoundingClientRect();

  elements.forEach((el) => {
    const aoi = el.getAttribute('data-aoi') || '';
    const key = getElementAoiKey(el);
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const info = AOI_COLOR_MAP[key] || { name: key, color: '#94a3b8', tag: '' };
      const boundKey = aoi || key;
      boundaries[boundKey] = {
        x: Math.round(rect.left - rootRect.left),
        y: Math.round(rect.top - rootRect.top),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        key: boundKey,
        name: info.name,
        color: info.color,
        tag: info.tag
      };
    }
  });

  return boundaries;
}
