import { describe, expect, it } from "vitest";
import type { LinearAlignment } from "../../liner/core/types";
import { LinerAlignmentConnector } from "./alignmentConnector";
import {
  buildCrossSectionFrame,
  buildCrossSectionFrames,
  RB001_SECTION_STATIONS,
} from "./crossSectionFrame";

const ALIGNMENT: LinearAlignment = {
  id: "ALN-ACL",
  linerModelId: "RB-S10-001",
  coordinatePolicyId: "global",
  elements: [
    { type: "straight", id: "L1", start: { x: 0, y: 0 }, azimuth: 0, length: 134.001 },
  ],
};

function buildConnector(): LinerAlignmentConnector {
  return new LinerAlignmentConnector({
    alignment: ALIGNMENT,
    stationDefinition: { originDisplayedStation: 0, interval: 10 },
    offsets: [0],
    z: 0,
    computedAt: "2026-01-01T00:00:00.000Z",
  });
}

describe("cross-section frames (Phase 6-1D, Reference Bridge 001)", () => {
  it("builds an orthogonal frame (skew 0) at a station", () => {
    const frame = buildCrossSectionFrame(
      { sectionId: "SECTION-DECK", stationM: 40.201 },
      buildConnector(),
      "ALN-ACL",
    );
    expect(frame.id).toBe("XSEC-SECTION-DECK-40.201");
    expect(frame.sectionId).toBe("SECTION-DECK");
    expect(frame.stationM).toBe(40.201);
    expect(frame.skewRad).toBe(0);
    // orthogonal: longitudinal = +x, transverse = +y, vertical = +z
    expect(frame.localFrame.tangent.x).toBeCloseTo(1, 9);
    expect(frame.localFrame.normal.y).toBeCloseTo(1, 9);
    expect(frame.localFrame.binormal.z).toBeCloseTo(1, 9);
    expect(frame.transverseAxis).toEqual(frame.localFrame.normal);
    expect(frame.elevationM).toBeCloseTo(0, 9);
    // position from LINER (offset 0)
    expect(frame.position.x).toBeCloseTo(40.201, 9);
  });

  it("keeps the frame orthonormal under skew", () => {
    const frame = buildCrossSectionFrame(
      { sectionId: "SECTION-DECK", stationM: 40.201, skewRad: 0.1 },
      buildConnector(),
      "ALN-ACL",
    );
    const t = frame.localFrame.tangent;
    const n = frame.localFrame.normal;
    const dot = t.x * n.x + t.y * n.y + t.z * n.z;
    expect(dot).toBeCloseTo(0, 9);
    expect(Math.hypot(t.x, t.y, t.z)).toBeCloseTo(1, 9);
    expect(Math.hypot(n.x, n.y, n.z)).toBeCloseTo(1, 9);
    // non-zero skew rotates the transverse axis away from the alignment normal
    expect(n.y).toBeLessThan(1);
    expect(n.x).toBeCloseTo(Math.sin(-0.1), 9);
    expect(frame.skewRad).toBe(0.1);
  });

  it("places frames at the RB-001 support stations", () => {
    const frames = buildCrossSectionFrames(
      RB001_SECTION_STATIONS.map((stationM) => ({ sectionId: "SECTION-DECK", stationM })),
      buildConnector(),
      "ALN-ACL",
    );
    expect(frames).toHaveLength(4);
    expect(frames.map((f) => f.stationM)).toEqual([0, 40.201, 91.201, 134.001]);
    expect(frames.map((f) => f.elevationM)).toEqual([0, 0, 0, 0]);
    // first frame sits at the alignment origin
    expect(frames[0].position.x).toBeCloseTo(0, 9);
    expect(frames[3].position.x).toBeCloseTo(134.001, 9);
  });
});
