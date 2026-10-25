/* Previous-year questions on functional dependencies and normalization.
   Stems are paraphrased; relations, dependencies, options and answer keys follow the papers.
   Answer keys were cross-checked against GATE Overflow and the engine (see test/pyq.test.js).
   type: 'mcq' single answer · 'msq' one or more answers · 'nat' numerical answer
   answer: option index (mcq), array of indices (msq), number (nat) */
(function (root) {
  const PYQ = [
    {
      id: 'g26-2-32', exam: 'GATE CSE', year: 2026, set: 'Set 2', q: 32, marks: 2, topic: 'Closure & inference', type: 'mcq',
      stem: 'Armstrong’s axioms are Reflexivity (if Y ⊆ X then X → Y), Augmentation (if X → Y then XZ → YZ) and Transitivity (if X → Y and Y → Z then X → Z). The Union rule says: if X → Y and X → Z then X → YZ. Which combination of the three axioms is both necessary and sufficient to prove the Union rule?',
      options: ['Reflexivity, Augmentation and Transitivity', 'Reflexivity and Augmentation', 'Transitivity', 'Augmentation and Transitivity'],
      answer: 3,
      explain: [
        'Augment X → Y with X: XX → XY, that is X → XY.',
        'Augment X → Z with Y: XY → YZ.',
        'Transitivity on X → XY and XY → YZ gives X → YZ.',
        'Reflexivity is never used, and neither of the other two can be dropped, so Augmentation + Transitivity is exactly what is needed.'
      ]
    },
    {
      id: 'g26-1-21', exam: 'GATE CSE', year: 2026, set: 'Set 1', q: 21, marks: 1, topic: 'Decomposition', type: 'msq',
      stem: 'In relational normalization, which of the following statements is/are true?',
      options: [
        'A dependency-preserving 3NF decomposition of a relation can always be obtained.',
        'A dependency-preserving 1NF decomposition of a relation can always be obtained.',
        'A dependency-preserving BCNF decomposition of a relation cannot always be obtained.',
        'A dependency-preserving 2NF decomposition of a relation cannot always be obtained.'
      ],
      answer: [0, 1, 2],
      explain: [
        '3NF synthesis (Bernstein) always yields a lossless, dependency-preserving 3NF decomposition.',
        'Every 3NF schema is also in 2NF and 1NF, so dependency-preserving 2NF and 1NF decompositions always exist. That makes A and B true and D false.',
        'BCNF can force a split that loses a dependency. Classic case: R(A,B,C) with AB → C and C → B. Try it in the lab.'
      ],
      lab: { schema: 'R(A, B, C)', deps: 'A, B -> C\nC -> B' }
    },
    {
      id: 'g26-1-20', exam: 'GATE CSE', year: 2026, set: 'Set 1', q: 20, marks: 1, topic: 'Closure & inference', type: 'msq',
      stem: 'P, Q, R and S are attributes of a relation, and X → Y denotes a functional dependency with X, Y ⊆ {P, Q, R, S}. Which of the following is/are always true?',
      options: [
        'If {P,Q} → {R} and {P} → {R}, then {Q} → {R}',
        'If {P,Q} → {R}, then {P} → {R} or {Q} → {R}',
        'If {P} → {R} and {Q} → {S}, then {P,Q} → {R,S}',
        'If {P} → {R}, then {P,Q} → {R}'
      ],
      answer: [2, 3],
      explain: [
        'A: with only PQ → R and P → R, Q⁺ = {Q}. Q → R does not follow.',
        'B: a composite left side need not be reducible. P⁺ = {P} and Q⁺ = {Q} under PQ → R alone.',
        'C: (PQ)⁺ = {P, Q, R, S}, so PQ → RS holds.',
        'D: augmenting P → R with Q gives PQ → RQ, which contains PQ → R.'
      ]
    },
    {
      id: 'g26-1-55', exam: 'GATE CSE', year: 2026, set: 'Set 1', q: 55, marks: 2, topic: 'Keys', type: 'nat',
      stem: 'A relation R(A, B, C, D) has exactly two candidate keys, {A, B} and {A, C}. How many superkeys does R have?',
      answer: 6,
      explain: [
        'Superkeys containing AB: pick any subset of the other two attributes, 2² = 4.',
        'Superkeys containing AC: likewise 2² = 4.',
        'Counted twice, those containing ABC: 2¹ = 2.',
        'Inclusion–exclusion: 4 + 4 − 2 = 6 (AB, AC, ABC, ABD, ACD, ABCD).'
      ]
    },
    {
      id: 'g25-2', exam: 'GATE CSE', year: 2025, set: 'Set 2', marks: 2, topic: 'Normal forms', type: 'msq',
      stem: 'Two relational schemas are given with all the functional dependencies that hold on them.\nR1(A, B, C, D, E): D → E, EA → B, EB → C\nR2(A, B, C, D): A → D, A → B, C → A\nWhich statement(s) is/are TRUE?',
      options: ['R1 is in 3NF', 'R2 is in 3NF', 'R1 is NOT in 3NF', 'R2 is NOT in 3NF'],
      answer: [2, 3],
      explain: [
        'R1: A and D never appear on a right side, and (AD)⁺ = ABCDE, so AD is the only key. D → E has part of the key determining non-prime E, a partial dependency. R1 is not even in 2NF.',
        'R2: C is the only key. A → D and A → B have a non-key left side and non-prime right sides, which are transitive dependencies. R2 is in 2NF but not 3NF.'
      ],
      lab: { schema: 'R1(A, B, C, D, E)', deps: 'D -> E\nE, A -> B\nE, B -> C' }
    },
    {
      id: 'g25-1', exam: 'GATE CSE', year: 2025, set: 'Set 1', marks: 2, topic: 'Decomposition', type: 'msq',
      stem: 'The schema team(name, city, owner) has the functional dependencies name → city and name → owner. It is decomposed into t1(name, city) and t2(name, owner). Which statement(s) is/are TRUE?',
      options: ['The relation team is NOT in BCNF.', 'The relations t1 and t2 are in BCNF.', 'The decomposition constitutes a lossless join.', 'The relation team is NOT in 3NF.'],
      answer: [1, 2],
      explain: [
        'name⁺ = {name, city, owner}, so name is a key of team. Every left side is a superkey, so team is already in BCNF (and therefore in 3NF). A and D are false.',
        'Each two-attribute relation is in BCNF.',
        't1 ∩ t2 = {name}, which is a key of both parts, so the join is lossless.'
      ],
      lab: { schema: 'team(name, city, owner)', deps: 'name -> city\nname -> owner', decomp: 't1(name, city), t2(name, owner)' }
    },
    {
      id: 'g24-2', exam: 'GATE CSE', year: 2024, set: 'Set 2', marks: 2, topic: 'Closure & inference', type: 'nat',
      stem: 'Call a functional dependency X → Y useful when X is non-empty, Y is non-empty and X ∩ Y is empty. For a relation with 4 attributes, how many useful functional dependencies are possible?',
      answer: 50,
      explain: [
        'Each attribute goes to X, to Y, or to neither: 3⁴ = 81 assignments.',
        'Remove those with X empty (2⁴ = 16) and those with Y empty (16), then add back the one where both are empty.',
        '81 − 16 − 16 + 1 = 50.'
      ]
    },
    {
      id: 'g24-1', exam: 'GATE CSE', year: 2024, set: 'Set 1', marks: 1, topic: 'Theory', type: 'msq',
      stem: 'Which of the following statements about a relation R in first normal form (1NF) is/are TRUE?',
      options: ['R can have a multi-attribute key', 'R cannot have a foreign key', 'R cannot have a composite attribute', 'R cannot have more than one candidate key'],
      answer: [0, 2],
      explain: [
        '1NF only demands atomic attribute values. A key made of several atomic attributes is fine.',
        'Composite (and multivalued) attributes are exactly what 1NF forbids.',
        'Foreign keys and multiple candidate keys are unrelated to 1NF.'
      ]
    },
    {
      id: 'g22', exam: 'GATE CSE', year: 2022, marks: 1, topic: 'Theory', type: 'msq',
      stem: 'Which of the following statements is/are TRUE?',
      options: ['A relation with only two attributes is always in BCNF.', 'If all attributes of a relation are prime attributes, then the relation is in BCNF.', 'Every relation has at least one non-prime attribute.', 'BCNF decompositions preserve functional dependencies.'],
      answer: [0],
      explain: [
        'With two attributes A, B the only possible non-trivial FDs are A → B or B → A, and each left side is then a key.',
        'All-prime relations are guaranteed 3NF, not BCNF. R(A,B,C) with AB → C, C → B is all-prime and violates BCNF.',
        'A relation can have no non-prime attribute at all (same example). What every relation has is at least one prime attribute.',
        'BCNF decomposition is always lossless but may lose dependencies.'
      ],
      lab: { schema: 'R(A, B, C)', deps: 'A, B -> C\nC -> B' }
    },
    {
      id: 'g21-2', exam: 'GATE CSE', year: 2021, set: 'Set 2', marks: 1, topic: 'Closure & inference', type: 'msq',
      stem: 'The functional dependencies P → QR and RS → T hold on a relation U(P, Q, R, S, T). Which of the following can be inferred?',
      options: ['PS → T', 'R → T', 'P → R', 'PS → Q'],
      answer: [0, 2, 3],
      explain: [
        '(PS)⁺ = {P, Q, R, S, T}, so PS → T and PS → Q both hold.',
        'P⁺ = {P, Q, R}, so P → R holds by decomposition.',
        'R⁺ = {R}. T needs S as well, so R → T does not follow.'
      ],
      lab: { schema: 'U(P, Q, R, S, T)', deps: 'P -> Q, R\nR, S -> T' }
    },
    {
      id: 'g21-1-33', exam: 'GATE CSE', year: 2021, set: 'Set 1', q: 33, marks: 2, topic: 'Decomposition', type: 'mcq',
      stem: 'R(P, Q, S, T, X, Y, Z, W) has the functional dependencies PQ → X, P → YX, Q → Y, Y → ZW. Two decompositions are proposed:\nD1: (P,Q,S,T), (P,T,X), (Q,Y), (Y,Z,W)\nD2: (P,Q,S), (T,X), (Q,Y), (Y,Z,W)\nWhich option is correct?',
      options: ['D1 is lossless, but D2 is lossy', 'D1 is lossy, but D2 is lossless', 'Both D1 and D2 are lossless', 'Both D1 and D2 are lossy'],
      answer: 0,
      explain: [
        'PQST is the only candidate key, since none of P, Q, S, T appears on a right side.',
        'D1 contains the whole key in (P,Q,S,T). Run the chase: that row gains X from P → X, Y from Q → Y, then Z and W from Y → ZW, and becomes all-distinguished. Lossless.',
        'D2: (T,X) shares only T with the rest and T determines nothing, and no part contains T together with P and Q. The chase never completes a row. Lossy.'
      ],
      lab: { schema: 'R(P, Q, S, T, X, Y, Z, W)', deps: 'P, Q -> X\nP -> Y, X\nQ -> Y\nY -> Z, W', decomp: '(P,Q,S,T), (P,T,X), (Q,Y), (Y,Z,W)' }
    },
    {
      id: 'g20-36', exam: 'GATE CSE', year: 2020, q: 36, marks: 1, topic: 'Normal forms', type: 'mcq',
      stem: 'A relational table R is in 3NF but not in BCNF. Which one of the following statements is TRUE?',
      options: [
        'R has a non-trivial FD X → A, where X is not a superkey and A is a prime attribute.',
        'R has a non-trivial FD X → A, where X is not a superkey, A is non-prime and X is not a proper subset of any key.',
        'R has a non-trivial FD X → A, where X is not a superkey, A is non-prime and X is a proper subset of some key.',
        'A cell in R holds a set instead of an atomic value.'
      ],
      answer: 0,
      explain: [
        'Not BCNF means some non-trivial X → A has X not a superkey.',
        'Being in 3NF, that FD must be rescued by the second 3NF clause: A is prime.',
        'B describes a transitive dependency (not 3NF), C a partial dependency (not 2NF), D a 1NF violation.'
      ]
    },
    {
      id: 'g19', exam: 'GATE CSE', year: 2019, marks: 2, topic: 'Decomposition', type: 'mcq',
      stem: 'F = {QR → S, R → P, S → Q} holds on X = (P, Q, R, S), which is not in BCNF. X is decomposed into Y = (P, R) and Z = (Q, R, S).\nI. Both Y and Z are in BCNF.\nII. The decomposition is dependency preserving and lossless.\nWhich statements are correct?',
      options: ['Both I and II', 'I only', 'II only', 'Neither I nor II'],
      answer: 2,
      explain: [
        'Z has keys QR and RS. S → Q holds in Z and S is not a superkey of Z, so Z is not in BCNF. Statement I is false.',
        'R → P lives in Y; QR → S and S → Q live in Z. Every FD is preserved.',
        'Y ∩ Z = {R}, and R → P makes R a key of Y. The join is lossless. Statement II is true.'
      ],
      lab: { schema: 'X(P, Q, R, S)', deps: 'Q, R -> S\nR -> P\nS -> Q', decomp: 'Y(P, R), Z(Q, R, S)' }
    },
    {
      id: 'g18-42', exam: 'GATE CSE', year: 2018, q: 42, marks: 2, topic: 'Normal forms', type: 'mcq',
      stem: 'Four Registration schemas, each with all its non-trivial FDs:\nI. (rollno, courses), where courses is a set-valued attribute; rollno → courses\nII. (rollno, courseid, email); rollno, courseid → email; email → rollno\nIII. (rollno, courseid, marks, grade); rollno, courseid → marks, grade; marks → grade\nIV. (rollno, courseid, credit); rollno, courseid → credit; courseid → credit\nWhich one is in 3NF but not in BCNF?',
      options: ['Schema I', 'Schema II', 'Schema III', 'Schema IV'],
      answer: 1,
      explain: [
        'I is not even in 1NF because courses holds a set.',
        'II: keys are (rollno, courseid) and (email, courseid). email → rollno has a non-superkey left side but a prime right side: 3NF, not BCNF.',
        'III: marks → grade is non-prime → non-prime, a 3NF violation (2NF only).',
        'IV: courseid → credit is a partial dependency (1NF only).'
      ],
      lab: { schema: 'Registration(rollno, courseid, email)', deps: 'rollno, courseid -> email\nemail -> rollno' }
    },
    {
      id: 'g17-1-13', exam: 'GATE CSE', year: 2017, set: 'Set 1', q: 13, marks: 1, topic: 'Minimal cover', type: 'mcq',
      stem: 'R(V, W, X, Y, Z) satisfies V → W, VW → X, Y → VX, Y → Z. Which of the following is an irreducible equivalent of this set?',
      options: ['V → W, V → X, Y → V, Y → Z', 'V → W, W → X, Y → V, Y → Z', 'V → W, V → X, Y → V, Y → X, Y → Z', 'V → W, W → X, Y → V, Y → X, Y → Z'],
      answer: 0,
      explain: [
        'Split: V → W, VW → X, Y → V, Y → X, Y → Z.',
        'In VW → X, W is extraneous because V⁺ already contains W. It becomes V → X.',
        'Y → X is redundant: Y → V and V → X give it.',
        'B and D introduce W → X, which the original set does not imply. C keeps the redundant Y → X.'
      ],
      lab: { schema: 'R(V, W, X, Y, Z)', deps: 'V -> W\nV, W -> X\nY -> V, X\nY -> Z' }
    },
    {
      id: 'g16-1-21', exam: 'GATE CSE', year: 2016, set: 'Set 1', q: 21, marks: 1, topic: 'Keys', type: 'mcq',
      stem: 'A relational schema has attributes V, W, X, Y, Z and primary key VY. Which of the following is NOT a superkey?',
      options: ['VXYZ', 'VWXZ', 'VWXY', 'VWXYZ'],
      answer: 1,
      explain: ['Every superset of the key VY is a superkey. VWXZ does not contain Y.']
    },
    {
      id: 'g15-3-20', exam: 'GATE CSE', year: 2015, set: 'Set 3', q: 20, marks: 1, topic: 'Closure & inference', type: 'mcq',
      stem: 'X(P, Q, R, S, T, U) has F = { {P,R} → {S,T}, {P,S,U} → {Q,R} }. Which of the following is the trivial functional dependency in F⁺?',
      options: ['{P,R} → {S,T}', '{P,R} → {R,T}', '{P,S} → {S}', '{P,S,U} → {Q}'],
      answer: 2,
      explain: ['An FD is trivial when its right side is a subset of its left side. Only {P,S} → {S} qualifies; the others hold in F⁺ but are non-trivial.']
    },
    {
      id: 'g14-3', exam: 'GATE CSE', year: 2014, set: 'Set 3', marks: 1, topic: 'Keys', type: 'mcq',
      stem: 'A prime attribute of a relation scheme R is an attribute that appears',
      options: ['in all candidate keys of R', 'in some candidate key of R', 'in a foreign key of R', 'only in the primary key of R'],
      answer: 1,
      explain: ['By definition, an attribute is prime if it belongs to at least one candidate key.']
    },
    {
      id: 'g14-1-key', exam: 'GATE CSE', year: 2014, set: 'Set 1', marks: 1, topic: 'Keys', type: 'mcq',
      stem: 'R = (E, F, G, H, I, J, K, L, M, N) has the FDs {E,F} → {G}, {F} → {I,J}, {E,H} → {K,L}, {K} → {M}, {L} → {N}. What is the key for R?',
      options: ['{E, F}', '{E, F, H}', '{E, F, H, K, L}', '{E}'],
      answer: 1,
      explain: [
        'E, F and H never appear on a right side, so every key contains them.',
        '(EFH)⁺ adds G, I, J, then K, L, then M, N: all ten attributes. EFH is the key.',
        '{E,F,H,K,L} is a superkey but not minimal.'
      ],
      lab: { schema: 'R(E, F, G, H, I, J, K, L, M, N)', deps: 'E, F -> G\nF -> I, J\nE, H -> K, L\nK -> M\nL -> N' }
    },
    {
      id: 'g14-1-s1s2', exam: 'GATE CSE', year: 2014, set: 'Set 1', marks: 2, topic: 'Minimal cover', type: 'mcq',
      stem: 'S1: Every table with two single-valued attributes is in 1NF, 2NF, 3NF and BCNF.\nS2: AB → C, D → E, E → C is a minimal cover for the set AB → C, D → E, AB → E, E → C.\nWhich one is correct?',
      options: ['S1 is TRUE and S2 is FALSE', 'Both S1 and S2 are TRUE', 'S1 is FALSE and S2 is TRUE', 'Both S1 and S2 are FALSE'],
      answer: 0,
      explain: [
        'S1: any two-attribute relation is in BCNF, hence in every lower form.',
        'S2: under the proposed cover, (AB)⁺ = {A, B, C}. AB → E is lost, so the two sets are not equivalent.'
      ],
      lab: { schema: 'R(A, B, C, D, E)', deps: 'A, B -> C\nD -> E\nA, B -> E\nE -> C' }
    },
    {
      id: 'g13-54', exam: 'GATE CSE', year: 2013, q: 54, marks: 2, topic: 'Keys', type: 'mcq',
      stem: 'Relation R has eight attributes ABCDEFGH with atomic values. F = {CH → G, A → BC, B → CFH, E → A, F → EG}, and F⁺ is exactly the set of FDs that hold. How many candidate keys does R have?',
      options: ['3', '4', '5', '6'],
      answer: 1,
      explain: [
        'D appears in no dependency, so every key contains D.',
        '(AD)⁺, (BD)⁺, (ED)⁺ and (FD)⁺ each give all eight attributes; (CD)⁺, (GD)⁺, (HD)⁺ do not.',
        'Larger candidates either contain one of these four or fail. Keys: AD, BD, DE, DF.'
      ],
      lab: { schema: 'R(A, B, C, D, E, F, G, H)', deps: 'C, H -> G\nA -> B, C\nB -> C, F, H\nE -> A\nF -> E, G' }
    },
    {
      id: 'g13-55', exam: 'GATE CSE', year: 2013, q: 55, marks: 2, topic: 'Normal forms', type: 'mcq',
      stem: 'For the same relation R(A, B, C, D, E, F, G, H) with F = {CH → G, A → BC, B → CFH, E → A, F → EG}, the relation R is',
      options: ['in 1NF, but not in 2NF', 'in 2NF, but not in 3NF', 'in 3NF, but not in BCNF', 'in BCNF'],
      answer: 0,
      explain: [
        'Keys are AD, BD, DE, DF, so the prime attributes are A, B, D, E, F.',
        'A → C: A is part of key AD and C is non-prime. That partial dependency breaks 2NF.'
      ],
      lab: { schema: 'R(A, B, C, D, E, F, G, H)', deps: 'C, H -> G\nA -> B, C\nB -> C, F, H\nE -> A\nF -> E, G' },
      alsoIn: 'UGC NET CSE Aug 2024 asked the same relation.'
    },
    {
      id: 'g12-2', exam: 'GATE CSE', year: 2012, q: 2, marks: 1, topic: 'Theory', type: 'mcq',
      stem: 'Which of the following is TRUE?',
      options: ['Every relation in 3NF is also in BCNF', 'A relation R is in 3NF if every non-prime attribute of R is fully functionally dependent on every key of R', 'Every relation in BCNF is also in 3NF', 'No relation can be in both BCNF and 3NF'],
      answer: 2,
      explain: ['BCNF is strictly stronger than 3NF. B describes 2NF, not 3NF.']
    },
    {
      id: 'git08-61', exam: 'GATE IT', year: 2008, q: 61, marks: 2, topic: 'Decomposition', type: 'mcq',
      stem: 'R(A, B, C, D) has the FDs A → B, B → C, C → D, D → B. The decomposition of R into (A, B), (B, C), (B, D)',
      options: ['gives a lossless join, and is dependency preserving', 'gives a lossless join, but is not dependency preserving', 'does not give a lossless join, but is dependency preserving', 'does not give a lossless join and is not dependency preserving'],
      answer: 0,
      explain: [
        'B, C and D determine one another, so B is a key of (B,C) and of (B,D). Joining step by step on B is lossless.',
        'C → D is not inside any part, but C → B (in BC) and B → D (in BD) recover it. All four FDs are preserved.'
      ],
      lab: { schema: 'R(A, B, C, D)', deps: 'A -> B\nB -> C\nC -> D\nD -> B', decomp: '(A,B), (B,C), (B,D)' }
    },
    {
      id: 'git08-62', exam: 'GATE IT', year: 2008, marks: 2, topic: 'Normal forms', type: 'mcq',
      stem: 'R(A, B, C, D, E, P, G) has the FDs AB → CD, DE → P, C → E, P → C, B → G. The relation R is',
      options: ['in BCNF', 'in 3NF, but not in BCNF', 'in 2NF, but not in 3NF', 'not in 2NF'],
      answer: 3,
      explain: [
        'A and B appear on no right side, and (AB)⁺ = ABCDEGP, so AB is the only key.',
        'B → G: part of the key determines non-prime G. Partial dependency, so not in 2NF.'
      ],
      lab: { schema: 'R(A, B, C, D, E, P, G)', deps: 'A, B -> C, D\nD, E -> P\nC -> E\nP -> C\nB -> G' }
    },
    {
      id: 'g07-62', exam: 'GATE CSE', year: 2007, q: 62, marks: 2, topic: 'Theory', type: 'mcq',
      stem: 'Which one of the following statements is FALSE?',
      options: ['Any relation with two attributes is in BCNF', 'A relation in which every key has only one attribute is in 2NF', 'A prime attribute can be transitively dependent on a key in a 3NF relation', 'A prime attribute can be transitively dependent on a key in a BCNF relation'],
      answer: 3,
      explain: [
        'In BCNF every determinant is a superkey, so a chain key → non-key → prime cannot exist.',
        'In 3NF it can: key → X → A with A prime is allowed. With single-attribute keys no partial dependency is possible, so B is true.'
      ],
      alsoIn: 'Repeated in UGC NET June 2014 Paper II.'
    },
    {
      id: 'g06-70', exam: 'GATE CSE', year: 2006, q: 70, marks: 2, topic: 'Closure & inference', type: 'mcq',
      stem: 'Given AB → CD, AF → D, DE → F, C → G, F → E, G → A. Which one of the following options is false?',
      options: ['{CF}⁺ = {ACDEFG}', '{BG}⁺ = {ABCDG}', '{AF}⁺ = {ACDEFG}', '{AB}⁺ = {ABCDG}'],
      answer: 2,
      explain: [
        '{AF}⁺: AF → D, F → E, then DE → F adds nothing new. Result {A, D, E, F}. No C or G, so C is false.',
        'The other three closures check out when computed step by step.'
      ],
      lab: { schema: 'R(A, B, C, D, E, F, G)', deps: 'A, B -> C, D\nA, F -> D\nD, E -> F\nC -> G\nF -> E\nG -> A' }
    },
    {
      id: 'g05-78', exam: 'GATE CSE', year: 2005, q: 78, marks: 2, topic: 'Keys', type: 'mcq',
      stem: 'R = (A, B, C, D, E, H) has the FDs A → B, BC → D, E → C, D → A. What are the candidate keys of R?',
      options: ['AE, BE', 'AE, BE, DE', 'AEH, BEH, BCH', 'AEH, BEH, DEH'],
      answer: 3,
      explain: [
        'E and H are on no right side, so both are in every key. Only option D keeps both in every key.',
        '(EH)⁺ = {C, E, H}. Adding A, B or D completes the closure, giving AEH, BEH, DEH.'
      ],
      lab: { schema: 'R(A, B, C, D, E, H)', deps: 'A -> B\nB, C -> D\nE -> C\nD -> A' }
    },
    {
      id: 'g05-29', exam: 'GATE CSE', year: 2005, q: 29, marks: 1, topic: 'Theory', type: 'mcq',
      stem: 'Which one of the following statements about normal forms is FALSE?',
      options: ['BCNF is stricter than 3NF', 'Lossless, dependency-preserving decomposition into 3NF is always possible', 'Lossless, dependency-preserving decomposition into BCNF is always possible', 'Any relation with two attributes is in BCNF'],
      answer: 2,
      explain: ['BCNF decomposition is always lossless but cannot always preserve dependencies. R(A,B,C) with AB → C, C → B shows it.'],
      alsoIn: 'Repeated in UGC NET June 2015 Paper III.'
    },
    {
      id: 'git05', exam: 'GATE IT', year: 2005, marks: 1, topic: 'Closure & inference', type: 'mcq',
      stem: 'A schema with attributes A, B, C, D, E has the FDs A → B, A → C, CD → E, B → D, E → A. Which of the following is NOT implied by them?',
      options: ['CD → AC', 'BD → CD', 'BC → CD', 'AC → BC'],
      answer: 1,
      explain: [
        '(BD)⁺ = {B, D}. No FD fires, so BD → CD is not implied.',
        '(CD)⁺, (BC)⁺ and (AC)⁺ each reach all five attributes.'
      ],
      lab: { schema: 'R(A, B, C, D, E)', deps: 'A -> B\nA -> C\nC, D -> E\nB -> D\nE -> A' }
    },
    {
      id: 'g04-50', exam: 'GATE CSE', year: 2004, q: 50, marks: 2, topic: 'Normal forms', type: 'mcq',
      stem: 'Student_Performance(name, courseNo, rollNo, grade) has the FDs name, courseNo → grade; rollNo, courseNo → grade; name → rollNo; rollNo → name. The highest normal form of this schema is',
      options: ['2NF', '3NF', 'BCNF', '4NF'],
      answer: 1,
      explain: [
        'Keys: (name, courseNo) and (rollNo, courseNo). name, rollNo, courseNo are prime.',
        'name → rollNo and rollNo → name have non-superkey left sides but prime right sides: allowed in 3NF, fatal for BCNF.'
      ],
      lab: { schema: 'Student_Performance(name, courseNo, rollNo, grade)', deps: 'name, courseNo -> grade\nrollNo, courseNo -> grade\nname -> rollNo\nrollNo -> name' }
    },
    {
      id: 'g03-85', exam: 'GATE CSE', year: 2003, q: 85, marks: 2, topic: 'Normal forms', type: 'mcq',
      stem: 'A database has the FDs Date_of_Birth → Age, Age → Eligibility, Name → Roll_number, Roll_number → Name, Course_number → Course_name, Course_number → Instructor, (Roll_number, Course_number) → Grade. The relation (Roll_number, Name, Date_of_Birth, Age) is',
      options: ['in 2NF, but not in 3NF', 'in 3NF, but not in BCNF', 'in BCNF', 'none of the above'],
      answer: 3,
      explain: [
        'Projected onto these four attributes: Date_of_Birth → Age, Name → Roll_number, Roll_number → Name.',
        'Keys: (Name, Date_of_Birth) and (Roll_number, Date_of_Birth). Age is the only non-prime attribute.',
        'Date_of_Birth → Age is a partial dependency, so the relation is only in 1NF. None of the listed options fit.'
      ],
      lab: { schema: 'R(Roll_number, Name, Date_of_Birth, Age)', deps: 'Date_of_Birth -> Age\nName -> Roll_number\nRoll_number -> Name' }
    },
    {
      id: 'g02-1-19', exam: 'GATE CSE', year: 2002, q: '1.19', marks: 1, topic: 'Theory', type: 'mcq',
      stem: 'A relation R with FD set F is decomposed into BCNF. The redundancy arising out of functional dependencies in the resulting relations is',
      options: ['zero', 'more than zero but less than that of an equivalent 3NF decomposition', 'proportional to the size of F⁺', 'indeterminate'],
      answer: 0,
      explain: ['In BCNF every determinant is a superkey, so no FD can force a value to repeat. Redundancy from multivalued dependencies can remain; 4NF handles that.']
    },
    {
      id: 'g01-2-23', exam: 'GATE CSE', year: 2001, q: '2.23', marks: 2, topic: 'Decomposition', type: 'mcq',
      stem: 'R(A, B, C, D) is a relation. Which of the following FD sets does not have a lossless-join, dependency-preserving BCNF decomposition?',
      options: ['A → B, B → CD', 'A → B, B → C, C → D', 'AB → C, C → AD', 'A → BCD'],
      answer: 2,
      explain: [
        'AB → C, C → AD: keys are AB and BC, and C → AD violates BCNF.',
        'Any BCNF split must separate C from B (C → A forbids ABC staying together), so no part contains A, B and C and AB → C is lost.',
        'A: AB, BCD. B: AB, BC, CD. D: already BCNF. Each is lossless and preserving.'
      ],
      lab: { schema: 'R(A, B, C, D)', deps: 'A, B -> C\nC -> A, D' }
    },
    {
      id: 'g99-1-24', exam: 'GATE CSE', year: 1999, q: '1.24', marks: 1, topic: 'Keys', type: 'mcq',
      stem: 'R = (A, B, C, D, E, F) has the dependencies C → F, E → A, EC → D, A → B. Which one of the following is a key for R?',
      options: ['CD', 'EC', 'AE', 'AC'],
      answer: 1,
      explain: ['C and E appear on no right side. (EC)⁺ adds F, A, D, then B: all six attributes.'],
      lab: { schema: 'R(A, B, C, D, E, F)', deps: 'C -> F\nE -> A\nE, C -> D\nA -> B' },
      alsoIn: 'Repeated in UGC NET June 2014 Paper II.'
    },
    {
      id: 'g14-2-22', exam: 'GATE CSE', year: 2014, set: 'Set 2', q: 22, marks: 1, topic: 'Table instances', type: 'nat',
      stem: 'An instance of the STUDENTS relation is shown below. For (StudentName, StudentAge) to be a key for this instance, the value X should NOT be equal to ____.',
      table: { cols: ['StudentID', 'StudentName', 'StudentEmail', 'StudentAge', 'CPI'], rows: [['2345', 'Shankar', 'shankar@math', 'X', '9.4'], ['1287', 'Swati', 'swati@ee', '19', '9.5'], ['7853', 'Shankar', 'shankar@cse', '19', '9.4'], ['9876', 'Swati', 'swati@mech', '18', '9.3'], ['8765', 'Ganesh', 'ganesh@civil', '19', '8.7']] },
      answer: 19,
      explain: [
        'A key may not repeat in any row of the instance.',
        'Shankar appears twice: once with age X and once with age 19.',
        'If X = 19, both rows have (Shankar, 19), so (StudentName, StudentAge) would not be unique. Any other value keeps it unique.'
      ],
      tableLab: true
    },
    {
      id: 'g02-2-25', exam: 'GATE CSE', year: 2002, q: '2.25', marks: 2, topic: 'Table instances', type: 'mcq',
      stem: 'From the following instance of a relation schema R(A, B, C), we can conclude that',
      table: { cols: ['A', 'B', 'C'], rows: [['1', '1', '1'], ['1', '1', '0'], ['2', '3', '2'], ['2', '3', '2']] },
      options: ['A functionally determines B and B functionally determines C', 'A functionally determines B and B does not functionally determine C', 'B does not functionally determine C', 'A does not functionally determine B and B does not functionally determine C'],
      answer: 2,
      explain: [
        'Rows 1 and 2 both have B = 1 but C = 1 and C = 0, so B → C is violated. That is certain.',
        'A → B holds in these rows, but a dependency is a statement about every legal instance of the schema. One instance can refute a dependency, never establish it, so “A determines B” cannot be concluded.',
        'Only C makes no claim beyond what the data shows.'
      ],
      tableLab: true
    },
    {
      id: 'g00-2-24', exam: 'GATE CSE', year: 2000, q: '2.24', marks: 2, topic: 'Table instances', type: 'mcq',
      stem: 'Which of the following functional dependencies are satisfied by the relation instance below?',
      table: { cols: ['X', 'Y', 'Z'], rows: [['1', '4', '2'], ['1', '5', '3'], ['1', '6', '3'], ['3', '2', '2']] },
      options: ['XY → Z and Z → Y', 'YZ → X and Y → Z', 'YZ → X and X → Z', 'XZ → Y and Y → X'],
      answer: 1,
      explain: [
        'Every Y value is different, so any dependency with Y on the left cannot be contradicted: Y → Z and YZ → X hold.',
        'Z → Y fails: rows 1 and 4 have Z = 2 but Y = 4 and 2.',
        'X → Z fails: rows 1 and 2 have X = 1 but Z = 2 and 3.',
        'XZ → Y fails: rows 2 and 3 have (X, Z) = (1, 3) but Y = 5 and 6.'
      ],
      tableLab: true
    },
    {
      id: 'net-aug24-24', exam: 'UGC NET CSE', year: 2024, set: 'Aug', q: 24, marks: 2, topic: 'Theory', type: 'mcq',
      stem: 'Fifth normal form is concerned with',
      options: ['Join dependency', 'Domain-key', 'Multivalued dependency', 'Functional dependency'],
      answer: 0,
      explain: ['5NF (project–join normal form) removes join dependencies not implied by candidate keys. MVDs are the concern of 4NF.']
    }
  ];
  root.PYQ = PYQ;
  if (typeof module !== 'undefined') module.exports = PYQ;
})(typeof window !== 'undefined' ? window : globalThis);
