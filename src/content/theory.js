// theory.js — Member C's file. Plain data only, no logic, no imports.
// Notes for every normal form plus the anomaly example that motivates all of it.

export const THEORY = [
  {
    id: '1nf',
    title: '1NF — First Normal Form',
    oneLine: 'Every cell holds one atomic value. No repeating groups, no lists inside a column.',
    body: [
      'A relation is in 1NF when every attribute value is atomic — a single, indivisible value — and every row has the same set of attributes. A column holding "Maths, Physics, Chemistry" breaks 1NF; so does a table with Phone1, Phone2, Phone3 columns, which is the same repeating group wearing a disguise.',
      'The fix is to give each value its own row (and usually its own table). A student with three phone numbers becomes three rows in a StudentPhone table, not three columns.',
      'Important and often missed: 1NF is a property of the stored data, not of the dependency set. No algorithm can look at a list of functional dependencies and tell you whether a column contains commas. This lab therefore assumes 1NF and says so, rather than pretending to test it. Every later normal form takes 1NF as given.',
    ],
    violates: 'A column containing a comma-separated list, or repeating columns like Subject1, Subject2, Subject3.',
    test: 'Look at the data, not the dependencies.',
  },
  {
    id: '2nf',
    title: '2NF — Second Normal Form',
    oneLine: 'In 1NF, and no non-prime attribute depends on only part of a candidate key.',
    body: [
      'A prime attribute is one that appears in at least one candidate key; every other attribute is non-prime. A partial dependency is an FD X → A where X is a proper subset of some candidate key and A is non-prime.',
      'Example: Enrolment(StudentId, CourseId, Grade, StudentName) with candidate key {StudentId, CourseId}. StudentId → StudentName is a partial dependency: StudentId is only half the key, and StudentName is non-prime. The student\'s name is repeated once per course they take, and changing it means changing every one of those rows.',
      'The fix is to pull the partially dependent attributes out into their own relation keyed on the part of the key they actually depend on: Student(StudentId, StudentName) and Enrolment(StudentId, CourseId, Grade).',
      'A relation whose candidate keys are all single attributes is automatically in 2NF — a single attribute has no proper non-empty subset, so a partial dependency is impossible. Only composite keys can break 2NF.',
    ],
    violates: 'Part of a composite key determining a non-key attribute.',
    test: 'For each FD X → A with A non-prime: is X a proper subset of a candidate key? If yes, 2NF is violated.',
  },
  {
    id: '3nf',
    title: '3NF — Third Normal Form',
    oneLine: 'In 2NF, and no non-prime attribute depends on another non-key attribute.',
    body: [
      'Formally: for every non-trivial FD X → Y, either X is a superkey, or every attribute in Y − X is prime. The second clause is the escape hatch that separates 3NF from BCNF.',
      'The violation 3NF removes is the transitive dependency: key → something → something else. Employee(EmpId, DeptId, DeptName) with EmpId → DeptId and DeptId → DeptName. DeptName depends on the key only by going through DeptId. The department name is stored once per employee, so a department with 400 staff stores its name 400 times.',
      'The fix splits the chain: Employee(EmpId, DeptId) and Department(DeptId, DeptName).',
      '3NF is the practical target for most designs. It is always achievable while keeping both the lossless-join property and dependency preservation — and 3NF synthesis, the algorithm this lab implements, guarantees exactly that. BCNF cannot make the same promise.',
    ],
    violates: 'A non-key attribute determining another non-key attribute.',
    test: 'For each non-trivial FD X → Y: is X a superkey, or is every attribute of Y − X prime? If neither, 3NF is violated.',
  },
  {
    id: 'bcnf',
    title: 'BCNF — Boyce–Codd Normal Form',
    oneLine: 'For every non-trivial FD X → Y, X must be a superkey. No exceptions.',
    body: [
      'BCNF is 3NF with the "or the right side is prime" escape hatch removed. That single change is the entire difference, and it is the most examinable point in the whole topic.',
      'The classic relation that is in 3NF but not in BCNF: R(Student, Subject, Teacher), where each teacher teaches exactly one subject, and a student takes a subject from one teacher. FDs: {Student, Subject} → Teacher and Teacher → Subject. Candidate keys are {Student, Subject} and {Student, Teacher}, so Subject and Teacher are both prime. Teacher → Subject therefore survives 3NF — the right side is prime — but Teacher is not a superkey, so BCNF is violated. The fact that a teacher teaches a given subject is repeated for every student they teach.',
      'The price: BCNF decomposition is always lossless, but it is NOT always dependency preserving. In the example above, splitting into (Teacher, Subject) and (Student, Teacher) loses {Student, Subject} → Teacher — you can no longer check it without joining the two tables back together.',
      'So the trade-off is real and you must be able to state it: 3NF keeps every dependency checkable but may leave some redundancy; BCNF removes that redundancy but may make a constraint enforceable only across a join. Neither is universally right.',
    ],
    violates: 'A non-superkey determining anything non-trivially — even a prime attribute.',
    test: 'For each non-trivial FD X → Y: is X a superkey? If not, BCNF is violated.',
  },
  {
    id: '4nf',
    title: '4NF — Fourth Normal Form',
    oneLine: 'For every non-trivial multivalued dependency X ↠ Y, X must be a superkey.',
    body: [
      'A multivalued dependency X ↠ Y says that for a given value of X, the set of Y values is completely independent of the remaining attributes. Where an FD pins down one value, an MVD pins down a whole set.',
      'Example: Lecturer(Name, Course, Phone). A lecturer teaches several courses and has several phone numbers, and the two facts have nothing to do with each other. Name ↠ Course and Name ↠ Phone. To store the relation truthfully you must record every combination — a lecturer with 3 courses and 2 phones needs 6 rows to state 5 facts. Add a course and you must add two rows, or the table is inconsistent.',
      'An MVD X ↠ Y is trivial when Y ⊆ X, or when X ∪ Y is the whole relation. Trivial MVDs never violate anything.',
      'Complementation: if X ↠ Y holds then X ↠ (R − X − Y) holds automatically. MVDs always come in pairs.',
      'Every functional dependency is also a multivalued dependency (a set of one). So 4NF is strictly stronger than BCNF: anything violating BCNF also violates 4NF.',
      'The fix: split on the MVD. Lecturer(Name, Course) and LecturerPhone(Name, Phone). The join of the two reproduces the original exactly — which is precisely what "independent" means.',
    ],
    violates: 'Two independent multi-valued facts stored in the same relation, multiplying rows.',
    test: 'For each non-trivial MVD X ↠ Y: is X a superkey? If not, 4NF is violated.',
  },
  {
    id: '5nf',
    title: '5NF — Fifth Normal Form (Project-Join Normal Form)',
    oneLine: 'Every non-trivial join dependency that holds is implied by the candidate keys.',
    body: [
      'A join dependency *(R₁, …, Rₙ) says the relation equals the natural join of its projections onto R₁ … Rₙ. 5NF is about relations that can be split three or more ways losslessly even though no two-way split works.',
      'The standard example: Supply(Supplier, Part, Project), under the business rule "if supplier s supplies part p, and project j uses part p, and supplier s supplies project j, then s supplies p to j." No two-way decomposition is lossless, but the three-way split into (Supplier, Part), (Part, Project), (Supplier, Project) is — so the original stores a redundant combination.',
      'Now the honest part, and the part to say out loud in the viva. Deciding 5NF in general is not possible from a dependency set alone: there is no procedure that enumerates every join dependency holding on a relation, because a JD can hold for reasons the FDs never mention. Any tool that claims to be a complete 5NF decider is overclaiming.',
      'What this lab does instead is the standard practical check. You supply one specific join dependency. The lab tests (1) whether it holds under your FDs, using the chase, and (2) whether every component is a superkey. A JD that holds, is non-trivial, and has a non-superkey component is a genuine 5NF violation. A pass means "this join dependency does not violate 5NF" — never "the relation is in 5NF".',
      'In practice 5NF violations are rare, and the honest scoping of the check is worth more marks than a false claim of completeness.',
    ],
    violates: 'A relation that is the lossless join of three or more projections, none of which is a superkey.',
    test: 'For a supplied JD: does it hold (chase), and is every component a superkey?',
  },
];

