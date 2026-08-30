// verify.mjs — hand-solved ground truth from the project plan's Appendix.
// Run with:  node verify.mjs
// This is the "console-verified against hand-solved examples" step from Section 9.

import { parseInput } from './src/logic/parser.js';
import { getClosure } from './src/logic/closure.js';
import { getCandidateKeys } from './src/logic/keys.js';
import { getMinimalCover } from './src/logic/minimalCover.js';
import { checkNormalForm } from './src/logic/normalForms.js';
import { decomposeTo3NF } from './src/logic/decompose3NF.js';
import { decomposeToBCNF } from './src/logic/decomposeBCNF.js';
import { isLossless, isDependencyPreserving } from './src/logic/properties.js';
import { check4NF, decomposeTo4NF, check5NF } from './src/logic/higherNF.js';
import { fmt, fmtFd } from './src/logic/setOps.js';

let pass = 0;
let fail = 0;
const fails = [];

function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
    console.log(`  ✓ ${label}  →  ${a}`);
  } else {
    fail++;
    fails.push(label);
    console.log(`  ✗ ${label}\n      expected ${e}\n      actual   ${a}`);
  }
}

function keys(rel, deps) {
  const p = parseInput(rel, deps);
  const ck = getCandidateKeys(p.attributes, p.fds);
  return { p, ck };
}
const ckStr = (ck) => ck.candidateKeys.map((k) => k.join('')).sort();

console.log('\n=== Appendix test case 1: R(A,B,C,D)  A→B, B→C, C→D ===');
{
  const { p, ck } = keys('A,B,C,D', 'A->B\nB->C\nC->D');
  check('candidate keys', ckStr(ck), ['A']);
  const nf = checkNormalForm(p.attributes, p.fds, ck.candidateKeys);
  check('highest NF', nf.highestNF, '2NF');
  check('has transitive deps', nf.transitiveDependencies.length > 0, true);
  check('closure of A', getClosure(['A'], p.fds).closure, ['A', 'B', 'C', 'D']);
}

console.log('\n=== Appendix test case 2: R(A,B,C)  AB→C, C→A ===');
{
  const { p, ck } = keys('A,B,C', 'AB->C\nC->A');
  check('candidate keys', ckStr(ck), ['AB', 'BC']);
  const nf = checkNormalForm(p.attributes, p.fds, ck.candidateKeys);
  check('highest NF', nf.highestNF, '3NF');
  check('BCNF violations', nf.bcnfViolations.map((v) => fmtFd(v.fd)), ['C → A']);
}

console.log('\n=== Appendix test case 3: R(A,B,C,D)  AB→C, AB→D ===');
{
  const { p, ck } = keys('A,B,C,D', 'AB->C\nAB->D');
  check('candidate keys', ckStr(ck), ['AB']);
  check('highest NF', checkNormalForm(p.attributes, p.fds, ck.candidateKeys).highestNF, 'BCNF');
}

console.log('\n=== Appendix test case 4: R(A,B,C,D)  A→BCD ===');
{
  const { p, ck } = keys('A,B,C,D', 'A->B,C,D');
  check('candidate keys', ckStr(ck), ['A']);
  check('highest NF', checkNormalForm(p.attributes, p.fds, ck.candidateKeys).highestNF, 'BCNF');
}

console.log('\n=== Appendix test case 5: R(A,B,C,D,E)  A→B, BC→D, E→C ===');
{
  const { p, ck } = keys('A,B,C,D,E', 'A->B\nBC->D\nE->C');
  check('candidate keys', ckStr(ck), ['AE']);
  // NOTE — the project plan's Appendix says "2NF" here. That is an error in the plan.
  // The only candidate key is AE. A is a PROPER subset of it and A → B with B non-prime,
  // so A → B is a textbook partial dependency; E → C is a second one. A relation with a
  // partial dependency is not in 2NF. The correct answer is 1NF.
  // Fix the row in the report before submission — a viva examiner will spot this one.
  const nf5 = checkNormalForm(p.attributes, p.fds, ck.candidateKeys);
  check('highest NF (plan says 2NF — plan is wrong)', nf5.highestNF, '1NF');
  check('two partial dependencies found', nf5.partialDependencies.map((v) => fmtFd(v.fd)), ['A → B', 'E → C']);
}

console.log('\n=== Appendix test case 6: R(A,B)  A→B, B→A ===');
{
  const { p, ck } = keys('A,B', 'A->B\nB->A');
  check('candidate keys', ckStr(ck), ['A', 'B']);
  check('highest NF', checkNormalForm(p.attributes, p.fds, ck.candidateKeys).highestNF, 'BCNF');
}

console.log('\n=== Appendix test case 7: R(A,B,C,D)  A→BC, C→D, D→A  minimal cover ===');
{
  const p = parseInput('A,B,C,D', 'A->B,C\nC->D\nD->A');
  const { cover } = getMinimalCover(p.fds);
  check('minimal cover', cover.map(fmtFd).sort(), ['A → B', 'A → C', 'C → D', 'D → A']);
}

console.log('\n=== Appendix test case 8: R(A,B,C)  A↠B, A↠C  (4NF) ===');
{
  const p = parseInput('A,B,C', 'A->>B\nA->>C');
  const ck = getCandidateKeys(p.attributes, p.fds);
  check('candidate keys', ckStr(ck), ['ABC']);
  check('highest NF (FDs only)', checkNormalForm(p.attributes, p.fds, ck.candidateKeys).highestNF, 'BCNF');
  const r4 = check4NF(p.attributes, p.fds, p.mvds, ck.candidateKeys);
  check('is 4NF', r4.is4NF, false);
  const d4 = decomposeTo4NF(p.attributes, p.fds, p.mvds);
  check('4NF decomposition', d4.relations.map((r) => r.attributes.join('')).sort(), ['AB', 'AC']);
}

