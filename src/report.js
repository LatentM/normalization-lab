// report.js — assembles the downloadable report and writes it out as PDF,
// Word or plain text.
//
// The assignment requires the download to contain, in order: the user's inputs,
// the processing steps, intermediate results where applicable, the final output,
// and any tables or figures. buildReport() produces one structured object with
// exactly those parts; the three writers below are pure formatters over it, so
// all three formats always contain the same material.

import { fmt, fmtFd } from './logic/setOps.js';
import { TEAM, GUIDE, COURSE } from './content/team.js';

const stamp = () =>
  new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * buildReport(analysis) -> { title, meta, sections }
 * Each section is { heading, blocks }, and a block is one of:
 *   { kind: 'text',  text }
 *   { kind: 'kv',    rows: [[label, value]] }
 *   { kind: 'table', head: [...], rows: [[...]] }
 *   { kind: 'list',  items: [...] }
 *   { kind: 'steps', items: [...] }      numbered working
 */
export function buildReport(a) {
  const S = [];
  const P = a.parsed;

  // ── 1 · INPUTS ─────────────────────────────────────────────────────────
  S.push({
    heading: '1. User inputs',
    blocks: [
      {
        kind: 'kv',
        rows: [
          ['Relation', `R(${P.attributes.join(', ')})`],
          ['Attributes', String(P.attributes.length)],
          ['Functional dependencies', P.fds.length ? P.fds.map(fmtFd).join('   ') : 'none'],
          ...(P.mvds.length ? [['Multivalued dependencies', P.mvds.map(fmtFd).join('   ')]] : []),
          ...(P.jds.length
            ? [['Join dependency', P.jds.map((j) => `*(${j.components.map(fmt).join(', ')})`).join('   ')]]
            : []),
          ...(P.warnings.length ? [['Parser notes', P.warnings.join(' · ')]] : []),
        ],
      },
    ],
  });

  // ── 2 · KEYS ───────────────────────────────────────────────────────────
  S.push({
    heading: '2. Processing — candidate keys',
    blocks: [
      {
        kind: 'text',
        text:
          'Every subset of the attribute set is examined in increasing size order. A subset whose closure covers the relation is a superkey; a superkey containing no smaller key already found is minimal, and therefore a candidate key.',
      },
      {
        kind: 'kv',
        rows: [
          ['Candidate keys', a.keys.candidateKeys.map(fmt).join('   ') || '—'],
          ['Prime attributes', fmt(a.keys.primeAttributes)],
          ['Non-prime attributes', fmt(a.keys.nonPrimeAttributes) || 'none'],
          ['Superkeys found', String(a.keys.superKeys.length)],
          ['Subsets examined', String(2 ** P.attributes.length)],
        ],
      },
      { kind: 'steps', items: a.keys.steps.map((s) => `${fmt(s.set)} — ${s.reason}`) },
    ],
  });

  // ── 3 · MINIMAL COVER ──────────────────────────────────────────────────
  S.push({
    heading: '3. Processing — minimal cover',
    blocks: [
      {
        kind: 'text',
        text:
          'Three reductions in a fixed order: split right-hand sides into single attributes, remove extraneous left-hand-side attributes, then remove redundant dependencies. Stage 2 must precede stage 3, or an extraneous attribute can survive in a dependency that stays.',
      },
      { kind: 'steps', items: a.minimalCover.steps.map((s) => s.reason) },
      {
        kind: 'kv',
        rows: [
          ['Started with', `${P.fds.length} dependencies`],
          ['Minimal cover', a.minimalCover.cover.map(fmtFd).join('   ') || '(empty)'],
          ['Finished with', `${a.minimalCover.cover.length} dependencies`],
        ],
      },
    ],
  });

  // ── 4 · NORMAL FORM ────────────────────────────────────────────────────
  const nf = a.normalForm;
  S.push({
    heading: '4. Intermediate result — normal form diagnosis',
    blocks: [
      {
        kind: 'table',
        head: ['Normal form', 'Result', 'Reason'],
        rows: nf.checks.map((c) => [c.nf, c.assumed ? 'assumed' : c.passed ? 'satisfied' : 'VIOLATED', c.note]),
      },
      ...(nf.violations.length
        ? [{
            kind: 'list',
            items: nf.violations.map((v) => `${fmtFd(v.fd)} — ${v.reason}`),
          }]
        : []),
      { kind: 'kv', rows: [['Highest normal form satisfied', nf.highestNF]] },
    ],
  });

  // ── 5 · DECOMPOSITIONS ─────────────────────────────────────────────────
  const { three, bcnf } = a.decomposition;
  const fragRows = (d) =>
    d.relations.map((r) => [
      r.name,
      `(${r.attributes.join(', ')})`,
      r.candidateKeys.map(fmt).join(' / ') || '—',
      r.highestNF,
    ]);

  S.push({
    heading: '5. Final output — decomposition by two algorithms',
    blocks: [
      { kind: 'text', text: 'A · 3NF by synthesis (Bernstein). One relation per dependency of the minimal cover, plus a candidate-key relation if none is contained.' },
      { kind: 'table', head: ['Fragment', 'Attributes', 'Key', 'Form'], rows: fragRows(three) },
      { kind: 'steps', items: three.steps.map((s) => s.reason) },
      {
        kind: 'kv',
        rows: [
          ['Lossless join', three.lossless ? 'YES' : 'NO'],
          ['Dependency preserving', three.dependencyPreserving ? 'YES' : 'NO'],
        ],
      },
      { kind: 'text', text: 'B · BCNF by analysis. Split repeatedly on any dependency whose left side is not a superkey of its fragment.' },
      { kind: 'table', head: ['Fragment', 'Attributes', 'Key', 'Form'], rows: fragRows(bcnf) },
      { kind: 'steps', items: bcnf.steps.map((s) => s.reason) },
      {
        kind: 'kv',
        rows: [
          ['Lossless join', bcnf.lossless ? 'YES' : 'NO'],
          ['Dependency preserving', bcnf.dependencyPreserving ? 'YES' : 'NO'],
          ...(bcnf.dependencyDetail.lostFds.length
            ? [['Dependencies lost', bcnf.dependencyDetail.lostFds.map(fmtFd).join('   ')]]
            : []),
        ],
      },
      {
        kind: 'text',
        text:
          three.dependencyPreserving && !bcnf.dependencyPreserving
            ? `Comparison: both decompositions are lossless. 3NF synthesis preserved every dependency; BCNF analysis lost ${bcnf.dependencyDetail.lostFds.map(fmtFd).join(', ')}, which could then only be checked by joining fragments. This is the classic trade-off — BCNF removes more redundancy and may cost a constraint.`
            : 'Comparison: on this input both algorithms are lossless and both preserve every dependency, so either schema is acceptable. Decomposition is not unique; the shapes may still differ.',
      },
    ],
  });

  // ── 6 · FIGURE: the chase tableau ──────────────────────────────────────
  const tb = bcnf.losslessDetail?.tableau;
  if (tb) {
    S.push({
      heading: '6. Figure — lossless-join proof by the chase (BCNF decomposition)',
      blocks: [
        {
          kind: 'text',
          text:
            'One row per fragment, one column per attribute. aⱼ means "definitely the same value"; bᵢⱼ means "possibly different". Dependencies are applied until nothing changes; a row that becomes all a-symbols proves the join reproduces the original relation exactly.',
        },
        {
          kind: 'table',
          head: ['Fragment', ...tb.attributes],
          rows: tb.grid.map((row, i) => [tb.rows[i].join(''), ...row]),
        },
        { kind: 'text', text: bcnf.losslessDetail.reason },
      ],
    });
  }

  // ── 7 · DEPENDENCY PRESERVATION TABLE ──────────────────────────────────
  S.push({
    heading: '7. Table — dependency preservation, dependency by dependency',
    blocks: [
      {
        kind: 'text',
        text:
          'For each dependency X → Y, the set reachable from X when reasoning is confined to one fragment at a time. If Y is inside that set, the dependency can be enforced without a join.',
      },
      {
        kind: 'table',
        head: ['Dependency', 'Reachable within fragments', 'Preserved (3NF)', 'Preserved (BCNF)'],
        rows: three.dependencyDetail.checks.map((c, i) => [
          fmtFd(c.fd),
          fmt(c.reachable),
          c.preserved ? 'yes' : 'NO',
          bcnf.dependencyDetail.checks[i]?.preserved ? 'yes' : 'NO',
        ]),
      },
    ],
  });

  // ── 8 · HIGHER NORMAL FORMS ────────────────────────────────────────────
  if (P.mvds.length || P.jds.length) {
    const blocks = [];
    if (P.mvds.length) {
      blocks.push({ kind: 'kv', rows: [['In 4NF', a.higher.four.is4NF ? 'YES' : 'NO']] });
      if (a.higher.four.violations.length) {
        blocks.push({
          kind: 'list',
          items: a.higher.four.violations.map((v) => `${fmtFd(v.dependency)} — ${v.reason}`),
        });
      }
      if (a.higher.four_decomp?.relations.length) {
        blocks.push({
          kind: 'table',
          head: ['Fragment', 'Attributes', 'Key'],
          rows: a.higher.four_decomp.relations.map((r) => [
            r.name, `(${r.attributes.join(', ')})`, r.candidateKeys.map(fmt).join(' / ') || '—',
          ]),
        });
      }
    }
    if (P.jds.length && a.higher.five) {
      blocks.push({ kind: 'text', text: `5NF check — ${a.higher.five.reason}` });
      if (a.higher.five.components) {
        blocks.push({
          kind: 'table',
          head: ['Component', 'Closure', 'Superkey?'],
          rows: a.higher.five.components.map((c) => [fmt(c.component), fmt(c.closure), c.isSuperkey ? 'yes' : 'no']),
        });
      }
      blocks.push({ kind: 'text', text: `Scope of this check: ${a.higher.five.scope}` });
    }
    S.push({ heading: '8. Higher normal forms', blocks });
  }

  return {
    title: 'Normalization Virtual Lab — Worked Solution',
    meta: [
      ['Relation', `R(${P.attributes.join(', ')})`],
      ['Highest normal form', nf.highestNF],
      ['Generated', stamp()],
      ['Course', `${COURSE.code} — ${COURSE.name}, ${COURSE.institution}`],
      ['Team', TEAM.filter((m) => !m.placeholder).map((m) => `${m.name} (${m.regNo})`).join('; ')],
      [GUIDE.label, `${GUIDE.name}, ${GUIDE.title}`],
    ],
    sections: S,
  };
}

