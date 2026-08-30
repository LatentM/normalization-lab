// App.jsx — the only file all three members touch, and only on integration day.
// It holds the state, calls the logic layer once, and hands the result to the
// components. No algorithm lives here; no component reaches into the logic layer
// for anything the analysis object does not already contain.

import { useState, useEffect, useCallback } from 'react';

import { parseInput } from './logic/parser.js';
import { getCandidateKeys } from './logic/keys.js';
import { getMinimalCover } from './logic/minimalCover.js';
import { checkNormalForm } from './logic/normalForms.js';
import { decomposeTo3NF } from './logic/decompose3NF.js';
import { decomposeToBCNF } from './logic/decomposeBCNF.js';
import { check4NF, decomposeTo4NF, check5NF } from './logic/higherNF.js';

import RelationInput from './components/RelationInput.jsx';
import ClosureTrace from './components/ClosureTrace.jsx';
import MinimalCoverView from './components/MinimalCoverView.jsx';
import NFVerdict from './components/NFVerdict.jsx';
import DecompositionView from './components/DecompositionView.jsx';
import HigherNFPanel from './components/HigherNFPanel.jsx';
import AnomalyDemo from './components/AnomalyDemo.jsx';
import TheoryNotes from './components/TheoryNotes.jsx';
import PracticeQuiz from './components/PracticeQuiz.jsx';
import SolutionExport from './components/SolutionExport.jsx';

import { loadState, saveState } from './storage.js';

const TABS = [
  { id: 'input', label: 'Input', needsAnalysis: false },
  { id: 'closure', label: 'Closure & keys', needsAnalysis: true },
  { id: 'cover', label: 'Minimal cover', needsAnalysis: true },
  { id: 'nf', label: 'Normal form', needsAnalysis: true },
  { id: 'decomp', label: 'Decomposition', needsAnalysis: true },
  { id: 'higher', label: 'Higher forms', needsAnalysis: true },
  { id: 'anomaly', label: 'Anomalies', needsAnalysis: false },
  { id: 'theory', label: 'Theory', needsAnalysis: false },
  { id: 'quiz', label: 'Practice', needsAnalysis: false },
  { id: 'export', label: 'Export', needsAnalysis: true },
];

/**
 * The single entry point into the logic layer.
 * Every tab reads from the object this returns; nothing recomputes.
 */
function runAnalysis(relationText, depText) {
  const parsed = parseInput(relationText, depText);
  if (parsed.errors.length || parsed.attributes.length === 0) return null;

  const { fds, mvds, jds, attributes } = parsed;

  const keys = getCandidateKeys(attributes, fds);
  const minimalCover = getMinimalCover(fds);
  const normalForm = checkNormalForm(attributes, fds, keys.candidateKeys);
  const three = decomposeTo3NF(attributes, fds);
  const bcnf = decomposeToBCNF(attributes, fds);

  const four = check4NF(attributes, fds, mvds, keys.candidateKeys);
  const four_decomp = mvds.length ? decomposeTo4NF(attributes, fds, mvds) : null;
  const five = jds.length ? check5NF(attributes, fds, jds[0]) : null;

  return {
    parsed,
    keys,
    minimalCover,
    normalForm,
    decomposition: { three, bcnf },
    higher: { four, four_decomp, five },
    computedAt: Date.now(),
  };
}

export default function App() {
  const boot = loadState();

  const [relationText, setRelationText] = useState(boot.relationText);
  const [depText, setDepText] = useState(boot.depText);
  const [tab, setTab] = useState('input');
  const [analysis, setAnalysis] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(boot.saved);
  const [quiz, setQuiz] = useState(boot.quiz);
  const [visitedTheory, setVisitedTheory] = useState(boot.visitedTheory);

  // Parse on every keystroke so validation feedback is immediate; the heavy
  // analysis only runs when the student asks for it.
  const parsed = relationText.trim() ? parseInput(relationText, depText) : null;

  useEffect(() => { saveState({ relationText, depText }); }, [relationText, depText]);
  useEffect(() => { saveState({ quiz }); }, [quiz]);
  useEffect(() => { saveState({ visitedTheory }); }, [visitedTheory]);

  const handleChange = useCallback((r, d) => {
    setRelationText(r);
    setDepText(d);
    setAnalysis(null); // an old result next to new input is worse than no result
  }, []);

  const analyse = useCallback(() => {
    setBusy(true);
    // Yield a frame so the button can repaint before a potentially long run.
    setTimeout(() => {
      try {
        const a = runAnalysis(relationText, depText);
        setAnalysis(a);
        if (a) setTab('nf');
      } finally {
        setBusy(false);
      }
    }, 20);
  }, [relationText, depText]);

  const loadExample = useCallback((r, d) => {
    setRelationText(r);
    setDepText(d);
    setAnalysis(null);
    setTab('input');
  }, []);

  const visitTheory = useCallback((id) => {
    setVisitedTheory((v) => (v.includes(id) ? v : [...v, id]));
  }, []);

  return (
    <div className="app">
      <header className="masthead">
        <h1>Normalization Virtual Lab</h1>
        <p>
          Enter a relation and its dependencies. The lab performs the complete normalization workflow —
          closure, keys, minimal cover, normal-form diagnosis, decomposition by two algorithms, and
          verification of lossless join and dependency preservation — showing every intermediate step
          rather than only the final answer.
        </p>
        <div className="meta">
          <span className="pill">BACSE202 · Database Systems</span>
          <span>Runs entirely in your browser · nothing is uploaded</span>
          {analysis && <span className="pill">analysed: R({analysis.parsed.attributes.join(', ')})</span>}
        </div>
      </header>

      <nav className="tabs no-print" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            disabled={t.needsAnalysis && !analysis}
            title={t.needsAnalysis && !analysis ? 'Analyse a relation first' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="panel" role="tabpanel">
        {tab === 'input' && (
          <RelationInput
            relationText={relationText}
            depText={depText}
            onChange={handleChange}
            onAnalyse={analyse}
            parsed={parsed}
            analysis={analysis}
            saved={saved}
            onReloadSaved={() => setSaved(loadState().saved)}
            busy={busy}
          />
        )}
        {tab === 'closure' && <ClosureTrace parsed={analysis?.parsed} analysis={analysis} />}
        {tab === 'cover' && <MinimalCoverView analysis={analysis} />}
        {tab === 'nf' && <NFVerdict analysis={analysis} />}
        {tab === 'decomp' && <DecompositionView analysis={analysis} />}
        {tab === 'higher' && <HigherNFPanel analysis={analysis} />}
        {tab === 'anomaly' && <AnomalyDemo onLoadExample={loadExample} />}
        {tab === 'theory' && <TheoryNotes visited={visitedTheory} onVisit={visitTheory} />}
        {tab === 'quiz' && <PracticeQuiz quiz={quiz} onUpdate={setQuiz} />}
        {tab === 'export' && <SolutionExport analysis={analysis} />}
      </main>

      <footer className="footer no-print">
        Normalization Virtual Lab · every result on this page is computed from your input at run time —
        no answers are stored. The 5NF check is deliberately scoped: it tests one join dependency you supply
        and does not claim to decide 5NF in general.
      </footer>
    </div>
  );
}
