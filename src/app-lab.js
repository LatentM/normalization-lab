/* ===================== LAB ===================== */
const EXAMPLES = [
  { id: 'vit', name: 'VIT course enrolment (partial dependencies)', schema: 'Enrolment(regno, name, hostel, course, title, credits, grade)',
    deps: 'regno -> name, hostel\ncourse -> title, credits\nregno, course -> grade' },
  { id: 'irctc', name: 'IRCTC ticket (two overlapping keys)', schema: 'Ticket(pnr, passenger, age, train_no, train_name, journey_date, coach, berth)',
    deps: 'pnr -> train_no, journey_date\ntrain_no -> train_name\npnr, passenger -> age, coach, berth\ntrain_no, journey_date, coach, berth -> pnr, passenger' },
  { id: 'emp', name: 'Employee and department (transitive dependency)', schema: 'Employee(emp_id, emp_name, dept_id, dept_name, dept_city)',
    deps: 'emp_id -> emp_name, dept_id\ndept_id -> dept_name, dept_city' },
  { id: 'abcde', name: 'Textbook R(A,B,C,D,E) with four keys', schema: 'R(A, B, C, D, E)', deps: 'A -> B, C\nC, D -> E\nB -> D\nE -> A' },
  { id: '3nf', name: '3NF but not BCNF', schema: 'R(A, B, C)', deps: 'A, B -> C\nC -> B' },
  { id: 'mvd', name: 'Course, teacher, book (multivalued, 4NF)', schema: 'Offering(course, teacher, book)', deps: 'course ->> teacher\ncourse ->> book' },
  { id: 'g13', name: 'GATE 2013 relation R(A…H)', schema: 'R(A, B, C, D, E, F, G, H)', deps: 'C, H -> G\nA -> B, C\nB -> C, F, H\nE -> A\nF -> E, G' },
  { id: 'g21', name: 'GATE 2021 decomposition check', schema: 'R(P, Q, S, T, X, Y, Z, W)', deps: 'P, Q -> X\nP -> Y, X\nQ -> Y\nY -> Z, W', decomp: '(P,Q,S,T), (P,T,X), (Q,Y), (Y,Z,W)' }
];

const LAB = {
  schema: store.get('lab.schema', EXAMPLES[0].schema),
  deps: store.get('lab.deps', EXAMPLES[0].deps),
  decomp: store.get('lab.decomp', ''),
  tab: store.get('lab.tab', 'nf'),
  closureSel: 0,
  chaseStep: null,
  result: null,
  built: false
};

function labCompute() {
  const s = NF.parseSchema(LAB.schema);
  if (s.error) return { error: [s.error] };
  const d = NF.parseDeps(LAB.deps, s.attrs);
  if (d.errors.length) return { error: d.errors.map((e) => e.msg), attrs: s.attrs };
  if (!d.fds.length && !d.mvds.length) return { error: ['Add at least one dependency, for example A -> B.'], attrs: s.attrs };
  const out = buildRelation(s.name, s.attrs, d.fds, d.mvds);
  const { all, fds } = out;
  if (LAB.decomp.trim()) {
    const p = NF.parseDecomposition(LAB.decomp, s.attrs);
    out.decomp = p;
    if (!p.errors.length && p.parts.length) {
      out.chase = NF.chase(all, p.parts, fds, out.mvds);
      out.pres = NF.preservation(p.parts, fds);
      out.partNF = p.parts.map((pt) => { const pf = NF.project(fds, pt.mask); return { ...pt, fds: pf, an: NF.analyse(pt.mask, pf) }; });
    }
  }
  return out;
}

/* Full analysis of a schema; shared by the Lab, the Tables page and the reports. */
function buildRelation(name, attrs, fds, mvds) {
  mvds = mvds || [];
  const all = (1 << attrs.length) - 1;
  const n = NF.namer(attrs);
  const A = NF.analyse(all, fds, mvds);
  const K = NF.candidateKeys(all, fds);
  const out = { name, attrs, all, n, fds, mvds, A, K };
  out.superkeys = NF.countSuperkeys(all, fds);
  out.cover = NF.minimalCover(fds);
  out.canon = NF.canonicalCover(fds);
  out.syn = NF.synthesize3NF(all, fds);
  out.bcnf = NF.decomposeBCNF(all, fds, mvds.length ? mvds : null);
  const testParts = (rels) => ({ lossless: NF.chase(all, rels, fds, mvds).lossless, pres: NF.preservation(rels, fds) });
  out.synProps = testParts(out.syn.relations);
  out.bcnfProps = testParts(out.bcnf.relations);
  return out;
}

