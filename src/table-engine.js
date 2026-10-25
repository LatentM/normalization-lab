/* Table engine: works on actual data (an instance), not just a schema. Pure functions, no DOM.
   A table is { name, cols: [string], rows: [[string|null]] }. Column masks use the same bit layout as NF. */
(function (root) {
  'use strict';
  const NF = root.NF || (typeof require !== 'undefined' ? require('./engine.js') : null);
  const MAX_COLS = 16, MAX_ROWS = 2000;
  const NULLS = new Set(['', 'null', 'NULL', 'Null']);
  const cell = (v) => { if (v == null) return null; const t = String(v).trim(); return NULLS.has(t) ? null : t; };
  const show = (v) => (v == null ? 'NULL' : v);

  /* ---------- parsing ---------- */
  function splitLine(line, d) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"' && cur.trim() === '') { q = true; cur = ''; }
      else if (c === d) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur); return out;
  }
  // joins physical lines that sit inside an open quote
  function logicalLines(text) {
    const raw = text.replace(/\r\n?/g, '\n').split('\n'); const out = []; let buf = null;
    raw.forEach((l) => {
      const cur = buf == null ? l : buf + '\n' + l;
      const quotes = (cur.match(/"/g) || []).length;
      if (quotes % 2) buf = cur; else { out.push(cur); buf = null; }
    });
    if (buf != null) out.push(buf);
    return out;
  }
  function parseDelimited(text) {
    const warnings = [];
    let lines = logicalLines(text || '').filter((l) => l.trim() !== '');
    if (!lines.length) return { error: 'Paste a table, upload a file, or load an example.' };
    let delim;
    const md = lines.every((l) => /^\s*\|.*\|\s*$/.test(l));
    if (md) {
      lines = lines.filter((l) => !/^\s*\|?\s*:?-{2,}/.test(l.replace(/\s/g, '').replace(/^\|/, '')) && !/^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(l));
      lines = lines.map((l) => l.trim().replace(/^\|/, '').replace(/\|$/, ''));
      delim = '|';
    } else {
      const cands = ['\t', ',', ';', '|'];
      const score = (d) => { const counts = lines.slice(0, 20).map((l) => splitLine(l, d).length); const first = counts[0]; return first > 1 && counts.every((c) => c === first) ? first * 10 : first > 1 ? first : 0; };
      delim = cands.map((d) => [d, score(d)]).sort((a, b) => b[1] - a[1])[0];
      if (!delim[1]) return { error: 'Could not find columns. Separate values with tabs, commas, semicolons or |, one row per line, header first.' };
      delim = delim[0];
    }
    const grid = lines.map((l) => splitLine(l, delim).map((c) => c.trim()));
    const header = grid[0]; const width = header.length;
    const rows = [];
    grid.slice(1).forEach((r, i) => {
      if (r.length !== width) warnings.push(`Row ${i + 1} has ${r.length} values but the header has ${width}; ${r.length < width ? 'missing values were left empty' : 'extra values were dropped'}.`);
      const fixed = header.map((_, j) => cell(r[j]));
      rows.push(fixed);
    });
    return { cols: header, rows, delimiter: delim === '\t' ? 'tab' : delim, warnings };
  }

  function sanitizeNames(cols) {
    const used = new Set(); const changed = [];
    const names = cols.map((c, i) => {
      let n = String(c || '').trim().replace(/[^\w']+/g, '_').replace(/^_+|_+$/g, '');
      if (!n) n = 'col' + (i + 1);
      if (/^\d/.test(n)) n = 'c_' + n;
      let base = n, k = 2; while (used.has(n)) n = base + '_' + k++;
      used.add(n); if (n !== c) changed.push({ from: c, to: n }); return n;
    });
    return { names, changed };
  }

  /* ---------- 1NF ---------- */
  const SEPS = [';', '|', ',', '/'];
  function detect1NF(t) {
    const multi = [];
    t.cols.forEach((c, j) => {
      const vals = t.rows.map((r) => r[j]).filter((v) => v != null);
      let best = null;
      SEPS.forEach((s) => {
        const hits = vals.filter((v) => v.split(s).map((x) => x.trim()).filter(Boolean).length > 1);
        if (!hits.length) return;
        // numbers like 1,200 or dates like 12/05/2024 are not lists
        if ((s === ',' || s === '/') && hits.every((v) => /^[\d.,/\s-]+$/.test(v))) return;
        const items = hits.flatMap((v) => v.split(s).map((x) => x.trim()));
        const avg = items.reduce((a, x) => a + x.length, 0) / items.length;
        if (avg > 40) return;
        if (!best || hits.length > best.count) best = { col: j, sep: s, count: hits.length, examples: hits.slice(0, 2) };
      });
      if (best) multi.push(best);
    });
    // repeating groups: stem + index, e.g. phone1, phone2 / course_1, grade_1
    const stems = new Map();
    t.cols.forEach((c, j) => { const m = String(c).match(/^(.*?[A-Za-z])[_ ]?(\d{1,2})$/); if (m) { const s = m[1].replace(/[_ ]+$/, ''); if (!stems.has(s)) stems.set(s, []); stems.get(s).push({ j, idx: +m[2] }); } });
    const byIdx = new Map();
    stems.forEach((list, s) => { if (list.length < 2) return; const key = list.map((x) => x.idx).sort((a, b) => a - b).join(','); if (!byIdx.has(key)) byIdx.set(key, []); byIdx.get(key).push({ stem: s, list }); });
    const groups = [...byIdx.entries()].map(([key, members]) => ({ indices: key.split(',').map(Number), stems: members.map((m) => m.stem), cols: members.flatMap((m) => m.list.map((x) => x.j)) }));
    const seen = new Set(); let dupes = 0;
    t.rows.forEach((r) => { const k = JSON.stringify(r); if (seen.has(k)) dupes++; else seen.add(k); });
    const nullCols = t.cols.map((_, j) => j).filter((j) => t.rows.some((r) => r[j] == null));
    return { multi: multi.filter((m) => !groups.some((g) => g.cols.includes(m.col))), groups, dupes, nullCols };
  }

  /* opts: { groups: [groupIndex...], multi: [{col, sep}] } → 1NF table plus a log of what changed */
  function apply1NF(t, det, opts) {
    const log = []; let cols = t.cols.slice(); let rows = t.rows.map((r) => r.slice());
    const origin = cols.map((c) => c);
    // 1. repeating groups → one row per index
    (opts.groups || []).forEach((gi) => {
      const g = det.groups[gi]; if (!g) return;
      const keep = cols.map((_, j) => j).filter((j) => !g.cols.includes(j));
      const stemCols = g.stems.map((s) => g.indices.map((ix) => cols.findIndex((c, j) => g.cols.includes(j) && new RegExp('^' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[_ ]?' + ix + '$').test(c))));
      const out = [];
      rows.forEach((r) => {
        let any = false;
        g.indices.forEach((_, k) => {
          const vals = stemCols.map((sc) => (sc[k] >= 0 ? r[sc[k]] : null));
          if (vals.every((v) => v == null)) return;
          any = true; out.push(keep.map((j) => r[j]).concat(vals));
        });
        if (!any) out.push(keep.map((j) => r[j]).concat(g.stems.map(() => null)));
      });
      log.push({ kind: 'group', text: `Repeating group ${g.stems.map((s) => g.indices.map((i) => s + i).join(', ')).join('; ')} folded into column${g.stems.length > 1 ? 's' : ''} ${g.stems.join(', ')}: one row per filled index.`, before: rows.length, after: out.length });
      cols = keep.map((j) => cols[j]).concat(g.stems); rows = out;
    });
    // 2. multivalued cells → one row per value (cross product within a row)
    const mvNames = [];
    (opts.multi || []).forEach(({ col: name, sep }) => {
      const j = cols.indexOf(name); if (j < 0) return;
      const out = []; let split = 0;
      rows.forEach((r) => {
        const v = r[j]; const parts = v == null ? [null] : v.split(sep).map((x) => x.trim()).filter(Boolean);
        if (parts.length > 1) split++;
        (parts.length ? parts : [null]).forEach((p) => { const nr = r.slice(); nr[j] = p; out.push(nr); });
      });
      // a column that now holds one value per row reads better in the singular: phones → phone
      let nn = name; const sing = name.replace(/ies$/i, 'y').replace(/([^s])s$/i, '$1');
      if (sing !== name && sing.length >= 2 && !cols.includes(sing)) { nn = sing; cols = cols.slice(); cols[j] = nn; }
      log.push({ kind: 'multi', text: `Column ${name} held lists in ${split} row${split === 1 ? '' : 's'} (separated by “${sep}”); each value now gets its own row${nn !== name ? `, in column ${nn}` : ''}.`, before: rows.length, after: out.length });
      rows = out; mvNames.push(nn);
    });
    // 3. duplicates
    const seen = new Set(); const uniq = [];
    rows.forEach((r) => { const k = JSON.stringify(r); if (!seen.has(k)) { seen.add(k); uniq.push(r); } });
    if (uniq.length < rows.length) log.push({ kind: 'dupes', text: `Removed ${rows.length - uniq.length} duplicate row${rows.length - uniq.length === 1 ? '' : 's'}; a relation is a set, so each row appears once.`, before: rows.length, after: uniq.length });
    return { table: { name: t.name, cols, rows: uniq }, log, mvCols: mvNames, origin };
  }

  /* ---------- dependencies in the data ---------- */
  function encode(t) {
    return t.cols.map((_, j) => { const m = new Map(); return t.rows.map((r) => { const v = r[j] == null ? '\u0000' : r[j]; if (!m.has(v)) m.set(v, m.size); return m.get(v); }); });
  }
  const idxOf = (mask) => NF.bits(mask);
  function groupBy(enc, mask, n) {
    const L = idxOf(mask); const g = new Map();
    for (let i = 0; i < n; i++) { let k = ''; for (const j of L) k += enc[j][i] + ','; const a = g.get(k); if (a) a.push(i); else g.set(k, [i]); }
    return g;
  }
  function holds(t, lhs, rhs, enc) {
    enc = enc || encode(t); const n = t.rows.length; const R = idxOf(rhs & ~lhs);
    const violations = []; let groups = 0, evidence = 0;
    if (!lhs) { // ∅ → Y : Y constant
      const g = [...Array(n).keys()]; R.forEach((j) => g.forEach((i) => { if (enc[j][i] !== enc[j][0] && violations.length < 6) violations.push([0, i]); }));
      return { ok: !violations.length, violations, groups: 1, evidence: n > 1 ? 1 : 0 };
    }
    groupBy(enc, lhs, n).forEach((rows) => {
      groups++; if (rows.length > 1) evidence++;
      for (const j of R) { const f = rows[0]; for (const i of rows) if (enc[j][i] !== enc[j][f]) { if (violations.length < 6) violations.push([f, i]); break; } }
    });
    return { ok: violations.length === 0, violations, groups, evidence };
  }
  const isUnique = (t, mask, enc) => groupBy(enc, mask, t.rows.length).size === t.rows.length;

  function minimalUniques(t, enc, maxSize = 4) {
    enc = enc || encode(t); const m = t.cols.length; const all = (1 << m) - 1; const found = [];
    const subsets = []; for (let s = 1; s <= all; s++) if (NF.pop(s) <= maxSize) subsets.push(s);
    subsets.sort((a, b) => NF.pop(a) - NF.pop(b) || a - b);
    for (const s of subsets) { if (found.some((k) => NF.sub(k, s))) continue; if (isUnique(t, s, enc)) { found.push(s); if (found.length >= 12) break; } }
    if (!found.length) found.push(all);
    return found;
  }

  /* minimal non-trivial FDs X → A that hold, with X not unique (so the data shows evidence); |X| ≤ maxLhs */
  function mineFDs(t, enc, uniques, maxLhs = 3) {
    enc = enc || encode(t); const m = t.cols.length; const n = t.rows.length; const out = [];
    if (n < 2) return { fds: [], constant: [] };
    const constant = []; for (let j = 0; j < m; j++) if (enc[j].every((v) => v === enc[j][0])) constant.push(j);
    const subsets = []; const all = (1 << m) - 1; for (let s = 1; s <= all; s++) if (NF.pop(s) <= maxLhs) subsets.push(s);
    subsets.sort((a, b) => NF.pop(a) - NF.pop(b) || a - b);
    const nonUnique = subsets.filter((s) => !uniques.some((u) => NF.sub(u, s)));
    const groupCache = new Map();
    for (let a = 0; a < m; a++) {
      if (constant.includes(a)) continue; // a constant column is determined by anything; reported separately
      const found = [];
      for (const s of nonUnique) {
        if (s & (1 << a)) continue; if (found.some((f) => NF.sub(f, s))) continue;
        let g = groupCache.get(s); if (!g) { g = groupBy(enc, s, n); if (groupCache.size < 4000) groupCache.set(s, g); }
        let ok = true, evidence = 0, covered = 0;
        for (const rows of g.values()) { if (rows.length > 1) { evidence++; covered += rows.length; } const f = enc[a][rows[0]]; for (const i of rows) if (enc[a][i] !== f) { ok = false; break; } if (!ok) break; }
        if (ok) { found.push(s); out.push({ lhs: s, rhs: 1 << a, evidence, covered }); }
      }
    }
    // merge right sides that share a left side
    const merged = new Map(); out.forEach((f) => { const k = merged.get(f.lhs); if (k) { k.rhs |= f.rhs; } else merged.set(f.lhs, { ...f }); });
    return { fds: [...merged.values()].sort((x, y) => NF.pop(x.lhs) - NF.pop(y.lhs) || y.evidence - x.evidence || x.lhs - y.lhs), constant };
  }

  const ID_RE = /(^|_)(id|no|num|number|code|key|regno|reg_no|roll|rollno|pnr|isbn|sku|empno|emp_id|ssn|pan|aadhaar|uid|pincode|pin|zip)$|^(id|code|regno|rollno|pnr|isbn|sku)/i;
  const idLike = (name) => ID_RE.test(name) || /id$/i.test(name) && name.length <= 12;

  /* ---------- projection, join, redundancy ---------- */
  function project(t, mask) {
    const idx = idxOf(mask); const seen = new Set(); const rows = [];
    t.rows.forEach((r) => { const p = idx.map((j) => r[j]); const k = JSON.stringify(p); if (!seen.has(k)) { seen.add(k); rows.push(p); } });
    return { idx, rows };
  }
  // natural join of projections; each part {idx, rows}; returns full rows in original column order
  function naturalJoin(parts, m, limit = 200000) {
    let cur = { idx: parts[0].idx.slice(), rows: parts[0].rows.map((r) => r.slice()) };
    for (let p = 1; p < parts.length; p++) {
      const B = parts[p]; const shared = B.idx.filter((j) => cur.idx.includes(j));
      const ai = shared.map((j) => cur.idx.indexOf(j)), bi = shared.map((j) => B.idx.indexOf(j));
      const extra = B.idx.map((j, k) => [j, k]).filter(([j]) => !cur.idx.includes(j));
      const h = new Map(); B.rows.forEach((r) => { const k = JSON.stringify(bi.map((x) => r[x])); if (!h.has(k)) h.set(k, []); h.get(k).push(r); });
      const rows = [];
      for (const r of cur.rows) { const k = JSON.stringify(ai.map((x) => r[x])); const ms = h.get(k); if (!ms) continue; for (const s of ms) { rows.push(r.concat(extra.map(([, x]) => s[x]))); if (rows.length > limit) return { tooBig: true }; } }
      cur = { idx: cur.idx.concat(extra.map(([j]) => j)), rows };
    }
    const order = [...Array(m).keys()].map((j) => cur.idx.indexOf(j));
    return { rows: cur.rows.map((r) => order.map((x) => (x < 0 ? null : r[x]))) };
  }
  function compareRows(original, joined) {
    const A = new Set(original.map((r) => JSON.stringify(r))); const B = new Set(joined.map((r) => JSON.stringify(r)));
    const spurious = [...B].filter((k) => !A.has(k)).map((k) => JSON.parse(k)); const missing = [...A].filter((k) => !B.has(k)).map((k) => JSON.parse(k));
    return { same: !spurious.length && !missing.length, spurious, missing, joined: B.size, original: A.size };
  }
  // cells that repeat a fact already stated by an earlier row with the same left side
  function redundantCells(t, fd, enc) {
    enc = enc || encode(t); const cells = []; const R = idxOf(fd.rhs & ~fd.lhs);
    groupBy(enc, fd.lhs, t.rows.length).forEach((rows) => { rows.slice(1).forEach((i) => R.forEach((j) => cells.push([i, j]))); });
    return cells;
  }
  function keyDuplicates(rows, keyPos) {
    const m = new Map(); const dup = [];
    rows.forEach((r, i) => { const k = JSON.stringify(keyPos.map((x) => r[x])); if (m.has(k)) dup.push([m.get(k), i]); else m.set(k, i); });
    return dup;
  }

  /* ---------- textbook 2NF split: move attributes that depend on part of a key ---------- */
  function decompose2NF(all, fds, A) {
    const moved = new Map(); let movedAll = 0;
    const lhsList = A.partials.map((p) => p.lhs).sort((a, b) => NF.pop(a) - NF.pop(b));
    NF.bits(A.nonprime).forEach((b) => {
      const bit = 1 << b; const home = lhsList.find((l) => NF.sub(bit, NF.closure(l, fds)));
      if (home != null) { moved.set(home, (moved.get(home) || 0) | bit); movedAll |= bit; }
    });
    const rels = [...moved.entries()].map(([l, r]) => ({ mask: l | r, why: 'partial', lhs: l }));
    rels.unshift({ mask: all & ~movedAll, why: 'rest' });
    return rels.filter((r, i) => !rels.some((q, j) => j !== i && (NF.psub(r.mask, q.mask) || (q.mask === r.mask && j < i))));
  }

  /* ---------- types and SQL ---------- */
  function inferType(values, name) {
    const v = values.filter((x) => x != null); const maxLen = v.reduce((a, x) => Math.max(a, x.length), 1);
    const textHint = /phone|mobile|contact|pin|zip|postal|aadhaar|pan|account|reg|roll|code/i.test(name);
    if (v.length && !textHint && v.every((x) => /^-?\d{1,18}$/.test(x)) && !v.some((x) => /^-?0\d/.test(x))) {
      const big = v.some((x) => Math.abs(Number(x)) > 2147483647); return { kind: big ? 'bigint' : 'int', len: maxLen };
    }
    if (v.length && !textHint && v.every((x) => /^-?\d+\.\d+$|^-?\d+$/.test(x))) {
      const s = Math.max(...v.map((x) => (x.split('.')[1] || '').length)); const p = Math.max(...v.map((x) => x.replace('-', '').split('.')[0].length)) + s;
      return { kind: 'decimal', p: Math.max(p, 3), s };
    }
    if (v.length && v.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x))) return { kind: 'date' };
    const nice = [10, 20, 30, 50, 100, 255, 1000].find((k) => k >= maxLen) || 4000;
    return { kind: 'text', len: nice };
  }
  const RESERVED = new Set('add all alter and as asc between by case check column comment constraint create current date default delete desc distinct drop else end exists from grant group having in index insert into is key level like limit not null number of on or order primary references rename row rows select session set size start table then to trigger union unique update user using values view when where with'.split(' '));
  const DIALECTS = {
    mysql: { label: 'MySQL', q: (n) => (RESERVED.has(n.toLowerCase()) ? '`' + n + '`' : n), type: (t) => ({ int: 'INT', bigint: 'BIGINT', decimal: `DECIMAL(${t.p},${t.s})`, date: 'DATE', text: `VARCHAR(${t.len})` }[t.kind]), multi: true },
    postgres: { label: 'PostgreSQL', q: (n) => (RESERVED.has(n.toLowerCase()) || /[A-Z]/.test(n) ? '"' + n + '"' : n), type: (t) => ({ int: 'INTEGER', bigint: 'BIGINT', decimal: `NUMERIC(${t.p},${t.s})`, date: 'DATE', text: `VARCHAR(${t.len})` }[t.kind]), multi: true },
    oracle: { label: 'Oracle', q: (n) => (RESERVED.has(n.toLowerCase()) ? '"' + n.toUpperCase() + '"' : n), type: (t) => ({ int: 'NUMBER(10)', bigint: 'NUMBER(19)', decimal: `NUMBER(${t.p},${t.s})`, date: 'DATE', text: `VARCHAR2(${t.len})` }[t.kind]), multi: false, date: (v) => `DATE '${v}'` },
    sqlite: { label: 'SQLite', q: (n) => (RESERVED.has(n.toLowerCase()) ? '"' + n + '"' : n), type: (t) => ({ int: 'INTEGER', bigint: 'INTEGER', decimal: 'REAL', date: 'TEXT', text: 'TEXT' }[t.kind]), multi: true }
  };
  /* tables: [{ name, cols: [colIndex], rows, pk: [colIndex], uniques: [[colIndex]], fks: [{cols:[colIndex], ref: tableIndex}] }] */
  function sqlScript(dialect, colNames, colTypes, tables, opts = {}) {
    const D = DIALECTS[dialect]; const L = [];
    const lit = (v, ty) => { if (v == null) return 'NULL'; if (ty.kind === 'int' || ty.kind === 'bigint' || ty.kind === 'decimal') return v; if (ty.kind === 'date' && D.date) return D.date(v); return "'" + String(v).replace(/'/g, "''") + "'"; };
    // referenced tables first
    const order = []; const seen = new Set(); const visit = (i, stack = new Set()) => { if (seen.has(i) || stack.has(i)) return; stack.add(i); tables[i].fks.forEach((f) => visit(f.ref, stack)); seen.add(i); order.push(i); };
    tables.forEach((_, i) => visit(i));
    L.push(`-- ${D.label} script generated by Normalization Virtual Lab`, `-- ${tables.length} table${tables.length > 1 ? 's' : ''}, created in dependency order`, '');
    if (opts.drop) { order.slice().reverse().forEach((i) => L.push(dialect === 'oracle' ? `DROP TABLE ${D.q(tables[i].name)} CASCADE CONSTRAINTS;` : `DROP TABLE IF EXISTS ${D.q(tables[i].name)};`)); L.push(''); }
    order.forEach((i) => {
      const t = tables[i]; const defs = t.cols.map((c) => `  ${D.q(colNames[c])} ${D.type(colTypes[c])}${t.pk.includes(c) ? ' NOT NULL' : ''}`);
      defs.push(`  CONSTRAINT pk_${t.name.toLowerCase()} PRIMARY KEY (${t.pk.map((c) => D.q(colNames[c])).join(', ')})`);
      t.uniques.forEach((u, k) => defs.push(`  CONSTRAINT uq_${t.name.toLowerCase()}_${k + 1} UNIQUE (${u.map((c) => D.q(colNames[c])).join(', ')})`));
      t.fks.forEach((f, k) => defs.push(`  CONSTRAINT fk_${t.name.toLowerCase()}_${k + 1} FOREIGN KEY (${f.cols.map((c) => D.q(colNames[c])).join(', ')}) REFERENCES ${D.q(tables[f.ref].name)} (${f.cols.map((c) => D.q(colNames[c])).join(', ')})`));
      L.push(`CREATE TABLE ${D.q(t.name)} (`, defs.join(',\n'), ');', '');
    });
    if (opts.inserts !== false) order.forEach((i) => {
      const t = tables[i]; if (!t.rows.length) return; const head = `INSERT INTO ${D.q(t.name)} (${t.cols.map((c) => D.q(colNames[c])).join(', ')}) VALUES`;
      const vals = t.rows.map((r) => '(' + r.map((v, k) => lit(v, colTypes[t.cols[k]])).join(', ') + ')');
      if (D.multi) L.push(head, vals.map((v) => '  ' + v).join(',\n') + ';', '');
      else { vals.forEach((v) => L.push(`${head} ${v};`)); L.push(''); }
    });
    if (dialect === 'oracle' && opts.inserts !== false) L.push('COMMIT;');
    return L.join('\n');
  }

  function toCSV(cols, rows) {
    const q = (v) => (v == null ? '' : /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
    return [cols.map(q).join(',')].concat(rows.map((r) => r.map(q).join(','))).join('\n');
  }

  /* ---------- discovery with sensible defaults ---------- */
  // Columns that determine each other one-to-one in this sample are "mirrors"; one representative is kept for defaults.
  function discover(t) {
    const enc = encode(t); const m = t.cols.length; const n = t.rows.length;
    const uniques = minimalUniques(t, enc, Math.min(4, m));
    const mined = mineFDs(t, enc, uniques, m <= 10 ? 3 : 2);
    const rep = [...Array(m).keys()];
    for (let i = 0; i < m; i++) for (let j = 0; j < i; j++) {
      if (rep[j] !== j || rep[i] !== i) continue;
      if (n > 1 && holds(t, 1 << i, 1 << j, enc).ok && holds(t, 1 << j, 1 << i, enc).ok && !isUnique(t, 1 << i, enc)) {
        // prefer an identifier-like column as representative, else the earlier column
        if (idLike(t.cols[i]) && !idLike(t.cols[j])) rep[j] = i; else rep[i] = j;
      }
    }
    for (let i = 0; i < m; i++) { let r = rep[i]; while (rep[r] !== r) r = rep[r]; rep[i] = r; }
    const isRep = (mask) => NF.bits(mask).every((b) => rep[b] === b);
    const idCount = (mask) => NF.bits(mask).filter((b) => idLike(t.cols[b])).length;
    const nullCols = new Set(t.cols.map((_, j) => j).filter((j) => t.rows.some((r) => r[j] == null)));
    const keys = uniques.map((k) => ({ mask: k, hasNull: NF.bits(k).some((b) => nullCols.has(b)), rep: isRep(k), ids: idCount(k) }));
    const pkPick = keys.filter((k) => !k.hasNull).sort((a, b) => (b.rep - a.rep) || (b.ids - a.ids) || (NF.pop(a.mask) - NF.pop(b.mask)) || a.mask - b.mask)[0] || keys[0];
    const fds = mined.fds.map((f) => {
      const notes = [];
      const lhsRep = isRep(f.lhs); const lhsId = idCount(f.lhs) > 0;
      const mirror = NF.bits(f.lhs).filter((b) => rep[b] !== b).map((b) => t.cols[rep[b]]);
      if (mirror.length) notes.push('mirrors ' + mirror.join(', ') + ' in this sample');
      if (lhsId) notes.push('identifier on the left');
      if (f.evidence === 1) notes.push('only one repeated group');
      const def = lhsRep && (lhsId || f.evidence >= 2);
      return { ...f, notes, def };
    });
    return { enc, uniques, keys, pk: pkPick ? pkPick.mask : (1 << m) - 1, fds, constant: mined.constant, rep };
  }

  /* progressive decomposition: each stage refines the tables of the stage before it */
  function stages(all, F, mvds) {
    const A = NF.analyse(all, F, mvds);
    const clean = (rels) => rels.filter((r, i) => !rels.some((q, j) => j !== i && (NF.psub(r.mask, q.mask) || (q.mask === r.mask && j < i))));
    const S = {};
    S['1NF'] = [{ mask: all, from: 'The 1NF table itself.' }];
    S['2NF'] = A.in2 ? S['1NF'].map((r) => ({ ...r, from: 'Already in 2NF: no attribute depends on part of a key.' }))
      : clean(decompose2NF(all, F, A).map((r) => ({ mask: r.mask, lhs: r.lhs, from: r.why === 'partial' ? { split: 'partial', lhs: r.lhs } : { split: 'rest' } })));
    const refine = (prev, test, split) => clean(prev.flatMap((r) => {
      const pf = NF.project(F, r.mask);
      const mv = (mvds || []).filter((d) => NF.sub(d.lhs, r.mask)).map((d) => ({ lhs: d.lhs, rhs: d.rhs & r.mask })).filter((d) => d.rhs & ~d.lhs);
      const an = NF.analyse(r.mask, pf, mv);
      if (test(an)) return [{ ...r }];
      return split(r, pf).map((x) => ({ mask: x.mask, from: { split: 'refine', parent: r.mask, why: x.why } }));
    }));
    S['3NF'] = refine(S['2NF'], (an) => an.in3, (r, pf) => NF.synthesize3NF(r.mask, pf).relations.map((x) => ({ mask: x.mask, why: 'synthesis' })));
    S.BCNF = refine(S['3NF'], (an) => an.inB, (r, pf) => NF.decomposeBCNF(r.mask, pf).relations.map((x) => ({ mask: x.mask, why: 'bcnf' })));
    if (mvds && mvds.length) S['4NF'] = refine(S.BCNF, (an) => an.in4, (r, pf) => NF.decomposeBCNF(r.mask, pf, mvds).relations.map((x) => ({ mask: x.mask, why: 'mvd' })));
    return { A, S };
  }

  root.TBL = { discover, stages, MAX_COLS, MAX_ROWS, cell, show, parseDelimited, sanitizeNames, detect1NF, apply1NF, encode, holds, isUnique, minimalUniques, mineFDs, idLike,
    project, naturalJoin, compareRows, redundantCells, keyDuplicates, decompose2NF, inferType, DIALECTS, sqlScript, toCSV };
  if (typeof module !== 'undefined') module.exports = root.TBL;
})(typeof window !== 'undefined' ? window : globalThis);
