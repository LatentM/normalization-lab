// RelationInput.jsx — the Setup section.
//
// The typing itself now lives in the rail (RelationRail), so this section is
// about everything around it: worked examples to load, a readback of what the
// engine actually received, and saved relations.

import { useState } from 'react';
import { PRESETS } from '../content/theory.js';
import { Set, Fd, SetList } from './atoms.jsx';
import { saveRelation, deleteRelation, isStorageAvailable } from '../storage.js';

export default function RelationInput({
  relationText, depText, onChange, parsed, analysis, saved, onReloadSaved,
}) {
  const [saveName, setSaveName] = useState('');
  const storageOk = isStorageAvailable();

  const doSave = () => {
    if (!relationText.trim()) return;
    saveRelation(saveName.trim(), relationText, depText);
    setSaveName('');
    onReloadSaved();
  };

  return (
    <>
      <div className="card">
        <h2>Worked examples</h2>
        <p className="sub">
          Each of these loads a relation chosen to demonstrate one thing. Start with
          the third if you only try one — it is where the two decomposition algorithms
          disagree, which is the point of the whole lab.
        </p>
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => onChange(p.relation, p.deps)}>
              <span className="p-name">{p.label}</span>
              <span className="p-note">{p.note}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Syntax</h2>
        <div className="tbl-wrap">
          <table className="data">
            <tbody>
              <tr>
                <th style={{ width: 190 }}>Relation</th>
                <td className="mono">A, B, C, D &nbsp;·&nbsp; R(A, B, C, D) &nbsp;·&nbsp; ABCD</td>
              </tr>
              <tr>
                <th>Functional dependency</th>
                <td className="mono">A,B -&gt; C &nbsp;·&nbsp; AB -&gt; C</td>
              </tr>
              <tr>
                <th>Multivalued dependency</th>
                <td className="mono">A -&gt;&gt; B</td>
              </tr>
              <tr>
                <th>Join dependency</th>
                <td className="mono">*(AB, BC, CA)</td>
              </tr>
              <tr>
                <th>Comment</th>
                <td className="mono"># ignored to end of line</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Arrows may also be written <code>--&gt;</code>, <code>=&gt;</code>, <code>→</code>,{' '}
          <code>↠</code>. Single capital letters may be written without commas; longer names
          such as <code>StudentId</code> are kept whole. An attribute used in a dependency but
          not declared is added automatically, with a warning.
        </p>
      </div>

      {parsed && parsed.attributes.length > 0 && parsed.errors.length === 0 && (
        <div className="card">
          <h2>What the engine received</h2>
          <p className="sub">
            Check this before trusting anything downstream. If the parser misread your input,
            every verdict after it is answering a different question.
          </p>
          <div className="tbl-wrap">
            <table className="data">
              <tbody>
                <tr>
                  <th style={{ width: 210 }}>Attributes ({parsed.attributes.length})</th>
                  <td><Set of={parsed.attributes} /></td>
                </tr>
                <tr>
                  <th>Functional dependencies</th>
                  <td>
                    {parsed.fds.length === 0 ? <span className="muted">none</span> : (
                      <span className="set-list">{parsed.fds.map((f, i) => <Fd key={i} of={f} />)}</span>
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
                        <span key={i} className="set-list" style={{ marginRight: 14 }}>
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
                      <th>Prime</th>
                      <td><Set of={analysis.keys.primeAttributes} tone="key" /></td>
                    </tr>
                    <tr>
                      <th>Non-prime</th>
                      <td>
                        {analysis.keys.nonPrimeAttributes.length
                          ? <Set of={analysis.keys.nonPrimeAttributes} />
                          : <span className="muted">none — every attribute is in some key</span>}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {storageOk && (
        <div className="card">
          <h2>Saved relations</h2>
          <p className="sub">
            Kept in this browser only — no account, no server, nothing uploaded.
          </p>
          <div className="btn-row">
            <input
              type="text"
              style={{ width: 240 }}
              placeholder="name this relation…"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') doSave(); }}
            />
            <button className="btn ghost" onClick={doSave} disabled={!relationText.trim()}>Save</button>
          </div>

          {saved.length === 0 ? (
            <p className="muted" style={{ marginTop: 16 }}>Nothing saved yet.</p>
          ) : (
            <div style={{ marginTop: 18 }}>
              {saved.map((s) => (
                <div className="saved-item" key={s.id}>
                  <div>
                    <div className="nm">{s.name}</div>
                    <div className="mono muted" style={{ fontSize: 11.5 }}>
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
        </div>
      )}

      {!storageOk && (
        <div className="card">
          <h2>Saved relations</h2>
          <p className="sub">
            This browser is blocking site storage, so saving is unavailable. Everything else
            in the lab works normally.
          </p>
        </div>
      )}
    </>
  );
}
