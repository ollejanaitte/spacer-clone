import { describe, expect, it } from "vitest";
import {
  evaluateRoadCrossfall,
  evaluateRoadCrossfallOffset,
  evaluateRoadWidth,
  validateCrossSlopeIntervals,
  validateWidthChangePoints,
} from "../width";
import type { CrossSectionTemplateDraft } from "../../../../liner/schema/types";

function makeTemplate(): CrossSectionTemplateDraft {
  return {
    id: "XS1",
    name: "標準",
    offsetLines: [
      { id: "L1", offset: -5.5, elevation: 0, role: "lane" },
      { id: "C1", offset: 0, elevation: 0, role: "lane" },
      { id: "R1", offset: 5.5, elevation: 0, role: "lane" },
    ],
    crossSlope: { signConvention: "right_down_positive", valuePercent: 2 },
  };
}

describe("Phase 2-06 Width change / widening / cross-slope transition", () => {
  it("resolves template width when no width change points", () => {
    const template = makeTemplate();
    const width = evaluateRoadWidth(template, undefined, 50);
    expect(width.leftOffset).toBeCloseTo(5.5, 9);
    expect(width.rightOffset).toBeCloseTo(5.5, 9);
    expect(width.source).toBe("template");
  });

  it("applies a width change point (widening) after its station", () => {
    const template = makeTemplate();
    const points = [
      { id: "W1", physicalDistance: 100, leftOffset: 7, rightOffset: 8 },
    ];
    const before = evaluateRoadWidth(template, points, 50);
    expect(before.leftOffset).toBeCloseTo(5.5, 9);

    const after = evaluateRoadWidth(template, points, 120);
    expect(after.leftOffset).toBeCloseTo(7, 9);
    expect(after.rightOffset).toBeCloseTo(8, 9);
    expect(after.source).toBe("width_change_point");
  });

  it("validates width change points (out of range rejected)", () => {
    const issues = validateWidthChangePoints(
      [{ id: "W1", physicalDistance: 9999, leftOffset: 7, rightOffset: 8 }],
      150,
    );
    expect(issues.length).toBeGreaterThan(0);
  });

  it("evaluates cross-slope state (template default)", () => {
    const template = makeTemplate();
    const state = evaluateRoadCrossfall(template, undefined, 50, 50);
    expect(state.leftSlopePercent).toBeCloseTo(2, 9);
    expect(state.rightSlopePercent).toBeCloseTo(2, 9);
    expect(state.pivotDistance).toBeCloseTo(0, 9);
  });

  it("evaluates cross-slope offset delta (LINER sign convention)", () => {
    const template = makeTemplate();
    // applyCrossSlope: -(2/100)*offset ; at offset 5.5 -> -0.11
    const delta = evaluateRoadCrossfallOffset(template, undefined, 50, 50, 5.5);
    expect(delta).toBeCloseTo(-0.11, 9);
  });

  it("validates cross-slope intervals", () => {
    const template = makeTemplate();
    const badIntervals = [
      { id: "CS1", startPhysicalDistance: 200, endPhysicalDistance: 100, mode: "crown" as const, leftSlopePercent: 2, rightSlopePercent: 2 },
    ];
    const issues = validateCrossSlopeIntervals(badIntervals, 150);
    expect(issues.length).toBeGreaterThan(0);
    void template;
  });
});
