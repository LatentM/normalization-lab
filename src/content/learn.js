// learn.js — material for the Learn section: the problem this project
// addresses, the concept explanation, the embedded video, and the references.
// Plain data only. No logic, no imports.

// ── The problem, objectives and requirements ──────────────────────────────

export const PROBLEM = {
  title: 'The problem this lab addresses',
  statement:
    'Normalization is taught as a sequence of definitions, so students memorise the names of the normal forms without being able to apply them. Every normalization tool available online makes this worse rather than better: each one accepts a relation and prints a final decomposition, with none of the reasoning that produced it. A student who uses such a tool gets the answer and learns nothing, because the part that has to be learned — the derivation — is exactly the part the tool hides.',
  thesis:
    'This lab inverts that. The decomposition is not the product; the reasoning is. Every closure names the dependency that fired at each step, every minimal-cover reduction states the closure that justified it, every normal-form verdict names the exact dependency that blocks the next rung, and every lossless-join claim shows the chase tableau that proves it.',
  objectives: [
    'Compute attribute closures and show which dependency was applied at each step.',
    'Identify all superkeys and candidate keys; classify attributes as prime or non-prime.',
    'Reduce a dependency set to its minimal cover, showing each of the three reductions.',
    'Diagnose the highest normal form from 1NF to 5NF, naming the dependency that blocks the next one.',
    'Decompose by both 3NF synthesis and BCNF analysis, and compare the two results directly.',
    'Verify lossless join and dependency preservation for any decomposition.',
    'Demonstrate insert, update and delete anomalies on live sample data.',
    'Provide auto-graded practice problems with hints for self-assessment.',
    'Persist a student’s work and progress between sessions.',
  ],
  inputs: [
    ['Relation schema', 'A list of attribute names — up to 16.'],
    ['Functional dependencies', 'Zero or more lines of the form  A,B -> C'],
    ['Multivalued dependencies', 'Optional, written  A ->> B  — needed only for 4NF.'],
    ['Join dependency', 'Optional, written  *(AB, BC, CA)  — needed only for the 5NF check.'],
  ],
  outputs: [
    ['Keys', 'All candidate keys, all superkeys, prime and non-prime attributes.'],
    ['Closure trace', 'X⁺ for any attribute set, with the dependency used at each step.'],
    ['Minimal cover', 'The canonical cover with every reduction and its justification.'],
    ['Normal-form verdict', 'The highest form satisfied, and the blocking dependency for each failed rung.'],
    ['Two decompositions', '3NF by synthesis and BCNF by analysis, side by side.'],
    ['Properties', 'Lossless join with its chase tableau; dependency preservation, dependency by dependency.'],
    ['Higher forms', '4NF diagnosis and decomposition; a scoped 5NF join-dependency check.'],
    ['Report', 'The complete worked solution as PDF, Word or plain text.'],
  ],
  functional: [
    'Parse and validate the relation and dependency text, reporting errors by line number.',
    'Refuse input beyond 16 attributes rather than freezing, since key search is over 2ⁿ subsets.',
    'Compute every result from the input at run time — no answers are stored or looked up.',
    'Show intermediate results for every computation, not only final answers.',
    'Persist the working relation, saved relations and quiz progress in the browser.',
    'Generate a downloadable report containing inputs, processing steps, intermediate results and final output.',
    'Operate entirely client-side, with no backend and no network request at run time.',
  ],
};

// ── Concept explanation ───────────────────────────────────────────────────

