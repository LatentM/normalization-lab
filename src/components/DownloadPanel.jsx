// DownloadPanel.jsx — the mandatory Download section.
//
// One report, three formats. The assignment requires the downloaded file to
// document the complete execution: the user's inputs, the processing steps,
// intermediate results, the final output, and any tables or figures. All of
// that is assembled once by buildReport() in src/report.js, so the PDF, the
// Word document and the text file always contain the same material.

import { useState } from 'react';
import { Empty } from './atoms.jsx';
import DependencyGraph from './DependencyGraph.jsx';
import { buildReport, downloadPdf, downloadDoc, downloadText, toText } from '../report.js';

const FORMATS = [
  {
    id: 'pdf',
    label: 'PDF',
    why: 'Typeset and paginated. The format to attach to the report or hand in.',
    run: downloadPdf,
  },
  {
    id: 'doc',
    label: 'Word',
    why: 'Opens in Word or Google Docs with the tables intact, so you can edit or paste sections into a report.',
    run: downloadDoc,
  },
  {
    id: 'txt',
    label: 'Text',
    why: 'Plain text with the tables drawn in monospace. Diffable, greppable, and safe to paste anywhere.',
    run: downloadText,
  },
];

export default function DownloadPanel({ analysis }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  if (!analysis) {
    return (
      <Empty title="Nothing to download yet">
        Enter a relation in the panel on the left and press Analyse. The report is generated from
        the result, so there has to be one first.
      </Empty>
    );
  }

  const report = buildReport(analysis);

  const go = async (f) => {
    setBusy(f.id);
    setError(null);
    try {
      // The writers resolve to a message when the host could not save the
      // file, and to null when it went through.
      const note = await f.run(report);
      if (note) setError(note);
    } catch (e) {
      setError(`Could not generate the ${f.label} file: ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  };

  const preview = toText(report);

  return (
    <>
      <div className="card">
        <h2>Download the worked solution</h2>
        <p className="sub">
          A complete record of this analysis — what you entered, how it was processed, every
          intermediate result, the final schemas, and the figures that justify them. Choose a format;
          the contents are identical in all three.
        </p>

        <div className="dl-grid">
          {FORMATS.map((f) => (
            <div className="dl-opt" key={f.id}>
              <span className="fmt">{f.label}</span>
              <span className="why">{f.why}</span>
              <button className="btn" disabled={busy !== null} onClick={() => go(f)}>
                {busy === f.id ? 'Generating' : `Download .${f.id}`}
              </button>
            </div>
          ))}
        </div>

        {error && <div className="msg error" style={{ marginTop: 18 }}>{error}</div>}

        <h3>What the file contains</h3>
        <ul className="contents-list">
          <li><b>1</b><span><b>Your inputs.</b> The relation, every dependency as typed, and any parser notes.</span></li>
          <li><b>2</b><span><b>Processing — keys.</b> How the candidate keys were found, how many subsets were examined, and the reason for each key.</span></li>
          <li><b>3</b><span><b>Processing — minimal cover.</b> Every reduction with the closure that justified it.</span></li>
          <li><b>4</b><span><b>Intermediate result — normal form.</b> All four rungs with pass, fail or assumed, and the violating dependency for each failure.</span></li>
          <li><b>5</b><span><b>Final output.</b> Both decompositions as tables of fragments, keys and forms, with the lossless and dependency-preserving verdicts and a comparison.</span></li>
          <li><b>6</b><span><b>Figure.</b> The chase tableau that proves the lossless-join property.</span></li>
          <li><b>7</b><span><b>Table.</b> Dependency preservation checked dependency by dependency, for both algorithms side by side.</span></li>
          <li><b>8</b><span><b>Higher normal forms.</b> Included when you supplied multivalued or join dependencies.</span></li>
        </ul>
      </div>

      <div className="card">
        <h2>Figure — the dependency graph</h2>
        <p className="sub">
          The same dependency set drawn as a directed graph. A transitive chain shows up as a path, a
          cycle means every attribute on it is a key, and an attribute nothing points at must belong
          to every candidate key.
        </p>
        <DependencyGraph analysis={analysis} />
      </div>

      <div className="card">
        <h2>Preview</h2>
        <p className="sub">
          The text version in full, so you can check the contents before downloading anything.
        </p>
        <pre className="qgiven" style={{ maxHeight: 460, overflow: 'auto', whiteSpace: 'pre' }}>{preview}</pre>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn ghost" onClick={() => navigator.clipboard?.writeText(preview)}>
            Copy to clipboard
          </button>
          <button className="btn ghost" onClick={() => window.print()}>
            Print this page
          </button>
        </div>
      </div>
    </>
  );
}
