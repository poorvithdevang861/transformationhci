import { ExperimentSession } from './types';

export function exportGazeCsv(sessions: ExperimentSession[]): string {
  const header = 'session_id,trial_idx,timestamp_ms,x,y,target_aoi\n';
  const rows: string[] = [];
  sessions.forEach((s) => {
    s.trials.forEach((t) => {
      if (t.samples) {
        t.samples.forEach((pt) => {
          rows.push(`${s.id},${t.idx},${pt.t},${pt.x},${pt.y},"${pt.target || ''}"`);
        });
      }
    });
  });
  return header + rows.join('\n');
}

export function exportTrialsCsv(sessions: ExperimentSession[]): string {
  const header = 'session_id,trial_idx,problem_idx,condition,choice,answer,correct,time_ms,hints_used\n';
  const rows: string[] = [];
  sessions.forEach((s) => {
    s.trials.forEach((t) => {
      rows.push(`${s.id},${t.idx},${t.problemIdx},${t.condition},${t.choice ?? ''},${t.answer},${t.correct},${t.timeMs},${t.hintsUsed}`);
    });
  });
  return header + rows.join('\n');
}

export function exportSessionsCsv(sessions: ExperimentSession[]): string {
  const header = 'session_id,mode,created_at,completed_at,trials_count,accuracy,mean_time_s,mean_effort,tlx_score,sus_score\n';
  const rows: string[] = [];
  sessions.forEach((s) => {
    const trials = s.trials || [];
    const n = trials.length;
    const correct = trials.filter((t) => t.correct).length;
    const acc = n > 0 ? (correct / n).toFixed(2) : '';
    const meanTime = n > 0 ? (trials.reduce((acc, t) => acc + t.timeMs, 0) / n / 1000).toFixed(2) : '';
    const effort = s.survey.mentalEffort ?? '';
    const tlx = s.survey.tlx ? Object.values(s.survey.tlx).reduce((a, b) => a + b, 0) / 6 : '';
    const sus = s.survey.sus ? Object.values(s.survey.sus).reduce((a, b) => a + b, 0) * 2.5 : '';
    rows.push(`${s.id},${s.mode},"${s.createdAt}","${s.completedAt ?? ''}",${n},${acc},${meanTime},${effort},${tlx ? tlx.toFixed(1) : ''},${sus ? sus.toFixed(1) : ''}`);
  });
  return header + rows.join('\n');
}
