import { ExperimentSession } from './types';
import { formatSessionResultsTxt } from './results-formatter';

export async function saveResultsToServer(session: ExperimentSession): Promise<{ ok: boolean; message?: string }> {
  try {
    const txt = formatSessionResultsTxt(session);
    const res = await fetch('/api/save-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: session.id,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
        session,
        txt
      })
    });
    return await res.json();
  } catch (err) {
    console.warn('Backend server not reachable (results saved in browser localStorage):', err);
    return { ok: false, message: 'Server unreachable' };
  }
}

export function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