// ── ASCII transliteration, for the PDF only ───────────────────────────────
//
// jsPDF's built-in fonts are WinAnsi-encoded: they have no glyph for →, ⁺, ∅ or
// any of the set operators, and render them as mojibake. Embedding a Unicode
// typeface would add hundreds of kilobytes to the bundle for one output format.
//
// Instead the PDF writer transliterates to ASCII — and the forms chosen are
// exactly the input syntax this lab already accepts, so a dependency in the PDF
// reads the same way you would type it back in. The text and Word writers keep
// the Unicode, because both handle UTF-8 natively.

const ASCII = [
  [/↠/g, '->>'], [/→/g, '->'], [/⟶/g, '-->'], [/⁺/g, '+'],
  [/∅/g, '{}'], [/∩/g, ' intersect '], [/∪/g, ' union '],
  [/⊆/g, ' subset of '], [/⊄/g, ' not subset of '], [/⊂/g, ' proper subset of '],
  [/≠/g, ' != '], [/≈/g, '~'], [/×/g, 'x'], [/⋈/g, ' JOIN '],
  [/ⱼ/g, 'j'], [/ᵢ/g, 'i'], [/ⁿ/g, '^n'], [/²/g, '^2'],
  [/[₀₁₂₃₄₅₆₇₈₉]/g, (c) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(c))],
  [/[₁-₉]/g, ''],
  [/[—–]/g, '-'], [/[""„]/g, '"'], [/['']/g, "'"], [/…/g, '...'],
  [/·/g, '-'], [/✓/g, 'YES'], [/✗/g, 'NO'], [/\u00a0/g, ' '],
];

