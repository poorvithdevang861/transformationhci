import { GazeJourneyEvent, GazeEventType, HintJourneySummary, TransitionStep, SankeyNode, SankeyLink, HintEffectivenessMetric } from './journey-types';
import { AOI_COLOR_MAP } from './aoi-engine';
import { ExperimentSession, TrialData } from '../storage/types';

export interface JourneyTrackerConfig {
  transitionDebounceMs: number; // Duration candidate region must persist to confirm transition
  minFixationDwellMs: number;   // Minimum dwell in ms to record as confirmed fixation
}

const DEFAULT_CONFIG: JourneyTrackerConfig = {
  transitionDebounceMs: 75,
  minFixationDwellMs: 100
};

export class GazeJourneyTracker {
  private config: JourneyTrackerConfig = { ...DEFAULT_CONFIG };

  private isTracking = false;
  private sessionId = '';
  private participantId = '';
  private puzzleId = 0;
  private trialStartTime = 0;

  private currentRegion = 'OUTSIDE_REGION';
  private regionEnterTime = 0;
  private pendingRegion: string | null = null;
  private pendingRegionStartTime = 0;

  private currentHintId: number | null = null;
  private currentHintName: string | null = null;
  private hintSequenceNumber = 0;
  private lastHintClickTime: number | null = null;

  private events: GazeJourneyEvent[] = [];
  private hintJourneys: Map<number, HintJourneySummary> = new Map();

  public setConfig(custom: Partial<JourneyTrackerConfig>) {
    this.config = { ...this.config, ...custom };
  }

  public startTrial(sessionId: string, participantId: string, puzzleId: number) {
    this.isTracking = true;
    this.sessionId = sessionId || 'session';
    this.participantId = participantId || 'P-ID001';
    this.puzzleId = puzzleId;
    this.trialStartTime = performance.now();

    this.currentRegion = 'OUTSIDE_REGION';
    this.regionEnterTime = this.trialStartTime;
    this.pendingRegion = null;
    this.pendingRegionStartTime = 0;

    this.currentHintId = null;
    this.currentHintName = null;
    this.hintSequenceNumber = 0;
    this.lastHintClickTime = null;

    this.events = [];
    this.hintJourneys.clear();
  }

  public processGazePoint(x: number, y: number, targetAoiKey: string) {
    if (!this.isTracking) return;

    const now = performance.now();
    const mappedRegion = this.normalizeRegion(targetAoiKey);

    // If still in the same region, clear pending candidate transition
    if (mappedRegion === this.currentRegion) {
      this.pendingRegion = null;
      return;
    }

    // New candidate region detected
    if (this.pendingRegion !== mappedRegion) {
      this.pendingRegion = mappedRegion;
      this.pendingRegionStartTime = now;
      return;
    }

    // Check debounce threshold to avoid saccade flicker
    const candidateDuration = now - this.pendingRegionStartTime;
    if (candidateDuration >= this.config.transitionDebounceMs) {
      this.confirmTransition(mappedRegion, now, x, y);
    }
  }

  private confirmTransition(newRegion: string, now: number, x?: number, y?: number) {
    const dwellDuration = Math.max(0, Math.round(now - this.regionEnterTime));
    const previousRegion = this.currentRegion;
    const elapsedSinceTrialStart = Math.max(0, Math.round(now - this.trialStartTime));
    const timeSinceHintClick = this.lastHintClickTime ? Math.max(0, Math.round(now - this.lastHintClickTime)) : null;

    // 1. Record exit from previous region
    if (previousRegion !== 'OUTSIDE_REGION' || dwellDuration >= this.config.minFixationDwellMs) {
      this.emitEvent({
        event_type: 'gaze_exited_region',
        region_id: previousRegion,
        region_name: this.getRegionName(previousRegion),
        dwell_duration_ms: dwellDuration,
        time_since_hint_click_ms: timeSinceHintClick,
        elapsed_time: elapsedSinceTrialStart,
        timestamp: Date.now()
      });
    }

    // 2. Record gaze transition
    const transitionEvent = this.emitEvent({
      event_type: 'gaze_transition',
      region_id: newRegion,
      region_name: this.getRegionName(newRegion),
      previous_region_id: previousRegion,
      current_region_id: newRegion,
      dwell_duration_ms: dwellDuration,
      time_since_hint_click_ms: timeSinceHintClick,
      elapsed_time: elapsedSinceTrialStart,
      timestamp: Date.now(),
      details: { x, y }
    });

    // 3. Record entry into new region
    this.emitEvent({
      event_type: 'gaze_entered_region',
      region_id: newRegion,
      region_name: this.getRegionName(newRegion),
      time_since_hint_click_ms: timeSinceHintClick,
      elapsed_time: elapsedSinceTrialStart,
      timestamp: Date.now()
    });

    // 4. If new region is an answer option, record answer_option_viewed
    if (newRegion.startsWith('option')) {
      const optNum = parseInt(newRegion.replace('option', ''), 10);
      this.emitEvent({
        event_type: 'answer_option_viewed',
        region_id: newRegion,
        region_name: this.getRegionName(newRegion),
        time_since_hint_click_ms: timeSinceHintClick,
        elapsed_time: elapsedSinceTrialStart,
        timestamp: Date.now(),
        details: { optionNum: optNum }
      });
    }

    // 5. Update active hint journey if currently under a hint interaction
    if (this.currentHintId !== null) {
      const hintSummary = this.hintJourneys.get(this.currentHintId);
      if (hintSummary) {
        hintSummary.transitions.push({
          fromRegion: previousRegion,
          toRegion: newRegion,
          fromName: this.getRegionName(previousRegion),
          toName: this.getRegionName(newRegion),
          dwellDurationMs: dwellDuration,
          timeSinceHintClickMs: timeSinceHintClick,
          elapsedMs: elapsedSinceTrialStart,
          timestamp: Date.now(),
          hintId: this.currentHintId
        });
        hintSummary.path.push(newRegion);

        // Check return to hint
        if (newRegion === 'hints' || newRegion.startsWith('hint')) {
          if (previousRegion !== 'hints' && !previousRegion.startsWith('hint')) {
            hintSummary.returnsToHintCount += 1;
          }
          hintSummary.dwellTimeOnHintMs += dwellDuration;
          if (hintSummary.firstFixationLatencyMs === null && timeSinceHintClick !== null) {
            hintSummary.firstFixationLatencyMs = timeSinceHintClick;
          }
        }
      }
    }

    this.currentRegion = newRegion;
    this.regionEnterTime = now;
    this.pendingRegion = null;
  }

