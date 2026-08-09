import { describe, expect, it } from "vitest";
import {
  GUIDED_WORKFLOW,
  guidedProgress,
  isGuidedSection,
  resolveGuidedNavigation,
} from "./guidedNavigation";

describe("guidedNavigation", () => {
  it("orders the workspace workflow", () => {
    expect(GUIDED_WORKFLOW).toEqual([
      "overview",
      "road",
      "superstructure",
      "substructure",
      "analysis",
      "main3d",
      "deliverables",
      "data",
    ]);
  });

  it("returns prev/next from the guided order", () => {
    expect(resolveGuidedNavigation("road")).toEqual({
      hasPrev: true,
      hasNext: true,
      prev: "overview",
      next: "superstructure",
      index: 1,
    });
  });

  it("overview has no prev; data has no next", () => {
    const first = resolveGuidedNavigation("overview");
    expect(first.hasPrev).toBe(false);
    expect(first.prev).toBeNull();
    expect(first.next).toBe("road");

    const last = resolveGuidedNavigation("data");
    expect(last.hasNext).toBe(false);
    expect(last.next).toBeNull();
    expect(last.prev).toBe("deliverables");
  });

  it("handles unknown sections", () => {
    const unknown = resolveGuidedNavigation("bogus" as never);
    expect(unknown.hasPrev).toBe(false);
    expect(unknown.hasNext).toBe(false);
    expect(unknown.index).toBe(-1);
  });

  it("computes guided progress", () => {
    expect(guidedProgress("overview")).toBe(1);
    expect(guidedProgress("data")).toBe(8);
    expect(guidedProgress("bogus" as never)).toBe(0);
  });

  it("recognizes guided sections", () => {
    expect(isGuidedSection("analysis")).toBe(true);
    expect(isGuidedSection("bogus")).toBe(false);
  });
});
