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

  it("builds traceable stations, grid points, nodes, and members", () => {
    const result = buildIntermediateResult({
      alignment,
      stationDefinition: {
        originDisplayedStation: 0,
        interval: 10,
      },
      offsets: [-5, 0, 5],
      z: 10,
    });

    expect(result.issues.filter((issue) => issue.level === "error")).toHaveLength(0);
    expect(result.stations).toHaveLength(3);
    expect(result.gridPoints).toHaveLength(9);
    expect(result.nodeCandidates).toHaveLength(9);
    expect(result.memberCandidates).toHaveLength(6);
    expect(result.gridPoints[4]).toMatchObject({
      id: "GP-gc06-001-001",
      x: 10,
      y: 0,
      z: 10,
      source: {
        alignmentId: "alignment-1",
        stationId: "ST-001",
        elementId: "L1",
      },
    });
    expect(result.memberCandidates[0]).toMatchObject({
      stationIId: "ST-000",
      stationJId: "ST-001",
      direction: "longitudinal",
    });
    expect(result.sourceRevision).toHaveLength(64);
  });

  it("creates deterministic canonical source revisions", () => {
    const left = { b: 2, a: { d: 4, c: 3 } };
    const right = { a: { c: 3, d: 4 }, b: 2 };

    expect(canonicalJson(left)).toBe(canonicalJson(right));
    expect(sourceRevisionFor(left)).toBe(sourceRevisionFor(right));
  });
});