  public recordHintClick(hintId: number, hintName?: string, action: string = 'click') {
    if (!this.isTracking) return;
    const now = performance.now();
    this.hintSequenceNumber += 1;
    this.currentHintId = hintId;
    this.currentHintName = hintName || `Clue ${hintId}`;
    this.lastHintClickTime = now;

    const elapsed = Math.max(0, Math.round(now - this.trialStartTime));

    // Register new hint journey summary if not already initialized
    if (!this.hintJourneys.has(hintId)) {
      this.hintJourneys.set(hintId, {
        hint_id: hintId,
        hint_name: this.currentHintName,
        click_timestamp: Date.now(),
        click_elapsed_ms: elapsed,
        path: [this.currentRegion],
        transitions: [],
        returnsToHintCount: 0,
        firstFixationLatencyMs: null,
        dwellTimeOnHintMs: 0,
        timeToAnswerMs: null,
        finalAnswerChoice: null,
        answerCorrect: null
      });
    }

    this.emitEvent({
      event_type: 'hint_clicked',
      region_id: this.currentRegion,
      region_name: this.getRegionName(this.currentRegion),
      hint_id: hintId,
      hint_sequence_number: this.hintSequenceNumber,
      time_since_hint_click_ms: 0,
      elapsed_time: elapsed,
      timestamp: Date.now(),
      details: { hintName: this.currentHintName, action }
    });
  }

  public recordHintChange(hintId: number, hintName?: string) {
    if (!this.isTracking) return;
    const now = performance.now();
    this.currentHintId = hintId;
    this.currentHintName = hintName || `Clue ${hintId}`;
    const elapsed = Math.max(0, Math.round(now - this.trialStartTime));

    this.emitEvent({
      event_type: 'hint_changed',
      region_id: this.currentRegion,
      region_name: this.getRegionName(this.currentRegion),
      hint_id: hintId,
      hint_sequence_number: this.hintSequenceNumber,
      time_since_hint_click_ms: this.lastHintClickTime ? Math.max(0, Math.round(now - this.lastHintClickTime)) : null,
      elapsed_time: elapsed,
      timestamp: Date.now(),
      details: { hintName: this.currentHintName }
    });
  }

  public recordAnswerSelected(optionNum: number) {
    if (!this.isTracking) return;
    const now = performance.now();
    const elapsed = Math.max(0, Math.round(now - this.trialStartTime));

    this.emitEvent({
      event_type: 'answer_selected',
      region_id: `option${optionNum}`,
      region_name: `Option ${optionNum}`,
      hint_id: this.currentHintId,
      hint_sequence_number: this.hintSequenceNumber,
      time_since_hint_click_ms: this.lastHintClickTime ? Math.max(0, Math.round(now - this.lastHintClickTime)) : null,
      elapsed_time: elapsed,
      timestamp: Date.now(),
      details: { optionNum }
    });
  }

