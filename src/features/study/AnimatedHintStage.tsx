import React from 'react';
import { ProblemSpec, HintItem, shapeOps } from '../../core/geometry/spec-parser';
import { SHAPES } from '../../core/geometry/shapes';
import { paramsAt, paramsWith, xform, ease } from '../../core/geometry/interpolator';
import { Icon } from '../../components/common/Icon';

interface AnimatedHintStageProps {
  spec: ProblemSpec;
  hints: HintItem[];
  viewIndex: number;
  progress: number;
}

export const AnimatedHintStage: React.FC<AnimatedHintStageProps> = ({
  spec,
  hints,
  viewIndex,
  progress
}) => {
  const g = ease(progress);
  const currentHint = hints[viewIndex];

  const renderAnimatedSlot = (slot: 0 | 1) => {
    const ops = shapeOps(spec, slot);
    const prog = ops.map((_, j) => {
      const at = hints.findIndex((hh) => hh.step === j && hh.slot === slot);
      if (at < 0) return 0;
      return at < viewIndex ? 1 : at === viewIndex ? g : 0;
    });

    const p = paramsWith(ops, prog);
    const shapeName = spec.A[slot];
    const pathD = SHAPES[shapeName] || '';
    const slotX = slot === 0 ? 27 : 73;
    const slotY = 70 - 40 * p.ry;
    const isCurrent = currentHint && currentHint.slot === slot;
    const showGhost = isCurrent && g > 0.01 && g < 0.99;

    return (
      <React.Fragment key={slot}>
        {showGhost && (
          <g transform={`translate(${slotX} 70) scale(11)`} opacity={0.35}>
            <path
              d={pathD}
              vectorEffect="non-scaling-stroke"
              strokeWidth="1.2"
              fill="none"
              stroke="var(--faint)"
              strokeDasharray="3 3"
            />
          </g>
        )}
        <g
          transform={`translate(${slotX} ${slotY}) ${xform(p)} scale(11)`}
          opacity={isCurrent ? 1 : 0.4}
        >
          <path
            d={pathD}
            vectorEffect="non-scaling-stroke"
            strokeWidth="1.8"
            strokeLinejoin="round"
            stroke="var(--ink)"
            fill={p.color || 'none'}
            fillOpacity={p.f}
          />
        </g>
      </React.Fragment>
    );
  };

  const renderGoalSlot = (slot: 0 | 1) => {
    const ops = shapeOps(spec, slot);
    const p = paramsAt(ops, 1);
    const shapeName = spec.A[slot];
    const pathD = SHAPES[shapeName] || '';
    const slotX = slot === 0 ? 27 : 73;
    const slotY = 70 - 40 * p.ry;

    return (
      <g key={slot} transform={`translate(${slotX} ${slotY}) ${xform(p)} scale(11)`}>
        <path
          d={pathD}
          vectorEffect="non-scaling-stroke"
          strokeWidth="1.8"
          strokeLinejoin="round"
          stroke="var(--ink)"
          fill={p.color || 'none'}
          fillOpacity={p.f}
        />
      </g>
    );
  };

  return (
    <div
      className="hint-stage"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
        alignItems: 'center',
        gap: '12px',
        minHeight: '150px'
      }}
    >
      <div className="hfig" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <svg className="box" viewBox="0 0 100 100" role="img" aria-label="Figure A, animated transformation">
          {renderAnimatedSlot(0)}
          {renderAnimatedSlot(1)}
        </svg>
        <span className="flab">Figure A</span>
      </div>

      <Icon name="i-arrow" style={{ color: 'var(--faint)', flex: 'none' }} />

      <div className="hfig goal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <svg className="box" viewBox="0 0 100 100" role="img" aria-label="Goal Figure B">
          {renderGoalSlot(0)}
          {renderGoalSlot(1)}
        </svg>
        <span className="flab">Target B</span>
      </div>
    </div>
  );
};
