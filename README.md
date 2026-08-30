# Normalization Virtual Lab

An interactive, browser-based virtual laboratory for relational database normalization.
Enter a relation schema with its functional, multivalued and join dependencies, and the lab
performs the complete normalization workflow — **showing every intermediate step rather than
only the final answer.**

Course: BACSE202 — Database Systems, VIT Chennai.

---

## What it does

| Feature | Where |
|---|---|
| Parse a relation, FDs, MVDs and join dependencies, with validation | Input tab |
| Attribute closure X⁺ with the dependency applied at each step | Closure & keys |
| All superkeys and candidate keys; prime / non-prime classification | Closure & keys |
| Minimal cover with all three reduction stages shown | Minimal cover |
| Normal-form diagnosis 1NF → BCNF, naming the exact blocking dependency | Normal form |
| 3NF decomposition by synthesis | Decomposition |
| BCNF decomposition by recursive analysis | Decomposition |
| Lossless-join verification by the chase (tableau shown) | Decomposition |
| Dependency-preservation verification, dependency by dependency | Decomposition |
| Side-by-side comparison of the 3NF and BCNF results | Decomposition |
| MVD input, 4NF diagnosis and 4NF decomposition | Higher forms |
| Join-dependency input and a scoped 5NF check | Higher forms |
| Live insert / update / delete anomaly demonstration | Anomalies |
| Theory notes for all five normal forms | Theory |
| 10 auto-graded practice problems with hints and scoring | Practice |
| Printable / copyable worked solution | Export |
| Session persistence — saved relations and quiz progress | localStorage |

Everything runs client-side. No backend, no accounts, nothing uploaded.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

Build and preview a production bundle:

```bash
npm run build
npm run preview
```

Deploy by dragging the generated `dist/` folder onto <https://app.netlify.com/drop>.

**Environment note.** On Windows, run Node and Vite natively — not inside WSL against a
`/mnt/c/...` path. npm is dramatically slower across that boundary and WSL port forwarding is
an avoidable failure point.

---

## Verifying correctness

Two test harnesses run in plain Node, with no test framework to install:

```bash
npm run verify           # 45 checks: the project plan's appendix test cases + edge cases
npm run verify:problems  # 52 checks: every quiz answer, hand-solved, vs. the engine
npm test                 # both
```

`verify.mjs` covers the nine appendix cases plus the Saturday edge-case checklist —
single-attribute relations, all attributes forming one key, duplicate dependencies, an FD whose
RHS is already in its LHS, empty input, trivial MVDs, and a 10-attribute relation.

`verify-problems.mjs` re-derives every practice answer through the logic layer. If a hand
solution and the code ever disagree, neither is assumed right until the disagreement is settled
by hand.

> **One correction to the project plan.** The plan's Appendix, row 5 —
> `R(A,B,C,D,E)` with `A→B, BC→D, E→C` — is listed as **2NF**. That is wrong. The only
> candidate key is `AE`; `A` is a *proper* subset of it and `A→B` with `B` non-prime is a
> textbook partial dependency (`E→C` is a second one). The correct answer is **1NF**.
> The test file records the corrected value with a comment. Fix the row in the report before
> submission.

---

## Architecture

Two layers: a pure computation layer with no UI dependency, and a presentation layer that
consumes it.

```
src/
├── logic/                 ← pure JavaScript, zero React, zero DOM
│   ├── setOps.js          set helpers shared by everything below
│   ├── parser.js          parse relation, FDs, MVDs, JDs into objects
│   ├── closure.js         attribute closure with step trace
│   ├── keys.js            superkeys, candidate keys, prime attributes
│   ├── minimalCover.js    canonical cover with reduction trace
│   ├── normalForms.js     1NF–BCNF diagnosis with violating dependency
│   ├── decompose3NF.js    synthesis algorithm
│   ├── decomposeBCNF.js   recursive analysis algorithm
│   ├── properties.js      lossless join (chase), dependency preservation
│   └── higherNF.js        MVD handling, 4NF, 5NF join-dependency check
│
├── components/            ← JSX only
│   ├── atoms.jsx          Set / Fd / SetList / Empty
│   ├── RelationInput.jsx
│   ├── ClosureTrace.jsx
│   ├── MinimalCoverView.jsx
│   ├── NFVerdict.jsx
│   ├── DecompositionView.jsx    3NF vs BCNF side by side
│   ├── HigherNFPanel.jsx        4NF / 5NF
│   ├── AnomalyDemo.jsx
│   ├── TheoryNotes.jsx
│   ├── PracticeQuiz.jsx
│   └── SolutionExport.jsx
│
├── content/               ← plain data, no logic
│   ├── theory.js          notes per normal form, anomaly table, presets
│   └── problems.js        10 practice questions + verified answers
│
├── storage.js             localStorage save/load helpers
├── App.jsx                integration point — holds state, calls logic once
└── index.css              the whole visual layer
```

