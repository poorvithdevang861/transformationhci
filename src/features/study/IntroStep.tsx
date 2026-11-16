import React from 'react';
import { Icon } from '../../components/common/Icon';

interface IntroStepProps {
  mode: 'static' | 'animation' | 'randomise';
  onBegin: () => void;
}

export const IntroStep: React.FC<IntroStepProps> = ({ mode, onBegin }) => {
  const isAnim = mode === 'animation';

  return (
    <div className="panel narrow" style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="eyebrow">Study instructions</div>
      <h2 className="ptitle" style={{ fontSize: '1.25rem' }}>
        How hints work during the experiment
      </h2>
      <ul style={{ paddingLeft: '20px', lineHeight: '1.75', color: 'var(--muted)', margin: '16px 0', fontSize: '0.92rem' }}>
        <li>
          Each trial presents three reference figures: <b>A</b>, <b>B</b>, and <b>C</b>.
        </li>
        <li>
          Figure <b>A</b> turns into <b>B</b> through one or more geometric operations (rotation, reflection, scale, skew, or fill).
        </li>
        <li>Apply the identical transformation rules to Figure <b>C</b> to infer the missing figure.</li>
        <li>
          {isAnim
            ? 'Hints animate each transformation rule sequentially on the right-hand panel.'
            : 'Hints describe each transformation rule sequentially in structured text steps.'}
        </li>
        <li>Select candidate Option 1 to 4 and confirm your response when ready.</li>
      </ul>

      <div className="edge" style={{ marginTop: '16px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
        <div className="l meta">10 trials · Eye-gaze recording active</div>
        <div className="r">
          <button type="button" className="ibtn tb primary" onClick={onBegin}>
            <span>Begin trial 1</span>
            <Icon name="i-arrow" />
          </button>
        </div>
      </div>
    </div>
  );
};
