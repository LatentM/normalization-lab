/* ===================== QUIZ ===================== */
const TOPICS = ['Closure & inference', 'Keys', 'Normal forms', 'Minimal cover', 'Decomposition', 'Table instances'];

function fmtSetL(attrs, m) { return '{' + NF.bits(m).map((b) => attrs[b]).join(', ') + '}'; }
function shuffle(arr, rand) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pickN(arr, k, rand) { return shuffle(arr, rand).slice(0, k); }

/* Builds an MCQ from a correct string and candidate distractors (deduped, shuffled). Returns null when too few distinct options. */
function mcq(correct, distractors, rand) {
  const uniq = [...new Set(distractors.filter((d) => d !== correct))];
  if (uniq.length < 3) return null;
  const opts = shuffle([correct, ...pickN(uniq, 3, rand)], rand);
  return { options: opts, answer: opts.indexOf(correct) };
}

const GEN = {
  closure(rel, rand) {
    const { attrs, all, fds } = rel; const n = NF.namer(attrs);
    let x = 0, guard = 0;
    do { x = 1 << Math.floor(rand() * attrs.length); if (rand() < 0.4) x |= 1 << Math.floor(rand() * attrs.length); guard++; }
    while ((NF.closure(x, fds) === x || NF.closure(x, fds) === all && guard < 6) && guard < 30);
    const c = NF.closure(x, fds, true);
    const missing = all & ~c.mask; const extra = c.mask & ~x;
    const d = [];
    if (extra) d.push(fmtSetL(attrs, c.mask & ~(1 << NF.bits(extra)[NF.bits(extra).length - 1])));
    if (missing) d.push(fmtSetL(attrs, c.mask | (1 << NF.bits(missing)[0])));
    let oneStep = x; fds.forEach((f) => { if (NF.sub(f.lhs, x)) oneStep |= f.rhs; }); if (oneStep !== c.mask) d.push(fmtSetL(attrs, oneStep));
    let loose = x; fds.forEach((f) => { if (f.lhs & x) loose |= f.rhs; }); d.push(fmtSetL(attrs, loose | c.mask));
    d.push(fmtSetL(attrs, x)); d.push(fmtSetL(attrs, all));
    if (missing && NF.bits(missing).length > 1) d.push(fmtSetL(attrs, c.mask | (1 << NF.bits(missing)[1])));
    const m = mcq(fmtSetL(attrs, c.mask), d, rand); if (!m) return null;
    return { type: 'mcq', topic: 'Closure & inference', stem: `In ${relStem(rel)}, what is (${n(x)})⁺?`, ...m,
      explain: [`Start with ${fmtSetL(attrs, x)}.`].concat(c.steps.map((s) => `${n.fd(s.fd)} applies, add ${n(s.added)} → ${fmtSetL(attrs, s.result)}`), [`No further dependency adds anything, so (${n(x)})⁺ = ${fmtSetL(attrs, c.mask)}.`]) };
  },
  implication(rel, rand) {
    const { attrs, all, fds } = rel; const n = NF.namer(attrs); const cands = []; let guard = 0;
    while (cands.length < 12 && guard++ < 80) {
      let l = 1 << Math.floor(rand() * attrs.length); if (rand() < 0.5) l |= 1 << Math.floor(rand() * attrs.length);
      const r = 1 << Math.floor(rand() * attrs.length); if (NF.sub(r, l)) continue;
      if (fds.some((f) => f.lhs === l && NF.sub(r, f.rhs))) continue;
      if (cands.some((c) => c.lhs === l && c.rhs === r)) continue;
      cands.push({ lhs: l, rhs: r, ok: NF.implies(fds, l, r) });
    }
    const yes = cands.filter((c) => c.ok), no = cands.filter((c) => !c.ok);
    if (!yes.length || !no.length) return null;
    const k = 1 + Math.floor(rand() * Math.min(3, yes.length));
    const chosen = shuffle(pickN(yes, k, rand).concat(pickN(no, 4 - Math.min(k, 4), rand)).slice(0, 4), rand);
    if (chosen.length < 4) return null;
    return { type: 'msq', topic: 'Closure & inference', stem: `In ${relStem(rel)}, which of the following functional dependencies are implied? Select all that apply.`,
      options: chosen.map((c) => n.fd(c)), answer: chosen.map((c, i) => (c.ok ? i : -1)).filter((i) => i >= 0),
      explain: chosen.map((c) => `${n.fd(c)}: (${n(c.lhs)})⁺ = ${fmtSetL(attrs, NF.closure(c.lhs, fds))}, so it ${c.ok ? 'is' : 'is not'} implied.`) };
  },
  keys(rel, rand) {
    const { attrs, all, fds } = rel; const n = NF.namer(attrs); const K = NF.candidateKeys(all, fds); const keys = K.keys;
    const show = (ks) => ks.map((k) => n(k)).join(', ');
    const d = [];
    if (keys.length > 1) d.push(show(keys.slice(0, -1)), show(keys.slice(1)));
    const free = all & ~keys[0]; const nonMin = free ? keys[0] | (1 << NF.bits(free)[0]) : keys[0]; if (nonMin !== keys[0]) d.push(show(keys.concat([nonMin]).sort((a, b) => NF.pop(a) - NF.pop(b))));
    if (K.core && K.core !== keys[0]) d.push(show([K.core]));
    for (let t = 0; t < 10; t++) { const r = 1 << Math.floor(rand() * attrs.length) | (rand() < 0.6 ? 1 << Math.floor(rand() * attrs.length) : 0); if (!keys.includes(r)) d.push(show([r].concat(keys.slice(0, keys.length > 1 ? 1 : 0)))); }
    const m = mcq(show(keys), d, rand); if (!m) return null;
    return { type: 'mcq', topic: 'Keys', stem: `What is the complete set of candidate keys of ${relStem(rel)}?`, ...m, explain: keyExplain(rel, K) };
  },
  keycount(rel) {
    const { all, fds } = rel; const K = NF.candidateKeys(all, fds);
    return { type: 'nat', topic: 'Keys', stem: `How many candidate keys does ${relStem(rel)} have?`, answer: K.keys.length, explain: keyExplain(rel, K) };
  },
  superkeys(rel) {
    const { attrs, all, fds } = rel; const K = NF.candidateKeys(all, fds); const c = NF.countSuperkeys(all, fds); const n = NF.namer(attrs);
    return { type: 'nat', topic: 'Keys', stem: `How many superkeys does ${relStem(rel)} have?`, answer: c,
      explain: [`Candidate keys: ${K.keys.map(n).join(', ')}.`, K.keys.length === 1 ? `One key of size ${NF.pop(K.keys[0])}: every superset is a superkey, 2^(${attrs.length}−${NF.pop(K.keys[0])}) = ${c}.` : `Several keys: count subsets containing at least one key by inclusion–exclusion. Result ${c}.`] };
  },
  prime(rel, rand) {
    const { attrs, all, fds } = rel; const A = NF.analyse(all, fds); const n = NF.namer(attrs);
    const chosen = pickN(NF.bits(all), 4, rand).sort((a, b) => a - b);
    const ans = chosen.map((b, i) => ((A.prime >> b) & 1 ? i : -1)).filter((i) => i >= 0);
    if (!ans.length || ans.length === 4 && rand() < 0.7) return null;
    return { type: 'msq', topic: 'Keys', stem: `Which of these attributes are prime in ${relStem(rel)}? Select all that apply.`, options: chosen.map((b) => attrs[b]), answer: ans,
      explain: [`Candidate keys: ${A.keys.map(n).join(', ')}.`, `An attribute is prime when it appears in at least one key, so the prime set is ${fmtSetL(attrs, A.prime)}.`] };
  },
  nf(rel, rand) {
    const { attrs, all, fds } = rel; const A = NF.analyse(all, fds); const n = NF.namer(attrs);
    const lvl = A.highest === '1NF' ? 0 : A.highest === '2NF' ? 1 : A.highest === '3NF' ? 2 : 3;
    const options = ['1NF but not 2NF', '2NF but not 3NF', '3NF but not BCNF', 'BCNF'];
    const ex = [`Candidate keys: ${A.keys.map(n).join(', ')}; prime: ${fmtSetL(attrs, A.prime)}.`];
    if (lvl === 0) ex.push(`${n.fd(A.partials[0])} is a partial dependency: ${n(A.partials[0].lhs)} is part of key ${n(A.partials[0].key)} and ${n(A.partials[0].rhs)} is non-prime.`);
    else if (lvl === 1) ex.push('No partial dependency, so 2NF holds.', `${n.fd(A.threeNfViol[0])} has a non-superkey left side and a non-prime right side, which breaks 3NF.`);
    else if (lvl === 2) ex.push('Every dependency has a superkey left side or a prime right side, so 3NF holds.', `${n.fd(A.bcnfViol[0])} has a left side that is not a superkey, which breaks BCNF.`);
    else ex.push('Every non-trivial dependency has a superkey on the left, so the relation is in BCNF.');
    return { type: 'mcq', topic: 'Normal forms', stem: `What is the highest normal form of ${relStem(rel)}? (Assume atomic values.)`, options, answer: lvl, explain: ex };
  },
  cover(rel, rand) {
    const { attrs, all, fds } = rel; const n = NF.namer(attrs); const mc = NF.minimalCover(fds);
    const cover = mc.cover; const txt = (F) => F.map((f) => n.fd(f)).sort().join(', ');
    const irreducible = (F) => F.every((f, i) => NF.pop(f.rhs) === 1 && !NF.implies(F.filter((_, j) => j !== i), f.lhs, f.rhs) && NF.bits(f.lhs).every((b) => !(f.lhs & ~(1 << b)) || !NF.implies(F, f.lhs & ~(1 << b), f.rhs)));
    const bad = (F) => !(NF.equivalent(F, fds) && irreducible(F));
    const d = [];
    const split = []; fds.forEach((f) => NF.bits(f.rhs & ~f.lhs).forEach((b) => split.push({ lhs: f.lhs, rhs: 1 << b })));
    if (bad(split)) d.push(split);
    cover.forEach((_, i) => { const F = cover.filter((__, j) => j !== i); if (F.length && bad(F)) d.push(F); });
    cover.forEach((f, i) => { const free = all & ~f.lhs & ~f.rhs; if (free) { const F = cover.slice(); F[i] = { lhs: f.lhs | (1 << NF.bits(free)[0]), rhs: f.rhs }; if (bad(F)) d.push(F); } });
    cover.forEach((f, i) => { const other = all & ~f.lhs & ~f.rhs; if (other) { const F = cover.slice(); F[i] = { lhs: f.lhs, rhs: 1 << NF.bits(other)[NF.bits(other).length - 1] }; if (bad(F)) d.push(F); } });
    const m = mcq(txt(cover), d.map(txt), rand); if (!m) return null;
    const ex = mc.stages.map((s, i) => `Stage ${i + 1} (${s.title.toLowerCase()}): ${s.notes.length ? s.notes.map((x) => x.kind === 'extraneous' ? `${attrs[x.attr]} is extraneous in ${n.fd(x.before)}` : x.kind === 'redundant' ? `${n.fd(x.fd)} is redundant` : `drop trivial ${n.fd(x.fd)}`).join('; ') : 'no change'}.`);
    return { type: 'mcq', topic: 'Minimal cover', stem: `Which of the following is a minimal (irreducible) cover of ${relStem(rel)}?`, ...m, explain: ex.concat([`Result: ${txt(cover)}.`]) };
  },
  decomp(rel, rand) {
    const { attrs, all, fds } = rel; const n = NF.namer(attrs);
    let parts; const r = rand();
    if (r < 0.3) parts = NF.decomposeBCNF(all, fds).relations;
    else if (r < 0.5) parts = NF.synthesize3NF(all, fds).relations;
    else {
      const bitsAll = NF.bits(all); const k = rand() < 0.6 ? 2 : 3; parts = [];
      for (let i = 0; i < k; i++) { let m = 0; const sz = 2 + Math.floor(rand() * Math.max(1, attrs.length - 2)); pickN(bitsAll, sz, rand).forEach((b) => (m |= 1 << b)); parts.push({ mask: m }); }
      let cov = 0; parts.forEach((p) => (cov |= p.mask)); parts[parts.length - 1].mask |= all & ~cov;
    }
    if (parts.length < 2) return null;
    parts = parts.map((p, i) => ({ mask: p.mask, name: 'R' + (i + 1) }));
    const L = NF.chase(all, parts, fds).lossless, P = NF.preservation(parts, fds);
    const options = ['Lossless join and dependency preserving', 'Lossless join but not dependency preserving', 'Lossy but dependency preserving', 'Lossy and not dependency preserving'];
    const answer = L ? (P.preserved ? 0 : 1) : (P.preserved ? 2 : 3);
    const dtext = parts.map((p) => `${p.name}(${NF.bits(p.mask).map((b) => attrs[b]).join(', ')})`).join(', ');
    const lost = P.results.filter((x) => !x.kept).map((x) => n.fd(x.fd));
    return { type: 'mcq', topic: 'Decomposition', stem: `${relStem(rel)} is decomposed into ${dtext}. Which statement is correct?`, options, answer,
      explain: [L ? 'Chase test: some row of the tableau becomes all distinguished, so the join is lossless.' : 'Chase test: no row becomes all distinguished, so the join is lossy.', P.preserved ? 'Every dependency can be enforced from the parts.' : `Lost: ${lost.join(', ')}.`],
      decomp: dtext };
  }
};
/* small random instances for the Table instances topic */
function randomInstance(rand, level) {
  const m = level === 'hard' ? 4 : 3 + (rand() < 0.5 ? 1 : 0); const nRows = level === 'easy' ? 4 : 5 + Math.floor(rand() * 2);
  const cols = 'ABCD'.slice(0, m).split(''); const dom = level === 'easy' ? 3 : 4;
  const rows = []; let guard = 0;
  // plant one dependency so some rules hold for a reason
  const pl = Math.floor(rand() * m), pr = (pl + 1 + Math.floor(rand() * (m - 1))) % m; const map = {};
  while (rows.length < nRows && guard++ < 200) {
    const r = cols.map(() => String(1 + Math.floor(rand() * dom)));
    if (!map[r[pl]]) map[r[pl]] = r[pr]; r[pr] = map[r[pl]];
    if (!rows.some((x) => x.join() === r.join())) rows.push(r);
  }
  return { cols, rows };
}
function pairText(t, a, b, L, R) { return `rows ${a + 1} and ${b + 1} agree on ${NF.bits(L).map((j) => t.cols[j] + ' = ' + t.rows[a][j]).join(', ')} but differ on ${NF.bits(R).map((j) => t.cols[j]).join(', ')}`; }
Object.assign(GEN, {
  instFD(_, rand, level) {
    const t = randomInstance(rand, level); const m = t.cols.length; const n = NF.namer(t.cols); const cands = [];
    for (let l = 1; l < 1 << m; l++) { if (NF.pop(l) > 2) continue; for (let b = 0; b < m; b++) { if (l & (1 << b)) continue; cands.push({ lhs: l, rhs: 1 << b }); } }
    const tagged = cands.map((c) => ({ ...c, h: TBL.holds(t, c.lhs, c.rhs) })).filter((c) => c.h.ok ? c.h.evidence > 0 || rand() < 0.3 : true);
    const yes = tagged.filter((c) => c.h.ok), no = tagged.filter((c) => !c.h.ok); if (!yes.length || !no.length) return null;
    const k = 1 + Math.floor(rand() * Math.min(2, yes.length)); const chosen = shuffle(pickN(yes, k, rand).concat(pickN(no, 4 - k, rand)), rand); if (chosen.length < 4) return null;
    return { type: 'msq', topic: 'Table instances', table: t, stem: 'Which of these functional dependencies are satisfied by the instance below? Select all that apply.',
      options: chosen.map((c) => n.fd(c)), answer: chosen.map((c, i) => (c.h.ok ? i : -1)).filter((i) => i >= 0),
      explain: chosen.map((c) => c.h.ok ? `${n.fd(c)} holds: no two rows agree on ${n(c.lhs)} and differ on ${n(c.rhs)}${c.h.evidence ? '' : ' (every ' + n(c.lhs) + ' value is distinct, so nothing can contradict it)'}.` : `${n.fd(c)} fails: ${pairText(t, c.h.violations[0][0], c.h.violations[0][1], c.lhs, c.rhs)}.`)
        .concat(['An instance can show that a dependency is violated, but holding in one instance does not prove it holds for the schema.']) };
  },
  instKey(_, rand, level) {
    const t = randomInstance(rand, level); const m = t.cols.length; const n = NF.namer(t.cols); const all = (1 << m) - 1;
    const uniq = TBL.minimalUniques(t, null, m); if (uniq.includes(all) && uniq.length === 1) return null;
    const sets = []; for (let s = 1; s < all; s++) if (NF.pop(s) <= 3) sets.push(s);
    const isMin = (s) => uniq.includes(s); const isUnique = (s) => TBL.isUnique(t, s, TBL.encode(t));
    const yes = sets.filter(isMin), nonMin = sets.filter((s) => isUnique(s) && !isMin(s)), no = sets.filter((s) => !isUnique(s));
    if (!yes.length || no.length < 2) return null;
    const k = Math.min(yes.length, 1 + Math.floor(rand() * 2)); const pickNon = nonMin.length && rand() < 0.7 ? pickN(nonMin, 1, rand) : [];
    const chosen = shuffle(pickN(yes, k, rand).concat(pickNon, pickN(no, 4 - k - pickNon.length, rand)), rand); if (chosen.length < 4) return null;
    return { type: 'msq', topic: 'Table instances', table: t, stem: 'Judging only from the instance below, which attribute sets could be a candidate key? Select all that apply.',
      options: chosen.map((s) => n.set(s)), answer: chosen.map((s, i) => (isMin(s) ? i : -1)).filter((i) => i >= 0),
      explain: chosen.map((s) => isMin(s) ? `${n.set(s)}: no two rows share its values, and no smaller subset is unique.` : isUnique(s) ? `${n.set(s)} is unique but not minimal: ${n.list(uniq.filter((u) => NF.psub(u, s)))} already identifies every row.` : (() => { const enc = TBL.encode(t); const g = new Map(); t.rows.forEach((r, i) => { const k2 = NF.bits(s).map((j) => r[j]).join('|'); if (!g.has(k2)) g.set(k2, []); g.get(k2).push(i); }); const d = [...g.values()].find((x) => x.length > 1); return `${n.set(s)} repeats: rows ${d[0] + 1} and ${d[1] + 1} share the same values.`; })()) };
  },
  instJoin(_, rand, level) {
    const t = randomInstance(rand, level === 'easy' ? 'medium' : level); const m = t.cols.length; const all = (1 << m) - 1;
    const j = Math.floor(rand() * m); const rest = NF.bits(all & ~(1 << j)); if (rest.length < 2) return null;
    const a = (1 << j) | (1 << rest[0]); const b = all & ~(1 << rest[0]);
    const P1 = TBL.project(t, a), P2 = TBL.project(t, b); const J = TBL.naturalJoin([P2, P1], m); const c = TBL.compareRows(t.rows, J.rows);
    const n = NF.namer(t.cols);
    return { type: 'nat', topic: 'Table instances', table: t, answer: J.rows.length,
      stem: `The instance below is split into R1(${NF.bits(a).map((x) => t.cols[x]).join(', ')}) and R2(${NF.bits(b).map((x) => t.cols[x]).join(', ')}), removing duplicate rows. How many rows does the natural join R1 ⋈ R2 have?`,
      explain: [`R1 has ${P1.rows.length} distinct rows and R2 has ${P2.rows.length}.`, `They share only ${t.cols[j]}; each R1 row pairs with every R2 row that has the same ${t.cols[j]}.`, `The join has ${J.rows.length} rows: the original ${t.rows.length}${c.spurious.length ? ` plus ${c.spurious.length} spurious row${c.spurious.length > 1 ? 's' : ''}, so this split is lossy for this instance` : ', so for this instance nothing is lost'}.`] };
  }
});
const TOPIC_GENS = { 'Closure & inference': ['closure', 'implication'], Keys: ['keys', 'keycount', 'prime', 'superkeys'], 'Normal forms': ['nf'], 'Minimal cover': ['cover'], Decomposition: ['decomp'], 'Table instances': ['instFD', 'instKey', 'instJoin'] };
function relStem(rel) { const n = NF.namer(rel.attrs); return `R(${rel.attrs.join(', ')}) with ${rel.fds.map((f) => n.fd(f)).join(', ')}`; }
function keyExplain(rel, K) {
  const n = NF.namer(rel.attrs);
  return [`Attributes never on a right side must be in every key: ${fmtSetL(rel.attrs, K.core)}.`, `(${n(K.core) || '∅'})⁺ = ${fmtSetL(rel.attrs, NF.closure(K.core, rel.fds))}.`,
    `Adding the remaining candidates smallest first gives the keys ${K.keys.map(n).join(', ')}; each closes to all attributes and no proper subset does.`];
}

