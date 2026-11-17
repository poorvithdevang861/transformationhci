import { ExperimentSession, StudyConfig } from './types';

const SESSIONS_KEY = 'ta-sessions-v2';
const CONFIG_KEY = 'ta-config';

export const DEFAULT_CONFIG: StudyConfig = {
  mainSet: 1,
  mainQuestions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  transferSet: 0,
  transferQuestions: [1, 3, 4, 9],
  hintWindows: [20, 20, 20, 20],
  animSeconds: 1.6,
  feedback: true
};

export class LocalStore {
  public static getSessions(): ExperimentSession[] {
    try {
      const data = localStorage.getItem(SESSIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static getNextParticipantId(): string {
    const list = this.getSessions();
    let max = 0;
    for (const s of list) {
      if (!s.id) continue;
      const match = s.id.match(/^P-?ID(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    }
    try {
      const stored = localStorage.getItem('ta-last-pid-idx');
      if (stored) {
        const num = parseInt(stored, 10);
        if (num > max) max = num;
      }
    } catch {}

    const next = max + 1;
    return `P-ID${String(next).padStart(3, '0')}`;
  }

  public static saveSession(session: ExperimentSession) {
    const list = this.getSessions();
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      list[idx] = session;
    } else {
      list.unshift(session); // Insert new session at top
    }
    // Track numeric PID index
    const match = session.id?.match(/^P-?ID(\d+)$/i);
    if (match) {
      try {
        const num = parseInt(match[1], 10);
        const stored = parseInt(localStorage.getItem('ta-last-pid-idx') || '0', 10);
        if (num > stored) {
          localStorage.setItem('ta-last-pid-idx', String(num));
        }
      } catch {}
    }
    // Always sort descending so newest session is at the top
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage full, removing older sessions:', e);
      if (list.length > 5) {
        list.pop(); // Remove oldest from end
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
      }
    }
  }

  public static clearAllSessions() {
    ['ta-sessions-v2', 'ta_sessions', 'ta_results', 'sessions'].forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
    fetch('/api/clear-sessions', { method: 'POST' }).catch(() => {});
  }

  public static getConfig(): StudyConfig {
    try {
      const saved = localStorage.getItem(CONFIG_KEY);
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch {}
    return { ...DEFAULT_CONFIG };
  }

  public static saveConfig(cfg: StudyConfig) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  }
}
