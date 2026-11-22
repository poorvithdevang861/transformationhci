import React, { useState, useEffect } from 'react';
import { SETS } from '../../core/geometry/problems';
import { parseSpec } from '../../core/geometry/spec-parser';
import { PuzzleFigures } from './PuzzleFigures';
import { CandidatePicker } from './CandidatePicker';
import { HintPlayer } from './HintPlayer';
import { Icon } from '../../components/common/Icon';
import { CalibrationModal } from './CalibrationModal';
import { Modal } from '../../components/common/Modal';
import { journeyTracker } from '../../core/gaze/journey-tracker';

interface PuzzleTrialProps {
  setIdx: number;
  problemIdx: number;
  trialNumber: number;
  totalTrials: number;
  condition: 'static' | 'animated';
  hintWindows?: number[];
  animSeconds?: number;
  onAnswerConfirmed: (choice: number, hintsUsed: number) => void;
  onExitStudy?: () => void;
}

export const PuzzleTrial: React.FC<PuzzleTrialProps> = ({
  setIdx,
  problemIdx,
  trialNumber,
  totalTrials,
  condition,
  hintWindows = [20, 20, 20, 20],
  animSeconds = 1.6,
  onAnswerConfirmed,
  onExitStudy
}) => {
  const currentSet = SETS[setIdx] || SETS[0];
  const specString = currentSet.specs[problemIdx] || currentSet.specs[0];
  const spec = parseSpec(specString);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showBoundaries, setShowBoundaries] = useState(false);
  const [showCalibModal, setShowCalibModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  useEffect(() => {
    setSelectedOption(null);
    setHintsUsed(0);
  }, [problemIdx, setIdx]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Trial Status & Calibration Header (Boundaries strictly hidden from participant) */}
      <div
        className="edge"
        style={{
          background: 'var(--sunken)',
          padding: '6px 14px',
          borderRadius: '10px',
          border: '1px solid var(--line)',
          fontSize: '0.82rem',
          minHeight: '36px'
        }}
      >
        <div className="l" style={{ gap: '10px', alignItems: 'center' }}>
          {onExitStudy && (
            <button
              type="button"
              className="ibtn tb"
              onClick={onExitStudy}
              style={{ height: '26px', fontSize: '0.76rem', padding: '0 8px', borderRadius: '6px' }}
              title="Exit study session and return to home"
            >
              <Icon name="i-arrow-left" size="sm" />
              <span>Exit</span>
            </button>
          )}
          <span className="eyebrow" style={{ margin: 0, fontWeight: 600 }}>
            Trial {trialNumber} of {totalTrials}
          </span>
          <span style={{ color: 'var(--line-strong)' }}>|</span>
          <span className="meta" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span className="live-dot" />
            <span>Eye tracking active</span>
          </span>
        </div>

        <div className="r" style={{ gap: '8px' }}>
          <button
            type="button"
            className={`ibtn tb ${showBoundaries ? 'active' : ''}`}
            style={{
              height: '28px',
              fontSize: '0.78rem',
              padding: '0 10px',
              borderRadius: '7px',
              background: showBoundaries ? 'var(--raised)' : undefined,
              borderColor: showBoundaries ? 'var(--ink)' : undefined
            }}
            onClick={() => setShowBoundaries((prev) => !prev)}
            title="Toggle defined Area of Interest (AOI) boundaries"
          >
            <Icon name="i-layers" size="sm" />
            <span>Boundaries</span>
          </button>
          <button
            type="button"
            className="ibtn tb"
            style={{ height: '28px', fontSize: '0.78rem', padding: '0 10px', borderRadius: '7px' }}
            onClick={() => setShowInstructionsModal(true)}
            title="Review study instructions"
          >
            <Icon name="i-book-open" size="sm" />
            <span>Instructions</span>
          </button>
          <button
            type="button"
            className="ibtn tb"
            style={{ height: '28px', fontSize: '0.78rem', padding: '0 10px', borderRadius: '7px' }}
            onClick={() => setShowCalibModal(true)}
            title="Recalibrate 9-point eye tracker"
          >
            <Icon name="i-target" size="sm" />
            <span>Calibrate</span>
          </button>
        </div>
      </div>

      {/* Main Study Grid with calibrated AOI boundaries */}
      <div
        className={`qgrid ${showBoundaries ? 'show-mapped-boundaries' : ''}`}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.95fr)',
          gap: '16px',
          alignItems: 'stretch'
        }}
      >
        <section className="panel qpanel" style={{ minWidth: 0 }}>
          <div className="phead" style={{ marginBottom: '12px' }}>
            <div>
              <span className="eyebrow">Problem {trialNumber}</span>
              <h2 className="ptitle">Which figure completes A : B :: C : ?</h2>
            </div>
            <span className="pill">
              <Icon name={condition === 'animated' ? 'i-puzzle-anim' : 'i-puzzle-static'} size="sm" />
              {condition === 'animated' ? 'Animated' : 'Static'}
            </span>
          </div>

          <PuzzleFigures
            spec={spec}
            condition={condition}
            set={currentSet}
            problemIdx={problemIdx}
          />

          <CandidatePicker
            set={currentSet}
            problemIdx={problemIdx}
            selectedOption={selectedOption}
            onSelectOption={(num) => {
              setSelectedOption(num);
              journeyTracker.recordAnswerSelected(num);
            }}
          />

          <div className="edge" style={{ marginTop: '16px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
            <div className="l meta">
              <Icon name="i-pointer" size="sm" />
              <span>{selectedOption ? `Option ${selectedOption} selected` : 'Select an option to confirm'}</span>
            </div>
            <div className="r">
              <button
                type="button"
                className="ibtn tb primary"
                disabled={selectedOption === null}
                onClick={() => selectedOption !== null && onAnswerConfirmed(selectedOption, hintsUsed)}
                style={{ borderRadius: '8px' }}
              >
                <Icon name="i-check" />
                <span>Confirm answer</span>
              </button>
            </div>
          </div>
        </section>

        <section style={{ minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <HintPlayer
            spec={spec}
            condition={condition}
            windows={hintWindows}
            animSeconds={animSeconds}
            onHintsChanged={setHintsUsed}
            onHintAction={(action, hintIdx) => {
              const hintNum = hintIdx + 1;
              const hintName = `Clue ${hintNum}`;
              if (action === 'reveal' || action === 'select' || action === 'next') {
                journeyTracker.recordHintClick(hintNum, hintName, action);
              } else {
                journeyTracker.recordHintChange(hintNum, hintName);
              }
            }}
          />
        </section>
      </div>

      {showCalibModal && (
        <CalibrationModal
          isOpen={showCalibModal}
          onClose={() => setShowCalibModal(false)}
        />
      )}

      {showInstructionsModal && (
        <Modal
          isOpen={showInstructionsModal}
          onClose={() => setShowInstructionsModal(false)}
          title="Visual Reasoning Procedure"
          eyebrow="Study instructions"
          width="540px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              You are solving 10 geometric analogy puzzles. Infer how Figure A transforms into Figure B, and apply the same rules to Figure C.
            </p>

            <div
              style={{
                background: 'var(--sunken)',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>1.</span>
                <span style={{ color: 'var(--fg)', lineHeight: 1.45 }}>
                  Observe figures <b>A</b>, <b>B</b>, and <b>C</b> on the left screen.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>2.</span>
                <span style={{ color: 'var(--fg)', lineHeight: 1.45 }}>
                  Use the transformation clues on the right if you need guidance.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>3.</span>
                <span style={{ color: 'var(--fg)', lineHeight: 1.45 }}>
                  Select candidate Option 1–4 and click <b>Confirm answer</b> when ready.
                </span>
              </div>
            </div>

            <div className="edge" style={{ marginTop: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="ibtn primary"
                onClick={() => setShowInstructionsModal(false)}
                style={{ height: '36px', padding: '0 16px', borderRadius: '8px' }}
              >
                <span>Back to Trial</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
