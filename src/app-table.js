/* ===================== TABLES: normalize a table of real data ===================== */
const TB_STEPS = [['table', 'Table'], ['onenf', 'First normal form'], ['deps', 'Dependencies'], ['diagnose', 'Diagnose'], ['normalize', 'Normalize'], ['sql', 'SQL and export']];
const TB_PAGE = 100;
const TB = Object.assign({
  raw: null, mode: 'grid', text: '', step: 0, ex: 'reg', renamed: [], parseWarn: [],
  off1: { groups: {}, multi: {} }, sep: {}, pk: null, alt: {}, fdUse: {}, rules: '', check: '',
  stage: null, dialect: 'mysql', inserts: true, drop: false, names: {}, showAll: {}, sqlStage: null
}, store.get('tb.state', {}));
let TBR = null; // last computed result
const tbSave = debounce(() => { try { const s = { ...TB }; if (JSON.stringify(s.raw || '').length > 300000) delete s.raw; store.set('tb.state', s); } catch (e) { /* ignore */ } }, 400);
const nameKey = (cols, mask) => NF.bits(mask).map((b) => cols[b]).join(', ');
const maskOf = (cols, key) => (key || '').split(',').map((s) => s.trim()).filter(Boolean).reduce((m, c) => { const j = cols.indexOf(c); return j < 0 ? -1 : m | (1 << j); }, 0);

function tbLoadExample(id) {
  const ex = TABLE_EXAMPLES.find((e) => e.id === id) || TABLE_EXAMPLES[0];
  const p = TBL.parseDelimited(ex.csv); const sn = TBL.sanitizeNames(p.cols);
  Object.assign(TB, { hints: ex.names || {}, ex: ex.id, raw: { name: ex.name, cols: sn.names, rows: p.rows }, renamed: sn.changed, parseWarn: p.warnings, text: ex.csv,
    off1: { groups: {}, multi: {} }, sep: {}, pk: ex.pk === null ? '' : ex.pk, alt: {}, fdUse: { __intended: ex.fds }, rules: '', names: {}, showAll: {}, stage: null, sqlStage: null });
  tbSave();
}
function tbSetRaw(name, cols, rows, warn) {
  const sn = TBL.sanitizeNames(cols);
  Object.assign(TB, { hints: {}, ex: '', raw: { name: tbSafeName(name), cols: sn.names, rows: rows.map((r) => sn.names.map((_, j) => TBL.cell(r[j]))) }, renamed: sn.changed, parseWarn: warn || [],
    off1: { groups: {}, multi: {} }, sep: {}, pk: null, alt: {}, fdUse: {}, names: {}, showAll: {}, stage: null, sqlStage: null });
  tbSave();
}
function tbLoadRows(name, cols, rows) { tbSetRaw(name, cols, rows, []); TB.mode = 'grid'; TB.step = 2; tbSave(); if (location.hash !== '#tables') location.hash = '#tables'; else RENDER.tables(); }
const tbSafeName = (s) => (String(s || 'MyTable').replace(/\.[^.]+$/, '').replace(/[^\w]+/g, '_').replace(/^(\d)/, 'T_$1').replace(/^_+|_+$/g, '') || 'MyTable');

/* ---------- the whole pipeline ---------- */
function tbCompute() {
  const raw = TB.raw;
  if (!raw || !raw.cols.length) return { error: 'Load an example, paste a table or upload a file to begin.' };
  if (raw.cols.length < 2) return { error: 'A table needs at least two columns.' };
  if (raw.cols.length > TBL.MAX_COLS + 8) return { error: `This page handles up to ${TBL.MAX_COLS} columns after cleaning; the table has ${raw.cols.length}.` };
  if (!raw.rows.length) return { error: 'The table has a header but no rows. Add at least one row.' };
  if (raw.rows.length > TBL.MAX_ROWS) return { error: `This page handles up to ${TBL.MAX_ROWS} rows; the table has ${raw.rows.length}. Remove rows or split the file.` };
  const det = TBL.detect1NF(raw);
  const gKey = (g) => g.stems.join('+');
  const groupsOn = det.groups.map((g, i) => (TB.off1.groups[gKey(g)] !== false ? i : -1)).filter((i) => i >= 0);
  const multiOn = det.multi.filter((m) => TB.off1.multi[raw.cols[m.col]] !== false).map((m) => ({ col: raw.cols[m.col], sep: TB.sep[raw.cols[m.col]] || m.sep }));
  const r1 = TBL.apply1NF(raw, det, { groups: groupsOn, multi: multiOn });
  const t = r1.table; const m = t.cols.length; const all = (1 << m) - 1;
  if (m > TBL.MAX_COLS) return { error: `After cleaning, the table has ${m} columns; the limit is ${TBL.MAX_COLS}.`, det, r1 };
  if (t.rows.length > TBL.MAX_ROWS * 5) return { error: `Splitting the lists produced ${t.rows.length} rows, more than this page can analyse. Untick a list column in step 2.`, det, r1 };
  const D = TBL.discover(t);
  const n = NF.namer(t.cols);
  // keys: primary key radio + alternate keys
  const intended = TB.fdUse.__intended;
  let pk = TB.pk === '' ? 0 : TB.pk != null ? maskOf(t.cols, TB.pk) : D.pk;
  if (pk < 0 || (pk && !TBL.isUnique(t, pk, D.enc))) pk = D.pk;
  const F = [];
  if (pk) F.push({ lhs: pk, rhs: all, src: 'key' });
  D.keys.forEach((k) => { k.alt = k.mask !== pk && !!TB.alt[nameKey(t.cols, k.mask)]; if (k.alt) F.push({ lhs: k.mask, rhs: all, src: 'alt' }); });
  // dependencies mined from the data
  const intendedFds = intended ? NF.parseDeps(intended.join('\n'), t.cols).fds : null;
  D.fds.forEach((f) => {
    const k = nameKey(t.cols, f.lhs) + ' > ' + nameKey(t.cols, f.rhs);
    const def = intendedFds ? intendedFds.some((g) => g.lhs === f.lhs && NF.sub(f.rhs, NF.closure(f.lhs, intendedFds.concat(pk ? [{ lhs: pk, rhs: all }] : [])))) && !intendedFds.some((g) => NF.psub(g.lhs, f.lhs) && NF.sub(f.rhs, g.rhs)) : f.def;
    f.key = k; f.use = k in TB.fdUse ? TB.fdUse[k] : def;
    if (f.use) F.push({ lhs: f.lhs, rhs: f.rhs, src: 'data' });
  });
  // intended rules the miner could not show (for example, a full-key rule) become rules
  const extra = intendedFds ? intendedFds.filter((g) => !D.fds.some((f) => f.lhs === g.lhs)) : [];
  // the user's own rules
  const pr = NF.parseDeps(TB.rules, t.cols);
  const ruleChecks = pr.fds.concat(extra).map((f) => ({ fd: f, h: TBL.holds(t, f.lhs, f.rhs, D.enc), auto: extra.includes(f) }));
  ruleChecks.forEach((c) => F.push({ lhs: c.fd.lhs, rhs: c.fd.rhs, src: c.auto ? 'example' : 'rule' }));
  // multivalued dependencies created by splitting independent lists
  const mvMask = r1.mvCols.reduce((a, c) => a | (1 << t.cols.indexOf(c)), 0);
  let mvds = [];
  if (mvMask && r1.mvCols.length > 1) {
    const S = all & ~mvMask; const kS = S ? NF.candidateKeys(S, NF.project(F, S)).keys[0] : 0;
    if (kS) mvds = NF.bits(mvMask).map((b) => ({ lhs: kS, rhs: 1 << b, src: 'lists' }));
  }
  mvds = mvds.concat(pr.mvds.map((d) => ({ ...d, src: 'rule' })));
  const R = buildRelation(t.name, t.cols, F, mvds);
  const { S } = TBL.stages(all, F, mvds);
  const stageNames = Object.keys(S);
  const stagesOut = {};
  stageNames.forEach((s) => (stagesOut[s] = tbStage(t, F, mvds, S[s], pk)));
  // redundancy in the data
  const redund = []; const cellKind = new Map();
  const rank = { '3nf': 1, transitive: 2, partial: 3 };
  R.A.rows.filter((r) => r.kind !== 'bcnf').forEach((r) => {
    const cells = TBL.redundantCells(t, r.fd, D.enc);
    if (!cells.length) return;
    const ex = redund.find((x) => x.fd.lhs === r.fd.lhs && x.kind === r.kind);
    if (ex) { ex.fd = { lhs: ex.fd.lhs, rhs: ex.fd.rhs | r.fd.rhs }; ex.cells += cells.length; } else redund.push({ fd: { lhs: r.fd.lhs, rhs: r.fd.rhs }, kind: r.kind, cells: cells.length });
    cells.forEach(([i, j]) => { const k = i + ':' + j; if (!cellKind.has(k) || rank[r.kind] > rank[cellKind.get(k)]) cellKind.set(k, r.kind); });
  });
  return { raw, det, r1, t, m, all, n, D, pk, F, mvds, ruleChecks, ruleErrors: pr.errors, R, S, stages: stagesOut, stageNames, redund, cellKind };
}