/* ---------- dependency diagram (the lab's signature figure) ---------- */
const KIND = {
  bcnf: { color: 'var(--accent)', label: 'Determinant is a superkey' },
  '3nf': { color: 'var(--prime)', label: 'Right side prime (3NF ok, breaks BCNF)' },
  partial: { color: 'var(--warn)', label: 'Partial dependency (breaks 2NF)' },
  transitive: { color: 'var(--bad)', label: 'Transitive dependency (breaks 3NF)' },
  mvd: { color: 'var(--ink-2)', label: 'Multivalued dependency' }
};
const RANK = { bcnf: 0, '3nf': 1, transitive: 2, partial: 3 };
function fdKind(R, fd) {
  // worst kind among the FD's single-attribute parts
  let worst = 'bcnf';
  R.A.rows.filter((r) => r.fd.line === fd.line && r.fd.lhs === fd.lhs && NF.sub(r.fd.rhs, fd.rhs)).forEach((r) => { if (RANK[r.kind] > RANK[worst]) worst = r.kind; });
  return worst;
}
function diagramSVG(R, opts = {}) {
  const { attrs } = R; const forPrint = opts.print;
  const cw = 8.2, gap = 12, boxH = 34, top = 6;
  const widths = attrs.map((a) => Math.max(44, Math.round(a.length * cw + 24)));
  const xs = []; let x = 4; widths.forEach((w) => { xs.push(x); x += w + gap; });
  const totalW = x - gap + 4;
  const cx = (i) => xs[i] + widths[i] / 2;
  const deps = R.fds.map((f) => ({ ...f, kind: fdKind(R, f) })).concat(R.mvds.map((m) => ({ ...m, kind: 'mvd' })));
  const lvl0 = top + boxH + 20, step = 20;
  const H = lvl0 + Math.max(1, deps.length) * step + 6;
  const W = totalW + 120;
  const firstKey = R.A.keys[0] || 0;
  const col = (v) => (forPrint ? ({ 'var(--accent)': '#1f4fd1', 'var(--prime)': '#6a44c0', 'var(--warn)': '#9a5a00', 'var(--bad)': '#bf3328', 'var(--ink-2)': '#4b5870', 'var(--ink)': '#142033', 'var(--sheet)': '#ffffff', 'var(--prime-soft)': '#efe9fb', 'var(--rule)': '#c9d2df', 'var(--ink-3)': '#6f7b90' }[v] || v) : v);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Dependency diagram for ${esc(R.name)}" font-family="IBM Plex Mono, ui-monospace, monospace">`;
  s += `<defs>${Object.entries(KIND).map(([k, v]) => `<marker id="ah-${k}${forPrint ? 'p' : ''}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="${col(v.color)}"/></marker>`).join('')}</defs>`;
  attrs.forEach((a, i) => {
    const prime = (R.A.prime >> i) & 1; const inKey = (firstKey >> i) & 1;
    s += `<rect x="${xs[i]}" y="${top}" width="${widths[i]}" height="${boxH}" rx="5" fill="${col(prime ? 'var(--prime-soft)' : 'var(--sheet)')}" stroke="${col(prime ? 'var(--prime)' : 'var(--rule)')}" stroke-width="1.2"/>`;
    s += `<text x="${cx(i)}" y="${top + 21.5}" text-anchor="middle" font-size="13" fill="${col('var(--ink)')}">${esc(a)}</text>`;
    if (inKey) s += `<line x1="${cx(i) - a.length * 3.9}" x2="${cx(i) + a.length * 3.9}" y1="${top + 25}" y2="${top + 25}" stroke="${col('var(--ink)')}" stroke-width="1"/>`;
  });
  deps.forEach((d, k) => {
    const y = lvl0 + k * step; const c = col(KIND[d.kind].color); const dash = d.kind === 'mvd' ? ' stroke-dasharray="4 3"' : '';
    const L = NF.bits(d.lhs), Rr = NF.bits(d.rhs & ~d.lhs);
    const off = deps.length > 1 ? ((k % 5) - 2) * 4 : 0; const ox = (i) => cx(i) + off;
    const allX = L.concat(Rr).map(ox); const x1 = Math.min(...allX), x2 = Math.max(...allX);
    s += `<g><title>${esc(R.n.fd(d, d.kind === 'mvd' ? '↠' : '→'))}: ${esc(KIND[d.kind].label)}</title>`;
    s += `<line x1="${x1}" x2="${x2}" y1="${y}" y2="${y}" stroke="${c}" stroke-width="2"${dash}/>`;
    L.forEach((i) => { s += `<line x1="${ox(i)}" x2="${ox(i)}" y1="${top + boxH}" y2="${y}" stroke="${c}" stroke-width="2"${dash}/><circle cx="${ox(i)}" cy="${top + boxH + 3}" r="3" fill="${c}"/>`; });
    Rr.forEach((i) => { s += `<line x1="${ox(i)}" x2="${ox(i)}" y1="${y}" y2="${top + boxH + 4}" stroke="${c}" stroke-width="2"${dash} marker-end="url(#ah-${d.kind}${forPrint ? 'p' : ''})"/>`; });
    s += `<text x="${totalW + 10}" y="${y + 4}" font-size="11" fill="${c}">${d.kind === 'bcnf' ? 'key' : d.kind === '3nf' ? 'prime RHS' : d.kind}</text></g>`;
  });
  return s + '</svg>';
}

