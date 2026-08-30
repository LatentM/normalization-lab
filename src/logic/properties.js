// properties.js — the two questions you must ask of any decomposition.
//
// Contracts (Section 6):
//   isLossless(originalAttributes, subRelations, fds) -> { lossless, reason, tableau }
//   isDependencyPreserving(originalFds, subRelations) -> { preserved, lostFds }
//
// LOSSLESS JOIN — the chase (tableau) algorithm.
//   Build a grid with one row per sub-relation and one column per attribute.
//   Cell (i, j) starts as a_j if attribute j is in relation i, else b_ij.
//   Repeatedly: for each FD X → Y, if two rows agree on all of X, force them to
//   agree on all of Y — preferring an a-symbol if either row has one.
//   If some row ends up all a's, the decomposition is lossless.
//   This works for any number of sub-relations, unlike the two-relation
//   shortcut (R1 ∩ R2 → R1 or R1 ∩ R2 → R2), which we also report when it applies
//   because that is the version students are asked for by hand.
//
// DEPENDENCY PRESERVATION.
//   G = the union of the projections of F onto each sub-relation.
//   The decomposition preserves dependencies iff G⁺ = F⁺, which is tested FD by
//   FD: for each X → Y in F, is Y ⊆ X⁺ computed under G?
//   Computing every projection explicitly is expensive, so we use the standard
//   iterative test that never materialises G:
//       Z := X
//       repeat until Z stops growing:
//         for each Ri:  Z := Z ∪ ((Z ∩ Ri)⁺_F ∩ Ri)
//       preserved iff Y ⊆ Z
//   We *also* compute the explicit projections, because the lab needs to show
//   the student which FDs each fragment actually carries.

import {
  norm, isSubset, intersect, union, difference, subsetsBySize, fmt, fmtFd, setEq, isTrivial,
} from './setOps.js';
import { getClosure } from './closure.js';

// ---------------------------------------------------------------------------
// Projection of an FD set onto a sub-relation
// ---------------------------------------------------------------------------

/**
 * πR_i(F): every non-trivial FD X → Y with X, Y ⊆ Ri that is implied by F.
 * Computed by taking each subset X of Ri and keeping X⁺ ∩ Ri.
 * Reduced to a minimal-ish form: we drop FDs whose right side adds nothing
 * beyond what smaller left sides already give.
 */
