import { describe, expect, it } from "vitest";
import { buildIntermediateResult } from "../../pipeline/pipeline";
import {
  evaluateBridgeLayout,
  validateBridgeLayout,
} from "../bridgeLayoutEvaluation";
import type { LinearAlignment } from "../../types";

describe("bridgeLayoutEvaluation", () => {
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

  const stationDefinition = {
    originDisplayedStation: 0,
    explicitStations: [0, 10, 20],
  };

  it("generates span and pier results with displayed stations", () => {
    const pipeline = buildIntermediateResult({
      alignment,
      stationDefinition,
      offsets: [-5, 0, 5],
      z: 10,
      spans: [
        {
          id: "SP-1",
          startPhysicalDistance: 0,
          endPhysicalDistance: 20,
          pierIdStart: "P0",
          pierIdEnd: "P1",
        },
      ],
      piers: [
        { id: "P0", physicalDistance: 0, kind: "abutment" },
        { id: "P1", physicalDistance: 20, kind: "abutment" },
      ],
      computedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(pipeline.spans).toEqual([
      {
        id: "SP-1",
        startPhysicalDistance: 0,
        endPhysicalDistance: 20,
        startDisplayedStation: 0,
        endDisplayedStation: 20,
        pierIdStart: "P0",
        pierIdEnd: "P1",
      },
    ]);
    expect(pipeline.piers).toHaveLength(2);
    expect(pipeline.piers[0]).toMatchObject({
      id: "P0",
      physicalDistance: 0,
      displayedStation: 0,
      skewAngleRad: 0,
      supportLinePointIds: ["GP-gc06-000-000", "GP-gc06-000-001", "GP-gc06-000-002"],
    });
    expect(pipeline.piers[1]).toMatchObject({
      id: "P1",
      physicalDistance: 20,
      displayedStation: 20,
      supportLinePointIds: ["GP-gc06-002-000", "GP-gc06-002-001", "GP-gc06-002-002"],
    });
  });

  it("preserves arbitrary skew angles in pier results", () => {
    const result = evaluateBridgeLayout({
      spans: [],
      piers: [
        {
          id: "P-skew",
          physicalDistance: 10,
          kind: "pier",
          skewAngleRad: Math.PI / 6,
        },
      ],
      alignmentTotalLength: 20,
      stationDefinition,
      gridPoints: [],
    });

    expect(result.piers[0]?.skewAngleRad).toBeCloseTo(Math.PI / 6, 10);
  });

  it("fails closed on invalid pier references", () => {
    const result = evaluateBridgeLayout({
      spans: [
        {
          id: "SP-bad",
          startPhysicalDistance: 0,
          endPhysicalDistance: 10,
          pierIdEnd: "missing",
        },
      ],
      piers: [],
      alignmentTotalLength: 20,
      stationDefinition,
      gridPoints: [],
    });

    expect(result.spans).toEqual([]);
    expect(result.piers).toEqual([]);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        level: "error",
        code: "LINER_SPAN_PIER_REFERENCE_MISSING",
        entityId: "SP-bad",
      }),
    );
  });

  it("fails closed when span end exceeds alignment length", () => {
    const issues = validateBridgeLayout({
      spans: [
        {
          id: "SP-overflow",
          startPhysicalDistance: 0,
          endPhysicalDistance: 25,
        },
      ],
      piers: [],
      alignmentTotalLength: 20,
      stationDefinition,
      gridPoints: [],
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        level: "error",
        code: "LINER_SPAN_END_EXCEEDS_ALIGNMENT",
        entityId: "SP-overflow",
      }),
    );
  });

  it("fails closed on duplicate span and pier ids", () => {
    const issues = validateBridgeLayout({
      spans: [
        { id: "SP-dup", startPhysicalDistance: 0, endPhysicalDistance: 5 },
        { id: "SP-dup", startPhysicalDistance: 5, endPhysicalDistance: 10 },
      ],
      piers: [
        { id: "P-dup", physicalDistance: 0, kind: "pier" },
        { id: "P-dup", physicalDistance: 10, kind: "pier" },
      ],
      alignmentTotalLength: 20,
      stationDefinition,
      gridPoints: [],
    });

    expect(issues.filter((issue) => issue.code === "LINER_SPAN_DUPLICATE_ID")).toHaveLength(1);
    expect(issues.filter((issue) => issue.code === "LINER_PIER_DUPLICATE_ID")).toHaveLength(1);
  });

  it("filters support line points by bearing offsets when provided", () => {
    const pipeline = buildIntermediateResult({
      alignment,
      stationDefinition,
      offsets: [-5, 0, 5],
      z: 10,
      piers: [
        {
          id: "P-bearing",
          physicalDistance: 10,
          kind: "pier",
          bearingOffsets: [{ transverseIndex: 1, offset: 0 }],
        },
      ],
    });

    expect(pipeline.piers[0]?.supportLinePointIds).toEqual(["GP-gc06-001-001"]);
  });

  it("includes spans and piers in source revision when present", () => {
    const withoutBridge = buildIntermediateResult({
      alignment,
      stationDefinition,
      offsets: [0],
      z: 10,
      computedAt: "2026-01-01T00:00:00.000Z",
    });
    const withBridge = buildIntermediateResult({
      alignment,
      stationDefinition,
      offsets: [0],
      z: 10,
      spans: [{ id: "SP-1", startPhysicalDistance: 0, endPhysicalDistance: 20 }],
      piers: [{ id: "P0", physicalDistance: 0, kind: "abutment" }],
      computedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(withBridge.sourceRevision).not.toBe(withoutBridge.sourceRevision);
  });
});
