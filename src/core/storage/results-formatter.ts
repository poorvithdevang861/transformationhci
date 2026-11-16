import { ExperimentSession } from './types';
import { AOI_COLOR_MAP } from '../gaze/aoi-engine';

function pad(val: any, length: number, right = false): string {
  const str = String(val ?? '');
  if (str.length >= length) return str;
  const diff = length - str.length;
  return right ? ' '.repeat(diff) + str : str + ' '.repeat(diff);
}

export function formatSessionResultsTxt(s: ExperimentSession): string {
  const sep = '='.repeat(82);
  const subSep = '-'.repeat(82);
  const lines: string[] = [];

  lines.push(sep);
  lines.push('TRANSFORMATION ANIMATOR - EXPERIMENT SESSION RESULTS (PROGRESS & EYE GAZE)');
  lines.push(sep);
  lines.push(`Participant ID     : ${s.id}`);
  lines.push(`Started At         : ${s.createdAt}`);
  lines.push(`Completed At       : ${s.completedAt ?? 'IN PROGRESS / PARTIAL'}`);
  lines.push(`Status             : ${s.completedAt ? 'COMPLETE' : 'PARTIAL / IN PROGRESS'}`);
  lines.push(`Hint Condition     : ${(s.mode || 'animation').toUpperCase()}`);
  lines.push(`Device / Display   : ${s.device.type} (${s.device.w}x${s.device.h}, touch: ${s.device.touch ? 'yes' : 'no'})`);
  lines.push(`Eye Tracking       : ${s.eyeTracking ? 'ACTIVE (WebGazer)' : 'None'}`);
  lines.push(sep);
  lines.push('');

  // Performance Summary
  const trials = s.trials || [];
  const correctCount = trials.filter((t) => t.correct).length;
  const totalTime = trials.reduce((acc, t) => acc + (t.timeMs || 0), 0);
  const totalHints = trials.reduce((acc, t) => acc + (t.hintsUsed || 0), 0);
  const n = trials.length;

  lines.push('EXECUTIVE PERFORMANCE SUMMARY');
  lines.push(subSep);
  lines.push(`Main Puzzles Solved    : ${n}`);
  lines.push(`Main Accuracy          : ${n > 0 ? ((correctCount / n) * 100).toFixed(1) : 0}% (${correctCount}/${n})`);
  lines.push(`Mean Solving Time      : ${n > 0 ? (totalTime / n / 1000).toFixed(2) : '0.00'} seconds`);
  lines.push(`Mean Hints Used        : ${n > 0 ? (totalHints / n).toFixed(2) : '0.00'}`);
  if (s.survey.mentalEffort != null) lines.push(`Overall Mental Effort  : ${s.survey.mentalEffort} / 9`);
  lines.push('');

  // Mapped boundaries breakdown
  lines.push('1. CUMULATIVE GAZE ATTENTION OVER MAPPED BOUNDARIES');
  lines.push(subSep);
  lines.push(pad('Boundary Zone', 36) + pad('Color Tag', 12) + pad('Dwell (s)', 12, true) + pad('% Gaze', 10, true) + pad('Fixations', 12, true));
  lines.push('-'.repeat(82));

  const totals: Record<string, { dwell: number; fix: number }> = {};
  Object.keys(AOI_COLOR_MAP).forEach((k) => { totals[k] = { dwell: 0, fix: 0 }; });

  trials.forEach((t) => {
    if (!t.aoi) return;
    Object.keys(t.aoi).forEach((k) => {
      if (totals[k]) {
        totals[k].dwell += t.aoi![k].dwellTimeMs;
        totals[k].fix += t.aoi![k].fixationsCount;
      }
    });
  });

  let grandDwell = 0;
  const majorKeys = ['figA', 'figB', 'figC', 'chooseD', 'hints', 'other'];
  majorKeys.forEach((k) => { grandDwell += totals[k].dwell; });

  Object.keys(AOI_COLOR_MAP).forEach((k) => {
    const info = AOI_COLOR_MAP[k];
    const item = totals[k];
    const sec = (item.dwell / 1000).toFixed(2) + ' s';
    const pct = grandDwell > 0 ? ((item.dwell / grandDwell) * 100).toFixed(1) + '%' : '0.0%';
    lines.push(pad(info.name, 36) + pad(info.tag, 12) + pad(sec, 12, true) + pad(pct, 10, true) + pad(String(item.fix), 12, true));
  });

  lines.push('-'.repeat(82));
  lines.push(pad('TOTAL GAZE TRACKED', 48) + pad((grandDwell / 1000).toFixed(2) + ' s', 12, true) + pad('100.0%', 10, true));
  lines.push('');

  // Per-trial Breakdown
  lines.push('2. TRIAL-BY-TRIAL PERFORMANCE & GAZE ATTENTION');
  lines.push(subSep);
  trials.forEach((t, i) => {
    lines.push(`[Puzzle ${i + 1}] Result: ${t.correct ? 'CORRECT' : 'INCORRECT'} (Choice: Option ${t.choice ?? '-'}, Answer: Option ${t.answer})`);
    lines.push(`  Solving Time: ${(t.timeMs / 1000).toFixed(2)}s | Hints Used: ${t.hintsUsed}`);
    if (t.aoi) {
      lines.push('  Eye Gaze Over Mapped Boundaries:');
      Object.keys(AOI_COLOR_MAP).forEach((k) => {
        const metric = t.aoi![k];
        if (metric && metric.dwellTimeMs > 0) {
          const info = AOI_COLOR_MAP[k];
          const sec = (metric.dwellTimeMs / 1000).toFixed(2) + 's';
          const pct = metric.pctTotal + '%';
          const tt = metric.ttffMs != null ? (metric.ttffMs / 1000).toFixed(2) + 's' : '-';
          lines.push(`    • ${pad(info.name + ' ' + info.tag, 36)}: ${pad(sec, 8, true)} (${pad(pct, 5, true)}) | TTFF: ${tt}`);
        }
      });
    }
    lines.push('');
  });

  // Post-study Survey
  if (s.survey && Object.keys(s.survey).length > 0) {
    lines.push('3. POST-STUDY SURVEY RATINGS');
    lines.push(subSep);
    if (s.survey.tlx) {
      lines.push('  NASA-TLX: ' + JSON.stringify(s.survey.tlx));
    }
    if (s.survey.agency) {
      lines.push('  Agency: ' + JSON.stringify(s.survey.agency));
    }
    if (s.survey.sus) {
      lines.push('  SUS: ' + JSON.stringify(s.survey.sus));
    }
    if (s.survey.comments) {
      lines.push(`  Comments: ${s.survey.comments}`);
    }
    lines.push('');
  }

  lines.push(sep);
  lines.push('\n');
  return lines.join('\n');
}