function generateQuiz(opts) {
  const seed = opts.seed || (Date.now() ^ Math.floor(Math.random() * 1e9));
  const rand = NF.rng(seed); const out = []; let guard = 0;
  const topics = opts.topics.length ? opts.topics : TOPICS;
  while (out.length < opts.count && guard++ < opts.count * 60) {
    const topic = topics[out.length % topics.length];
    const gens = TOPIC_GENS[topic].filter((g) => opts.level !== 'easy' || g !== 'cover' || true);
    const g = gens[Math.floor(rand() * gens.length)];
    if (g === 'superkeys' && opts.level === 'hard') continue;
    const rel = NF.randomRelation(rand, opts.level);
    let q = null; try { q = GEN[g](rel, rand, opts.level); } catch (e) { q = null; }
    if (!q) continue;
    if (out.some((o) => o.stem === q.stem && JSON.stringify(o.table || '') === JSON.stringify(q.table || ''))) continue;
    const n = NF.namer(rel.attrs);
    q.id = 'gen-' + seed + '-' + out.length; q.marks = opts.level === 'easy' ? 1 : 2;
    if (!q.table) q.lab = { schema: `R(${rel.attrs.join(', ')})`, deps: rel.fds.map((f) => n(f.lhs) + ' -> ' + n(f.rhs)).join('\n'), decomp: q.decomp || '' };
    out.push(q);
  }
  return out;
}

