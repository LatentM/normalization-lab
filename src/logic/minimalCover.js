// minimalCover.js — canonical / minimal cover with every reduction shown.
//
// Contract (Section 6):
//   getMinimalCover(fds)
//     -> { cover, steps: [{ stage, fdAffected, reason }] }
//   stages: 'singleton-rhs' | 'remove-extraneous-lhs' | 'remove-redundant-fd'
//
// The three stages, in the order they must be done:
//
//   1. Split every right-hand side into single attributes.
//      A → BC becomes A → B and A → C. Always safe (decomposition rule).
//
//   2. Remove extraneous left-hand-side attributes.
//      For AB → C, ask: is C already in A⁺ computed against the *current* set?
//      If yes, B was carrying no weight and AB → C becomes A → C.
//
//   3. Remove redundant dependencies.
//      For each X → Y, delete it, then compute X⁺ against what remains.
//      If Y is still reachable, the dependency was implied and stays deleted.
//
// Order matters. Doing step 3 before step 2 can leave an extraneous attribute
// in place, and the result is still a cover but not a *minimal* one. This is the
// single most common place where a hand-written or generated implementation is
// subtly wrong, which is exactly why the plan asks for it to be hand-verified.

import { cloneFds, isSubset, difference, norm, fmtFd, fmt, setEq } from './setOps.js';
import { getClosure } from './closure.js';

/** Remove exact duplicates from an FD list. */
function dedupe(fds) {
  const seen = new Set();
  const out = [];
  for (const f of fds) {
    const key = `${norm(f.lhs).join(',')}=>${norm(f.rhs).join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

export function getMinimalCover(inputFds) {
  const steps = [];
  const fds = cloneFds(inputFds.filter((f) => f.type !== 'mvd'));

  // ---- Stage 1: singleton right-hand sides -------------------------------
  let working = [];
  for (const fd of fds) {
    if (fd.rhs.length === 1) {
      working.push({ lhs: norm(fd.lhs), rhs: [...fd.rhs] });
      continue;
    }
    for (const a of fd.rhs) {
      working.push({ lhs: norm(fd.lhs), rhs: [a] });
    }
    steps.push({
      stage: 'singleton-rhs',
      fdAffected: fd,
      result: fd.rhs.map((a) => ({ lhs: norm(fd.lhs), rhs: [a] })),
      reason: `Split ${fmtFd(fd)} into ${fd.rhs.map((a) => `${fmt(fd.lhs)} → ${a}`).join(', ')} using the decomposition rule.`,
    });
  }

  // Drop trivial FDs (A → A) and duplicates; they can never be needed.
  const beforeTrivial = working.length;
  working = working.filter((f) => !isSubset(f.rhs, f.lhs));
  if (working.length !== beforeTrivial) {
    steps.push({
      stage: 'singleton-rhs',
      fdAffected: null,
      reason: 'Removed trivial dependencies (right side already inside the left side); they say nothing.',
    });
  }
  working = dedupe(working);

  // ---- Stage 2: remove extraneous left-hand-side attributes ---------------
  for (let i = 0; i < working.length; i++) {
    let changedThisFd = true;
    while (changedThisFd && working[i].lhs.length > 1) {
      changedThisFd = false;
      for (const a of working[i].lhs) {
        const reduced = difference(working[i].lhs, [a]);
        if (reduced.length === 0) continue;
        // Compute reduced⁺ against the current full set (including this FD).
        const { closure } = getClosure(reduced, working);
        if (isSubset(working[i].rhs, closure)) {
          const before = { ...working[i], lhs: [...working[i].lhs] };
          working[i] = { lhs: reduced, rhs: working[i].rhs };
          steps.push({
            stage: 'remove-extraneous-lhs',
            fdAffected: before,
            result: [{ ...working[i] }],
            reason:
              `In ${fmtFd(before)}, drop ${a} and test: ${fmt(reduced)}⁺ = ${fmt(closure)} already contains ` +
              `${fmt(before.rhs)}. So ${a} was extraneous — the dependency becomes ${fmtFd(working[i])}.`,
          });
          changedThisFd = true;
          break;
        }
      }
    }
  }
  working = dedupe(working);

  // ---- Stage 3: remove redundant dependencies -----------------------------
  for (let i = 0; i < working.length; i++) {
    const candidate = working[i];
    const without = working.filter((_, j) => j !== i);
    const { closure } = getClosure(candidate.lhs, without);
    if (isSubset(candidate.rhs, closure)) {
      steps.push({
        stage: 'remove-redundant-fd',
        fdAffected: candidate,
        reason:
          `Delete ${fmtFd(candidate)} and recompute: ${fmt(candidate.lhs)}⁺ = ${fmt(closure)} against the rest, ` +
          `which still yields ${fmt(candidate.rhs)}. The dependency was implied by the others, so it goes.`,
      });
      working = without;
      i -= 1;
    }
  }

  if (steps.length === 0) {
    steps.push({
      stage: 'done',
      fdAffected: null,
      reason: 'The dependency set was already minimal: singleton right sides, no extraneous attributes, nothing redundant.',
    });
  }

  return { cover: working, steps };
}

/** Are two FD sets equivalent (F ⊨ G and G ⊨ F)? Used by the comparison view. */
export function areEquivalent(f, g) {
  const covers = (a, b) => b.every((fd) => isSubset(fd.rhs, getClosure(fd.lhs, a).closure));
  return covers(f, g) && covers(g, f);
}

/** Group a cover by identical left-hand side — the first move of 3NF synthesis. */
export function groupByLhs(cover) {
  const groups = [];
  for (const fd of cover) {
    const g = groups.find((x) => setEq(x.lhs, fd.lhs));
    if (g) g.rhs = norm([...g.rhs, ...fd.rhs]);
    else groups.push({ lhs: norm(fd.lhs), rhs: norm(fd.rhs) });
  }
  return groups;
}
