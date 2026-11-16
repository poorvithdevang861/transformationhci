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
    <div className="choose" data-aoi="choose-d" style={{ marginTop: '14px' }}>
      <div className="edge" style={{ marginBottom: '8px' }}>
        <span className="lbl">Answer choices</span>
        <span className="meta">{selectedOption ? `Selected: Option ${selectedOption}` : 'Choose 1–4'}</span>
      </div>

      <div
        className="opts4"
        role="radiogroup"
        aria-label="Answer options"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '10px',
          ['--img' as string]: bgUrl
        } as React.CSSProperties}
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