const QUIZ = { phase: 'setup', mode: 'practice', qs: [], i: 0, answers: [], revealed: [], marked: [], start: 0, deadline: 0, timer: null, origin: 'quiz', title: '' };
const QSET = store.get('quiz.setup', { topics: TOPICS.slice(), level: 'medium', count: 10, mode: 'practice' });

function startQuiz(qs, mode, origin, title, seconds) {
  clearInterval(QUIZ.timer);
  Object.assign(QUIZ, { phase: 'run', mode, qs, i: 0, answers: qs.map((q) => (q.type === 'msq' ? [] : q.type === 'nat' ? '' : null)), revealed: qs.map(() => false), marked: qs.map(() => false), start: Date.now(), origin, title });
  QUIZ.deadline = mode === 'exam' ? Date.now() + seconds * 1000 : 0;
  if (mode === 'exam') QUIZ.timer = setInterval(tickQuiz, 1000);
  if (location.hash !== '#quiz') location.hash = '#quiz'; else RENDER.quiz();
}
function tickQuiz() {
  const el = $('#q-timer'); if (!el) return;
  const left = Math.max(0, Math.round((QUIZ.deadline - Date.now()) / 1000));
  el.textContent = fmtTime(left); el.classList.toggle('low', left <= 60);
  if (left <= 0) { finishQuiz(); toast('Time is up. Your answers were submitted.'); }
}
function scoreOf(q, a) {
  const attempted = q.type === 'msq' ? a.length > 0 : q.type === 'nat' ? a !== '' : a != null;
  if (!attempted) return { attempted: false, correct: false, marks: 0 };
  const c = isCorrect(q, a);
  const neg = q.type === 'mcq' ? -(q.marks / 3) : 0; // GATE: negative marks only for single-answer MCQs
  return { attempted: true, correct: c, marks: c ? q.marks : neg };
}
function finishQuiz() {
  clearInterval(QUIZ.timer); QUIZ.phase = 'done'; QUIZ.end = Date.now();
  const res = QUIZ.qs.map((q, i) => scoreOf(q, QUIZ.answers[i]));
  const total = res.reduce((s, r) => s + r.marks, 0), max = QUIZ.qs.reduce((s, q) => s + q.marks, 0);
  const hist = store.get('quiz.history', []);
  hist.unshift({ at: Date.now(), title: QUIZ.title, mode: QUIZ.mode, score: Math.round(total * 100) / 100, max, correct: res.filter((r) => r.correct).length, n: QUIZ.qs.length, secs: Math.round((QUIZ.end - QUIZ.start) / 1000) });
  store.set('quiz.history', hist.slice(0, 12));
  if (QUIZ.origin === 'pyq') QUIZ.qs.forEach((q, i) => { if (res[i].attempted) PYQSTATE.mark(q.id, res[i].correct); });
  RENDER.quiz();
}

