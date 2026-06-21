export type UiModeDefault = "learn" | "level0" | "pro" | null;

const STORAGE_KEY = "spacer_clone_ui_mode_default";

export function getUiModeDefault(): UiModeDefault {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === "learn" || v === "level0" || v === "pro") return v;
  return null;
}

export function setUiModeDefault(mode: UiModeDefault): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (mode === null) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }
}
