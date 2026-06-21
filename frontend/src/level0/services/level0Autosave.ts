import type { ProjectModel } from "../../types";

export type EarthquakePresetId = "weak" | "medium" | "strong";

/**
 * レベル0の状態をlocalStorageに保存する。
 */
export function saveLevel0State(
  project: ProjectModel,
  preset: EarthquakePresetId,
): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const data = {
      project,
      preset,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage が利用できない場合は無視
  }
}

const STORAGE_KEY = "spacer_clone_level0_autosave";

/**
 * レベル0の状態をlocalStorageから読み込む。
 * データがない場合はnullを返す。
 */
export function loadLevel0State(): { project: ProjectModel; preset: EarthquakePresetId; savedAt: number } | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { project: ProjectModel; preset: EarthquakePresetId; savedAt: number };
  } catch {
    return null;
  }
}

/**
 * レベル0の状態をlocalStorageから削除する。
 */
export function clearLevel0State(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 無視
  }
}

/**
 * ストレージキーを返す（テスト用）。
 */
export function getStorageKey(): string {
  return STORAGE_KEY;
}
