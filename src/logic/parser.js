// parser.js — turns the two text boxes into structured objects.
//
// Contract (Section 6):
//   parseInput(relationText, depText)
//     -> { attributes, fds, mvds, jds, errors, warnings }
//
// Accepted relation syntax:   A,B,C,D      or      R(A, B, C, D)      or      ABCD
// Accepted dependency syntax (one per line):
//     A,B -> C          functional dependency
//     AB -> C           (single-letter attributes may be written without commas)
//     A ->> B           multivalued dependency
//     *(AB, BC, CA)     join dependency
//     # comment         ignored
//   Arrows may also be written  -->  =>  →  ->>  →→  ↠

import { norm, union, isSubset } from './setOps.js';

const MAX_ATTRIBUTES = 10;

/** Split "A,B" or "AB" into ['A','B']. Commas/spaces win; otherwise split chars. */
function splitAttrs(text) {
  const t = text.trim();
  if (!t) return [];
  if (/[,\s]/.test(t)) {
    return t
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  // No separator: "ABCD" -> A,B,C,D, but "Dept" stays "Dept" if it has lowercase.
  if (/^[A-Z0-9]+$/.test(t) && t.length > 1) return t.split('');
  return [t];
}

/** Strip a wrapper such as R( ... ) from the relation text. */
function stripRelationWrapper(text) {
  const m = text.trim().match(/^[A-Za-z_]\w*\s*\((.*)\)\s*$/s);
  return m ? m[1] : text;
}

export function parseRelation(relationText) {
  const errors = [];
  const warnings = [];
  const raw = splitAttrs(stripRelationWrapper(relationText || ''));

  const seen = new Set();
  const attributes = [];
  for (const a of raw) {
    if (!/^[A-Za-z_]\w*$/.test(a)) {
      errors.push(`"${a}" is not a valid attribute name (use letters, digits, underscore).`);
      continue;
    }
    if (seen.has(a)) {
      warnings.push(`Attribute ${a} was listed more than once; duplicates ignored.`);
      continue;
    }
    seen.add(a);
    attributes.push(a);
  }

  if (attributes.length === 0) errors.push('The relation has no attributes.');
  if (attributes.length > MAX_ATTRIBUTES) {
    warnings.push(
      `${attributes.length} attributes: candidate-key search examines 2^${attributes.length} ` +
        `= ${2 ** attributes.length} subsets. This may take a moment.`
    );
  }
  return { attributes: attributes.sort(), errors, warnings };
}

/** Parse one dependency line. Returns { kind, value } or { kind: 'error', message }. */
function parseDependencyLine(line, lineNo) {
  const text = line.trim();

  // Join dependency:  *(AB, BC, CA)
  if (text.startsWith('*')) {
    const m = text.match(/^\*\s*\((.*)\)\s*$/s);
    if (!m) {
      return { kind: 'error', message: `Line ${lineNo}: join dependency must look like *(AB, BC, CA).` };
    }
    const parts = m[1]
      .split(/[;|]/)
      .flatMap((p) => (p.includes(',') && /[;|]/.test(m[1]) ? [p] : [p]))
      .map((p) => norm(splitAttrs(p)))
      .filter((p) => p.length > 0);
    // If the user separated components only with commas, e.g. *(AB, BC, CA),
    // the split above yields one part; fall back to comma separation.
    let components = parts;
    if (components.length === 1 && m[1].includes(',')) {
      components = m[1]
        .split(',')
        .map((p) => norm(splitAttrs(p)))
        .filter((p) => p.length > 0);
    }
    if (components.length < 2) {
      return { kind: 'error', message: `Line ${lineNo}: a join dependency needs at least two components.` };
    }
    return { kind: 'jd', value: { components } };
  }

  // Normalise arrow spellings. Longest first so ->> is not eaten by ->.
  const normalised = text
    .replace(/->>|→→|↠|=>>/g, '↠')
    .replace(/-->|->|→|=>/g, '→');

  const isMvd = normalised.includes('↠');
  const arrow = isMvd ? '↠' : '→';
  if (!normalised.includes(arrow)) {
    return { kind: 'error', message: `Line ${lineNo}: no arrow found. Write "A,B -> C" or "A ->> B".` };
  }
  const [lhsText, ...rest] = normalised.split(arrow);
  const rhsText = rest.join(arrow);
  const lhs = norm(splitAttrs(lhsText));
  const rhs = norm(splitAttrs(rhsText));

  if (lhs.length === 0) return { kind: 'error', message: `Line ${lineNo}: left-hand side is empty.` };
  if (rhs.length === 0) return { kind: 'error', message: `Line ${lineNo}: right-hand side is empty.` };

  return { kind: isMvd ? 'mvd' : 'fd', value: { lhs, rhs, ...(isMvd ? { type: 'mvd' } : {}) } };
}

export function parseInput(relationText, depText) {
  const { attributes: declared, errors, warnings } = parseRelation(relationText);
  const fds = [];
  const mvds = [];
  const jds = [];

  const lines = (depText || '').split(/\r?\n/);
  lines.forEach((line, i) => {
    const clean = line.split('#')[0].trim();
    if (!clean) return;
    const res = parseDependencyLine(clean, i + 1);
    if (res.kind === 'error') {
      errors.push(res.message);
      return;
    }
    if (res.kind === 'jd') jds.push(res.value);
    else if (res.kind === 'mvd') mvds.push(res.value);
    else fds.push(res.value);
  });

  // Any attribute used in a dependency but not declared is added, with a warning.
  let attributes = [...declared];
  const used = union(
    ...fds.map((f) => union(f.lhs, f.rhs)),
    ...mvds.map((f) => union(f.lhs, f.rhs)),
    ...jds.flatMap((j) => j.components)
  );
  const undeclared = used.filter((a) => !attributes.includes(a));
  if (undeclared.length) {
    warnings.push(
      `${undeclared.join(', ')} appear${undeclared.length === 1 ? 's' : ''} in a dependency but not in the relation; added automatically.`
    );
    attributes = norm([...attributes, ...undeclared]);
  }

  // Join dependency components must together cover the relation.
  jds.forEach((jd, i) => {
    const covered = union(...jd.components);
    if (!isSubset(attributes, covered)) {
      errors.push(
        `Join dependency ${i + 1} does not cover every attribute of the relation; ` +
          `missing ${attributes.filter((a) => !covered.includes(a)).join(', ')}.`
      );
    }
  });

  // Trivial-FD notice (not an error — trivial FDs are legal, just uninformative).
  fds.forEach((f) => {
    if (isSubset(f.rhs, f.lhs)) {
      warnings.push(`${f.lhs.join('')} → ${f.rhs.join('')} is trivial (right side is inside the left side).`);
    }
  });

  return { attributes: norm(attributes), fds, mvds, jds, errors, warnings };
}

export { MAX_ATTRIBUTES };
