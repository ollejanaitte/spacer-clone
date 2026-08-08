import { describe, expect, it } from "vitest";
import {
  derivePlaneGridTranslation,
  planeGridToOffset,
  planeGridToStation,
  rb001PlaneGridTransform,
} from "./planeGridTransform";

describe("plane-grid -> global transform (Phase 6-2)", () => {
  it("derives translation from bridge length and girder-end plane X", () => {
    const t = derivePlaneGridTranslation(134.001, 132.76045, "test");
    expect(t.translationX).toBeCloseTo(1.24055, 9);
  });

  it("maps the girder-line end to the bridge-end station", () => {
    const t = derivePlaneGridTranslation(134.001, 132.76045, "test");
    expect(planeGridToStation(132.76045, t)).toBeCloseTo(134.001, 9);
  });

  it("maps plane X -> station and plane Y -> offset (RB-001 reference)", () => {
    const t = rb001PlaneGridTransform();
    // GRID-1001 (G-GEO-0009/0010)
    expect(planeGridToStation(1.21766, t)).toBeCloseTo(2.45821, 5);
    expect(planeGridToOffset(1.47689)).toBeCloseTo(1.47689, 9);
    // GRID-1027 (G-GEO-0011/0012) -> bridge end station
    expect(planeGridToStation(132.76045, t)).toBeCloseTo(134.001, 5);
  });

  it("rejects non-finite inputs", () => {
    expect(() => derivePlaneGridTranslation(Number.NaN, 132.76045, "t")).toThrow();
    expect(() => derivePlaneGridTranslation(134.001, Number.POSITIVE_INFINITY, "t")).toThrow();
  });
});
