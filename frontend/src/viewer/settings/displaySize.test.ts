import { afterEach, describe, expect, it } from "vitest";
import {
  clampViewerDisplaySize,
  DEFAULT_VIEWER_DISPLAY_SIZE,
  loadViewerDisplaySize,
  normalizeViewerDisplaySize,
  persistViewerDisplaySize,
  VIEWER_DISPLAY_SIZE_STORAGE_KEY,
} from "./displaySize";

describe("viewer display-size settings", () => {
  afterEach(() => window.localStorage.clear());

  it("clamps every range boundary", () => {
    expect(clampViewerDisplaySize("nodeSize", 0)).toBe(0.2);
    expect(clampViewerDisplaySize("supportSize", 99)).toBe(5);
    expect(clampViewerDisplaySize("labelSize", 0)).toBe(0.5);
    expect(clampViewerDisplaySize("memberLineWidth", 99)).toBe(5);
  });

  it("normalizes partial and invalid persisted values", () => {
    expect(normalizeViewerDisplaySize({ nodeSize: 9, labelSize: 0.1 })).toEqual({
      ...DEFAULT_VIEWER_DISPLAY_SIZE,
      nodeSize: 5,
      labelSize: 0.5,
    });
    expect(normalizeViewerDisplaySize("broken")).toEqual(DEFAULT_VIEWER_DISPLAY_SIZE);
  });

  it("persists and restores settings", () => {
    persistViewerDisplaySize({ ...DEFAULT_VIEWER_DISPLAY_SIZE, loadArrowSize: 2.5 });
    expect(loadViewerDisplaySize().loadArrowSize).toBe(2.5);
  });

  it("falls back to defaults for malformed JSON", () => {
    window.localStorage.setItem(VIEWER_DISPLAY_SIZE_STORAGE_KEY, "{");
    expect(loadViewerDisplaySize()).toEqual(DEFAULT_VIEWER_DISPLAY_SIZE);
  });
});
// @vitest-environment jsdom
