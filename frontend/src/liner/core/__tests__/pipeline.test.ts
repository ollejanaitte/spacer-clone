import { describe, expect, it } from "vitest";
import { buildIntermediateResult } from "../pipeline/pipeline";
import { canonicalJson, sourceRevisionFor } from "../pipeline/sourceRevision";
import type { LinearAlignment } from "../types";

describe("liner intermediate result builder", () => {
  const alignment: LinearAlignment = {
    id: "alignment-1",
    linerModelId: "gc06",
    coordinatePolicyId: "global",
    elements: [
      {
        type: "straight",
        id: "L1",
        start: { x: 0, y: 0 },
        azimuth: 0,
        length: 20,
      },
    ],
  };

  it("builds a canonical traceable intermediate result", () => {
    const result = buildIntermediateResult({
      alignment,
      stationDefinition: {
        originDisplayedStation: 0,
        interval: 10,
      },
      offsets: [-5, 0, 5],
      z: 10,
      computedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(result.diagnostics.filter((diagnostic) => diagnostic.level === "error")).toHaveLength(0);
    expect(result.computedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(result.horizontal.segments).toHaveLength(1);
    expect(result.horizontal.sampledPoints).toHaveLength(41);
    expect(result.vertical.profileElevation).toBe(10);
    expect(result.vertical.sampledPoints).toHaveLength(3);
    expect(result.stations.entries).toHaveLength(3);
    expect(result.grid.points).toHaveLength(9);
    expect(result.grid.lines).toHaveLength(6);
    expect(result.grid.cells).toHaveLength(4);
    expect(result.spans).toEqual([]);
    expect(result.piers).toEqual([]);
    expect(result.sections).toHaveLength(3);
    expect(result.sections[0]).toMatchObject({
      id: "SEC-gc06-000",
      physicalDistance: 0,
      displayedStation: 0,
      templateId: "CS-default",
      crossfall: {
        mode: "flat",
        leftSlopePercent: 0,
        rightSlopePercent: 0,
      },
    });
    expect(result.frameHints).toMatchObject({
      defaultMemberGroupKey: "default",
      connectivityMode: "grid_full",
    });
    expect(result.grid.points[4]).toMatchObject({
      id: "GP-gc06-001-001",
      gridDefinitionId: "GRID-gc06-default",
      x: 10,
      y: 0,
      z: 10,
      source: {
        alignmentId: "alignment-1",
        stationId: "ST-001",
        elementId: "L1",
      },
    });
    expect(result.grid.lines[0]).toMatchObject({
      id: "GL-gc06-L-000",
      direction: "longitudinal",
      pointIds: ["GP-gc06-000-000", "GP-gc06-001-000", "GP-gc06-002-000"],
    });
    expect(result.grid.cells[0]).toMatchObject({
      id: "GC-gc06-000-000",
      cornerPointIds: [
        "GP-gc06-000-000",
        "GP-gc06-001-000",
        "GP-gc06-001-001",
        "GP-gc06-000-001",
      ],
    });
    expect(result.dependencyGraph.createdFromSourceRevision).toBe(result.sourceRevision);
    expect(result.sourceRevision).toHaveLength(64);
  });

  it("creates deterministic canonical source revisions", () => {
    const left = { b: 2, a: { d: 4, c: 3 } };
    const right = { a: { c: 3, d: 4 }, b: 2 };

    expect(canonicalJson(left)).toBe(canonicalJson(right));
    expect(sourceRevisionFor(left)).toBe(sourceRevisionFor(right));
  });

  it("uses station-resolved cross-section templates instead of fixing every section to the first template", () => {
    const longAlignment: LinearAlignment = {
      ...alignment,
      id: "alignment-multi-template",
      elements: [
        {
          type: "straight",
          id: "L-long",
          start: { x: 0, y: 0 },
          azimuth: 0,
          length: 100,
        },
      ],
    };
    const result = buildIntermediateResult({
      alignment: longAlignment,
      stationDefinition: {
        originDisplayedStation: 0,
        explicitStations: [0, 50, 100],
      },
      crossSections: [
        {
          id: "CS-start",
          name: "Start",
          station: 0,
          crossSlope: {
            signConvention: "right_down_positive",
            valuePercent: 2,
          },
          offsetLines: [
            { id: "OL-s-l", offset: -4, elevation: 0, role: "edge", label: "L4" },
            { id: "OL-s-c", offset: 0, elevation: 0, role: "lane", label: "C" },
            { id: "OL-s-r", offset: 4, elevation: 0, role: "edge", label: "R4" },
          ],
        },
        {
          id: "CS-end",
          name: "End",
          station: 100,
          crossSlope: {
            signConvention: "right_down_positive",
            valuePercent: -2,
          },
          offsetLines: [
            { id: "OL-e-l", offset: -6, elevation: 0, role: "edge", label: "L6" },
            { id: "OL-e-c", offset: 0, elevation: 0, role: "lane", label: "C" },
            { id: "OL-e-r", offset: 6, elevation: 0, role: "edge", label: "R6" },
          ],
        },
      ],
      gridDefinitions: [
        {
          id: "GRID-start",
          crossSectionTemplateId: "CS-start",
          stationRange: {
            startPhysicalDistance: 0,
            endPhysicalDistance: 50,
          },
        },
        {
          id: "GRID-end",
          crossSectionTemplateId: "CS-end",
          stationRange: {
            startPhysicalDistance: 50,
            endPhysicalDistance: 100,
          },
        },
      ],
      offsets: [-4, 0, 4],
      z: 10,
      computedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(result.sections).toHaveLength(3);
    expect(result.sections[0]).toMatchObject({
      physicalDistance: 0,
      templateId: "CS-start",
      width: 8,
      crossfall: {
        mode: "one_way_right",
      },
    });
    expect(result.sections[1]).toMatchObject({
      physicalDistance: 50,
      templateId: "CS-end",
      width: 12,
      crossfall: {
        mode: "one_way_left",
      },
    });
    expect(result.sections[2]).toMatchObject({
      physicalDistance: 100,
      templateId: "CS-end",
      width: 12,
    });

    const endRightPoint = result.grid.points.find(
      (point) => point.physicalDistance === 100 && point.offset === 6,
    );
    expect(endRightPoint?.source.crossSectionTemplateId).toBe("CS-end");
    expect(endRightPoint?.z).toBeCloseTo(10.12, 6);
    expect(endRightPoint?.zProvenance.crossfallOffset).toBeCloseTo(0.12, 6);
  });

  it("applies width change points to grid offsets and source revision", () => {
    const baseInput = {
      alignment,
      stationDefinition: {
        originDisplayedStation: 0,
        explicitStations: [0, 20],
      },
      crossSections: [
        {
          id: "CS-default",
          name: "Default",
          offsetLines: [
            { id: "OL-l", offset: -2, elevation: 0, role: "lane" as const },
            { id: "OL-c", offset: 0, elevation: 0, role: "lane" as const },
            { id: "OL-r", offset: 4, elevation: 0, role: "lane" as const },
          ],
        },
      ],
      offsets: [-2, 0, 4],
      z: 10,
      computedAt: "2026-01-01T00:00:00.000Z",
    };

    const withoutWidth = buildIntermediateResult(baseInput);
    const withWidth = buildIntermediateResult({
      ...baseInput,
      widthChangePoints: [
        {
          id: "WP-1",
          physicalDistance: 0,
          leftOffset: 4,
          rightOffset: 8,
        },
      ],
    });

    const startRightPoint = withWidth.grid.points.find(
      (point) => point.physicalDistance === 0 && point.labels.transverseIndex === 2,
    );
    expect(startRightPoint?.offset).toBeCloseTo(8, 6);
    expect(withWidth.sourceRevision).not.toBe(withoutWidth.sourceRevision);
    expect(
      withWidth.diagnostics.some((diagnostic) => diagnostic.code === "LINER_WIDTH_CHANGE_POINT_OVERLAP"),
    ).toBe(false);
  });

  it("fails closed when width change points overlap", () => {
    const result = buildIntermediateResult({
      alignment,
      stationDefinition: {
        originDisplayedStation: 0,
        explicitStations: [0],
      },
      crossSections: [
        {
          id: "CS-default",
          name: "Default",
          offsetLines: [{ id: "OL-c", offset: 0, elevation: 0, role: "lane" as const }],
        },
      ],
      widthChangePoints: [
        {
          id: "WP-1",
          physicalDistance: 0,
          leftOffset: 4,
          rightOffset: 4,
        },
        {
          id: "WP-2",
          physicalDistance: 0,
          leftOffset: 5,
          rightOffset: 5,
        },
      ],
      offsets: [0],
      z: 10,
    });

    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === "LINER_WIDTH_CHANGE_POINT_OVERLAP"),
    ).toBe(true);
    expect(result.grid.points).toHaveLength(0);
  });

  it("includes gridDefinitions in the source revision hash", () => {
    const base = {
      alignment,
      stationDefinition: {
        originDisplayedStation: 0,
        interval: 10,
      },
      crossSections: [
        {
          id: "CS-default",
          name: "Default",
          station: 0,
          offsetLines: [{ id: "OL-0", offset: 0, elevation: 0 }],
        },
      ],
      offsets: [0],
      z: 0,
      computedAt: "2026-01-01T00:00:00.000Z",
    };

    const left = buildIntermediateResult({
      ...base,
      gridDefinitions: [
        {
          id: "GRID-left",
          crossSectionTemplateId: "CS-default",
          stationRange: { startPhysicalDistance: 0, endPhysicalDistance: 10 },
        },
      ],
    });
    const right = buildIntermediateResult({
      ...base,
      gridDefinitions: [
        {
          id: "GRID-right",
          crossSectionTemplateId: "CS-default",
          stationRange: { startPhysicalDistance: 0, endPhysicalDistance: 20 },
        },
      ],
    });

    expect(left.sourceRevision).not.toBe(right.sourceRevision);
  });
});
