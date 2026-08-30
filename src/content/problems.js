// problems.js — Member C's file. Ten auto-graded practice problems.
//
// Every answer here was solved by hand FIRST and then cross-checked against the
// logic layer by verify-problems.mjs. Where the two disagreed, the hand solution
// was re-derived before either was changed. This file is the ground truth the
// project plan asks for in Section 9.
//
// Answer formats:
//   type 'mcq'  → answer is the index of the correct option
//   type 'set'  → answer is a list of acceptable strings; grading is
//                 case-insensitive and ignores spaces, commas and order,
//                 so "AB", "ab", "B,A" and "{A, B}" all match.

export const PROBLEMS = [
  {
    id: 1,
    topic: 'Attribute closure',
    difficulty: 'Warm-up',
    relation: 'A, B, C, D, E',
    deps: 'A -> B\nB -> C\nC,D -> E',
    question: 'Compute the closure {A, D}⁺.',
    type: 'set',
    answer: ['ABCDE'],
    hint: 'Start with {A, D}. A → B fires. Then B → C fires. Now you hold C and D, so CD → E fires.',
    explanation:
      '{A,D}⁺ starts as AD. A → B adds B (ABD). B → C adds C (ABCD). Now both C and D are present, so CD → E adds E. Result ABCDE — which is the whole relation, so AD is a superkey.',
  },
  {
    id: 2,
    topic: 'Candidate keys',
    difficulty: 'Warm-up',
    relation: 'A, B, C, D',
    deps: 'A -> B\nB -> C\nC -> D',
    question: 'What is the only candidate key of this relation?',
    type: 'mcq',
    options: ['A', 'AB', 'D', 'ABCD'],
    answer: 0,
    hint: 'Which attribute never appears on the right-hand side of any dependency? Nothing can determine it, so it must be in every key.',
    explanation:
      'A never appears on a right-hand side, so it must belong to every candidate key. A⁺ = ABCD already covers the relation, so A alone is a candidate key — and therefore the only one.',
  },
  {
    id: 3,
    topic: 'Prime attributes',
    difficulty: 'Core',
    relation: 'A, B, C',
    deps: 'A,B -> C\nC -> A',
    question: 'Which attributes are PRIME (appear in at least one candidate key)?',
    type: 'set',
    answer: ['ABC'],
    hint: 'Find every candidate key first. There are two of them, and between them they use every attribute.',
    explanation:
      'AB⁺ = ABC and BC⁺ = BCA, so the candidate keys are AB and BC. Their union is {A, B, C}, so every attribute is prime and there are no non-prime attributes at all. That is exactly why this relation is in 3NF despite C → A.',
  },
  {
    id: 4,
    topic: '2NF',
    difficulty: 'Core',
    relation: 'A, B, C, D',
    deps: 'A,B -> C\nA -> D',
    question: 'What is the highest normal form this relation satisfies?',
    type: 'mcq',
    options: ['1NF', '2NF', '3NF', 'BCNF'],
    answer: 0,
    hint: 'The candidate key is AB. Is A a proper subset of it? Is D prime or non-prime?',
    explanation:
      'The candidate key is AB, so prime = {A, B} and non-prime = {C, D}. A → D has A as a proper subset of the key AB, and D is non-prime. That is a partial dependency, so 2NF fails and the relation reaches only 1NF.',
  },
  {
    id: 5,
    topic: '3NF vs BCNF',
    difficulty: 'Core',
    relation: 'A, B, C',
    deps: 'A,B -> C\nC -> B',
    question: 'What is the highest normal form this relation satisfies?',
    type: 'mcq',
    options: ['1NF', '2NF', '3NF', 'BCNF'],
    answer: 2,
    hint: 'Candidate keys are AB and AC. Is C a superkey? Is B prime?',
    explanation:
      'AB⁺ = ABC and AC⁺ = ACB, so the candidate keys are AB and AC; prime = {A, B, C}. C → B has a non-superkey on the left (C⁺ = CB only), so BCNF fails. But B is prime, so 3NF\'s escape clause applies and 3NF holds. This is the canonical "3NF but not BCNF" shape.',
  },
  {
    id: 6,
    topic: 'Minimal cover',
    difficulty: 'Core',
    relation: 'A, B, C, D',
    deps: 'A -> B\nA,B -> C\nA -> C\nC -> D',
    question: 'How many dependencies remain in the minimal cover?',
    type: 'mcq',
    options: ['2', '3', '4', '5'],
    answer: 1,
    hint: 'AB → C has an extraneous B (A alone already gives C). After that reduction you have a duplicate, and duplicates collapse.',
    explanation:
      'Right sides are already single attributes. In AB → C, drop B: A⁺ = ABC still contains C, so B was extraneous and AB → C becomes A → C — a duplicate of the A → C already present, which collapses. Remaining: A → B, A → C, C → D. Nothing else is redundant, so the cover has 3 dependencies.',
  },
  {
    id: 7,
    topic: 'Lossless join',
    difficulty: 'Core',
    relation: 'A, B, C',
    deps: 'A -> B\nB -> C',
    question: 'Is the decomposition into R₁(A, B) and R₂(B, C) lossless?',
    type: 'mcq',
    options: ['Yes — lossless', 'No — lossy'],
    answer: 0,
    hint: 'For a two-way split, test whether R₁ ∩ R₂ determines all of R₁ or all of R₂.',
    explanation:
      'R₁ ∩ R₂ = {B}, and B⁺ = BC, which contains R₂ = BC in full. The common attribute is a key of one of the fragments, so the join reproduces the original exactly — lossless.',
  },
  {
    id: 8,
    topic: 'Dependency preservation',
    difficulty: 'Hard',
    relation: 'A, B, C',
    deps: 'A,B -> C\nC -> A',
    question: 'Decomposing into R₁(A, C) and R₂(B, C), which original dependency can no longer be checked inside a single fragment?',
    type: 'set',
    answer: ['AB->C', 'AB→C', 'ABC', 'AB-C'],
    hint: 'One fragment holds A and C; the other holds B and C. Which dependency needs A and B together on its left?',
    explanation:
      'C → A lives entirely inside R₁(A, C), so it is preserved. AB → C needs A and B in the same relation, and no fragment contains both. Enforcing it would require joining R₁ and R₂ on every insert — the decomposition is lossless but not dependency preserving. This is the exact cost BCNF sometimes charges.',
  },
  {
    id: 9,
    topic: '4NF',
    difficulty: 'Hard',
    relation: 'A, B, C',
    deps: 'A ->> B',
    question: 'The relation has no functional dependencies, only A ↠ B. Which normal form does it reach?',
    type: 'mcq',
    options: ['1NF only', '2NF', 'BCNF but not 4NF', '4NF'],
    answer: 2,
    hint: 'With no FDs at all, what is the candidate key? Now ask whether the left side of the MVD is a superkey.',
    explanation:
      'With no functional dependencies the only candidate key is ABC itself, so there are no non-trivial FDs to break any form up to BCNF — the relation is in BCNF. But A ↠ B is non-trivial (B ⊄ A and AB ≠ ABC) and A is not a superkey, so 4NF fails. Decompose into (A, B) and (A, C).',
  },
  {
    id: 10,
    topic: 'Synthesis vs analysis',
    difficulty: 'Hard',
    relation: 'A, B, C, D',
    deps: 'A,B -> C\nC -> D\nD -> A',
    question: 'Which statement about decomposing this relation is TRUE?',
    type: 'mcq',
    options: [
      'BCNF decomposition preserves all dependencies; 3NF synthesis does not',
      '3NF synthesis preserves all dependencies; BCNF decomposition loses AB → C',
      'Both preserve all dependencies',
      'Neither decomposition is lossless',
    ],
    answer: 1,
    hint: 'The candidate keys are AB, BC and BD. Which algorithm is guaranteed to preserve dependencies by construction?',
    explanation:
      '3NF synthesis builds one relation per dependency in the minimal cover, so every dependency sits inside a fragment by construction — preservation is guaranteed, and losslessness comes from adding a candidate key relation. BCNF analysis splits on C → D and then D → A, ending with AD, CD and BC; no fragment holds A and B together, so AB → C is lost. Both are lossless; only 3NF is dependency preserving.',
  },
];

export const QUIZ_META = {
  passMark: 7,
  total: PROBLEMS.length,
  intro:
    'Ten problems, roughly in teaching order. Answers are graded on the spot. Use the hint before the explanation — the hint tells you which rule to reach for, the explanation gives the whole derivation.',
};