function tbStage(t, F, mvds, rels, pkPref) {
  const m = t.cols.length; const all = (1 << m) - 1; const hints = TB.hints || {};
  const tables = rels.map((r) => {
    const pf = NF.project(F, r.mask);
    const mv = (mvds || []).filter((d) => NF.sub(d.lhs, r.mask)).map((d) => ({ lhs: d.lhs, rhs: d.rhs & r.mask })).filter((d) => d.rhs & ~d.lhs);
    const an = NF.analyse(r.mask, pf, mv);
    const pk = an.keys.slice().sort((a, b) => NF.pop(b & pkPref) - NF.pop(a & pkPref) || NF.pop(a) - NF.pop(b) || a - b)[0];
    const P = TBL.project(t, r.mask);
    const dups = TBL.keyDuplicates(P.rows, NF.bits(pk).map((b) => P.idx.indexOf(b)));
    return { mask: r.mask, from: r.from, pf, an, pk, alt: an.keys.filter((k) => k !== pk), P, dups };
  });
  // names: your edits, then the example's hints, then a name built from the key
  const used = new Set();
  tables.forEach((tb) => {
    const key = nameKey(t.cols, tb.mask); const pkKey = nameKey(t.cols, tb.pk);
    let nm = TB.names[key] || hints[pkKey];
    if (!nm) {
      if (tb.mask === all) nm = t.name;
      else if (NF.pop(tb.pk) === 1) { const c = t.cols[NF.bits(tb.pk)[0]]; const base = c.replace(/(_?(id|no|code|num))$/i, '') || c; nm = base.length >= 3 ? base : c; nm = nm.charAt(0).toUpperCase() + nm.slice(1); }
      else nm = NF.bits(tb.pk).map((b) => t.cols[b]).map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join('_');
    }
    nm = tbSafeName(nm); let u = nm, k = 2; while (used.has(u.toLowerCase())) u = nm + '_' + k++; used.add(u.toLowerCase()); tb.name = u; tb.key = key;
  });
  tables.forEach((tb, i) => { tb.fks = []; tables.forEach((s, j) => { if (j !== i && s.pk !== tb.pk && NF.sub(s.pk, tb.mask) && !tb.fks.some((f) => f.pkMask === s.pk)) tb.fks.push({ cols: NF.bits(s.pk), ref: j, pkMask: s.pk }); }); });
  // checks
  const chase = NF.chase(all, rels, F, mvds); const pres = NF.preservation(rels, F);
  const parts = tables.map((tb) => tb.P); const order = []; const left = parts.map((_, i) => i).sort((a, b) => parts[b].idx.length - parts[a].idx.length);
  let cur = left.shift(); order.push(cur); let have = new Set(parts[cur].idx);
  while (left.length) { left.sort((a, b) => parts[b].idx.filter((j) => have.has(j)).length - parts[a].idx.filter((j) => have.has(j)).length); cur = left.shift(); order.push(cur); parts[cur].idx.forEach((j) => have.add(j)); }
  const J = TBL.naturalJoin(order.map((i) => parts[i]), m);
  const rejoin = J.tooBig ? { tooBig: true } : TBL.compareRows(t.rows, J.rows);
  const cellsBefore = t.rows.length * m; const cellsAfter = tables.reduce((a, tb) => a + tb.P.rows.length * tb.P.idx.length, 0);
  return { tables, chase, pres, rejoin, cellsBefore, cellsAfter };
}

/* ---------- view ---------- */
RENDER.tables = function () {
  if (!TB.raw) tbLoadExample(TB.ex || 'reg');
  const root = $('#view-tables');
  root.innerHTML = `<div class="view-head"><div><h1>Normalize a table</h1><p class="muted">Start from rows of real data. The page fixes first normal form, finds the dependencies and keys the data supports, measures the redundancy, then splits the table step by step and writes the SQL.</p></div>
    <button class="btn" id="tb-open-lab">Open the schema in the Lab</button></div>
    <ol class="stepper" id="tb-stepper" aria-label="Steps"></ol>
    <div id="tb-body"></div>
    <div class="row tb-nav"><button class="btn" id="tb-back">Back</button><button class="btn primary" id="tb-next">Next</button></div>`;
  $('#tb-back').addEventListener('click', () => tbGo(TB.step - 1));
  $('#tb-next').addEventListener('click', () => tbGo(TB.step + 1));
  $('#tb-open-lab').addEventListener('click', () => {
    if (!TBR || TBR.error) { toast('Fix the table first.'); return; }
    const deps = TBR.F.map((f) => TBR.n(f.lhs) + ' -> ' + TBR.n(f.rhs & ~f.lhs)).filter((s) => !/-> ∅$/.test(s)).concat(TBR.mvds.map((d) => TBR.n(d.lhs) + ' ->> ' + TBR.n(d.rhs)));
    labLoad(`${TBR.t.name}(${TBR.t.cols.join(', ')})`, deps.join('\n') || '# no dependencies selected', '');
  });
  tbRun(true);
};
function tbGo(s) { TB.step = Math.max(0, Math.min(TB_STEPS.length - 1, s)); tbSave(); tbRun(true); $('#tb-stepper').scrollIntoView({ block: 'nearest' }); }

