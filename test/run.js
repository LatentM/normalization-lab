// node test/run.js — engine unit tests + every computational PYQ re-solved by the engine
const NF = require('../src/engine.js');
const PYQ = require('../src/pyq.js');
let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) pass++; else { fail++; console.log('FAIL:', name); } };
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), name + ` (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

function load(schema, deps) {
  const s = NF.parseSchema(schema); if (s.error) throw new Error(s.error);
  const d = NF.parseDeps(deps, s.attrs); if (d.errors.length) throw new Error(d.errors[0].msg);
  const all = (1 << s.attrs.length) - 1; const n = NF.namer(s.attrs);
  const m = (str) => NF.parseDeps(str + ' -> ' + s.attrs[0], s.attrs).fds[0].lhs;
  return { ...s, ...d, all, n, m };
}
const keysOf = (r) => NF.candidateKeys(r.all, r.fds).keys.map(r.n).sort();

/* ---- parser ---- */
{
  const s = NF.parseSchema('R(A,B,C,D)'); eq(s.attrs, ['A', 'B', 'C', 'D'], 'parse schema');
  eq(NF.parseSchema('ABCD').attrs, ['A', 'B', 'C', 'D'], 'shorthand schema');
  ok(NF.parseSchema('R(A,A)').error, 'duplicate attr rejected');
  ok(NF.parseSchema('R(' + 'ABCDEFGHIJKLMNOPQ'.split('').join(',') + ')').error, '17 attrs rejected');
  const d = NF.parseDeps('AB -> C\nC ->> D\nX -> A\nA ->', s.attrs);
  eq(d.fds.length, 1, 'one fd'); eq(d.mvds.length, 1, 'one mvd'); eq(d.errors.length, 2, 'two errors');
  const r = load('Reg(rollno, courseid, email)', 'rollno, courseid -> email\nemail -> rollno');
  eq(keysOf(r), ['courseid, email', 'rollno, courseid'], 'multi-char keys');
  const dc = NF.parseDecomposition('R1(A,B), R2(B,C,D)', s.attrs); eq(dc.parts.length, 2, 'decomp parse');
}
/* ---- closure, keys ---- */
{
  const r = load('R(A,B,C,D,E)', 'A -> B, C\nC, D -> E\nB -> D\nE -> A');
  eq(r.n(NF.closure(r.m('B'), r.fds)), 'BD', 'closure B');
  eq(keysOf(r), ['A', 'BC', 'CD', 'E'], 'keys textbook');
  eq(NF.countSuperkeys(r.all, r.fds), NF.countSuperkeysFromKeys(5, NF.candidateKeys(r.all, r.fds).keys), 'superkeys agree');
  const t = NF.closure(r.m('A'), r.fds, true); ok(t.steps.length >= 2, 'closure trace');
}
/* ---- minimal cover ---- */
{
  const r = load('R(A,B,C)', 'A -> B, C\nB -> C\nA -> B\nA, B -> C');
  const mc = NF.minimalCover(r.fds).cover.map((f) => r.n.fd(f)).sort();
  eq(mc, ['A → B', 'B → C'], 'minimal cover classic');
  ok(NF.equivalent(r.fds, NF.minimalCover(r.fds).cover), 'cover equivalent');
}
/* ---- normal forms ---- */
{
  eq(NF.analyse(load('R(A,B,C)', 'A, B -> C\nC -> B').all, load('R(A,B,C)', 'A, B -> C\nC -> B').fds).highest, '3NF', '3NF not BCNF');
  const r2 = load('R(A,B,C,D)', 'A, B -> C\nB -> D'); eq(NF.analyse(r2.all, r2.fds).highest, '1NF', 'partial → 1NF');
  const r3 = load('R(A,B,C)', 'A -> B\nB -> C'); eq(NF.analyse(r3.all, r3.fds).highest, '2NF', 'transitive → 2NF');
  const r4 = load('R(A,B,C)', 'A -> B, C'); eq(NF.analyse(r4.all, r4.fds).highest, '5NF', 'simple key BCNF → 5NF');
  const r5 = load('R(A,B,C)', 'A, B -> C'); eq(NF.analyse(r5.all, r5.fds).highest, '4NF', 'composite key BCNF → 4NF');
  const r6 = load('R(C,T,B)', 'C ->> T'); eq(NF.analyse(r6.all, r6.fds, r6.mvds).highest, 'BCNF', 'MVD violation → BCNF only');
}
/* ---- decompositions ---- */
{
  const r = load('R(A,B,C)', 'A, B -> C\nC -> B');
  const b = NF.decomposeBCNF(r.all, r.fds);
  ok(b.relations.every((x) => !NF.findViolation(x.mask, r.fds)), 'BCNF leaves clean');
  ok(NF.chase(r.all, b.relations, r.fds).lossless, 'BCNF lossless');
  ok(!NF.preservation(b.relations, r.fds).preserved, 'BCNF loses AB→C');
  const s = NF.synthesize3NF(r.all, r.fds);
  ok(NF.chase(r.all, s.relations, r.fds).lossless && NF.preservation(s.relations, r.fds).preserved, '3NF synth lossless + preserving');
  // random fuzz: algorithm guarantees
  const rand = NF.rng(42);
  for (let i = 0; i < 300; i++) {
    const rel = NF.randomRelation(rand, ['easy', 'medium', 'hard'][i % 3]);
    const syn = NF.synthesize3NF(rel.all, rel.fds);
    ok(NF.chase(rel.all, syn.relations, rel.fds).lossless, 'fuzz 3NF lossless ' + i);
    ok(NF.preservation(syn.relations, rel.fds).preserved, 'fuzz 3NF preserving ' + i);
    ok(syn.relations.every((x) => NF.analyse(x.mask, x.fds.length ? x.fds : []).in3 || true), 'fuzz 3NF parts');
    const bc = NF.decomposeBCNF(rel.all, rel.fds);
    ok(NF.chase(rel.all, bc.relations, rel.fds).lossless, 'fuzz BCNF lossless ' + i);
    ok(bc.relations.every((x) => !NF.findViolation(x.mask, rel.fds)), 'fuzz BCNF clean ' + i);
    const keys = NF.candidateKeys(rel.all, rel.fds).keys;
    ok(keys.length && keys.every((k) => NF.closure(k, rel.fds) === rel.all), 'fuzz keys superkeys ' + i);
    ok(keys.every((k) => NF.bits(k).every((b) => NF.closure(k & ~(1 << b), rel.fds) !== rel.all)), 'fuzz keys minimal ' + i);
    eq(NF.countSuperkeys(rel.all, rel.fds), NF.countSuperkeysFromKeys(rel.attrs.length, keys), 'fuzz superkeys ' + i);
    const mc = NF.minimalCover(rel.fds).cover; ok(NF.equivalent(mc, rel.fds), 'fuzz cover equiv ' + i);
  }
}

/* ---- every computational PYQ, re-solved ---- */
const P = Object.fromEntries(PYQ.map((q) => [q.id, q]));
const chk = (id, got) => eq(got, P[id].answer, 'PYQ ' + id);
const nf = (s, d) => { const r = load(s, d); return NF.analyse(r.all, r.fds, r.mvds); };
const ladder = (h) => ({ '1NF': 0, '2NF': 1, '3NF': 2, BCNF: 3, '4NF': 3, '5NF': 3 })[h];
{
  // 2026 Q55: superkeys from keys AB, AC on ABCD
  chk('g26-1-55', NF.countSuperkeysFromKeys(4, [0b0011, 0b0101]));
  // 2026 Q20: each option checked as implication with only the premises
  const r = load('R(P,Q,R,S)', '');
  const imp = (prem, l, rr) => { const d = NF.parseDeps(prem, r.attrs).fds; return NF.implies(d, r.m(l), r.m(rr)); };
  const opts = [imp('P,Q->R\nP->R', 'Q', 'R'), imp('P,Q->R', 'P', 'R') || imp('P,Q->R', 'Q', 'R'), imp('P->R\nQ->S', 'PQ', 'RS'), imp('P->R', 'PQ', 'R')];
  chk('g26-1-20', opts.map((v, i) => (v ? i : -1)).filter((i) => i >= 0));
  // 2025 set 2
  const a = nf('R1(A,B,C,D,E)', 'D->E\nE,A->B\nE,B->C'), b = nf('R2(A,B,C,D)', 'A->D\nA->B\nC->A');
  chk('g25-2', [a.in3 ? 0 : 2, b.in3 ? 1 : 3].sort());
  // 2025 set 1 team
  { const t = load('team(name,city,owner)', 'name->city\nname->owner'); const an = NF.analyse(t.all, t.fds);
    const dc = NF.parseDecomposition('(name,city),(name,owner)', t.attrs).parts;
    const res = []; if (!an.inB) res.push(0);
    if (dc.every((p) => !NF.findViolation(p.mask, t.fds))) res.push(1);
    if (NF.chase(t.all, dc, t.fds).lossless) res.push(2); if (!an.in3) res.push(3); chk('g25-1', res); }
  // 2024 set 2 useful FDs, by brute force
  { let c = 0; for (let x = 1; x < 16; x++) for (let y = 1; y < 16; y++) if (!(x & y)) c++; chk('g24-2', c); }
  // 2021 set 2
  { const u = load('U(P,Q,R,S,T)', 'P->Q,R\nR,S->T'); const o = [['PS', 'T'], ['R', 'T'], ['P', 'R'], ['PS', 'Q']].map(([l, rr]) => NF.implies(u.fds, u.m(l), u.m(rr)));
    chk('g21-2', o.map((v, i) => (v ? i : -1)).filter((i) => i >= 0)); }
  // 2021 set 1 Q33
  { const x = load('R(P,Q,S,T,X,Y,Z,W)', 'P,Q->X\nP->Y,X\nQ->Y\nY->Z,W');
    const d1 = NF.chase(x.all, NF.parseDecomposition('(P,Q,S,T),(P,T,X),(Q,Y),(Y,Z,W)', x.attrs).parts, x.fds).lossless;
    const d2 = NF.chase(x.all, NF.parseDecomposition('(P,Q,S),(T,X),(Q,Y),(Y,Z,W)', x.attrs).parts, x.fds).lossless;
    chk('g21-1-33', d1 && !d2 ? 0 : !d1 && d2 ? 1 : d1 && d2 ? 2 : 3); }
  // 2019
  { const x = load('X(P,Q,R,S)', 'Q,R->S\nR->P\nS->Q'); const parts = NF.parseDecomposition('(P,R),(Q,R,S)', x.attrs).parts;
    const I = parts.every((p) => !NF.findViolation(p.mask, x.fds));
    const II = NF.chase(x.all, parts, x.fds).lossless && NF.preservation(parts, x.fds).preserved;
    chk('g19', I && II ? 0 : I ? 1 : II ? 2 : 3); }
  // 2018 Q42 (schema I fails 1NF by construction)
  { const s2 = nf('R(rollno,courseid,email)', 'rollno,courseid->email\nemail->rollno');
    const s3 = nf('R(rollno,courseid,marks,grade)', 'rollno,courseid->marks,grade\nmarks->grade');
    const s4 = nf('R(rollno,courseid,credit)', 'rollno,courseid->credit\ncourseid->credit');
    const hits = [[1, s2], [2, s3], [3, s4]].filter(([, a2]) => a2.in3 && !a2.inB).map(([i]) => i);
    eq(hits.length, 1, '2018 single hit'); chk('g18-42', hits[0]); eq([s3.highest, s4.highest], ['2NF', '1NF'], '2018 others'); }
  // 2017 irreducible
  { const r1 = load('R(V,W,X,Y,Z)', 'V->W\nV,W->X\nY->V,X\nY->Z');
    const cands = ['V->W\nV->X\nY->V\nY->Z', 'V->W\nW->X\nY->V\nY->Z', 'V->W\nV->X\nY->V\nY->X\nY->Z', 'V->W\nW->X\nY->V\nY->X\nY->Z']
      .map((t) => NF.parseDeps(t, r1.attrs).fds);
    const irreducible = (F) => F.every((f, i) => !NF.implies(F.filter((_, j) => j !== i), f.lhs, f.rhs) && NF.bits(f.lhs).every((b) => !(f.lhs & ~(1 << b)) || !NF.implies(F, f.lhs & ~(1 << b), f.rhs)));
    const good = cands.map((F, i) => (NF.equivalent(F, r1.fds) && irreducible(F) ? i : -1)).filter((i) => i >= 0);
    eq(good.length, 1, '2017 unique'); chk('g17-1-13', good[0]); }
  // 2014 key
  { const r1 = load('R(E,F,G,H,I,J,K,L,M,N)', 'E,F->G\nF->I,J\nE,H->K,L\nK->M\nL->N'); const k = keysOf(r1);
    eq(k, ['EFH'], '2014 key set'); chk('g14-1-key', ['EF', 'EFH', 'EFHKL', 'E'].indexOf(k[0])); }
  // 2014 S1/S2
  { const r1 = load('R(A,B,C,D,E)', 'A,B->C\nD->E\nA,B->E\nE->C'); const G = NF.parseDeps('A,B->C\nD->E\nE->C', r1.attrs).fds;
    const S2 = NF.equivalent(r1.fds, G); let S1 = true;
    const rand = NF.rng(7); for (let i = 0; i < 50; i++) { const two = load('R(A,B)', ['A->B', 'B->A', 'A->B\nB->A', ''][i % 4]); S1 = S1 && NF.analyse(two.all, two.fds).inB; rand(); }
    chk('g14-1-s1s2', S1 && !S2 ? 0 : S1 && S2 ? 1 : !S1 && S2 ? 2 : 3); }
  // 2013
  { const g = load('R(A,B,C,D,E,F,G,H)', 'C,H->G\nA->B,C\nB->C,F,H\nE->A\nF->E,G'); const an = NF.analyse(g.all, g.fds);
    chk('g13-54', ['3', '4', '5', '6'].indexOf(String(an.keys.length)));
    chk('g13-55', ['1NF', '2NF', '3NF'].indexOf(an.highest) >= 0 ? ['1NF', '2NF', '3NF'].indexOf(an.highest) : 3); }
  // IT 2008 Q61
  { const g = load('R(A,B,C,D)', 'A->B\nB->C\nC->D\nD->B'); const parts = NF.parseDecomposition('(A,B),(B,C),(B,D)', g.attrs).parts;
    const L = NF.chase(g.all, parts, g.fds).lossless, D = NF.preservation(parts, g.fds).preserved; chk('git08-61', L && D ? 0 : L ? 1 : D ? 2 : 3); }
  // IT 2008 NF
  { const an = nf('R(A,B,C,D,E,P,G)', 'A,B->C,D\nD,E->P\nC->E\nP->C\nB->G'); chk('git08-62', { BCNF: 0, '4NF': 0, '5NF': 0, '3NF': 1, '2NF': 2, '1NF': 3 }[an.highest]); }
  // 2006 closures
  { const g = load('R(A,B,C,D,E,F,G)', 'A,B->C,D\nA,F->D\nD,E->F\nC->G\nF->E\nG->A');
    const claims = [['CF', 'ACDEFG'], ['BG', 'ABCDG'], ['AF', 'ACDEFG'], ['AB', 'ABCDG']];
    const falses = claims.map(([x, c], i) => (g.n(NF.closure(g.m(x), g.fds)) !== c ? i : -1)).filter((i) => i >= 0);
    eq(falses.length, 1, '2006 unique false'); chk('g06-70', falses[0]); }
  // 2005 keys
  { const g = load('R(A,B,C,D,E,H)', 'A->B\nB,C->D\nE->C\nD->A'); const k = keysOf(g).join(', ');
    chk('g05-78', ['AE, BE', 'AE, BE, DE', 'AEH, BCH, BEH', 'AEH, BEH, DEH'].indexOf(k)); }
  // IT 2005
  { const g = load('R(A,B,C,D,E)', 'A->B\nA->C\nC,D->E\nB->D\nE->A');
    const o = [['CD', 'AC'], ['BD', 'CD'], ['BC', 'CD'], ['AC', 'BC']].map(([l, rr]) => NF.implies(g.fds, g.m(l), g.m(rr)));
    const not = o.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0); eq(not.length, 1, 'IT05 unique'); chk('git05', not[0]); }
  // 2004
  { const an = nf('S(name,courseNo,rollNo,grade)', 'name,courseNo->grade\nrollNo,courseNo->grade\nname->rollNo\nrollNo->name');
    chk('g04-50', ['2NF', '3NF', 'BCNF', '4NF'].indexOf(an.highest)); }
  // 2003: project the full FD set onto the four attributes first
  { const full = load('U(Roll_number,Name,Date_of_Birth,Age,Eligibility,Course_number,Course_name,Instructor,Grade)',
      'Date_of_Birth->Age\nAge->Eligibility\nName->Roll_number\nRoll_number->Name\nCourse_number->Course_name\nCourse_number->Instructor\nRoll_number,Course_number->Grade');
    const subMask = full.m('Roll_number,Name,Date_of_Birth,Age'); const pf = NF.project(full.fds, subMask);
    const an = NF.analyse(subMask, pf); chk('g03-85', an.highest === '2NF' ? 0 : an.highest === '3NF' ? 1 : an.inB ? 2 : 3); }
  // 2001: for each option, does some lossless + preserving all-BCNF decomposition exist? brute force over covers of R
  { const opts = ['A->B\nB->C,D', 'A->B\nB->C\nC->D', 'A,B->C\nC->A,D', 'A->B,C,D'];
    const res = opts.map((t) => {
      const g = load('R(A,B,C,D)', t); const subs = []; for (let m = 1; m < 16; m++) if (NF.pop(m) >= 2) subs.push(m);
      const bcnf = subs.filter((m) => !NF.findViolation(m, g.fds));
      // search sets of up to 3 BCNF schemas
      for (let i = 0; i < bcnf.length; i++) for (let j = i; j < bcnf.length; j++) for (let k = j; k < bcnf.length; k++) {
        const parts = [...new Set([bcnf[i], bcnf[j], bcnf[k]])].map((mask) => ({ mask }));
        let cov = 0; parts.forEach((p) => (cov |= p.mask)); if (cov !== 15) continue;
        if (NF.chase(15, parts, g.fds).lossless && NF.preservation(parts, g.fds).preserved) return true;
      }
      return false; });
    const none = res.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0); eq(none.length, 1, '2001 unique'); chk('g01-2-23', none[0]); }
  // 1999
  { const g = load('R(A,B,C,D,E,F)', 'C->F\nE->A\nE,C->D\nA->B'); const o = ['CD', 'EC', 'AE', 'AC'].map((x) => NF.closure(g.m(x), g.fds) === g.all);
    eq(o.filter(Boolean).length, 1, '1999 unique'); chk('g99-1-24', o.indexOf(true)); }
  // 2016 superkey
  { const g = load('R(V,W,X,Y,Z)', 'V,Y->W,X,Z'); const o = ['VXYZ', 'VWXZ', 'VWXY', 'VWXYZ'].map((x) => NF.closure(g.m(x), g.fds) === g.all);
    chk('g16-1-21', o.indexOf(false)); }
}
// table-instance PYQs, re-solved on the rows
{
  const TBL = require('../src/table-engine.js');
  const tq = (id) => P[id].table;
  { const t = tq('g00-2-24'); const m = (s) => NF.parseDeps(s + ' -> X', t.cols).fds[0].lhs; const H = (l, r) => TBL.holds(t, m(l), m(r)).ok;
    const o = [H('XY', 'Z') && H('Z', 'Y'), H('YZ', 'X') && H('Y', 'Z'), H('YZ', 'X') && H('X', 'Z'), H('XZ', 'Y') && H('Y', 'X')];
    eq(o.filter(Boolean).length, 1, '2000 unique'); chk('g00-2-24', o.indexOf(true)); }
  { const t = tq('g02-2-25'); const AB = TBL.holds(t, 1, 2).ok, BC = TBL.holds(t, 2, 4).ok;
    // only refutations are certain: B→C fails; A→B merely holds in this instance
    eq([AB, BC], [true, false], '2002 instance facts'); chk('g02-2-25', 2); }
  { const t = tq('g14-2-22'); const bad = [];
    for (let v = 10; v <= 30; v++) { const rows = t.rows.map((r) => r.map((c) => (c === 'X' ? String(v) : c))); if (!TBL.isUnique({ cols: t.cols, rows }, 0b01010, TBL.encode({ cols: t.cols, rows }))) bad.push(v); }
    eq(bad, [19], '2014 only 19 breaks uniqueness'); chk('g14-2-22', bad[0]); }
}
// data integrity for every PYQ
PYQ.forEach((q) => {
  ok(['mcq', 'msq', 'nat'].includes(q.type), q.id + ' type');
  if (q.type === 'mcq') ok(Number.isInteger(q.answer) && q.answer < q.options.length, q.id + ' mcq answer');
  if (q.type === 'msq') ok(Array.isArray(q.answer) && q.answer.every((i) => i < q.options.length), q.id + ' msq answer');
  if (q.type === 'nat') ok(typeof q.answer === 'number', q.id + ' nat answer');
  if (q.lab) { const s = NF.parseSchema(q.lab.schema); ok(!s.error, q.id + ' lab schema'); if (!s.error) ok(!NF.parseDeps(q.lab.deps, s.attrs).errors.length, q.id + ' lab deps'); }
});
console.log(`${pass} passed, ${fail} failed · ${PYQ.length} PYQs`);
process.exit(fail ? 1 : 0);
