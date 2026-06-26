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
    expect(result.horizontal.sampledPoints).toHaveLength(2);
    expect(result.vertical.profileElevation).toBe(10);
    expect(result.vertical.sampledPoints).toHaveLength(3);
    expect(result.stations.entries).toHaveLength(3);
    expect(result.grid.points).toHaveLength(9);
    expect(result.grid.lines).toHaveLength(6);
    expect(result.grid.cells).toHaveLength(4);
    expect(result.spans).toEqual([]);
    expect(result.piers).toEqual([]);
    expect(result.sections).toEqual([]);
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
});
