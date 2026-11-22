import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ExperimentSession, TrialData } from '../../core/storage/types';
import { drawHeatmap } from '../../core/heatmap/heatmap-renderer';
import { drawScanpath } from '../../core/heatmap/scanpath-renderer';
import { drawBoundaries } from '../../core/heatmap/boundary-renderer';
import { AOI_COLOR_MAP } from '../../core/gaze/aoi-engine';
import { BoundaryRect } from '../../core/gaze/types';
import { Icon } from '../../components/common/Icon';

interface BoundaryOverlaySectionProps {
  sessions: ExperimentSession[];
  selectedSessionId: string;
  selectedPuzzleId: number | 'all';
  onSelectSession: (id: string) => void;
  onSelectPuzzle: (id: number | 'all') => void;
}

export const BoundaryOverlaySection: React.FC<BoundaryOverlaySectionProps> = ({
  sessions,
  selectedSessionId,
  selectedPuzzleId,
  onSelectSession,
  onSelectPuzzle
}) => {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showScanpath, setShowScanpath] = useState(true);
  const [showBoundariesState, setShowBoundariesState] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];
  const trials = currentSession?.trials || [];

  const currentTrial: TrialData | undefined = selectedPuzzleId === 'all'
    ? trials[0]
    : trials.find((t) => (t.problemIdx + 1) === Number(selectedPuzzleId)) || trials[0];

  // Boundaries calculation with deterministic fallback matching actual UI
  const boundaries = useMemo<Record<string, BoundaryRect>>(() => {
    if (!currentTrial) return {};
    const raw = currentTrial.boundaries || {};
    const b = { ...raw };

    // If boundaries were not saved on older session, generate default layout matching actual interface
    if (Object.keys(b).length === 0) {
      b['fig-A'] = { x: 30, y: 70, w: 105, h: 105, key: 'fig-A', name: 'Figure A', color: '#ff4055', tag: '[Red]' };
      b['fig-B'] = { x: 145, y: 70, w: 105, h: 105, key: 'fig-B', name: 'Figure B', color: '#3b82f6', tag: '[Blue]' };
      b['fig-C'] = { x: 260, y: 70, w: 105, h: 105, key: 'fig-C', name: 'Figure C', color: '#ff9800', tag: '[Orange]' };
      b['fig-D'] = { x: 375, y: 70, w: 105, h: 105, key: 'fig-D', name: 'Figure D (Target ?)', color: '#facc15', tag: '[Yellow]' };

      b['choose-d'] = { x: 25, y: 220, w: 460, h: 170, key: 'choose-d', name: 'Answer Choices Area', color: '#eab308', tag: '[Yellow]' };
      b['option-1'] = { x: 35, y: 255, w: 98, h: 110, key: 'option-1', name: 'Option 1', color: '#a855f7', tag: '[Purple]' };
      b['option-2'] = { x: 148, y: 255, w: 98, h: 110, key: 'option-2', name: 'Option 2', color: '#a855f7', tag: '[Purple]' };
      b['option-3'] = { x: 261, y: 255, w: 98, h: 110, key: 'option-3', name: 'Option 3', color: '#a855f7', tag: '[Purple]' };
      b['option-4'] = { x: 374, y: 255, w: 98, h: 110, key: 'option-4', name: 'Option 4', color: '#a855f7', tag: '[Purple]' };

      b['hint-panel'] = { x: 520, y: 30, w: 320, h: 360, key: 'hint-panel', name: 'Hint Panel', color: '#22c55e', tag: '[Green]' };
      b['hint-controls'] = { x: 535, y: 310, w: 290, h: 60, key: 'hint-controls', name: 'Hint Controls', color: '#10b981', tag: '[Teal]' };
    }

    return b;
  }, [currentTrial]);

  // Compute total trial dwell and attention metrics per boundary
  const aoiStats = useMemo(() => {
    if (!currentTrial) return {};
    const stats: Record<string, { dwellMs: number; count: number; pct: number }> = {};
    const totalDwell = currentTrial.timeMs || 1;

    Object.keys(AOI_COLOR_MAP).forEach((k) => {
      const metric = currentTrial.aoi?.[k];
      stats[k] = {
        dwellMs: metric?.dwellTimeMs || 0,
        count: metric?.fixationsCount || 0,
        pct: metric?.pctTotal || (metric?.dwellTimeMs ? Math.round((metric.dwellTimeMs / totalDwell) * 100) : 0)
      };
    });

    return stats;
  }, [currentTrial]);

  // Canvas Drawing Effect
  useEffect(() => {
    if (!canvasRef.current || !currentTrial) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bList = Object.values(boundaries);
    const maxX = bList.length > 0 ? Math.max(...bList.map((b) => b.x + b.w)) : 840;
    const maxY = bList.length > 0 ? Math.max(...bList.map((b) => b.y + b.h)) : 420;

    const w = Math.max(860, maxX + 40);
    const h = Math.max(440, maxY + 40);
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    const fixations = currentTrial.fixations || [];

    // 1. Heatmap layer
    if (showHeatmap && fixations.length > 0) {
      drawHeatmap(canvas, fixations, { radius: 42, opacity: 0.8 });
    }

    // 2. Scanpath layer
    if (showScanpath && fixations.length > 0) {
      drawScanpath(canvas, fixations, { keepHeatmap: true });
    }

    // 3. Registered Boundaries overlay
    if (showBoundariesState && bList.length > 0) {
      drawBoundaries(canvas, boundaries, false);
    }

    // 4. Intensity Fill & Metrics Labeling
    if (showMetrics) {
      ctx.save();
      bList.forEach((b) => {
        if (!b || b.w <= 0 || b.h <= 0) return;
        const normKey = b.key.replace(/-([a-zA-Z0-9])/g, (_, ch) => ch.toUpperCase()).replace('chooseD', 'chooseD');
        const stat = aoiStats[normKey] || aoiStats[b.key] || { dwellMs: 0, count: 0, pct: 0 };

        // Intensity shading based on percentage of attention
        if (stat.pct > 0) {
          const intensity = Math.min(0.35, Math.max(0.06, stat.pct / 100));
          ctx.fillStyle = b.color.startsWith('#') && b.color.length === 7 ? `${b.color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}` : 'rgba(168, 85, 247, 0.15)';
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }

        // Metrics Pill at top right of boundary
        ctx.fillStyle = 'rgba(15, 17, 24, 0.9)';
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1;
        const badgeW = 92;
        const badgeH = 22;
        const badgeX = b.x + b.w - badgeW - 6;
        const badgeY = b.y + 6;

        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '600 10px JetBrains Mono, monospace';
        ctx.fillText(`${(stat.dwellMs / 1000).toFixed(1)}s (${stat.pct}%)`, badgeX + 6, badgeY + 15);
      });
      ctx.restore();
    }
  }, [currentTrial, boundaries, showHeatmap, showScanpath, showBoundariesState, showMetrics, aoiStats]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Selection & Controls Bar */}
      <div
        className="edge"
        style={{
          background: 'var(--sunken)',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid var(--line)',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
              Participant Session
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => onSelectSession(e.target.value)}
              className="ibtn tb"
              style={{ height: '32px', minWidth: '150px', background: 'var(--panel)', padding: '0 8px' }}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} ({s.trials.length} trials)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
              Puzzle Trial
            </label>
            <select
              value={selectedPuzzleId}
              onChange={(e) => onSelectPuzzle(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="ibtn tb"
              style={{ height: '32px', minWidth: '130px', background: 'var(--panel)', padding: '0 8px' }}
            >
              <option value="all">Trial 1 (Default)</option>
              {trials.map((t) => (
                <option key={t.idx} value={t.problemIdx + 1}>
                  Trial {t.idx} (Puzzle {t.problemIdx + 1})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Layer Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`ibtn tb ${showHeatmap ? 'active' : ''}`}
            onClick={() => setShowHeatmap(!showHeatmap)}
            style={{
              height: '30px',
              fontSize: '0.78rem',
              padding: '0 10px',
              borderRadius: '7px',
              background: showHeatmap ? 'rgba(168, 85, 247, 0.2)' : undefined,
              borderColor: showHeatmap ? 'var(--accent)' : undefined
            }}
          >
            <Icon name="i-eye" size="sm" />
            <span>Heatmap</span>
          </button>

          <button
            type="button"
            className={`ibtn tb ${showScanpath ? 'active' : ''}`}
            onClick={() => setShowScanpath(!showScanpath)}
            style={{
              height: '30px',
              fontSize: '0.78rem',
              padding: '0 10px',
              borderRadius: '7px',
              background: showScanpath ? 'rgba(34, 197, 94, 0.2)' : undefined,
              borderColor: showScanpath ? '#22c55e' : undefined
            }}
          >
            <Icon name="i-target" size="sm" />
            <span>Scanpath</span>
          </button>

          <button
            type="button"
            className={`ibtn tb ${showBoundariesState ? 'active' : ''}`}
            onClick={() => setShowBoundariesState(!showBoundariesState)}
            style={{
              height: '30px',
              fontSize: '0.78rem',
              padding: '0 10px',
              borderRadius: '7px',
              background: showBoundariesState ? 'rgba(234, 179, 8, 0.2)' : undefined,
              borderColor: showBoundariesState ? '#eab308' : undefined
            }}
          >
            <Icon name="i-layers" size="sm" />
            <span>Boundaries</span>
          </button>

          <button
            type="button"
            className={`ibtn tb ${showMetrics ? 'active' : ''}`}
            onClick={() => setShowMetrics(!showMetrics)}
            style={{
              height: '30px',
              fontSize: '0.78rem',
              padding: '0 10px',
              borderRadius: '7px',
              background: showMetrics ? 'var(--raised)' : undefined
            }}
          >
            <Icon name="i-timer" size="sm" />
            <span>Metrics</span>
          </button>
        </div>
      </div>

      {/* Actual Interface Canvas Container */}
      <div className="panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <div className="edge" style={{ marginBottom: '14px' }}>
          <div>
            <div className="eyebrow">Interface Coordinates Mapping</div>
            <h3 className="ptitle" style={{ margin: 0 }}>
              Actual UI Boundary Overlay & Gaze Heatmap
            </h3>
          </div>
          <span className="meta" style={{ fontSize: '0.76rem' }}>
            Aligned to actual DOM bounds · Color intensity maps attention percentage
          </span>
        </div>

        {/* Responsive Canvas Container with interface wireframe background */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '440px',
            background: 'radial-gradient(ellipse at 50% 50%, #151824 0%, #0a0b10 100%)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
        >
          {/* Wireframe background matching actual Transformation Animator layout */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              opacity: 0.35,
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.95fr)',
              gap: '16px',
              padding: '20px'
            }}
          >
            {/* Left QPanel layout */}
            <div style={{ border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ height: '24px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', marginBottom: '16px', width: '60%' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', height: '110px', marginBottom: '24px' }}>
                {[1, 2, 3, 4].map(n => (
                  <div key={n} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', height: '120px' }}>
                {[1, 2, 3, 4].map(n => (
                  <div key={n} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
            </div>

            {/* Right Hint Panel layout */}
            <div style={{ border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ height: '28px', background: 'rgba(34,197,94,0.15)', borderRadius: '6px', marginBottom: '14px', width: '50%' }} />
              <div style={{ height: '140px', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', marginBottom: '20px', background: 'rgba(34,197,94,0.03)' }} />
              <div style={{ height: '36px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }} />
            </div>
          </div>

          {/* Actual Canvas */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'block',
              width: '100%',
              height: 'auto'
            }}
          />
        </div>
      </div>
    </div>
  );
};
