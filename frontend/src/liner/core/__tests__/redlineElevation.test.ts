import { describe, expect, it } from "vitest";
import { buildIntermediateResult } from "../pipeline/pipeline";
import { updateLinerCrossSectionTemplate, updateLinerCrossSlope } from "../../adapters/linerUiAdapter";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { ja } from "../../../i18n/ja";
import type { LinearAlignment } from "../types";

describe("redline elevation and crossfall", () => {
  const alignment: LinearAlignment = {
    id: "alignment-redline",
    linerModelId: "gc06",
    coordinatePolicyId: "global",
    elements: [
      {
        type: "straight",
        id: "L1",
        start: { x: 0, y: 0 },
        azimuth: 0,
        length: 100,
      },
    ],
  };

  it("preserves user-edited template elevation when offset changes", () => {
    const draft = createDefaultLinerDraft();
    const template = {
      ...draft.crossSections![0]!,
      offsetLines: [
        { id: "OL-0", offset: 0, elevation: 1.25, role: "lane" as const },
        { id: "OL-1", offset: 4, elevation: -0.5, role: "edge" as const },
      ],
    };
    const updated = updateLinerCrossSectionTemplate(draft, template);
    expect(updated.crossSections?.[0]?.offsetLines[0]?.elevation).toBe(1.25);
    expect(updated.crossSections?.[0]?.offsetLines[1]?.elevation).toBe(-0.5);

    const offsetChanged = updateLinerCrossSectionTemplate(updated, {
      ...template,
      offsetLines: [
        { ...template.offsetLines[0]!, offset: 0.5 },
        { ...template.offsetLines[1]!, offset: 5 },
      ],
    });
    expect(offsetChanged.crossSections?.[0]?.offsetLines[0]?.elevation).toBe(1.25);
    expect(offsetChanged.crossSections?.[0]?.offsetLines[1]?.elevation).toBe(-0.5);
  });

  it("does not rewrite elevation when legacy scalar crossSlope is updated", () => {
    const draft = updateLinerCrossSectionTemplate(createDefaultLinerDraft(), {
      id: "CS-test",
      name: "Test",
      crossSlope: { signConvention: "right_down_positive", valuePercent: 2 },
      offsetLines: [{ id: "OL-0", offset: 5, elevation: 0.75, role: "lane" }],
    });
    const scalarUpdated = updateLinerCrossSlope(draft, {
      signConvention: "right_down_positive",
      valuePercent: -3,
    });
    expect(scalarUpdated.crossSections?.[0]?.offsetLines[0]?.elevation).toBe(0.75);
  });

  it("composes parametric Z from profile + template elevation + single crossfall delta", () => {
    const result = buildIntermediateResult({
      alignment,
      stationDefinition: { originDisplayedStation: 0, explicitStations: [0] },
      crossSections: [
        {
          id: "CS-z",
          name: "Z",
          offsetLines: [
            { id: "OL-c", offset: 0, elevation: 0.5, role: "lane" },
            { id: "OL-r", offset: 4, elevation: 0.25, role: "edge" },
          ],
        },
      ],
      crossSlopeIntervals: [
        {
          id: "CF-1",
          startPhysicalDistance: 0,
          endPhysicalDistance: 100,
          mode: "one_way_right",
          leftSlopePercent: 2,
          rightSlopePercent: 2,
          pivotDistance: 0,
        },
      ],
      offsets: [0, 4],
      verticalAlignment: {
        id: "VA-1",
        elements: [
          {
            type: "grade",
            id: "VG-1",
            startStation: 0,
            endStation: 100,
            startElevation: 10,
            grade: 0,
            length: 100,
          },
        ],
      },
      z: 10,
    });

    const center = result.grid.points.find((point) => point.offset === 0);
    const right = result.grid.points.find((point) => point.offset === 4);
    expect(center?.z).toBeCloseTo(10.5, 6);
    expect(center?.zProvenance.sectionDepthOffset).toBeCloseTo(0.5, 6);
    expect(right?.z).toBeCloseTo(10.17, 6);
    expect(right?.zProvenance.crossfallOffset).toBeCloseTo(-0.08, 6);
    expect(right?.zProvenance.sectionDepthOffset).toBeCloseTo(0.25, 6);
  });

  it("emits Japanese measured-grid precedence diagnostic", () => {
    const result = buildIntermediateResult({
      alignment,
      stationDefinition: { originDisplayedStation: 0, interval: 50 },
      crossSlopeIntervals: [
        {
          id: "CF-1",
          startPhysicalDistance: 0,
          endPhysicalDistance: 100,
          mode: "flat",
          leftSlopePercent: 0,
          rightSlopePercent: 0,
        },
      ],
      measuredGrid: {
        id: "MG-1",
        source: "test",
        sections: [{ id: "S1", label: "C1", station: 0, sortIndex: 0 }],
        lines: [{ id: "L1", label: "HCL", sortIndex: 0, role: "center" }],
        points: [
          {
            id: "P1",
            sectionId: "S1",
            lineId: "L1",
            x: 0,
            y: 0,
            z: 42,
            station: 0,
            cumulativeWidth: 0,
          },
        ],
      },
      offsets: [0],
      z: 10,
    });

    const warning = result.diagnostics.find(
      (diagnostic) => diagnostic.code === "LINER_CROSSFALL_MEASURED_GRID_PRECEDENCE",
    );
    expect(warning?.messageKey).toBe("liner.errors.crossfall_measured_grid_precedence");
    expect(warning?.detail).toBe(ja.liner.errors.crossfall_measured_grid_precedence);
  });

  it("changes grid Z when crossfall mode changes", () => {
    const verticalAlignment = {
      id: "VA-1",
      elements: [
        {
          type: "grade" as const,
          id: "VG-1",
          startStation: 0,
          endStation: 100,
          startElevation: 10,
          grade: 0,
          length: 100,
        },
      ],
    };
    const baseInput = {
      alignment,
      stationDefinition: { originDisplayedStation: 0, explicitStations: [0] as number[] },
      crossSections: [
        {
          id: "CS-z",
          name: "Z",
          offsetLines: [{ id: "OL-r", offset: 4, elevation: 0, role: "edge" as const }],
        },
      ],
      offsets: [4],
      verticalAlignment,
      z: 10,
    };

    const flat = buildIntermediateResult({
      ...baseInput,
      crossSlopeIntervals: [
        {
          id: "CF-flat",
          startPhysicalDistance: 0,
          endPhysicalDistance: 100,
          mode: "flat",
          leftSlopePercent: 0,
          rightSlopePercent: 0,
        },
      ],
    });
    const rightSlope = buildIntermediateResult({
      ...baseInput,
      crossSlopeIntervals: [
        {
          id: "CF-right",
          startPhysicalDistance: 0,
          endPhysicalDistance: 100,
          mode: "one_way_right",
          leftSlopePercent: 2,
          rightSlopePercent: 2,
          pivotDistance: 0,
        },
      ],
    });

    const flatZ = flat.grid.points[0]?.z;
    const slopedZ = rightSlope.grid.points[0]?.z;
    expect(flatZ).toBeCloseTo(10, 6);
    expect(slopedZ).toBeCloseTo(9.92, 6);
    expect(slopedZ).not.toBeCloseTo(flatZ ?? 0, 6);
  });
});
