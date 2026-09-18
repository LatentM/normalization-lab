// DependencyGraph.jsx — the dependency set drawn as a directed graph.
//
// Reading a list of dependencies tells you what determines what; seeing them as
// a graph tells you the SHAPE of the problem at a glance. A transitive chain is
// a path. A cycle means every attribute on it is a key. An attribute with no
// incoming edge is essential — it must be in every candidate key, and here it
// is simply the node nothing points at.
//
// Attributes sit on a circle and dependencies are drawn as curved arrows. A
// composite left-hand side is drawn as one arrow per attribute of it, sharing a
// junction dot, so AB → C reads as two lines meeting before the arrowhead
// rather than as two unrelated edges.

import { useMemo } from 'react';

const SIZE = 460;
const R = 158;          // radius of the attribute ring
const NODE = 19;        // node radius

export default function DependencyGraph({ analysis }) {
  const { nodes, edges } = useMemo(() => {
    if (!analysis) return { nodes: [], edges: [] };
    const attrs = analysis.parsed.attributes;
    const prime = new Set(analysis.keys.primeAttributes);
    const n = attrs.length;
    const cx = SIZE / 2;
    const cy = SIZE / 2;

    const nodes = attrs.map((a, i) => {
      // Start at the top and go clockwise.
      const t = (i / n) * Math.PI * 2 - Math.PI / 2;
      return {
        id: a,
        x: cx + R * Math.cos(t),
        y: cy + R * Math.sin(t),
        prime: prime.has(a),
      };
    });
    const at = Object.fromEntries(nodes.map((v) => [v.id, v]));

    const edges = [];
    for (const fd of analysis.parsed.fds) {
      for (const target of fd.rhs) {
        if (fd.lhs.includes(target)) continue;   // trivial part
        const from = fd.lhs.map((s) => at[s]).filter(Boolean);
        const to = at[target];
        if (!to || from.length === 0) continue;
        // Junction: the centroid of the left-hand side, pulled toward the middle
        // so composite dependencies bow inward and do not overlap the ring.
        const mx = from.reduce((s, v) => s + v.x, 0) / from.length;
        const my = from.reduce((s, v) => s + v.y, 0) / from.length;
        const jx = mx + (cx - mx) * (from.length > 1 ? 0.45 : 0.3);
        const jy = my + (cy - my) * (from.length > 1 ? 0.45 : 0.3);
        edges.push({ from, to, jx, jy, composite: from.length > 1, label: fd });
      }
    }
    return { nodes, edges };
  }, [analysis]);

  if (!analysis || nodes.length === 0) return null;

  // Stop the arrow at the node's edge rather than its centre.
  const trim = (fx, fy, tx, ty, by) => {
    const dx = tx - fx, dy = ty - fy;
    const d = Math.hypot(dx, dy) || 1;
    return [tx - (dx / d) * by, ty - (dy / d) * by];
  };

  return (
    <figure className="figure">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="depgraph"
        role="img"
        aria-label={
          `Dependency graph: ${nodes.length} attributes, ${edges.length} dependency edges. ` +
          analysis.parsed.fds.map((f) => `${f.lhs.join('')} determines ${f.rhs.join('')}`).join('; ')
        }
      >
        <defs>
          <marker id="dg-arrow" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>

        <g className="dg-edges">
          {edges.map((e, i) => {
            const [ex, ey] = trim(e.jx, e.jy, e.to.x, e.to.y, NODE + 7);
            return (
              <g key={i}>
                {e.from.map((f, k) => {
                  const [sx, sy] = trim(e.jx, e.jy, f.x, f.y, NODE + 3);
                  return <line key={k} x1={sx} y1={sy} x2={e.jx} y2={e.jy} className="dg-leg" />;
                })}
                <line x1={e.jx} y1={e.jy} x2={ex} y2={ey} className="dg-head" markerEnd="url(#dg-arrow)" />
                {e.composite && <circle cx={e.jx} cy={e.jy} r="2.6" className="dg-junction" />}
              </g>
            );
          })}
        </g>

        <g className="dg-nodes">
          {nodes.map((v) => (
            <g key={v.id}>
              <circle cx={v.x} cy={v.y} r={NODE} className={v.prime ? 'dg-node prime' : 'dg-node'} />
              <text x={v.x} y={v.y} className="dg-label" dominantBaseline="central" textAnchor="middle">
                {v.id.length > 4 ? v.id.slice(0, 4) : v.id}
              </text>
            </g>
          ))}
        </g>
      </svg>

      <figcaption>
        <span className="dg-key"><i className="sw prime" /> prime attribute — appears in some candidate key</span>
        <span className="dg-key"><i className="sw" /> non-prime</span>
        <span className="dg-key"><i className="sw line" /> determines →</span>
        {nodes.some((v) => v.id.length > 4) && (
          <span className="dg-key muted">long names are truncated to four characters in the graph</span>
        )}
      </figcaption>
    </figure>
  );
}
