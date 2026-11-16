import React from 'react';
import { ProblemSpec, shapeOps } from '../../core/geometry/spec-parser';
import { ProblemSet, sheetUrl } from '../../core/geometry/problems';
import { SHAPES } from '../../core/geometry/shapes';
import { params, paramsAt, xform } from '../../core/geometry/interpolator';
import { NONE_OP } from '../../core/geometry/operations';

interface PuzzleFiguresProps {
  spec: ProblemSpec;
  condition?: 'static' | 'animated';
  set?: ProblemSet;
  problemIdx?: number;
}

export const PuzzleFigures: React.FC<PuzzleFiguresProps> = ({
  spec,
  condition = 'animated',
  set,
  problemIdx = 0
}) => {
  const letters = ['A', 'B', 'C', 'D'] as const;

  // Static mode: Displays original problem sheet top banner with aligned AOI boundaries
  if (condition === 'static' && set) {
    const bgUrl = sheetUrl(set, problemIdx);
    return (
      <div className="figs-wrapper" style={{ marginBottom: '14px' }}>
        <div
          className="sheet-top"
          role="img"
          aria-label="Figures A, B, C, and D"
          style={{ ['--img' as string]: bgUrl, position: 'relative' } as React.CSSProperties}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '10px',
              padding: '4px'
            }}
          >
            {letters.map((letter) => (
              <div
                key={letter}
                className={`fig fig-static-${letter.toLowerCase()}`}
                data-aoi={`fig-${letter}`}
                aria-label={`Figure ${letter}`}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '8px',
                  position: 'relative'
                }}
              >
                <span
                  className="flab"
                  style={{
                    position: 'absolute',
                    bottom: '6px',
                    left: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--muted)'
                  }}
                >
                  {letter}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Animated mode: Clean interactive vector SVG figures with AOI boundaries
  const renderShapeSlot = (shapeName: string, slot: 0 | 1, figureIndex: number) => {
    const isTargetB = figureIndex === 1;
    const ops = shapeOps(spec, slot);
    const p = isTargetB ? paramsAt(ops, 1) : params(NONE_OP, 0);

    const slotX = slot === 0 ? 27 : 73;
    const slotY = 70 - 40 * p.ry;
    const pathD = SHAPES[shapeName] || '';

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
    <div className="figs-wrapper" style={{ marginBottom: '14px' }}>
      <div
        className="figs svg"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '10px'
        }}
      >
        {letters.map((letter, idx) => {
          const isB = letter === 'B';
          const isD = letter === 'D';
          const shapes = idx < 2 ? spec.A : spec.C;

          return (
            <div
              key={letter}
              className={`cell fig ${isB ? 'target' : isD ? 'answer' : ''}`}
              data-aoi={`fig-${letter}`}
            >
              <svg className="box" viewBox="0 0 100 100" role="img" aria-label={`Figure ${letter}`}>
                {idx < 3 ? (
                  <>
                    {renderShapeSlot(shapes[0], 0, idx)}
                    {renderShapeSlot(shapes[1], 1, idx)}
                  </>
                ) : (
                  <text
                    x="50"
                    y="58"
                    textAnchor="middle"
                    fill="var(--faint)"
                    fontSize="26"
                    fontWeight="600"
                    fontFamily="var(--f-mono)"
                  >
                    ?
                  </text>
                )}
              </svg>
              <div className="cap">
                <b>{letter}</b>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
