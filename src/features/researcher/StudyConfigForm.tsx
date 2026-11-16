import React, { useState } from 'react';
import { StudyConfig } from '../../core/storage/types';
import { DEFAULT_CONFIG } from '../../core/storage/local-store';
import { Icon } from '../../components/common/Icon';

interface StudyConfigFormProps {
  config: StudyConfig;
  onSave: (cfg: StudyConfig) => void;
}

export const StudyConfigForm: React.FC<StudyConfigFormProps> = ({ config, onSave }) => {
  const [cfg, setCfg] = useState<StudyConfig>({ ...config });
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = () => {
    onSave(cfg);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const handleReset = () => {
    setCfg({ ...DEFAULT_CONFIG });
  };

  return (
    <div className="panel" style={{ marginTop: '16px' }}>
      <div className="eyebrow">Study Configuration</div>
      <h2 className="ptitle" style={{ marginBottom: '14px' }}>
        Experiment Tuning
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: 'var(--sunken)', padding: '12px', borderRadius: '12px' }}>
          <label className="lbl" style={{ display: 'block', marginBottom: '6px' }}>
            Animation Speed (1× duration in seconds)
          </label>
          <input
            type="number"
            min="0.5"
            max="5"
            step="0.1"
            value={cfg.animSeconds}
            onChange={(e) => setCfg({ ...cfg, animSeconds: +e.target.value })}
            style={{ width: '100%', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '8px', padding: '6px 10px' }}
          />
        </div>

        <div style={{ background: 'var(--sunken)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
            <input
              type="checkbox"
              checked={cfg.feedback}
              onChange={(e) => setCfg({ ...cfg, feedback: e.target.checked })}
            />
            Show immediate correct/incorrect feedback after each puzzle
          </label>
        </div>
      </div>

      <div className="edge" style={{ marginTop: '16px' }}>
        <div className="l meta">{savedMessage ? 'Settings saved successfully!' : 'Applies to new study sessions'}</div>
        <div className="r">
          <button type="button" className="ibtn tb" onClick={handleReset}>
            <Icon name="i-restart" />
            Defaults
          </button>
          <button type="button" className="ibtn tb primary" onClick={handleSave}>
            <Icon name="i-check" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
