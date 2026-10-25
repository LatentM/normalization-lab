/* ===================== REPORT + DOWNLOAD ===================== */
/* One structured report; three writers (PDF, Word, text) format the same blocks. */
function buildReport(R) {
  const { n, A } = R; const B = []; const now = new Date();
  const h = (t) => B.push({ k: 'h', t }); const p = (t) => B.push({ k: 'p', t });
  const list = (items, ordered) => B.push({ k: 'list', items, ordered }); const table = (head, rows) => B.push({ k: 'table', head, rows });
  const mono = (lines) => B.push({ k: 'mono', lines });
  B.push({ k: 'title', t: `Normalization report: ${R.name}`, sub: `Normalization Virtual Lab · ${TEAM.course} · ${now.toLocaleString()}` });
  h('1. Inputs');
  table(['Item', 'Value'], [['Relation', `${R.name}(${R.attrs.join(', ')})`], ['Attributes', String(R.attrs.length)],
    ['Functional dependencies', R.fds.map((f) => n.fd(f)).join('; ') || 'none'], ['Multivalued dependencies', R.mvds.map((m) => n.fd(m, '->>')).join('; ') || 'none'],
    ['Decomposition to test', LAB.decomp.trim() || 'none']]);
  h('2. Dependency diagram'); B.push({ k: 'figure', caption: `Figure 1. Dependency diagram of ${R.name}. Blue: superkey determinant; violet: prime right side; amber: partial; red: transitive.` });
  h('3. Candidate keys');
  p(`Attributes in every key (never on a right side): ${n.set(R.K.core)}. Searched: ${n.set(R.K.middle)}. In no key: ${n.set(R.all & ~R.K.core & ~R.K.middle)}.`);
  table(['Candidate key', 'Closure', 'Minimal?'], A.keys.map((k) => [n.set(k), n.set(NF.closure(k, R.fds)), 'yes: no proper subset closes to all attributes']));
  p(`Prime attributes: ${n.set(A.prime)}. Non-prime attributes: ${n.set(A.nonprime)}. Number of superkeys: ${R.superkeys}.`);
  h('4. Closures of every determinant');
  table(['X', 'X+', 'Superkey?'], [...new Set(R.fds.map((f) => f.lhs))].map((x) => [n.set(x), n.set(NF.closure(x, R.fds)), NF.closure(x, R.fds) === R.all ? 'yes' : 'no']));
  const k0 = A.keys[0]; const tr = NF.closure(k0, R.fds, true);
  p(`Worked derivation of ${n.set(k0)}+:`); list([`Start with ${n.set(k0)}`].concat(tr.steps.map((s) => `${n.fd(s.fd)} applies, add ${n(s.added)}, giving ${n.set(s.result)}`)), true);
  h('5. Minimal cover');
  R.cover.stages.forEach((s, i) => { p(`Stage ${i + 1}: ${s.title}.`); mono([s.fds.map((f) => n.fd(f)).join('   ')]); });
  p(`Canonical cover: ${R.canon.map((f) => n.fd(f)).join('; ')}.`);
  h('6. Normal-form analysis');
  const kindTxt = { bcnf: 'superkey determinant (BCNF ok)', '3nf': 'prime right side (3NF ok, breaks BCNF)', partial: 'partial dependency (breaks 2NF)', transitive: 'transitive dependency (breaks 3NF)' };
  table(['Dependency', 'LHS superkey?', 'RHS prime?', 'Verdict'], A.rows.map((r) => [n.fd(r.fd), NF.closure(r.fd.lhs, R.fds) === R.all ? 'yes' : 'no', NF.sub(r.fd.rhs, A.prime) ? 'yes' : 'no', kindTxt[r.kind]]));
  if (A.partials.length) p('Partial dependencies: ' + A.partials.map((x) => `${n.fd(x)} (part of key ${n.set(x.key)})`).join('; ') + '.');
  p(`Result: ${R.name} is in ${A.highest}. 2NF ${A.in2 ? 'holds' : 'fails'}; 3NF ${A.in3 ? 'holds' : 'fails'}; BCNF ${A.inB ? 'holds' : 'fails'}; 4NF ${A.in4 ? 'holds' : 'fails'}${A.in4 ? (A.fiveNF ? '; 5NF holds (3NF with all keys simple).' : '; 5NF cannot be decided from FDs and MVDs alone.') : '.'}`);
  const relRows = (rels) => rels.map((r, i) => { const an = NF.analyse(r.mask, r.fds); return [`R${i + 1}(${n(r.mask)})`, r.fds.map((f) => n.fd(f)).join('; ') || 'none', n.list(an.keys), an.inB ? 'BCNF' : an.highest]; });
  const props = (pp) => `${pp.lossless ? 'Lossless' : 'Lossy'}; ${pp.pres.preserved ? 'dependency preserving' : 'loses ' + pp.pres.results.filter((x) => !x.kept).map((x) => n.fd(x.fd)).join(', ')}.`;
  h('7. 3NF synthesis (Bernstein)');
  table(['Relation', 'Dependencies', 'Keys', 'Form'], relRows(R.syn.relations)); p(props(R.synProps));
  h('8. BCNF decomposition');
  const splits = []; (function walk(node) { if (node.violation) splits.push(`${n.set(node.mask)} split on ${n.fd(node.violation, node.violation.kind === 'mvd' ? '->>' : '->')}`); node.children.forEach(walk); })(R.bcnf.tree);
  if (splits.length) list(splits, true); else p('Already in BCNF; no split needed.');
  table(['Relation', 'Dependencies', 'Keys', 'Form'], relRows(R.bcnf.relations)); p(props(R.bcnfProps));
  if (R.chase) {
    h('9. Test of the given decomposition');
    p(`Decomposition: ${R.decomp.parts.map((x) => `${x.name}(${n(x.mask)})`).join(', ')}.`);
    const last = R.chase.steps[R.chase.steps.length - 1];
    const sym = (v, j) => (v === 0 ? `a${j + 1}` : `b${Math.floor(v / 100)}${j + 1}`);
    table([''].concat(R.chase.cols.map((c) => R.attrs[c])), last.tableau.map((r, i) => [R.decomp.parts[i] ? R.decomp.parts[i].name : 'new'].concat(r.map(sym))));
    p(`Chase applied ${R.chase.steps.length - 1} change step(s). ${R.chase.lossless ? 'A row became all distinguished: lossless join.' : 'No row became all distinguished: lossy join.'}`);
    table(['Dependency', 'Preserved?'], R.pres.results.map((x) => [n.fd(x.fd), x.kept ? 'yes' : 'no']));
  }
  h(R.chase ? '10. Conclusion' : '9. Conclusion');
  p(`${R.name} has ${A.keys.length} candidate key(s), ${n.list(A.keys)}, and is in ${A.highest}. A lossless, dependency-preserving 3NF design has ${R.syn.relations.length} relation(s); the BCNF decomposition has ${R.bcnf.relations.length} relation(s) and ${R.bcnfProps.pres.preserved ? 'preserves every dependency' : 'does not preserve every dependency'}.`);
  return B;
}

