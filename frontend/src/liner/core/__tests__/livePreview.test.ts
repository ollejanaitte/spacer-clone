import { describe, expect, it } from "vitest";
import {
  PREVIEW_DEBOUNCE_MS,
  debouncedState,
  isPreviewState,
  visualStateLabel,
} from "../visual/livePreview";

describe("live preview state", () => {
  it("labels states", () => {
    expect(visualStateLabel("INPUT")).toContain("入力プレビュー");
    expect(visualStateLabel("VALIDATED")).toContain("検証済み");
    expect(visualStateLabel("CALCULATED")).toBe("計算結果");
  });

  it("distinguishes preview from result", () => {
    expect(isPreviewState("INPUT")).toBe(true);
    expect(isPreviewState("VALIDATED")).toBe(true);
    expect(isPreviewState("CALCULATED")).toBe(false);
  });

  it("draft change enters INPUT, settle promotes to VALIDATED", () => {
    expect(debouncedState("CALCULATED", true)).toBe("INPUT");
    expect(debouncedState("INPUT", false)).toBe("VALIDATED");
    expect(debouncedState("CALCULATED", false)).toBe("CALCULATED");
    expect(debouncedState("VALIDATED", true)).toBe("INPUT");
  });

  it("debounce constant", () => {
    expect(PREVIEW_DEBOUNCE_MS).toBeGreaterThanOrEqual(100);
  });
});
