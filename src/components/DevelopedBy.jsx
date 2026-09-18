// DevelopedBy.jsx — the mandatory "Developed By" section.
// Team photographs, names, register numbers, and the guide's details.

import { TEAM, GUIDE, COURSE } from '../content/team.js';

const initials = (name) =>
  name.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';

export default function DevelopedBy() {
  const missing = TEAM.filter((m) => m.placeholder).length;
  const noPhoto = TEAM.filter((m) => !m.photo && !m.placeholder).length;

  return (
    <>
      <div className="card">
        <h2>Developed by</h2>
        <p className="sub">
          {COURSE.assignment} · {COURSE.code} {COURSE.name} · {COURSE.institution}
        </p>



        <div className="team">
          {TEAM.map((m) => (
            <div className={`member${m.placeholder ? ' todo' : ''}`} key={m.regNo + m.name}>
              {m.photo ? (
                <img className="avatar" src={m.photo} alt={`${m.name}, ${m.regNo}`} />
              ) : (
                <div className="avatar placeholder" aria-hidden="true">{initials(m.name)}</div>
              )}
              <div className="m-name">{m.name}</div>
              <div className="m-reg">{m.regNo}</div>
              <div className="m-role">{m.role}</div>
              <div className="m-contrib">{m.contribution}</div>
            </div>
          ))}
        </div>

        <div className="guide">
          <span className="g-label">{GUIDE.label}</span>
          <span className="g-name">{GUIDE.name}</span>
          <span className="g-title">{GUIDE.title}</span>
        </div>
      </div>

      <div className="card">
        <h2>How the work was divided</h2>
        <p className="sub">
          The three source folders have disjoint owners, which is both the collaboration model and
          the merge-conflict strategy: two people never edit the same file until integration.
        </p>
        <div className="tbl-wrap">
          <table className="data">
            <thead>
              <tr><th>Folder</th><th>Owner</th><th>Contains</th></tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">src/logic/</td>
                <td>{TEAM[0].name}</td>
                <td>Ten pure-JavaScript modules — no React, no DOM. Testable from Node.</td>
              </tr>
              <tr>
                <td className="mono">src/components/</td>
                <td>{TEAM[1].name}</td>
                <td>The interface, the report writers, day/night mode.</td>
              </tr>
              <tr>
                <td className="mono">src/content/</td>
                <td>{TEAM[2].name}</td>
                <td>Theory notes, the ten practice problems and their hand-solved answers, references.</td>
              </tr>
              <tr>
                <td className="mono">App.jsx · storage.js</td>
                <td>All three</td>
                <td>Wiring only. Edited together on integration day.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
