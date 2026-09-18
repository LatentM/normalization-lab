// theme.js — Day / Night mode.
//
// Light is the default and is what a first-time visitor always sees: the bare
// :root in index.css is the light palette, and there is deliberately no
// prefers-color-scheme query, so a dark-OS visitor still opens on the light
// page. Night mode is an explicit choice, stamped as data-theme="dark" on
// <html> and remembered.
//
// The read and the write are both guarded, because a browser in private mode
// throws on the very first localStorage access and a theme preference is never
// worth breaking the page over.

const KEY = 'normalization-lab.theme';

export const DAY = 'light';
export const NIGHT = 'dark';

/** The stored choice, or the default (day). */
export function getTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return t === NIGHT ? NIGHT : DAY;
  } catch {
    return DAY;
  }
}

/** Put the theme on <html> and remember it. Returns the theme applied. */
export function applyTheme(theme) {
  const t = theme === NIGHT ? NIGHT : DAY;
  document.documentElement.setAttribute('data-theme', t);
  try {
    localStorage.setItem(KEY, t);
  } catch {
    // Storage unavailable — the theme still applies for this session.
  }
  return t;
}

/** Apply the stored theme before React mounts, so there is no flash. */
export function initTheme() {
  return applyTheme(getTheme());
}