// ---------------------------------------------------------------------------
// The anomaly example — one unnormalised table, three anomalies, one fix.
// ---------------------------------------------------------------------------

export const ANOMALY_DEMO = {
  title: 'StudentCourse — one table doing four jobs',
  relation: ['StudentId', 'StudentName', 'CourseId', 'CourseName', 'DeptId', 'DeptName', 'Grade'],
  fds: [
    'StudentId → StudentName, DeptId',
    'DeptId → DeptName',
    'CourseId → CourseName',
    'StudentId, CourseId → Grade',
  ],
  candidateKey: 'StudentId, CourseId',
  columns: ['StudentId', 'StudentName', 'CourseId', 'CourseName', 'DeptId', 'DeptName', 'Grade'],
  rows: [
    ['S101', 'Aarav Menon', 'C11', 'Database Systems', 'D1', 'Computer Science', 'A'],
    ['S101', 'Aarav Menon', 'C12', 'Operating Systems', 'D1', 'Computer Science', 'B'],
    ['S102', 'Priya Nair', 'C11', 'Database Systems', 'D1', 'Computer Science', 'A'],
    ['S103', 'Rohit Verma', 'C13', 'Signals & Systems', 'D2', 'Electronics', 'B'],
  ],
  anomalies: [
    {
      kind: 'insert',
      title: 'Insertion anomaly',
      scenario: 'A new department, D3 "Mechanical", is created. No student has joined it and no course exists for it yet.',
      problem:
        'You cannot record the department. The primary key is (StudentId, CourseId), and both parts would be NULL — a primary key attribute cannot be NULL. A perfectly real fact about the university is unstorable because of how the table is shaped.',
      highlight: { type: 'row', note: 'There is nowhere to put this row.' },
      fix: 'Department(DeptId, DeptName) holds the fact on its own, with no student or course required.',
    },
    {
      kind: 'update',
      title: 'Update anomaly',
      scenario: 'The Computer Science department is renamed "Computing and Data Science".',
      problem:
        'DeptName "Computer Science" appears in three rows. All three must change in one transaction. Miss one and the database now says D1 has two different names at once — the database contradicts itself, and no constraint in this schema forbids it.',
      highlight: { type: 'cells', column: 'DeptName', value: 'Computer Science' },
      fix: 'With Department(DeptId, DeptName), the name is stored once. One UPDATE, no possibility of disagreement.',
    },
    {
      kind: 'delete',
      title: 'Deletion anomaly',
      scenario: 'Rohit Verma (S103) withdraws, and his single row is deleted.',
      problem:
        'The row was the only place recording that C13 is called "Signals & Systems" and that D2 is "Electronics". Deleting an enrolment silently destroys course and department facts that had nothing to do with that enrolment.',
      highlight: { type: 'row', index: 3, note: 'Deleting this row loses C13 and D2 entirely.' },
      fix: 'Course(CourseId, CourseName) and Department(DeptId, DeptName) survive independently of any enrolment.',
    },
  ],
  decomposition: [
    { name: 'Student', attributes: ['StudentId', 'StudentName', 'DeptId'], key: 'StudentId' },
    { name: 'Department', attributes: ['DeptId', 'DeptName'], key: 'DeptId' },
    { name: 'Course', attributes: ['CourseId', 'CourseName'], key: 'CourseId' },
    { name: 'Enrolment', attributes: ['StudentId', 'CourseId', 'Grade'], key: 'StudentId, CourseId' },
  ],
  closing:
    'Every anomaly above is a symptom of one disease: two independent facts sharing a row. Normalisation is the systematic cure, and the normal forms are just increasingly strict statements of "one fact, one place".',
};

