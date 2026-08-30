// AnomalyDemo.jsx — live insert / update / delete anomalies on real sample data.
import { useState } from 'react';
import { ANOMALY_DEMO } from '../content/theory.js';

export default function AnomalyDemo({ onLoadExample }) {
  const [active, setActive] = useState(null);
  const d = ANOMALY_DEMO;
  const anomaly = d.anomalies.find((a) => a.kind === active);

  const rowClass = (i) => {
    if (!anomaly) return '';
    if (anomaly.highlight.type === 'row' && anomaly.highlight.index === i) return 'strike';
    return '';
  };
  const cellClass = (col, value) => {
    if (!anomaly || anomaly.highlight.type !== 'cells') return '';
    return anomaly.highlight.column === col && value === anomaly.highlight.value ? 'hl' : '';
  };

  return (
    <>
      <div className="card">
        <h2>Why normalise at all?</h2>
        <p className="sub">
          Normalisation is not tidiness. It exists to remove three specific failures that appear the moment
          two independent facts share a row. Here is one unnormalised table doing four jobs at once.
        </p>

        <h3>{d.title}</h3>
        <p className="muted">
          Candidate key: <span className="set key">{d.candidateKey}</span> · Dependencies:{' '}
          {d.fds.map((f, i) => <code key={i} style={{ marginRight: 12 }}>{f}</code>)}
        </p>

        <div className="tbl-wrap">
          <table className="data">
            <thead>
              <tr>{d.columns.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {d.rows.map((r, i) => (
                <tr key={i} className={rowClass(i)}>
                  {r.map((v, j) => (
                    <td key={j} className={`mono ${cellClass(d.columns[j], v)}`}>{v}</td>
                  ))}
                </tr>
              ))}
              {active === 'insert' && (
                <tr className="hl">
                  <td className="mono" style={{ color: 'var(--bad)' }}>?</td>
                  <td className="mono" style={{ color: 'var(--bad)' }}>?</td>
                  <td className="mono" style={{ color: 'var(--bad)' }}>?</td>
                  <td className="mono" style={{ color: 'var(--bad)' }}>?</td>
                  <td className="mono">D3</td>
                  <td className="mono">Mechanical</td>
                  <td className="mono" style={{ color: 'var(--bad)' }}>?</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="btn-row" style={{ marginTop: 14 }}>
          {d.anomalies.map((a) => (
            <button
              key={a.kind}
              className={`btn ${active === a.kind ? '' : 'ghost'}`}
              onClick={() => setActive(active === a.kind ? null : a.kind)}
            >
              {a.title}
            </button>
          ))}
          {active && <button className="btn ghost" onClick={() => setActive(null)}>Reset table</button>}
        </div>

        {anomaly && (
          <div style={{ marginTop: 16 }}>
            <div className="msg warn">
              <b>Scenario.</b> {anomaly.scenario}
            </div>
            <div className="msg error">
              <b>What goes wrong.</b> {anomaly.problem}
            </div>
            <div className="msg ok">
              <b>After normalising.</b> {anomaly.fix}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>The normalised schema</h2>
        <p className="sub">
          The same information, decomposed so that every fact is stored exactly once. All three anomalies
          disappear — not because they were patched, but because the shape that produced them is gone.
        </p>
        <div className="compare" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
          {d.decomposition.map((r) => (
            <div key={r.name}>
              <h3>{r.name}</h3>
              <div className="frag">
                <div className="attrs">{r.attributes.join(', ')}</div>
                <div className="row"><b>key</b><span className="set key">{r.key}</span></div>
              </div>
            </div>
          ))}
        </div>
        <div className="takeaway" style={{ marginTop: 18 }}>{d.closing}</div>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button
            className="btn"
            onClick={() =>
              onLoadExample(
                d.relation.join(', '),
                'StudentId -> StudentName, DeptId\nDeptId -> DeptName\nCourseId -> CourseName\nStudentId, CourseId -> Grade'
              )
            }
          >
            Run this table through the analyser
          </button>
        </div>
      </div>
    </>
  );
}