/* ---------- lab view ---------- */
RENDER.lab = function () {
  const root = $('#view-lab');
  if (!LAB.built) {
    root.innerHTML = `
    <div class="view-head"><div><h1>Normalization lab</h1><p class="muted">Type a relation and its dependencies. Keys, normal forms, covers and decompositions update as you type, with every step shown.</p></div></div>
    <div class="lab">
      <aside class="rail" aria-label="Relation input"><div class="panel stack">
        <div><label class="lbl" for="in-example">Load an example</label>
          <select id="in-example" class="field"><option value="">Choose…</option>${EXAMPLES.map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></div>
        <div><label class="lbl" for="in-schema">Relation</label><input id="in-schema" class="field mono" spellcheck="false" autocomplete="off" value="${esc(LAB.schema)}">
          <p class="hint">Name(attr1, attr2, …) or just ABCD. Up to 16 attributes.</p></div>
        <div><label class="lbl" for="in-deps">Dependencies</label><textarea id="in-deps" class="field" rows="7" spellcheck="false">${esc(LAB.deps)}</textarea>
          <p class="hint">One per line. <code>A, B -&gt; C</code> or <code>AB -&gt; C</code>. Multivalued: <code>A -&gt;&gt; B</code>. Lines starting with # are ignored.</p></div>
        <div><label class="lbl" for="in-decomp">Decomposition to test <span class="muted small">(optional)</span></label><input id="in-decomp" class="field mono" spellcheck="false" autocomplete="off" placeholder="R1(A,B), R2(B,C)" value="${esc(LAB.decomp)}">
          <p class="hint">Checked in the Test decomposition tab.</p></div>
        <div id="rail-msg" aria-live="polite"></div>
        <dl class="rail-facts" id="rail-facts"></dl>
      </div></aside>
      <section id="lab-out" aria-live="polite"></section>
    </div>`;
    const update = debounce(() => { labRun(); }, 180);
    $('#in-schema').addEventListener('input', (e) => { LAB.schema = e.target.value; store.set('lab.schema', LAB.schema); update(); });
    $('#in-deps').addEventListener('input', (e) => { LAB.deps = e.target.value; store.set('lab.deps', LAB.deps); update(); });
    $('#in-decomp').addEventListener('input', (e) => { LAB.decomp = e.target.value; store.set('lab.decomp', LAB.decomp); LAB.chaseStep = null; update(); });
    $('#in-example').addEventListener('change', (e) => { const ex = EXAMPLES.find((x) => x.id === e.target.value); if (ex) labLoad(ex.schema, ex.deps, ex.decomp || ''); e.target.value = ''; });
    LAB.built = true;
  }
  labRun();
};

function labLoad(schema, deps, decomp, tab) {
  LAB.schema = schema; LAB.deps = deps; LAB.decomp = decomp || ''; LAB.closureSel = 0; LAB.chaseStep = null;
  if (tab) LAB.tab = tab;
  store.set('lab.schema', LAB.schema); store.set('lab.deps', LAB.deps); store.set('lab.decomp', LAB.decomp); store.set('lab.tab', LAB.tab);
  if (LAB.built) { $('#in-schema').value = schema; $('#in-deps').value = deps; $('#in-decomp').value = LAB.decomp; }
  if (location.hash !== '#lab') location.hash = '#lab'; else RENDER.lab();
}