const ascii = (s) => String(s).replace(/→/g, '->').replace(/↠/g, '->>').replace(/⁺/g, '+').replace(/∅/g, '{}').replace(/⊆/g, 'subset of').replace(/·/g, '-').replace(/[–—]/g, '-').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...').replace(/[^\x20-\x7E\n]/g, '?');

function reportText(B, R) {
  const out = []; const wrap = (t, w = 92) => { const words = t.split(' '); const lines = []; let l = ''; words.forEach((x) => { if ((l + ' ' + x).trim().length > w) { lines.push(l); l = x; } else l = (l + ' ' + x).trim(); }); if (l) lines.push(l); return lines; };
  B.forEach((b) => {
    if (b.k === 'title') { out.push(b.t, '='.repeat(b.t.length), b.sub, ''); }
    else if (b.k === 'h') out.push('', b.t, '-'.repeat(b.t.length));
    else if (b.k === 'p') out.push(...wrap(b.t), '');
    else if (b.k === 'list') { b.items.forEach((x, i) => { const w = wrap(x, 86); out.push((b.ordered ? `${i + 1}. ` : '- ') + w[0], ...w.slice(1).map((l) => '   ' + l)); }); out.push(''); }
    else if (b.k === 'mono') out.push(...b.lines.map((l) => '    ' + l), '');
    else if (b.k === 'figure') { out.push(...asciiDiagram(R), '', b.caption, ''); }
    else if (b.k === 'table') {
      const rows = [b.head].concat(b.rows); const w = b.head.map((_, j) => Math.min(48, Math.max(...rows.map((r) => String(r[j]).length))));
      const line = (r) => '| ' + r.map((c, j) => String(c).slice(0, w[j]).padEnd(w[j])).join(' | ') + ' |';
      out.push(line(b.head), '|' + w.map((x) => '-'.repeat(x + 2)).join('|') + '|', ...b.rows.map(line), '');
    }
  });
  return out.join('\n');
}
function asciiDiagram(R) {
  const names = R.attrs; const w = names.map((a) => a.length + 2); const pos = []; let x = 0; w.forEach((ww) => { pos.push(x + Math.floor(ww / 2)); x += ww + 2; });
  const width = x; const lines = [names.map((a, i) => ` ${a} `.padEnd(w[i] + 2)).join('')];
  R.fds.forEach((f) => {
    const L = NF.bits(f.lhs), Rr = NF.bits(f.rhs & ~f.lhs); const xs = L.concat(Rr).map((i) => pos[i]);
    const row = Array(width).fill(' '); for (let c = Math.min(...xs); c <= Math.max(...xs); c++) row[c] = '-';
    L.forEach((i) => (row[pos[i]] = 'o')); Rr.forEach((i) => (row[pos[i]] = '^'));
    lines.push(row.join('') + '   ' + R.n.fd(f));
  });
  return lines;
}

