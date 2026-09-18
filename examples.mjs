import { parseInput } from './src/logic/parser.js';
import { getCandidateKeys } from './src/logic/keys.js';
import { getMinimalCover } from './src/logic/minimalCover.js';
import { checkNormalForm } from './src/logic/normalForms.js';
import { decomposeTo3NF } from './src/logic/decompose3NF.js';
import { decomposeToBCNF } from './src/logic/decomposeBCNF.js';
import { check4NF, decomposeTo4NF, check5NF } from './src/logic/higherNF.js';
import { fmt, fmtFd } from './src/logic/setOps.js';

const CASES = [
  ['T1  Student-Subject-Teacher (the canonical 3NF-not-BCNF)','S,J,T','S,J -> T\nT -> J'],
  ['T2  Bank: branch chain','AcctNo,CustId,CustName,BranchId,BranchCity,Balance',
   'AcctNo -> BranchId, Balance\nCustId -> CustName\nBranchId -> BranchCity\nAcctNo, CustId -> Balance'],
  ['T3  Library loans','BookId,Title,AuthorId,AuthorName,MemberId,MemberName,DueDate',
   'BookId -> Title, AuthorId\nAuthorId -> AuthorName\nMemberId -> MemberName\nBookId, MemberId -> DueDate'],
  ['T4  Hospital: doctor/dept transitive','PatientId,PatientName,DoctorId,DoctorName,DeptId,DeptName',
   'PatientId -> PatientName, DoctorId\nDoctorId -> DoctorName, DeptId\nDeptId -> DeptName'],
  ['T5  Overlapping composite keys','A,B,C,D','A,B -> C\nC -> B\nB,D -> A'],
  ['T6  Cyclic FDs (all attributes prime)','A,B,C','A -> B\nB -> C\nC -> A'],
  ['T7  Two disjoint chains','A,B,C,D,E,F','A -> B\nB -> C\nD -> E\nE -> F'],
  ['T8  Extraneous LHS attribute','A,B,C,D','A -> B\nA,B -> C\nC -> D'],
  ['T9  Redundant FD (transitivity)','A,B,C','A -> B\nB -> C\nA -> C'],
  ['T10 Everything determined by one attr','A,B,C,D,E','A -> B,C,D,E'],
  ['T11 No FDs at all','A,B,C',''],
  ['T12 Only trivial FDs','A,B,C','A,B -> A\nB -> B'],
  ['T13 Two candidate keys, disjoint','A,B,C,D','A -> B,C,D\nB -> A,C,D'],
  ['T14 2NF violation, composite key','StudId,CourseId,Grade,StudName',
   'StudId, CourseId -> Grade\nStudId -> StudName'],
  ['T15 BCNF loses two FDs','A,B,C,D,E','A,B -> C\nC -> D\nD -> A\nD -> E'],
  ['T16 MVD: lecturer courses x phones','Name,Course,Phone','Name ->> Course\nName ->> Phone'],
  ['T17 MVD plus an FD','Emp,Skill,Dept','Emp -> Dept\nEmp ->> Skill'],
  ['T18 Trivial MVD (should NOT violate)','A,B','A ->> B'],
  ['T19 5NF: supplier-part-project JD','Supplier,Part,Project','*(Supplier Part, Part Project, Supplier Project)'],
  ['T20 JD implied by keys','A,B,C','A -> B,C\n*(A B, A C)'],
  ['T21 Long attribute names + spaces','Order_Id, Product_Id, Qty, Unit_Price',
   'Order_Id, Product_Id -> Qty\nProduct_Id -> Unit_Price'],
  ['T22 8 attributes, deep chain','A,B,C,D,E,F,G,H','A -> B\nB -> C\nC -> D\nD -> E\nE -> F\nF -> G\nG -> H'],
];

for (const [label, rel, deps] of CASES) {
  const p = parseInput(rel, deps);
  console.log('\n' + '='.repeat(78));
  console.log(label);
  console.log('  R(' + rel + ')');
  deps.split('\n').filter(Boolean).forEach(d => console.log('    ' + d));
  if (p.errors.length) { console.log('  ERRORS: ' + p.errors.join(' | ')); continue; }
  const k = getCandidateKeys(p.attributes, p.fds);
  console.log('  CK        : ' + (k.candidateKeys.map(fmt).join('  |  ') || '(none)'));
  console.log('  prime     : ' + (fmt(k.primeAttributes)) + '   non-prime: ' + (fmt(k.nonPrimeAttributes) || '(none)'));
  const nf = checkNormalForm(p.attributes, p.fds, k.candidateKeys);
  console.log('  highest NF: ' + nf.highestNF);
  if (nf.partialDependencies.length) console.log('    partial   : ' + nf.partialDependencies.map(v=>fmtFd(v.fd)).join(', '));
  if (nf.transitiveDependencies.length) console.log('    transitive: ' + nf.transitiveDependencies.map(v=>fmtFd(v.fd)).join(', '));
  if (nf.bcnfViolations.length) console.log('    bcnf viol : ' + nf.bcnfViolations.map(v=>fmtFd(v.fd)).join(', '));
  if (p.fds.length) {
    console.log('  min cover : ' + (getMinimalCover(p.fds).cover.map(fmtFd).join(';  ') || '(empty)'));
    const d3 = decomposeTo3NF(p.attributes, p.fds);
    const db = decomposeToBCNF(p.attributes, p.fds);
    console.log('  3NF       : ' + d3.relations.map(r=>'('+r.attributes.join(',')+')').join(' ') +
      `   lossless=${d3.lossless} preserving=${d3.dependencyPreserving}`);
    console.log('  BCNF      : ' + db.relations.map(r=>'('+r.attributes.join(',')+')').join(' ') +
      `   lossless=${db.lossless} preserving=${db.dependencyPreserving}` +
      (db.dependencyDetail.lostFds.length ? '  LOST: ' + db.dependencyDetail.lostFds.map(fmtFd).join(', ') : ''));
  }
  if (p.mvds.length) {
    const r4 = check4NF(p.attributes, p.fds, p.mvds, k.candidateKeys);
    console.log('  4NF       : ' + (r4.is4NF ? 'yes' : 'NO — ' + r4.violations.map(v=>fmtFd(v.dependency)).join(', ')));
    if (!r4.is4NF) console.log('    -> ' + decomposeTo4NF(p.attributes,p.fds,p.mvds).relations.map(r=>'('+r.attributes.join(',')+')').join(' '));
  }
  if (p.jds.length) {
    const r5 = check5NF(p.attributes, p.fds, p.jds[0]);
    console.log('  5NF check : holds=' + r5.holds + '  verdict=' + (r5.is5NF ? 'no violation' : 'VIOLATION'));
    console.log('    components: ' + r5.components.map(c=>fmt(c.component)+(c.isSuperkey?' [superkey]':' [not superkey]')).join('  '));
  }
}