function tbRun(full) {
  try { TBR = tbCompute(); } catch (e) { TBR = { error: 'This table could not be analysed: ' + e.message }; console.error(e); }
  if (TBR.error && TB.step > 0) { TB.step = 0; full = true; }
  tbStepper();
  if (full) tbBody();
  const back = $('#tb-back'), next = $('#tb-next');
  if (back) { back.disabled = TB.step === 0; next.hidden = TB.step === TB_STEPS.length - 1; next.textContent = TB.step < TB_STEPS.length - 1 ? 'Next: ' + TB_STEPS[TB.step + 1][1] : ''; next.disabled = !!TBR.error && TB.step >= 0; }
  tbSave();
}
function tbStepper() {
  const R = TBR; const ok = !R.error;
  const status = [
    TB.raw ? `${TB.raw.rows.length} rows × ${TB.raw.cols.length} columns` : 'empty',
    ok ? (R.r1.log.length ? `${R.r1.log.length} fix${R.r1.log.length > 1 ? 'es' : ''} applied` : 'already in 1NF') : '',
    ok ? `${R.F.length + R.mvds.length} rule${R.F.length + R.mvds.length === 1 ? '' : 's'} in use` : '',
    ok ? `highest form ${R.R.A.highest}` : '',
    ok ? (() => { const last = R.stageNames[R.stageNames.length - 1]; return `${R.stages[last].tables.length} tables in ${last}`; })() : '',
    ok ? TBL.DIALECTS[TB.dialect].label : ''
  ];
  $('#tb-stepper').innerHTML = TB_STEPS.map(([id, label], i) => `<li><button type="button" data-step="${i}" ${i === TB.step ? 'aria-current="step"' : ''} ${i > 0 && !ok ? 'disabled' : ''}><span class="sn">${i + 1}</span><span><b>${label}</b><small>${esc(status[i] || '')}</small></span></button></li>`).join('');
  $$('#tb-stepper [data-step]').forEach((b) => b.addEventListener('click', () => tbGo(Number(b.dataset.step))));
}
function tbBody() {
  const body = $('#tb-body'); const R = TBR;
  const v = [tbViewTable, tbView1NF, tbViewDeps, tbViewDiagnose, tbViewNormalize, tbViewSQL][TB.step];
  body.innerHTML = v(R); (TB_BIND[TB.step] || (() => {}))(R);
}

/* shared: a data grid */
function dataTable(cols, rows, opts = {}) {
  const lim = opts.limit || 50; const shown = rows.slice(0, lim);
  const head = cols.map((c, j) => `<th class="${opts.pk && opts.pk.includes(j) ? 'pkc' : ''} ${opts.fk && opts.fk.includes(j) ? 'fkc' : ''}" scope="col">${esc(c)}</th>`).join('');
  const body = shown.map((r, i) => `<tr${opts.rowClass ? ` class="${opts.rowClass(i) || ''}"` : ''}>${opts.num ? `<th class="rn" scope="row">${i + 1}</th>` : ''}${r.map((v, j) => { const k = opts.cellClass ? opts.cellClass(i, j) : ''; return `<td class="${k || ''} ${v == null ? 'nul' : ''}">${v == null ? 'NULL' : esc(v)}</td>`; }).join('')}</tr>`).join('');
  return `<div class="scroll-x dgrid-wrap"><table class="dgrid"><thead><tr>${opts.num ? '<th class="rn"></th>' : ''}${head}</tr></thead><tbody>${body}</tbody></table></div>${rows.length > lim ? `<p class="hint">${opts.more || `Showing ${lim} of ${rows.length} rows.`}</p>` : ''}`;
}

