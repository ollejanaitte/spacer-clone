import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  applyAndGenerateSimpleSingleSpanSample,
  buildLAnglePolygon,
  computeLAngleAreaM2,
  computeLAngleVolumeM3,
  validateLAngleSectionParams,
} from "../bridgeStructure";
import { buildApolloVisualizationModelOrThrow } from "../visualization";
import { exportApolloBinaryStl } from "../export";

describe("Step 5-R R2 true L-section polygon", () => {
  it("computes area without double-counting the corner square", () => {
    expect(computeLAngleAreaM2(0.1, 0.08, 0.01)).toBeCloseTo(0.1 * 0.01 + 0.08 * 0.01 - 0.01 * 0.01, 12);
  });

  it("builds a simple CCW sharp-corner polygon", () => {
    const polygon = buildLAnglePolygon({ legA: 0.075, legB: 0.075, thickness: 0.009 });
    expect(polygon.vertices).toHaveLength(6);
    expect(polygon.winding).toBe("CCW");
    expect(polygon.cornerStyle).toBe("SHARP_CORNER_DEVELOPMENT");
    expect(polygon.areaM2).toBe(computeLAngleAreaM2(0.075, 0.075, 0.009));
    expect(validateLAngleSectionParams({ legA: 0.075, legB: 0.009, thickness: 0.009 }).length).toBeGreaterThan(
      0,
    );
  });

  it("volume equals area * length", () => {
    expect(computeLAngleVolumeM3(0.075, 0.06, 0.009, 2.5)).toBeCloseTo(
      computeLAngleAreaM2(0.075, 0.06, 0.009) * 2.5,
      12,
    );
  });

  it("sample bracing solids mark true L polygon implementation and STL exports", () => {
    const result = applyAndGenerateSimpleSingleSpanSample(createDefaultProject());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = buildApolloVisualizationModelOrThrow({ project: result.project });
    const bracing = model.solidGeometryParameters.filter((s) => s.kind === "bracing");
    expect(bracing.length).toBeGreaterThan(0);
    expect(bracing.every((s) => s.dimensionsM.sectionType === 1)).toBe(true);
    expect(bracing.every((s) => s.dimensionsM.sectionImplementation === 2)).toBe(true);
    expect(model.assumptions.some((a) => a.message.includes("true L-polygon"))).toBe(true);

    const stl = exportApolloBinaryStl(model);
    expect(stl.bytes.byteLength).toBeGreaterThan(84);
  });
});
