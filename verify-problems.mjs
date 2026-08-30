// verify-problems.mjs — Member C's hand-solved answers vs. the engine.
// If these two disagree, one of them is wrong and NOTHING ships until it is settled.

import { PROBLEMS } from './src/content/problems.js';
import { parseInput } from './src/logic/parser.js';
import { getClosure } from './src/logic/closure.js';
import { getCandidateKeys } from './src/logic/keys.js';
import { getMinimalCover } from './src/logic/minimalCover.js';
import { checkNormalForm } from './src/logic/normalForms.js';
import { decomposeTo3NF } from './src/logic/decompose3NF.js';
import { decomposeToBCNF } from './src/logic/decomposeBCNF.js';
import { isLossless, isDependencyPreserving } from './src/logic/properties.js';
import { check4NF } from './src/logic/higherNF.js';
import { fmtFd } from './src/logic/setOps.js';

let pass = 0, fail = 0;
const P = (id) => PROBLEMS.find((p) => p.id === id);
const parse = (p) => parseInput(p.relation, p.deps);
const ck = (p) => { const x = parse(p); return getCandidateKeys(x.attributes, x.fds); };
const nf = (p) => { const x = parse(p); return checkNormalForm(x.attributes, x.fds, ck(p).candidateKeys); };

function t(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : `\n      hand: ${JSON.stringify(expected)}\n      code: ${JSON.stringify(actual)}`}`);
  ok ? pass++ : fail++;
}

console.log('\nCross-checking the 10 practice answers against the engine\n');

// Q1 closure {A,D}+ = ABCDE
{ const p = P(1); const x = parse(p);
  t('Q1 closure {A,D}⁺', getClosure(['A','D'], x.fds).closure.join(''), p.answer[0]); }

// Q2 candidate key = A
{ const p = P(2);
  t('Q2 candidate keys', ck(p).candidateKeys.map(k=>k.join('')), [p.options[p.answer]]); }

// Q3 prime attributes = ABC
{ const p = P(3);
  t('Q3 prime attributes', ck(p).primeAttributes.join(''), p.answer[0]);
  t('Q3 candidate keys are AB, BC', ck(p).candidateKeys.map(k=>k.join('')).sort(), ['AB','BC']); }

// Q4 highest NF = 1NF
{ const p = P(4);
  t('Q4 highest NF', nf(p).highestNF, p.options[p.answer]);
  t('Q4 the partial dependency is A → D', nf(p).partialDependencies.map(v=>fmtFd(v.fd)), ['A → D']); }

// Q5 highest NF = 3NF
{ const p = P(5);
  t('Q5 highest NF', nf(p).highestNF, p.options[p.answer]);
  t('Q5 candidate keys AB, AC', ck(p).candidateKeys.map(k=>k.join('')).sort(), ['AB','AC']);
  t('Q5 BCNF blocked by C → B', nf(p).bcnfViolations.map(v=>fmtFd(v.fd)), ['C → B']); }

// Q6 minimal cover size = 3
{ const p = P(6); const x = parse(p); const { cover } = getMinimalCover(x.fds);
  t('Q6 minimal cover size', String(cover.length), p.options[p.answer]);
  t('Q6 minimal cover contents', cover.map(fmtFd).sort(), ['A → B','A → C','C → D']); }

// Q7 lossless yes
{ const p = P(7); const x = parse(p);
  const r = isLossless(x.attributes, [{attributes:['A','B']},{attributes:['B','C']}], x.fds);
  t('Q7 lossless', r.lossless ? 0 : 1, p.answer); }

// Q8 lost FD = AB → C
{ const p = P(8); const x = parse(p);
  const d = isDependencyPreserving(x.fds, [{attributes:['A','C']},{attributes:['B','C']}]);
  t('Q8 lost dependency', d.lostFds.map(fmtFd), ['AB → C']); }

// Q9 BCNF but not 4NF
{ const p = P(9); const x = parse(p);
  t('Q9 highest FD-based NF', checkNormalForm(x.attributes, x.fds, ck(p).candidateKeys).highestNF, 'BCNF');
  t('Q9 is 4NF', check4NF(x.attributes, x.fds, x.mvds, ck(p).candidateKeys).is4NF, false);
  t('Q9 option index', 2, p.answer); }

// Q10 3NF preserves, BCNF loses AB → C
{ const p = P(10); const x = parse(p);
  const d3 = decomposeTo3NF(x.attributes, x.fds);
  const db = decomposeToBCNF(x.attributes, x.fds);
  t('Q10 3NF preserves dependencies', d3.dependencyPreserving, true);
  t('Q10 3NF lossless', d3.lossless, true);
  t('Q10 BCNF does NOT preserve', db.dependencyPreserving, false);
  t('Q10 BCNF lossless', db.lossless, true);
  t('Q10 BCNF loses AB → C', db.dependencyDetail.lostFds.map(fmtFd), ['AB → C']);
  t('Q10 option index', 1, p.answer); }

// Sanity: every problem is well-formed
for (const p of PROBLEMS) {
  const x = parse(p);
  t(`Q${p.id} parses without errors`, x.errors, []);
  if (p.type === 'mcq') t(`Q${p.id} answer index in range`, p.answer >= 0 && p.answer < p.options.length, true);
  else t(`Q${p.id} has at least one accepted answer`, p.answer.length > 0, true);
  t(`Q${p.id} has hint + explanation`, !!(p.hint && p.explanation), true);
}

console.log(`\n${'='.repeat(60)}\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
