// keys.js — superkeys, candidate keys, prime / non-prime attributes.
//
// Contract (Section 6):
//   getCandidateKeys(attributes, fds)
//     -> { candidateKeys, superKeys, primeAttributes, nonPrimeAttributes, steps, essential }
//
// Method: enumerate every subset of the attribute set in increasing size order,
// keep those whose closure is the whole relation (superkeys), and among those
// keep the ones with no proper subset that is already a superkey (candidate keys).
//
// This is exponential — 2^n subsets — and that is *not* a bug to apologise for.
// Finding all candidate keys is NP-hard in general; every tool that reports all
// of them pays this price. We simply cap n and say so out loud.
//
// One optimisation is applied because it is both cheap and pedagogically nice:
// an attribute that never appears on the right-hand side of any FD must be in
// every candidate key ("essential" attributes). We report them but still run
// the full enumeration, so the displayed reasoning stays honest and complete.

import { norm, isSubset, subsetsBySize, difference, union, fmt } from './setOps.js';
import { getClosure } from './closure.js';

export function getEssentialAttributes(attributes, fds) {
  const onRhs = union(...fds.filter((f) => f.type !== 'mvd').map((f) => f.rhs));
  return difference(attributes, onRhs);
}

export function getCandidateKeys(attributes, fds) {
  const attrs = norm(attributes);
  const realFds = fds.filter((f) => f.type !== 'mvd');
  const steps = [];

  const essential = getEssentialAttributes(attrs, realFds);
  if (essential.length) {
    steps.push({
      stage: 'essential',
      set: essential,
      reason: `${fmt(essential)} never appear(s) on the right of any dependency, so nothing can determine them. Every candidate key must contain them.`,
    });
  }

  // Fast exit: if the essential attributes alone determine everything,
  // they form the unique candidate key.
  if (essential.length) {
    const c = getClosure(essential, realFds).closure;
    if (isSubset(attrs, c)) {
      steps.push({
        stage: 'shortcut',
        set: essential,
        reason: `${fmt(essential)}⁺ = ${fmt(c)} already covers the relation, so ${fmt(essential)} is the only candidate key.`,
      });
    }
  }

  const superKeys = [];
  const candidateKeys = [];

  for (const subset of subsetsBySize(attrs)) {
    if (subset.length === 0) continue;
    // Prune: a superset of a known candidate key is a superkey but never a candidate key.
    const containsCk = candidateKeys.some((ck) => isSubset(ck, subset));
    if (containsCk) {
      superKeys.push(subset);
      continue;
    }
    const { closure } = getClosure(subset, realFds);
    if (!isSubset(attrs, closure)) continue;
    superKeys.push(subset);
    // Minimality: because subsets arrive smallest-first and every smaller
    // superkey that is minimal is already in candidateKeys, reaching here with
    // no candidate key inside means this one is minimal.
    candidateKeys.push(subset);
    steps.push({
      stage: 'candidate',
      set: subset,
      reason: `${fmt(subset)}⁺ = ${fmt(closure)} = the whole relation, and no proper subset of ${fmt(subset)} does that. Candidate key.`,
    });
  }

  const primeAttributes = norm(candidateKeys.flat());
  const nonPrimeAttributes = difference(attrs, primeAttributes);

  return {
    candidateKeys,
    superKeys,
    primeAttributes,
    nonPrimeAttributes,
    essential,
    steps,
  };
}

/** Candidate keys of a sub-relation, given the FDs that project onto it. */
export function keysOfSubRelation(subAttributes, projectedFds) {
  return getCandidateKeys(subAttributes, projectedFds).candidateKeys;
}
