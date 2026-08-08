import { describe, expect, it } from "vitest";
import { pointAtStationOffset } from "../../liner/core/coordinate3d";
import type { LinearAlignment } from "../../liner/core/types";
import { AlignmentSamplingError, LinerAlignmentConnector } from "./alignmentConnector";

/** RB-001 ACL is a straight "plane grid" alignment, bridge length 134.001 m. */
const ALIGNMENT: LinearAlignment = {
  id: "ALN-ACL",
  linerModelId: "RB-S10-001",
  coordinatePolicyId: "global",
  elements: [
    { type: "straight", id: "L1", start: { x: 0, y: 0 }, azimuth: 0, length: 134.001 },
  ],
};

function buildLinerInput() {
  return {
    alignment: ALIGNMENT,
    stationDefinition: { originDisplayedStation: 0, interval: 10 },
    offsets: [0],
    z: 0,
    computedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("LinerAlignmentConnector (Phase 6-1B)", () => {
  it("reuses LINER pointAtStationOffset (parity, no reimplementation)", () => {
    const input = buildLinerInput();
    const connector = new LinerAlignmentConnector(input);
    for (const [station, offset] of [
      [0, 0],
      [40.201, 0],
      [40.201, 1.47689],
      [90.202, 0],
      [134.001, 0],
      [100, -3.2],
    ] as const) {
      const sample = connector.samplePoint({ alignmentId: "ALN-ACL", stationM: station, offsetM: offset });
      const liner = pointAtStationOffset(input, station, offset);
      expect(liner.ok).toBe(true);
      if (liner.ok) {
        expect(sample.position.x).toBeCloseTo(liner.value.x, 9);
        expect(sample.position.y).toBeCloseTo(liner.value.y, 9);
        expect(sample.position.z).toBeCloseTo(liner.value.z, 9);
        expect(sample.azimuthRad).toBeCloseTo(liner.value.azimuth, 9);
        expect(sample.sourceStation).toBeCloseTo(liner.value.physicalDistance, 9);
        expect(sample.sourceOffset).toBeCloseTo(liner.value.offset, 9);
        expect(sample.localFrame.tangent).toEqual(liner.value.localFrame.tangent);
      }
    }
  });

  it("reports curvature for a straight alignment as 0 (LINER authority)", () => {
    const connector = new LinerAlignmentConnector(buildLinerInput());
    const sample = connector.samplePoint({ alignmentId: "ALN-ACL", stationM: 67.0, offsetM: 0 });
    expect(sample.curvature).toBe(0);
    expect(sample.tangent).toEqual({ x: 1, y: 0, z: 0 });
    expect(sample.transverse.y).toBe(1);
    expect(sample.vertical.z).toBe(1);
  });

  it("samples a cross-section via sampleSection", () => {
    const connector = new LinerAlignmentConnector(buildLinerInput());
    const section = connector.sampleSection({
      alignmentId: "ALN-ACL",
      stationM: 40.201,
      offsetsM: [-1.47689, 0, 1.47689],
    });
    expect(section).toHaveLength(3);
    expect(section[0].position.x).toBeCloseTo(section[2].position.x, 9);
    expect(section[1].position.y).toBeCloseTo(0, 9);
  });

  it("propagates LINER errors instead of inventing coordinates", () => {
    const connector = new LinerAlignmentConnector(buildLinerInput());
    expect(() =>
      connector.samplePoint({ alignmentId: "ALN-ACL", stationM: 9999, offsetM: 0 }),
    ).toThrow(AlignmentSamplingError);
    expect(() =>
      connector.samplePoint({ alignmentId: "ALN-ACL", stationM: 10, offsetM: Number.POSITIVE_INFINITY }),
    ).toThrow(AlignmentSamplingError);
  });
});
