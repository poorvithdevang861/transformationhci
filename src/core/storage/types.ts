import { AoiMetric, GazePoint, Fixation, BoundaryRect } from '../gaze/types';

export interface TrialData {
  idx: number;
  problemIdx: number;
  condition: 'static' | 'animated';
  choice: number | null;
  answer: number;
  correct: boolean;
  timeMs: number;
  hintsUsed: number;
  aoi?: Record<string, AoiMetric>;
  samples?: GazePoint[];
  fixations?: Fixation[];
  boundaries?: Record<string, BoundaryRect>;
}

export interface SurveyRatings {
  mentalEffort?: number;
  tlx?: Record<string, number>;
  agency?: Record<string, number>;
  sus?: Record<string, number>;
  comments?: string;
}

export interface StudyConfig {
  mainSet: number;
  mainQuestions: number[];
  transferSet: number;
  transferQuestions: number[];
  hintWindows: number[];
  animSeconds: number;
  feedback: boolean;
}

export interface ExperimentSession {
  id: string;
  mode: 'static' | 'animation' | 'randomise';
  createdAt: string;
  completedAt?: string;
  eyeTracking: boolean;
  device: {
    type: string;
    w: number;
    h: number;
    touch: boolean;
  };
  config: StudyConfig;
  trials: TrialData[];
  survey: SurveyRatings;
}