  public completeTrial(choice: number, correct: boolean): { events: GazeJourneyEvent[]; hintJourneys: HintJourneySummary[] } {
    const now = performance.now();
    const elapsed = Math.max(0, Math.round(now - this.trialStartTime));
    const dwellDuration = Math.max(0, Math.round(now - this.regionEnterTime));

    // Close final dwell
    if (this.currentRegion !== 'OUTSIDE_REGION') {
      this.emitEvent({
        event_type: 'gaze_exited_region',
        region_id: this.currentRegion,
        region_name: this.getRegionName(this.currentRegion),
        dwell_duration_ms: dwellDuration,
        time_since_hint_click_ms: this.lastHintClickTime ? Math.max(0, Math.round(now - this.lastHintClickTime)) : null,
        elapsed_time: elapsed,
        timestamp: Date.now()
      });
    }

    // Emit puzzle_completed
    this.emitEvent({
      event_type: 'puzzle_completed',
      region_id: this.currentRegion,
      region_name: this.getRegionName(this.currentRegion),
      hint_id: this.currentHintId,
      hint_sequence_number: this.hintSequenceNumber,
      time_since_hint_click_ms: this.lastHintClickTime ? Math.max(0, Math.round(now - this.lastHintClickTime)) : null,
      elapsed_time: elapsed,
      timestamp: Date.now(),
      details: { choice, correct }
    });

    // Update hint summaries with final resolution
    const summaries = Array.from(this.hintJourneys.values()).map((s) => ({
      ...s,
      finalAnswerChoice: choice,
      answerCorrect: correct,
      timeToAnswerMs: Math.max(0, elapsed - s.click_elapsed_ms)
    }));

    this.isTracking = false;
    return {
      events: [...this.events],
      hintJourneys: summaries
    };
  }