function labRun() {
  let R;
  try { R = labCompute(); } catch (e) { R = { error: ['Something in the input could not be processed: ' + e.message] }; }
  const out = $('#lab-out'); const msg = $('#rail-msg');
  if (R.error) {
    msg.innerHTML = R.error.map((e) => `<p class="err"><span aria-hidden="true">!</span>${esc(e)}</p>`).join('');
    if (LAB.result) { out.classList.add('stale'); out.setAttribute('aria-label', 'Results below are from the last valid input'); }
    else out.innerHTML = '<div class="panel empty">Fix the input on the left to see results.</div>';
    return;
  }
  msg.innerHTML = ''; out.classList.remove('stale'); out.removeAttribute('aria-label');
  LAB.result = R;
  if (LAB.closureSel & ~R.all) LAB.closureSel = 0;
  const { n, A } = R;
  $('#rail-facts').innerHTML = `<dt>Attributes</dt><dd>${R.attrs.length}</dd><dt>Keys</dt><dd>${esc(n.list(A.keys))}</dd><dt>Prime</dt><dd>${esc(n.set(A.prime))}</dd><dt>Highest</dt><dd>${A.highest}</dd>`;
  out.innerHTML = labSummary(R) + labTabs(R);
  bindLabTabs(R);
}

function rungs(R) {
  const A = R.A;
  const r = [
    { nf: '1NF', pass: true, note: 'values assumed atomic' },
    { nf: '2NF', pass: A.in2, note: A.in2 ? 'no partial dependency' : 'partial: ' + A.partials.slice(0, 1).map((p) => R.n.fd(p)).join('') },
    { nf: '3NF', pass: A.in3, note: A.in3 ? 'no transitive dependency' : A.in2 ? 'transitive: ' + R.n.fd(A.threeNfViol[0]) : '' },
    { nf: 'BCNF', pass: A.inB, note: A.inB ? 'every determinant a superkey' : A.in3 ? R.n.fd(A.bcnfViol[0]) + ' (lhs not superkey)' : '' },
    { nf: '4NF', pass: A.in4, note: A.in4 ? (R.mvds.length ? 'MVDs all from superkeys' : 'no MVDs declared') : A.inB ? R.n.fd(A.mvdViol[0], '↠') : '' },
    { nf: '5NF', pass: A.fiveNF, note: A.fiveNF ? 'all keys simple (Date–Fagin)' : A.in4 ? 'needs join dependencies to decide' : '' }
  ];
  let failed = false;
  return r.map((x, i) => {
    let cls = 'rung';
    if (x.pass && !failed) cls += ' pass' + (x.nf === A.highest ? ' top' : '');
    else if (!failed) { failed = true; cls += x.nf === '5NF' ? ' na' : ' fail'; }
    else cls += ' na';
    return `<div class="${cls}"><b>${x.nf}</b><span>${esc(x.note)}</span></div>`;
  }).join('');
}

function labSummary(R) {
  const { n, A } = R;
  const why = {
    '1NF': 'it has a partial dependency: part of a candidate key determines a non-prime attribute.',
    '2NF': 'a non-prime attribute depends on something that is not a key (a transitive dependency).',
    '3NF': 'a dependency has a left side that is not a superkey, though its right side is prime.',
    BCNF: 'a declared multivalued dependency comes from a non-superkey.',
    '4NF': 'every determinant is a superkey and no declared MVD violates 4NF. 5NF depends on join dependencies the FDs cannot express.',
    '5NF': 'it is in 3NF and every candidate key is a single attribute, which guarantees 5NF (Date and Fagin, 1992).'
  };
  const lead = A.highest === '5NF' || A.highest === '4NF' ? `${esc(R.name)} is in <strong>${A.highest}</strong>: ${why[A.highest]}` : `${esc(R.name)} is in <strong>${A.highest}</strong> and no higher, because ${why[A.highest]}`;
  return `<div class="plate">
    <div class="plate-head"><h2>Dependency diagram of ${esc(R.name)}</h2><span class="muted small">Underlined: first candidate key · tinted boxes: prime attributes</span></div>
    <div class="diagram">${diagramSVG(R)}</div>
    <div class="legend">${Object.entries(KIND).filter(([k]) => k !== 'mvd' || R.mvds.length).map(([, v]) => `<span><i style="background:${v.color}"></i>${v.label}</span>`).join('')}</div>
  </div>
  <div class="ladder" role="list" aria-label="Normal form ladder">${rungs(R)}</div>
  <p class="verdict">${lead}</p>
  <div class="facts">
    <div class="fact"><span>Candidate keys (${A.keys.length})</span><b>${esc(n.list(A.keys))}</b></div>
    <div class="fact"><span>Prime attributes</span><b>${esc(n.set(A.prime))}</b></div>
    <div class="fact"><span>Non-prime attributes</span><b>${esc(n.set(A.nonprime))}</b></div>
    <div class="fact"><span>Superkeys</span><b class="num">${R.superkeys}</b></div>
    <div class="fact"><span>Minimal cover size</span><b class="num">${R.cover.cover.length} FDs</b></div>
  </div>`;
}

