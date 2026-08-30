// closure.js — attribute closure X+ with a full step trace.
//
// Contract (Section 6):
//   getClosure(attributes, fds)
//     -> { closure, steps: [{ fdUsed, added, closureSoFar }] }
//
// Algorithm (the standard one):
//   result := X
//   repeat until nothing changes:
//     for each FD  L → R  in F:
//       if L ⊆ result then result := result ∪ R
//
// The only difference from a textbook implementation is that every time an FD
// actually adds something new, we record a step. That trace is the whole point
// of this lab — the answer is less interesting than the reasoning.

import { norm, isSubset, union, difference, fmtFd, fmt } from './setOps.js';

export function getClosure(attributes, fds) {
  let closure = norm(attributes);
  const steps = [];

  steps.push({
    fdUsed: null,
    added: [],
    closureSoFar: [...closure],
    explanation: `Start with the attributes themselves: ${fmt(closure)}⁺ begins as ${fmt(closure)} (reflexivity).`,
  });

  let changed = true;
  while (changed) {
    changed = false;
    for (const fd of fds) {
      if (fd.type === 'mvd') continue; // MVDs do not participate in FD closure
      if (!isSubset(fd.lhs, closure)) continue;
      const added = difference(fd.rhs, closure);
      if (added.length === 0) continue; // FD applies but teaches us nothing new
      closure = union(closure, added);
      steps.push({
        fdUsed: fd,
        added,
        closureSoFar: [...closure],
        explanation: `${fmt(fd.lhs)} is already in the closure, so ${fmtFd(fd)} lets us add ${fmt(added)}. Closure is now ${fmt(closure)}.`,
      });
      changed = true;
    }
  }

  return { closure, steps };
}

/** Convenience: does X functionally determine Y under F? */
export function determines(x, y, fds) {
  return isSubset(y, getClosure(x, fds).closure);
}

/** Convenience: is X a superkey of the relation? */
export function isSuperkey(x, attributes, fds) {
  return isSubset(attributes, getClosure(x, fds).closure);
}
