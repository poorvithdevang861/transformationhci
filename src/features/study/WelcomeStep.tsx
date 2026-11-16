import React, { useState } from 'react';
import { Icon } from '../../components/common/Icon';

interface WelcomeStepProps {
  onStart: (pid: string, mode: 'static' | 'animation' | 'randomise', device: string) => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onStart }) => {
  const [pid, setPid] = useState(() => 'P-' + Math.random().toString(36).substring(2, 7).toUpperCase());
  const [mode, setMode] = useState<'static' | 'animation' | 'randomise'>('animation');
  const [device, setDevice] = useState<'laptop' | 'tablet' | 'phone'>('laptop');
  const [consent, setConsent] = useState(false);

  return (
    <div className="welcome" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div className="panel intro">
        <div className="eyebrow">Cognitive evaluation</div>
        <h2 className="hero">
          Visual reasoning with geometric transformations
        </h2>
        <p className="lead">
          Each problem presents an analogy: <b>A : B :: C : ?</b> — figure A transforms into B via rule-based geometric operations (rotation, reflection, scaling, skew, or fill). Infer the rule applied to A, apply it to C, and select the correct candidate figure.
        </p>
        <ol className="steps">
          <li>
            <span>1</span>
            <div>
              <b>10 problem trials</b>
              <em>Timed hint intervals available if needed</em>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <b>Post-experiment questionnaire</b>
              <em>Mental effort, subjective workload, and system usability</em>
            </div>
          </li>
        </ol>
        <div className="meta wrap" style={{ marginTop: '16px' }}>
          Estimated duration: 10–12 minutes. Laptop camera eye-gaze tracking runs locally in-browser with your explicit consent.
        </div>
      </div>

      <div className="panel setup" style={{ gap: '16px' }}>
        <div>
          <div className="lbl" style={{ marginBottom: '8px' }}>
            Experimental hint presentation condition
          </div>
          <div className="modes" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(
              [
                { id: 'static', icon: 'i-text', title: 'Static mode', desc: 'Problem figures as static images with text hint descriptions' },
                { id: 'animation', icon: 'i-anim', title: 'Animated mode', desc: 'Interactive vector figures with animated morphing hint transformations' },
                { id: 'randomise', icon: 'i-shuffle', title: 'Randomised condition', desc: 'Alternating counterbalanced assignment across problem trials' }
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                className="mode"
                aria-checked={mode === item.id}
                onClick={() => setMode(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: mode === item.id ? 'var(--raised)' : 'var(--sunken)',
                  border: mode === item.id ? '1px solid var(--accent)' : '1px solid var(--line)',
                  textAlign: 'left'
                }}
              >
                <Icon name={item.icon} />
                <div>
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--faint)' }}>{item.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="edge">
          <div style={{ flex: 1 }}>
            <label className="lbl" htmlFor="pidInput">
              Participant identifier
            </label>
            <input
              id="pidInput"
              value={pid}
              onChange={(e) => setPid(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--sunken)',
                border: '1px solid var(--line)',
                borderRadius: '8px',
                padding: '8px 12px',
                marginTop: '4px',
                fontFamily: 'var(--f-mono)'
              }}
            />
          </div>
          <div>
            <div className="lbl">Testing device</div>
            <div className="seg" style={{ marginTop: '4px' }}>
              {(['laptop', 'tablet', 'phone'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={device === d}
                  onClick={() => setDevice(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="consent">
          <input
            type="checkbox"
            id="consentCheck"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <label htmlFor="consentCheck">
            I consent to participating in this cognitive study and understand that gaze fixations and response timestamps will be logged for scientific research.
          </label>
        </div>

        <div className="edge" style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
          <div className="l meta">
            Camera check and calibration follows next
          </div>
          <div className="r">
            <button
              type="button"
              className="ibtn tb primary"
              disabled={!consent || !pid.trim()}
              onClick={() => onStart(pid.trim(), mode, device)}
            >
              <span>Begin experiment</span>
              <Icon name="i-arrow" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