// ---------------------------------------------------------------------------
// Worked examples offered as one-click presets in the input form.
// ---------------------------------------------------------------------------

export const PRESETS = [
  {
    label: 'Transitive chain (2NF, not 3NF)',
    relation: 'A, B, C, D',
    deps: 'A -> B\nB -> C\nC -> D',
    note: 'Candidate key A. B → C and C → D are transitive dependencies.',
  },
  {
    label: '3NF but not BCNF',
    relation: 'A, B, C',
    deps: 'A,B -> C\nC -> A',
    note: 'Candidate keys AB and BC. C → A survives 3NF because A is prime, but C is not a superkey.',
  },
  {
    label: 'Already in BCNF',
    relation: 'A, B, C, D',
    deps: 'A,B -> C\nA,B -> D',
    note: 'Candidate key AB determines everything. Nothing to fix.',
  },
  {
    label: 'Partial dependencies (1NF only)',
    relation: 'A, B, C, D, E',
    deps: 'A -> B\nB,C -> D\nE -> C',
    note: 'Candidate key AE. A → B and E → C are partial dependencies, so 2NF fails.',
  },
  {
    label: 'Minimal cover workout',
    relation: 'A, B, C, D',
    deps: 'A -> B,C\nC -> D\nD -> A',
    note: 'Watch the three reduction stages in the Minimal Cover tab.',
  },
  {
    label: '3NF keeps a dependency BCNF loses',
    relation: 'A, B, C, D',
    deps: 'A,B -> C\nC -> D\nD -> A',
    note: 'The headline comparison: BCNF analysis drops AB → C, 3NF synthesis keeps it.',
  },
  {
    label: 'MVD — BCNF but not 4NF',
    relation: 'A, B, C',
    deps: 'A ->> B\nA ->> C',
    note: 'No functional dependencies at all, yet the table multiplies rows.',
  },
  {
    label: 'Join dependency (5NF check)',
    relation: 'A, B, C',
    deps: 'A -> B\nB -> C\nC -> A\n*(A B, B C, C A)',
    note: 'Tests the supplied join dependency with the chase.',
  },
  {
    label: 'Realistic: university enrolment',
    relation: 'StudentId, StudentName, CourseId, CourseName, DeptId, DeptName, Grade',
    deps:
      'StudentId -> StudentName, DeptId\nDeptId -> DeptName\nCourseId -> CourseName\nStudentId, CourseId -> Grade',
    note: 'The anomaly table from the theory notes, run through the full pipeline.',
  },
];
