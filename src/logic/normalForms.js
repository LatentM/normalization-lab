// normalForms.js — diagnose the highest normal form from 1NF to BCNF.
//
// Contract (Section 6):
//   checkNormalForm(attributes, fds, candidateKeys)
//     -> { highestNF, violations: [{ fd, type, reason }], checks }
//
// The definitions used, stated exactly:
//
//   1NF   Every attribute value is atomic. This is a property of the *data*,
//         not of the dependency set, so no dependency set can prove or disprove
//         it. The lab assumes 1NF and says so rather than pretending to test it.
//
//   2NF   In 1NF, and no non-prime attribute is partially dependent on any
//         candidate key. A partial dependency is X → A where X is a *proper*
//         subset of some candidate key and A is non-prime.
//         Only composite candidate keys can produce a 2NF violation.
//
//   3NF   In 2NF, and for every non-trivial X → Y, either X is a superkey,
//         or every attribute of Y − X is prime.
//
//   BCNF  For every non-trivial X → Y, X is a superkey. Full stop — no
//         "or prime" escape hatch. This is the only difference from 3NF, and
//         it is the whole reason BCNF can cost you dependency preservation.

import { isSubset, difference, norm, fmt, fmtFd, isTrivial, setEq } from './setOps.js';
import { getClosure, isSuperkey } from './closure.js';

const ORDER = ['Unnormalised', '1NF', '2NF', '3NF', 'BCNF'];

export function checkNormalForm(attributes, fds, candidateKeys) {
  const attrs = norm(attributes);
  const realFds = fds.filter((f) => f.type !== 'mvd');
  const prime = norm(candidateKeys.flat());
  const violations = [];

  const superkey = (x) => isSuperkey(x, attrs, realFds);

  // ---- 2NF ---------------------------------------------------------------
  const partial = [];
  const compositeKeys = candidateKeys.filter((k) => k.length > 1);
  for (const fd of realFds) {
    if (isTrivial(fd)) continue;
    for (const ck of compositeKeys) {
      const lhsIsProperSubsetOfKey = isSubset(fd.lhs, ck) && fd.lhs.length < ck.length;
      if (!lhsIsProperSubsetOfKey) continue;
      const badAttrs = difference(fd.rhs, fd.lhs).filter((a) => !prime.includes(a));
      if (badAttrs.length === 0) continue;
      partial.push({
        fd,
        type: '2NF',
        key: ck,
        reason:
          `${fmt(fd.lhs)} is only part of the candidate key ${fmt(ck)}, yet it already determines the ` +
          `non-prime attribute${badAttrs.length > 1 ? 's' : ''} ${fmt(badAttrs)}. That is a partial dependency, so the relation is not in 2NF.`,
      });
    }
  }
  violations.push(...partial);

  // ---- 3NF ---------------------------------------------------------------
  const transitive = [];
  for (const fd of realFds) {
    if (isTrivial(fd)) continue;
    if (superkey(fd.lhs)) continue;
    const nonPrimeRhs = difference(fd.rhs, fd.lhs).filter((a) => !prime.includes(a));
    if (nonPrimeRhs.length === 0) continue; // allowed by 3NF: right side is all prime
    // Skip if this exact FD is already reported as a 2NF partial dependency.
    const already = partial.some((p) => setEq(p.fd.lhs, fd.lhs) && setEq(p.fd.rhs, fd.rhs));
    transitive.push({
      fd,
      type: '3NF',
      alreadyCounted: already,
      reason:
        `${fmt(fd.lhs)} is not a superkey (${fmt(fd.lhs)}⁺ = ${fmt(getClosure(fd.lhs, realFds).closure)}), and ` +
        `${fmt(nonPrimeRhs)} ${nonPrimeRhs.length > 1 ? 'are' : 'is'} non-prime. A non-key attribute is determined ` +
        `by a non-key attribute — a transitive dependency — so the relation is not in 3NF.`,
    });
  }
  violations.push(...transitive.filter((t) => !t.alreadyCounted));

  // ---- BCNF --------------------------------------------------------------
  const bcnf = [];
  for (const fd of realFds) {
    if (isTrivial(fd)) continue;
    if (superkey(fd.lhs)) continue;
    bcnf.push({
      fd,
      type: 'BCNF',
      reason:
        `BCNF requires the left side of every non-trivial dependency to be a superkey. ` +
        `${fmt(fd.lhs)}⁺ = ${fmt(getClosure(fd.lhs, realFds).closure)}, which is not the whole relation ${fmt(attrs)}, ` +
        `so ${fmtFd(fd)} violates BCNF.`,
    });
  }

  const is2NF = partial.length === 0;
  const is3NF = is2NF && transitive.length === 0;
  const isBCNF = bcnf.length === 0;

  let highestNF = '1NF';
  if (is2NF) highestNF = '2NF';
  if (is3NF) highestNF = '3NF';
  if (is3NF && isBCNF) highestNF = 'BCNF';

  const checks = [
    {
      nf: '1NF',
      passed: true,
      assumed: true,
      note: 'Assumed. Atomicity is a property of the stored values, not of the dependency set, so it cannot be decided from F.',
    },
    {
      nf: '2NF',
      passed: is2NF,
      note: is2NF
        ? compositeKeys.length === 0
          ? 'Every candidate key is a single attribute, so a partial dependency is impossible.'
          : 'No non-prime attribute depends on only part of a candidate key.'
        : `${partial.length} partial dependenc${partial.length === 1 ? 'y' : 'ies'} found.`,
      blockers: partial,
    },
    {
      nf: '3NF',
      passed: is3NF,
      note: is3NF
        ? 'Every non-trivial dependency has a superkey on the left, or an all-prime right side.'
        : `${transitive.length} transitive dependenc${transitive.length === 1 ? 'y' : 'ies'} found.`,
      blockers: transitive,
    },
    {
      nf: 'BCNF',
      passed: isBCNF,
      note: isBCNF
        ? 'Every non-trivial dependency has a superkey on the left.'
        : `${bcnf.length} dependenc${bcnf.length === 1 ? 'y' : 'ies'} with a non-superkey left side.`,
      blockers: bcnf,
    },
  ];

  return {
    highestNF,
    violations: [...violations, ...(isBCNF ? [] : bcnf)],
    bcnfViolations: bcnf,
    partialDependencies: partial,
    transitiveDependencies: transitive,
    checks,
    primeAttributes: prime,
    nonPrimeAttributes: difference(attrs, prime),
  };
}

export { ORDER as NF_ORDER };
