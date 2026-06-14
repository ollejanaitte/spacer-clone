// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { computeAlignmentExtent, summarizeAlignment } from "./alignmentSummary";
import type { RoadAlignment } from "../../bridge/types";

const a = (station: number, x: number, y: number, z: number) => ({
  station,
  x,
  y,
  z,
});

describe("summarizeAlignment", () => {
  it("returns zeros for empty alignment", () => {
    const r = summarizeAlignment({ inputMode: "simple", bridgeLength: 0, points: [] });
    expect(r.pointCount).toBe(0);
    expect(r.totalLength).toBe(0);
    expect(r.maxSlope).toBe(0);
  });

  it("computes totalLength as 3D polyline length", () => {
    const r = summarizeAlignment({
      inputMode: "csv",
      bridgeLength: 0,
      points: [
        a(0, 0, 0, 0),
        a(5, 3, 0, 4), // 3-4-5 直角
      ],
    });
    expect(r.pointCount).toBe(2);
    expect(r.totalLength).toBeCloseTo(5, 6);
  });

  it("computes maxSlope from |dz|/seg", () => {
    const r = summarizeAlignment({
      inputMode: "csv",
      bridgeLength: 0,
      points: [
        a(0, 0, 0, 0),
        a(10, 10, 0, 1), // seg=sqrt(100+1)=~10.05, slope=0.0995
      ],
    });
    expect(r.maxSlope).toBeGreaterThan(0.09);
    expect(r.maxSlope).toBeLessThan(0.11);
  });

  it("captures start/end elevation and xy", () => {
    const r = summarizeAlignment({
      inputMode: "csv",
      bridgeLength: 0,
      points: [
        a(0, 0, 0, 20.1),
        a(15, 15, 0, 20.5),
        a(30, 30, 0, 20.9),
      ],
    });
    expect(r.startElev).toBeCloseTo(20.1, 6);
    expect(r.endElev).toBeCloseTo(20.9, 6);
    expect(r.startX).toBe(0);
    expect(r.endX).toBe(30);
  });
});

describe("computeAlignmentExtent", () => {
  it("returns 1 / 0 fallback for empty", () => {
    expect(computeAlignmentExtent({ inputMode: "simple", bridgeLength: 0, points: [] })).toEqual({
      span: 1,
      centerX: 0,
      centerY: 0,
    });
  });

  it("computes span and center from XY bbox", () => {
    const r = computeAlignmentExtent({
      inputMode: "csv",
      bridgeLength: 0,
      points: [a(0, 0, 0, 0), a(30, 30, 5, 0)],
    });
    expect(r.span).toBeCloseTo(30, 6);
    expect(r.centerX).toBeCloseTo(15, 6);
    expect(r.centerY).toBeCloseTo(2.5, 6);
  });
});
