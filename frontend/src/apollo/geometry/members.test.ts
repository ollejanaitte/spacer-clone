import { describe, expect, it } from "vitest";
import type { LinearAlignment } from "../../liner/core/types";
import { LinerAlignmentConnector } from "./alignmentConnector";
import {
  buildCrossGirderReferences,
  buildMainGirderMembers,
  RB001_CROSS_GIRDER_SPECS,
} from "./members";
import { placeGirderLines } from "./placement";

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

function buildGirderLines() {
  return placeGirderLines(
    {
      girders: [
        { id: "GIRDER-AG1", offsetStartM: 1.47689, offsetEndM: 1.55372 },
        { id: "GIRDER-AG2", offsetStartM: -3.02859, offsetEndM: -2.94155 },
      ],
      stationStartM: 0,
      stationEndM: 134.001,
      alignmentId: "ALN-ACL",
    },
    buildConnector(),
  );
}

describe("member placement (Phase 6-2)", () => {
  it("builds one main girder member per span per girder (RB-001: 3 spans x 2 girders)", () => {
    const refs = buildMainGirderMembers({
      girderLines: buildGirderLines(),
      supportStationsM: [0, 40.201, 91.201, 134.001],
      connector: buildConnector(),
      alignmentId: "ALN-ACL",
    });
    expect(refs).toHaveLength(6);
    expect(refs[0].memberId).toBe("M-GIRDER-AG1-S1");
    expect(refs[0].kind).toBe("mainGirder");
    expect(refs[0].fromPointId).toContain("GIRDER-AG1");
    expect(refs[5].memberId).toBe("M-GIRDER-AG2-S3");
    // endpoints sampled at support stations via LINER
    const s1 = buildConnector().samplePoint({ alignmentId: "ALN-ACL", stationM: 40.201, offsetM: 1.47689 });
    const ref1 = refs[0];
    expect(ref1.localFrame.tangent.x).toBeCloseTo(1, 6);
    expect(s1.position.x).toBeCloseTo(40.201, 9);
  });

  it("builds cross girder references at declared stations connecting all girders", () => {
    const refs = buildCrossGirderReferences(RB001_CROSS_GIRDER_SPECS, [
      "GIRDER-AG1",
      "GIRDER-AG2",
    ]);
    expect(refs).toHaveLength(4);
    expect(refs.map((r) => r.crossGirderId)).toEqual(["GE1", "C1", "C2", "GE2"]);
    expect(refs.map((r) => r.stationM)).toEqual([0, 40.201, 91.201, 134.001]);
    expect(refs[0].connectedGirderIds).toEqual(["GIRDER-AG1", "GIRDER-AG2"]);
  });

  it("returns no members when fewer than two support stations", () => {
    const refs = buildMainGirderMembers({
      girderLines: buildGirderLines(),
      supportStationsM: [0],
      connector: buildConnector(),
      alignmentId: "ALN-ACL",
    });
    expect(refs).toHaveLength(0);
  });
});