const LAB_TABS = [['nf', 'Normal forms'], ['closure', 'Closure'], ['keys', 'Keys'], ['cover', 'Minimal cover'], ['decompose', 'Decompose'], ['test', 'Test decomposition']];
function labTabs(R) {
  return `<div class="tabs" role="tablist" aria-label="Analysis">${LAB_TABS.map(([id, label]) => `<button role="tab" id="tab-${id}" aria-controls="tp-${id}" aria-selected="${LAB.tab === id}" tabindex="${LAB.tab === id ? 0 : -1}" data-tab="${id}">${label}</button>`).join('')}</div>
  <div class="tabpanel" role="tabpanel" id="tp-${LAB.tab}" aria-labelledby="tab-${LAB.tab}" tabindex="0">${TABVIEW[LAB.tab](R)}</div>`;
}
function bindLabTabs(R) {
  const tabs = $$('#lab-out [role="tab"]');
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { LAB.tab = t.dataset.tab; store.set('lab.tab', LAB.tab); labRun(); $('#tab-' + LAB.tab).focus(); });
    t.addEventListener('keydown', (e) => {
      let j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length; if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') j = 0; if (e.key === 'End') j = tabs.length - 1;
      if (j != null) { e.preventDefault(); tabs[j].click(); }
    });
  });
  if (TABBIND[LAB.tab]) TABBIND[LAB.tab](R);
}

const kindChip = (k) => ({ bcnf: '<span class="chip ok">superkey → ok</span>', '3nf': '<span class="chip prime">prime RHS: 3NF ok, not BCNF</span>', partial: '<span class="chip warn">partial: breaks 2NF</span>', transitive: '<span class="chip bad">transitive: breaks 3NF</span>' }[k]);

