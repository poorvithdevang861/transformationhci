import React from 'react';
import { ProblemSet, optionCropPosition, sheetUrl } from '../../core/geometry/problems';

interface CandidatePickerProps {
  set: ProblemSet;
  problemIdx: number;
  selectedOption: number | null;
  onSelectOption: (optionNum: number) => void;
  disabled?: boolean;
}

export const CandidatePicker: React.FC<CandidatePickerProps> = ({
  set,
  problemIdx,
  selectedOption,
  onSelectOption,
  disabled
}) => {
  const options = [1, 2, 3, 4];
  const bgUrl = sheetUrl(set, problemIdx);

  return (
    <div className="choose" data-aoi="choose-d" style={{ marginTop: '16px' }}>
      <div className="lbl" style={{ marginBottom: '8px' }}>
        Candidate options (1–4)
      </div>
      <div
        className="opts4"
        role="radiogroup"
        aria-label="Candidate options"
        style={{ ['--img' as string]: bgUrl } as React.CSSProperties}
      >
        {options.map((num) => {
          const isSelected = selectedOption === num;
          const bgPos = optionCropPosition(num - 1);

          return (
            <div
              key={num}
              className={`cell ${isSelected ? 'target' : ''}`}
              data-aoi={`option-${num}`}
            >
              <button
                type="button"
                className="opt"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => onSelectOption(num)}
                style={{
                  backgroundPosition: bgPos,
                  ['--img' as string]: bgUrl
                } as React.CSSProperties}
              />
              <div className="cap">
                <span>
                  <b>Option {num}</b>
                </span>
                {isSelected && <span className="mk">●</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
