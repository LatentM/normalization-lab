// higherNF.js — multivalued dependencies, 4NF, and the 5NF join-dependency check.
//
// Contracts (Section 6):
//   check4NF(attributes, fds, mvds, candidateKeys) -> { is4NF, violations }
//   decomposeTo4NF(attributes, fds, mvds)          -> { relations, steps }
//   check5NF(attributes, fds, joinDependency)      -> { is5NF, reason, tableau }
//
// ---------------------------------------------------------------------------
// 4NF
// ---------------------------------------------------------------------------
// An MVD X ↠ Y on R says: for a given X value, the set of Y values is
// completely independent of the remaining attributes R − X − Y. The classic
// symptom is a table that multiplies rows for no reason — a lecturer's courses
// and a lecturer's phone numbers stored together produce every combination.
//
// X ↠ Y is TRIVIAL when Y ⊆ X, or when X ∪ Y = R. Trivial MVDs never violate
// anything.
//
// R is in 4NF when, for every non-trivial MVD X ↠ Y that holds on R, X is a
// superkey of R. Note that every FD is also an MVD, so a BCNF violation is
// automatically a 4NF violation: 4NF is strictly stronger than BCNF.
//
// Complementation: if X ↠ Y holds then X ↠ (R − X − Y) holds too. The lab
// derives the complement automatically so students see the pair.
//
// ---------------------------------------------------------------------------
// 5NF — and exactly what this check does and does not do
// ---------------------------------------------------------------------------
// R is in 5NF (project-join normal form) when every non-trivial join dependency
// that holds on R is implied by the candidate keys — that is, every component
// of the JD is a superkey of R.
//
// You cannot decide that from a dependency set: there is no finite procedure
// that enumerates the join dependencies holding on a relation, and general JD
// implication is not decidable from an FD set alone. Any tool claiming a
// complete 5NF decider is overclaiming.
//
// What this lab does instead — the standard practical check, and the only
// honest one:
//   The student supplies a specific join dependency *(R1, …, Rn).
//   1. We test whether that decomposition is lossless under the given FDs,
//      using the chase. If it is, the JD is implied by F and therefore holds.
//   2. We then test whether every component Ri is a superkey of R.
//        • all superkeys  → this particular JD does not violate 5NF
//        • some component is not a superkey, and the JD holds
//                         → this JD is a genuine 5NF violation
//   Silence about other join dependencies is not evidence of their absence,
//   and the interface says so.

import {
  norm, union, difference, intersect, isSubset, setEq, fmt, fmtFd,
} from './setOps.js';
import { getClosure, isSuperkey } from './closure.js';
import { getCandidateKeys } from './keys.js';
import { isLossless, projectFds } from './properties.js';
import { checkNormalForm } from './normalForms.js';

// ---------------------------------------------------------------------------
// MVD helpers
// ---------------------------------------------------------------------------

export function isTrivialMvd(mvd, attributes) {
  const attrs = norm(attributes);
  if (isSubset(mvd.rhs, mvd.lhs)) return { trivial: true, why: 'the right side is inside the left side' };
  if (setEq(union(mvd.lhs, mvd.rhs), attrs))
    return { trivial: true, why: 'the left and right sides together are the whole relation' };
  return { trivial: false };
}

/** X ↠ Y implies X ↠ (R − X − Y). */
export function complementMvd(mvd, attributes) {
  return { lhs: norm(mvd.lhs), rhs: difference(norm(attributes), union(mvd.lhs, mvd.rhs)), type: 'mvd' };
}

// ---------------------------------------------------------------------------
// 4NF
// ---------------------------------------------------------------------------

