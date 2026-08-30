// ClosureTrace.jsx — attribute closure, step by step, plus the key enumeration.
import { useState, useMemo } from 'react';
import { getClosure } from '../logic/closure.js';
import { Set, Fd, SetList, Empty } from './atoms.jsx';
import { isSubset } from '../logic/setOps.js';

export default function ClosureTrace({ parsed, analysis }) {
  const [picked, setPicked] = useState([]);

  const attributes = parsed?.attributes ?? [];
  const fds = parsed?.fds ?? [];

  const result = useMemo(
    () => (picked.length ? getClosure(picked, fds) : null),
    [picked, fds]
  );

  if (!analysis) {
    return <Empty title="Nothing analysed yet">Define a relation on the Input tab and press Analyse.</Empty>;
  }

  const toggle = (a) =>
    setPicked((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a].sort()));

  const isSuper = result && isSubset(attributes, result.closure);
  const isCandidate =
    result && analysis.keys.candidateKeys.some((k) => k.length === picked.length && isSubset(k, picked));

  return (
    <>
      <div className="card">
        <h2>Attribute closure</h2>
        <p className="sub">
          X⁺ is the set of every attribute you can reach from X by applying the dependencies. It is the
          single most useful computation in normalisation: keys, normal forms, minimal covers and
          dependency preservation are all closure tests wearing different hats.
        </p>

        <h3>Pick a starting set</h3>
        <div className="set-list" style={{ marginBottom: 12 }}>
          {attributes.map((a) => (
            <button
              key={a}
              type="button"
              className="btn ghost small"
              style={
                picked.includes(a)
                  ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent)' }
                  : undefined
              }
              onClick={() => toggle(a)}
            >
              {a}
            </button>
          ))}
          {picked.length > 0 && (
            <button className="btn ghost small" onClick={() => setPicked([])}>reset</button>
          )}
        </div>

        {!result && <p className="muted">Choose one or more attributes above to compute their closure.</p>}

        {result && (
          <>
            <div className="verdict">
              <span className="big">
                <Set of={picked} /> ⁺ = <Set of={result.closure} tone={isSuper ? 'good' : undefined} />
              </span>
              <span className="txt">
                {isSuper
                  ? isCandidate
                    ? 'This closure covers the whole relation and the set is minimal — it is a candidate key.'
                    : 'This closure covers the whole relation, so the set is a superkey. It is not minimal, so it is not a candidate key.'
                  : `Missing ${attributes.filter((a) => !result.closure.includes(a)).join(', ')}, so this set is not a superkey.`}
              </span>
            </div>

            <h3>How it was derived</h3>
            <ol className="steps">
              {result.steps.map((s, i) => (
                <li key={i} className={i === 0 ? 'start' : ''}>
                  <div className="step-line">
                    {s.fdUsed ? <Fd of={s.fdUsed} /> : <span className="muted">reflexivity</span>}
                    {s.added.length > 0 && (
                      <>
                        <span className="muted">adds</span>
                        <Set of={s.added} tone="good" />
                      </>
                    )}
                    <span className="muted">⟶</span>
                    <Set of={s.closureSoFar} />
                  </div>
                  <div className="step-why">{s.explanation}</div>
                </li>
              ))}
            </ol>
            {result.steps.length === 1 && (
              <p className="muted" style={{ marginTop: 10 }}>
                No dependency could fire: nothing in the set appears on the left of an applicable dependency,
                so the closure is just the set itself.
              </p>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2>Keys</h2>
        <p className="sub">
          A superkey is any set whose closure is the whole relation. A candidate key is a superkey with no
          redundant attribute — remove anything and it stops being a superkey.
        </p>

        <table className="data">
          <tbody>
            <tr>
              <th style={{ width: 200 }}>Candidate keys</th>
              <td><SetList items={analysis.keys.candidateKeys} tone="key" /></td>
            </tr>
            <tr>
              <th>Prime attributes</th>
              <td><Set of={analysis.keys.primeAttributes} tone="key" /></td>
            </tr>
            <tr>
              <th>Non-prime attributes</th>
              <td>
                {analysis.keys.nonPrimeAttributes.length
                  ? <Set of={analysis.keys.nonPrimeAttributes} />
                  : <span className="muted">none — every attribute belongs to some candidate key</span>}
              </td>
            </tr>
            <tr>
              <th>Superkeys</th>
              <td>
                <span className="muted">{analysis.keys.superKeys.length} in total</span>
                <details className="raw">
                  <summary>list them</summary>
                  <div style={{ marginTop: 8 }}>
                    <SetList items={analysis.keys.superKeys} />
                  </div>
                </details>
              </td>
            </tr>
          </tbody>
        </table>

        <h3>Why these are the keys</h3>
        <ol className="steps">
          {analysis.keys.steps.map((s, i) => (
            <li key={i}>
              <div className="step-line">
                <Set of={s.set} tone={s.stage === 'candidate' ? 'key' : undefined} />
                <span className="pill">{s.stage}</span>
              </div>
              <div className="step-why">{s.reason}</div>
            </li>
          ))}
        </ol>

        <div className="msg info" style={{ marginTop: 14 }}>
          <b>Why is this exponential?</b> To be certain a set is <i>minimal</i> you must know that no smaller
          subset is already a superkey, and to find <i>every</i> candidate key you must therefore examine all
          2<sup>n</sup> subsets. Finding all candidate keys is NP-hard; this lab enumerates subsets in
          increasing size order and prunes any superset of a key already found, which is the standard
          practical compromise — not a way around the complexity.
        </div>
      </div>
    </>
  );
}
