const STORAGE_KEY = "spacer_clone_level0_autosave";

export function saveLevel0State(project: unknown, preset: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ project, preset, savedAt: Date.now() }));
  } catch { /* ignore */ }
}

export function loadLevel0State(): { project: unknown; preset: string; savedAt: number } | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function clearLevel0State(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
