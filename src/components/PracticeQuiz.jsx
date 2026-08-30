// PracticeQuiz.jsx — 10 auto-graded problems, hints, scoring, progress saved.
import { useState } from 'react';
import { PROBLEMS, QUIZ_META } from '../content/problems.js';

/** Grading for free-text set answers: ignore case, spaces, commas, braces and order. */
function normaliseAnswer(s) {
  const cleaned = (s || '').toUpperCase().replace(/[\s{}(),]/g, '');
  return cleaned.split('').sort().join('');
}
function matches(given, accepted) {
  const g = normaliseAnswer(given);
  return accepted.some((a) => normaliseAnswer(a) === g);
}

function Problem({ p, state, onAnswer, onReveal }) {
  const [text, setText] = useState(state?.answer ?? '');
  const answered = state && state.answer !== undefined && state.answer !== '';
  const correct = state?.correct;

  return (
    <div className="q">
      <div className="qhead">
        <span className="qnum">Q{p.id}</span>
        <span className="qtopic">{p.topic}</span>
        <span className="qdiff">{p.difficulty}</span>
        {answered && (
          <span className="pill" style={{ color: correct ? 'var(--good)' : 'var(--bad)' }}>
            {correct ? 'correct' : 'not yet'}
          </span>
        )}
      </div>

      <div className="qtext">{p.question}</div>
      <div className="qgiven">{`R(${p.relation})\n${p.deps}`}</div>

      {p.type === 'mcq' ? (
        <div className="opts">
          {p.options.map((o, i) => {
            let cls = '';
            if (answered) {
              if (state.answer === i) cls = correct ? 'chosen-right' : 'chosen-wrong';
              else if (state.revealed && i === p.answer) cls = 'reveal-right';
            }
            return (
              <button
                key={i}
                className={cls}
                disabled={answered && correct}
                onClick={() => onAnswer(p.id, i, i === p.answer)}
              >
                {String.fromCharCode(65 + i)}. {o}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="btn-row">
          <input
            type="text"
            style={{ maxWidth: 260 }}
            placeholder="e.g. ABC"
            value={text}
            disabled={answered && correct}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onAnswer(p.id, text, matches(text, p.answer));
            }}
          />
          <button
            className="btn"
            disabled={!text.trim() || (answered && correct)}
            onClick={() => onAnswer(p.id, text, matches(text, p.answer))}
          >
            Check
          </button>
        </div>
      )}

      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="btn ghost small" onClick={() => onReveal(p.id, 'hint')}>
          {state?.hint ? 'Hide hint' : 'Hint'}
        </button>
        {(answered || state?.revealed) && (
          <button className="btn ghost small" onClick={() => onReveal(p.id, 'explain')}>
            {state?.revealed ? 'Hide explanation' : 'Show explanation'}
          </button>
        )}
      </div>

      {state?.hint && <div className="msg info" style={{ marginTop: 10 }}>{p.hint}</div>}
      {state?.revealed && (
        <div className="msg ok" style={{ marginTop: 10 }}>
          {p.type === 'mcq' && (
            <div style={{ marginBottom: 6 }}>
              <b>Answer: {String.fromCharCode(65 + p.answer)}. {p.options[p.answer]}</b>
            </div>
          )}
          {p.type === 'set' && <div style={{ marginBottom: 6 }}><b>Answer: {p.answer[0]}</b></div>}
          {p.explanation}
        </div>
      )}
    </div>
  );
}

export default function PracticeQuiz({ quiz, onUpdate }) {
  const answeredIds = Object.keys(quiz).filter((k) => quiz[k]?.answer !== undefined && quiz[k].answer !== '');
  const score = answeredIds.filter((k) => quiz[k].correct).length;
  const pct = Math.round((score / QUIZ_META.total) * 100);

  const handleAnswer = (id, answer, correct) => {
    onUpdate({ ...quiz, [id]: { ...quiz[id], answer, correct, revealed: correct ? true : quiz[id]?.revealed } });
  };
  const handleReveal = (id, which) => {
    const cur = quiz[id] ?? {};
    if (which === 'hint') onUpdate({ ...quiz, [id]: { ...cur, hint: !cur.hint } });
    else onUpdate({ ...quiz, [id]: { ...cur, revealed: !cur.revealed } });
  };

  return (
    <>
      <div className="card">
        <h2>Practice zone</h2>
        <p className="sub">{QUIZ_META.intro}</p>
        <div className="score">
          <span className="n">{score}<span className="muted" style={{ fontSize: 15 }}>/{QUIZ_META.total}</span></span>
          <span className="bar"><i style={{ width: `${pct}%` }} /></span>
          <span className="muted">
            {answeredIds.length === 0
              ? 'Not started.'
              : score >= QUIZ_META.passMark
                ? 'Comfortable with this material.'
                : `${answeredIds.length} attempted. Aim for ${QUIZ_META.passMark}.`}
          </span>
          <button className="btn ghost small" onClick={() => onUpdate({})}>Reset</button>
        </div>
        <p className="muted">
          Progress is stored in this browser, so you can close the tab and come back to it.
        </p>
      </div>

      {PROBLEMS.map((p) => (
        <Problem key={p.id} p={p} state={quiz[p.id]} onAnswer={handleAnswer} onReveal={handleReveal} />
      ))}
    </>
  );
}
