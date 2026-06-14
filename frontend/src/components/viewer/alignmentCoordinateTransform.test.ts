// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import {
  ALIGNMENT_COORDINATE_MODE_STORAGE_KEY,
  computeAlignmentBBox,
  gridPlaneFor,
  loadAlignmentCoordinateMode,
  saveAlignmentCoordinateMode,
  toAlignmentViewerPoint,
  ALIGNMENT_AXIS_LABELS,
  ALIGNMENT_MODE_LABELS,
} from "./alignmentCoordinateTransform";

describe("toAlignmentViewerPoint", () => {
  it("passes through unchanged in world mode", () => {
    expect(toAlignmentViewerPoint({ x: 1, y: 2, z: 3 }, "world")).toEqual({
      x: 1,
      y: 2,
      z: 3,
    });
  });

  it("swaps y/z in spacer mode (display-only)", () => {
    expect(toAlignmentViewerPoint({ x: 10, y: 20, z: 30 }, "spacer")).toEqual({
      x: 10,
      y: 30,
      z: 20,
    });
  });

  it("does not mutate the input object", () => {
    const p = { x: 1, y: 2, z: 3 };
    toAlignmentViewerPoint(p, "spacer");
    expect(p).toEqual({ x: 1, y: 2, z: 3 });
  });
});

describe("computeAlignmentBBox", () => {
  it("returns fallback bbox for empty points", () => {
    const b = computeAlignmentBBox([], "world");
    expect(b.span).toBe(1);
    expect(b.centerX).toBe(0);
  });

  it("computes bbox in world mode using raw (x, y, z)", () => {
    const pts = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 20, y: 0, z: 5 },
    ];
    const b = computeAlignmentBBox(pts, "world");
    expect(b.minX).toBe(0);
    expect(b.maxX).toBe(20);
    expect(b.minY).toBe(0);
    expect(b.maxY).toBe(0);
    expect(b.minZ).toBe(0);
    expect(b.maxZ).toBe(5);
    expect(b.centerZ).toBeCloseTo(2.5, 6);
    // span = max(maxX-minX=20, maxY-minY=0, maxZ-minZ=5) = 20
    expect(b.span).toBeCloseTo(20, 6);
  });

  it("computes bbox in spacer mode by swapping y/z", () => {
    // world: (0,0,0) (10,0,0) (20,0,5) → x=0..20, y=0..0, z=0..5
    // spacer: display = (x, z, y) → x=0..20, y=0..5, z=0..0
    const pts = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 20, y: 0, z: 5 },
    ];
    const b = computeAlignmentBBox(pts, "spacer");
    expect(b.minX).toBe(0);
    expect(b.maxX).toBe(20);
    expect(b.minY).toBe(0);
    expect(b.maxY).toBe(5);
    expect(b.minZ).toBe(0);
    expect(b.maxZ).toBe(0);
  });

  it("returns span >= 1 even for zero-extent points", () => {
    const b = computeAlignmentBBox([{ x: 5, y: 5, z: 5 }], "world");
    expect(b.span).toBeGreaterThanOrEqual(1);
  });
});

describe("gridPlaneFor", () => {
  it("returns xy for world", () => {
    expect(gridPlaneFor("world")).toBe("xy");
  });
  it("returns xz for spacer", () => {
    expect(gridPlaneFor("spacer")).toBe("xz");
  });
});

describe("labels", () => {
  it("world axis labels are X/Y/Z", () => {
    expect(ALIGNMENT_AXIS_LABELS.world).toEqual({ x: "X", y: "Y", z: "Z" });
  });
  it("spacer axis labels emphasize the meaning", () => {
    expect(ALIGNMENT_AXIS_LABELS.spacer.x).toContain("橋軸");
    expect(ALIGNMENT_AXIS_LABELS.spacer.y).toContain("標高");
    expect(ALIGNMENT_AXIS_LABELS.spacer.z).toContain("横断");
  });
  it("mode labels exist for both modes", () => {
    expect(ALIGNMENT_MODE_LABELS.world).toMatch(/X=橋軸/);
    expect(ALIGNMENT_MODE_LABELS.spacer).toMatch(/X=橋軸/);
  });
});

describe("alignment coordinate mode localStorage", () => {
  beforeEach(() => {
    window.localStorage.removeItem(ALIGNMENT_COORDINATE_MODE_STORAGE_KEY);
  });

  it("defaults to spacer when localStorage is empty", () => {
    expect(loadAlignmentCoordinateMode()).toBe("spacer");
  });

  it("round-trips world via save/load", () => {
    saveAlignmentCoordinateMode("world");
    expect(loadAlignmentCoordinateMode()).toBe("world");
  });

  it("round-trips spacer via save/load", () => {
    saveAlignmentCoordinateMode("spacer");
    expect(loadAlignmentCoordinateMode()).toBe("spacer");
  });

  it("falls back to spacer on invalid stored value", () => {
    window.localStorage.setItem(ALIGNMENT_COORDINATE_MODE_STORAGE_KEY, "garbage");
    expect(loadAlignmentCoordinateMode()).toBe("spacer");
  });
});
