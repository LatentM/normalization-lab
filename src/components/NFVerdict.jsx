// NFVerdict.jsx — the normal-form ladder, 1NF to BCNF, with the exact blocker named.
import { Set, Fd, SetList, Empty } from './atoms.jsx';

const NEXT = { '1NF': '2NF', '2NF': '3NF', '3NF': 'BCNF', BCNF: '4NF' };

export default function NFVerdict({ analysis }) {
  if (!analysis) {
    return <Empty title="Nothing analysed yet">Enter a relation in the panel on the left and press Analyse.</Empty>;
  }

  const nf = analysis.normalForm;
  const highest = nf.highestNF;
  const firstFail = nf.checks.find((c) => !c.passed);

  return (
    <>
      <div className="card">
        <h2>Normal form diagnosis</h2>
        <p className="sub">
          Each rung is tested independently against its own definition, and where a rung fails the exact
          dependency responsible is named. The verdict is the highest rung that passes with every rung below
          it also passing.
        </p>

        <div className="verdict">
          <span className="big">{highest}</span>
          <span className="txt">
            {firstFail ? (
              <>
                The relation satisfies {highest} but not {firstFail.nf}. {firstFail.note}{' '}
                See the Decomposition section for a schema that reaches it.
              </>
            ) : (
              <>
                The relation satisfies every form up to and including BCNF. Multivalued and join
                dependencies are checked separately on the Higher forms tab — BCNF is not the end of
                the ladder.
              </>
            )}
          </span>
        </div>

        <div className="ladder">
          {nf.checks.map((c) => (
            <div key={c.nf} className={`rung ${c.assumed ? 'assumed' : c.passed ? 'pass' : 'fail'}`}>
              <div className="nf">{c.nf}</div>
              <div className="mark">{c.assumed ? '≈' : c.passed ? '✓' : '✗'}</div>
              <div>
                <div className="note">{c.note}</div>
                {c.blockers && c.blockers.length > 0 && (
                  <div className="blockers">
                    {c.blockers.map((b, i) => (
                      <div className="blocker" key={i}>
                        <Fd of={b.fd} tone="bad" />
                        <div style={{ marginTop: 5 }}>{b.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>The facts the verdict rests on</h2>
        <table className="data">
          <tbody>
            <tr>
              <th style={{ width: 200 }}>Relation</th>
              <td><Set of={analysis.parsed.attributes} /></td>
            </tr>
            <tr>
              <th>Candidate keys</th>
              <td><SetList items={analysis.keys.candidateKeys} tone="key" /></td>
            </tr>
            <tr>
              <th>Prime attributes</th>
              <td><Set of={nf.primeAttributes} tone="key" /></td>
            </tr>
            <tr>
              <th>Non-prime attributes</th>
              <td>
                {nf.nonPrimeAttributes.length
                  ? <Set of={nf.nonPrimeAttributes} />
                  : <span className="muted">none</span>}
              </td>
            </tr>
            <tr>
              <th>Dependencies tested</th>
              <td>
                <span className="set-list">
                  {analysis.parsed.fds.map((f, i) => <Fd key={i} of={f} />)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {highest === '3NF' && nf.bcnfViolations.length > 0 && (
          <div className="takeaway">
            <b>You are looking at the classic 3NF-but-not-BCNF case.</b>{' '}
            {nf.bcnfViolations.map((v, i) => (
              <span key={i}><Fd of={v.fd} /> </span>
            ))}
            survives 3NF only because the attributes on its right-hand side are prime. Remove that escape
            clause — which is precisely what BCNF does — and it fails. Compare the two decompositions on the
            next tab to see what removing it costs.
          </div>
        )}

        {NEXT[highest] && (
          <p className="muted" style={{ marginTop: 14 }}>
            Next rung: {NEXT[highest]}.{' '}
            {highest === 'BCNF'
              ? 'Functional dependencies can take you no further — 4NF and 5NF need multivalued and join dependencies.'
              : 'The Decomposition section produces a schema that reaches it.'}
          </p>
        )}
      </div>
    </>
  );
}
