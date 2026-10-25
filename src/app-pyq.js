/* ===================== PREVIOUS YEAR QUESTIONS ===================== */
const PYQ_TOPICS = ['Closure & inference', 'Keys', 'Normal forms', 'Minimal cover', 'Decomposition', 'Table instances', 'Theory'];
const PYQSTATE = {
  prog: store.get('pyq.progress', {}),
  bm: store.get('pyq.bookmarks', []),
  mark(id, correct) { this.prog[id] = { s: correct ? 'right' : 'wrong', at: Date.now() }; store.set('pyq.progress', this.prog); },
  toggle(id) { this.bm = this.bm.includes(id) ? this.bm.filter((x) => x !== id) : this.bm.concat(id); store.set('pyq.bookmarks', this.bm); }
};
const PYQF = store.get('pyq.filters', { exam: 'all', topics: [], type: 'all', status: 'all', sort: 'new', q: '' });
const PYQUI = {};
PYQ.forEach((q) => { q.marks = q.marks || 1; });

function pyqFiltered() {
  const words = PYQF.q.trim().toLowerCase();
  let list = PYQ.filter((q) => (PYQF.exam === 'all' || q.exam === PYQF.exam)
    && (!PYQF.topics.length || PYQF.topics.includes(q.topic))
    && (PYQF.type === 'all' || q.type === PYQF.type)
    && (PYQF.status === 'all' || (PYQF.status === 'todo' && !PYQSTATE.prog[q.id]) || (PYQF.status === 'wrong' && PYQSTATE.prog[q.id] && PYQSTATE.prog[q.id].s === 'wrong') || (PYQF.status === 'bm' && PYQSTATE.bm.includes(q.id)))
    && (!words || (q.stem + ' ' + q.year + ' ' + q.exam + ' ' + (q.options || []).join(' ')).toLowerCase().includes(words)));
  list = list.slice().sort((a, b) => (PYQF.sort === 'new' ? b.year - a.year : a.year - b.year));
  return list;
}

function matrixSVG() {
  const years = [...new Set(PYQ.map((q) => q.year))].sort((a, b) => a - b);
  const left = 128, colW = 26, rowH = 26, top = 8;
  const W = left + years.length * colW + 8, H = top + PYQ_TOPICS.length * rowH + 30;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Questions per topic and year" font-family="Atkinson Hyperlegible, system-ui, sans-serif">`;
  PYQ_TOPICS.forEach((t, r) => {
    const y = top + r * rowH + rowH / 2;
    s += `<text x="${left - 10}" y="${y + 4}" text-anchor="end" font-size="11.5" fill="var(--ink-2)">${esc(t)}</text>`;
    s += `<line x1="${left}" x2="${W - 8}" y1="${y}" y2="${y}" stroke="var(--rule-2)"/>`;
    years.forEach((yr, c) => {
      const k = PYQ.filter((q) => q.topic === t && q.year === yr).length;
      if (k) s += `<circle cx="${left + c * colW + colW / 2}" cy="${y}" r="${4 + k * 2.5}" fill="var(--accent)" fill-opacity="${0.35 + 0.3 * k}"><title>${esc(t)}, ${yr}: ${k} question${k > 1 ? 's' : ''}</title></circle>`;
    });
  });
  years.forEach((yr, c) => {
    const x = left + c * colW + colW / 2, y = top + PYQ_TOPICS.length * rowH + 14;
    s += `<text x="${x}" y="${y}" text-anchor="middle" font-size="10" fill="var(--ink-3)" transform="rotate(-45 ${x} ${y})">${String(yr).slice(2)}’</text>`;
  });
  return s + '</svg>';
}