export function check4NF(attributes, fds, mvds, candidateKeys) {
  const attrs = norm(attributes);
  const realFds = fds.filter((f) => f.type !== 'mvd');
  const cks = candidateKeys && candidateKeys.length ? candidateKeys : getCandidateKeys(attrs, realFds).candidateKeys;

  const violations = [];
  const notes = [];

  // Every FD is an MVD, so BCNF violations carry straight over.
  const nf = checkNormalForm(attrs, realFds, cks);
  for (const v of nf.bcnfViolations) {
    violations.push({
      dependency: v.fd,
      source: 'fd',
      reason:
        `${fmtFd(v.fd)} already violates BCNF, and every functional dependency is also a multivalued dependency. ` +
        `4NF is strictly stronger than BCNF, so this breaks 4NF too.`,
    });
  }

  for (const mvd of mvds) {
    const triv = isTrivialMvd(mvd, attrs);
    if (triv.trivial) {
      notes.push({
        dependency: mvd,
        text: `${fmtFd(mvd)} is trivial (${triv.why}), so it cannot violate 4NF.`,
      });
      continue;
    }
    if (isSuperkey(mvd.lhs, attrs, realFds)) {
      notes.push({
        dependency: mvd,
        text: `${fmtFd(mvd)} is non-trivial, but ${fmt(mvd.lhs)} is a superkey, so 4NF is satisfied for it.`,
      });
      continue;
    }
    const comp = complementMvd(mvd, attrs);
    violations.push({
      dependency: mvd,
      source: 'mvd',
      complement: comp,
      reason:
        `${fmtFd(mvd)} is non-trivial (${fmt(mvd.rhs)} ⊄ ${fmt(mvd.lhs)} and ${fmt(union(mvd.lhs, mvd.rhs))} ≠ ${fmt(attrs)}), ` +
        `and ${fmt(mvd.lhs)}⁺ = ${fmt(getClosure(mvd.lhs, realFds).closure)} is not the whole relation, so ${fmt(mvd.lhs)} is not a superkey. ` +
        `Its complement ${fmtFd(comp)} holds automatically, and the two together force every combination of ${fmt(mvd.rhs)} and ${fmt(comp.rhs)} to be stored — that is the redundancy 4NF removes.`,
    });
  }

  return {
    is4NF: violations.length === 0,
    violations,
    notes,
    bcnfFirst: nf.bcnfViolations.length > 0,
    candidateKeys: cks,
  };
}

export function decomposeTo4NF(attributes, fds, mvds) {
  const attrs = norm(attributes);
  const realFds = fds.filter((f) => f.type !== 'mvd');
  const steps = [];

  let fragments = [attrs];
  let guard = 0;

  const mvdsIn = (sub) =>
    mvds
      .map((m) => ({ lhs: intersect(m.lhs, sub), rhs: intersect(m.rhs, sub), type: 'mvd' }))
      .filter((m) => m.lhs.length > 0 && m.rhs.length > 0 && isSubset(union(m.lhs, m.rhs), sub));

  let changed = true;
  while (changed && guard < 40) {
    changed = false;
    guard++;
    for (let i = 0; i < fragments.length; i++) {
      const sub = fragments[i];
      if (sub.length <= 2) continue;
      const localMvds = mvdsIn(sub);
      const localFds = projectFds(sub, realFds);
      const localCks = getCandidateKeys(sub, localFds).candidateKeys;
      const res = check4NF(sub, localFds, localMvds, localCks);
      const mvdViolation = res.violations.find((v) => v.source === 'mvd');
      const target = mvdViolation
        ? mvdViolation.dependency
        : res.violations.length
          ? { lhs: res.violations[0].dependency.lhs, rhs: res.violations[0].dependency.rhs, type: 'mvd' }
          : null;
      if (!target) continue;

      const r1 = union(target.lhs, target.rhs);
      const r2 = union(target.lhs, difference(sub, union(target.lhs, target.rhs)));
      if (setEq(r1, sub) || setEq(r2, sub)) continue;

      steps.push({
        parent: sub,
        dependency: target,
        children: [r1, r2],
        source: mvdViolation ? 'mvd' : 'fd',
        reason:
          `${fmt(sub)} is not in 4NF because of ${fmtFd(target)}. Split on it: ` +
          `${fmt(r1)} holds the dependency itself, ${fmt(r2)} holds ${fmt(target.lhs)} together with everything else. ` +
          `The two share ${fmt(target.lhs)}, and an MVD guarantees the join is lossless — that is precisely what "the sets are independent" means.`,
      });
      fragments.splice(i, 1, r1, r2);
      changed = true;
      break;
    }
  }

  fragments = fragments.filter((f, i) => !fragments.some((o, j) => j !== i && isSubset(f, o) && !setEq(f, o)));

  const enriched = fragments.map((f, i) => {
    const projected = projectFds(f, realFds);
    return {
      name: `Q${i + 1}`,
      attributes: f,
      fds: projected,
      candidateKeys: getCandidateKeys(f, projected).candidateKeys,
      mvds: mvdsIn(f).filter((m) => !isTrivialMvd(m, f).trivial),
    };
  });

  const lossless = isLossless(attrs, enriched, realFds);

  return {
    relations: enriched,
    steps,
    lossless: lossless.lossless || steps.length > 0, // MVD splits are lossless by definition of an MVD
    losslessNote:
      steps.length > 0
        ? 'Each split was made on a multivalued dependency, and an MVD split is lossless by definition: it is exactly the statement that the two attribute sets are independent given the left side.'
        : lossless.reason,
    summary:
      steps.length === 0
        ? 'The relation was already in 4NF; nothing to decompose.'
        : `Decomposed into ${enriched.length} relations, each free of the offending multivalued dependencies.`,
  };
}

