import { describe, expect, it } from "vitest";
import type { LinearAlignment } from "../../liner/core/types";
import { LinerAlignmentConnector } from "./alignmentConnector";
import {
  placeGirderLines,
  placeSupportLines,
  supportStationsFromSpans,
} from "./placement";

/** RB-001 ACL: straight "plane grid", bridge length 134.001 m. */
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

const RB001_SUPPORTS = [
  { id: "SUP-AR2", role: "abutment" as const },
  { id: "SUP-PR1", role: "pier" as const },
  { id: "SUP-PR2", role: "pier" as const },
  { id: "SUP-PU15", role: "abutment" as const },
];

describe("support placement (Phase 6-1C, Reference Bridge 001)", () => {
  it("computes support stations from cumulative spans (RB-001)", () => {
    // spans 40.201 / 51.000 / 40.200 over bridge length 134.001
    const stations = supportStationsFromSpans(RB001_SUPPORTS, [40.201, 51.0, 40.2], 134.001);
    expect(stations).toEqual([0, 40.201, 91.201, 134.001]);
  });

  it("rejects a support/span count mismatch", () => {
    expect(() => supportStationsFromSpans(RB001_SUPPORTS, [40.201], 134.001)).toThrow(
      /support count/,
    );
  });

  it("places 4 support lines at LINER-sampled positions", () => {
    const { supportLines } = placeSupportLines(
      {
        supports: RB001_SUPPORTS,
        spanLengthsM: [40.201, 51.0, 40.2],
        bridgeLengthM: 134.001,
        girderIds: ["GIRDER-AG1", "GIRDER-AG2"],
        alignmentId: "ALN-ACL",
      },
      buildConnector(),
      { "GIRDER-AG1": 1.47689, "GIRDER-AG2": -3.02859 },
    );
    expect(supportLines).toHaveLength(4);
    expect(supportLines.map((l) => l.id)).toEqual([
      "SUP-LINE-SUP-AR2",
      "SUP-LINE-SUP-PR1",
      "SUP-LINE-SUP-PR2",
      "SUP-LINE-SUP-PU15",
    ]);
    expect(supportLines.map((l) => l.stationM.value)).toEqual([0, 40.201, 91.201, 134.001]);
    // positions sampled from LINER straight alignment (offset 0, azimuth 0)
    expect(supportLines[0].stationM.value).toBe(0);
    expect(supportLines[3].stationM.value).toBe(134.001);
    // transverse axis is the LINER normal (perpendicular to tangent)
    expect(supportLines[0].transverseAxis.y).toBeCloseTo(1, 9);
    expect(supportLines[0].skewRad.value).toBe(0);
  });

  it("creates one support point per girder at each support", () => {
    const { supportPoints } = placeSupportLines(
      {
        supports: RB001_SUPPORTS,
        spanLengthsM: [40.201, 51.0, 40.2],
        bridgeLengthM: 134.001,
        girderIds: ["GIRDER-AG1", "GIRDER-AG2"],
        alignmentId: "ALN-ACL",
      },
      buildConnector(),
      { "GIRDER-AG1": 1.47689, "GIRDER-AG2": -3.02859 },
    );
    expect(supportPoints).toHaveLength(8);
    const first = supportPoints[0];
    expect(first.supportId).toBe("SUP-AR2");
    expect(first.girderId).toBe("GIRDER-AG1");
    expect(first.position.y).toBeCloseTo(1.47689, 9);
    expect(supportPoints[1].girderId).toBe("GIRDER-AG2");
    expect(supportPoints[1].position.y).toBeCloseTo(-3.02859, 9);
  });

  it("keeps support positions consistent with the alignment connector (no math drift)", () => {
    const connector = buildConnector();
    const { supportPoints } = placeSupportLines(
      {
        supports: RB001_SUPPORTS,
        spanLengthsM: [40.201, 51.0, 40.2],
        bridgeLengthM: 134.001,
        girderIds: ["GIRDER-AG1"],
        alignmentId: "ALN-ACL",
      },
      connector,
      { "GIRDER-AG1": 1.47689 },
    );
    const expected = connector.samplePoint({ alignmentId: "ALN-ACL", stationM: 40.201, offsetM: 1.47689 });
    expect(supportPoints[1].position.x).toBeCloseTo(expected.position.x, 9);
    expect(supportPoints[1].position.y).toBeCloseTo(expected.position.y, 9);
  });
});

describe("girder placement (Phase 6-1C, Reference Bridge 001)", () => {
  it("places AG1/AG2 girder lines between start and end stations", () => {
    const lines = placeGirderLines(
      {
        girders: [
          { id: "GIRDER-AG1", offsetM: 1.47689 },
          { id: "GIRDER-AG2", offsetM: -3.02859 },
        ],
        stationStartM: 0,
        stationEndM: 134.001,
        alignmentId: "ALN-ACL",
      },
      buildConnector(),
    );
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.id)).toEqual(["GIRL-GIRDER-AG1", "GIRL-GIRDER-AG2"]);
    expect(lines[0].offsetM.value).toBe(1.47689);
    expect(lines[1].offsetM.value).toBe(-3.02859);
    expect(lines[0].points).toHaveLength(2);
    expect(lines[0].points[0].stationM).toBe(0);
    expect(lines[0].points[1].stationM).toBe(134.001);
    // endpoint at station 0, offset 1.47689 -> x=0, y=1.47689 (straight +x alignment)
    expect(lines[0].points[0].position.x).toBeCloseTo(0, 9);
    expect(lines[0].points[0].position.y).toBeCloseTo(1.47689, 9);
    expect(lines[0].points[1].position.x).toBeCloseTo(134.001, 9);
    expect(lines[1].points[0].position.y).toBeCloseTo(-3.02859, 9);
  });
});
