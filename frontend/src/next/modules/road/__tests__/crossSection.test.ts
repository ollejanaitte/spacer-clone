import { describe, expect, it } from "vitest";
import {
  buildRoadCrossSection,
  evaluateCrossSectionAtOffset,
  evaluateCrossSectionSurface,
  computeOffsetLineElevation,
} from "../crossSection";
import type { CrossSectionTemplateDraft } from "../../../../liner/schema/types";

describe("Phase 2-05 Cross-section (reuses LINER conventions)", () => {
  it("builds a road cross-section with left/right widths", () => {
    const section = buildRoadCrossSection({
      id: "XS1",
      name: "標準横断",
      offsetLines: [
        { id: "L1", offset: -5.5, elevation: 0.15, role: "lane", label: "車道左" },
        { id: "C1", offset: 0, elevation: 0, role: "lane", label: "中心" },
        { id: "R1", offset: 5.5, elevation: 0.15, role: "lane", label: "車道右" },
        { id: "R2", offset: 7.5, elevation: 0.3, role: "shoulder", label: "路肩右" },
      ],
    });
    expect(section.leftWidth).toBeCloseTo(5.5, 9);
    expect(section.rightWidth).toBeCloseTo(7.5, 9);
    expect(section.components).toHaveLength(4);
    expect(section.components[3].role).toBe("shoulder");
    expect(section.components[3].width).toBeCloseTo(2.0, 9);
  });

  it("evaluates an offset line in the template", () => {
    const template: CrossSectionTemplateDraft = {
      id: "XS1",
      name: "標準",
      offsetLines: [
        { id: "R1", offset: 5.5, elevation: 0.15, role: "lane" },
        { id: "L1", offset: -5.5, elevation: 0.15, role: "lane" },
      ],
    };
    const right = evaluateCrossSectionAtOffset(template, 5.5);
    expect(right?.role).toBe("lane");
    expect(right?.elevation).toBeCloseTo(0.15, 9);
    expect(evaluateCrossSectionAtOffset(template, 1.0)).toBeUndefined();
  });

  it("computes offset line elevation from cross slope (LINER sign convention)", () => {
    // LINER convention: applyCrossSlope(offset, slope%) = -(slope/100)*offset
    // positive offset + positive slope -> deltaZ negative (right-down positive)
    expect(computeOffsetLineElevation(5.5, 2)).toBeCloseTo(-0.11, 9);
    expect(computeOffsetLineElevation(-5.5, 2)).toBeCloseTo(0.11, 9);
    expect(computeOffsetLineElevation(3, 2)).toBeCloseTo(-0.06, 9);
  });

  it("evaluates cross-section surface with base + slope elevation", () => {
    const template: CrossSectionTemplateDraft = {
      id: "XS1",
      name: "標準",
      offsetLines: [
        { id: "R1", offset: 5.5, elevation: 0.2, role: "lane" },
      ],
    };
    const surface = evaluateCrossSectionSurface(template, 5.5, 2);
    // base 0.2 + applyCrossSlope(5.5, 2) = -0.11
    expect(surface.elevation).toBeCloseTo(0.2 - 0.11, 9);
  });
});
