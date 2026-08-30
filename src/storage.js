// storage.js — localStorage persistence. Shared file; touched at integration only.
// Every access is wrapped in try/catch: a browser in private mode, or one with
// site data blocked, throws on the very first read, and a virtual lab that
// crashes because it could not save a draft is worse than one that forgets.

const KEY = 'normalization-lab.v1';

const EMPTY = {
  relationText: '',
  depText: '',
  saved: [],       // [{ id, name, relationText, depText, savedAt }]
  quiz: {},        // { [problemId]: { answer, correct, revealed } }
  activeTab: 'input',
  visitedTheory: [],
};

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw);
    return { ...EMPTY, ...parsed };
  } catch {
    return { ...EMPTY };
  }
}

export function saveState(patch) {
  try {
    const current = loadState();
    const next = { ...current, ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return null; // storage unavailable — the app carries on in memory
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

export function saveRelation(name, relationText, depText) {
  const state = loadState();
  const entry = {
    id: `${Date.now()}`,
    name: name || `Relation ${state.saved.length + 1}`,
    relationText,
    depText,
    savedAt: new Date().toISOString(),
  };
  saveState({ saved: [entry, ...state.saved].slice(0, 20) });
  return entry;
}

export function deleteRelation(id) {
  const state = loadState();
  saveState({ saved: state.saved.filter((s) => s.id !== id) });
}

export function isStorageAvailable() {
  try {
    const probe = '__nl_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
