import { describe, expect, it } from "vitest";
import {
  SKEW_PARALLEL_TO_ALIGNMENT_RAD,
  SKEW_PERPENDICULAR_TO_ALIGNMENT_RAD,
  distancePointToPierLine,
  isPointOnPierLine,
  normalizeSkewAngleRad,
  pierLineDirectionFromSkew,
  pierLinePointAtOffset,
} from "../pierLineGeometry";

describe("pierLineGeometry", () => {
  const azimuth = 0;
  const origin = { x: 0, y: 0 };

  it("normalizes skew angles into (-π, π]", () => {
    expect(normalizeSkewAngleRad(0)).toBeCloseTo(0, 10);
    expect(normalizeSkewAngleRad(Math.PI * 3)).toBeCloseTo(-Math.PI, 10);
    expect(normalizeSkewAngleRad(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2, 10);
  });

  it("uses alignment normal for perpendicular pier lines", () => {
    const direction = pierLineDirectionFromSkew(azimuth, SKEW_PERPENDICULAR_TO_ALIGNMENT_RAD);
    expect(direction.x).toBeCloseTo(0, 6);
    expect(direction.y).toBeCloseTo(1, 6);
  });

  it("uses alignment tangent for parallel pier lines", () => {
    const direction = pierLineDirectionFromSkew(azimuth, SKEW_PARALLEL_TO_ALIGNMENT_RAD);
    expect(direction.x).toBeCloseTo(1, 6);
    expect(direction.y).toBeCloseTo(0, 6);
  });

  it("places pier line points along the skewed direction", () => {
    const point = pierLinePointAtOffset(origin, azimuth, Math.PI / 4, 10);
    expect(point.x).toBeCloseTo(7.0710678, 5);
    expect(point.y).toBeCloseTo(7.0710678, 5);
  });

  it("detects on-line points within tolerance", () => {
    const onLine = pierLinePointAtOffset(origin, azimuth, Math.PI / 6, 5);
    expect(isPointOnPierLine(onLine, origin, azimuth, Math.PI / 6)).toBe(true);
    expect(distancePointToPierLine({ x: 1, y: 0 }, origin, azimuth, Math.PI / 6)).toBeGreaterThan(0);
  });
});
