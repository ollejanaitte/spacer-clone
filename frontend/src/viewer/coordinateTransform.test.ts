// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import {
  COORDINATE_MODE_STORAGE_KEY,
  loadViewerCoordinateMode,
  saveViewerCoordinateMode,
  toViewerPoint,
  toViewerVector,
  type Vec3Like,
} from "./coordinateTransform";

describe("coordinateTransform", () => {
  beforeEach(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it("toViewerPoint: normal mode returns the original vector", () => {
    const p: Vec3Like = { x: 1, y: 2, z: 3 };
    expect(toViewerPoint(p, "normal")).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("toViewerPoint: spacer mode swaps y and z", () => {
    const p: Vec3Like = { x: 1, y: 2, z: 3 };
    expect(toViewerPoint(p, "spacer")).toEqual({ x: 1, y: 3, z: 2 });
  });

  it("toViewerPoint: does not mutate input", () => {
    const p: Vec3Like = { x: 4, y: 5, z: 6 };
    const before = { ...p };
    toViewerPoint(p, "spacer");
    expect(p).toEqual(before);
  });

  it("toViewerVector: normal mode returns the original vector", () => {
    const v: Vec3Like = { x: -1, y: 0.5, z: 7 };
    expect(toViewerVector(v, "normal")).toEqual({ x: -1, y: 0.5, z: 7 });
  });

  it("toViewerVector: spacer mode swaps y and z", () => {
    const v: Vec3Like = { x: -1, y: 0.5, z: 7 };
    expect(toViewerVector(v, "spacer")).toEqual({ x: -1, y: 7, z: 0.5 });
  });

  it("loadViewerCoordinateMode: returns normal when nothing stored", () => {
    expect(loadViewerCoordinateMode()).toBe("normal");
  });

  it("saveViewerCoordinateMode + loadViewerCoordinateMode round-trip", () => {
    saveViewerCoordinateMode("spacer");
    expect(window.localStorage.getItem(COORDINATE_MODE_STORAGE_KEY)).toBe("spacer");
    expect(loadViewerCoordinateMode()).toBe("spacer");

    saveViewerCoordinateMode("normal");
    expect(loadViewerCoordinateMode()).toBe("normal");
  });
});
