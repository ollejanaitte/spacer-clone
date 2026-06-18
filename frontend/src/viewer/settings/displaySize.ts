export type ViewerDisplaySizeSettings = {
  nodeSize: number;
  supportSize: number;
  loadArrowSize: number;
  labelSize: number;
  memberLineWidth: number;
};

export const DEFAULT_VIEWER_DISPLAY_SIZE: ViewerDisplaySizeSettings = {
  nodeSize: 1.0,
  supportSize: 1.0,
  loadArrowSize: 1.0,
  labelSize: 1.0,
  memberLineWidth: 1.0,
};

export const VIEWER_DISPLAY_SIZE_STORAGE_KEY = "spacer-clone:viewer:displaySize:v1";

export const VIEWER_DISPLAY_SIZE_RANGES: Record<
  keyof ViewerDisplaySizeSettings,
  { min: number; max: number }
> = {
  nodeSize: { min: 0.2, max: 5 },
  supportSize: { min: 0.2, max: 5 },
  loadArrowSize: { min: 0.2, max: 5 },
  labelSize: { min: 0.5, max: 3 },
  memberLineWidth: { min: 0.5, max: 5 },
};

/** Clamp one viewer display-size setting to its supported finite range. */
export function clampViewerDisplaySize(
  key: keyof ViewerDisplaySizeSettings,
  value: number,
): number {
  const range = VIEWER_DISPLAY_SIZE_RANGES[key];
  if (!Number.isFinite(value)) return DEFAULT_VIEWER_DISPLAY_SIZE[key];
  return Math.min(range.max, Math.max(range.min, value));
}

/** Normalize unknown persisted data into a complete display-size settings object. */
export function normalizeViewerDisplaySize(value: unknown): ViewerDisplaySizeSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_VIEWER_DISPLAY_SIZE };
  }
  const record = value as Record<string, unknown>;
  const normalized = { ...DEFAULT_VIEWER_DISPLAY_SIZE };
  for (const key of Object.keys(normalized) as Array<keyof ViewerDisplaySizeSettings>) {
    const candidate = record[key];
    normalized[key] = typeof candidate === "number"
      ? clampViewerDisplaySize(key, candidate)
      : DEFAULT_VIEWER_DISPLAY_SIZE[key];
  }
  return normalized;
}

/** Load display-only viewer sizing from localStorage, falling back on malformed data. */
export function loadViewerDisplaySize(): ViewerDisplaySizeSettings {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...DEFAULT_VIEWER_DISPLAY_SIZE };
  }
  try {
    const raw = window.localStorage.getItem(VIEWER_DISPLAY_SIZE_STORAGE_KEY);
    return raw ? normalizeViewerDisplaySize(JSON.parse(raw)) : { ...DEFAULT_VIEWER_DISPLAY_SIZE };
  } catch (error) {
    console.warn("Failed to load viewer display-size settings; defaults will be used.", error);
    return { ...DEFAULT_VIEWER_DISPLAY_SIZE };
  }
}

/** Persist display-only viewer sizing without modifying the project payload. */
export function persistViewerDisplaySize(settings: ViewerDisplaySizeSettings): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      VIEWER_DISPLAY_SIZE_STORAGE_KEY,
      JSON.stringify(normalizeViewerDisplaySize(settings)),
    );
  } catch (error) {
    console.warn("Failed to persist viewer display-size settings.", error);
  }
}
