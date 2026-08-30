// decompose3NF.js — 3NF decomposition by SYNTHESIS.
//
// Contract (Section 6):
//   decomposeTo3NF(attributes, fds)
//     -> { relations, lossless, dependencyPreserving, steps }
//
// The synthesis algorithm (Bernstein):
//   1. Compute a minimal cover G of F.
//   2. For each FD X → Y in G, make a relation with attributes X ∪ Y.
//      (FDs with the same left side are merged into one relation first.)
//   3. If none of the relations contains a candidate key of R, add one
//      relation consisting of a candidate key. This is the step that
//      guarantees the lossless-join property.
//   4. Remove any relation whose attributes are contained in another.
//
// Why this always works:
//   • Dependency preserving — by construction. Every FD of the minimal cover
//     lives entirely inside one relation, so every constraint can be checked
//     without a join. This is the guarantee BCNF cannot make.
//   • Lossless — because of step 3. A relation holding a candidate key can be
//     joined back with every other fragment without inventing tuples.
//   • Every fragment is in 3NF — proof is in any textbook; the intuition is
//     that a fragment built from X → Y has X as its key.

import { norm, union, isSubset, setEq, fmt, fmtFd, difference } from './setOps.js';
import { getMinimalCover, groupByLhs } from './minimalCover.js';
import { getCandidateKeys } from './keys.js';
import { projectFds, isLossless, isDependencyPreserving } from './properties.js';
import { checkNormalForm } from './normalForms.js';

export function decomposeTo3NF(attributes, fds) {
  const attrs = norm(attributes);
  const realFds = fds.filter((f) => f.type !== 'mvd');
  const steps = [];

  // --- step 1 ---
  const { cover, steps: coverSteps } = getMinimalCover(realFds);
  steps.push({
    stage: 'minimal-cover',
    detail: cover,
    reason: `Minimal cover: ${cover.map(fmtFd).join(',  ') || '(empty)'}. Synthesis is only correct when it starts from a minimal cover — extraneous attributes would leak into the fragments.`,
    substeps: coverSteps,
  });

  // --- step 2 ---
  const groups = groupByLhs(cover);
  let relations = groups.map((g) => ({
    attributes: union(g.lhs, g.rhs),
    fromFd: { lhs: g.lhs, rhs: g.rhs },
  }));
  steps.push({
    stage: 'build-relations',
    detail: relations.map((r) => r.attributes),
    reason:
      `One relation per distinct left-hand side: ${groups
        .map((g) => `${fmt(g.lhs)} → ${fmt(g.rhs)} gives ${fmt(union(g.lhs, g.rhs))}`)
        .join('; ')}. Merging FDs that share a left side keeps the result smaller without losing anything.`,
  });

  // --- step 3 ---
  const { candidateKeys } = getCandidateKeys(attrs, realFds);
  const containsKey = candidateKeys.some((ck) => relations.some((r) => isSubset(ck, r.attributes)));
  let keyAdded = null;
  if (!containsKey && candidateKeys.length > 0) {
    keyAdded = candidateKeys[0];
    relations.push({ attributes: norm(keyAdded), fromFd: null, isKeyRelation: true });
    steps.push({
      stage: 'add-key',
      detail: keyAdded,
      reason: `No fragment contained a candidate key, so the join could lose information. Adding the relation ${fmt(keyAdded)} restores the lossless-join property.`,
    });
  } else {
    steps.push({
      stage: 'add-key',
      detail: null,
      reason:
        candidateKeys.length === 0
          ? 'No candidate key could be computed, so no key relation was added.'
          : `A fragment already contains the candidate key ${fmt(candidateKeys.find((ck) => relations.some((r) => isSubset(ck, r.attributes))))}, so no extra relation is needed — the decomposition is already lossless.`,
    });
  }

  // --- step 4 ---
  const before = relations.length;
  relations = relations.filter(
    (r, i) => !relations.some((o, j) => j !== i && isSubset(r.attributes, o.attributes) && !setEq(r.attributes, o.attributes))
  );
  // Drop exact duplicates too.
  const seen = [];
  relations = relations.filter((r) => {
    if (seen.some((s) => setEq(s, r.attributes))) return false;
    seen.push(r.attributes);
    return true;
  });
  if (relations.length !== before) {
    steps.push({
      stage: 'remove-subsumed',
      detail: relations.map((r) => r.attributes),
      reason: 'Removed fragments whose attributes were already contained in another fragment — they carry no extra information.',
    });
  }

  // --- annotate each fragment ---
  const enriched = relations.map((r, i) => {
    const projected = projectFds(r.attributes, realFds);
    const ck = getCandidateKeys(r.attributes, projected).candidateKeys;
    const nf = checkNormalForm(r.attributes, projected, ck);
    return {
      name: `R${i + 1}`,
      attributes: r.attributes,
      fds: projected,
      candidateKeys: ck,
      highestNF: nf.highestNF,
      isKeyRelation: !!r.isKeyRelation,
      fromFd: r.fromFd,
    };
  });

  const lossless = isLossless(attrs, enriched, realFds);
  const dep = isDependencyPreserving(realFds, enriched);

  return {
    relations: enriched,
    lossless: lossless.lossless,
    losslessDetail: lossless,
    dependencyPreserving: dep.preserved,
    dependencyDetail: dep,
    keyAdded,
    minimalCover: cover,
    candidateKeys,
    steps,
    summary:
      `Synthesis produced ${enriched.length} relation${enriched.length === 1 ? '' : 's'}. ` +
      `Lossless: ${lossless.lossless ? 'yes' : 'no'}. Dependency preserving: ${dep.preserved ? 'yes — guaranteed by the algorithm' : 'no (unexpected; check the minimal cover)'}.`,
  };
}

export { difference };