RENDER.pyq = function () {
  const root = $('#view-pyq');
  const exams = [...new Set(PYQ.map((q) => q.exam))];
  const right = PYQ.filter((q) => PYQSTATE.prog[q.id] && PYQSTATE.prog[q.id].s === 'right').length;
  const wrong = PYQ.filter((q) => PYQSTATE.prog[q.id] && PYQSTATE.prog[q.id].s === 'wrong').length;
  const years = PYQ.map((q) => q.year);
  root.innerHTML = `<div class="view-head"><div><h1>Previous year questions</h1><p class="muted">${PYQ.length} questions on functional dependencies and normalization from GATE CSE, GATE IT and UGC NET, ${Math.min(...years)}–${Math.max(...years)}. Every computational answer key was re-derived by this lab’s engine, and most questions open straight into the lab.</p></div></div>
  <div class="pyq-top">
    <div class="panel pad"><div class="stat-row">
      <div class="stat"><b>${PYQ.length}</b><span>questions</span></div><div class="stat"><b>${right}</b><span>solved correctly</span></div>
      <div class="stat"><b>${wrong}</b><span>to revisit</span></div><div class="stat"><b>${PYQSTATE.bm.length}</b><span>bookmarked</span></div></div>
      <div class="progress" aria-label="${right} correct and ${wrong} wrong out of ${PYQ.length}"><i style="width:${right / PYQ.length * 100}%;background:var(--ok)"></i><i style="width:${wrong / PYQ.length * 100}%;background:var(--bad)"></i></div>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="pyq-timed">Attempt the filtered set as a timed paper</button><button class="btn ghost" id="pyq-reset">Reset progress</button></div>
      <p class="hint" id="pyq-timed-hint"></p></div>
    <div class="panel pad matrix"><h3 style="font-size:1rem;margin-bottom:4px">Where the marks have come from</h3><p class="small muted" style="margin-bottom:6px">Questions per topic per year in this bank. Bigger dots, more questions.</p>${matrixSVG()}</div>
  </div>
  <div class="panel filters" role="search">
    <select id="f-exam" aria-label="Exam"><option value="all">All exams</option>${exams.map((e) => `<option ${PYQF.exam === e ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select>
    <select id="f-type" aria-label="Question type"><option value="all">All types</option><option value="mcq" ${PYQF.type === 'mcq' ? 'selected' : ''}>Single answer</option><option value="msq" ${PYQF.type === 'msq' ? 'selected' : ''}>One or more answers</option><option value="nat" ${PYQF.type === 'nat' ? 'selected' : ''}>Numerical</option></select>
    <select id="f-status" aria-label="Status"><option value="all">Any status</option><option value="todo" ${PYQF.status === 'todo' ? 'selected' : ''}>Not attempted</option><option value="wrong" ${PYQF.status === 'wrong' ? 'selected' : ''}>Got wrong</option><option value="bm" ${PYQF.status === 'bm' ? 'selected' : ''}>Bookmarked</option></select>
    <select id="f-sort" aria-label="Sort"><option value="new" ${PYQF.sort === 'new' ? 'selected' : ''}>Newest first</option><option value="old" ${PYQF.sort === 'old' ? 'selected' : ''}>Oldest first</option></select>
    <input type="search" id="f-q" placeholder="Search questions (press /)" value="${esc(PYQF.q)}" aria-label="Search questions">
    <div class="row" style="width:100%;gap:6px">${PYQ_TOPICS.map((t) => `<button class="tagbtn" data-topic="${esc(t)}" aria-pressed="${PYQF.topics.includes(t)}">${esc(t)}</button>`).join('')}</div>
  </div>
  <p class="small muted" id="pyq-count" role="status" style="margin-bottom:10px"></p>
  <div class="pyq-list" id="pyq-list"></div>`;
  const save = () => { store.set('pyq.filters', PYQF); renderPyqList(); };
  $('#f-exam').addEventListener('change', (e) => { PYQF.exam = e.target.value; save(); });
  $('#f-type').addEventListener('change', (e) => { PYQF.type = e.target.value; save(); });
  $('#f-status').addEventListener('change', (e) => { PYQF.status = e.target.value; save(); });
  $('#f-sort').addEventListener('change', (e) => { PYQF.sort = e.target.value; save(); });
  $('#f-q').addEventListener('input', debounce((e) => { PYQF.q = e.target.value; save(); }, 150));
  $$('[data-topic]').forEach((b) => b.addEventListener('click', () => { const t = b.dataset.topic; PYQF.topics = PYQF.topics.includes(t) ? PYQF.topics.filter((x) => x !== t) : PYQF.topics.concat(t); b.setAttribute('aria-pressed', PYQF.topics.includes(t)); save(); }));
  $('#pyq-timed').addEventListener('click', () => {
    const list = pyqFiltered(); if (!list.length) { toast('No questions match the filters.'); return; }
    const secs = list.reduce((s, q) => s + (q.marks === 1 ? 90 : 180), 0);
    startQuiz(list.map((q) => ({ ...q })), 'exam', 'pyq', `PYQ paper · ${list.length} questions`, secs);
  });
  $('#pyq-reset').addEventListener('click', (e) => {
    if (e.target.dataset.confirm !== '1') { e.target.dataset.confirm = '1'; e.target.textContent = 'Click again to reset'; setTimeout(() => { if (e.target.isConnected) { e.target.dataset.confirm = ''; e.target.textContent = 'Reset progress'; } }, 3000); return; }
    PYQSTATE.prog = {}; store.set('pyq.progress', {}); RENDER.pyq(); toast('Progress cleared');
  });
  renderPyqList();
};

function renderPyqList() {
  const list = pyqFiltered(); const box = $('#pyq-list'); if (!box) return;
  const total = list.reduce((s, q) => s + q.marks, 0);
  $('#pyq-count').textContent = `${list.length} question${list.length === 1 ? '' : 's'} shown, ${total} marks`;
  $('#pyq-timed-hint').textContent = list.length ? `${list.length} questions, about ${Math.round(list.reduce((s, q) => s + (q.marks === 1 ? 1.5 : 3), 0))} minutes, GATE marking.` : '';
  if (!list.length) { box.innerHTML = '<div class="panel empty">No questions match these filters. Clear a filter or the search box.</div>'; return; }
  box.innerHTML = list.map((q) => pyqCard(q)).join('');
  list.forEach((q) => bindPyqCard(q));
}

function pyqCard(q) {
  const ui = PYQUI[q.id] || (PYQUI[q.id] = { picked: q.type === 'msq' ? [] : q.type === 'nat' ? '' : null, revealed: false });
  const p = PYQSTATE.prog[q.id]; const bm = PYQSTATE.bm.includes(q.id);
  const head = `<div class="q-meta"><span class="chip acc">${esc(q.exam)} ${q.year}</span>${q.set ? `<span class="chip line">${esc(q.set)}</span>` : ''}${q.q ? `<span class="chip line">Q${esc(q.q)}</span>` : ''}<span class="chip line">${esc(q.topic)}</span><span class="chip line">${typeLabel(q.type)}</span><span class="chip line">${q.marks} mark${q.marks > 1 ? 's' : ''}</span>
    ${p ? `<span class="chip ${p.s === 'right' ? 'ok' : 'bad'}">${p.s === 'right' ? 'solved' : 'revisit'}</span>` : ''}
    <button class="bm" data-bm="${q.id}" aria-pressed="${bm}" aria-label="${bm ? 'Remove bookmark' : 'Bookmark this question'}"><svg viewBox="0 0 24 24" fill="${bm ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M6 3h12v18l-6-4-6 4z"/></svg></button></div>`;
  const state = { picked: ui.picked, revealed: ui.revealed, name: 'p-' + q.id };
  const body = q.type === 'nat'
    ? `<div style="margin:14px 0"><label class="lbl" for="nat-${q.id}">Your answer</label><input class="field nat num" id="nat-${q.id}" inputmode="decimal" value="${esc(ui.picked ?? '')}" ${ui.revealed ? 'disabled' : ''}></div>`
    : `<div class="opts" role="${q.type === 'msq' ? 'group' : 'radiogroup'}" aria-label="Options">${q.options.map((_, k) => optionHTML(q, k, state)).join('')}</div>`;
  return `<article class="q-card" id="card-${q.id}">${head}<p class="q-stem">${esc(q.stem)}</p>${qTableHTML(q)}${body}
    <div class="row">${ui.revealed ? '<button class="btn" data-retry>Try again</button>' : '<button class="btn primary" data-check>Check answer</button><button class="btn ghost" data-show>Show solution</button>'}
    ${q.lab ? `<button class="btn ghost" data-openlab="${q.id}">Solve in the lab</button>` : q.table ? `<button class="btn ghost" data-opentable="${q.id}">Load the table on the Tables page</button>` : ''}</div>
    ${ui.revealed ? solutionHTML(q, ui.picked).replace(/<p class="sol-open">[^]*?<\/p>/, '') : ''}</article>`;
}

function bindPyqCard(q) {
  const card = $('#card-' + q.id); if (!card) return; const ui = PYQUI[q.id];
  const rerender = () => { card.outerHTML = pyqCard(q); bindPyqCard(q); };
  bindOptions(card, q, () => ui.picked, (p) => (ui.picked = p), rerender);
  const chk = $('[data-check]', card);
  if (chk) chk.addEventListener('click', () => {
    const a = ui.picked; const has = Array.isArray(a) ? a.length : a !== '' && a != null;
    if (!has) { toast('Choose an answer first.'); return; }
    ui.revealed = true; PYQSTATE.mark(q.id, isCorrect(q, a)); rerender(); $('#card-' + q.id + ' [data-retry]').focus();
  });
  const show = $('[data-show]', card); if (show) show.addEventListener('click', () => { ui.revealed = true; rerender(); });
  const retry = $('[data-retry]', card); if (retry) retry.addEventListener('click', () => { ui.revealed = false; ui.picked = q.type === 'msq' ? [] : q.type === 'nat' ? '' : null; rerender(); });
  $('[data-bm]', card).addEventListener('click', () => { PYQSTATE.toggle(q.id); rerender(); });
}

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && currentView === 'pyq' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); $('#f-q') && $('#f-q').focus(); }
});
