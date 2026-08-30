// setOps.js — shared set helpers for attribute sets.
// Attributes are plain strings; sets are arrays of strings kept sorted and unique.
// Every function here is pure.

/** Sort + de-duplicate an attribute array. */
export function norm(attrs) {
  return [...new Set(attrs)].sort();
}

/** Is `sub` a subset of `sup`? */
export function isSubset(sub, sup) {
  const s = new Set(sup);
  return sub.every((a) => s.has(a));
}

/** Are the two attribute sets equal (order-independent)? */
export function setEq(a, b) {
  return a.length === b.length && isSubset(a, b);
}

/** Union of any number of attribute sets. */
export function union(...sets) {
  return norm(sets.flat());
}

/** a ∩ b */
export function intersect(a, b) {
  const s = new Set(b);
  return norm(a.filter((x) => s.has(x)));
}

/** a − b */
export function difference(a, b) {
  const s = new Set(b);
  return norm(a.filter((x) => !s.has(x)));
}

/** Human-readable set, e.g. ['A','B'] -> "AB" (or "A, BC" when names are long). */
export function fmt(attrs) {
  if (!attrs || attrs.length === 0) return '∅';
  const multiChar = attrs.some((a) => a.length > 1);
  return multiChar ? attrs.join(', ') : attrs.join('');
}

/** Human-readable dependency, e.g. "AB → C". */
export function fmtFd(fd) {
  const arrow = fd.type === 'mvd' ? '↠' : '→';
  return `${fmt(fd.lhs)} ${arrow} ${fmt(fd.rhs)}`;
}

/**
 * All subsets of `attrs`, ordered by size ascending (size 1 first).
 * Guarded: 2^n grows fast, so callers must cap n (the lab caps at 10 attributes
 * => 1024 subsets, which is instant).
 */
export function subsetsBySize(attrs) {
  const n = attrs.length;
  const buckets = Array.from({ length: n + 1 }, () => []);
  for (let mask = 0; mask < 1 << n; mask++) {
    const s = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) s.push(attrs[i]);
    buckets[s.length].push(norm(s));
  }
  return buckets.flat();
}

/** Deep-ish clone of an FD list, so callers never mutate the caller's array. */
export function cloneFds(fds) {
  return fds.map((f) => ({
    lhs: [...f.lhs],
    rhs: [...f.rhs],
    ...(f.type ? { type: f.type } : {}),
  }));
}

/** Is this FD trivial (rhs ⊆ lhs)? */
export function isTrivial(fd) {
  return isSubset(fd.rhs, fd.lhs);
}