/* ----- step 1: the table ----- */
function tbViewTable(R) {
  const raw = TB.raw || { name: '', cols: [], rows: [] };
  const width = raw.cols.map((c, j) => Math.max(6, Math.min(26, Math.max(c.length + 3, ...raw.rows.slice(0, TB_PAGE).map((r) => (r[j] || '').length + 1)))));
  const grid = `<div class="scroll-x dgrid-wrap"><table class="dgrid edit"><thead><tr><th class="rn"></th>${raw.cols.map((c, j) => `<th><span class="hcell"><input class="gh" size="${width[j]}" data-col="${j}" value="${esc(c)}" aria-label="Name of column ${j + 1}" spellcheck="false"><button class="x" data-delcol="${j}" aria-label="Delete column ${esc(c)}" title="Delete column">×</button></span></th>`).join('')}</tr></thead>
    <tbody>${raw.rows.slice(0, TB_PAGE).map((r, i) => `<tr><th class="rn"><span>${i + 1}</span><button class="x" data-delrow="${i}" aria-label="Delete row ${i + 1}" title="Delete row">×</button></th>${r.map((v, j) => `<td><input size="${width[j]}" data-r="${i}" data-c="${j}" value="${esc(v ?? '')}" aria-label="Row ${i + 1}, ${esc(raw.cols[j])}" spellcheck="false"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
    ${raw.rows.length > TB_PAGE ? `<p class="hint">Showing the first ${TB_PAGE} of ${raw.rows.length} rows. Use Text view to edit the rest.</p>` : ''}
    <div class="row" style="margin-top:8px"><button class="btn sm" id="tb-addrow">Add row</button><button class="btn sm" id="tb-addcol">Add column</button></div>`;
  return `<div class="tb-grid2"><div class="panel pad stack">
      <div><label class="lbl" for="tb-ex">Load an example</label><select id="tb-ex" class="field"><option value="">Choose…</option>${TABLE_EXAMPLES.map((e) => `<option value="${e.id}" ${TB.ex === e.id ? 'selected' : ''}>${esc(e.label)}</option>`).join('')}</select></div>
      <div><label class="lbl" for="tb-file">Upload a file</label><input type="file" id="tb-file" class="field" accept=".csv,.tsv,.txt,.md,.xlsx,.xls"><p class="hint">CSV, TSV, a Markdown table or an Excel sheet (first sheet). First row is the header. Up to ${TBL.MAX_ROWS} rows and ${TBL.MAX_COLS} columns.</p></div>
      <div><label class="lbl" for="tb-name">Table name</label><input id="tb-name" class="field mono" value="${esc(raw.name)}" spellcheck="false"></div>
      <button class="btn" id="tb-blank">Start a blank table</button>
      ${R.error ? `<p class="err" role="alert">${esc(R.error)}</p>` : ''}
      ${TB.parseWarn.length ? `<div class="callout warn small">${TB.parseWarn.slice(0, 4).map(esc).join('<br>')}</div>` : ''}
    </div>
    <div class="panel pad" style="min-width:0">
      <div class="row" style="justify-content:space-between;margin-bottom:10px"><div class="seg" role="radiogroup" aria-label="Edit mode">${[['grid', 'Grid'], ['text', 'Text']].map(([v, l]) => `<label><input type="radio" name="tb-mode" value="${v}" ${TB.mode === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
        <span class="small muted" id="tb-size">${raw.rows.length} rows × ${raw.cols.length} columns</span></div>
      ${TB.mode === 'grid' ? grid : `<label class="lbl" for="tb-text">Paste rows, header first</label><textarea id="tb-text" class="field" rows="16" spellcheck="false">${esc(TB.text || TBL.toCSV(raw.cols, raw.rows))}</textarea><p class="hint">Separated by tabs (pasted from Excel or Sheets), commas, semicolons or |. Put a cell holding several values in quotes, for example "Robotics; Music".</p><p class="err" id="tb-text-err" role="alert"></p>`}
    </div></div>`;
}

/* ----- step 2: 1NF ----- */
function tbView1NF(R) {
  const { det, r1, raw } = R; const items = [];
  if (TB.renamed.length) items.push(`<li class="fix"><b>Column names cleaned</b> so they work as SQL identifiers: ${TB.renamed.map((c) => `<code>${esc(c.from)}</code> → <code>${esc(c.to)}</code>`).join(', ')}.</li>`);
  det.groups.forEach((g) => {
    const on = TB.off1.groups[g.stems.join('+')] !== false; const lg = r1.log.find((l) => l.kind === 'group' && g.stems.every((s) => l.text.includes(s)));
    items.push(`<li class="fix"><label class="chk"><input type="checkbox" data-group="${esc(g.stems.join('+'))}" ${on ? 'checked' : ''}> <b>Repeating group:</b> ${g.stems.map((s) => g.indices.map((i) => `<code>${esc(s + i)}</code>`).join(' ')).join(' · ')}</label>
      <p class="small muted">The same fact is spread across numbered columns. Folding gives one row per filled index in column${g.stems.length > 1 ? 's' : ''} ${g.stems.map((s) => `<code>${esc(s)}</code>`).join(', ')}.${lg ? ` Rows: ${lg.before} → ${lg.after}.` : ''}</p></li>`);
  });
  det.multi.forEach((mv) => {
    const col = raw.cols[mv.col]; const on = TB.off1.multi[col] !== false; const sep = TB.sep[col] || mv.sep;
    items.push(`<li class="fix"><label class="chk"><input type="checkbox" data-multi="${esc(col)}" ${on ? 'checked' : ''}> <b>Several values in one cell:</b> <code>${esc(col)}</code> (${mv.count} row${mv.count > 1 ? 's' : ''}, e.g. “${esc(mv.examples[0])}”)</label>
      <p class="small muted">1NF needs one value per cell. Each value gets its own row. Separator <select data-sep="${esc(col)}" aria-label="Separator for ${esc(col)}">${[';', ',', '|', '/'].map((s) => `<option ${s === sep ? 'selected' : ''}>${s}</option>`).join('')}</select></p></li>`);
  });
  const dl = r1.log.find((l) => l.kind === 'dupes'); if (dl) items.push(`<li class="fix"><b>Duplicate rows removed:</b> ${dl.before - dl.after}. A relation is a set, so identical rows mean the same fact twice.</li>`);
  if (det.nullCols.length) items.push(`<li class="fix"><b>Empty cells</b> in ${det.nullCols.map((j) => `<code>${esc(raw.cols[j])}</code>`).join(', ')} are treated as NULL. A column with NULLs cannot be part of a primary key.</li>`);
  const mvNote = r1.mvCols.length > 1 ? `<div class="callout info">${r1.mvCols.map((c) => `<code>${esc(c)}</code>`).join(' and ')} were independent lists, so splitting them pairs every value with every other value. That repetition is a multivalued dependency; step 5 removes it (4NF).</div>` : '';
  return `<div class="tb-grid2"><div class="panel pad stack"><h2 style="font-size:1.15rem">What changes for 1NF</h2>
      ${items.length ? `<ul class="fixes">${items.join('')}</ul>` : '<div class="callout ok">Already in first normal form: one value per cell, no repeating columns and no duplicate rows.</div>'}
      ${mvNote}<p class="small muted">Rows: ${raw.rows.length} → ${R.t.rows.length}. Columns: ${raw.cols.length} → ${R.t.cols.length}.</p></div>
    <div class="panel pad" style="min-width:0"><h2 style="font-size:1.15rem;margin-bottom:8px">${esc(R.t.name)} in 1NF</h2>${dataTable(R.t.cols, R.t.rows, { num: true, limit: 100 })}</div></div>`;
}

/* ----- step 3: dependencies ----- */
function tbRuleOut(R) {
  const { n } = R;
  const errs = R.ruleErrors.map((e) => `<li class="err">${esc(e.msg)}</li>`).join('');
  const rows = R.ruleChecks.map((c) => `<li><span class="fd">${esc(n.fd(c.fd))}</span> ${c.auto ? '<span class="chip line">from the example</span>' : ''} ${c.h.ok ? '<span class="chip ok">holds in the data</span>' : `<span class="chip bad">violated</span> <span class="small">rows ${c.h.violations[0][0] + 1} and ${c.h.violations[0][1] + 1} agree on ${esc(n(c.fd.lhs))} but differ on ${esc(n(c.fd.rhs & ~c.fd.lhs))}. Fix the data or drop the rule; the split tables will show the clash.</span>`}</li>`).join('');
  return errs || rows ? `<ul class="notes">${errs}${rows}</ul>` : '<p class="hint">No rules added.</p>';
}
function tbCheckOut(R) {
  const txt = TB.check.trim(); if (!txt) return '<p class="hint">Type a rule such as <code>hostel -&gt; warden</code> to see whether every row agrees with it.</p>';
  const p = NF.parseDeps(txt, R.t.cols); if (p.errors.length || !p.fds.length) return `<p class="err">${esc(p.errors[0] ? p.errors[0].msg : 'Write the rule as X -> Y.')}</p>`;
  const f = p.fds[0]; const h = TBL.holds(R.t, f.lhs, f.rhs, R.D.enc);
  if (h.ok) return `<div class="callout ok"><b>${esc(R.n.fd(f))}</b> holds in all ${R.t.rows.length} rows${h.evidence ? `, with ${h.evidence} group${h.evidence > 1 ? 's' : ''} of rows sharing a left side` : ', but every left-side value appears only once, so the data gives no evidence for it'}.</div>`;
  const [a, b] = h.violations[0]; const rows = [R.t.rows[a], R.t.rows[b]];
  const L = NF.bits(f.lhs), Rr = NF.bits(f.rhs & ~f.lhs);
  return `<div class="callout bad"><b>${esc(R.n.fd(f))}</b> does not hold: rows ${a + 1} and ${b + 1} share ${esc(R.n(f.lhs))} but differ on ${esc(R.n(f.rhs & ~f.lhs))}${h.violations.length > 1 ? ` (${h.violations.length}${h.violations.length >= 6 ? '+' : ''} clashes in all)` : ''}.</div>
    ${dataTable(R.t.cols, rows, { cellClass: (i, j) => (L.includes(j) ? 'hl-same' : Rr.includes(j) ? 'hl-diff' : '') })}`;
}
function tbViewDeps(R) {
  const { n, D, t } = R;
  const keys = D.keys.map((k) => { const key = nameKey(t.cols, k.mask); const isPk = k.mask === R.pk;
    return `<div class="keyopt ${isPk ? 'on' : ''}"><label class="chk"><input type="radio" name="tb-pk" value="${esc(key)}" ${isPk ? 'checked' : ''} ${k.hasNull ? 'disabled' : ''}> <span class="set">${esc(n.set(k.mask))}</span></label>
      <span class="row" style="gap:6px">${k.hasNull ? '<span class="chip warn">has NULLs</span>' : k.ids ? '<span class="chip acc">identifier</span>' : ''}<label class="chk small"><input type="checkbox" data-alt="${esc(key)}" ${k.alt ? 'checked' : ''} ${isPk ? 'disabled' : ''}> also unique</label></span></div>`; }).join('');
  const fds = D.fds.map((f) => `<tr><td><label class="chk"><input type="checkbox" data-fd="${esc(f.key)}" ${f.use ? 'checked' : ''}> <span class="fd">${esc(n.fd(f))}</span></label></td>
      <td class="num small">${f.evidence} group${f.evidence === 1 ? '' : 's'}, ${f.covered} rows</td><td class="small muted">${esc(f.notes.join('; '))}</td></tr>`).join('');
  return `<div class="callout info" style="margin-bottom:14px">Rows can prove a rule false but never prove it true (GATE 2002). Everything below holds in these ${t.rows.length} rows; tick only what holds for this kind of data in general. ${TB.ex ? 'The example’s intended rules are ticked.' : 'Rules on an identifier are ticked to start with.'}</div>
  <div class="stack">
    <div class="panel pad"><h2 style="font-size:1.1rem">Keys found in the data</h2><p class="small muted" style="margin:4px 0 10px">Smallest column sets with no repeated value. Choose the primary key; it determines every column. Tick “also unique” for other sets that must stay unique in any data.</p>
      <div class="keygrid" role="radiogroup" aria-label="Primary key"><div class="keyopt"><label class="chk"><input type="radio" name="tb-pk" value="" ${!R.pk ? 'checked' : ''}> None: let the rules decide</label></div>${keys}</div></div>
    <div class="panel pad"><div class="row" style="justify-content:space-between"><h2 style="font-size:1.1rem">Dependencies found in the data</h2><span class="row"><button class="btn sm ghost" id="tb-fd-all">Tick all</button><button class="btn sm ghost" id="tb-fd-none">Clear</button></span></div>
      <p class="small muted" style="margin:4px 0 8px">Minimal rules X → Y that every row obeys, where some X value repeats, so the data actually tests the rule. ${D.constant.length ? `Constant column${D.constant.length > 1 ? 's' : ''} ${D.constant.map((j) => `<code>${esc(t.cols[j])}</code>`).join(', ')} skipped.` : ''}</p>
      ${D.fds.length ? `<div class="scroll-x"><table class="t"><thead><tr><th>Use</th><th>Evidence</th><th>Note</th></tr></thead><tbody>${fds}</tbody></table></div>` : '<p class="muted">No dependency between non-key columns shows up in this data.</p>'}</div>
    <div class="split2">
      <div class="panel pad" style="min-width:0"><label class="lbl" for="tb-rules">Your own rules</label><textarea id="tb-rules" class="field" rows="4" spellcheck="false" placeholder="course -> title&#10;regno ->> phone">${esc(TB.rules)}</textarea>
        <p class="hint">Rules you know are true. Each is checked against the rows. Use ->> for a multivalued dependency.</p><div id="tb-rule-out">${tbRuleOut(R)}</div></div>
      <div class="panel pad" style="min-width:0"><label class="lbl" for="tb-check">Check a rule against the data</label>
        <input id="tb-check" class="field mono" placeholder="hostel -> warden" value="${esc(TB.check)}" spellcheck="false" style="margin-bottom:8px">
        <div id="tb-check-out">${tbCheckOut(R)}</div></div>
    </div></div>
  <p class="small muted" style="margin-top:12px" id="tb-keys-line">Candidate keys under these rules: <b class="set">${esc(n.list(R.R.A.keys))}</b>.</p>`;
}

/* ----- step 4: diagnose ----- */
function tbAnomalies(R) {
  const { t, n, R: Rel, D } = R; const out = []; const key = Rel.A.keys[0];
  const bad = R.redund.slice().sort((a, b) => ({ partial: 0, transitive: 1, '3nf': 2 })[a.kind] - ({ partial: 0, transitive: 1, '3nf': 2 })[b.kind]);
  if (!bad.length) return R.mvds.length && !Rel.A.in4 ? [`<li><b>Repeated combinations.</b> Every ${esc(n(R.mvds[0].rhs))} value is paired with every value of the other list, so adding one value means adding several rows.</li>`] : [];
  const f = bad[0].fd; const G = [...(function () { const g = new Map(); t.rows.forEach((r, i) => { const k = JSON.stringify(NF.bits(f.lhs).map((j) => r[j])); if (!g.has(k)) g.set(k, []); g.get(k).push(i); }); return g; })().values()];
  const big = G.find((g) => g.length > 1); const single = G.find((g) => g.length === 1);
  const desc = (i, mask) => NF.bits(mask).map((j) => `${t.cols[j]} = ${TBL.show(t.rows[i][j])}`).join(', ');
  const rhsOne = NF.bits(f.rhs & ~f.lhs)[0];
  if (big) out.push(`<li><b>Update anomaly.</b> Changing the ${esc(t.cols[rhsOne])} for ${esc(desc(big[0], f.lhs))} means editing ${big.length} rows (${big.map((i) => i + 1).join(', ')}). Miss one and the table contradicts itself.</li>`);
  const missing = key & ~f.lhs;
  if (missing) out.push(`<li><b>Insertion anomaly.</b> A new ${esc(n(f.lhs))} with its ${esc(n(f.rhs & ~f.lhs))} cannot be recorded until it also has a ${esc(n(missing))}, because the key ${esc(n.set(key))} cannot be NULL.</li>`);
  if (single) { const i = single[0]; out.push(`<li><b>Deletion anomaly.</b> Deleting row ${i + 1} (${esc(desc(i, key))}) also deletes the only record that ${esc(desc(i, f.lhs))} has ${esc(desc(i, f.rhs & ~f.lhs))}.</li>`); }
  return out;
}
function tbViewDiagnose(R) {
  const { t, n } = R; const kindName = { partial: 'partial dependency', transitive: 'transitive dependency', '3nf': 'non-key determinant (BCNF)' };
  const total = R.cellKind.size; const cells = t.rows.length * t.cols.length;
  const rows = R.redund.map((r) => `<tr><td><span class="fd">${esc(n.fd(r.fd))}</span></td><td><span class="chip ${r.kind === 'partial' ? 'warn' : r.kind === 'transitive' ? 'bad' : 'prime'}">${kindName[r.kind]}</span></td><td class="num">${r.cells}</td></tr>`).join('');
  const an = tbAnomalies(R);
  return labSummary(R.R) + `<h2 style="margin:26px 0 8px;font-size:1.25rem">Redundancy in the data</h2>
    <p class="muted" style="max-width:75ch;margin-bottom:10px">${total ? `${total} of ${cells} cells (${Math.round(total / cells * 100)}%) repeat a fact already stated in an earlier row. Highlighted cells could be deleted without losing information.` : 'No cell repeats a fact through a functional dependency.'}</p>
    ${R.redund.length ? `<div class="scroll-x" style="margin-bottom:12px"><table class="t"><thead><tr><th>Dependency</th><th>Kind</th><th>Repeated cells</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}
    <div class="legend" style="margin-bottom:8px"><span><i class="sw partial"></i>partial</span><span><i class="sw transitive"></i>transitive</span><span><i class="sw bcnf3"></i>non-key determinant</span></div>
    ${dataTable(t.cols, t.rows, { num: true, limit: 60, cellClass: (i, j) => { const k = R.cellKind.get(i + ':' + j); return k ? 'rd-' + (k === '3nf' ? 'b' : k) : ''; } })}
    ${an.length ? `<h3 style="margin:18px 0 6px">What goes wrong with this table</h3><ul class="notes anomalies">${an.join('')}</ul>` : '<div class="callout ok" style="margin-top:12px">No anomalies from functional dependencies: every determinant is a key.</div>'}`;
}

/* ----- step 5: normalize ----- */
function schemaSVG(R, st) {
  const { t } = R; const T = st.tables; const cw = 7.3, rowH = 21, headH = 30, gapX = 46, gapY = 34, maxW = 980;
  const boxes = T.map((tb) => { const cols = NF.bits(tb.mask); const w = Math.max(tb.name.length * 8.6 + 28, ...cols.map((c) => t.cols[c].length * cw + 46)); return { tb, cols, w: Math.round(w), h: headH + cols.length * rowH + 8 }; });
  // parents sit above the tables that reference them: level = 1 + deepest referenced table
  const level = []; const lv = (i, seen = new Set()) => { if (level[i] != null) return level[i]; if (seen.has(i)) return 0; seen.add(i); const ps = T[i].fks.map((f) => lv(f.ref, seen)); return (level[i] = ps.length ? 1 + Math.max(...ps) : 0); };
  T.forEach((_, i) => lv(i));
  const pos = []; let y = 4; const maxLv = Math.max(...level);
  for (let L = 0; L <= maxLv; L++) {
    const row = T.map((_, i) => i).filter((i) => level[i] === L);
    const cx = (i) => { const ps = T[i].fks.filter((f) => pos[f.ref]).map((f) => pos[f.ref].x + boxes[f.ref].w / 2); return ps.length ? ps.reduce((a, v) => a + v, 0) / ps.length : i * 1e-3; };
    row.sort((a, b) => cx(a) - cx(b));
    let x = 4, lineH = 0;
    row.forEach((i) => { const b = boxes[i]; if (x + b.w > maxW && x > 4) { x = 4; y += lineH + gapY; lineH = 0; } pos[i] = { x, y }; x += b.w + gapX; lineH = Math.max(lineH, b.h); });
    y += lineH + gapY + 10;
  }
  const order = T.map((_, i) => i);
  const W = Math.max(...order.map((i) => pos[i].x + boxes[i].w)) + 6, H = Math.max(...order.map((i) => pos[i].y + boxes[i].h)) + 6;
  const rowY = (i, c) => pos[i].y + headH + boxes[i].cols.indexOf(c) * rowH + rowH / 2 + 2;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Schema with ${T.length} tables" font-family="IBM Plex Mono, ui-monospace, monospace">`;
  s += `<defs><marker id="fkah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>`;
  T.forEach((tb, i) => tb.fks.forEach((f, k) => {
    const a = pos[i], b = pos[f.ref], c = f.cols[0]; const A = boxes[i], P = boxes[f.ref];
    const y1 = rowY(i, c); const pcx = b.x + P.w / 2;
    const fromRight = pcx > a.x + A.w / 2; const x1 = fromRight ? a.x + A.w : a.x;
    let d;
    if (b.y + P.h < a.y) { // parent above: rise from the child's top edge to the parent's bottom edge
      const off = (k - (tb.fks.length - 1) / 2) * 16;
      const sx = Math.min(a.x + A.w - 12, Math.max(a.x + 12, pcx + off)); const tx = Math.min(b.x + P.w - 12, Math.max(b.x + 12, pcx + off)); const ty = b.y + P.h;
      d = `M${sx} ${a.y} C${sx} ${a.y - 26}, ${tx} ${ty + 26}, ${tx} ${ty + 2}`;
    } else { const y2 = rowY(f.ref, c); const x2 = fromRight ? b.x : b.x + P.w; const bend = Math.max(24, Math.abs(x2 - x1) / 2); d = `M${x1} ${y1} C${x1 + (fromRight ? bend : -bend)} ${y1}, ${x2 + (fromRight ? -bend : bend)} ${y2}, ${x2} ${y2}`; }
    s += `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#fkah)" opacity=".85"><title>${esc(tb.name)}.${esc(f.cols.map((q) => t.cols[q]).join(', '))} references ${esc(T[f.ref].name)}</title></path>`;
  }));
  T.forEach((tb, i) => {
    const p = pos[i], b = boxes[i]; const fkCols = new Set(tb.fks.flatMap((f) => f.cols));
    s += `<rect x="${p.x}" y="${p.y}" width="${b.w}" height="${b.h}" rx="7" fill="var(--sheet)" stroke="var(--rule)"/><rect x="${p.x}" y="${p.y}" width="${b.w}" height="${headH}" rx="7" fill="var(--accent-soft)"/><rect x="${p.x}" y="${p.y + headH - 7}" width="${b.w}" height="7" fill="var(--accent-soft)"/>`;
    s += `<text x="${p.x + 12}" y="${p.y + 20}" font-size="13" font-weight="600" font-family="Literata, Georgia, serif" fill="var(--ink)">${esc(tb.name)}</text>`;
    b.cols.forEach((c, k) => {
      const yy = p.y + headH + k * rowH + 15; const isPk = NF.sub(1 << c, tb.pk);
      s += `<text x="${p.x + 12}" y="${yy}" font-size="10" fill="var(--prime)" font-weight="700">${isPk ? 'PK' : fkCols.has(c) ? '<tspan fill="var(--accent)">FK</tspan>' : ''}</text>`;
      s += `<text x="${p.x + 34}" y="${yy}" font-size="12" fill="var(--ink)" ${isPk ? 'font-weight="600"' : ''}>${esc(t.cols[c])}</text>`;
      if (isPk) s += `<line x1="${p.x + 34}" x2="${p.x + 34 + t.cols[c].length * cw}" y1="${yy + 2.5}" y2="${yy + 2.5}" stroke="var(--ink)" stroke-width="1"/>`;
    });
  });
  return s + '</svg>';
}
function tbFromText(R, tb, stage, st) {
  const { n } = R; const f = tb.from;
  if (typeof f === 'string') return f;
  if (!f) return '';
  if (f.split === 'partial') return `Holds ${n(tb.mask & ~f.lhs)}, which depend${NF.pop(tb.mask & ~f.lhs) === 1 ? 's' : ''} on ${n(f.lhs)} alone (partial dependency).`;
  if (f.split === 'rest') return 'What stays once the partial dependencies are moved out; it keeps the whole key.';
  const parent = R.stages[R.stageNames[R.stageNames.indexOf(stage) - 1]].tables.find((x) => x.mask === f.parent);
  const pn = parent ? parent.name : 'the previous table';
  return { synthesis: `Split out of ${pn} by 3NF synthesis to remove a transitive dependency.`, bcnf: `Split out of ${pn} on a determinant that was not a key (BCNF).`, mvd: `Split out of ${pn} on a multivalued dependency (4NF).` }[f.why] || '';
}
function tbViewNormalize(R) {
  const names = R.stageNames; const stage = names.includes(TB.stage) ? TB.stage : names[names.length - 1];
  const st = R.stages[stage]; const { t, n } = R;
  const prev = names[names.indexOf(stage) - 1];
  const same = prev && R.stages[prev].tables.length === st.tables.length && st.tables.every((x, i) => x.mask === R.stages[prev].tables[i].mask);
  const rj = st.rejoin;
  const chips = `<span class="chip ${st.chase.lossless ? 'ok' : 'bad'}">${st.chase.lossless ? 'lossless (chase)' : 'lossy (chase)'}</span>
    <span class="chip ${st.pres.preserved ? 'ok' : 'warn'}">${st.pres.preserved ? 'dependency preserving' : 'loses ' + esc(st.pres.results.filter((x) => !x.kept).map((x) => n.fd(x.fd)).join(', '))}</span>
    ${rj.tooBig ? '<span class="chip line">rejoin too large to check</span>' : `<span class="chip ${rj.same ? 'ok' : 'bad'}">${rj.same ? `rejoin gives back all ${rj.original} rows` : `rejoin: ${rj.spurious.length} extra, ${rj.missing.length} missing rows`}</span>`}`;
  const cards = st.tables.map((tb, i) => {
    const cols = tb.P.idx; const pkPos = NF.bits(tb.pk).map((b) => cols.indexOf(b)); const fkPos = tb.fks.flatMap((f) => f.cols.map((b) => cols.indexOf(b)));
    const show = TB.showAll[tb.key] ? 1e6 : 12;
    return `<article class="tcard"><div class="tcard-head"><input class="tname mono" data-tname="${esc(tb.key)}" value="${esc(tb.name)}" aria-label="Table name" spellcheck="false">
        <span class="chip ${tb.an.inB ? 'ok' : 'warn'}">${tb.an.in4 && R.mvds.length ? '4NF' : tb.an.inB ? 'BCNF' : tb.an.highest}</span><span class="small muted num">${tb.P.rows.length} rows</span></div>
      <p class="small muted">${esc(tbFromText(R, tb, stage, st))}</p>
      <p class="small">Key ${esc(n.set(tb.pk))}${tb.alt.length ? `; also unique ${esc(n.list(tb.alt))}` : ''}${tb.fks.length ? `; references ${tb.fks.map((f) => esc(st.tables[f.ref].name)).join(', ')}` : ''}</p>
      ${tb.dups.length ? `<div class="callout bad small">The key repeats: rows ${tb.dups[0][0] + 1} and ${tb.dups[0][1] + 1} share ${esc(n(tb.pk))}. A rule you ticked is false for this data; recheck step 3.</div>` : ''}
      ${dataTable(cols.map((j) => t.cols[j]), tb.P.rows, { pk: pkPos, fk: fkPos, limit: show, more: `<button class="btn sm ghost" data-showall="${esc(tb.key)}">Show all ${tb.P.rows.length} rows</button>` })}</article>`;
  }).join('');
  const why = { '1NF': 'The cleaned table from step 2, before any split.', '2NF': 'Each attribute that depends on only part of a key moves to a table keyed by that part.', '3NF': 'Each table with a non-key attribute depending on another non-key attribute is re-synthesised from its dependencies.', BCNF: 'Each table where some determinant is not a key is split on that determinant.', '4NF': 'Independent lists are separated so their values are no longer paired.' }[stage];
  return `<div class="tabs" role="tablist" aria-label="Normal form">${names.map((s) => `<button role="tab" data-stage="${s}" aria-selected="${s === stage}" tabindex="${s === stage ? 0 : -1}">${s}<span class="tabn">${R.stages[s].tables.length}</span></button>`).join('')}</div>
    <div class="tabpanel">
      <p class="lead">${why}${same && prev ? ` Nothing changes from ${prev}: every table already meets ${stage}.` : ''}</p>
      <div class="row stage-sum"><span class="stat"><b class="num">${st.tables.length}</b><span>table${st.tables.length > 1 ? 's' : ''}</span></span><span class="stat"><b class="num">${st.cellsBefore} → ${st.cellsAfter}</b><span>cells stored</span></span><span class="row" style="gap:6px">${chips}</span></div>
      ${!st.pres.preserved ? `<div class="callout warn" style="margin:10px 0">This split cannot enforce ${esc(st.pres.results.filter((x) => !x.kept).map((x) => n.fd(x.fd)).join(', '))} inside a single table. The ${R.stageNames.includes('3NF') ? '3NF' : 'previous'} design keeps every dependency at the cost of a little redundancy; pick whichever matters more.</div>` : ''}
      ${rj.spurious && rj.spurious.length ? `<div class="callout bad" style="margin:10px 0">Joining these tables invents rows that were never in the data, for example: ${esc(rj.spurious[0].map(TBL.show).join(', '))}.</div>` : ''}
      <div class="plate schema" style="margin:14px 0"><div class="plate-head"><h2>Schema</h2><span class="small muted">PK primary key · FK foreign key · arrows point to the referenced table</span></div><div class="diagram">${schemaSVG(R, st)}</div></div>
      <div class="tcards">${cards}</div></div>`;
}

/* ----- step 6: SQL and export ----- */
function tbSQL(R, stage, dialect) {
  const st = R.stages[stage]; const types = R.t.cols.map((c, j) => TBL.inferType(R.t.rows.map((r) => r[j]), c));
  const tables = st.tables.map((tb) => ({ name: tb.name, cols: tb.P.idx, rows: tb.P.rows, pk: NF.bits(tb.pk), uniques: tb.alt.map((k) => NF.bits(k)), fks: tb.fks }));
  return { sql: TBL.sqlScript(dialect, R.t.cols, types, tables, { inserts: TB.inserts, drop: TB.drop }), types };
}
function tbViewSQL(R) {
  const names = R.stageNames; const stage = names.includes(TB.sqlStage) ? TB.sqlStage : names.includes(TB.stage) ? TB.stage : names[names.length - 1];
  const { sql, types } = tbSQL(R, stage, TB.dialect);
  const tyRows = R.t.cols.map((c, j) => `<tr><td class="mono">${esc(c)}</td><td class="mono">${esc(TBL.DIALECTS[TB.dialect].type(types[j]))}</td></tr>`).join('');
  return `<div class="tb-grid2"><div class="panel pad stack">
      <fieldset><legend>Design</legend><div class="seg">${names.map((s) => `<label><input type="radio" name="tb-sqlstage" value="${s}" ${s === stage ? 'checked' : ''}><span>${s}</span></label>`).join('')}</div></fieldset>
      <fieldset><legend>Database</legend><div class="seg">${Object.entries(TBL.DIALECTS).map(([k, d]) => `<label><input type="radio" name="tb-dialect" value="${k}" ${k === TB.dialect ? 'checked' : ''}><span>${d.label}</span></label>`).join('')}</div></fieldset>
      <div class="checks"><label><input type="checkbox" id="tb-ins" ${TB.inserts ? 'checked' : ''}> Include INSERT statements for the data</label><label><input type="checkbox" id="tb-drop" ${TB.drop ? 'checked' : ''}> Drop existing tables first</label></div>
      <div class="row"><button class="btn primary" id="tb-copy">Copy SQL</button><button class="btn" id="tb-dl-sql">Download .sql</button></div>
      <div class="row"><button class="btn" id="tb-dl-xlsx">Tables as Excel</button><button class="btn" id="tb-dl-csv">Tables as CSV (.zip)</button></div>
      <p class="small"><a href="#download" id="tb-report">Full report (PDF, Word or text) on the Download page</a></p>
      <details><summary class="small">Column types inferred from the data</summary><table class="t" style="margin-top:6px"><tbody>${tyRows}</tbody></table></details>
    </div>
    <div class="panel pad" style="min-width:0"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h2 style="font-size:1.1rem">${esc(TBL.DIALECTS[TB.dialect].label)} script, ${stage} design</h2><span class="small muted num">${sql.split('\n').length} lines</span></div>
      <pre class="code" id="tb-sql" tabindex="0">${esc(sql)}</pre></div></div>`;
}

/* ---------- events ---------- */
const tbRecompute = debounce(() => tbRun(false), 250);
const TB_BIND = {
  0(R) {
    $('#tb-ex').addEventListener('change', (e) => { if (!e.target.value) return; tbLoadExample(e.target.value); tbRun(true); });
    $('#tb-name').addEventListener('input', (e) => { TB.raw.name = tbSafeName(e.target.value); tbRecompute(); });
    $('#tb-blank').addEventListener('click', () => { tbSetRaw('MyTable', ['col1', 'col2', 'col3'], [[null, null, null], [null, null, null]]); TB.mode = 'grid'; tbRun(true); });
    $('#tb-file').addEventListener('change', tbUpload);
    $$('input[name="tb-mode"]').forEach((r) => r.addEventListener('change', () => { TB.mode = r.value; if (TB.mode === 'text') TB.text = TBL.toCSV(TB.raw.cols, TB.raw.rows); tbRun(true); }));
    if (TB.mode === 'grid') {
      $$('#tb-body input[data-r]').forEach((inp) => inp.addEventListener('input', () => { TB.raw.rows[+inp.dataset.r][+inp.dataset.c] = TBL.cell(inp.value); TB.ex = ''; tbRecompute(); }));
      $$('#tb-body input.gh').forEach((inp) => inp.addEventListener('change', () => { const cols = TB.raw.cols.slice(); cols[+inp.dataset.col] = inp.value; const sn = TBL.sanitizeNames(cols); TB.raw.cols = sn.names; TB.renamed = sn.changed; TB.ex = ''; tbRun(true); }));
      $$('#tb-body [data-delrow]').forEach((b) => b.addEventListener('click', () => { TB.raw.rows.splice(+b.dataset.delrow, 1); TB.ex = ''; tbRun(true); }));
      $$('#tb-body [data-delcol]').forEach((b) => b.addEventListener('click', () => { const j = +b.dataset.delcol; if (TB.raw.cols.length <= 2) { toast('A table needs at least two columns.'); return; } TB.raw.cols.splice(j, 1); TB.raw.rows.forEach((r) => r.splice(j, 1)); TB.ex = ''; tbRun(true); }));
      $('#tb-addrow').addEventListener('click', () => { TB.raw.rows.push(TB.raw.cols.map(() => null)); tbRun(true); const last = $$('#tb-body input[data-r]'); const k = TB.raw.rows.length - 1; const f = $(`#tb-body input[data-r="${k}"][data-c="0"]`); if (f) f.focus(); });
      $('#tb-addcol').addEventListener('click', () => { const sn = TBL.sanitizeNames(TB.raw.cols.concat('col' + (TB.raw.cols.length + 1))); TB.raw.cols = sn.names; TB.raw.rows.forEach((r) => r.push(null)); tbRun(true); });
    } else {
      $('#tb-text').addEventListener('input', debounce((e) => {
        TB.text = e.target.value; const p = TBL.parseDelimited(TB.text); const err = $('#tb-text-err');
        if (p.error) { err.textContent = p.error; return; } err.textContent = '';
        const name = TB.raw ? TB.raw.name : 'MyTable'; const keepEx = false; tbSetRaw(name, p.cols, p.rows, p.warnings); if (!keepEx) TB.ex = '';
        $('#tb-size').textContent = `${TB.raw.rows.length} rows × ${TB.raw.cols.length} columns`; tbRun(false);
      }, 350));
    }
  },
  1(R) {
    $$('#tb-body [data-group]').forEach((c) => c.addEventListener('change', () => { TB.off1.groups[c.dataset.group] = c.checked; tbRun(true); }));
    $$('#tb-body [data-multi]').forEach((c) => c.addEventListener('change', () => { TB.off1.multi[c.dataset.multi] = c.checked; tbRun(true); }));
    $$('#tb-body [data-sep]').forEach((s) => s.addEventListener('change', () => { TB.sep[s.dataset.sep] = s.value; tbRun(true); }));
  },
  2(R) {
    const keep = (f) => { const y = window.scrollY; f(); tbRun(true); window.scrollTo(0, y); };
    $$('#tb-body input[name="tb-pk"]').forEach((r) => r.addEventListener('change', () => keep(() => { TB.pk = r.value; })));
    $$('#tb-body [data-alt]').forEach((c) => c.addEventListener('change', () => keep(() => { TB.alt[c.dataset.alt] = c.checked; })));
    $$('#tb-body [data-fd]').forEach((c) => c.addEventListener('change', () => keep(() => { TB.fdUse[c.dataset.fd] = c.checked; })));
    $('#tb-fd-all') && $('#tb-fd-all').addEventListener('click', () => keep(() => R.D.fds.forEach((f) => (TB.fdUse[f.key] = true))));
    $('#tb-fd-none') && $('#tb-fd-none').addEventListener('click', () => keep(() => R.D.fds.forEach((f) => (TB.fdUse[f.key] = false))));
    $('#tb-rules').addEventListener('input', debounce((e) => { TB.rules = e.target.value; tbRun(false); if (!TBR.error) { $('#tb-rule-out').innerHTML = tbRuleOut(TBR); $('#tb-keys-line').innerHTML = `Candidate keys under these rules: <b class="set">${esc(TBR.n.list(TBR.R.A.keys))}</b>.`; } }, 300));
    $('#tb-check').addEventListener('input', debounce((e) => { TB.check = e.target.value; tbSave(); $('#tb-check-out').innerHTML = tbCheckOut(TBR); }, 250));
  },
  4(R) {
    const tabs = $$('#tb-body [data-stage]');
    tabs.forEach((b, i) => {
      b.addEventListener('click', () => { TB.stage = b.dataset.stage; tbRun(true); $(`#tb-body [data-stage="${TB.stage}"]`).focus(); });
      b.addEventListener('keydown', (e) => { const j = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : null; if (j != null) { e.preventDefault(); tabs[j].click(); } });
    });
    $$('#tb-body [data-tname]').forEach((inp) => inp.addEventListener('change', () => { TB.names[inp.dataset.tname] = tbSafeName(inp.value); tbRun(true); }));
    $$('#tb-body [data-showall]').forEach((b) => b.addEventListener('click', () => { TB.showAll[b.dataset.showall] = true; tbRun(true); }));
  },
  5(R) {
    $$('#tb-body input[name="tb-sqlstage"]').forEach((r) => r.addEventListener('change', () => { TB.sqlStage = r.value; tbRun(true); }));
    $$('#tb-body input[name="tb-dialect"]').forEach((r) => r.addEventListener('change', () => { TB.dialect = r.value; tbRun(true); }));
    $('#tb-ins').addEventListener('change', (e) => { TB.inserts = e.target.checked; tbRun(true); });
    $('#tb-drop').addEventListener('change', (e) => { TB.drop = e.target.checked; tbRun(true); });
    const cur = () => { const names = R.stageNames; const s = names.includes(TB.sqlStage) ? TB.sqlStage : names.includes(TB.stage) ? TB.stage : names[names.length - 1]; return s; };
    $('#tb-copy').addEventListener('click', async () => {
      const text = $('#tb-sql').textContent;
      try { await navigator.clipboard.writeText(text); toast('SQL copied'); }
      catch (e) { const r = document.createRange(); r.selectNodeContents($('#tb-sql')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Press Ctrl+C to copy the selected SQL'); }
    });
    $('#tb-dl-sql').addEventListener('click', () => saveFile(`${R.t.name}_${cur()}_${TB.dialect}.sql`, $('#tb-sql').textContent, 'application/sql'));
    // built-in writers (src/files.js): no library download, so these work offline and on filtered networks
    const exportTables = () => [{ name: '1NF_' + R.t.name, cols: R.t.cols, rows: R.t.rows }]
      .concat(R.stages[cur()].tables.map((tb) => ({ name: tb.name, cols: tb.P.idx.map((j) => R.t.cols[j]), rows: tb.P.rows })));
    $('#tb-dl-csv').addEventListener('click', async () => {
      try {
        const files = exportTables().map((s, i) => ({ name: (i === 0 ? `${R.t.name}_1NF` : s.name) + '.csv', data: '﻿' + TBL.toCSV(s.cols, s.rows) }));
        const seen = new Set(); files.forEach((f) => { let n = f.name, k = 2; while (seen.has(n.toLowerCase())) n = f.name.replace(/\.csv$/, `_${k++}.csv`); seen.add(n.toLowerCase()); f.name = n; });
        await saveFile(`${R.t.name}_${cur()}_tables.zip`, new Blob([FILES.zip(files)], { type: 'application/zip' }), 'application/zip');
      } catch (e) { toast('Could not build the zip: ' + (e && e.message || e)); }
    });
    $('#tb-dl-xlsx').addEventListener('click', async () => {
      const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      try { await saveFile(`${R.t.name}_${cur()}_tables.xlsx`, new Blob([FILES.xlsx(exportTables())], { type: mime }), mime); }
      catch (e) { toast('Could not build the workbook: ' + (e && e.message || e)); }
    });
    $('#tb-report').addEventListener('click', () => store.set('dl.source', 'table'));
  }
};

async function tbUpload(e) {
  const f = e.target.files[0]; if (!f) return;
  try {
    if (/\.xlsx?$/i.test(f.name)) {
      try { await loadLib('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'XLSX'); }
      catch (err) { toast('Reading Excel files needs the internet. Save the sheet as CSV (File → Save As → CSV) and upload that instead.'); return; }
      const wb = window.XLSX.read(await f.arrayBuffer(), { type: 'array' }); const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }).filter((r) => r.some((c) => String(c).trim() !== ''));
      if (aoa.length < 2) { toast('The first sheet needs a header row and at least one data row.'); return; }
      const width = Math.max(...aoa.map((r) => r.length));
      tbSetRaw(f.name, aoa[0].concat(Array(width - aoa[0].length).fill('')), aoa.slice(1).map((r) => r.map((c) => String(c))), []);
    } else {
      const text = await f.text(); const p = TBL.parseDelimited(text);
      if (p.error) { toast(p.error); return; }
      tbSetRaw(f.name, p.cols, p.rows, p.warnings); TB.text = text;
    }
    TB.mode = 'grid'; tbRun(true); toast(`Loaded ${TB.raw.rows.length} rows from ${f.name}`);
  } catch (err) { toast('Could not read ' + f.name + ': ' + err.message); }
}
