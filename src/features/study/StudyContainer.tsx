import React, { useState } from 'react';
import { ExperimentSession, TrialData } from '../../core/storage/types';
import { LocalStore } from '../../core/storage/local-store';
import { saveResultsToServer } from '../../core/storage/api-client';
import { gazeTracker } from '../../core/gaze/webgazer-service';
import { SETS } from '../../core/geometry/problems';
import { WelcomeStep } from './WelcomeStep';
import { IntroStep } from './IntroStep';
import { PuzzleTrial } from './PuzzleTrial';
import { EffortStep } from './questionnaires/EffortStep';
import { NasaTlxStep } from './questionnaires/NasaTlxStep';
import { AgencyStep } from './questionnaires/AgencyStep';
import { SusStep } from './questionnaires/SusStep';
import { CompletionStep } from './CompletionStep';
import { AppView } from '../../components/common/Header';

interface StudyContainerProps {
  onNavigate: (view: AppView) => void;
}

type StudyStep = 'welcome' | 'intro' | 'trial' | 'effort' | 'tlx' | 'agency' | 'sus' | 'done';

export const StudyContainer: React.FC<StudyContainerProps> = ({ onNavigate }) => {
  const [step, setStep] = useState<StudyStep>('welcome');
  const [session, setSession] = useState<ExperimentSession | null>(null);
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);

  const config = LocalStore.getConfig();
  const mainQuestions = config.mainQuestions;

  const handleStartWelcome = async (pid: string, mode: 'static' | 'animation' | 'randomise', deviceType: string) => {
    const res = await gazeTracker.connectCamera();
    const newSession: ExperimentSession = {
      id: pid,
      mode,
      createdAt: new Date().toISOString(),
      eyeTracking: res.camera,
      device: { type: deviceType, w: window.innerWidth, h: window.innerHeight, touch: 'ontouchstart' in window },
      config,
      trials: [],
      survey: {}
    };
    setSession(newSession);
    LocalStore.saveSession(newSession);
    setStep('intro');
  };

  const handleBeginTrials = () => {
    setTrialIndex(0);
    setTrialStartTime(performance.now());
    gazeTracker.startRecording();
    setStep('trial');
  };

  const handleAnswerTrial = (choice: number, hintsUsed: number) => {
    if (!session) return;
    const qEl = document.querySelector('.qpanel') as HTMLElement | null;
    const gazeRes = gazeTracker.stopRecording(qEl);
    const problemIdx = mainQuestions[trialIndex];
    const correctAns = SETS[config.mainSet].answers[problemIdx];
    const elapsed = Math.round(performance.now() - trialStartTime);

    const trial: TrialData = {
      idx: trialIndex + 1,
      problemIdx,
      condition: session.mode === 'randomise' ? (trialIndex % 2 === 0 ? 'animated' : 'static') : session.mode === 'animation' ? 'animated' : 'static',
      choice,
      answer: correctAns,
      correct: choice === correctAns,
      timeMs: elapsed,
      hintsUsed,
      aoi: gazeRes.aoiMetrics,
      samples: gazeRes.samples,
      fixations: gazeRes.fixations,
      boundaries: gazeRes.boundaries
    };

    const updatedTrials = [...session.trials, trial];
    const updatedSession = { ...session, trials: updatedTrials };
    setSession(updatedSession);
    LocalStore.saveSession(updatedSession);
    saveResultsToServer(updatedSession);

    if (trialIndex + 1 < mainQuestions.length) {
      setTrialIndex((idx) => idx + 1);
      setTrialStartTime(performance.now());
      gazeTracker.startRecording();
    } else {
      setStep('effort');
    }
  };

  const updateSurveyAndNext = (key: keyof ExperimentSession['survey'], val: any, nextStep: StudyStep) => {
    if (!session) return;
    const updated = { ...session, survey: { ...session.survey, [key]: val } };
    if (nextStep === 'done') updated.completedAt = new Date().toISOString();
    setSession(updated);
    LocalStore.saveSession(updated);
    saveResultsToServer(updated);
    setStep(nextStep);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '16px' }}>
      {step === 'welcome' && <WelcomeStep onStart={handleStartWelcome} />}
      {step === 'intro' && session && <IntroStep mode={session.mode} onBegin={handleBeginTrials} />}
      {step === 'trial' && session && (
        <PuzzleTrial
          setIdx={config.mainSet}
          problemIdx={mainQuestions[trialIndex]}
          trialNumber={trialIndex + 1}
          totalTrials={mainQuestions.length}
          condition={session.mode === 'randomise' ? (trialIndex % 2 === 0 ? 'animated' : 'static') : session.mode === 'animation' ? 'animated' : 'static'}
          hintWindows={config.hintWindows}
          animSeconds={config.animSeconds}
          onAnswerConfirmed={handleAnswerTrial}
        />
      )}
      {step === 'effort' && <EffortStep onComplete={(r) => updateSurveyAndNext('mentalEffort', r, 'tlx')} />}
      {step === 'tlx' && <NasaTlxStep onComplete={(tlx) => updateSurveyAndNext('tlx', tlx, 'agency')} />}
      {step === 'agency' && <AgencyStep onComplete={(ag) => updateSurveyAndNext('agency', ag, 'sus')} />}
      {step === 'sus' && <SusStep onComplete={(sus, comments) => {
        if (session) {
          const updated = { ...session, survey: { ...session.survey, sus, comments }, completedAt: new Date().toISOString() };
          setSession(updated);
          LocalStore.saveSession(updated);
          saveResultsToServer(updated);
          setStep('done');
        }
      }} />}
      {step === 'done' && session && (
        <CompletionStep session={session} onNewSession={() => setStep('welcome')} onOpenResearcher={() => onNavigate('researcher')} />
      )}
    </div>
  );
};
