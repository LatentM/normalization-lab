// DecompositionView.jsx — 3NF synthesis vs BCNF analysis, side by side.
// This is the tab the whole project exists for.
import { useState } from 'react';
import { Set, Fd, SetList, Empty } from './atoms.jsx';

function Tableau({ detail }) {
  if (!detail || !detail.tableau) return null;
  const { attributes, rows, grid } = detail.tableau;
  return (
    <div className="tbl-wrap">
      <table className="tableau">
        <thead>
          <tr>
            <th>fragment</th>
            {attributes.map((a) => <th key={a}>{a}</th>)}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, i) => {
            const allA = row.every((c) => c.startsWith('a'));
            return (
              <tr key={i} className={allA ? 'win' : ''}>
                <th>{rows[i].join('')}</th>
                {row.map((c, j) => (
                  <td key={j} className={c.startsWith('a') ? 'a' : 'b'}>{c}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Fragment({ f }) {
  return (
    <div className="frag">
      <div className="name">{f.name}{f.isKeyRelation ? ' · added for losslessness' : ''}</div>
      <div className="attrs"><Set of={f.attributes} /></div>
      <div className="row">
        <b>key</b>
        <SetList items={f.candidateKeys} tone="key" />
      </div>
      <div className="row">
        <b>holds</b>
        {f.fds.length ? f.fds.map((d, i) => <Fd key={i} of={d} />) : <span className="muted">no non-trivial dependencies</span>}
      </div>
      {f.highestNF && (
        <div className="row">
          <b>form</b>
          <span className={`set ${f.highestNF === 'BCNF' ? 'good' : ''}`}>{f.highestNF}</span>
        </div>
      )}
    </div>
  );
}

function Side({ title, algo, result, detailOpen }) {
  return (
    <div>
      <h3>{title}</h3>
      <div className="algo">{algo}</div>

      {result.relations.map((f) => <Fragment key={f.name} f={f} />)}

      <div className="props">
        <span className={`prop ${result.lossless ? 'yes' : 'no'}`}>
          {result.lossless ? '✓ lossless join' : '✗ lossy'}
        </span>
        <span className={`prop ${result.dependencyPreserving ? 'yes' : 'no'}`}>
          {result.dependencyPreserving ? '✓ dependency preserving' : '✗ loses dependencies'}
        </span>
      </div>

      {!result.dependencyPreserving && (
        <div className="msg error" style={{ marginTop: 10 }}>
          Cannot be checked inside one fragment:{' '}
          <span className="set-list">
            {result.dependencyDetail.lostFds.map((f, i) => <Fd key={i} of={f} tone="bad" />)}
          </span>
        </div>
      )}

      {detailOpen && (
        <>
          <h3>Steps</h3>
          <ol className="steps">
            {result.steps.map((s, i) => (
              <li key={i}>
                <div className="step-line">
                  {s.violatingFd && <Fd of={s.violatingFd} tone="bad" />}
                  {s.parent && !s.violatingFd && <Set of={s.parent} />}
                  {s.children && (
                    <>
                      <span className="muted">split into</span>
                      {s.children.map((c, k) => <Set key={k} of={c} tone="good" />)}
                    </>
                  )}
                  {s.stage && !s.children && <span className="pill">{s.stage}</span>}
                </div>
                <div className="step-why">{s.reason}</div>
              </li>
            ))}
          </ol>

          <h3>Lossless-join proof (chase)</h3>
          <p className="sub">{result.losslessDetail.reason}</p>
          {result.losslessDetail.shortcut && (
            <div className="msg info">{result.losslessDetail.shortcut.text}</div>
          )}
          <Tableau detail={result.losslessDetail} />

          <h3>Dependency preservation, dependency by dependency</h3>
          <div className="tbl-wrap">
            <table className="data">
              <thead>
                <tr><th>dependency</th><th>reachable inside fragments</th><th>kept?</th></tr>
              </thead>
              <tbody>
                {result.dependencyDetail.checks.map((c, i) => (
                  <tr key={i}>
                    <td><Fd of={c.fd} /></td>
                    <td><Set of={c.reachable} /></td>
                    <td style={{ color: c.preserved ? 'var(--good)' : 'var(--bad)', fontWeight: 700 }}>
                      {c.preserved ? 'yes' : 'no'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function DecompositionView({ analysis }) {
  const [open, setOpen] = useState(false);

  if (!analysis) {
    return <Empty title="Nothing analysed yet">Define a relation on the Input tab and press Analyse.</Empty>;
  }

  const { three, bcnf } = analysis.decomposition;
  const sameShape =
    three.relations.length === bcnf.relations.length &&
    three.relations.every((r, i) =>
      r.attributes.join('') === (bcnf.relations[i]?.attributes.join('') ?? '')
    );

  return (
    <>
      <div className="card">
        <h2>Decomposition — synthesis versus analysis</h2>
        <p className="sub">
          Two standard algorithms, run on the same input, shown together. They often disagree, and the way
          they disagree is the most examinable fact in this topic.
        </p>

        <div className="compare">
          <Side
            title="3NF by synthesis"
            algo="Minimal cover → one relation per dependency → add a candidate key if none is contained → drop subsumed relations."
            result={three}
            detailOpen={open}
          />
          <Side
            title="BCNF by analysis"
            algo="Find a dependency whose left side is not a superkey → split into X⁺ and X ∪ (R − X⁺) → repeat until every fragment is in BCNF."
            result={bcnf}
            detailOpen={open}
          />
        </div>

        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn ghost" onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide the working' : 'Show the working — steps, chase tableau, dependency tests'}
          </button>
        </div>

        <div className="takeaway">
          {three.dependencyPreserving && !bcnf.dependencyPreserving ? (
            <>
              <b>This input shows the trade-off exactly.</b> 3NF synthesis kept every dependency and is
              lossless. BCNF analysis is also lossless and removes more redundancy, but it lost{' '}
              <span className="set-list">
                {bcnf.dependencyDetail.lostFds.map((f, i) => <Fd key={i} of={f} tone="bad" />)}
              </span>
              — enforcing that constraint now requires joining fragments on every insert. Neither result is
              "the right answer": you choose based on whether the redundancy or the join costs more.
            </>
          ) : sameShape ? (
            <>
              <b>Both algorithms produced the same schema here.</b> That happens whenever every 3NF fragment
              already satisfies BCNF, and it is the comfortable case. Try the preset
              "3NF keeps a dependency BCNF loses" to see them come apart.
            </>
          ) : (
            <>
              <b>Both decompositions are lossless and both preserve dependencies</b> on this input, but they
              produced different schemas — decomposition is not unique. BCNF analysis in particular depends
              on which violating dependency you split first; this lab always takes the first one you typed,
              and says so rather than hiding the choice.
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Why 3NF synthesis always preserves dependencies</h2>
        <p className="sub">
          A viva favourite, and the answer is short. Synthesis builds one relation per dependency of the
          minimal cover, so every dependency has both sides inside a single fragment <i>by construction</i> —
          there is no way for one to be split across two relations. Losslessness is then bought separately, by
          adding a relation consisting of a candidate key.
        </p>
        <p className="sub">
          BCNF analysis works the other way round. It gets losslessness by construction — each split shares
          the attributes X that the two halves join on — but nothing in the procedure protects a dependency
          whose left and right sides land in different fragments. That is why the guarantee runs one way and
          not the other, and why every textbook stops at 3NF for schemas where constraint checking matters.
        </p>
      </div>
    </>
  );
}
