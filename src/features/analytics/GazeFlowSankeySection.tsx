import React, { useState, useMemo } from 'react';
import { ExperimentSession } from '../../core/storage/types';
import { GazeJourneyTracker } from '../../core/gaze/journey-tracker';
import { SankeyNode, SankeyLink } from '../../core/gaze/journey-types';
import { AOI_COLOR_MAP } from '../../core/gaze/aoi-engine';
import { Icon } from '../../components/common/Icon';

interface GazeFlowSankeySectionProps {
  sessions: ExperimentSession[];
}

export const GazeFlowSankeySection: React.FC<GazeFlowSankeySectionProps> = ({ sessions }) => {
  const [filterParticipant, setFilterParticipant] = useState<string>('all');
  const [filterPuzzle, setFilterPuzzle] = useState<number | 'all'>('all');
  const [filterHint, setFilterHint] = useState<number | 'all'>('all');
  const [hoveredLink, setHoveredLink] = useState<SankeyLink | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const { nodes, links } = useMemo(() => {
    return GazeJourneyTracker.computeSankeyData(sessions, {
      participantId: filterParticipant,
      puzzleId: filterPuzzle,
      hintId: filterHint
    });
  }, [sessions, filterParticipant, filterPuzzle, filterHint]);

  // SVG Sankey Layout Geometry
  const width = 840;
  const height = 440;
  const nodeWidth = 24;
  const paddingY = 18;

  // Filter out zero-count or trivial loops if too cluttered
  const topLinks = useMemo(() => {
    return links.slice(0, 16);
  }, [links]);

  // Group nodes into Sources (left) and Targets (right)
  const sourceNodeIds = useMemo(() => {
    const set = new Set<string>();
    topLinks.forEach((l) => set.add(l.source));
    return Array.from(set);
  }, [topLinks]);

  const targetNodeIds = useMemo(() => {
    const set = new Set<string>();
    topLinks.forEach((l) => set.add(l.target));
    return Array.from(set);
  }, [topLinks]);

  // Compute node vertical layout
  const sourceLayout = useMemo(() => {
    const count = sourceNodeIds.length || 1;
    const availH = height - (count + 1) * paddingY;
    const nodeH = Math.max(26, Math.min(52, availH / count));
    const layout = new Map<string, { x: number; y: number; h: number }>();
    sourceNodeIds.forEach((id, idx) => {
      layout.set(id, {
        x: 40,
        y: paddingY + idx * (nodeH + paddingY),
        h: nodeH
      });
    });
    return layout;
  }, [sourceNodeIds, height]);

  const targetLayout = useMemo(() => {
    const count = targetNodeIds.length || 1;
    const availH = height - (count + 1) * paddingY;
    const nodeH = Math.max(26, Math.min(52, availH / count));
    const layout = new Map<string, { x: number; y: number; h: number }>();
    targetNodeIds.forEach((id, idx) => {
      layout.set(id, {
        x: width - 40 - nodeWidth,
        y: paddingY + idx * (nodeH + paddingY),
        h: nodeH
      });
    });
    return layout;
  }, [targetNodeIds, width, height]);

  const maxLinkCount = topLinks.length > 0 ? Math.max(...topLinks.map((l) => l.count)) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Filtering Header */}
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
              Participant Filter
            </label>
            <select
              value={filterParticipant}
              onChange={(e) => setFilterParticipant(e.target.value)}
              className="ibtn tb"
              style={{ height: '32px', minWidth: '140px', background: 'var(--panel)', padding: '0 8px' }}
            >
              <option value="all">All Participants ({sessions.length})</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
              Puzzle Filter
            </label>
            <select
              value={filterPuzzle}
              onChange={(e) => setFilterPuzzle(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="ibtn tb"
              style={{ height: '32px', minWidth: '130px', background: 'var(--panel)', padding: '0 8px' }}
            >
              <option value="all">All Puzzles</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  Puzzle {num}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
              Hint Interaction Focus
            </label>
            <select
              value={filterHint}
              onChange={(e) => setFilterHint(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="ibtn tb"
              style={{ height: '32px', minWidth: '130px', background: 'var(--panel)', padding: '0 8px' }}
            >
              <option value="all">All Hint Periods</option>
              <option value="1">Clue 1 (First Hint)</option>
              <option value="2">Clue 2 (Second Hint)</option>
              <option value="3">Clue 3 (Third Hint)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pill">
            <Icon name="i-layers" size="sm" />
            <span>{links.length} Unique Transitions</span>
          </span>
        </div>
      </div>

      {/* Sankey Flow Visualization Canvas */}
      <div className="panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <div className="edge" style={{ marginBottom: '14px' }}>
          <div>
            <div className="eyebrow">Directional Gaze Dynamics</div>
            <h3 className="ptitle" style={{ margin: 0 }}>
              Region Transition Flow (Sankey Diagram)
            </h3>
          </div>
          <span className="meta" style={{ fontSize: '0.76rem' }}>
            Origin Regions (Left) → Destination Regions (Right) · Line thickness denotes transition frequency
          </span>
        </div>

        <div style={{ position: 'relative', width: '100%', minWidth: `${width}px` }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            <defs>
              {topLinks.map((link, idx) => {
                const sColor = AOI_COLOR_MAP[link.source]?.color || '#94a3b8';
                const tColor = AOI_COLOR_MAP[link.target]?.color || '#94a3b8';
                return (
                  <linearGradient key={`grad-${idx}`} id={`link-grad-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={sColor} stopOpacity={0.65} />
                    <stop offset="100%" stopColor={tColor} stopOpacity={0.65} />
                  </linearGradient>
                );
              })}
            </defs>

            {/* Bezier Ribbons for Links */}
            {topLinks.map((link, idx) => {
              const srcPos = sourceLayout.get(link.source);
              const tgtPos = targetLayout.get(link.target);
              if (!srcPos || !tgtPos) return null;

              const x0 = srcPos.x + nodeWidth;
              const y0 = srcPos.y + srcPos.h / 2;
              const x1 = tgtPos.x;
              const y1 = tgtPos.y + tgtPos.h / 2;
              const dx = (x1 - x0) * 0.52;

              const strokeWidth = Math.max(3, Math.min(24, (link.count / maxLinkCount) * 22));
              const isHovered = hoveredLink === link || hoveredNode === link.source || hoveredNode === link.target;
              const opacity = isHovered ? 0.95 : hoveredLink || hoveredNode ? 0.15 : 0.65;

              return (
                <path
                  key={`link-${idx}`}
                  d={`M ${x0} ${y0} C ${x0 + dx} ${y0}, ${x1 - dx} ${y1}, ${x1} ${y1}`}
                  fill="none"
                  stroke={`url(#link-grad-${idx})`}
                  strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                  strokeOpacity={opacity}
                  style={{ cursor: 'pointer', transition: 'stroke-opacity 0.2s, stroke-width 0.2s' }}
                  onMouseEnter={() => setHoveredLink(link)}
                  onMouseLeave={() => setHoveredLink(null)}
                />
              );
            })}

            {/* Source Nodes (Left) */}
            {sourceNodeIds.map((id) => {
              const pos = sourceLayout.get(id);
              if (!pos) return null;
              const info = AOI_COLOR_MAP[id] || { color: '#94a3b8', name: id };
              const isHovered = hoveredNode === id || hoveredLink?.source === id;

              return (
                <g
                  key={`src-${id}`}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredNode(id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <rect
                    width={nodeWidth}
                    height={pos.h}
                    rx={5}
                    fill={info.color}
                    stroke={isHovered ? '#fff' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={isHovered ? 2 : 1}
                  />
                  <text
                    x={-8}
                    y={pos.h / 2 + 4}
                    fill="var(--fg)"
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="end"
                  >
                    {info.name}
                  </text>
                </g>
              );
            })}

            {/* Target Nodes (Right) */}
            {targetNodeIds.map((id) => {
              const pos = targetLayout.get(id);
              if (!pos) return null;
              const info = AOI_COLOR_MAP[id] || { color: '#94a3b8', name: id };
              const isHovered = hoveredNode === id || hoveredLink?.target === id;

              return (
                <g
                  key={`tgt-${id}`}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredNode(id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <rect
                    width={nodeWidth}
                    height={pos.h}
                    rx={5}
                    fill={info.color}
                    stroke={isHovered ? '#fff' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={isHovered ? 2 : 1}
                  />
                  <text
                    x={nodeWidth + 8}
                    y={pos.h / 2 + 4}
                    fill="var(--fg)"
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="start"
                  >
                    {info.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Hover Details Card */}
          {hoveredLink && (
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(15, 17, 24, 0.94)',
                border: '1px solid var(--accent)',
                borderRadius: '10px',
                padding: '10px 18px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                zIndex: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: AOI_COLOR_MAP[hoveredLink.source]?.color || '#fff', fontWeight: 700 }}>
                  {AOI_COLOR_MAP[hoveredLink.source]?.name || hoveredLink.source}
                </span>
                <span style={{ color: 'var(--muted)' }}>→</span>
                <span style={{ color: AOI_COLOR_MAP[hoveredLink.target]?.color || '#fff', fontWeight: 700 }}>
                  {AOI_COLOR_MAP[hoveredLink.target]?.name || hoveredLink.target}
                </span>
              </div>
              <div style={{ color: 'var(--line-strong)' }}>|</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--fg)' }}>
                <b>{hoveredLink.count}</b> transition(s) ({hoveredLink.percentage}% share)
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                Avg Dwell: <b>{hoveredLink.avgDwellMs}ms</b>
              </div>
              {hoveredLink.isLoop && (
                <span className="pill" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#eab308' }}>
                  Return / Loop
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Top Transition Paths Table */}
      <div className="panel" style={{ padding: '20px' }}>
        <div className="edge" style={{ marginBottom: '14px' }}>
          <div>
            <div className="eyebrow">Transition Ranking</div>
            <h3 className="ptitle" style={{ margin: 0 }}>
              Most Frequent Gaze Navigation Paths
            </h3>
          </div>
          <span className="meta">Ranked by total frequency</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="tbl" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Source Region</th>
                <th></th>
                <th>Target Region</th>
                <th style={{ textAlign: 'right' }}>Frequency</th>
                <th style={{ textAlign: 'right' }}>Share (%)</th>
                <th style={{ textAlign: 'right' }}>Participants</th>
                <th style={{ textAlign: 'right' }}>Avg Dwell</th>
                <th>Pattern Classification</th>
              </tr>
            </thead>
            <tbody>
              {topLinks.slice(0, 8).map((link, idx) => {
                const sInfo = AOI_COLOR_MAP[link.source] || { name: link.source, color: '#94a3b8' };
                const tInfo = AOI_COLOR_MAP[link.target] || { name: link.target, color: '#94a3b8' };

                let classification = 'Exploration Transition';
                let classColor = 'var(--muted)';
                if (link.source === 'hints' && link.target === 'figB') {
                  classification = 'Hint Application → Figure B';
                  classColor = '#22c55e';
                } else if (link.source.startsWith('fig') && link.target.startsWith('option')) {
                  classification = 'Target Verification → Candidate';
                  classColor = '#a855f7';
                } else if (link.target === 'hints' && link.source !== 'hints') {
                  classification = 'Return to Clue for Review';
                  classColor = '#06b6d4';
                } else if (link.source.startsWith('option') && link.target.startsWith('option')) {
                  classification = 'Option Comparison / Trade-off';
                  classColor = '#f59e0b';
                }

                return (
                  <tr key={idx}>
                    <td style={{ color: 'var(--muted)', fontWeight: 600 }}>#{idx + 1}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: sInfo.color }} />
                        <span>{sInfo.name}</span>
                      </span>
                    </td>
                    <td style={{ color: 'var(--faint)' }}>→</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: tInfo.color }} />
                        <span>{tInfo.name}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{link.count}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)' }}>{link.percentage}%</td>
                    <td style={{ textAlign: 'right' }}>{link.usersCount}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)' }}>{link.avgDwellMs}ms</td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: classColor, fontWeight: 600 }}>
                        {classification}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