  private emitEvent(partial: Partial<GazeJourneyEvent> & { event_type: GazeEventType; region_id: string }): GazeJourneyEvent {
    const ev: GazeJourneyEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      session_id: this.sessionId,
      participant_id: this.participantId,
      puzzle_id: this.puzzleId,
      hint_id: this.currentHintId,
      hint_sequence_number: this.hintSequenceNumber,
      region_name: partial.region_name || this.getRegionName(partial.region_id),
      timestamp: partial.timestamp || Date.now(),
      elapsed_time: partial.elapsed_time ?? Math.max(0, Math.round(performance.now() - this.trialStartTime)),
      ...partial
    };
    this.events.push(ev);
    return ev;
  }

  private normalizeRegion(target: string | undefined): string {
    if (!target || target === 'other' || target === 'OUTSIDE_REGION') {
      return 'OUTSIDE_REGION';
    }
    return target;
  }

  private getRegionName(regionId: string): string {
    return AOI_COLOR_MAP[regionId]?.name || (regionId === 'OUTSIDE_REGION' ? 'Outside Boundaries' : regionId);
  }

  // ---------------------------------------------------------------------------
  // Backward compatibility: Synthesize events from historical samples & fixations
  // ---------------------------------------------------------------------------
  public static reconstructFromTrial(trial: TrialData, sessionId: string, participantId: string): {
    events: GazeJourneyEvent[];
    hintJourneys: HintJourneySummary[];
  } {
    if (trial.journeyEvents && trial.journeyEvents.length > 0) {
      return {
        events: trial.journeyEvents,
        hintJourneys: trial.hintJourneys || []
      };
    }

    const events: GazeJourneyEvent[] = [];
    const fixations = trial.fixations || [];
    const samples = trial.samples || [];

    const trialStartTime = 0;
    let hintSeq = 0;
    let currentHintId: number | null = trial.hintsUsed > 0 ? 1 : null;
    let lastHintClickTime: number | null = trial.hintsUsed > 0 ? 1200 : null;

    if (trial.hintsUsed > 0) {
      hintSeq = 1;
      events.push({
        id: `synth-hint-1`,
        session_id: sessionId,
        participant_id: participantId,
        puzzle_id: trial.problemIdx + 1,
        hint_id: 1,
        hint_sequence_number: 1,
        region_id: 'hints',
        region_name: 'Hint Panel',
        timestamp: Date.now() - (trial.timeMs - 1200),
        elapsed_time: 1200,
        event_type: 'hint_clicked',
        time_since_hint_click_ms: 0,
        details: { hintName: 'Clue 1', action: 'click' }
      });
    }

    // Reconstruct transitions from fixations
    let prevRegion = 'OUTSIDE_REGION';
    fixations.forEach((f, idx) => {
      const curRegion = f.target && f.target !== 'other' ? f.target : 'OUTSIDE_REGION';
      if (curRegion !== prevRegion) {
        const timeSinceHint = lastHintClickTime !== null && f.t >= lastHintClickTime ? f.t - lastHintClickTime : null;
        events.push({
          id: `synth-tr-${idx}`,
          session_id: sessionId,
          participant_id: participantId,
          puzzle_id: trial.problemIdx + 1,
          hint_id: currentHintId,
          hint_sequence_number: hintSeq,
          region_id: curRegion,
          region_name: AOI_COLOR_MAP[curRegion]?.name || curRegion,
          previous_region_id: prevRegion,
          current_region_id: curRegion,
          dwell_duration_ms: f.duration,
          time_since_hint_click_ms: timeSinceHint,
          elapsed_time: f.t,
          timestamp: Date.now() - (trial.timeMs - f.t),
          event_type: 'gaze_transition',
          details: { x: f.x, y: f.y }
        });

        if (curRegion.startsWith('option')) {
          events.push({
            id: `synth-opt-view-${idx}`,
            session_id: sessionId,
            participant_id: participantId,
            puzzle_id: trial.problemIdx + 1,
            hint_id: currentHintId,
            hint_sequence_number: hintSeq,
            region_id: curRegion,
            region_name: AOI_COLOR_MAP[curRegion]?.name || curRegion,
            elapsed_time: f.t,
            timestamp: Date.now() - (trial.timeMs - f.t),
            event_type: 'answer_option_viewed',
            time_since_hint_click_ms: timeSinceHint,
            details: { optionNum: parseInt(curRegion.replace('option', ''), 10) }
          });
        }
        prevRegion = curRegion;
      }
    });

    // Add answer selected & completed
    if (trial.choice !== null) {
      events.push({
        id: `synth-ans-sel`,
        session_id: sessionId,
        participant_id: participantId,
        puzzle_id: trial.problemIdx + 1,
        hint_id: currentHintId,
        hint_sequence_number: hintSeq,
        region_id: `option${trial.choice}`,
        region_name: `Option ${trial.choice}`,
        elapsed_time: Math.max(10, trial.timeMs - 500),
        timestamp: Date.now() - 500,
        event_type: 'answer_selected',
        details: { optionNum: trial.choice }
      });
    }

    events.push({
      id: `synth-puz-comp`,
      session_id: sessionId,
      participant_id: participantId,
      puzzle_id: trial.problemIdx + 1,
      hint_id: currentHintId,
      hint_sequence_number: hintSeq,
      region_id: prevRegion,
      region_name: AOI_COLOR_MAP[prevRegion]?.name || prevRegion,
      elapsed_time: trial.timeMs,
      timestamp: Date.now(),
      event_type: 'puzzle_completed',
      details: { choice: trial.choice ?? undefined, correct: trial.correct }
    });

    const hintSummary: HintJourneySummary[] = trial.hintsUsed > 0 ? [
      {
        hint_id: 1,
        hint_name: 'Clue 1',
        click_timestamp: Date.now() - trial.timeMs,
        click_elapsed_ms: 1200,
        path: events.filter(e => e.event_type === 'gaze_transition').map(e => e.region_id),
        transitions: events.filter(e => e.event_type === 'gaze_transition').map(e => ({
          fromRegion: e.previous_region_id || 'OUTSIDE_REGION',
          toRegion: e.current_region_id || e.region_id,
          fromName: AOI_COLOR_MAP[e.previous_region_id || '']?.name || 'Outside Boundaries',
          toName: e.region_name,
          dwellDurationMs: e.dwell_duration_ms || 150,
          timeSinceHintClickMs: e.time_since_hint_click_ms ?? null,
          elapsedMs: e.elapsed_time,
          timestamp: e.timestamp,
          hintId: 1
        })),
        returnsToHintCount: events.filter(e => e.event_type === 'gaze_transition' && e.region_id === 'hints').length,
        firstFixationLatencyMs: 340,
        dwellTimeOnHintMs: trial.aoi?.hints?.dwellTimeMs || 1200,
        timeToAnswerMs: Math.max(0, trial.timeMs - 1200),
        finalAnswerChoice: trial.choice,
        answerCorrect: trial.correct
      }
    ] : [];

    return { events, hintJourneys: hintSummary };
  }

  // ---------------------------------------------------------------------------
  // Aggregate Sankey Node-Link Diagram Generator
  // ---------------------------------------------------------------------------
  public static computeSankeyData(
    sessions: ExperimentSession[],
    filter?: { puzzleId?: number | 'all'; hintId?: number | 'all'; participantId?: string | 'all' }
  ): { nodes: SankeyNode[]; links: SankeyLink[] } {
    const nodeMap: Map<string, { totalDwell: number; visits: number }> = new Map();
    const linkMap: Map<string, { count: number; totalDwell: number; users: Set<string> }> = new Map();

    sessions.forEach((s) => {
      if (filter?.participantId && filter.participantId !== 'all' && s.id !== filter.participantId) {
        return;
      }

      s.trials.forEach((t) => {
        const pId = t.problemIdx + 1;
        if (filter?.puzzleId && filter.puzzleId !== 'all' && pId !== Number(filter.puzzleId)) {
          return;
        }

        const { events } = GazeJourneyTracker.reconstructFromTrial(t, s.id, s.id);

        let filteredEvents = events;
        if (filter?.hintId && filter.hintId !== 'all') {
          filteredEvents = events.filter((e) => e.hint_id === Number(filter.hintId));
        }

        const transitions = filteredEvents.filter((e) => e.event_type === 'gaze_transition');

        transitions.forEach((tr) => {
          const from = tr.previous_region_id || 'OUTSIDE_REGION';
          const to = tr.current_region_id || tr.region_id;
          const dwell = tr.dwell_duration_ms || 100;

          // Record nodes
          [from, to].forEach((r) => {
            const cur = nodeMap.get(r) || { totalDwell: 0, visits: 0 };
            cur.totalDwell += dwell / 2;
            cur.visits += 1;
            nodeMap.set(r, cur);
          });

          // Record link
          const key = `${from}-->${to}`;
          const curLink = linkMap.get(key) || { count: 0, totalDwell: 0, users: new Set<string>() };
          curLink.count += 1;
          curLink.totalDwell += dwell;
          curLink.users.add(s.id);
          linkMap.set(key, curLink);
        });
      });
    });

    const totalTransitions = Array.from(linkMap.values()).reduce((acc, l) => acc + l.count, 0) || 1;

    // Build node list
    const nodes: SankeyNode[] = Array.from(nodeMap.entries()).map(([id, d]) => ({
      id,
      name: AOI_COLOR_MAP[id]?.name || (id === 'OUTSIDE_REGION' ? 'Outside Boundaries' : id),
      color: AOI_COLOR_MAP[id]?.color || '#94a3b8',
      totalDwellMs: Math.round(d.totalDwell),
      visitsCount: d.visits
    }));

    // Build link list sorted by frequency
    const links: SankeyLink[] = Array.from(linkMap.entries()).map(([key, d]) => {
      const [source, target] = key.split('-->');
      return {
        source,
        target,
        count: d.count,
        avgDwellMs: Math.round(d.totalDwell / d.count),
        usersCount: d.users.size,
        percentage: Math.round((d.count / totalTransitions) * 1000) / 10,
        isLoop: source === target
      };
    }).sort((a, b) => b.count - a.count);

    return { nodes, links };
  }

  // ---------------------------------------------------------------------------
  // Hint Effectiveness Metric Calculator
  // ---------------------------------------------------------------------------
  public static computeHintEffectiveness(sessions: ExperimentSession[]): HintEffectivenessMetric[] {
    const hintStats = new Map<number, {
      hintId: number;
      hintName: string;
      openCount: number;
      totalEligibleSessions: number;
      latencies: number[];
      dwellTimes: number[];
      nextRegions: Map<string, number>;
      paths: Map<string, number>;
      returnsCount: number[];
      timesToAnswer: number[];
      correctCountWithHint: number;
      totalWithHint: number;
    }>();

    let totalWithoutHintCorrect = 0;
    let totalWithoutHint = 0;

    sessions.forEach((s) => {
      s.trials.forEach((t) => {
        const { hintJourneys } = GazeJourneyTracker.reconstructFromTrial(t, s.id, s.id);

        if (t.hintsUsed === 0) {
          totalWithoutHint += 1;
          if (t.correct) totalWithoutHintCorrect += 1;
        }

        hintJourneys.forEach((hj) => {
          const hId = hj.hint_id;
          let entry = hintStats.get(hId);
          if (!entry) {
            entry = {
              hintId: hId,
              hintName: hj.hint_name || `Clue ${hId}`,
              openCount: 0,
              totalEligibleSessions: 0,
              latencies: [],
              dwellTimes: [],
              nextRegions: new Map(),
              paths: new Map(),
              returnsCount: [],
              timesToAnswer: [],
              correctCountWithHint: 0,
              totalWithHint: 0
            };
            hintStats.set(hId, entry);
          }

          entry.openCount += 1;
          entry.totalWithHint += 1;
          if (t.correct) entry.correctCountWithHint += 1;

          if (hj.firstFixationLatencyMs !== null) {
            entry.latencies.push(hj.firstFixationLatencyMs);
          }
          entry.dwellTimes.push(hj.dwellTimeOnHintMs);
          entry.returnsCount.push(hj.returnsToHintCount);
          if (hj.timeToAnswerMs !== null) {
            entry.timesToAnswer.push(hj.timeToAnswerMs);
          }

          // Next visited region after opening hint
          if (hj.path.length > 1) {
            const nextReg = hj.path[1];
            entry.nextRegions.set(nextReg, (entry.nextRegions.get(nextReg) || 0) + 1);
          }

          // Common path sequence (up to 4 regions)
          const pathKey = hj.path.slice(0, 4).join(' → ');
          if (pathKey) {
            entry.paths.set(pathKey, (entry.paths.get(pathKey) || 0) + 1);
          }
        });
      });
    });

    const totalEligible = sessions.reduce((acc, s) => acc + s.trials.length, 0) || 1;
    const accuracyWithoutHint = totalWithoutHint > 0 ? Math.round((totalWithoutHintCorrect / totalWithoutHint) * 100) : 0;

    return Array.from(hintStats.values()).map((entry) => {
      const avgLat = entry.latencies.length > 0
        ? Math.round(entry.latencies.reduce((a, b) => a + b, 0) / entry.latencies.length)
        : 0;
      const avgDwell = entry.dwellTimes.length > 0
        ? Math.round(entry.dwellTimes.reduce((a, b) => a + b, 0) / entry.dwellTimes.length)
        : 0;
      const avgRet = entry.returnsCount.length > 0
        ? Math.round((entry.returnsCount.reduce((a, b) => a + b, 0) / entry.returnsCount.length) * 10) / 10
        : 0;
      const avgTimeAns = entry.timesToAnswer.length > 0
        ? Math.round(entry.timesToAnswer.reduce((a, b) => a + b, 0) / entry.timesToAnswer.length)
        : 0;

      // Find most frequent next region
      let topRegion = { regionId: 'figB', name: 'Figure B', count: 0, pct: 0 };
      let maxRegionCount = 0;
      entry.nextRegions.forEach((cnt, reg) => {
        if (cnt > maxRegionCount) {
          maxRegionCount = cnt;
          topRegion = {
            regionId: reg,
            name: AOI_COLOR_MAP[reg]?.name || reg,
            count: cnt,
            pct: Math.round((cnt / entry.openCount) * 100)
          };
        }
      });

      // Find most common path
      let topPath: string[] = ['hints', 'figB', 'chooseD', 'option2'];
      let maxPathCount = 0;
      entry.paths.forEach((cnt, pathStr) => {
        if (cnt > maxPathCount) {
          maxPathCount = cnt;
          topPath = pathStr.split(' → ');
        }
      });

      const accWithHint = entry.totalWithHint > 0
        ? Math.round((entry.correctCountWithHint / entry.totalWithHint) * 100)
        : 0;

      return {
        hintId: entry.hintId,
        hintName: entry.hintName,
        openCount: entry.openCount,
        totalEligibleSessions: totalEligible,
        openRatePct: Math.round((entry.openCount / totalEligible) * 100),
        avgFirstFixationLatencyMs: avgLat,
        avgDwellOnHintMs: avgDwell,
        mostFrequentNextRegion: topRegion,
        mostCommonPath: topPath,
        avgReturnsToHint: avgRet,
        avgTimeToAnswerMs: avgTimeAns,
        accuracyRateWithHintPct: accWithHint,
        accuracyRateWithoutHintPct: accuracyWithoutHint
      };
    }).sort((a, b) => a.hintId - b.hintId);
  }

  // ---------------------------------------------------------------------------
  // Isolated Sample Journey Dataset for Development & Demo
  // ---------------------------------------------------------------------------
  public static generateSampleJourneySession(): ExperimentSession {
    const now = Date.now();
    return {
      id: 'P-ID001-DEMO',
      mode: 'animation',
      createdAt: new Date(now - 3600000).toISOString(),
      completedAt: new Date(now - 3000000).toISOString(),
      eyeTracking: true,
      device: { type: 'Desktop Chrome (1920x1080)', w: 1920, h: 1080, touch: false },
      config: {
        mainSet: 1,
        mainQuestions: [0, 1, 2, 3],
        transferSet: 0,
        transferQuestions: [1, 3],
        hintWindows: [20, 20, 20, 20],
        animSeconds: 1.6,
        feedback: true
      },
      survey: { mentalEffort: 3, comments: 'Interactive hints made step-by-step transformations intuitive!' },
      trials: [
        {
          idx: 1,
          problemIdx: 0,
          condition: 'animated',
          choice: 2,
          answer: 2,
          correct: true,
          timeMs: 14200,
          hintsUsed: 2,
          aoi: {
            figA: { name: 'Figure A', dwellTimeMs: 2400, fixationsCount: 8, pctTotal: 16.9, ttffMs: 120 },
            figB: { name: 'Figure B', dwellTimeMs: 3100, fixationsCount: 11, pctTotal: 21.8, ttffMs: 580 },
            figC: { name: 'Figure C', dwellTimeMs: 1900, fixationsCount: 6, pctTotal: 13.4, ttffMs: 1100 },
            figD: { name: 'Figure D (Target ?)', dwellTimeMs: 1200, fixationsCount: 4, pctTotal: 8.5, ttffMs: 2200 },
            chooseD: { name: 'Answer Choices Area', dwellTimeMs: 1600, fixationsCount: 5, pctTotal: 11.3, ttffMs: 4100 },
            option1: { name: 'Option 1', dwellTimeMs: 650, fixationsCount: 2, pctTotal: 4.6, ttffMs: 4600 },
            option2: { name: 'Option 2', dwellTimeMs: 1850, fixationsCount: 6, pctTotal: 13.0, ttffMs: 5100 },
            option3: { name: 'Option 3', dwellTimeMs: 420, fixationsCount: 1, pctTotal: 3.0, ttffMs: 6200 },
            option4: { name: 'Option 4', dwellTimeMs: 380, fixationsCount: 1, pctTotal: 2.7, ttffMs: 6800 },
            hints: { name: 'Hint Panel', dwellTimeMs: 3200, fixationsCount: 9, pctTotal: 22.5, ttffMs: 2600 },
            OUTSIDE_REGION: { name: 'Outside Boundaries', dwellTimeMs: 600, fixationsCount: 2, pctTotal: 4.2, ttffMs: 0 }
          },
          journeyEvents: [
            {
              id: 'ev-1',
              session_id: 'P-ID001-DEMO',
              participant_id: 'P-ID001',
              puzzle_id: 1,
              hint_id: null,
              hint_sequence_number: 0,
              region_id: 'figA',
              region_name: 'Figure A',
              timestamp: now - 14000,
              elapsed_time: 120,
              event_type: 'gaze_entered_region'
            },
            {
              id: 'ev-2',
              session_id: 'P-ID001-DEMO',
              participant_id: 'P-ID001',
              puzzle_id: 1,
              hint_id: null,
              hint_sequence_number: 0,
              region_id: 'figB',
              region_name: 'Figure B',
              previous_region_id: 'figA',
              current_region_id: 'figB',
              dwell_duration_ms: 1100,
              time_since_hint_click_ms: null,
              timestamp: now - 12780,
              elapsed_time: 1220,
              event_type: 'gaze_transition'
            },
            {
              id: 'ev-3',
              session_id: 'P-ID001-DEMO',
              participant_id: 'P-ID001',
              puzzle_id: 1,
              hint_id: 1,
              hint_sequence_number: 1,
              region_id: 'hints',
              region_name: 'Hint Panel',
              timestamp: now - 11600,
              elapsed_time: 2400,
              event_type: 'hint_clicked',
              time_since_hint_click_ms: 0,
              details: { hintName: 'Clue 1: Left Shape', action: 'reveal' }
            },
            {
              id: 'ev-4',
              session_id: 'P-ID001-DEMO',
              participant_id: 'P-ID001',
              puzzle_id: 1,
              hint_id: 1,
              hint_sequence_number: 1,
              region_id: 'hints',
              region_name: 'Hint Panel',
              previous_region_id: 'figB',
              current_region_id: 'hints',
              dwell_duration_ms: 1350,
              time_since_hint_click_ms: 80,
              timestamp: now - 11520,
              elapsed_time: 2480,
              event_type: 'gaze_transition'
            },
            {
              id: 'ev-5',
              session_id: 'P-ID001-DEMO',
              participant_id: 'P-ID001',
              puzzle_id: 1,
              hint_id: 1,
              hint_sequence_number: 1,
              region_id: 'figB',
              region_name: 'Figure B',
              previous_region_id: 'hints',
              current_region_id: 'figB',
              dwell_duration_ms: 1800,
              time_since_hint_click_ms: 1880,
              timestamp: now - 9720,
              elapsed_time: 4280,
              event_type: 'gaze_transition'
            },
            {
              id: 'ev-6',
              session_id: 'P-ID001-DEMO',
              participant_id: 'P-ID001',
              puzzle_id: 1,
              hint_id: 1,
              hint_sequence_number: 1,
              region_id: 'figC',
              region_name: 'Figure C',
              previous_region_id: 'figB',
              current_region_id: 'figC',
              dwell_duration_ms: 1250,
              time_since_hint_click_ms: 3130,
              timestamp: now - 8470,
              elapsed_time: 5530,
              event_type: 'gaze_transition'
            },
            {
              id: 'ev-7',
              session_id: 'P-ID001-DEMO',
              participant_id: 'P-ID001',
              puzzle_id: 1,
              hint_id: 2,
              hint_sequence_number: 2,
              region_id: 'hints',
              region_name: 'Hint Panel',
              timestamp: now - 7200,
              elapsed_time: 6800,
              event_type: 'hint_clicked',
              time_since_hint_click_ms: 0,
              details: { hintName: 'Clue 2: Right Shape', action: 'next' }
            },
            {
              id: 'ev-8',
              session_id: 'P-ID001-DEMO',
              participant_id: 'P-ID001',
              puzzle_id: 1,
              hint_id: 2,
              hint_sequence_number: 2,
              region_id: 'hints',
              region_name: 'Hint Panel',
              previous_region_id: 'figC',
              current_region_id: 'hints',
              dwell_duration_ms: 1400,
              time_since_hint_click_ms: 120,
              timestamp: now - 7080,
              elapsed_time: 6920,
              event_type: 'gaze_transition'
            },
            {
              id: 'ev-9',
              session_id: 'P-ID001-DEMO',
              participant_id: 'P-ID001',
              puzzle_id: 1,
              hint_id: 2,
              hint_sequence_number: 2,
              region_id: 'chooseD',
              region_name: 'Answer Choices Area',
              previous_region_id: 'hints',
              current_region_id: 'chooseD',
              dwell_duration_ms: 850,
              time_since_hint_click_ms: 1520,
              timestamp: now - 5680,
              elapsed_time: 8320,
              event_type: 'gaze_transition'
            },
            {
              id: 'ev-10',
              session_id: 'P-ID001-DEMO',
              participant_id: 'P-ID001',
              puzzle_id: 1,
              hint_id: 2,
              hint_sequence_number: 2,
              region_id: 'option1',
              region_name: 'Option 1',
              previous_region_id: 'chooseD',
              current_region_id: 'option1',
              dwell_duration_ms: 650,
              time_since_hint_click_ms: 2170,
              timestamp: now - 5030,
              elapsed_time: 8970,
              event_type: 'gaze_transition'
            },
            {
              id: 'ev-11',
              session_id: 'P-ID001-DEMO',
              participant_id: 'P-ID001',
              puzzle_id: 1,
              hint_id: 2,
              hint_sequence_number: 2,
              region_id: 'option1',
              region_name: 'Option 1',
              timestamp: now - 5030,
              elapsed_time: 8970,
              event_type: 'answer_option_viewed',
              time_since_hint_click_ms: 2170,
              details: { optionNum: 1 }
            },
            {
              id: 'ev-12',
              session_id: 'P-ID001-DEMO',
              participant_id: 'P-ID001',
              puzzle_id: 1,
              hint_id: 2,
              hint_sequence_number: 2,
              region_id: 'option2',
              region_name: 'Option 2',
              previous_region_id: 'option1',
              current_region_id: 'option2',
              dwell_duration_ms: 1850,
              time_since_hint_click_ms: 4020,
              timestamp: now - 3180,
              elapsed_time: 10820,
              event_type: 'gaze_transition'
            },
            {
              id: 'ev-13',
              session_id: 'P-ID001-DEMO',
              participant_id: 'P-ID001',
              puzzle_id: 1,
              hint_id: 2,
              hint_sequence_number: 2,
              region_id: 'option2',
              region_name: 'Option 2',
              timestamp: now - 3180,
              elapsed_time: 10820,
              event_type: 'answer_option_viewed',
              time_since_hint_click_ms: 4020,
              details: { optionNum: 2 }
            },
            {
              id: 'ev-14',
              session_id: 'P-ID001-DEMO',
              participant_id: 'P-ID001',
              puzzle_id: 1,
              hint_id: 2,
              hint_sequence_number: 2,
              region_id: 'option2',
              region_name: 'Option 2',
              timestamp: now - 1800,
              elapsed_time: 12200,
              event_type: 'answer_selected',
              time_since_hint_click_ms: 5400,
              details: { optionNum: 2 }
            },
            {
              id: 'ev-15',
              session_id: 'P-ID001-DEMO',
              participant_id: 'P-ID001',
              puzzle_id: 1,
              hint_id: 2,
              hint_sequence_number: 2,
              region_id: 'option2',
              region_name: 'Option 2',
              timestamp: now,
              elapsed_time: 14000,
              event_type: 'puzzle_completed',
              time_since_hint_click_ms: 7200,
              details: { choice: 2, correct: true }
            }
          ],
          hintJourneys: [
            {
              hint_id: 1,
              hint_name: 'Clue 1: Left Shape',
              click_timestamp: now - 11600,
              click_elapsed_ms: 2400,
              path: ['hints', 'figB', 'figC'],
              transitions: [
                {
                  fromRegion: 'figB',
                  toRegion: 'hints',
                  fromName: 'Figure B',
                  toName: 'Hint Panel',
                  dwellDurationMs: 1350,
                  timeSinceHintClickMs: 80,
                  elapsedMs: 2480,
                  timestamp: now - 11520,
                  hintId: 1
                },
                {
                  fromRegion: 'hints',
                  toRegion: 'figB',
                  fromName: 'Hint Panel',
                  toName: 'Figure B',
                  dwellDurationMs: 1800,
                  timeSinceHintClickMs: 1880,
                  elapsedMs: 4280,
                  timestamp: now - 9720,
                  hintId: 1
                },
                {
                  fromRegion: 'figB',
                  toRegion: 'figC',
                  fromName: 'Figure B',
                  toName: 'Figure C',
                  dwellDurationMs: 1250,
                  timeSinceHintClickMs: 3130,
                  elapsedMs: 5530,
                  timestamp: now - 8470,
                  hintId: 1
                }
              ],
              returnsToHintCount: 1,
              firstFixationLatencyMs: 80,
              dwellTimeOnHintMs: 1800,
              timeToAnswerMs: 9800,
              finalAnswerChoice: 2,
              answerCorrect: true
            },
            {
              hint_id: 2,
              hint_name: 'Clue 2: Right Shape',
              click_timestamp: now - 7200,
              click_elapsed_ms: 6800,
              path: ['hints', 'chooseD', 'option1', 'option2'],
              transitions: [
                {
                  fromRegion: 'figC',
                  toRegion: 'hints',
                  fromName: 'Figure C',
                  toName: 'Hint Panel',
                  dwellDurationMs: 1400,
                  timeSinceHintClickMs: 120,
                  elapsedMs: 6920,
                  timestamp: now - 7080,
                  hintId: 2
                },
                {
                  fromRegion: 'hints',
                  toRegion: 'chooseD',
                  fromName: 'Hint Panel',
                  toName: 'Answer Choices Area',
                  dwellDurationMs: 850,
                  timeSinceHintClickMs: 1520,
                  elapsedMs: 8320,
                  timestamp: now - 5680,
                  hintId: 2
                },
                {
                  fromRegion: 'chooseD',
                  toRegion: 'option1',
                  fromName: 'Answer Choices Area',
                  toName: 'Option 1',
                  dwellDurationMs: 650,
                  timeSinceHintClickMs: 2170,
                  elapsedMs: 8970,
                  timestamp: now - 5030,
                  hintId: 2
                },
                {
                  fromRegion: 'option1',
                  toRegion: 'option2',
                  fromName: 'Option 1',
                  toName: 'Option 2',
                  dwellDurationMs: 1850,
                  timeSinceHintClickMs: 4020,
                  elapsedMs: 10820,
                  timestamp: now - 3180,
                  hintId: 2
                }
              ],
              returnsToHintCount: 0,
              firstFixationLatencyMs: 120,
              dwellTimeOnHintMs: 1400,
              timeToAnswerMs: 5400,
              finalAnswerChoice: 2,
              answerCorrect: true
            }
          ]
        }
      ]
    };
  }
}

export const journeyTracker = new GazeJourneyTracker();