export function projectFds(subAttributes, fds) {
  const sub = norm(subAttributes);
  const out = [];
  for (const x of subsetsBySize(sub)) {
    if (x.length === 0 || x.length === sub.length) continue;
    const { closure } = getClosure(x, fds);
    const y = difference(intersect(closure, sub), x);
    if (y.length === 0) continue;
    // Skip if a proper subset of x already yields y (keeps the display readable).
    const impliedBySmaller = out.some((f) => isSubset(f.lhs, x) && isSubset(y, f.rhs));
    if (impliedBySmaller) continue;
    out.push({ lhs: x, rhs: y });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Lossless join
// ---------------------------------------------------------------------------

export function isLossless(originalAttributes, subRelations, fds) {
  const attrs = norm(originalAttributes);
  const rels = subRelations.map((r) => norm(r.attributes || r));
  const realFds = fds.filter((f) => f.type !== 'mvd');

  // Sanity: the fragments must cover every attribute, or the join can never
  // reconstruct the original at all.
  const covered = union(...rels);
  if (!isSubset(attrs, covered)) {
    return {
      lossless: false,
      reason: `The fragments do not contain ${fmt(difference(attrs, covered))}, so the join cannot rebuild the original relation.`,
      tableau: null,
      history: [],
    };
  }

  if (rels.length === 1) {
    return {
      lossless: true,
      reason: 'A single fragment equal to the original relation is trivially lossless.',
      tableau: null,
      history: [],
    };
  }

  // --- build the initial tableau ---
  const grid = rels.map((r, i) =>
    attrs.map((a, j) => (r.includes(a) ? { kind: 'a', j } : { kind: 'b', i, j }))
  );
  const label = (c) => (c.kind === 'a' ? `a${c.j + 1}` : `b${c.i + 1}${c.j + 1}`);
  const snapshot = (g) => g.map((row) => row.map(label));

  const history = [{ note: 'Initial tableau. aⱼ means "same value"; bᵢⱼ means "possibly different".', grid: snapshot(grid) }];

  const sameCell = (p, q) =>
    p.kind === q.kind && (p.kind === 'a' ? p.j === q.j : p.i === q.i && p.j === q.j);

  let changed = true;
  let guard = 0;
  while (changed && guard < 200) {
    changed = false;
    guard++;
    for (const fd of realFds) {
      const lhsIdx = fd.lhs.map((a) => attrs.indexOf(a)).filter((i) => i >= 0);
      const rhsIdx = fd.rhs.map((a) => attrs.indexOf(a)).filter((i) => i >= 0);
      if (lhsIdx.length !== fd.lhs.length) continue;
      for (let r1 = 0; r1 < grid.length; r1++) {
        for (let r2 = r1 + 1; r2 < grid.length; r2++) {
          const agree = lhsIdx.every((j) => sameCell(grid[r1][j], grid[r2][j]));
          if (!agree) continue;
          for (const j of rhsIdx) {
            const c1 = grid[r1][j];
            const c2 = grid[r2][j];
            if (sameCell(c1, c2)) continue;
            // Prefer the a-symbol; otherwise take the lower-numbered b.
            const winner = c1.kind === 'a' ? c1 : c2.kind === 'a' ? c2 : c1.i <= c2.i ? c1 : c2;
            grid[r1][j] = winner;
            grid[r2][j] = winner;
            changed = true;
            history.push({
              note: `Rows ${r1 + 1} and ${r2 + 1} agree on ${fmt(fd.lhs)}, so ${fmtFd(fd)} forces column ${attrs[j]} to match: both become ${label(winner)}.`,
              grid: snapshot(grid),
            });
          }
        }
      }
    }
  }

  const winningRow = grid.findIndex((row) => row.every((c) => c.kind === 'a'));
  const lossless = winningRow >= 0;

  // Two-fragment shortcut, reported alongside because it is the hand method.
  let shortcut = null;
  if (rels.length === 2) {
    const inter = intersect(rels[0], rels[1]);
    const c = getClosure(inter, realFds).closure;
    const det0 = isSubset(rels[0], c);
    const det1 = isSubset(rels[1], c);
    shortcut = {
      intersection: inter,
      closure: c,
      holds: det0 || det1,
      text:
        inter.length === 0
          ? 'The two fragments share no attributes at all, so the join is a Cartesian product — lossy.'
          : `R₁ ∩ R₂ = ${fmt(inter)}, and ${fmt(inter)}⁺ = ${fmt(c)}. ` +
            (det0 || det1
              ? `That contains ${det0 ? 'R₁' : 'R₂'} = ${fmt(det0 ? rels[0] : rels[1])}, so the decomposition is lossless.`
              : 'That contains neither fragment in full, so the decomposition is lossy.'),
    };
  }

  return {
    lossless,
    reason: lossless
      ? `Row ${winningRow + 1} became all a-symbols, so the natural join of the fragments reproduces exactly the original relation — no spurious tuples.`
      : 'No row ever became all a-symbols. The natural join can produce tuples that were not in the original relation — the decomposition is lossy.',
    tableau: { attributes: attrs, rows: rels, grid: snapshot(grid) },
    history,
    shortcut,
  };
}

// ---------------------------------------------------------------------------
// Dependency preservation
// ---------------------------------------------------------------------------

export function isDependencyPreserving(originalFds, subRelations) {
  const realFds = originalFds.filter((f) => f.type !== 'mvd');
  const rels = subRelations.map((r) => norm(r.attributes || r));
  const lostFds = [];
  const checks = [];

  for (const fd of realFds) {
    if (isTrivial(fd)) continue;
    let z = norm(fd.lhs);
    let changed = true;
    const trace = [];
    while (changed) {
      changed = false;
      for (const ri of rels) {
        const inter = intersect(z, ri);
        if (inter.length === 0) continue;
        const gain = intersect(getClosure(inter, realFds).closure, ri);
        const added = difference(gain, z);
        if (added.length === 0) continue;
        z = union(z, added);
        trace.push(
          `Inside fragment ${fmt(ri)}: ${fmt(inter)}⁺ ∩ ${fmt(ri)} adds ${fmt(added)} → running set ${fmt(z)}.`
        );
        changed = true;
      }
    }
    const preserved = isSubset(fd.rhs, z);
    checks.push({ fd, preserved, reachable: z, trace });
    if (!preserved) lostFds.push(fd);
  }

  return {
    preserved: lostFds.length === 0,
    lostFds,
    checks,
    reason:
      lostFds.length === 0
        ? 'Every original dependency can still be enforced by looking at a single fragment (possibly after chaining through fragments), so no cross-fragment join is needed to check a constraint.'
        : `${lostFds.map(fmtFd).join(', ')} cannot be checked inside any single fragment. Enforcing ${lostFds.length === 1 ? 'it' : 'them'} would require joining fragments on every insert.`,
  };
}

/** Convenience wrapper used by both decomposition modules. */
export function analyseDecomposition(attributes, fds, relations) {
  const lossless = isLossless(attributes, relations, fds);
  const dep = isDependencyPreserving(fds, relations);
  return { lossless, dependencyPreservation: dep };
}

export { setEq };
