import React, { useState } from 'react';
import { Icon } from '../../components/common/Icon';

interface WelcomeStepProps {
  onStart: (pid: string, mode: 'static' | 'animation' | 'randomise', device: string) => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onStart }) => {
  const [pid, setPid] = useState(() => 'P-' + Math.random().toString(36).substring(2, 7).toUpperCase());
  const [mode, setMode] = useState<'static' | 'animation' | 'randomise'>('animation');
  const [device, setDevice] = useState<'laptop' | 'tablet'>('laptop');
  const [consent, setConsent] = useState(false);

  const modes = [
    { id: 'animation', icon: 'i-puzzle-anim', label: 'Animated', sub: 'Morphing shapes' },
    { id: 'static', icon: 'i-puzzle-static', label: 'Static', sub: 'Text explanations' },
    { id: 'randomise', icon: 'i-puzzle-mixed', label: 'Mixed', sub: 'Alternating' }
  ] as const;

  const devices = [
    { id: 'laptop', icon: 'i-laptop', label: 'Laptop' },
    { id: 'tablet', icon: 'i-tablet', label: 'Tablet' }
  ] as const;

  return (
    <div style={{ maxWidth: '540px', margin: '32px auto', width: '100%' }}>
      <div
        className="panel"
        style={{
          borderRadius: '20px',
          padding: '32px 28px',
          boxShadow: 'none',
          border: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              margin: '0 auto 12px',
              borderRadius: '12px',
              background: 'var(--raised)',
              border: '1px solid var(--line)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--ink)'
            }}
          >
            <Icon name="i-puzzle" size="lg" />
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
            Geometric Reasoning Study
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Infer the rule from A to B and apply it to C across 10 visual analogy puzzles.
          </p>
        </div>

        {/* Clue Mode Selector */}
        <div>
          <div className="lbl" style={{ marginBottom: '8px' }}>
            Clue Presentation
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
            {modes.map((m) => {
              const isActive = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '14px 10px',
                    borderRadius: '12px',
                    border: isActive ? '1.5px solid var(--ink)' : '1px solid var(--line)',
                    background: isActive ? 'var(--raised)' : 'var(--sunken)',
                    color: isActive ? 'var(--ink)' : 'var(--muted)',
                    transition: 'all 0.12s ease',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Icon name={m.icon} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{m.label}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--faint)' }}>{m.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Participant & Device */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', alignItems: 'end' }}>
          <div>
            <label className="lbl" htmlFor="pidInput" style={{ display: 'block', marginBottom: '6px' }}>
              Participant ID
            </label>
            <input
              id="pidInput"
              value={pid}
              onChange={(e) => setPid(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                background: 'var(--sunken)',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                padding: '0 12px',
                fontFamily: 'var(--f-mono)',
                fontSize: '0.9rem',
                color: 'var(--ink)'
              }}
            />
          </div>

          <div>
            <div className="lbl" style={{ marginBottom: '6px' }}>
              Device
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '4px',
                background: 'var(--sunken)',
                padding: '3px',
                borderRadius: '10px',
                border: '1px solid var(--line)',
                height: '38px'
              }}
            >
              {devices.map((d) => {
                const isSelected = device === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDevice(d.id)}
                    style={{
                      border: 0,
                      background: isSelected ? 'var(--raised)' : 'transparent',
                      color: isSelected ? 'var(--ink)' : 'var(--muted)',
                      borderRadius: '7px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background-color 0.12s ease'
                    }}
                  >
                    <Icon name={d.icon} size="sm" />
                    <span>{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Consent Checkbox */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: '12px',
            background: 'var(--sunken)',
            border: '1px solid var(--line)',
            fontSize: '0.84rem',
            color: 'var(--muted)',
            cursor: 'pointer'
          }}
        >
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: 'var(--ink)', cursor: 'pointer' }}
          />
          <span>I agree to participate and enable anonymous eye tracking.</span>
        </label>

        {/* Start Button */}
        <button
          type="button"
          disabled={!consent || !pid.trim()}
          onClick={() => onStart(pid.trim(), mode, device)}
          className="ibtn primary"
          style={{
            width: '100%',
            height: '44px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '0.94rem',
            fontWeight: 600,
            cursor: !consent || !pid.trim() ? 'default' : 'pointer'
          }}
        >
          <span>Start Study</span>
          <Icon name="i-arrow" />
        </button>
      </div>
    </div>
  );
};