function ascii(v) {
  let out = String(v ?? '');
  for (const [re, to] of ASCII) out = out.replace(re, to);
  // Anything still outside Latin-1 would render as a box; drop it rather than
  // ship a glyph the reader cannot identify.
  return out.replace(/[^\x20-\xFF\n]/g, '');
}

/** Deep-copy a report with every string transliterated. */
function asciiReport(r) {
  const b = (blk) => {
    if (blk.kind === 'text') return { ...blk, text: ascii(blk.text) };
    if (blk.kind === 'kv') return { ...blk, rows: blk.rows.map(([k, v]) => [ascii(k), ascii(v)]) };
    if (blk.kind === 'list' || blk.kind === 'steps') return { ...blk, items: blk.items.map(ascii) };
    if (blk.kind === 'table') return { ...blk, head: blk.head.map(ascii), rows: blk.rows.map((row) => row.map(ascii)) };
    return blk;
  };
  return {
    title: ascii(r.title),
    meta: r.meta.map(([k, v]) => [ascii(k), ascii(v)]),
    sections: r.sections.map((s) => ({ heading: ascii(s.heading), blocks: s.blocks.map(b) })),
  };
}

// ── writers ───────────────────────────────────────────────────────────────

/**
 * Hand a generated file to the user.
 *
 * On the deployed site this is the ordinary anchor download, which is all a
 * static page needs. The lab is also previewed inside a sandboxed viewer that
 * blocks anchor downloads outright; that host instead exposes a mediated save
 * API, so we use it when it is there. The feature test costs nothing on the
 * deployed site, where the API simply does not exist.
 *
 * Returns a message to show the user, or null when the file was saved silently.
 */
