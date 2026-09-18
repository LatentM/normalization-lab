// HigherNFPanel.jsx — 4NF and the scoped 5NF check.
import { Set, Fd, SetList, Empty } from './atoms.jsx';
import { SCOPE_NOTE } from '../logic/higherNF.js';

export default function HigherNFPanel({ analysis }) {
  if (!analysis) {
    return <Empty title="Nothing analysed yet">Enter a relation in the panel on the left and press Analyse.</Empty>;
  }

  const { four, four_decomp, five } = analysis.higher;
  const hasMvds = analysis.parsed.mvds.length > 0;
  const hasJd = analysis.parsed.jds.length > 0;

  return (
    <>
      <div className="card">
        <h2>4NF — multivalued dependencies</h2>
        <p className="sub">
          An MVD X ↠ Y says that for a given X, the set of Y values is independent of everything else in the
          relation. Where an FD fixes one value, an MVD fixes a whole set — and storing two independent sets
          in one table forces you to record every combination.
        </p>

        {!hasMvds && (
          <div className="msg info">
            No multivalued dependencies were entered, so there is nothing beyond BCNF to test here. Add a line
            like <code>A -&gt;&gt; B</code> in the panel on the left, or load the preset
            "MVD — BCNF but not 4NF".
          </div>
        )}

        {hasMvds && (
          <>
            <div className="verdict">
              <span className="big">{four.is4NF ? '4NF ✓' : '4NF ✗'}</span>
              <span className="txt">
                {four.is4NF
                  ? 'Every non-trivial multivalued dependency has a superkey on its left, so 4NF holds.'
                  : `${four.violations.length} violation${four.violations.length > 1 ? 's' : ''} found.` +
                    (four.bcnfFirst
                      ? ' Note that some of these come from functional dependencies: every FD is also an MVD, so a BCNF violation breaks 4NF automatically. Fix BCNF first.'
                      : ' The functional dependencies alone were fine — it is the multivalued dependencies that break 4NF here.')}
              </span>
            </div>

            {four.violations.length > 0 && (
              <>
                <h3>Violations</h3>
                <div className="blockers">
                  {four.violations.map((v, i) => (
                    <div className="blocker" key={i}>
                      <Fd of={v.dependency} tone="bad" />{' '}
                      <span className="pill">{v.source === 'fd' ? 'from an FD' : 'from an MVD'}</span>
                      <div style={{ marginTop: 5 }}>{v.reason}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {four.notes.length > 0 && (
              <>
                <h3>Dependencies that do not violate 4NF</h3>
                <ol className="steps">
                  {four.notes.map((n, i) => (
                    <li key={i}>
                      <div className="step-line"><Fd of={n.dependency} /></div>
                      <div className="step-why">{n.text}</div>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {four_decomp && four_decomp.steps.length > 0 && (
              <>
                <h3>4NF decomposition</h3>
                <div className="compare" style={{ gridTemplateColumns: '1fr' }}>
                  <div>
                    {four_decomp.relations.map((f) => (
                      <div className="frag" key={f.name}>
                        <div className="name">{f.name}</div>
                        <div className="attrs"><Set of={f.attributes} /></div>
                        <div className="row"><b>key</b><SetList items={f.candidateKeys} tone="key" /></div>
                        {f.mvds.length > 0 && (
                          <div className="row">
                            <b>mvds</b>
                            {f.mvds.map((m, i) => <Fd key={i} of={m} />)}
                          </div>
                        )}
                      </div>
                    ))}
                    <span className="prop yes">✓ lossless</span>
                  </div>
                </div>
                <ol className="steps" style={{ marginTop: 12 }}>
                  {four_decomp.steps.map((s, i) => (
                    <li key={i}>
                      <div className="step-line">
                        <Fd of={s.dependency} tone="bad" />
                        <span className="muted">splits</span>
                        <Set of={s.parent} />
                        <span className="muted">into</span>
                        {s.children.map((c, k) => <Set key={k} of={c} tone="good" />)}
                      </div>
                      <div className="step-why">{s.reason}</div>
                    </li>
                  ))}
                </ol>
                <div className="msg ok">{four_decomp.losslessNote}</div>
              </>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2>5NF — join dependency check</h2>
        <p className="sub">
          A join dependency *(R₁, …, Rₙ) says the relation is the natural join of its projections. 5NF asks
          whether every such dependency is implied by the candidate keys.
        </p>

        <div className="msg warn">
          <b>Read this before quoting the result.</b> {SCOPE_NOTE}
        </div>

        {!hasJd && (
          <div className="msg info">
            No join dependency was entered. Add one as <code>*(A B, B C, C A)</code> in the panel on the left to test
            it, or load the preset "Join dependency (5NF check)".
          </div>
        )}

        {hasJd && five && (
          <>
            <div className="verdict">
              <span className="big">
                {five.is5NF === null ? '—' : five.is5NF ? 'no violation' : '5NF ✗'}
              </span>
              <span className="txt">{five.reason}</span>
            </div>

            {five.components && (
              <>
                <h3>Component check</h3>
                <div className="tbl-wrap">
                  <table className="data">
                    <thead>
                      <tr><th>component</th><th>closure</th><th>superkey?</th></tr>
                    </thead>
                    <tbody>
                      {five.components.map((c, i) => (
                        <tr key={i}>
                          <td><Set of={c.component} /></td>
                          <td><Set of={c.closure} /></td>
                          <td style={{ color: c.isSuperkey ? 'var(--good)' : 'var(--bad)', fontWeight: 700 }}>
                            {c.isSuperkey ? 'yes' : 'no'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {five.tableau && (
              <>
                <h3>Does the join dependency hold? (chase)</h3>
                <div className="tbl-wrap">
                  <table className="tableau">
                    <thead>
                      <tr>
                        <th>component</th>
                        {five.tableau.attributes.map((a) => <th key={a}>{a}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {five.tableau.grid.map((row, i) => {
                        const allA = row.every((c) => c.startsWith('a'));
                        return (
                          <tr key={i} className={allA ? 'win' : ''}>
                            <th>{five.tableau.rows[i].join('')}</th>
                            {row.map((c, j) => (
                              <td key={j} className={c.startsWith('a') ? 'a' : 'b'}>{c}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="muted">
                  {five.holds
                    ? 'A row of all a-symbols appeared, so the join dependency is implied by your functional dependencies and therefore holds.'
                    : 'No row became all a-symbols, so this join dependency is not implied by your functional dependencies.'}
                </p>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
