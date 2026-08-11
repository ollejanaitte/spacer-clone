import { describe, expect, it } from "vitest";
import { buildRoadIntermediate } from "../intermediateResult";
import type { LinearAlignment } from "../../../../liner/core/types";
import type { VerticalElement } from "../../../../liner/core/geometry/vertical";

function makeHorizontal(): LinearAlignment {
  return {
    id: "ALIGN-1",
    linerModelId: "MODEL-1",
    coordinatePolicyId: "COORD-1",
    elements: [
      { id: "S1", type: "straight", start: { x: 0, y: 0 }, azimuth: 0, length: 100 },
      { id: "A1", type: "arc", start: { x: 100, y: 0 }, azimuth: 0, radius: 50, turn: "left", length: 50 },
    ],
  };
}

function makeVertical(): VerticalElement[] {
  return [
    { type: "grade", id: "G1", startPhysicalDistance: 0, startElevation: 10, grade: 0.01, length: 150 },
  ];
}

function makeInput(overrides: Partial<Parameters<typeof buildRoadIntermediate>[0]> = {}) {
  return {
    horizontal: makeHorizontal(),
    vertical: makeVertical(),
    crossSections: [
      {
        id: "XS1",
        name: "標準",
        offsetLines: [
          { id: "L1", offset: -5.5, elevation: 0, role: "lane" },
          { id: "C1", offset: 0, elevation: 0, role: "lane" },
          { id: "R1", offset: 5.5, elevation: 0, role: "lane" },
        ],
        crossSlope: { signConvention: "right_down_positive", valuePercent: 2 },
      },
    ],
    widthChangePoints: [],
    crossSlopeIntervals: [],
    stationDefinition: { originDisplayedStation: 0, equations: [] },
    ...overrides,
  } as Parameters<typeof buildRoadIntermediate>[0];
}

describe("Phase 2-07 Road Intermediate Result", () => {
  it("builds a valid intermediate result over the alignment", () => {
    const result = buildRoadIntermediate(makeInput(), { sampleInterval: 50 });
    expect(result.ok).toBe(true);
    expect(result.totalLength).toBeCloseTo(150, 9);
    expect(result.samplePoints.length).toBeGreaterThan(1);
    expect(result.samplePoints[0].physicalDistance).toBe(0);
  });

  it("sampled points carry derived geometry (XYZ/azimuth/curvature/grade)", () => {
    const result = buildRoadIntermediate(makeInput(), { sampleInterval: 50 });
    const p = result.sample(50);
    expect(p).toBeDefined();
    if (!p) return;
    expect(p.x).toBeCloseTo(50, 6);
    expect(p.z).toBeCloseTo(10.5, 6);
    expect(p.azimuth).toBeCloseTo(0, 6);
    expect(p.grade).toBeCloseTo(0.01, 6);
  });

  it("sampled points include width and cross-slope", () => {
    const result = buildRoadIntermediate(makeInput(), { sampleInterval: 50 });
    const p = result.sample(50);
    expect(p).toBeDefined();
    if (!p) return;
    expect(p.leftWidth).toBeCloseTo(5.5, 6);
    expect(p.rightWidth).toBeCloseTo(5.5, 6);
    expect(p.leftSlopePercent).toBeCloseTo(2, 6);
  });

  it("reports issues when horizontal alignment is missing", () => {
    const input = makeInput({ horizontal: undefined });
    const result = buildRoadIntermediate(input, { sampleInterval: 50 });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.path === "horizontal")).toBe(true);
  });

  it("reports issues for invalid vertical element", () => {
    const input = makeInput({ vertical: [{ type: "grade", id: "G1", startPhysicalDistance: 0, startElevation: 0, grade: 0, length: 0 }] });
    const result = buildRoadIntermediate(input, { sampleInterval: 50 });
    expect(result.ok).toBe(false);
  });

  it("curvature inside the arc is non-zero", () => {
    const result = buildRoadIntermediate(makeInput(), { sampleInterval: 50 });
    const p = result.sample(101);
    expect(p).toBeDefined();
    if (!p) return;
    expect(p.curvature).toBeCloseTo(0.02, 6);
  });
});