async function download(blob, filename) {
  const mediated = await mediatedSave();
  if (!mediated) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke on the next tick; revoking synchronously can cancel the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return null;
  }

  try {
    await mediated.save({ filename, data: blob });
    return null;
  } catch (e) {
    const code = e?.code;
    if (code === 'declined') return null;               // the user said no; not an error
    if (code === 'rejected_extension' || code === 'extension_not_enabled') {
      return `This preview cannot save .${filename.split('.').pop()} files. ` +
             'Use the PDF or text download here — every format works on the deployed site.';
    }
    return `The file could not be saved: ${e?.message || code || e}`;
  }
}

/** The sandboxed viewer's mediated save API, or null on an ordinary web page. */
async function mediatedSave() {
  try {
    const host = globalThis.claude;
    if (!host || typeof host.use !== 'function') return null;
    return await host.use('downloads');
  } catch {
    return null;
  }
}

const slug = (r) => `normalization-${r.meta[0][1].replace(/[^A-Za-z0-9]+/g, '') || 'relation'}`;

/** Plain text. */
export function toText(r) {
  const L = [];
  const rule = (c = '=') => c.repeat(74);
  L.push(rule(), r.title.toUpperCase(), rule());
  r.meta.forEach(([k, v]) => L.push(`${(k + ':').padEnd(24)}${v}`));
  L.push('');

  for (const s of r.sections) {
    L.push('', rule('-'), s.heading.toUpperCase(), rule('-'));
    for (const b of s.blocks) {
      if (b.kind === 'text') { L.push(wrap(b.text, 74), ''); }
      else if (b.kind === 'kv') { b.rows.forEach(([k, v]) => L.push(`  ${(k + ':').padEnd(28)}${v}`)); L.push(''); }
      else if (b.kind === 'list') { b.items.forEach((i) => L.push(wrap('  * ' + i, 74))); L.push(''); }
      else if (b.kind === 'steps') { b.items.forEach((i, n) => L.push(wrap(`  ${String(n + 1).padStart(2)}. ${i}`, 74))); L.push(''); }
      else if (b.kind === 'table') {
        const all = [b.head, ...b.rows];
        const w = b.head.map((_, i) => Math.max(...all.map((row) => String(row[i] ?? '').length)));
        L.push('  ' + b.head.map((h, i) => String(h).padEnd(w[i])).join('  |  '));
        L.push('  ' + w.map((x) => '-'.repeat(x)).join('--+--'));
        b.rows.forEach((row) => L.push('  ' + row.map((c, i) => String(c ?? '').padEnd(w[i])).join('  |  ')));
        L.push('');
      }
    }
  }
  L.push(rule(), 'Generated by the Normalization Virtual Lab. Every value above was', 'computed from the stated input at run time; nothing is pre-stored.', rule());
  return L.join('\n');
}

