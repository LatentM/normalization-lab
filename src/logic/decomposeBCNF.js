// decomposeBCNF.js — BCNF decomposition by ANALYSIS (recursive splitting).
//
// Contract (Section 6):
//   decomposeToBCNF(attributes, fds)
//     -> { relations, lossless, dependencyPreserving, steps }
//
// The analysis algorithm:
//   If R is in BCNF, stop.
//   Otherwise find a non-trivial FD X → Y inside R whose left side X is not a
//   superkey of R. Replace R with two relations:
//        R1 = X⁺ (restricted to R)          — the "offending" part
//        R2 = X ∪ (R − X⁺)                  — everything else, keeping X to rejoin on
//   Recurse on both.
//
// Why it is always lossless:
//   R1 ∩ R2 = X, and X → R1 by construction, so the two-fragment shortcut for
//   losslessness holds at every split. Losslessness composes, so the whole
//   decomposition is lossless.
//
// Why it may lose dependencies:
//   Nothing in the procedure protects an FD whose left and right sides end up
//   in different fragments. The classic example is R(A,B,C) with AB → C and
//   C → A: BCNF forces a split that puts A and B in different relations, and
//   AB → C can no longer be checked without a join. 3NF synthesis keeps it.
//   That trade-off — BCNF buys you redundancy removal and may cost you
//   dependency preservation — is the single most examinable fact in this topic.
//
// The choice of which violating FD to split on affects the *shape* of the
// result (BCNF decomposition is not unique). We always pick the first violation
// in the order the user typed their dependencies, and we say so, because a
// silent arbitrary choice is the kind of thing that makes a tool untrustworthy.

import { norm, union, difference, intersect, isSubset, setEq, fmt, fmtFd, isTrivial } from './setOps.js';
import { getClosure } from './closure.js';
import { getCandidateKeys } from './keys.js';
import { projectFds, isLossless, isDependencyPreserving } from './properties.js';
import { checkNormalForm } from './normalForms.js';

const MAX_SPLITS = 60; // safety valve; a 10-attribute relation never needs this many

export function decomposeToBCNF(attributes, fds) {
  const attrs = norm(attributes);
  const realFds = fds.filter((f) => f.type !== 'mvd');
  const steps = [];

  /** Find the first FD inside `sub` that violates BCNF, or null. */
  function findViolation(sub) {
    const projected = projectFds(sub, realFds);
    // Prefer a violation that corresponds to an FD the user actually wrote —
    // the trace reads far better that way.
    const ordered = [
      ...realFds.filter((f) => isSubset(f.lhs, sub) && intersect(f.rhs, sub).length > 0),
      ...projected,
    ];
    for (const raw of ordered) {
      const lhs = intersect(raw.lhs, sub);
      const rhs = difference(intersect(raw.rhs, sub), lhs);
      if (lhs.length === 0 || rhs.length === 0) continue;
      const fd = { lhs, rhs };
      if (isTrivial(fd)) continue;
      const closureInSub = intersect(getClosure(lhs, realFds).closure, sub);
      if (setEq(closureInSub, sub)) continue; // lhs is a superkey of sub → fine
      return { fd, closureInSub, projected };
    }
    return null;
  }

  let fragments = [norm(attrs)];
  let splits = 0;

  let done = false;
  while (!done && splits < MAX_SPLITS) {
    done = true;
    for (let i = 0; i < fragments.length; i++) {
      const sub = fragments[i];
      if (sub.length <= 2) continue; // any 2-attribute relation is automatically in BCNF
      const v = findViolation(sub);
      if (!v) continue;

      const r1 = norm(v.closureInSub);
      const r2 = norm(union(v.fd.lhs, difference(sub, r1)));

      steps.push({
        stage: 'split',
        parent: sub,
        violatingFd: v.fd,
        children: [r1, r2],
        reason:
          `In ${fmt(sub)}, ${fmtFd(v.fd)} is non-trivial and ${fmt(v.fd.lhs)}⁺ ∩ ${fmt(sub)} = ${fmt(r1)} ≠ ${fmt(sub)}, ` +
          `so ${fmt(v.fd.lhs)} is not a superkey here — a BCNF violation. ` +
          `Split into ${fmt(r1)} (everything ${fmt(v.fd.lhs)} determines) and ${fmt(r2)} (the rest, keeping ${fmt(v.fd.lhs)} so the two can be joined back).`,
      });

      fragments.splice(i, 1, r1, r2);
      splits++;
      done = false;
      break;
    }
  }

  // Remove fragments contained in another fragment.
  fragments = fragments.filter(
    (f, i) => !fragments.some((o, j) => j !== i && isSubset(f, o) && !setEq(f, o))
  );
  const seen = [];
  fragments = fragments.filter((f) => {
    if (seen.some((s) => setEq(s, f))) return false;
    seen.push(f);
    return true;
  });

  if (steps.length === 0) {
    steps.push({
      stage: 'already-bcnf',
      parent: attrs,
      reason: `${fmt(attrs)} is already in BCNF — every non-trivial dependency has a superkey on its left. No decomposition needed.`,
    });
  }

  const enriched = fragments.map((f, i) => {
    const projected = projectFds(f, realFds);
    const ck = getCandidateKeys(f, projected).candidateKeys;
    const nf = checkNormalForm(f, projected, ck);
    return {
      name: `S${i + 1}`,
      attributes: f,
      fds: projected,
      candidateKeys: ck,
      highestNF: nf.highestNF,
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
    steps,
    summary:
      `Analysis produced ${enriched.length} relation${enriched.length === 1 ? '' : 's'}, every one in BCNF. ` +
      `Lossless: ${lossless.lossless ? 'yes — guaranteed, every split joins back on X' : 'no'}. ` +
      `Dependency preserving: ${dep.preserved ? 'yes (this time — BCNF does not promise it)' : `no — ${dep.lostFds.map(fmtFd).join(', ')} cannot be checked without a join`}.`,
  };
}