Three people edit three disjoint sets of files. `App.jsx` and `storage.js` are the only shared
files and are touched only during integration — that is the entire merge-conflict strategy.

Every function in `src/logic/` is **pure**: same input, same output, no side effects, no DOM
access. That is what makes them testable from Node and from the browser console before any UI
exists.

---

## Function contracts

```js
parseInput(relationText, depText)
  → { attributes, fds, mvds, jds, errors, warnings }

getClosure(attributes, fds)
  → { closure, steps: [{ fdUsed, added, closureSoFar, explanation }] }

getCandidateKeys(attributes, fds)
  → { candidateKeys, superKeys, primeAttributes, nonPrimeAttributes, essential, steps }

getMinimalCover(fds)
  → { cover, steps: [{ stage, fdAffected, reason }] }
      // stages: 'singleton-rhs' | 'remove-extraneous-lhs' | 'remove-redundant-fd'

checkNormalForm(attributes, fds, candidateKeys)
  → { highestNF, violations, checks, partialDependencies, transitiveDependencies,
      bcnfViolations, primeAttributes, nonPrimeAttributes }

decomposeTo3NF(attributes, fds)
  → { relations, lossless, dependencyPreserving, losslessDetail, dependencyDetail, steps }

decomposeToBCNF(attributes, fds)
  → { relations, lossless, dependencyPreserving, losslessDetail, dependencyDetail, steps }

isLossless(originalAttributes, subRelations, fds)  → { lossless, reason, tableau, history, shortcut }
isDependencyPreserving(originalFds, subRelations)  → { preserved, lostFds, checks, reason }
projectFds(subAttributes, fds)                     → [{ lhs, rhs }]

check4NF(attributes, fds, mvds, candidateKeys)     → { is4NF, violations, notes, bcnfFirst }
decomposeTo4NF(attributes, fds, mvds)              → { relations, steps, lossless, summary }
check5NF(attributes, fds, joinDependency)          → { is5NF, reason, holds, tableau, components, scope }
```

---

## Input syntax

```
Relation:      A, B, C, D        or   R(A, B, C, D)        or   ABCD
Functional:    A,B -> C          or   AB -> C
Multivalued:   A ->> B
Join:          *(AB, BC, CA)
Comment:       # anything after a hash is ignored
```

Arrows may also be written `-->`, `=>`, `→`, `↠`. Attributes that appear in a dependency but
not in the relation are added automatically, with a warning.

---

## Scope and limits, stated honestly

**Relation size.** Up to 10 attributes is comfortable. Finding *all* candidate keys requires
examining 2ⁿ subsets and is NP-hard in general; the lab enumerates subsets smallest-first and
prunes supersets of keys already found, which is the standard practical compromise, not a way
around the complexity. Beyond 10 attributes the parser warns and the computation still runs,
but expect a visible pause.

**The 5NF check.** Deciding 5NF in general is not possible from a dependency set alone: no
procedure enumerates every join dependency holding on a relation. The lab implements the
standard practical check — you supply one join dependency, and it tests (1) whether that JD
holds under your FDs, by the chase, and (2) whether every component is a superkey. A pass means
*"this join dependency does not violate 5NF"*, never *"the relation is in 5NF"*. The interface
says so in the same words. Claiming a complete 5NF decider would be wrong, and a viva examiner
may well probe it.

**BCNF decomposition is not unique.** Which violating dependency you split on first changes the
shape of the result. The lab always takes the first violation in the order you typed your
dependencies, and states that rather than hiding the choice.

**1NF is assumed.** Atomicity is a property of the stored values, not of the dependency set, so
no dependency set can prove or disprove it. The lab says "assumed" instead of pretending to
test it.

---

## Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React 18 via Vite | Fast dev server, no config, component reuse |
| Language | JavaScript (ES6+) | No TypeScript overhead in a short build |
| Styling | Single plain CSS file | No config step, no build risk |
| State | React `useState` only | One screen's worth of state; no Redux, no context |
| Persistence | Browser localStorage | No backend, no accounts, no hosting cost |
| Hosting | Netlify Drop | Drag `dist/`; no account setup, no CLI |
| Tests | Plain Node scripts | No framework to install or configure |

Typefaces (IBM Plex Sans, IBM Plex Mono, Newsreader) load from Google Fonts with full local
fallback stacks, so the lab is completely legible offline or behind a firewall.
