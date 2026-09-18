// LearnPanel.jsx — the mandatory Learn section.
// Concept explanation, an embedded video, and full references.

import { PROBLEM, CONCEPT, VIDEO, REFERENCES } from '../content/learn.js';
import { THEORY } from '../content/theory.js';
import { useState } from 'react';

/** Render *emphasis* markers in the reference strings as italics. */
function Ref({ text }) {
  const parts = String(text).split(/\*([^*]+)\*/g);
  return <>{parts.map((p, i) => (i % 2 ? <em key={i}>{p}</em> : p))}</>;
}

export default function LearnPanel({ visited, onVisit }) {
  const [open, setOpen] = useState('1nf');

  const toggle = (id) => {
    const next = open === id ? null : id;
    setOpen(next);
    if (next) onVisit(next);
  };

  return (
    <>
      <div className="card">
        <h2>{PROBLEM.title}</h2>
        <div className="prose">
          <p>{PROBLEM.statement}</p>
          <p>{PROBLEM.thesis}</p>
        </div>

        <h3>Objectives</h3>
        <ul className="contents-list">
          {PROBLEM.objectives.map((o, i) => (
            <li key={i}><b>{String(i + 1).padStart(2, '0')}</b><span>{o}</span></li>
          ))}
        </ul>

        <h3>Inputs the system accepts</h3>
        <div className="tbl-wrap">
          <table className="data">
            <tbody>
              {PROBLEM.inputs.map(([k, v]) => (
                <tr key={k}><th style={{ width: 230 }}>{k}</th><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>Outputs the system produces</h3>
        <div className="tbl-wrap">
          <table className="data">
            <tbody>
              {PROBLEM.outputs.map(([k, v]) => (
                <tr key={k}><th style={{ width: 230 }}>{k}</th><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>Functional requirements</h3>
        <ul className="contents-list">
          {PROBLEM.functional.map((f, i) => (
            <li key={i}><b>F{i + 1}</b><span>{f}</span></li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Concept explanation</h2>
        <p className="sub">
          What normalization is, why it exists, and what each normal form actually requires.
          Read this before using the analyser and the output stops being a black box.
        </p>
        <div className="prose">
          {CONCEPT.map((c) => (
            <section key={c.heading}>
              <h3>{c.heading}</h3>
              {c.paras.map((p, i) => <p key={i}>{p}</p>)}
            </section>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Animated video</h2>
        <p className="sub">{VIDEO.note}</p>
        <div className="video-wrap">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${VIDEO.embedId}`}
            title={VIDEO.title}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          “{VIDEO.title}” — {VIDEO.channel}. <a href={VIDEO.url} target="_blank" rel="noopener noreferrer">Watch on YouTube</a>
        </p>
      </div>

      <div className="card">
        <h2>Normal forms, one by one</h2>
        <p className="sub">
          Each entry gives the definition this lab actually tests, the violation it removes, and how
          to check it by hand. Read a definition, then go and break it in the panel on the left — the
          analyser will name the dependency you used.
        </p>

        {THEORY.map((t) => (
          <div className="theory-item" key={t.id}>
            <button onClick={() => toggle(t.id)} aria-expanded={open === t.id}>
              <span>
                <span className="t-title">{t.title}</span>
                <br />
                <span className="t-one">{t.oneLine}</span>
              </span>
              <span className="muted" style={{ whiteSpace: 'nowrap' }}>
                {visited.includes(t.id) && <span className="pill" style={{ marginRight: 8 }}>read</span>}
                {open === t.id ? '−' : '+'}
              </span>
            </button>
            {open === t.id && (
              <div className="theory-body">
                {t.body.map((p, i) => <p key={i}>{p}</p>)}
                <div className="rule"><b>Violation it removes</b>{t.violates}</div>
                <div className="rule"><b>How to test it</b>{t.test}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>References</h2>
        <p className="sub">
          Every source consulted while building the learning content and implementing the
          algorithms. Acknowledging them is part of the work, not an afterthought.
        </p>

        <div className="refs">
          <h4>Books</h4>
          <ol>{REFERENCES.books.map((r, i) => <li key={i}><Ref text={r} /></li>)}</ol>

          <h4>Research papers</h4>
          <ol>{REFERENCES.papers.map((r, i) => <li key={i}><Ref text={r} /></li>)}</ol>

          <h4>Websites and course material</h4>
          <ol>{REFERENCES.websites.map((r, i) => <li key={i}><Ref text={r} /></li>)}</ol>

          <h4>Videos</h4>
          <ol>{REFERENCES.videos.map((r, i) => <li key={i}><Ref text={r} /></li>)}</ol>

          <h4>Tools and libraries</h4>
          <ol>{REFERENCES.tools.map((r, i) => <li key={i}><Ref text={r} /></li>)}</ol>
        </div>

        <div className="takeaway">{REFERENCES.note}</div>
      </div>
    </>
  );
}