RENDER.quiz = function () {
  const root = $('#view-quiz');
  if (QUIZ.phase === 'setup') return renderQuizSetup(root);
  if (QUIZ.phase === 'run') return renderQuizRun(root);
  return renderQuizDone(root);
};

function renderQuizSetup(root) {
  const hist = store.get('quiz.history', []);
  root.innerHTML = `<div class="view-head"><div><h1>Quiz</h1><p class="muted">Fresh questions are generated from random relations every time, and every answer is checked by the same engine that runs the lab. For real exam questions, use the PYQ section.</p></div></div>
  <div class="quiz-grid"><form class="panel pad stack" id="q-setup">
    <div class="setup-grid">
      <fieldset><legend>Topics</legend><div class="checks">${TOPICS.map((t) => `<label><input type="checkbox" name="topic" value="${esc(t)}" ${QSET.topics.includes(t) ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div></fieldset>
      <div class="stack">
        <fieldset><legend>Difficulty</legend><div class="seg">${[['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']].map(([v, l]) => `<label><input type="radio" name="level" value="${v}" ${QSET.level === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
          <p class="hint">Easy: 4–5 attributes, 1 mark. Medium: 5–6, 2 marks. Hard: 6–7 attributes, more dependencies.</p></fieldset>
        <fieldset><legend>Questions</legend><div class="seg">${[5, 10, 15, 20].map((v) => `<label><input type="radio" name="count" value="${v}" ${QSET.count === v ? 'checked' : ''}><span>${v}</span></label>`).join('')}</div></fieldset>
        <fieldset><legend>Mode</legend><div class="seg">${[['practice', 'Practice'], ['exam', 'Timed test']].map(([v, l]) => `<label><input type="radio" name="mode" value="${v}" ${QSET.mode === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
          <p class="hint">Practice shows the solution after each answer. Timed test follows GATE marking: −⅓ of the marks for a wrong single-answer question, no negative marks for multi-answer or numerical ones.</p></fieldset>
      </div>
    </div>
    <div class="row"><button class="btn primary" type="submit">Start quiz</button><span class="muted small" id="q-setup-msg" role="status"></span></div>
  </form>
  <aside class="panel pad"><h3>Recent attempts</h3>${hist.length ? `<table class="t" style="margin-top:8px"><tbody>${hist.slice(0, 8).map((h) => `<tr><td>${esc(h.title || (h.mode === 'exam' ? 'Timed test' : 'Practice'))}<div class="small muted">${new Date(h.at).toLocaleDateString()} · ${fmtTime(h.secs)}</div></td><td class="num" style="text-align:right">${h.score}/${h.max}</td></tr>`).join('')}</tbody></table>` : '<p class="muted small" style="margin-top:6px">No attempts yet. Your last twelve scores appear here (stored only in this browser).</p>'}</aside></div>`;
  $('#q-setup').addEventListener('submit', (e) => {
    e.preventDefault(); const f = e.target;
    QSET.topics = $$('input[name="topic"]:checked', f).map((x) => x.value);
    QSET.level = f.level.value; QSET.count = Number(f.count.value); QSET.mode = f.mode.value; store.set('quiz.setup', QSET);
    if (!QSET.topics.length) { $('#q-setup-msg').textContent = 'Choose at least one topic.'; return; }
    const qs = generateQuiz({ topics: QSET.topics, level: QSET.level, count: QSET.count });
    startQuiz(qs, QSET.mode, 'quiz', `${QSET.mode === 'exam' ? 'Timed test' : 'Practice'} · ${QSET.level}`, qs.reduce((s, q) => s + (q.marks === 1 ? 90 : 150), 0));
  });
}

function questionHTML(q, i, state) {
  const src = q.exam ? `<span class="chip acc">${esc(q.exam)} ${q.year}${q.set ? ' ' + esc(q.set) : ''}</span>` : '';
  const body = q.type === 'nat'
    ? `<div style="margin:14px 0"><label class="lbl" for="nat-${esc(state.name)}">Your answer</label><input class="field nat num" id="nat-${esc(state.name)}" inputmode="decimal" value="${esc(state.picked ?? '')}" ${state.revealed ? 'disabled' : ''}></div>`
    : `<div class="opts" role="${q.type === 'msq' ? 'group' : 'radiogroup'}" aria-label="Options">${q.options.map((_, k) => optionHTML(q, k, state)).join('')}</div>`;
  return `<div class="q-meta">${src}<span class="chip line">${esc(q.topic)}</span><span class="chip line">${typeLabel(q.type)}</span><span class="chip line">${q.marks} mark${q.marks > 1 ? 's' : ''}</span></div>
    <p class="q-stem">${esc(q.stem)}</p>${qTableHTML(q)}${body}`;
}
function solutionHTML(q, picked) {
  const c = isCorrect(q, picked);
  return `<div class="solution"><p class="feedback ${c ? 'ok' : 'bad'}">${c ? 'Correct.' : `Not quite. The answer is ${esc(answerText(q))}.`}</p>
    <ul>${q.explain.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>${q.alsoIn ? `<p class="small muted">${esc(q.alsoIn)}</p>` : ''}
    ${q.lab ? `<p class="sol-open"><button class="btn sm" data-openlab="${esc(q.id)}">Open this relation in the lab</button></p>` : q.table ? `<p class="sol-open"><button class="btn sm" data-opentable="${esc(q.id)}">Load this table on the Tables page</button></p>` : ''}</div>`;
}
function bindOptions(container, q, getPicked, setPicked, onChange) {
  $$('.opt', container).forEach((lab) => lab.addEventListener('click', (e) => {
    e.preventDefault(); if (lab.classList.contains('locked')) return;
    const k = Number(lab.dataset.opt); let p = getPicked();
    if (q.type === 'msq') { p = p.includes(k) ? p.filter((x) => x !== k) : p.concat(k).sort(); } else p = k;
    setPicked(p); onChange();
  }));
  const nat = $('input.nat', container); if (nat) nat.addEventListener('input', () => setPicked(nat.value.trim()));
  $$('[data-openlab]', container).forEach((b) => b.addEventListener('click', () => { if (q.lab) labLoad(q.lab.schema, q.lab.deps, q.lab.decomp || '', q.lab.decomp ? 'test' : 'nf'); }));
  $$('[data-opentable]', container).forEach((b) => b.addEventListener('click', () => { if (q.table) tbLoadRows(q.exam ? `${q.exam.replace(/\W+/g, '')}_${q.year}` : 'Instance', q.table.cols, q.table.rows); }));
}

function renderQuizRun(root) {
  const q = QUIZ.qs[QUIZ.i]; const i = QUIZ.i; const exam = QUIZ.mode === 'exam';
  const state = { picked: QUIZ.answers[i], revealed: !exam && QUIZ.revealed[i], name: 'q' + i };
  const answered = (k) => { const a = QUIZ.answers[k]; return Array.isArray(a) ? a.length > 0 : a !== '' && a != null; };
  const practiceScore = QUIZ.qs.reduce((s, qq, k) => s + (QUIZ.revealed[k] ? scoreOf(qq, QUIZ.answers[k]).marks : 0), 0);
  root.innerHTML = `<div class="view-head"><div><h1>${esc(QUIZ.title || 'Quiz')}</h1><p class="muted">Question ${i + 1} of ${QUIZ.qs.length}</p></div>
    <button class="btn" id="q-quit">${exam ? 'Submit test' : 'End practice'}</button></div>
  <div class="quiz-grid"><article class="q-card" id="q-card">${questionHTML(q, i, state)}${state.revealed ? solutionHTML(q, QUIZ.answers[i]) : ''}
    <div class="row" style="margin-top:14px">
      <button class="btn" id="q-prev" ${i === 0 ? 'disabled' : ''}>Previous</button>
      ${exam ? `<button class="btn" id="q-mark">${QUIZ.marked[i] ? 'Unmark review' : 'Mark for review'}</button><button class="btn" id="q-clear">Clear answer</button>` : (!state.revealed ? '<button class="btn primary" id="q-check">Check answer</button>' : '')}
      <button class="btn ${exam || state.revealed ? 'primary' : ''}" id="q-next">${i === QUIZ.qs.length - 1 ? (exam ? 'Submit test' : 'See results') : 'Next'}</button>
    </div></article>
    <aside class="panel pad stack">${exam ? `<div><span class="small muted">Time left</span><div class="timer" id="q-timer">--:--</div></div>` : `<div><span class="small muted">Score so far</span><div class="timer num">${Math.round(practiceScore * 100) / 100}</div></div>`}
      <div class="palette" aria-label="Question palette">${QUIZ.qs.map((_, k) => `<button data-go="${k}" class="${answered(k) ? 'ans' : ''} ${k === i ? 'cur' : ''} ${QUIZ.marked[k] ? 'mark' : ''}" aria-label="Question ${k + 1}${answered(k) ? ', answered' : ''}${QUIZ.marked[k] ? ', marked for review' : ''}">${k + 1}</button>`).join('')}</div>
      <p class="small muted">Blue: answered${exam ? '. Dashed: marked for review.' : '.'}</p></aside></div>`;
  if (exam) tickQuiz();
  const card = $('#q-card');
  bindOptions(card, q, () => QUIZ.answers[i], (p) => (QUIZ.answers[i] = p), () => renderQuizRun(root));
  const go = (k) => { QUIZ.i = k; renderQuizRun(root); $('#q-card').focus?.(); };
  $('#q-prev').addEventListener('click', () => go(i - 1));
  $('#q-next').addEventListener('click', () => (i === QUIZ.qs.length - 1 ? finishQuiz() : go(i + 1)));
  $('#q-quit').addEventListener('click', finishQuiz);
  if ($('#q-check')) $('#q-check').addEventListener('click', () => { if (!answered(i)) { toast('Choose an answer first.'); return; } QUIZ.revealed[i] = true; renderQuizRun(root); });
  if ($('#q-mark')) $('#q-mark').addEventListener('click', () => { QUIZ.marked[i] = !QUIZ.marked[i]; renderQuizRun(root); });
  if ($('#q-clear')) $('#q-clear').addEventListener('click', () => { QUIZ.answers[i] = q.type === 'msq' ? [] : q.type === 'nat' ? '' : null; renderQuizRun(root); });
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.go))));
}

function renderQuizDone(root) {
  const res = QUIZ.qs.map((q, i) => scoreOf(q, QUIZ.answers[i]));
  const total = Math.round(res.reduce((s, r) => s + r.marks, 0) * 100) / 100, max = QUIZ.qs.reduce((s, q) => s + q.marks, 0);
  const correct = res.filter((r) => r.correct).length, wrong = res.filter((r) => r.attempted && !r.correct).length;
  const byTopic = {}; QUIZ.qs.forEach((q, i) => { byTopic[q.topic] = byTopic[q.topic] || { n: 0, c: 0 }; byTopic[q.topic].n++; if (res[i].correct) byTopic[q.topic].c++; });
  root.innerHTML = `<div class="view-head"><div><h1>Results</h1><p class="muted">${esc(QUIZ.title)}</p></div>
    <div class="row"><button class="btn" id="q-again">${QUIZ.origin === 'pyq' ? 'Back to PYQs' : 'New quiz'}</button></div></div>
  <div class="split2">
    <div class="panel pad"><span class="small muted">Score</span><div class="score-big num">${total} <span class="muted" style="font-size:1.2rem">/ ${max}</span></div>
      <div class="stat-row" style="margin-top:14px"><div class="stat"><b>${correct}</b><span>correct</span></div><div class="stat"><b>${wrong}</b><span>wrong</span></div><div class="stat"><b>${QUIZ.qs.length - correct - wrong}</b><span>skipped</span></div><div class="stat"><b>${fmtTime(Math.round((QUIZ.end - QUIZ.start) / 1000))}</b><span>time</span></div></div>
      ${QUIZ.mode === 'exam' ? '<p class="small muted" style="margin-top:10px">GATE marking: wrong single-answer questions cost a third of their marks.</p>' : ''}</div>
    <div class="panel pad"><h3 style="margin-bottom:10px">Accuracy by topic</h3><div class="bars">${Object.entries(byTopic).map(([t, v]) => `<div class="bar"><span>${esc(t)}</span><div class="track"><div class="fill" style="width:${Math.round(v.c / v.n * 100)}%"></div></div><span class="num">${v.c}/${v.n}</span></div>`).join('')}</div></div>
  </div>
  <h2 style="margin:24px 0 12px">Review</h2><div class="pyq-list" id="q-review">${QUIZ.qs.map((q, i) => `<article class="q-card" data-i="${i}">${questionHTML(q, i, { picked: QUIZ.answers[i], revealed: true, name: 'r' + i })}
    ${res[i].attempted ? solutionHTML(q, QUIZ.answers[i]) : `<div class="solution"><p class="feedback bad">Not attempted. The answer is ${esc(answerText(q))}.</p><ul>${q.explain.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>${q.lab ? `<p class="sol-open"><button class="btn sm" data-openlab="${esc(q.id)}">Open this relation in the lab</button></p>` : q.table ? `<p class="sol-open"><button class="btn sm" data-opentable="${esc(q.id)}">Load this table on the Tables page</button></p>` : ''}</div>`}</article>`).join('')}</div>`;
  $$('#q-review [data-i]').forEach((card) => { const q = QUIZ.qs[Number(card.dataset.i)]; bindOptions(card, q, () => null, () => {}, () => {}); });
  $('#q-again').addEventListener('click', () => { QUIZ.phase = 'setup'; if (QUIZ.origin === 'pyq') location.hash = '#pyq'; else RENDER.quiz(); });
}
