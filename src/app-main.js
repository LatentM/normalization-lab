/* ===================== BOOT ===================== */
(function boot() {
  applyTheme(store.get('theme', 'light'));
  $('#theme-btn').addEventListener('click', () => {
    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    store.set('theme', t); applyTheme(t);
  });
  window.addEventListener('hashchange', route);
  // render faults show a recoverable panel instead of a blank page
  window.addEventListener('error', (e) => {
    const v = document.getElementById('view-' + (currentView || 'lab'));
    if (v && !v.querySelector('.crash')) v.insertAdjacentHTML('afterbegin', `<div class="callout bad crash" role="alert" style="margin-bottom:12px">Something went wrong while drawing this page (${esc(e.message || 'unknown error')}). <button class="btn sm" onclick="location.hash='#lab';location.reload()">Reload the lab</button></div>`);
  });
  route();
})();