const TABVIEW = {
  nf(R) {
    const { n, A } = R;
    const rows = A.rows.map((r) => {
      const c = NF.closure(r.fd.lhs, R.fds);
      return `<tr><td class="fd">${esc(n.fd(r.fd))}</td><td class="set">${esc(n.set(c))}</td><td>${c === R.all ? 'yes' : 'no'}</td><td>${NF.sub(r.fd.rhs, A.prime) ? 'yes' : 'no'}</td><td>${kindChip(r.kind)}</td></tr>`;
    }).join('');
    const partial = A.partials.length ? `<h3>Partial dependencies found</h3><p class="lead">Each proper subset of every candidate key was closed, looking for non-prime attributes it determines on its own.</p>
      <ul class="notes">${A.partials.map((p) => `<li><span class="fd">${esc(n.fd(p))}</span>: ${esc(n.set(p.lhs))} is part of key ${esc(n.set(p.key))}, and ${esc(n.set(p.rhs))} is non-prime.</li>`).join('')}</ul>` : '';
    const mv = R.mvds.length ? `<h3>Multivalued dependencies</h3><ul class="notes">${R.mvds.map((m) => { const bad = A.mvdViol.includes(m); return `<li><span class="fd">${esc(n.fd(m, '↠'))}</span> ${bad ? '<span class="chip bad">violates 4NF</span> left side is not a superkey' : '<span class="chip ok">ok</span> trivial or from a superkey'}</li>`; }).join('')}</ul>` : '';
    return `<h3>Every dependency, tested</h3><p class="lead">Each right side is split into single attributes. A dependency is fine for BCNF when its left side is a superkey; 3NF also accepts a prime right side; 2NF fails when part of a key determines a non-prime attribute.</p>
      <div class="scroll-x"><table class="t"><thead><tr><th>Dependency</th><th>Left side closure</th><th>Superkey?</th><th>RHS prime?</th><th>Verdict</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="muted">No functional dependencies.</td></tr>'}</tbody></table></div>${partial}${mv}`;
  },
  closure(R) {
    const { n, attrs } = R; const sel = LAB.closureSel || (R.A.keys[0] & ~(R.A.keys[0] & (R.A.keys[0] - 1))) || 1;
    LAB.closureSel = sel;
    const t = NF.closure(sel, R.fds, true);
    const steps = t.steps.map((s) => `<li><span><span class="fd">${esc(n.fd(s.fd))}</span> applies because ${esc(n.set(s.fd.lhs))} ⊆ current set, adding <b class="set">${esc(n(s.added))}</b><br><span class="why">now ${esc(n.set(s.result))}</span></span></li>`).join('');
    const isSK = t.mask === R.all; const isKey = R.A.keys.includes(sel);
    return `<h3>Attribute closure</h3><p class="lead">Pick attributes to form X. X⁺ starts as X, then any dependency whose left side is inside the set adds its right side, until nothing changes.</p>
      <div class="picker" role="group" aria-label="Choose attributes for X">${attrs.map((a, i) => `<button type="button" data-bit="${i}" aria-pressed="${(sel >> i) & 1 ? 'true' : 'false'}">${esc(a)}</button>`).join('')}</div>
      <ol class="proof"><li><span>Start with X = <b class="set">${esc(n.set(sel))}</b></span></li>${steps}</ol>
      <div class="result-line">${esc(n.set(sel))}⁺ = ${esc(n.set(t.mask))}</div>
      <p>${isKey ? '<span class="chip ok">candidate key</span> X⁺ is every attribute and no smaller subset does that.' : isSK ? '<span class="chip acc">superkey</span> X⁺ is every attribute, but X is not minimal.' : `<span class="chip line">not a superkey</span> missing ${esc(n.set(R.all & ~t.mask))}.`}</p>`;
  },
  keys(R) {
    const { n, K, A } = R;
    const verify = A.keys.map((k) => {
      const drops = NF.bits(k).map((b) => { const s = k & ~(1 << b); return s ? `${esc(n.set(s))}⁺ = ${esc(n.set(NF.closure(s, R.fds)))}` : null; }).filter(Boolean);
      return `<li><b class="set">${esc(n.set(k))}</b>⁺ = all attributes.${drops.length ? ` Removing any one attribute fails: <span class="small muted">${drops.join('; ')}</span>` : ''}</li>`;
    }).join('');
    return `<h3>How the keys were found</h3><p class="lead">Attributes split into three groups. Those never on a right side must be in every key. Those only on right sides can never be in a key. Only the rest needs searching.</p>
      <div class="split2"><div class="stage"><h4>In every key</h4><p class="set">${esc(n.set(K.core))}</p><p class="hint">Never determined by anything else.</p></div>
      <div class="stage"><h4>Searched</h4><p class="set">${esc(n.set(K.middle))}</p><p class="hint">Appear on both sides. Subsets tried smallest first; supersets of a found key skipped.</p></div>
      <div class="stage"><h4>In no key</h4><p class="set">${esc(n.set(R.all & ~K.core & ~K.middle))}</p><p class="hint">Only ever determined.</p></div></div>
      <h3>Candidate keys and their check</h3><ul class="notes">${verify}</ul>
      <h3>Superkeys</h3><p>${R.superkeys} of the ${(1 << R.attrs.length) - 1} non-empty attribute subsets are superkeys (each contains at least one candidate key). ${A.keys.length === 1 ? `With one key of size ${NF.pop(A.keys[0])}, that is 2<sup>${R.attrs.length}−${NF.pop(A.keys[0])}</sup> = ${R.superkeys}.` : 'With several keys, count by inclusion–exclusion over the keys.'}</p>`;
  },
  cover(R) {
    const { n } = R;
    const note = (x) => x.kind === 'trivial' ? `Dropped trivial ${esc(n.fd(x.fd))}` : x.kind === 'extraneous' ? `In ${esc(n.fd(x.before))}, ${esc(R.attrs[x.attr])} is extraneous: ${esc(n.set(x.after.lhs))}⁺ already contains ${esc(n(x.before.rhs))}. Now ${esc(n.fd(x.after))}.` : `${esc(n.fd(x.fd))} is redundant: the others already imply it.`;
    return `<h3>Minimal (irreducible) cover in three stages</h3><p class="lead">The cover is equivalent to the given set but has single-attribute right sides, no extraneous left-side attributes and no redundant dependencies.</p>
      ${R.cover.stages.map((s, i) => `<div class="stage"><h4>Stage ${i + 1}: ${esc(s.title)}</h4><div class="fdlist">${s.fds.map((f) => `<span class="fd">${esc(n.fd(f))}</span>`).join('')}</div>${s.notes.length ? `<ul class="notes">${s.notes.map((x) => `<li>${note(x)}</li>`).join('')}</ul>` : '<p class="hint">Nothing changed in this stage.</p>'}</div>`).join('')}
      <div class="result-line">Canonical cover (same left sides merged): ${R.canon.map((f) => esc(n.fd(f))).join(';  ')}</div>
      <p class="small muted">Equivalence check: every original dependency follows from the cover, and every cover dependency follows from the original. ${NF.equivalent(R.cover.cover, R.fds) ? 'Confirmed.' : 'Failed.'}</p>`;
  },
  decompose(R) {
    const { n } = R;
    const relRow = (r, i) => { const an = NF.analyse(r.mask, r.fds); return `<tr><td class="set">R${i + 1}(${esc(n(r.mask))})</td><td>${r.fds.length ? r.fds.map((f) => `<span class="fd">${esc(n.fd(f))}</span>`).join('<br>') : '<span class="muted">none</span>'}</td><td class="set">${esc(n.list(an.keys))}</td><td>${an.highest === '1NF' ? '1NF' : an.inB ? 'BCNF' : an.highest}</td></tr>`; };
    const props = (p) => `<span class="chip ${p.lossless ? 'ok' : 'bad'}">${p.lossless ? 'lossless' : 'lossy'}</span> <span class="chip ${p.pres.preserved ? 'ok' : 'warn'}">${p.pres.preserved ? 'dependency preserving' : 'loses ' + p.pres.results.filter((x) => !x.kept).map((x) => n.fd(x.fd)).join(', ')}</span>`;
    const tree = (node) => `<li><span class="node ${node.ok ? 'leaf' : ''}"><span class="set">${esc(n(node.mask))}</span>${node.violation ? ` splits on <span class="fd">${esc(n.fd(node.violation, node.violation.kind === 'mvd' ? '↠' : '→'))}</span>` : ' <span class="chip ok">BCNF</span>'}</span>${node.children.length ? `<ul>${node.children.map(tree).join('')}</ul>` : ''}</li>`;
    const synSteps = R.syn.steps.map((s) => s.kind === 'cover' ? `Canonical cover: ${s.fds.map((f) => esc(n.fd(f))).join('; ')}. One relation per left side.` : s.kind === 'addkey' ? `No relation contains a candidate key, so add one for key ${esc(n.set(s.key))}.` : s.kind === 'haskey' ? 'A relation already contains a candidate key, so the join will be lossless.' : `Removed ${s.n} relation(s) contained in another.`);
    const asText = (rels) => rels.map((r, i) => `R${i + 1}(${R.attrs.filter((_, b) => (r.mask >> b) & 1).join(',')})`).join(', ');
    return `<div class="split2">
      <div><h3>3NF synthesis</h3><p class="lead">Bernstein’s algorithm. Always lossless and dependency preserving.</p>
        <ol class="proof">${synSteps.map((s) => `<li><span>${s}</span></li>`).join('')}</ol>
        <div class="scroll-x"><table class="t"><thead><tr><th>Relation</th><th>Dependencies</th><th>Keys</th><th>Form</th></tr></thead><tbody>${R.syn.relations.map(relRow).join('')}</tbody></table></div>
        <p class="row" style="margin-top:8px">${props(R.synProps)} <button class="btn sm" data-test="${esc(asText(R.syn.relations))}">Test this split</button></p></div>
      <div><h3>BCNF decomposition</h3><p class="lead">Split on a violating dependency X → Y into X⁺ and R − (X⁺ − X), repeating until every part is in BCNF${R.mvds.length ? ' (declared MVDs are also split away, for 4NF)' : ''}. Always lossless, not always preserving.</p>
        <ul class="tree">${tree(R.bcnf.tree)}</ul>
        <div class="scroll-x"><table class="t"><thead><tr><th>Relation</th><th>Dependencies</th><th>Keys</th><th>Form</th></tr></thead><tbody>${R.bcnf.relations.map(relRow).join('')}</tbody></table></div>
        <p class="row" style="margin-top:8px">${props(R.bcnfProps)} <button class="btn sm" data-test="${esc(asText(R.bcnf.relations))}">Test this split</button></p></div>
    </div>`;
  },
  test(R) {
    const { n } = R;
    if (!R.decomp) return `<div class="panel empty"><p>Enter a decomposition in the left panel, for example <code>R1(A,B), R2(B,C)</code>, or press “Test this split” in the Decompose tab.</p></div>`;
    if (R.decomp.errors.length) return `<div class="callout bad">${R.decomp.errors.map(esc).join('<br>')}</div>`;
    const C = R.chase; const last = C.steps.length - 1;
    const st = LAB.chaseStep == null ? last : Math.min(LAB.chaseStep, last); const S = C.steps[st];
    const sym = (v, j) => (v === 0 ? `a${j + 1}` : `b${Math.floor(v / 100)}${j + 1}`);
    const chg = new Set((S.changes || []).map((c) => c.row + ':' + c.col));
    const rows = S.tableau.map((r, i) => `<tr class="${r.every((v) => v === 0) ? 'full' : ''}"><th class="set">${esc(R.decomp.parts[i] ? R.decomp.parts[i].name : 'new ' + (i - R.decomp.parts.length + 1))}</th>${r.map((v, j) => `<td class="${v === 0 ? 'a' : 'b'} ${chg.has(i + ':' + j) ? 'chg' : ''}">${sym(v, j)}</td>`).join('')}</tr>`).join('');
    const verdict = C.lossless ? `<div class="callout ok">Lossless join: row ${esc(R.decomp.parts[C.fullRow] ? R.decomp.parts[C.fullRow].name : 'new ' + (C.fullRow - R.decomp.parts.length + 1))} became all distinguished (all a’s).</div>`
      : `<div class="callout bad">Lossy: no row became all a’s after the chase stopped${C.coversAll ? '' : ', and the parts do not even cover every attribute'}. Joining the parts can create spurious tuples.</div>`;
    const pres = R.pres.results.map((x) => {
      const local = R.decomp.parts.find((p) => NF.sub(x.fd.lhs | x.fd.rhs, p.mask));
      return `<tr><td class="fd">${esc(n.fd(x.fd))}</td><td>${x.kept ? (local ? `<span class="chip ok">inside ${esc(local.name)}</span>` : '<span class="chip acc">derived across parts</span>') : '<span class="chip bad">lost</span>'}</td></tr>`;
    }).join('');
    return `<h3>Lossless-join test (chase)</h3><p class="lead">One row per part: a<sub>j</sub> where the part has attribute j, b<sub>ij</sub> elsewhere. Each FD equates values in rows that agree on its left side. The join is lossless exactly when some row becomes all a’s.</p>
      <div class="row" style="margin-bottom:8px"><button class="btn sm" id="ch-prev" ${st === 0 ? 'disabled' : ''}>Previous step</button><button class="btn sm" id="ch-next" ${st === last ? 'disabled' : ''}>Next step</button><span class="small muted">Step ${st} of ${last}${S.fd ? `: applied <span class="fd">${esc(n.fd(S.fd))}</span>` : S.mvd ? `: applied <span class="fd">${esc(n.fd(S.mvd, '↠'))}</span>, adding ${S.addedRows.length} row${S.addedRows.length > 1 ? 's' : ''}` : ': initial tableau'}</span></div>
      <div class="scroll-x"><table class="t tableau"><thead><tr><th></th>${C.cols.map((c) => `<th>${esc(R.attrs[c])}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
      ${verdict}
      <h3 style="margin-top:18px">Dependency preservation</h3><p class="lead">For each X → Y, grow Z from X using only what each part can see: Z ∪= ((Z ∩ Ri)⁺ ∩ Ri). Preserved when Y ends up in Z.</p>
      <div class="scroll-x"><table class="t"><thead><tr><th>Dependency</th><th>Status</th></tr></thead><tbody>${pres}</tbody></table></div>
      <p style="margin-top:10px">${R.pres.preserved ? '<span class="chip ok">dependency preserving</span>' : '<span class="chip bad">not dependency preserving</span>'}</p>
      <h3 style="margin-top:18px">Each part on its own</h3><div class="scroll-x"><table class="t"><thead><tr><th>Part</th><th>Projected FDs</th><th>Keys</th><th>Highest form</th></tr></thead><tbody>${R.partNF.map((p) => `<tr><td class="set">${esc(p.name)}(${esc(n(p.mask))})</td><td>${p.fds.length ? p.fds.map((f) => `<span class="fd">${esc(n.fd(f))}</span>`).join('<br>') : '<span class="muted">none</span>'}</td><td class="set">${esc(n.list(p.an.keys))}</td><td>${p.an.inB ? 'BCNF' : p.an.highest}</td></tr>`).join('')}</tbody></table></div>`;
  }
};
const TABBIND = {
  closure(R) {
    $$('#lab-out .picker button').forEach((b) => b.addEventListener('click', () => {
      const bit = 1 << Number(b.dataset.bit); const next = LAB.closureSel ^ bit; LAB.closureSel = next || LAB.closureSel; labRun();
      const again = $(`#lab-out .picker button[data-bit="${b.dataset.bit}"]`); if (again) again.focus();
    }));
  },
  decompose() {
    $$('#lab-out [data-test]').forEach((b) => b.addEventListener('click', () => {
      LAB.decomp = b.dataset.test; store.set('lab.decomp', LAB.decomp); $('#in-decomp').value = LAB.decomp; LAB.chaseStep = 0; LAB.tab = 'test'; store.set('lab.tab', 'test'); labRun();
    }));
  },
  test(R) {
    if (!R.chase) return; const last = R.chase.steps.length - 1;
    const cur = () => (LAB.chaseStep == null ? last : LAB.chaseStep);
    const p = $('#ch-prev'), nx = $('#ch-next');
    if (p) p.addEventListener('click', () => { LAB.chaseStep = Math.max(0, cur() - 1); labRun(); $('#ch-prev') && $('#ch-prev').focus(); });
    if (nx) nx.addEventListener('click', () => { LAB.chaseStep = Math.min(last, cur() + 1); labRun(); $('#ch-next') && !$('#ch-next').disabled ? $('#ch-next').focus() : $('#ch-prev').focus(); });
  }
};