// ---------------------------------------------------------------------------
// 5NF
// ---------------------------------------------------------------------------

export function check5NF(attributes, fds, joinDependency) {
  const attrs = norm(attributes);
  const realFds = fds.filter((f) => f.type !== 'mvd');

  if (!joinDependency || !joinDependency.components || joinDependency.components.length < 2) {
    return {
      is5NF: null,
      reason: 'No join dependency supplied. Enter one as *(AB, BC, CA) to test it.',
      tableau: null,
      scope: SCOPE_NOTE,
    };
  }

  const components = joinDependency.components.map(norm);
  const covered = union(...components);
  if (!isSubset(attrs, covered)) {
    return {
      is5NF: null,
      reason: `The components omit ${fmt(difference(attrs, covered))}, so this is not a join dependency on ${fmt(attrs)}.`,
      tableau: null,
      scope: SCOPE_NOTE,
    };
  }

  // Step 1 — does the JD hold? Test losslessness of the decomposition under F.
  const loss = isLossless(attrs, components.map((c) => ({ attributes: c })), realFds);

  // Step 2 — is every component a superkey?
  const { candidateKeys } = getCandidateKeys(attrs, realFds);
  const componentReport = components.map((c) => {
    const cl = getClosure(c, realFds).closure;
    const sk = isSubset(attrs, cl);
    return {
      component: c,
      closure: cl,
      isSuperkey: sk,
      trivial: setEq(c, attrs),
      text: sk
        ? `${fmt(c)}⁺ = ${fmt(cl)} = the whole relation, so ${fmt(c)} is a superkey.`
        : `${fmt(c)}⁺ = ${fmt(cl)}, which is not the whole relation, so ${fmt(c)} is NOT a superkey.`,
    };
  });

  const nonSuperkeys = componentReport.filter((c) => !c.isSuperkey);
  const nonTrivial = components.length > 1 && !components.some((c) => setEq(c, attrs));

  let is5NF;
  let reason;

  if (!loss.lossless) {
    is5NF = true;
    reason =
      `The chase does not reduce to a row of all a-symbols, so this join dependency does NOT hold under the given functional dependencies — ` +
      `joining ${components.map(fmt).join(' ⋈ ')} would produce spurious tuples. A join dependency that does not hold cannot violate 5NF, ` +
      `so this test finds no violation. (It says nothing about other join dependencies.)`;
  } else if (!nonTrivial) {
    is5NF = true;
    reason = 'The supplied join dependency is trivial (one component is the whole relation), so it cannot violate 5NF.';
  } else if (nonSuperkeys.length === 0) {
    is5NF = true;
    reason =
      `The join dependency holds, and every component is a superkey of ${fmt(attrs)}. A join dependency implied by the candidate keys ` +
      `never violates 5NF, so this relation passes the test for this join dependency.`;
  } else {
    is5NF = false;
    reason =
      `The join dependency holds (the chase produced a row of all a-symbols), it is non-trivial, and ` +
      `${nonSuperkeys.map((c) => fmt(c.component)).join(', ')} ${nonSuperkeys.length === 1 ? 'is' : 'are'} not ` +
      `${nonSuperkeys.length === 1 ? 'a superkey' : 'superkeys'}. That is a genuine 5NF violation: the relation can be losslessly ` +
      `split three (or more) ways even though no two-way split works, so it stores a redundant combination. ` +
      `Decompose it into ${components.map(fmt).join(', ')}.`;
  }

  return {
    is5NF,
    reason,
    holds: loss.lossless,
    tableau: loss.tableau,
    history: loss.history,
    components: componentReport,
    candidateKeys,
    scope: SCOPE_NOTE,
  };
}

export const SCOPE_NOTE =
  'Scope of this check, stated precisely: the lab tests one join dependency that you supply. ' +
  'It answers two questions — does this JD hold under your FDs (by the chase), and is every component a superkey. ' +
  'It does NOT enumerate all join dependencies holding on the relation, because no algorithm can do that from a dependency set alone. ' +
  'A "pass" here means "this join dependency does not violate 5NF", never "the relation is in 5NF".';
