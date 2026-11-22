/**
 * Eye-Gaze Journey & Hint Interaction Analytics Types
 */

export type GazeEventType =
  | 'hint_clicked'
  | 'hint_changed'
  | 'gaze_entered_region'
  | 'gaze_exited_region'
  | 'gaze_transition'
  | 'answer_option_viewed'
  | 'answer_selected'
  | 'puzzle_completed';

export interface GazeJourneyEvent {
  id: string;
  session_id: string;
  participant_id: string;
  puzzle_id: number;
  hint_id: number | null; // e.g. 1, 2, 3 or null before any hint is clicked
  hint_sequence_number: number;
  region_id: string; // e.g. 'hints', 'figA', 'figB', 'figC', 'figD', 'option1', 'option2', 'option3', 'option4', 'chooseD', 'hintControls', 'OUTSIDE_REGION'
  region_name: string;
  timestamp: number; // Unix epoch ms
  elapsed_time: number; // ms since trial start
  event_type: GazeEventType;

  // Transition details (for 'gaze_transition' and 'gaze_exited_region')
  previous_region_id?: string;
  current_region_id?: string;
  dwell_duration_ms?: number;
  time_since_hint_click_ms?: number | null;

  // Additional metadata
  details?: {
    optionNum?: number;
    choice?: number;
    correct?: boolean;
    hintName?: string;
    action?: string;
    x?: number;
    y?: number;
  };
}

export interface TransitionStep {
  fromRegion: string;
  toRegion: string;
  fromName: string;
  toName: string;
  dwellDurationMs: number;
  timeSinceHintClickMs: number | null;
  elapsedMs: number;
  timestamp: number;
  hintId: number | null;
}

export interface HintJourneySummary {
  hint_id: number;
  hint_name: string;
  click_timestamp: number;
  click_elapsed_ms: number;
  path: string[]; // sequence of regions visited
  transitions: TransitionStep[];
  returnsToHintCount: number;
  firstFixationLatencyMs: number | null; // time to first gaze on hint content after click
  dwellTimeOnHintMs: number;
  timeToAnswerMs: number | null;
  finalAnswerChoice: number | null;
  answerCorrect: boolean | null;
}

export interface SankeyNode {
  id: string;
  name: string;
  color: string;
  totalDwellMs: number;
  visitsCount: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface SankeyLink {
  source: string;
  target: string;
  count: number;
  avgDwellMs: number;
  usersCount: number;
  percentage: number;
  isLoop: boolean;
}

export interface HintEffectivenessMetric {
  hintId: number;
  hintName: string;
  openCount: number;
  totalEligibleSessions: number;
  openRatePct: number;
  avgFirstFixationLatencyMs: number;
  avgDwellOnHintMs: number;
  mostFrequentNextRegion: { regionId: string; name: string; count: number; pct: number };
  mostCommonPath: string[];
  avgReturnsToHint: number;
  avgTimeToAnswerMs: number;
  accuracyRateWithHintPct: number;
  accuracyRateWithoutHintPct: number;
}
