// RelationInput.jsx — the one place the student types anything.
import { useState } from 'react';
import { PRESETS } from '../content/theory.js';
import { MAX_ATTRIBUTES } from '../logic/parser.js';
import { Set, Fd, SetList } from './atoms.jsx';
import { saveRelation, deleteRelation, isStorageAvailable } from '../storage.js';

export default function RelationInput({
  relationText, depText, onChange, onAnalyse, parsed, analysis, saved, onReloadSaved, busy,
}) {
  const [saveName, setSaveName] = useState('');
  const storageOk = isStorageAvailable();

  const applyPreset = (p) => onChange(p.relation, p.deps);

  const doSave = () => {
    if (!relationText.trim()) return;
    saveRelation(saveName.trim(), relationText, depText);
    setSaveName('');
    onReloadSaved();
  };

  const errors = parsed?.errors ?? [];
  const warnings = parsed?.warnings ?? [];
  const tooBig = (parsed?.attributes?.length ?? 0) > MAX_ATTRIBUTES;

  return (
    <>
      <div className="card">
        <h2>Define a relation</h2>
        <p className="sub">
          Type the attributes and the dependencies that hold on them. Everything else in this lab is
          computed from these two boxes — nothing is hard-coded.
        </p>

        <div className="grid-2">
          <div>
            <label className="field">
              <span>Relation schema</span>
              <input
                type="text"
                value={relationText}
                placeholder="A, B, C, D   or   R(A, B, C, D)"
                onChange={(e) => onChange(e.target.value, depText)}
              />
            </label>
            <div className="hint">
              Single capital letters may be written without commas: <code>ABCD</code>. Longer names are
              fine too — <code>StudentId, CourseId, Grade</code>.
            </div>

            <h3 style={{ marginTop: 24 }}>Worked examples</h3>
            <div className="presets">
              {PRESETS.map((p) => (
                <button key={p.label} type="button" onClick={() => applyPreset(p)} title={p.note}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field">
              <span>Dependencies — one per line</span>
              <textarea
                value={depText}
                placeholder={'A,B -> C\nC -> D\nA ->> B\n*(A B, B C, C A)'}
                onChange={(e) => onChange(relationText, e.target.value)}
              />
            </label>
            <div className="hint">
              <code>-&gt;</code> functional dependency &nbsp;·&nbsp; <code>-&gt;&gt;</code> multivalued
              dependency &nbsp;·&nbsp; <code>*(AB, BC, CA)</code> join dependency &nbsp;·&nbsp;{' '}
              <code>#</code> starts a comment.
            </div>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="msg error">
            <b>{errors.length} problem{errors.length > 1 ? 's' : ''} with the input</b>
            <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="msg warn">
            <b>Notes</b>
            <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        )}
        {tooBig && (
          <div className="msg warn">
            {parsed.attributes.length} attributes means 2<sup>{parsed.attributes.length}</sup> subsets to
            examine for candidate keys. The computation still runs, but expect a visible pause — that
            exponential cost is inherent to finding <i>all</i> candidate keys, not a defect in this tool.
          </div>
        )}

        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn" onClick={onAnalyse} disabled={busy || errors.length > 0 || !relationText.trim()}>
            {busy ? 'Computing…' : 'Analyse relation'}
          </button>
          <button className="btn ghost" onClick={() => onChange('', '')}>Clear</button>
          {storageOk && (
            <>
              <input
                type="text"
                style={{ width: 190 }}
                placeholder="name to save as…"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
              <button className="btn ghost" onClick={doSave} disabled={!relationText.trim()}>Save</button>
            </>
          )}
        </div>
        {!storageOk && (
          <div className="hint" style={{ marginTop: 10 }}>
            This browser is blocking site storage, so saving is disabled. Everything else works normally.
          </div>
        )}
      </div>

      {parsed && parsed.attributes.length > 0 && errors.length === 0 && (
        <div className="card">
          <h2>Parsed input</h2>
          <p className="sub">What the engine actually received. Check this before trusting anything below it.</p>
          <table className="data">
            <tbody>
              <tr>
                <th style={{ width: 190 }}>Attributes ({parsed.attributes.length})</th>
                <td><SetList items={parsed.attributes.map((a) => [a])} /></td>
              </tr>
              <tr>
                <th>Functional dependencies</th>
                <td>
                  {parsed.fds.length === 0 ? <span className="muted">none</span> : (
                    <span className="set-list">
                      {parsed.fds.map((f, i) => <Fd key={i} of={f} />)}
                    </span>
                  )}
                </td>
              </tr>
              {parsed.mvds.length > 0 && (
                <tr>
                  <th>Multivalued dependencies</th>
                  <td><span className="set-list">{parsed.mvds.map((f, i) => <Fd key={i} of={f} />)}</span></td>
                </tr>
              )}
              {parsed.jds.length > 0 && (
                <tr>
                  <th>Join dependencies</th>
                  <td>
                    {parsed.jds.map((j, i) => (
                      <span key={i} className="set-list" style={{ marginRight: 12 }}>
                        <span className="mono">*(</span>
                        {j.components.map((c, k) => <Set key={k} of={c} />)}
                        <span className="mono">)</span>
                      </span>
                    ))}
                  </td>
                </tr>
              )}
              {analysis && (
                <>
                  <tr>
                    <th>Candidate keys</th>
                    <td><SetList items={analysis.keys.candidateKeys} tone="key" /></td>
                  </tr>
                  <tr>
                    <th>Prime / non-prime</th>
                    <td>
                      <span className="set-list">
                        <Set of={analysis.keys.primeAttributes} tone="key" />
                        <span className="muted">prime ·</span>
                        <Set of={analysis.keys.nonPrimeAttributes} />
                        <span className="muted">non-prime</span>
                      </span>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {storageOk && saved.length > 0 && (
        <div className="card">
          <h2>Saved relations</h2>
          <p className="sub">Kept in this browser only — no account, no server.</p>
          {saved.map((s) => (
            <div className="saved-item" key={s.id}>
              <div>
                <div className="nm">{s.name}</div>
                <div className="mono muted" style={{ fontSize: 12 }}>
                  {s.relationText} · {s.depText.split('\n').filter(Boolean).length} dependencies
                </div>
              </div>
              <div className="btn-row">
                <span className="dt">{new Date(s.savedAt).toLocaleDateString()}</span>
                <button className="btn ghost small" onClick={() => onChange(s.relationText, s.depText)}>Load</button>
                <button className="btn ghost small" onClick={() => { deleteRelation(s.id); onReloadSaved(); }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