function diagramPNG(R) {
  return new Promise((resolve) => {
    const svg = diagramSVG(R, { print: true }); const m = svg.match(/width="(\d+)" height="(\d+)"/); const w = +m[1], hgt = +m[2];
    const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = w * 2; c.height = hgt * 2; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.scale(2, 2); g.drawImage(img, 0, 0); resolve({ url: c.toDataURL('image/png'), w, h: hgt }); };
    img.onerror = () => resolve(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
const LIBS = {};
function loadLib(url, global) {
  if (window[global]) return Promise.resolve(window[global]);
  if (!LIBS[url]) LIBS[url] = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = url;
    const fail = () => { delete LIBS[url]; s.remove(); rej(new Error('could not reach ' + new URL(url).host + ' (check the internet connection)')); };
    const timer = setTimeout(fail, 15000); // a blocked or very slow network fails with a message instead of doing nothing
    s.onload = () => { clearTimeout(timer); window[global] ? res(window[global]) : fail(); }; s.onerror = () => { clearTimeout(timer); fail(); };
    document.head.appendChild(s);
  });
  return LIBS[url];
}

async function reportPDF(B, R) {
  await loadLib('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf');
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  const M = 18, W = 210 - 2 * M; let y = M; const fig = await diagramPNG(R);
  const need = (hh) => { if (y + hh > 297 - M) { doc.addPage(); y = M; } };
  const text = (t, size, style, font = 'helvetica', gapAfter = 2) => { doc.setFont(font, style); doc.setFontSize(size); const lines = doc.splitTextToSize(ascii(t), W); lines.forEach((l) => { need(size * 0.45); doc.text(l, M, y); y += size * 0.45; }); y += gapAfter; };
  B.forEach((b) => {
    if (b.k === 'title') { text(b.t, 17, 'bold', 'helvetica', 1); doc.setTextColor(100); text(b.sub, 9, 'normal', 'helvetica', 4); doc.setTextColor(0); doc.setDrawColor(31, 79, 209); doc.setLineWidth(0.6); doc.line(M, y - 2, M + W, y - 2); y += 2; }
    else if (b.k === 'h') { y += 2; need(12); text(b.t, 12.5, 'bold', 'helvetica', 1.5); }
    else if (b.k === 'p') text(b.t, 10, 'normal');
    else if (b.k === 'list') b.items.forEach((x, i) => text((b.ordered ? `${i + 1}. ` : '- ') + x, 10, 'normal', 'helvetica', 0.6));
    else if (b.k === 'mono') b.lines.forEach((l) => text(l, 9, 'normal', 'courier', 1.5));
    else if (b.k === 'figure') {
      if (fig) { const ww = Math.min(W, fig.w * 0.28); const hh = ww * fig.h / fig.w; need(hh + 8); doc.addImage(fig.url, 'PNG', M, y, ww, hh); y += hh + 3; }
      else asciiDiagram(R).forEach((l) => text(l, 8, 'normal', 'courier', 0));
      doc.setTextColor(90); text(b.caption, 8.5, 'italic', 'helvetica', 3); doc.setTextColor(0);
    } else if (b.k === 'table') {
      const cols = b.head.length; const cw = W / cols; const fs = cols > 5 ? 7.5 : 8.8;
      const drawRow = (r, bold) => {
        doc.setFont(cols > 5 ? 'courier' : 'helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(fs);
        const cells = r.map((c) => doc.splitTextToSize(ascii(c), cw - 2)); const hh = Math.max(...cells.map((c) => c.length)) * fs * 0.42 + 2.4;
        need(hh); if (bold) { doc.setFillColor(228, 235, 252); doc.rect(M, y - 3.4, W, hh, 'F'); }
        cells.forEach((c, j) => c.forEach((l, k) => doc.text(l, M + j * cw + 1, y + k * fs * 0.42)));
        y += hh; doc.setDrawColor(214, 221, 232); doc.setLineWidth(0.2); doc.line(M, y - 3.2, M + W, y - 3.2);
      };
      drawRow(b.head, true); b.rows.forEach((r) => drawRow(r, false)); y += 3;
    }
  });
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120); doc.text(`Normalization Virtual Lab - ${ascii(R.name)} - page ${i} of ${pages}`, M, 297 - 9); }
  return doc.output('blob');
}