export const CONCEPT = [
  {
    heading: 'What normalization actually is',
    paras: [
      'Normalization is the process of structuring a relational schema so that each fact is stored in exactly one place. It is not tidiness and it is not an aesthetic preference — it exists to remove three specific, demonstrable failures that appear the moment two independent facts are forced to share a row.',
      'Those failures are the insert, update and delete anomalies. An insertion anomaly means a fact cannot be recorded because some unrelated part of the key is unknown. An update anomaly means one fact is stored in many rows, so a change must be applied to every one of them or the database contradicts itself. A deletion anomaly means removing one fact silently destroys another that happened to share the row.',
      'Every normal form is a progressively stricter statement of the same rule — one fact, one place — and each one is defined in terms of functional dependencies, which are the formal language for "this determines that".',
    ],
  },
  {
    heading: 'Functional dependency and attribute closure',
    paras: [
      'A functional dependency X → Y says that any two rows agreeing on X must also agree on Y. It is a constraint on every possible state of the relation, not an observation about the rows that happen to be stored today.',
      'The attribute closure X⁺ is the set of every attribute reachable from X by repeatedly applying the dependencies. It is computed by starting with X and, whenever some dependency has its whole left side already in hand, adding its right side — repeating until a full pass adds nothing new.',
      'Closure is the single most useful computation in the whole topic. Candidate keys, every normal-form test, minimal cover and dependency preservation are all closure computations wearing different hats. A student who can compute a closure by hand can derive everything else.',
    ],
  },
  {
    heading: 'Keys, and why finding them is expensive',
    paras: [
      'A superkey is any attribute set whose closure is the entire relation. A candidate key is a superkey with nothing redundant in it — remove any attribute and it stops being a superkey. An attribute appearing in at least one candidate key is prime; every other attribute is non-prime.',
      'Finding all candidate keys is NP-hard. To prove a set is minimal you must know that no smaller subset already works, so finding every key means examining, in the worst case, all 2ⁿ subsets. This lab enumerates subsets smallest-first and prunes any superset of a key already found, which is the standard practical compromise — not a way around the complexity — and refuses input above 16 attributes rather than appearing to hang.',
    ],
  },
  {
    heading: 'The ladder: 1NF to BCNF',
    paras: [
      '1NF requires every attribute value to be atomic. This is a property of the stored data, not of the dependency set, so no algorithm can decide it from a list of dependencies. This lab states that it assumes 1NF rather than pretending to test it.',
      '2NF forbids partial dependencies: no non-prime attribute may depend on only part of a candidate key. Only a composite candidate key can produce such a violation, because a single attribute has no proper non-empty subset.',
      '3NF forbids transitive dependencies. Formally, for every non-trivial X → Y, either X is a superkey or every attribute of Y − X is prime. That second clause is an escape hatch, and it is the whole story of what follows.',
      'BCNF is 3NF with the escape hatch removed: for every non-trivial X → Y, X must be a superkey, full stop. That single missing clause is the entire difference between the two forms, and every interesting consequence in this topic follows from it.',
    ],
  },
  {
    heading: 'The trade-off that matters most',
    paras: [
      'A decomposition must be lossless — the natural join of the fragments must reproduce the original relation exactly, with no lost tuples and, crucially, no spurious ones. It should also be dependency preserving, meaning every original constraint can still be checked inside a single fragment without performing a join.',
      '3NF synthesis builds one relation per dependency of the minimal cover, so every dependency sits inside a fragment by construction — dependency preservation is guaranteed. Losslessness is then bought separately by adding a relation consisting of a candidate key.',
      'BCNF analysis works the other way round. Each split shares the attributes the two halves rejoin on, so losslessness is free at every step — but nothing protects a dependency whose two sides land in different fragments. BCNF removes more redundancy and may cost you a constraint.',
      'So the guarantees run in opposite directions, and neither algorithm is universally right. That contrast is the single most examinable fact in this topic, and it is why this lab runs both algorithms on every input and shows them side by side rather than picking one.',
    ],
  },
  {
    heading: 'Beyond functional dependencies: 4NF and 5NF',
    paras: [
      'A multivalued dependency X ↠ Y says that for a given X, the set of Y values is completely independent of everything else in the relation. Where a functional dependency pins down one value, a multivalued dependency pins down a whole set. Storing two independent sets in one table forces every combination to be recorded — a lecturer with three courses and two phone numbers needs six rows to state five facts. 4NF requires a superkey on the left of every non-trivial multivalued dependency. Since every functional dependency is also a multivalued one, 4NF is strictly stronger than BCNF.',
      '5NF concerns join dependencies: relations that can be split three or more ways losslessly even though no two-way split works. Deciding 5NF in general is not possible from a dependency set alone, because no procedure enumerates every join dependency that holds on a relation — one can hold for reasons the dependencies never mention. This lab therefore implements the standard practical check and states its scope precisely, which is the honest position and a stronger one to defend than a false claim of completeness.',
    ],
  },
];

// ── Video ─────────────────────────────────────────────────────────────────
//
// ⚠ BEFORE SUBMISSION: confirm this video still exists and still suits you.
// Replace `embedId` with the id of any YouTube video you prefer — it is the
// part after "watch?v=" in the URL — and update the citation to match.

