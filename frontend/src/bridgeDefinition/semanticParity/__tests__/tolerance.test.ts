import { describe, expect, it } from "vitest";
import {
  angleWithinTolerance,
  compareScalarWithTolerance,
  distanceWithinTolerance,
  nearlyEqual,
  nearlyZero,
} from "../tolerance";
import type { ToleranceBand } from "../types";

const tolerance: ToleranceBand = { absolute: 0.01, relative: 0.001, floor: 1 };

describe("semantic parity tolerance", () => {
  it("accepts exact equality", () => {
    expect(nearlyEqual(12, 12, tolerance)).toBe(true);
  });

  it("accepts values within absolute tolerance", () => {
    expect(compareScalarWithTolerance(0, 0.009, tolerance)).toMatchObject({ equal: true });
  });

  it("accepts values within relative tolerance", () => {
    expect(compareScalarWithTolerance(1000, 1000.5, { relative: 0.001, floor: 1 })).toMatchObject({ equal: true });
  });

  it("accepts the tolerance boundary", () => {
    expect(compareScalarWithTolerance(10, 10.01, { absolute: 0.01 })).toMatchObject({ equal: true });
  });

  it("rejects values beyond tolerance", () => {
    expect(compareScalarWithTolerance(10, 10.02, { absolute: 0.01 })).toMatchObject({ equal: false });
  });

  it("is stable near zero when a floor is supplied", () => {
    expect(nearlyZero(0.0005, { relative: 0.001, floor: 1 })).toBe(true);
    expect(nearlyZero(0.002, { relative: 0.001, floor: 1 })).toBe(false);
  });

  it("does not treat NaN as equal", () => {
    expect(compareScalarWithTolerance(Number.NaN, Number.NaN, tolerance).equal).toBe(false);
  });

  it("does not treat Infinity as equal", () => {
    expect(compareScalarWithTolerance(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, tolerance).equal).toBe(false);
  });

  it("compares distances and angles with their own tolerance bands", () => {
    expect(distanceWithinTolerance({ x: 0, y: 0, z: 0 }, { x: 0.005, y: 0, z: 0 }, tolerance).equal).toBe(true);
    expect(angleWithinTolerance(0, 0.000001, { absolute: 0.000001 })).toBe(true);
  });
});
