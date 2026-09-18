// App.jsx — the only file all three members touch, and only on integration day.
// It holds the state, calls the logic layer once, and hands the result to the
// components. No algorithm lives here; no component reaches into the logic
// layer for anything the analysis object does not already contain.

import { useState, useEffect, useCallback, useRef } from 'react';

import { parseInput } from './logic/parser.js';
import { getCandidateKeys } from './logic/keys.js';
import { getMinimalCover } from './logic/minimalCover.js';
import { checkNormalForm } from './logic/normalForms.js';
import { decomposeTo3NF } from './logic/decompose3NF.js';
import { decomposeToBCNF } from './logic/decomposeBCNF.js';
import { check4NF, decomposeTo4NF, check5NF } from './logic/higherNF.js';

import RelationRail from './components/RelationRail.jsx';
import RelationInput from './components/RelationInput.jsx';
import ClosureTrace from './components/ClosureTrace.jsx';
import MinimalCoverView from './components/MinimalCoverView.jsx';
import NFVerdict from './components/NFVerdict.jsx';
import DecompositionView from './components/DecompositionView.jsx';
import HigherNFPanel from './components/HigherNFPanel.jsx';
import AnomalyDemo from './components/AnomalyDemo.jsx';
import PracticeQuiz from './components/PracticeQuiz.jsx';
import LearnPanel from './components/LearnPanel.jsx';
import HelpPanel from './components/HelpPanel.jsx';
import DevelopedBy from './components/DevelopedBy.jsx';
import DownloadPanel from './components/DownloadPanel.jsx';
import DependencyGraph from './components/DependencyGraph.jsx';

import { loadState, saveState } from './storage.js';
import { getTheme, applyTheme, DAY, NIGHT } from './theme.js';

// The working sections, left to right in the order a student uses them.
const TABS = [
  { id: 'input', label: 'Setup', needsAnalysis: false },
  { id: 'nf', label: 'Normal form', needsAnalysis: true },
  { id: 'closure', label: 'Closure', needsAnalysis: true },
  { id: 'cover', label: 'Cover', needsAnalysis: true },
  { id: 'decomp', label: 'Decomposition', needsAnalysis: true },
  { id: 'higher', label: '4NF · 5NF', needsAnalysis: true },
  { id: 'graph', label: 'Graph', needsAnalysis: true },
  { id: 'anomaly', label: 'Anomalies', needsAnalysis: false },
  { id: 'quiz', label: 'Practice', needsAnalysis: false },
];