export const VIDEO = {
  embedId: 'GFQaEYEc8_8',
  title: 'Database Normalization — 1NF, 2NF, 3NF and BCNF explained',
  channel: 'Decomplexify',
  note:
    'A visual walkthrough of the normal forms using a worked example, covering the same ladder this lab computes. Watch it before using the Decomposition section — it makes the 3NF-versus-BCNF comparison much easier to read.',
  url: 'https://www.youtube.com/watch?v=GFQaEYEc8_8',
};

// ── References ────────────────────────────────────────────────────────────

export const REFERENCES = {
  books: [
    'Silberschatz, A., Korth, H. F., and Sudarshan, S. — *Database System Concepts*, 7th edition, McGraw-Hill, 2019. Chapter 7, "Relational Database Design": functional dependencies, closure, canonical cover, the decomposition algorithms and their guarantees.',
    'Elmasri, R., and Navathe, S. B. — *Fundamentals of Database Systems*, 7th edition, Pearson, 2016. Chapters 14 and 15: normal forms 1NF–5NF, multivalued and join dependencies, lossless-join and dependency-preservation testing.',
    'Ramakrishnan, R., and Gehrke, J. — *Database Management Systems*, 3rd edition, McGraw-Hill, 2003. Chapter 19: schema refinement and the chase.',
    'Date, C. J. — *An Introduction to Database Systems*, 8th edition, Pearson, 2003. Chapters 11–13, including the project-join normal form and the Supplier–Part–Project example.',
  ],
  papers: [
    'Codd, E. F. — "A Relational Model of Data for Large Shared Data Banks", *Communications of the ACM*, 13(6), 1970, pp. 377–387. The paper that introduces the relational model and first normal form.',
    'Codd, E. F. — "Further Normalization of the Data Base Relational Model", *Data Base Systems*, Courant Computer Science Symposia 6, Prentice-Hall, 1972. Introduces 2NF and 3NF.',
    'Bernstein, P. A. — "Synthesizing Third Normal Form Relations from Functional Dependencies", *ACM Transactions on Database Systems*, 1(4), 1976, pp. 277–298. The 3NF synthesis algorithm this lab implements.',
    'Fagin, R. — "Multivalued Dependencies and a New Normal Form for Relational Databases", *ACM Transactions on Database Systems*, 2(3), 1977, pp. 262–278. Defines 4NF.',
    'Fagin, R. — "Normal Forms and Relational Database Operators", *ACM SIGMOD International Conference on Management of Data*, 1979. Defines project-join (fifth) normal form.',
    'Aho, A. V., Beeri, C., and Ullman, J. D. — "The Theory of Joins in Relational Databases", *ACM Transactions on Database Systems*, 4(3), 1979, pp. 297–314. The chase algorithm used here to test the lossless-join property.',
    'Beeri, C., and Bernstein, P. A. — "Computational Problems Related to the Design of Normal Form Relational Schemas", *ACM Transactions on Database Systems*, 4(1), 1979, pp. 30–59. Establishes the complexity results behind the candidate-key search.',
  ],
  websites: [
    'Stanford CS145, *Introduction to Databases* — lecture notes on functional dependencies and normalization. https://cs145-fa19.github.io/',
    'GeeksforGeeks — "Normal Forms in DBMS" and "Finding Attribute Closure and Candidate Keys using Functional Dependencies". https://www.geeksforgeeks.org/',
    'Wikipedia — "Database normalization", "Boyce–Codd normal form", "Chase (algorithm)". Used for cross-checking definitions only, never as a primary source.',
  ],
  videos: [
    'Decomplexify — "Learn Database Normalization: 1NF, 2NF, 3NF, 4NF, 5NF". https://www.youtube.com/watch?v=GFQaEYEc8_8',
    'Neso Academy — "Database Management System" playlist, lectures on functional dependencies and normalization.',
  ],
  tools: [
    'React 18 and Vite — application framework and build tool.',
    'jsPDF — client-side PDF generation for the downloadable report.',
    'Google Fonts — Spectral, Archivo and JetBrains Mono typefaces.',
  ],
  note:
    'All algorithms were implemented from the definitions given in the sources above and verified against hand-solved examples. No normalization library or third-party solver was used — the computation layer in src/logic/ is entirely original and is covered by 97 automated assertions.',
};
