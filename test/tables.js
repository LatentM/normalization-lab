// node test/tables.js — table engine: parsing, 1NF, discovery, stages, rejoin, SQL
const NF = require('../src/engine.js');
const TBL = require('../src/table-engine.js');
const EX = require('../src/table-examples.js');
let pass = 0, fail = 0;
const ok = (c, name) => { if (c) pass++; else { fail++; console.log('FAIL:', name); } };
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), `${name} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

/* parsing */
{
  const p = TBL.parseDelimited('a,b\n1,"x, y"\n2,z'); eq(p.cols, ['a', 'b'], 'csv header'); eq(p.rows[0], ['1', 'x, y'], 'quoted comma');
  eq(TBL.parseDelimited('a\tb\n1\t2').delimiter, 'tab', 'tsv');
  const md = TBL.parseDelimited('| A | B |\n|---|---|\n| 1 | 2 |\n| 3 |  |'); eq(md.cols, ['A', 'B'], 'markdown header'); eq(md.rows[1], ['3', null], 'markdown empty→null');
  ok(TBL.parseDelimited('').error, 'empty error'); ok(TBL.parseDelimited('justone\nrow').error, 'no delimiter error');
  const ml = TBL.parseDelimited('a,b\n1,"line1\nline2"'); eq(ml.rows[0][1], 'line1\nline2', 'multiline quoted cell');
  eq(TBL.sanitizeNames(['Reg No', 'name', 'name', '2col']).names, ['Reg_No', 'name', 'name_2', 'c_2col'], 'sanitize');
}
/* instance FD checks: GATE 2000 2.24 and 2002 2.25 */
{
  const t = { cols: ['X', 'Y', 'Z'], rows: [['1', '4', '2'], ['1', '5', '3'], ['1', '6', '3'], ['3', '2', '2']] };
  const h = (l, r) => TBL.holds(t, l, r).ok; // X=1,Y=2,Z=4
  ok(h(0b110, 0b001) && h(0b010, 0b100), 'YZ→X and Y→Z hold'); ok(!h(0b100, 0b010), 'Z→Y fails'); ok(!h(0b001, 0b100), 'X→Z fails'); ok(!h(0b101, 0b010), 'XZ→Y fails');
  eq(TBL.minimalUniques(t).map((m) => m), [2], 'Y is the only minimal unique');
}
/* every example: 1NF, discovery, stages, rejoin, SQL */
EX.forEach((ex) => {
  const p = TBL.parseDelimited(ex.csv); const names = TBL.sanitizeNames(p.cols).names;
  const raw = { name: ex.name, cols: names, rows: p.rows };
  const det = TBL.detect1NF(raw);
  const r1 = TBL.apply1NF(raw, det, { groups: det.groups.map((_, i) => i), multi: det.multi.map((m) => ({ col: raw.cols[m.col], sep: m.sep })) });
  const t = r1.table; const m = t.cols.length; const all = (1 << m) - 1;
  ok(m >= 2 && m <= 16, ex.id + ' column count');
  const D = TBL.discover(t);
  const mask = (s) => NF.parseDeps(s + ' -> ' + t.cols[0], t.cols).fds[0].lhs;
  // intended dependencies must hold in the data
  const F = NF.parseDeps(ex.fds.join('\n'), t.cols).fds; ok(F.length === ex.fds.length, ex.id + ' fds parse');
  F.forEach((f) => ok(TBL.holds(t, f.lhs, f.rhs, D.enc).ok, ex.id + ' intended FD holds ' + JSON.stringify(f)));
  const pk = ex.pk ? mask(ex.pk) : 0; if (pk) { ok(TBL.isUnique(t, pk, D.enc), ex.id + ' pk unique'); ok(D.uniques.includes(pk), ex.id + ' pk among minimal uniques'); }
  // defaults from the heuristic imply the intended set (for examples with id-like columns)
  const Fall = pk ? F.concat([{ lhs: pk, rhs: all }]) : F;
  const mvds = r1.mvCols.length ? (() => { const mv = r1.mvCols.reduce((a, c) => a | (1 << t.cols.indexOf(c)), 0); const S = all & ~mv; const kS = NF.candidateKeys(S, NF.project(Fall, S)).keys[0]; return NF.bits(mv).map((b) => ({ lhs: kS, rhs: 1 << b })); })() : [];
  const { A, S } = TBL.stages(all, Fall, mvds);
  Object.entries(S).forEach(([stage, rels]) => {
    const parts = rels.map((r) => TBL.project(t, r.mask));
    ok(NF.chase(all, rels, Fall, mvds).lossless, `${ex.id} ${stage} lossless (chase)`);
    const J = TBL.naturalJoin(parts.slice().sort((a, b) => b.idx.length - a.idx.length), m);
    ok(!J.tooBig && TBL.compareRows(t.rows, J.rows).same, `${ex.id} ${stage} rejoin equals 1NF table`);
    rels.forEach((r) => { const pf = NF.project(Fall, r.mask); const an = NF.analyse(r.mask, pf); ok(TBL.keyDuplicates(TBL.project(t, r.mask).rows, NF.bits(an.keys[0]).map((b) => NF.bits(r.mask).indexOf(b))).length === 0, `${ex.id} ${stage} keys unique in data`); });
  });
  const last = S['4NF'] || S.BCNF;
  last.forEach((r) => { const an = NF.analyse(r.mask, NF.project(Fall, r.mask)); ok(an.inB, `${ex.id} final table in BCNF`); });
  // SQL
  const types = t.cols.map((c, j) => TBL.inferType(t.rows.map((r) => r[j]), c));
  const tables = last.map((r, i) => { const pf = NF.project(Fall, r.mask); const an = NF.analyse(r.mask, pf); const P = TBL.project(t, r.mask); return { name: 'T' + i, cols: P.idx, rows: P.rows, pk: NF.bits(an.keys[0]), uniques: [], fks: [] }; });
  Object.keys(TBL.DIALECTS).forEach((d) => { const sql = TBL.sqlScript(d, t.cols, types, tables, { drop: true }); ok((sql.match(/CREATE TABLE/g) || []).length === tables.length, `${ex.id} ${d} create count`); ok(!/undefined/.test(sql), `${ex.id} ${d} no undefined`); });
  if (ex.id === 'reg') { eq(A.highest, '1NF', 'reg highest'); eq(S.BCNF.length, 4, 'reg BCNF tables'); eq(S['2NF'].length, 3, 'reg 2NF tables');
    const def = D.fds.filter((f) => f.def).map((f) => ({ lhs: f.lhs, rhs: f.rhs })).concat([{ lhs: D.pk, rhs: all }]);
    ok(NF.equivalent(def, Fall), 'reg heuristic defaults equal intended'); eq(D.pk, pk, 'reg default pk'); }
  if (ex.id === 'clubs') { eq(r1.mvCols, ['phone', 'club'], 'clubs mv cols'); eq(t.rows.length, 4 + 6 + 1 + 2 + 0 , 'clubs flattened rows'); eq(S['4NF'].length, 3, 'clubs 4NF tables'); eq(S.BCNF.length, 2, 'clubs BCNF tables'); }
  if (ex.id === 'groups') { eq(t.cols, ['rollno', 'name', 'section', 'course', 'grade'], 'groups folded'); eq(t.rows.length, 8, 'groups rows (dup removed)'); ok(r1.log.some((l) => l.kind === 'dupes'), 'groups dupes logged'); }
  if (ex.id === 'teach') { eq(A.highest, '3NF', 'teach 3NF'); ok(!NF.preservation(S.BCNF, Fall).preserved, 'teach BCNF loses dependency'); }
  if (ex.id === 'orders') { eq(S.BCNF.length, 5, 'orders BCNF tables'); eq(types[t.cols.indexOf('unit_price')].kind, 'decimal', 'price decimal'); eq(types[t.cols.indexOf('order_date')].kind, 'date', 'date type'); eq(types[t.cols.indexOf('pincode')].kind, 'text', 'pincode text'); }
});
/* redundancy + lossy join detection */
{
  const t = { cols: ['A', 'B', 'C'], rows: [['1', 'x', 'p'], ['2', 'x', 'q'], ['3', 'y', 'p']] };
  const parts = [TBL.project(t, 0b011), TBL.project(t, 0b110)];
  const J = TBL.naturalJoin(parts, 3); const c = TBL.compareRows(t.rows, J.rows);
  ok(!c.same && c.spurious.length === 2, 'lossy split creates spurious rows');
  eq(TBL.redundantCells({ cols: ['r', 'h'], rows: [['1', 'A'], ['1', 'A'], ['2', 'B']] }, { lhs: 1, rhs: 2 }).length, 1, 'redundant cell count');
}
/* built-in file writers (zip, xlsx): no internet needed for exports */
{
  const FILES = require('../src/files.js');
  eq(FILES.crc32(new TextEncoder().encode('123456789')), 0xcbf43926, 'crc32 check value');
  const z = Buffer.from(FILES.zip([{ name: 'a.csv', data: 'x,y\n1,2\n' }, { name: 'b.csv', data: 'ä' }]));
  ok(z.readUInt32LE(0) === 0x04034b50, 'zip local header'); ok(z.readUInt32LE(z.length - 22) === 0x06054b50, 'zip end record');
  eq(z.readUInt16LE(z.length - 12), 2, 'zip entry count');
  eq(FILES.sheetNames(['A/B', 'a/b', 'x'.repeat(40)]), ['A_B', 'a_b_2', 'x'.repeat(31)], 'sheet names safe and unique');
  const x = Buffer.from(FILES.xlsx([{ name: 'T', cols: ['pin', 'n', 'name'], rows: [['600127', '3', 'R&D <x>'], ['0123', null, '']] }])).toString('latin1');
  ok(x.includes('<v>600127</v>') && x.includes('<v>3</v>'), 'xlsx numbers as numbers');
  ok(x.includes('<t xml:space="preserve">0123</t>'), 'xlsx leading-zero code stays text');
  ok(x.includes('R&amp;D &lt;x&gt;'), 'xlsx escapes text');
  if (process.env.WRITE_SAMPLES) { const fs = require('fs'); fs.writeFileSync(process.env.WRITE_SAMPLES + '/sample.xlsx', FILES.xlsx([{ name: 'Student', cols: ['regno', 'name'], rows: [['25BCE1001', 'Arjun'], ['25BCE1002', 'Meera']] }, { name: 'Pin', cols: ['pincode', 'city'], rows: [['600127', 'Chennai']] }])); fs.writeFileSync(process.env.WRITE_SAMPLES + '/sample.zip', FILES.zip([{ name: 'a.csv', data: 'x,y\n1,2\n' }, { name: 'b.csv', data: 'ä' }])); }
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