function wrap(text, width) {
  const indent = (text.match(/^\s*/) || [''])[0];
  const words = text.trim().split(/\s+/);
  const lines = [];
  let line = indent;
  for (const w of words) {
    if (line.trim() && (line + ' ' + w).length > width) { lines.push(line); line = indent + '    ' + w; }
    else line = line.trim() ? line + ' ' + w : line + w;
  }
  if (line.trim()) lines.push(line);
  return lines.join('\n');
}

export function downloadText(r) {
  return download(new Blob([toText(r)], { type: 'text/plain;charset=utf-8' }), `${slug(r)}.txt`);
}

/** Word — an HTML document served with Word's MIME type, which Word opens natively. */
export function toHtmlDoc(r) {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const out = [];
  out.push(`<h1>${esc(r.title)}</h1>`);
  out.push('<table class="meta">' + r.meta.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('') + '</table>');

  for (const s of r.sections) {
    out.push(`<h2>${esc(s.heading)}</h2>`);
    for (const b of s.blocks) {
      if (b.kind === 'text') out.push(`<p>${esc(b.text)}</p>`);
      else if (b.kind === 'kv') out.push('<table class="kv">' + b.rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td class="m">${esc(v)}</td></tr>`).join('') + '</table>');
      else if (b.kind === 'list') out.push('<ul>' + b.items.map((i) => `<li>${esc(i)}</li>`).join('') + '</ul>');
      else if (b.kind === 'steps') out.push('<ol>' + b.items.map((i) => `<li>${esc(i)}</li>`).join('') + '</ol>');
      else if (b.kind === 'table') {
        out.push('<table class="grid"><thead><tr>' + b.head.map((h) => `<th>${esc(h)}</th>`).join('') + '</tr></thead><tbody>'
          + b.rows.map((row) => '<tr>' + row.map((c) => `<td class="m">${esc(c)}</td>`).join('') + '</tr>').join('')
          + '</tbody></table>');
      }
    }
  }

  return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(r.title)}</title>
<style>
@page { size: A4; margin: 2cm; }
body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.5; color: #111; }
h1 { font-size: 19pt; margin: 0 0 4pt; }
h2 { font-size: 13pt; margin: 20pt 0 6pt; border-bottom: 1pt solid #999; padding-bottom: 3pt; }
p { margin: 6pt 0; }
.m { font-family: "Consolas", "Courier New", monospace; font-size: 9.5pt; }
table { border-collapse: collapse; margin: 8pt 0; width: 100%; }
table.meta th, table.kv th { text-align: left; width: 30%; font-size: 9pt; text-transform: uppercase;
  letter-spacing: .04em; color: #555; padding: 3pt 8pt 3pt 0; vertical-align: top; font-weight: normal; }
table.meta td, table.kv td { padding: 3pt 0; vertical-align: top; }
table.grid th, table.grid td { border: 0.5pt solid #999; padding: 4pt 7pt; text-align: left; font-size: 9.5pt; }
table.grid th { background: #eee; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .04em; }
ol, ul { margin: 6pt 0; padding-left: 20pt; }
li { margin: 3pt 0; }
</style></head><body>${out.join('\n')}
<p style="margin-top:24pt;font-size:9pt;color:#666">Generated by the Normalization Virtual Lab.
Every value above was computed from the stated input at run time; nothing is pre-stored.</p>
</body></html>`;
}

export function downloadDoc(r) {
  return download(new Blob(['﻿', toHtmlDoc(r)], { type: 'application/msword' }), `${slug(r)}.doc`);
}

/** PDF, drawn with jsPDF so the output does not depend on the print dialog. */
export async function downloadPdf(source) {
  const r = asciiReport(source);
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const M = 48;                       // margin
  const W = doc.internal.pageSize.getWidth() - M * 2;
  const H = doc.internal.pageSize.getHeight();
  let y = M;
  let page = 1;

  const footer = () => {
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(130);
    doc.text('Normalization Virtual Lab — computed at run time, nothing pre-stored.', M, H - 24);
    doc.text(String(page), M + W, H - 24, { align: 'right' });
    doc.setTextColor(0);
  };
  const need = (h) => {
    if (y + h < H - 44) return;
    footer(); doc.addPage(); page++; y = M;
  };
  const text = (s, { size = 9.5, style = 'normal', font = 'helvetica', indent = 0, gap = 3, colour = 40 } = {}) => {
    doc.setFont(font, style).setFontSize(size).setTextColor(colour);
    const lines = doc.splitTextToSize(String(s), W - indent);
    for (const ln of lines) { need(size + 3); doc.text(ln, M + indent, y); y += size + 2.5; }
    y += gap;
    doc.setTextColor(0);
  };

  // Title block
  doc.setFont('times', 'bold').setFontSize(18);
  doc.text(r.title, M, y); y += 22;
  doc.setDrawColor(150).setLineWidth(0.6).line(M, y, M + W, y); y += 14;
  for (const [k, v] of r.meta) {
    need(13);
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(110);
    doc.text(k.toUpperCase(), M, y);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(20);
    const lines = doc.splitTextToSize(String(v), W - 130);
    doc.text(lines, M + 130, y);
    y += Math.max(13, lines.length * 11);
  }
  doc.setTextColor(0); y += 8;

  for (const s of r.sections) {
    need(40);
    y += 8;
    doc.setDrawColor(190).setLineWidth(0.5).line(M, y - 6, M + W, y - 6);
    doc.setFont('times', 'bold').setFontSize(12.5).setTextColor(10);
    need(18); doc.text(s.heading, M, y); y += 15;
    doc.setTextColor(0);

    for (const b of s.blocks) {
      if (b.kind === 'text') text(b.text, { size: 9.5, colour: 55, gap: 6 });
      else if (b.kind === 'kv') {
        for (const [k, v] of b.rows) {
          need(13);
          doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(110);
          doc.text(String(k).toUpperCase(), M + 6, y);
          doc.setFont('courier', 'normal').setFontSize(8.5).setTextColor(20);
          const lines = doc.splitTextToSize(String(v), W - 150);
          doc.text(lines, M + 150, y);
          y += Math.max(12, lines.length * 10);
        }
        y += 6; doc.setTextColor(0);
      }
      else if (b.kind === 'list') { b.items.forEach((i) => text('•  ' + i, { size: 9, indent: 8, gap: 1, colour: 55 })); y += 5; }
      else if (b.kind === 'steps') { b.items.forEach((i, n) => text(`${n + 1}.  ${i}`, { size: 9, indent: 8, gap: 1, colour: 55 })); y += 5; }
      else if (b.kind === 'table') {
        const cols = b.head.length;
        const cw = W / cols;
        need(24);
        doc.setFillColor(238).rect(M, y - 9, W, 14, 'F');
        doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(60);
        b.head.forEach((h, i) => doc.text(String(h).toUpperCase(), M + 4 + i * cw, y));
        y += 12;
        doc.setFont('courier', 'normal').setFontSize(8).setTextColor(20);
        for (const row of b.rows) {
          const cells = row.map((c) => doc.splitTextToSize(String(c ?? ''), cw - 8));
          const h = Math.max(...cells.map((c) => c.length)) * 9.5 + 5;
          need(h + 2);
          cells.forEach((c, i) => doc.text(c, M + 4 + i * cw, y));
          y += h;
          doc.setDrawColor(224).setLineWidth(0.3).line(M, y - 4, M + W, y - 4);
        }
        y += 8; doc.setTextColor(0);
      }
    }
  }
  footer();
  // doc.save() goes straight to an anchor download, which the sandboxed
  // preview blocks — route the bytes through the same helper as the others.
  return download(doc.output('blob'), `${slug(source)}.pdf`);
}
