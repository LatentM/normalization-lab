// atoms.jsx — the three tiny presentational pieces every other component uses.
import { fmt } from '../logic/setOps.js';

/** An attribute set rendered as a chip: <Set of={['A','B']} /> -> AB */
export function Set({ of, tone }) {
  return <span className={`set${tone ? ` ${tone}` : ''}`}>{fmt(of)}</span>;
}

/** A dependency rendered with a real arrow: AB → C  /  A ↠ B */
export function Fd({ of, tone }) {
  if (!of) return null;
  return (
    <span className="fd">
      <span className={`set${tone ? ` ${tone}` : ''}`}>{fmt(of.lhs)}</span>
      <span className="arrow">{of.type === 'mvd' ? '↠' : '→'}</span>
      <span className={`set${tone ? ` ${tone}` : ''}`}>{fmt(of.rhs)}</span>
    </span>
  );
}

/** A list of attribute sets, e.g. all candidate keys. */
export function SetList({ items, tone, empty = '—' }) {
  if (!items || items.length === 0) return <span className="muted">{empty}</span>;
  return (
    <span className="set-list">
      {items.map((s, i) => (
        <Set key={i} of={s} tone={tone} />
      ))}
    </span>
  );
}

/** Nothing-to-show placeholder shown before the user has analysed anything. */
export function Empty({ title, children }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}
