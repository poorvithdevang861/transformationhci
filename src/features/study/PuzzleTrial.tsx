import React, { useState, useEffect } from 'react';
import { SETS } from '../../core/geometry/problems';
import { parseSpec } from '../../core/geometry/spec-parser';
import { PuzzleFigures } from './PuzzleFigures';
import { CandidatePicker } from './CandidatePicker';
import { HintPlayer } from './HintPlayer';
import { Icon } from '../../components/common/Icon';
import { CalibrationModal } from './CalibrationModal';
import { gazeTracker } from '../../core/gaze/webgazer-service';

interface PuzzleTrialProps {
  setIdx: number;
  problemIdx: number;
  trialNumber: number;
  totalTrials: number;
  condition: 'static' | 'animated';
  hintWindows?: number[];
  animSeconds?: number;
  onAnswerConfirmed: (choice: number, hintsUsed: number) => void;
}

export const PuzzleTrial: React.FC<PuzzleTrialProps> = ({
  setIdx,
  problemIdx,
  trialNumber,
  totalTrials,
  condition,
  hintWindows = [20, 20, 20, 20],
  animSeconds = 1.6,
  onAnswerConfirmed
}) => {
  const currentSet = SETS[setIdx] || SETS[0];
  const specString = currentSet.specs[problemIdx] || currentSet.specs[0];
  const spec = parseSpec(specString);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showGazeDot, setShowGazeDot] = useState(false);
  const [showCalibModal, setShowCalibModal] = useState(false);

  useEffect(() => {
    setSelectedOption(null);
    setHintsUsed(0);
  }, [problemIdx, setIdx]);

  const toggleGazeDot = (checked: boolean) => {
    setShowGazeDot(checked);
    gazeTracker.setShowGazeDot(checked);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Eye Tracker & Calibrated Boundary Toolbar */}
      <div
        className="edge"
        style={{
          background: 'var(--sunken)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid var(--line)',
          fontSize: '0.8rem'
        }}
      >
        <div className="l" style={{ gap: '16px' }}>
          <label className="chk" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showBoundaries}
              onChange={(e) => setShowBoundaries(e.target.checked)}
            />
            <span style={{ fontWeight: 500 }}>Show mapped boundaries</span>
          </label>
          <label className="chk" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showGazeDot}
              onChange={(e) => toggleGazeDot(e.target.checked)}
            />
            <span>Live gaze dot</span>
          </label>
        </div>

        <div className="r" style={{ gap: '8px' }}>
          <button
            type="button"
            className="ibtn tb"
            style={{ height: '28px', fontSize: '0.76rem', padding: '0 10px' }}
            onClick={() => setShowCalibModal(true)}
          >
            <Icon name="i-q" size="sm" />
            <span>9-point calibration</span>
          </button>
        </div>
      </div>

      <div
        className={`qgrid ${showBoundaries ? 'show-mapped-boundaries' : ''}`}
        style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}
      >
        <section className="panel qpanel">
          <div className="phead" style={{ marginBottom: '12px' }}>
            <div>
              <span className="eyebrow">
                Trial {trialNumber} of {totalTrials}
              </span>
              <h2 className="ptitle">Which figure completes A : B :: C : ?</h2>
            </div>
            <span className="pill">
              <Icon name={condition === 'animated' ? 'i-anim' : 'i-text'} size="sm" />
              {condition === 'animated' ? 'Animated hints' : 'Text hints'}
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
            onSelectOption={setSelectedOption}
          />

          <div className="edge" style={{ marginTop: '16px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
            <div className="l meta">
              <Icon name="i-pointer" size="sm" />
              {selectedOption ? `Selected: Option ${selectedOption}` : 'Select a candidate option'}
            </div>
            <div className="r">
              <button
                type="button"
                className="ibtn tb primary"
                disabled={selectedOption === null}
                onClick={() => selectedOption !== null && onAnswerConfirmed(selectedOption, hintsUsed)}
              >
                <Icon name="i-check" />
                <span>Confirm answer</span>
              </button>
            </div>
          </div>
        </section>

        <section>
          <HintPlayer
            spec={spec}
            condition={condition}
            windows={hintWindows}
            animSeconds={animSeconds}
            onHintsChanged={setHintsUsed}
          />
        </section>
      </div>

      {showCalibModal && (
        <CalibrationModal
          isOpen={showCalibModal}
          onClose={() => setShowCalibModal(false)}
        />
      )}
    </div>
  );
};
