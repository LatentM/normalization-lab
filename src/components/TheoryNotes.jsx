// TheoryNotes.jsx — Member C's notes, rendered. Content lives in src/content/theory.js.
import { useState } from 'react';
import { THEORY } from '../content/theory.js';

export default function TheoryNotes({ visited, onVisit }) {
  const [open, setOpen] = useState('1nf');

  const toggle = (id) => {
    const next = open === id ? null : id;
    setOpen(next);
    if (next) onVisit(next);
  };

  return (
    <div className="card">
      <h2>Theory notes</h2>
      <p className="sub">
        Every normal form the lab can diagnose, with the definition it actually tests, the violation it
        removes, and a worked example. Read the definition, then go and break it in the panel on the left —
        the tool will name the dependency you used.
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
              <div className="rule">
                <b>Violation it removes</b>
                {t.violates}
              </div>
              <div className="rule">
                <b>How to test it</b>
                {t.test}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="takeaway" style={{ marginTop: 18 }}>
        <b>The one-sentence summary of the whole topic:</b> every normal form is a different way of saying
        "one fact should be stored in exactly one place", and each one is stricter about what counts as
        one fact — 2NF about parts of keys, 3NF about chains, BCNF about any non-key determinant, 4NF about
        independent sets, 5NF about combinations.
      </div>
    </div>
  );
}
