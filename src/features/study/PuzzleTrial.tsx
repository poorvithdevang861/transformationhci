import React, { useState, useEffect } from 'react';
import { SETS } from '../../core/geometry/problems';
import { parseSpec } from '../../core/geometry/spec-parser';
import { PuzzleFigures } from './PuzzleFigures';
import { CandidatePicker } from './CandidatePicker';
import { HintPlayer } from './HintPlayer';
import { Icon } from '../../components/common/Icon';
import { CalibrationModal } from './CalibrationModal';

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
  const [showCalibModal, setShowCalibModal] = useState(false);

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
          <span className="eyebrow" style={{ margin: 0, fontWeight: 600 }}>
            Trial {trialNumber} of {totalTrials}
          </span>
          <span style={{ color: 'var(--line-strong)' }}>|</span>
          <span className="meta" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: 'var(--ok)',
                display: 'inline-block'
              }}
            />
            Eye tracking active
          </span>
        </div>

        <div className="r" style={{ gap: '8px' }}>
          <button
            type="button"
            className="ibtn tb"
            style={{ height: '28px', fontSize: '0.78rem', padding: '0 10px', borderRadius: '7px' }}
            onClick={() => setShowCalibModal(true)}
            title="Recalibrate 9-point eye tracker"
          >
            <Icon name="i-crosshair" size="sm" />
            <span>Calibrate</span>
          </button>
        </div>
      </div>

      {/* Main Study Grid - strictly clean without boundary highlights */}
      <div
        className="qgrid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.95fr)',
          gap: '16px',
          alignItems: 'start'
        }}
      >
        <section className="panel qpanel" style={{ minWidth: 0 }}>
          <div className="phead" style={{ marginBottom: '12px' }}>
            <div>
              <span className="eyebrow">Problem {trialNumber}</span>
              <h2 className="ptitle">Which figure completes A : B :: C : ?</h2>
            </div>
            <span className="pill">
              <Icon name={condition === 'animated' ? 'i-anim' : 'i-text'} size="sm" />
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
            onSelectOption={setSelectedOption}
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

        <section style={{ minWidth: 0 }}>
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
