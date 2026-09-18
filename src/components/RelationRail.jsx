// RelationRail.jsx — the relation lives here, permanently, in the left rail.
//
// The design decision this component exists to serve: in a normalization lab
// you change one dependency and immediately want to re-read a verdict. If the
// input is on its own tab, every such edit costs two navigations. Keeping the
// relation on screen at all times turns the app from a wizard into an
// instrument.

import { Set, Fd, SetList } from './atoms.jsx';
import { MAX_ATTRIBUTES } from '../logic/parser.js';

export default function RelationRail({
  relationText, depText, onChange, onAnalyse, parsed, analysis, busy, stale,
}) {
  const errors = parsed?.errors ?? [];
  const warnings = parsed?.warnings ?? [];

  return (
    <>
      <label className="field">
        <span>Relation</span>
        <input
          type="text"
          value={relationText}
          placeholder="A, B, C, D"
          spellCheck="false"
          onChange={(e) => onChange(e.target.value, depText)}
        />
      </label>

      <label className="field">
        <span>Dependencies</span>
        <textarea
          value={depText}
          placeholder={'A,B -> C\nC -> D\nA ->> B\n*(A B, B C, C A)'}
          spellCheck="false"
          onChange={(e) => onChange(relationText, e.target.value)}
        />
      </label>

      <div className="hint">
        <code>-&gt;</code> functional · <code>-&gt;&gt;</code> multivalued ·{' '}
        <code>*( )</code> join · <code>#</code> comment
      </div>

      {errors.length > 0 && (
        <div className="msg error" style={{ marginTop: 14 }}>
          <ul style={{ margin: 0 }}>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}
      {errors.length === 0 && warnings.length > 0 && (
        <div className="msg warn" style={{ marginTop: 14 }}>
          <ul style={{ margin: 0 }}>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      <div className="btn-row" style={{ marginTop: 16 }}>
        <button
          className="btn"
          onClick={onAnalyse}
          disabled={busy || errors.length > 0 || !relationText.trim()}
        >
          {busy ? 'Computing' : stale ? 'Re-analyse' : 'Analyse'}
        </button>
        {(relationText || depText) && (
          <button className="btn ghost" onClick={() => onChange('', '')}>Clear</button>
        )}
      </div>

      {parsed && parsed.attributes.length > MAX_ATTRIBUTES && (
        <div className="msg warn" style={{ marginTop: 14 }}>
          {parsed.attributes.length} attributes — 2<sup>{parsed.attributes.length}</sup> subsets to
          examine. Expect a pause.
        </div>
      )}

      {/* The standing facts. Once analysed, these never leave the screen. */}
      {analysis && (
        <div className={`rail-facts${stale ? ' stale' : ''}`}>
          <div className="rf">
            <b>Relation</b>
            <Set of={analysis.parsed.attributes} />
          </div>
          <div className="rf">
            <b>Candidate keys</b>
            <SetList items={analysis.keys.candidateKeys} tone="key" />
          </div>
          <div className="rf">
            <b>Non-prime</b>
            {analysis.keys.nonPrimeAttributes.length
              ? <Set of={analysis.keys.nonPrimeAttributes} />
              : <span className="muted">none</span>}
          </div>
          <div className="rf">
            <b>Highest form</b>
            <span className="rf-nf">{analysis.normalForm.highestNF}</span>
          </div>
          {analysis.parsed.fds.length > 0 && (
            <div className="rf">
              <b>Dependencies</b>
              <span className="rf-fds">
                {analysis.parsed.fds.map((f, i) => <Fd key={i} of={f} />)}
                {analysis.parsed.mvds.map((f, i) => <Fd key={`m${i}`} of={f} />)}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
