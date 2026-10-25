/* Normalization engine — pure functions, no DOM. Works in the browser (window.NF) and Node (module.exports).
   Attribute sets are bitmasks over the relation's attribute list (max 16 attributes for exhaustive searches). */
(function (root) {
  'use strict';

  const MAX_ATTRS = 16;
  const pop = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
  const bits = (m) => { const r = []; for (let i = 0; m; i++, m >>>= 1) if (m & 1) r.push(i); return r; };
  const sub = (a, b) => (a & b) === a;               // a ⊆ b
  const psub = (a, b) => sub(a, b) && a !== b;       // a ⊂ b

  /* ---------- naming ---------- */
  function namer(attrs) {
    const single = attrs.every((a) => a.length === 1);
    const fn = (m) => {
      const xs = bits(m).map((i) => attrs[i]);
      if (!xs.length) return '∅';
      return single ? xs.join('') : xs.join(', ');
    };
    fn.single = single;
    fn.set = (m) => { const s = fn(m); return single ? s : '{' + s + '}'; };
    fn.fd = (fd, arrow) => fn(fd.lhs) + ' ' + (arrow || '→') + ' ' + fn(fd.rhs);
    fn.list = (ms) => ms.map(fn.set).join(', ');
    return fn;
  }

  /* ---------- parsing ---------- */
  const ARROW_MVD = /->>|→→|↠|-»/;
  const ARROW_FD = /->|→|=>/;

  function splitTokens(s) {
    return s.split(/[\s,;{}()]+/).map((t) => t.trim()).filter(Boolean);
  }

  function parseSchema(text) {
    const t = (text || '').trim();
    if (!t) return { error: 'Enter a relation, for example R(A, B, C, D).' };
    let name = 'R', body = t;
    const m = t.match(/^\s*([A-Za-z_][\w]*)\s*\((.*)\)\s*$/s);
    if (m) { name = m[1]; body = m[2]; }
    let attrs = splitTokens(body);
    // "ABCD" shorthand
    if (attrs.length === 1 && attrs[0].length > 1 && /^[A-Z]+$/.test(attrs[0])) attrs = attrs[0].split('');
    const seen = new Set();
    for (const a of attrs) {
      if (!/^[A-Za-z_][\w']*$/.test(a)) return { error: `“${a}” is not a valid attribute name. Use letters, digits and underscores.` };
      if (seen.has(a)) return { error: `Attribute “${a}” appears twice.` };
      seen.add(a);
    }
    if (attrs.length < 2) return { error: 'A relation needs at least two attributes.' };
    if (attrs.length > MAX_ATTRS) return { error: `This lab handles up to ${MAX_ATTRS} attributes (key search is exponential). You entered ${attrs.length}.` };
    return { name, attrs };
  }

  function parseSide(side, attrs, idx) {
    let mask = 0; const unknown = [];
    for (const tok of splitTokens(side)) {
      if (idx.has(tok)) { mask |= 1 << idx.get(tok); continue; }
      // concatenated single-letter shorthand, e.g. "AB"
      if (tok.split('').every((c) => idx.has(c))) { for (const c of tok) mask |= 1 << idx.get(c); continue; }
      unknown.push(tok);
    }
    return { mask, unknown };
  }

  function parseDeps(text, attrs) {
    const idx = new Map(attrs.map((a, i) => [a, i]));
    const fds = [], mvds = [], errors = [];
    const lines = (text || '').split(/\n/);
    lines.forEach((raw, li) => {
      const line = raw.replace(/#.*$/, '').replace(/\/\/.*$/, '').trim();
      if (!line) return;
      // allow several deps on one line separated by ';'
      line.split(';').map((s) => s.trim()).filter(Boolean).forEach((part) => {
        const isMvd = ARROW_MVD.test(part);
        const pieces = part.split(isMvd ? ARROW_MVD : ARROW_FD);
        if (pieces.length !== 2) { errors.push({ line: li + 1, msg: `Line ${li + 1}: write a dependency as X -> Y (or X ->> Y for a multivalued one).` }); return; }
        const L = parseSide(pieces[0], attrs, idx), R = parseSide(pieces[1], attrs, idx);
        const unk = L.unknown.concat(R.unknown);
        if (unk.length) { errors.push({ line: li + 1, msg: `Line ${li + 1}: ${unk.map((u) => '“' + u + '”').join(', ')} ${unk.length > 1 ? 'are' : 'is'} not in the relation.` }); return; }
        if (!L.mask) { errors.push({ line: li + 1, msg: `Line ${li + 1}: the left side is empty.` }); return; }
        if (!R.mask) { errors.push({ line: li + 1, msg: `Line ${li + 1}: the right side is empty.` }); return; }
        (isMvd ? mvds : fds).push({ lhs: L.mask, rhs: R.mask, line: li + 1 });
      });
    });
    return { fds, mvds, errors };
  }

  function parseDecomposition(text, attrs) {
    const idx = new Map(attrs.map((a, i) => [a, i]));
    const parts = []; const errors = [];
    // accepts "R1(A,B), R2(B,C)" or one relation per line "AB" / "A,B"
    let chunks = [];
    const re = /([A-Za-z_]\w*)?\s*\(([^)]*)\)/g; let m; let found = false;
    while ((m = re.exec(text))) { found = true; chunks.push({ name: m[1] || '', body: m[2] }); }
    if (!found) chunks = text.split(/\n|;|\|/).map((s) => s.trim()).filter(Boolean).map((b) => ({ name: '', body: b }));
    chunks.forEach((c, i) => {
      const r = parseSide(c.body, attrs, idx);
      if (r.unknown.length) errors.push(`Relation ${i + 1}: ${r.unknown.join(', ')} not in the schema.`);
      else if (!r.mask) errors.push(`Relation ${i + 1} is empty.`);
      else parts.push({ name: c.name || 'R' + (i + 1), mask: r.mask });
    });
    return { parts, errors };
  }

  /* ---------- closure ---------- */
  function closure(start, fds, wantTrace) {
    let x = start; const steps = [];
    let changed = true; let pass = 0;
    while (changed) {
      changed = false; pass++;
      for (const fd of fds) {
        if (sub(fd.lhs, x) && !sub(fd.rhs, x)) {
          const added = fd.rhs & ~x; x |= fd.rhs; changed = true;
          if (wantTrace) steps.push({ fd, added, result: x, pass });
        }
      }
    }
    return wantTrace ? { mask: x, steps } : x;
  }

  const implies = (fds, lhs, rhs) => sub(rhs, closure(lhs, fds));
  const equivalent = (F, G) => F.every((f) => implies(G, f.lhs, f.rhs)) && G.every((g) => implies(F, g.lhs, g.rhs));
  const isTrivial = (fd) => sub(fd.rhs, fd.lhs);

  /* ---------- keys ---------- */
  function candidateKeys(all, fds) {
    let rhsU = 0, lhsU = 0;
    fds.forEach((f) => { rhsU |= f.rhs & ~f.lhs; lhsU |= f.lhs; });
    const core = all & ~rhsU;                 // never derived: in every key
    const middle = all & rhsU & lhsU;         // may or may not be in a key
    if (closure(core, fds) === all) return { keys: [core], core, middle: 0, rhsOnly: all & ~core };
    const mids = bits(middle);
    const keys = [];
    const subsets = [];
    for (let s = 1; s < 1 << mids.length; s++) subsets.push(s);
    subsets.sort((a, b) => pop(a) - pop(b) || a - b);
    for (const s of subsets) {
      let m = core; mids.forEach((b, i) => { if (s & (1 << i)) m |= 1 << b; });
      if (keys.some((k) => sub(k, m))) continue;
      if (closure(m, fds) === all) keys.push(m);
    }
    keys.sort((a, b) => pop(a) - pop(b) || a - b);
    return { keys, core, middle, rhsOnly: all & ~core & ~middle };
  }

  function countSuperkeys(all, fds) {
    const n = bits(all).length; let c = 0;
    for (let m = 1; m <= all; m++) if (sub(m, all) && closure(m, fds) === all) c++;
    return n <= MAX_ATTRS ? c : NaN;
  }
  // superkeys from a known list of candidate keys (inclusion–exclusion by enumeration)
  function countSuperkeysFromKeys(n, keys) {
    let c = 0; for (let m = 1; m < 1 << n; m++) if (keys.some((k) => sub(k, m))) c++; return c;
  }

  /* ---------- covers ---------- */
  function minimalCover(fds) {
    const stages = [];
    // 1. split right sides
    let F = [];
    fds.forEach((f) => bits(f.rhs & ~f.lhs).forEach((b) => F.push({ lhs: f.lhs, rhs: 1 << b, from: f })));
    // dedupe
    F = F.filter((f, i) => F.findIndex((g) => g.lhs === f.lhs && g.rhs === f.rhs) === i);
    const dropped = fds.filter((f) => isTrivial(f));
    stages.push({ title: 'Split every right-hand side into single attributes', fds: F.slice(), notes: dropped.map((f) => ({ kind: 'trivial', fd: f })) });
    // 2. remove extraneous LHS attributes
    const notes2 = [];
    F = F.map((f) => {
      let lhs = f.lhs;
      for (const b of bits(f.lhs)) {
        const smaller = lhs & ~(1 << b);
        if (smaller && implies(F, smaller, f.rhs)) { notes2.push({ kind: 'extraneous', attr: b, before: { lhs, rhs: f.rhs }, after: { lhs: smaller, rhs: f.rhs } }); lhs = smaller; }
      }
      return { lhs, rhs: f.rhs };
    });
    F = F.filter((f, i) => F.findIndex((g) => g.lhs === f.lhs && g.rhs === f.rhs) === i);
    stages.push({ title: 'Remove extraneous attributes from left-hand sides', fds: F.slice(), notes: notes2 });
    // 3. remove redundant FDs
    const notes3 = [];
    for (let i = 0; i < F.length; i++) {
      const rest = F.filter((_, j) => j !== i);
      if (implies(rest, F[i].lhs, F[i].rhs)) { notes3.push({ kind: 'redundant', fd: F[i] }); F = rest; i--; }
    }
    stages.push({ title: 'Remove redundant dependencies', fds: F.slice(), notes: notes3 });
    return { cover: F, stages };
  }

  function canonicalCover(fds) {
    const { cover } = minimalCover(fds); const map = new Map();
    cover.forEach((f) => map.set(f.lhs, (map.get(f.lhs) || 0) | f.rhs));
    return [...map.entries()].map(([lhs, rhs]) => ({ lhs, rhs }));
  }

  // FDs that hold on a sub-schema (exponential in |subMask|)
  function project(fds, subMask) {
    const idxs = bits(subMask); const out = [];
    for (let s = 1; s < 1 << idxs.length; s++) {
      let m = 0; idxs.forEach((b, i) => { if (s & (1 << i)) m |= 1 << b; });
      const r = closure(m, fds) & subMask & ~m;
      if (r) out.push({ lhs: m, rhs: r });
    }
    return minimalCover(out).cover;
  }

  /* ---------- normal forms ---------- */
  function analyse(all, fds, mvds) {
    mvds = mvds || [];
    const K = candidateKeys(all, fds);
    const keys = K.keys;
    let prime = 0; keys.forEach((k) => (prime |= k));
    const nonprime = all & ~prime;
    const isSK = (m) => closure(m, fds) === all;

    // per-FD classification on the split given set (keeps the user's own FDs visible)
    const split = [];
    fds.forEach((f) => bits(f.rhs & ~f.lhs).forEach((b) => split.push({ lhs: f.lhs, rhs: 1 << b, line: f.line })));
    const classify = (f) => {
      if (isSK(f.lhs)) return 'bcnf';
      if (sub(f.rhs, prime)) return '3nf';                         // prime RHS: 3NF ok, BCNF violation
      if (keys.some((k) => psub(f.lhs, k))) return 'partial';      // part of a key → non-prime
      return 'transitive';                                         // non-key → non-prime
    };
    const rows = split.map((f) => ({ fd: f, kind: classify(f) }));

    // exhaustive partial-dependency test for 2NF
    const partials = [];
    keys.forEach((k) => {
      const kb = bits(k);
      for (let s = 1; s < (1 << kb.length) - 1; s++) {
        let m = 0; kb.forEach((b, i) => { if (s & (1 << i)) m |= 1 << b; });
        const dep = closure(m, fds) & nonprime & ~m;
        if (dep && !partials.some((p) => p.lhs === m)) partials.push({ lhs: m, rhs: dep, key: k });
      }
    });
    // keep only minimal left sides
    const partialMin = partials.filter((p) => !partials.some((q) => q !== p && psub(q.lhs, p.lhs) && sub(p.rhs, q.rhs)));

    const transitive = rows.filter((r) => r.kind === 'transitive').map((r) => r.fd);
    const threeNfViol = rows.filter((r) => r.kind === 'transitive' || r.kind === 'partial').map((r) => r.fd);
    const bcnfViol = rows.filter((r) => r.kind !== 'bcnf').map((r) => r.fd);
    const mvdViol = mvds.filter((m) => {
      const y = m.rhs & ~m.lhs;
      return y && (m.lhs | m.rhs) !== all && !isSK(m.lhs);
    });

    const in2 = partialMin.length === 0;
    const in3 = in2 && threeNfViol.length === 0;
    const inB = in3 && bcnfViol.length === 0;
    const in4 = inB && mvdViol.length === 0;
    const allKeysSimple = keys.every((k) => pop(k) === 1);
    let highest = '1NF';
    if (in2) highest = '2NF';
    if (in3) highest = '3NF';
    if (inB) highest = 'BCNF';
    if (in4) highest = '4NF';
    const fiveNF = in4 && allKeysSimple; // Date–Fagin: 3NF + every key simple ⇒ 5NF
    if (fiveNF) highest = '5NF';
    return { keys, core: K.core, prime, nonprime, rows, partials: partialMin, transitive, threeNfViol, bcnfViol, mvdViol,
      in2, in3, inB, in4, fiveNF, allKeysSimple, highest };
  }

  /* ---------- decomposition algorithms ---------- */
  function synthesize3NF(all, fds) {
    const steps = [];
    const cc = canonicalCover(fds);
    steps.push({ kind: 'cover', fds: cc });
    let rels = cc.map((f) => ({ mask: f.lhs | f.rhs, why: 'from', fd: f }));
    const keys = candidateKeys(all, fds).keys;
    if (!rels.some((r) => keys.some((k) => sub(k, r.mask)))) {
      rels.push({ mask: keys[0], why: 'key' });
      steps.push({ kind: 'addkey', key: keys[0] });
    } else steps.push({ kind: 'haskey' });
    // attributes in no FD at all
    let covered = 0; rels.forEach((r) => (covered |= r.mask));
    if (covered !== all) { rels.push({ mask: all & ~covered | keys[0], why: 'leftover' }); }
    const before = rels.length;
    rels = rels.filter((r, i) => !rels.some((q, j) => j !== i && (psub(r.mask, q.mask) || (q.mask === r.mask && j < i))));
    if (rels.length < before) steps.push({ kind: 'removed', n: before - rels.length });
    return { relations: rels.map((r) => ({ ...r, fds: project(fds, r.mask) })), steps };
  }

  function findViolation(mask, fds, mvds) {
    const idxs = bits(mask);
    const subsets = [];
    for (let s = 1; s < (1 << idxs.length) - 1; s++) subsets.push(s);
    subsets.sort((a, b) => pop(a) - pop(b) || a - b);
    for (const s of subsets) {
      let m = 0; idxs.forEach((b, i) => { if (s & (1 << i)) m |= 1 << b; });
      const c = closure(m, fds) & mask;
      if (c !== m && c !== mask) return { kind: 'fd', lhs: m, rhs: c & ~m };
    }
    if (mvds) for (const d of mvds) {
      if (!sub(d.lhs, mask)) continue;
      const y = d.rhs & mask & ~d.lhs;
      if (!y || (d.lhs | y) === mask) continue;
      if ((closure(d.lhs, fds) & mask) === mask) continue;
      return { kind: 'mvd', lhs: d.lhs, rhs: y };
    }
    return null;
  }

  function decomposeBCNF(all, fds, mvds) {
    const leaves = []; let counter = 0;
    function go(mask, depth) {
      const node = { id: counter++, mask, depth, children: [] };
      if (pop(mask) <= 2 && !mvds) { node.ok = true; leaves.push(node); return node; }
      const v = findViolation(mask, fds, mvds);
      if (!v) { node.ok = true; leaves.push(node); return node; }
      node.violation = v;
      const left = v.kind === 'fd' ? (closure(v.lhs, fds) & mask) : (v.lhs | v.rhs);
      const right = mask & ~(left & ~v.lhs);
      node.children = [go(left, depth + 1), go(right, depth + 1)];
      return node;
    }
    const tree = go(all, 0);
    // drop duplicate / contained leaves
    const rel = leaves.filter((l, i) => !leaves.some((q, j) => j !== i && (psub(l.mask, q.mask) || (q.mask === l.mask && j < i))));
    return { tree, relations: rel.map((l) => ({ mask: l.mask, fds: project(fds, l.mask) })) };
  }

  /* ---------- decomposition tests ---------- */
  function chase(all, parts, fds, mvds) {
    const cols = bits(all);
    // cell value: 0 = distinguished 'a', otherwise (row+1)*100 + column (a b_ij symbol)
    const T = parts.map((p, i) => cols.map((c) => ((p.mask >> c) & 1 ? 0 : (i + 1) * 100 + c)));
    const snap = () => T.map((r) => r.slice());
    const steps = [{ fd: null, tableau: snap(), changes: [] }];
    const split = [];
    fds.forEach((f) => bits(f.rhs & ~f.lhs).forEach((b) => split.push({ lhs: f.lhs, rhs: 1 << b })));
    const colPos = new Map(cols.map((c, j) => [c, j]));
    const done = () => T.some((r) => r.every((v) => v === 0));
    let lossless = done(); let guard = 0; let changed = true;
    while (changed && !lossless && guard++ < 200) {
      changed = false;
      for (const f of split) {
        const L = bits(f.lhs).map((c) => colPos.get(c));
        const tgt = colPos.get(bits(f.rhs)[0]);
        const groups = new Map();
        T.forEach((r, i) => { const key = L.map((j) => r[j]).join('|'); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(i); });
        const changes = [];
        groups.forEach((rows) => {
          if (rows.length < 2) return;
          const vals = rows.map((i) => T[i][tgt]);
          const best = vals.includes(0) ? 0 : Math.min(...vals);
          const old = new Set(vals.filter((v) => v !== best));
          if (!old.size) return;
          // rename the symbol everywhere in this column, not only inside the group
          T.forEach((r, i) => { if (old.has(r[tgt])) { changes.push({ row: i, col: tgt, from: r[tgt], to: best }); r[tgt] = best; } });
        });
        if (changes.length) {
          changed = true; steps.push({ fd: f, tableau: snap(), changes });
          if (done()) { lossless = true; break; }
        }
      }
      // multivalued dependencies generate rows: t1 on X∪Y, t2 elsewhere
      if (!changed && !lossless && mvds && mvds.length && T.length < 120) {
        for (const d of mvds) {
          const X = bits(d.lhs).map((c) => colPos.get(c)).filter((j) => j != null);
          const Y = new Set(bits(d.rhs & ~d.lhs).map((c) => colPos.get(c)).filter((j) => j != null));
          const have = new Set(T.map((r) => r.join(',')));
          const added = [];
          for (let i = 0; i < T.length; i++) for (let k = 0; k < T.length; k++) {
            if (i === k || X.some((j) => T[i][j] !== T[k][j])) continue;
            const nr = T[i].map((v, j) => (X.includes(j) || Y.has(j) ? v : T[k][j]));
            const key = nr.join(',');
            if (!have.has(key)) { have.add(key); added.push(nr); }
          }
          if (added.length) {
            const from = T.length; added.forEach((r) => T.push(r)); changed = true;
            steps.push({ mvd: d, tableau: snap(), changes: [], addedRows: added.map((_, q) => from + q) });
            if (done()) { lossless = true; break; }
          }
        }
      }
    }
    const fullRow = T.findIndex((r) => r.every((v) => v === 0));
    let coverAll = 0; parts.forEach((p) => (coverAll |= p.mask));
    return { lossless: lossless && coverAll === all, coversAll: coverAll === all, steps, cols, fullRow };
  }

  function preservation(parts, fds) {
    const res = fds.map((f) => {
      let z = f.lhs, changed = true;
      while (changed) {
        changed = false;
        for (const p of parts) {
          const t = closure(z & p.mask, fds) & p.mask;
          if (!sub(t, z)) { z |= t; changed = true; }
        }
      }
      return { fd: f, kept: sub(f.rhs, z) };
    });
    return { preserved: res.every((r) => r.kept), results: res };
  }

  /* ---------- seeded random + quiz generator ---------- */
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  function randomRelation(rand, level) {
    const n = level === 'easy' ? 4 + Math.floor(rand() * 2) : level === 'hard' ? 6 + Math.floor(rand() * 2) : 5 + Math.floor(rand() * 2);
    const attrs = 'ABCDEFGH'.slice(0, n).split('');
    const all = (1 << n) - 1;
    const nf = level === 'easy' ? 3 : level === 'hard' ? 5 + Math.floor(rand() * 2) : 4;
    const fds = []; let guard = 0;
    while (fds.length < nf && guard++ < 200) {
      const lsz = rand() < (level === 'easy' ? 0.7 : 0.5) ? 1 : 2;
      let lhs = 0; while (pop(lhs) < lsz) lhs |= 1 << Math.floor(rand() * n);
      let rhs = 0; const rsz = rand() < 0.75 ? 1 : 2;
      let g2 = 0; while (pop(rhs) < rsz && g2++ < 20) { const b = 1 << Math.floor(rand() * n); if (!(b & lhs)) rhs |= b; }
      if (!rhs) continue;
      if (fds.some((f) => f.lhs === lhs && sub(rhs, f.rhs))) continue;
      fds.push({ lhs, rhs });
    }
    return { attrs, all, fds };
  }

  root.NF = { MAX_ATTRS, pop, bits, sub, psub, namer, parseSchema, parseDeps, parseDecomposition, closure, implies, equivalent,
    isTrivial, candidateKeys, countSuperkeys, countSuperkeysFromKeys, minimalCover, canonicalCover, project, analyse,
    synthesize3NF, decomposeBCNF, findViolation, chase, preservation, rng, randomRelation };
  if (typeof module !== 'undefined') module.exports = root.NF;
})(typeof window !== 'undefined' ? window : globalThis);