async function reportDOCX(B, R) {
  const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const run = (t, o = {}) => `<w:r><w:rPr>${o.font ? `<w:rFonts w:ascii="${o.font}" w:hAnsi="${o.font}" w:cs="${o.font}"/>` : ''}${o.b ? '<w:b/>' : ''}${o.i ? '<w:i/>' : ''}${o.color ? `<w:color w:val="${o.color}"/>` : ''}<w:sz w:val="${o.sz || 21}"/></w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r>`;
  const para = (runs, o = {}) => `<w:p><w:pPr><w:spacing w:before="${o.before || 0}" w:after="${o.after ?? 120}"/>${o.ind ? `<w:ind w:left="${o.ind}"/>` : ''}</w:pPr>${runs}</w:p>`;
  const fig = await diagramPNG(R); let body = '';
  B.forEach((b) => {
    if (b.k === 'title') body += para(run(b.t, { b: 1, sz: 36, font: 'Georgia' }), { after: 60 }) + para(run(b.sub, { sz: 18, color: '6F7B90' }), { after: 240 });
    else if (b.k === 'h') body += para(run(b.t, { b: 1, sz: 26, font: 'Georgia', color: '1F4FD1' }), { before: 240, after: 100 });
    else if (b.k === 'p') body += para(run(b.t));
    else if (b.k === 'list') b.items.forEach((it, i) => (body += para(run((b.ordered ? `${i + 1}. ` : '• ') + it), { ind: 360, after: 60 })));
    else if (b.k === 'mono') b.lines.forEach((l) => (body += para(run(l, { font: 'Consolas', sz: 19 }), { ind: 360 })));
    else if (b.k === 'figure') {
      if (fig) {
        const cx = Math.round(Math.min(6.3, fig.w / 110) * 914400), cy = Math.round(cx * fig.h / fig.w);
        body += `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Dependency diagram"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="diagram.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
      } else asciiDiagram(R).forEach((l) => (body += para(run(l, { font: 'Consolas', sz: 18 }), { after: 0 })));
      body += para(run(b.caption, { i: 1, sz: 18, color: '4B5870' }));
    } else if (b.k === 'table') {
      const cell = (t, head) => `<w:tc><w:tcPr>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="E4EBFC"/>' : ''}</w:tcPr>${para(run(t, { b: head, sz: 18, font: b.head.length > 5 ? 'Consolas' : undefined }), { after: 0 })}</w:tc>`;
      body += `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="D6DDE8"/>`).join('')}</w:tblBorders></w:tblPr>`
        + `<w:tr>${b.head.map((t) => cell(t, true)).join('')}</w:tr>` + b.rows.map((r) => `<w:tr>${r.map((t) => cell(t, false)).join('')}</w:tr>`).join('') + '</w:tbl>' + para('', { after: 120 });
    }
  });
  const files = [];
  files.push({ name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' });
  files.push({ name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' });
  files.push({ name: 'word/_rels/document.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${fig ? '<Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/diagram.png"/>' : ''}</Relationships>` });
  if (fig) files.push({ name: 'word/media/diagram.png', data: FILES.b64bytes(fig.url.split(',')[1]) });
  files.push({ name: 'word/document.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>` });
  return new Blob([FILES.zip(files)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

function reportHTML(B, R) {
  return B.map((b) => {
    if (b.k === 'title') return `<h2 style="font-size:1.45rem;margin-top:0">${esc(b.t)}</h2><p class="small muted">${esc(b.sub)}</p>`;
    if (b.k === 'h') return `<h3>${esc(b.t)}</h3>`;
    if (b.k === 'p') return `<p style="margin:6px 0">${esc(b.t)}</p>`;
    if (b.k === 'list') return `<${b.ordered ? 'ol' : 'ul'} class="notes">${b.items.map((x) => `<li>${esc(x)}</li>`).join('')}</${b.ordered ? 'ol' : 'ul'}>`;
    if (b.k === 'mono') return b.lines.map((l) => `<p class="fd" style="white-space:normal;margin:4px 0">${esc(l)}</p>`).join('');
    if (b.k === 'figure') return `<div class="diagram" style="margin:8px 0">${diagramSVG(R)}</div><p class="small muted">${esc(b.caption)}</p>`;
    if (b.k === 'table') return `<div class="scroll-x"><table class="t"><thead><tr>${b.head.map((x) => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    return '';
  }).join('');
}

/* report for the Tables page */
function buildTableReport(TR) {
  const { t, n, R, raw } = TR; const B = []; const now = new Date();
  const h = (x) => B.push({ k: 'h', t: x }); const p = (x) => B.push({ k: 'p', t: x });
  const list = (items, ordered) => B.push({ k: 'list', items, ordered }); const table = (head, rows) => B.push({ k: 'table', head, rows });
  const show = (r) => r.map((v) => TBL.show(v));
  const preview = (cols, rows, lim = 15) => { table(cols, rows.slice(0, lim).map(show)); if (rows.length > lim) p(`… ${rows.length - lim} more rows not shown.`); };
  const stageName = TR.stageNames.includes(TB.sqlStage) ? TB.sqlStage : TR.stageNames.includes(TB.stage) ? TB.stage : TR.stageNames[TR.stageNames.length - 1];
  B.push({ k: 'title', t: `Table normalization report: ${t.name}`, sub: `Normalization Virtual Lab · ${TEAM.course} · ${now.toLocaleString()}` });
  h('1. Source table'); p(`${raw.rows.length} rows and ${raw.cols.length} columns.`); preview(raw.cols, raw.rows);
  h('2. First normal form');
  const fixes = TR.r1.log.map((l) => `${l.text} Rows ${l.before} → ${l.after}.`);
  if (TB.renamed.length) fixes.unshift('Column names cleaned: ' + TB.renamed.map((c) => `${c.from} → ${c.to}`).join(', ') + '.');
  if (fixes.length) list(fixes, true); else p('The table was already in 1NF: one value per cell, no repeating columns, no duplicate rows.');
  p(`The 1NF table has ${t.rows.length} rows and ${t.cols.length} columns.`); preview(t.cols, t.rows);
  h('3. Dependencies used');
  p('Keys found in the data (minimal column sets with no repeated value): ' + TR.D.keys.map((k) => n.set(k.mask)).join(', ') + '.');
  const src = { key: 'primary key', alt: 'alternate key', data: 'found in the data', rule: 'added by hand', example: 'example rule', lists: 'from splitting lists' };
  table(['Rule', 'Source', 'In the data'], TR.F.map((f) => [n.fd({ lhs: f.lhs, rhs: f.rhs & ~f.lhs }), src[f.src] || f.src, TBL.holds(t, f.lhs, f.rhs, TR.D.enc).ok ? 'holds' : 'violated'])
    .concat(TR.mvds.map((d) => [n.fd(d, '->>'), src[d.src] || d.src, 'multivalued'])));
  h('4. Diagnosis'); B.push({ k: 'figure', caption: `Figure 1. Dependency diagram of ${t.name}.` });
  p(`Candidate keys: ${n.list(R.A.keys)}. Prime attributes: ${n.set(R.A.prime)}. Highest normal form: ${R.A.highest}.`);
  const kindTxt = { partial: 'partial dependency (breaks 2NF)', transitive: 'transitive dependency (breaks 3NF)', '3nf': 'non-key determinant (breaks BCNF)' };
  if (TR.redund.length) { table(['Dependency', 'Kind', 'Repeated cells'], TR.redund.map((r) => [n.fd(r.fd), kindTxt[r.kind], String(r.cells)])); p(`${TR.cellKind.size} of ${t.rows.length * t.cols.length} cells repeat a fact already stored in another row.`); }
  else p('No cell repeats a fact through a functional dependency.');
  const an = tbAnomalies(TR).map((x) => x.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"'));
  if (an.length) list(an);
  h('5. Normalization, stage by stage');
  TR.stageNames.forEach((s) => {
    const st = TR.stages[s];
    p(`${s}: ${st.tables.length} table${st.tables.length > 1 ? 's' : ''}; ${st.chase.lossless ? 'lossless' : 'lossy'}; ${st.pres.preserved ? 'dependency preserving' : 'loses ' + st.pres.results.filter((x) => !x.kept).map((x) => n.fd(x.fd)).join(', ')}; ${st.rejoin.tooBig ? 'rejoin not checked' : st.rejoin.same ? 'joining the tables gives back exactly the 1NF rows' : `rejoin differs (${st.rejoin.spurious.length} extra rows)`}; cells ${st.cellsBefore} → ${st.cellsAfter}.`);
    table(['Table', 'Columns', 'Key', 'References'], st.tables.map((tb) => [tb.name, n(tb.mask), n.set(tb.pk), tb.fks.map((f) => st.tables[f.ref].name).join(', ') || '-']));
  });
  h(`6. Final tables (${stageName})`);
  TR.stages[stageName].tables.forEach((tb) => { B.push({ k: 'p', t: `${tb.name} (key ${n.set(tb.pk)}), ${tb.P.rows.length} rows:` }); preview(tb.P.idx.map((j) => t.cols[j]), tb.P.rows, 12); });
  h(`7. SQL (${TBL.DIALECTS[TB.dialect].label}, table definitions)`);
  const keepIns = TB.inserts; TB.inserts = false; const { sql } = tbSQL(TR, stageName, TB.dialect); TB.inserts = keepIns;
  B.push({ k: 'mono', lines: sql.split('\n').filter((l) => l.trim()) });
  h('8. Conclusion');
  const last = TR.stages[stageName];
  p(`${t.name} started in ${R.A.highest} with ${t.rows.length * t.cols.length} cells. The ${stageName} design stores the same information in ${last.tables.length} table${last.tables.length > 1 ? 's' : ''} and ${last.cellsAfter} cells, ${last.chase.lossless ? 'with a lossless join' : 'but the join is lossy'}${last.pres.preserved ? ' and every dependency enforceable inside one table' : ', at the cost of a dependency that spans tables'}.`);
  return B;
}

RENDER.download = function () {
  const root = $('#view-download');
  const source = store.get('dl.source', 'lab');
  let R, B, label, safe;
  if (source === 'table') {
    if (!TB.raw) tbLoadExample(TB.ex || 'reg');
    let TR; try { TR = tbCompute(); } catch (e) { TR = { error: e.message }; }
    if (TR.error) { R = null; label = `The table on the Tables page has a problem: ${TR.error}`; }
    else { R = TR.R; B = buildTableReport(TR); safe = TR.t.name; }
  } else {
    if (!LAB.result) { try { const r = labCompute(); if (!r.error) LAB.result = r; } catch (e) { /* handled below */ } }
    R = LAB.result; if (R) { B = buildReport(R); safe = R.name; } else label = 'The lab input has an error. Fix it in the Lab, then come back here.';
  }
  const pick = `<div class="seg" role="radiogroup" aria-label="Report on"><label><input type="radio" name="dl-src" value="lab" ${source === 'lab' ? 'checked' : ''}><span>Relation in the Lab</span></label><label><input type="radio" name="dl-src" value="table" ${source === 'table' ? 'checked' : ''}><span>Table in Tables</span></label></div>`;
  const head = `<div class="view-head"><div><h1>Download</h1><p class="muted">${source === 'table' ? 'A full report of the table on the Tables page: the data, the 1NF fixes, the dependencies used, the diagnosis, every normalization stage with its tables, and the SQL.' : 'A full report of the relation currently in the lab: inputs, the dependency diagram, every intermediate result and the final design.'}</p></div>${pick}</div>`;
  if (!R) { root.innerHTML = head + `<div class="panel empty">${esc(label)}</div>`; bindSrc(); return; }
  safe = safe.replace(/[^\w-]+/g, '_');
  root.innerHTML = head + `
  <div class="dl-grid"><div class="stack">
    <button class="fmt" data-fmt="pdf"><span class="ext">PDF</span><span><b>PDF document</b><br><span class="small muted">Formatted pages with the diagram as a figure.</span></span></button>
    <button class="fmt" data-fmt="docx"><span class="ext">DOCX</span><span><b>Word document</b><br><span class="small muted">Editable headings, tables and the diagram.</span></span></button>
    <button class="fmt" data-fmt="txt"><span class="ext">TXT</span><span><b>Plain text</b><br><span class="small muted">Monospaced tables and an ASCII diagram.</span></span></button>
    <p class="hint" id="dl-msg" role="status"></p>
    <div class="panel pad small"><b>Contents</b><ol class="notes">${B.filter((b) => b.k === 'h').map((b) => `<li>${esc(b.t.replace(/^\d+\.\s*/, ''))}</li>`).join('')}</ol></div>
  </div>
  <div class="panel pad report-preview" aria-label="Report preview">${reportHTML(B, R)}</div></div>`;
  bindSrc();
  probeDownloads();
  const kind = source === 'table' ? 'table_normalization' : 'normalization';
  $$('[data-fmt]', root).forEach((b) => b.addEventListener('click', async () => {
    const f = b.dataset.fmt; const msg = $('#dl-msg'); msg.textContent = 'Preparing ' + f.toUpperCase() + '…'; b.disabled = true;
    try {
      if (f === 'txt') await saveFile(`${safe}_${kind}_report.txt`, reportText(B, R), 'text/plain');
      if (f === 'pdf') await saveFile(`${safe}_${kind}_report.pdf`, await reportPDF(B, R), 'application/pdf');
      if (f === 'docx') await saveFile(`${safe}_${kind}_report.docx`, await reportDOCX(B, R), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      msg.textContent = '';
    } catch (e) { msg.textContent = `${f.toUpperCase()} could not be created (${e.message}). PDF needs the internet; the Word and text reports work offline.`; }
    b.disabled = false;
  }));
  function bindSrc() { $$('input[name="dl-src"]', root).forEach((r) => r.addEventListener('change', () => { store.set('dl.source', r.value); RENDER.download(); })); }
};