// The mandatory sections, pinned to the top right where the brief asks for them.
const UTILITY = [
  { id: 'learn', label: 'Learn' },
  { id: 'help', label: 'Help' },
  { id: 'about', label: 'Developed By' },
  { id: 'download', label: 'Download' },
];
const ALL = [...TABS, ...UTILITY.map((u) => ({ ...u, needsAnalysis: false }))];

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
  // What the current analysis was computed FROM. Comparing it against the live
  // input is how we know the displayed results have gone stale.
  const [analysedFor, setAnalysedFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(boot.saved);
  const [quiz, setQuiz] = useState(boot.quiz);
  const [visitedTheory, setVisitedTheory] = useState(boot.visitedTheory);
  const [theme, setTheme] = useState(getTheme);

  // Parse on every keystroke so validation feedback is immediate; the heavy
  // analysis only runs when the student asks for it.
  const parsed = relationText.trim() ? parseInput(relationText, depText) : null;

  const stale = !!analysis && analysedFor !== null &&
    (analysedFor.r !== relationText || analysedFor.d !== depText);

  useEffect(() => { saveState({ relationText, depText }); }, [relationText, depText]);
  useEffect(() => { saveState({ quiz }); }, [quiz]);
  useEffect(() => { saveState({ visitedTheory }); }, [visitedTheory]);

  const handleChange = useCallback((r, d) => {
    setRelationText(r);
    setDepText(d);
    // The analysis is deliberately NOT cleared here. Clearing it would empty
    // the rail mid-keystroke; instead it is marked stale and the interface says
    // so, which is honest without being disruptive.
  }, []);

  const analyse = useCallback(() => {
    setBusy(true);
    // Yield a frame so the button can repaint before a potentially long run.
    setTimeout(() => {
      try {
        const a = runAnalysis(relationText, depText);
        setAnalysis(a);
        setAnalysedFor(a ? { r: relationText, d: depText } : null);
        if (a && tab === 'input') setTab('nf');
      } finally {
        setBusy(false);
      }
    }, 20);
  }, [relationText, depText, tab]);

  const loadExample = useCallback((r, d) => {
    setRelationText(r);
    setDepText(d);
    setTab('input');
  }, []);

  const visitTheory = useCallback((id) => {
    setVisitedTheory((v) => (v.includes(id) ? v : [...v, id]));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => applyTheme(t === NIGHT ? DAY : NIGHT));
  }, []);

  // Keyboard support for the tab list, per the WAI-ARIA tabs pattern: arrow keys
  // move between tabs, Home/End jump to the ends, and only the selected tab is
  // in the natural tab order (roving tabindex) so Tab leaves the list in one press.
  const tabRefs = useRef({});
  const enabledTabs = TABS.filter((t) => !(t.needsAnalysis && !analysis));
  const isSectionTab = TABS.some((t) => t.id === tab);

  const onTabKeyDown = (e) => {
    if (!isSectionTab) return;
    const i = enabledTabs.findIndex((t) => t.id === tab);
    if (i < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = enabledTabs[(i + 1) % enabledTabs.length];
    else if (e.key === 'ArrowLeft') next = enabledTabs[(i - 1 + enabledTabs.length) % enabledTabs.length];
    else if (e.key === 'Home') next = enabledTabs[0];
    else if (e.key === 'End') next = enabledTabs[enabledTabs.length - 1];
    if (!next) return;
    e.preventDefault();
    setTab(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <div className="app">
      <a className="skip" href="#results">Skip to results</a>

      <aside className="masthead" aria-label="Relation input">
        <h1>Normalization<br />Virtual Lab</h1>
        <p>
          Every normal form from 1NF to 5NF, decomposed by two algorithms, with the
          reasoning shown at each step rather than only the answer.
        </p>

        <div style={{ marginTop: 26 }}>
          <RelationRail
            relationText={relationText}
            depText={depText}
            onChange={handleChange}
            onAnalyse={analyse}
            parsed={parsed}
            analysis={analysis}
            busy={busy}
            stale={stale}
          />
        </div>

        <div className="meta no-print">
          <span>BACSE202 · Database Systems</span>
          <span>Runs entirely in your browser</span>
        </div>
      </aside>

      <main className="panel" id="results">
        {/* The mandatory sections sit top-right, as the brief specifies, with
            the Day/Night control at the end of the same row. The whole header
            is sticky, so Learn and Help stay reachable however far you scroll. */}
        <div className="topbar no-print">
        <div className="utility">
          {UTILITY.map((u) => (
            <button
              key={u.id}
              aria-current={tab === u.id}
              onClick={() => setTab(u.id)}
            >
              {u.label}
            </button>
          ))}
          <span className="sep" aria-hidden="true" />
          <button
            className="theme-btn"
            onClick={toggleTheme}
            aria-pressed={theme === NIGHT}
            title={theme === NIGHT ? 'Switch to day mode' : 'Switch to night mode'}
          >
            <span aria-hidden="true">{theme === NIGHT ? '☀️' : '🌙'}</span>
            {theme === NIGHT ? 'Day' : 'Night'}
          </button>
        </div>

        <div
          className="tabs"
          role="tablist"
          aria-label="Lab sections"
          onKeyDown={onTabKeyDown}
        >
          {TABS.map((t) => {
            const off = t.needsAnalysis && !analysis;
            return (
              <button
                key={t.id}
                ref={(el) => { tabRefs.current[t.id] = el; }}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="tabpanel"
                tabIndex={tab === t.id ? 0 : -1}
                disabled={off}
                title={off ? 'Analyse a relation first' : undefined}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        </div>

        <div
          id="tabpanel"
          role="tabpanel"
          aria-labelledby={isSectionTab ? `tab-${tab}` : undefined}
          aria-label={isSectionTab ? undefined : (ALL.find((t) => t.id === tab)?.label ?? 'Results')}
          tabIndex={-1}
        >

        {stale && tab !== 'input' && (
          <div className="stale-bar no-print">
            The relation has changed since this was computed — press Analyse to update.
          </div>
        )}

        {tab === 'input' && (
          <RelationInput
            relationText={relationText}
            depText={depText}
            onChange={handleChange}
            parsed={parsed}
            analysis={analysis}
            saved={saved}
            onReloadSaved={() => setSaved(loadState().saved)}
          />
        )}
        {tab === 'closure' && <ClosureTrace analysis={analysis} />}
        {tab === 'cover' && <MinimalCoverView analysis={analysis} />}
        {tab === 'nf' && <NFVerdict analysis={analysis} />}
        {tab === 'decomp' && <DecompositionView analysis={analysis} />}
        {tab === 'higher' && <HigherNFPanel analysis={analysis} />}
        {tab === 'anomaly' && <AnomalyDemo onLoadExample={loadExample} />}
        {tab === 'quiz' && <PracticeQuiz quiz={quiz} onUpdate={setQuiz} />}
        {tab === 'graph' && (
          <div className="card">
            <h2>Dependency graph</h2>
            <p className="sub">
              The dependency set drawn as a directed graph. Reading a list tells you what determines
              what; seeing the shape tells you why. A transitive chain is a path. A cycle means every
              attribute on it is a candidate key. An attribute nothing points at is essential — it
              must belong to every candidate key, because nothing can produce it.
            </p>
            <DependencyGraph analysis={analysis} />
          </div>
        )}
        {tab === 'learn' && <LearnPanel visited={visitedTheory} onVisit={visitTheory} />}
        {tab === 'help' && <HelpPanel onLoadExample={loadExample} />}
        {tab === 'about' && <DevelopedBy />}
        {tab === 'download' && <DownloadPanel analysis={analysis} />}
        </div>

        <footer className="footer no-print">
          Every result on this page is computed from your input at run time — no answers are
          stored. The 5NF check is deliberately scoped: it tests one join dependency you supply
          and does not claim to decide 5NF in general.
        </footer>
      </main>
    </div>
  );
}
