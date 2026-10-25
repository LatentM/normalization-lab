/* Core helpers, storage, theme, router */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('nvl:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('nvl:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable: keep in memory */ } }
};
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const LETTERS = 'ABCDEFGH';

/* theme: light by default, night mode only when chosen */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const b = $('#theme-btn'); if (!b) return;
  b.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
  b.innerHTML = t === 'dark'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><span>Night</span>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><span>Day</span>';
  b.title = t === 'dark' ? 'Switch to day mode' : 'Switch to night mode';
}

/* router: one view at a time, chosen by #hash */
const VIEWS = ['lab', 'tables', 'quiz', 'pyq', 'learn', 'help', 'team', 'download'];
const RENDER = {};
let currentView = null;
function route() {
  let v = (location.hash || '#lab').slice(1).split('/')[0];
  if (!VIEWS.includes(v)) v = 'lab';
  $$('[data-nav]').forEach((a) => a.setAttribute('aria-current', a.dataset.nav === v ? 'page' : 'false'));
  VIEWS.forEach((name) => { const el = document.getElementById('view-' + name); if (el) el.hidden = name !== v; });
  if (currentView !== v) { currentView = v; window.scrollTo(0, 0); }
  if (RENDER[v]) RENDER[v]();
  const titles = { lab: 'Lab', tables: 'Tables', quiz: 'Quiz', pyq: 'Previous year questions', learn: 'Learn', help: 'Help', team: 'Developed by', download: 'Download' };
  document.title = 'Normalization Virtual Lab · ' + titles[v];
}

/* shared: render a question card (quiz + PYQ) */
function optionHTML(q, i, state) {
  const sel = state.picked && (q.type === 'msq' ? state.picked.includes(i) : state.picked === i);
  let cls = 'opt' + (q.type === 'msq' ? ' msq' : '') + (sel ? ' sel' : '');
  if (state.revealed) {
    const right = q.type === 'msq' ? q.answer.includes(i) : q.answer === i;
    cls += ' locked' + (right ? ' right' : sel ? ' wrong' : '');
  }
  return `<label class="${cls}" data-opt="${i}"><input type="${q.type === 'msq' ? 'checkbox' : 'radio'}" name="${esc(state.name)}" value="${i}" ${sel ? 'checked' : ''} ${state.revealed ? 'disabled' : ''}>
    <span class="key" aria-hidden="true">${LETTERS[i]}</span><span class="opt-text">${esc(q.options[i])}</span></label>`;
}
function isCorrect(q, picked) {
  if (q.type === 'nat') return picked !== '' && picked != null && Math.abs(Number(picked) - q.answer) < 1e-9;
  if (q.type === 'msq') return Array.isArray(picked) && picked.length === q.answer.length && q.answer.every((a) => picked.includes(a));
  return picked === q.answer;
}
function answerText(q) {
  if (q.type === 'nat') return String(q.answer);
  if (q.type === 'msq') return q.answer.map((i) => LETTERS[i]).join(', ');
  return LETTERS[q.answer];
}
function qTableHTML(q) { return q.table ? `<div class="q-table">${dataTable(q.table.cols, q.table.rows, { limit: 20 })}</div>` : ''; }
function typeLabel(t) { return { mcq: 'Single answer', msq: 'One or more answers', nat: 'Numerical answer' }[t]; }

/* file saving: the artifact viewer offers a mediated save, a normal website uses a link */
let downloadsApi; let downloadsProbe;
function probeDownloads() {
  if (!downloadsProbe) {
    const ask = window.claude && window.claude.use ? Promise.resolve().then(() => window.claude.use('downloads')) : Promise.resolve(null);
    const giveUp = new Promise((res) => setTimeout(() => res(null), 3000)); // never let a silent viewer block the save
    downloadsProbe = Promise.race([ask, giveUp]).then((d) => (downloadsApi = d && typeof d.save === 'function' ? d : null)).catch(() => (downloadsApi = null));
  }
  return downloadsProbe;
}
async function saveFile(filename, data, mime) {
  await probeDownloads();
  if (downloadsApi) {
    const ALLOWED = /\.(gif|png|jpe?g|webp|mp4|webm|txt|json|md|docx|pptx|epub|csv|ttf|html|svg|pdf|xlsx|zip)$/i;
    if (!ALLOWED.test(filename)) filename += '.txt'; // this viewer only saves listed types; .sql goes out as .sql.txt
    try { await downloadsApi.save({ filename, data: data instanceof Blob ? data : new Blob([data], { type: mime }) }); toast('Saved ' + filename); }
    catch (e) { if (e && e.code === 'declined') toast('Save cancelled'); else toast('This viewer could not save the file (' + (e && e.code || 'error') + ').'); }
    return;
  }
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  toast('Downloading ' + filename);
}
