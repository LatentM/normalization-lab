// MinimalCoverView.jsx — the three reduction stages, each one visible.
import { Fd, Empty } from './atoms.jsx';

const STAGE_INFO = {
  'singleton-rhs': {
    n: 1,
    title: 'Split every right-hand side',
    text: 'A → BC becomes A → B and A → C. Always safe — it is just the decomposition rule — and it makes the next two stages possible.',
  },
  'remove-extraneous-lhs': {
    n: 2,
    title: 'Remove extraneous left-hand-side attributes',
    text: 'For AB → C, drop B and ask whether A⁺ still contains C. If it does, B was carrying no weight.',
  },
  'remove-redundant-fd': {
    n: 3,
    title: 'Remove redundant dependencies',
    text: 'Delete X → Y, then recompute X⁺ from what remains. If Y is still reachable, the dependency was implied by the others.',
  },
  done: { n: 0, title: 'Already minimal', text: '' },
};

export default function MinimalCoverView({ analysis }) {
  if (!analysis) {
    return <Empty title="Nothing analysed yet">Enter a relation in the panel on the left and press Analyse.</Empty>;
  }

  const { cover, steps } = analysis.minimalCover;
  const grouped = ['singleton-rhs', 'remove-extraneous-lhs', 'remove-redundant-fd', 'done']
    .map((stage) => ({ stage, items: steps.filter((s) => s.stage === stage) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="card">
      <h2>Minimal cover</h2>
      <p className="sub">
        The smallest dependency set equivalent to the one you typed — same closure, nothing extraneous.
        3NF synthesis is only correct when it starts from one, which is why this step comes before any
        decomposition.
      </p>

      <div className="verdict">
        <span className="big">F<sub>c</sub></span>
        <span className="txt">
          {cover.length === 0 ? (
            <>The cover is empty — every dependency you gave was trivial or implied by the others.</>
          ) : (
            <span className="set-list">
              {cover.map((f, i) => <Fd key={i} of={f} />)}
            </span>
          )}
        </span>
      </div>

      <p className="muted">
        Started with {analysis.parsed.fds.length} dependenc{analysis.parsed.fds.length === 1 ? 'y' : 'ies'},
        finished with {cover.length}.
      </p>

      {grouped.map((g) => {
        const info = STAGE_INFO[g.stage];
        return (
          <div key={g.stage}>
            <h3>
              {info.n > 0 && `Stage ${info.n} — `}{info.title}
            </h3>
            {info.text && <p className="sub" style={{ marginBottom: 10 }}>{info.text}</p>}
            <ol className="steps">
              {g.items.map((s, i) => (
                <li key={i}>
                  <div className="step-line">
                    {s.fdAffected && <Fd of={s.fdAffected} tone={g.stage === 'remove-redundant-fd' ? 'bad' : undefined} />}
                    {s.result && s.result.length > 0 && (
                      <>
                        <span className="muted">becomes</span>
                        {s.result.map((r, k) => <Fd key={k} of={r} tone="good" />)}
                      </>
                    )}
                    {g.stage === 'remove-redundant-fd' && <span className="pill">deleted</span>}
                  </div>
                  <div className="step-why">{s.reason}</div>
                </li>
              ))}
            </ol>
          </div>
        );
      })}

      <div className="msg info" style={{ marginTop: 16 }}>
        <b>Order matters.</b> Stage 2 must come before stage 3. Removing redundant dependencies first can
        leave an extraneous attribute stranded in a dependency that survives — the result is still a cover,
        but not a <i>minimal</i> one. This is the most common place for an implementation to be quietly
        wrong while still looking plausible.
      </div>
    </div>
  );
}