console.log('\n=== Appendix test case 9: R(A,B,C,D)  AB→C, C→D, D→A ===');
{
  const { p, ck } = keys('A,B,C,D', 'AB->C\nC->D\nD->A');
  check('candidate keys', ckStr(ck), ['AB', 'BC', 'BD']);
  const nf = checkNormalForm(p.attributes, p.fds, ck.candidateKeys);
  check('highest NF', nf.highestNF, '3NF');
  check('not BCNF', nf.bcnfViolations.length > 0, true);

  const d3 = decomposeTo3NF(p.attributes, p.fds);
  check('3NF synthesis is lossless', d3.lossless, true);
  check('3NF synthesis preserves dependencies', d3.dependencyPreserving, true);

  const db = decomposeToBCNF(p.attributes, p.fds);
  check('BCNF analysis is lossless', db.lossless, true);
  check('BCNF analysis LOSES dependencies', db.dependencyPreserving, false);
  console.log(`      BCNF fragments: ${db.relations.map((r) => fmt(r.attributes)).join(' | ')}`);
  console.log(`      lost FDs: ${db.dependencyDetail.lostFds.map(fmtFd).join(', ')}`);
}

console.log('\n=== Extra: lossless-join classic  R(A,B,C) split into AB and BC with A→B, B→C ===');
{
  const p = parseInput('A,B,C', 'A->B\nB->C');
  const good = isLossless(p.attributes, [{ attributes: ['A', 'B'] }, { attributes: ['B', 'C'] }], p.fds);
  check('AB|BC lossless under A→B,B→C', good.lossless, true);
  const bad = isLossless(p.attributes, [{ attributes: ['A', 'B'] }, { attributes: ['A', 'C'] }], [{ lhs: ['B'], rhs: ['C'] }]);
  check('AB|AC lossy under B→C only', bad.lossless, false);
}

console.log('\n=== Extra: dependency preservation  R(A,B,C) AB→C, C→A split into AC and BC ===');
{
  const p = parseInput('A,B,C', 'AB->C\nC->A');
  const dp = isDependencyPreserving(p.fds, [{ attributes: ['A', 'C'] }, { attributes: ['B', 'C'] }]);
  check('AB→C is lost', dp.lostFds.map(fmtFd), ['AB → C']);
}

console.log('\n=== Extra: 5NF join-dependency check  R(A,B,C) with *(AB,BC,CA) ===');
{
  const p = parseInput('A,B,C', '*(AB, BC, CA)');
  const r5 = check5NF(p.attributes, p.fds, p.jds[0]);
  check('JD does not hold with no FDs (so no violation found)', r5.is5NF, true);
  const p2 = parseInput('A,B,C', 'A->B\nB->C\nC->A\n*(AB, BC, CA)');
  const r5b = check5NF(p2.attributes, p2.fds, p2.jds[0]);
  check('with A→B,B→C,C→A every component is a superkey', r5b.is5NF, true);
}

console.log('\n=== Extra: parser robustness ===');
{
  check('R(...) wrapper', parseInput('R(A, B, C)', '').attributes, ['A', 'B', 'C']);
  check('bare ABCD', parseInput('ABCD', '').attributes, ['A', 'B', 'C', 'D']);
  check('missing arrow is an error', parseInput('A,B', 'A B').errors.length, 1);
  check('undeclared attribute is added', parseInput('A,B', 'A->Z').attributes, ['A', 'B', 'Z']);
  check('long attribute names', parseInput('StudentId, CourseId, Grade', 'StudentId,CourseId -> Grade').fds[0].lhs, ['CourseId', 'StudentId']);
  check('empty relation errors', parseInput('', '').errors.length > 0, true);
  check('single attribute relation', ckStr(getCandidateKeys(['A'], [])), ['A']);
}

console.log('\n=== Extra: edge cases from the Saturday checklist ===');
{
  check('all attributes form one key', ckStr(getCandidateKeys(['A', 'B', 'C'], [])), ['ABC']);
  const dup = parseInput('A,B,C', 'A->B\nA->B');
  check('duplicate FDs collapse in the cover', getMinimalCover(dup.fds).cover.length, 1);
  const selfref = parseInput('A,B', 'A,B->A');
  check('RHS already in LHS is flagged trivial', selfref.warnings.length > 0, true);
  check('trivial FD leaves an empty cover', getMinimalCover(selfref.fds).cover.length, 0);
  const ten = parseInput('A,B,C,D,E,F,G,H,I,J', 'A->B\nB->C\nC->D\nD->E\nE->F\nF->G\nG->H\nH->I\nI->J');
  const t0 = Date.now();
  const tenKeys = getCandidateKeys(ten.attributes, ten.fds);
  check('10-attribute relation key', ckStr(tenKeys), ['A']);
  console.log(`      10-attribute enumeration took ${Date.now() - t0} ms`);
}

console.log(`\n${'='.repeat(60)}\n${pass} passed, ${fail} failed`);
if (fail) {
  console.log('FAILED: ' + fails.join(', '));
  process.exit(1);
}
