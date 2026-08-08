import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { LinearAlignment } from "../../liner/core/types";
import { DefaultGeometryEngine, computeFingerprint } from "./engine";
import type { GeometryEngineInput } from "./contracts";
import { RB001_GRID_PANEL_SPECS } from "./gridPoints";
import { RB001_DECK_SPEC } from "./deck";

const FIXTURE = resolve(
  process.cwd(),
  "../docs/apollo/step10/reference_bridge_001/phase5/fixtures/reference_bridge_001_common_model.json",
);

/** RB-001 ACL: straight "plane grid", bridge length 134.001 m (G-GEO-0001). */
const ALIGNMENT: LinearAlignment = {
  id: "ALN-ACL",
  linerModelId: "RB-S10-001",
  coordinatePolicyId: "global",
  elements: [
    { type: "straight", id: "L1", start: { x: 0, y: 0 }, azimuth: 0, length: 134.001 },
  ],
};

/**
 * Golden-derived placement inputs (Reference Bridge 001):
 * - spans 40.201 / 51.000 / 40.200 (G-GEO-0002..0004); bridge length 134.001 (G-GEO-0001)
 * - girder endpoint offsets from grid point Y (G-GEO-0010/0012/0014/0016):
 *   AG1 start 1.47689 / end 1.55372; AG2 start -3.02859 / end -2.94155
 */
function buildInput(overrides: Partial<GeometryEngineInput> = {}): GeometryEngineInput {
  return {
    sourceModelVersion: "1.0.0",
    bridgeId: "RB-S10-001",
    alignmentIds: ["ALN-ACL"],
    supports: [
      { id: "SUP-AR2", state: "CONFIRMED" },
      { id: "SUP-PR1", state: "CONFIRMED" },
      { id: "SUP-PR2", state: "CONFIRMED" },
      { id: "SUP-PU15", state: "CONFIRMED" },
    ],
    girders: [
      { id: "GIRDER-AG1", state: "CONFIRMED" },
      { id: "GIRDER-AG2", state: "CONFIRMED" },
    ],
    gridPointIds: ["GRID-1001", "GRID-1027", "GRID-2001", "GRID-2027"],
    deckIds: ["DECK-01"],
    sectionIds: ["SECTION-DECK"],
    spanLengthsM: [40.201, 51.0, 40.2],
    bridgeLengthM: 134.001,
    girderOffsetsM: {
      "GIRDER-AG1": 1.47689,
      "GIRDER-AG1:end": 1.55372,
      "GIRDER-AG2": -3.02859,
      "GIRDER-AG2:end": -2.94155,
    },
    unresolved: [],
    ...overrides,
  };
}

function buildEngine() {
  return new DefaultGeometryEngine({
    alignment: ALIGNMENT,
    stationDefinition: { originDisplayedStation: 0, interval: 10 },
    offsets: [0],
    z: 0,
    computedAt: "2026-01-01T00:00:00.000Z",
  });
}

describe("Reference Bridge 001 Golden parity (Phase 6-1E)", () => {
  it("places 4 support lines at golden span-derived stations", () => {
    const snap = buildEngine().generateSnapshot(buildInput());
    expect(snap.supportLines).toHaveLength(4);
    expect(snap.supportLines.map((l) => l.supportId)).toEqual([
      "SUP-AR2",
      "SUP-PR1",
      "SUP-PR2",
      "SUP-PU15",
    ]);
    // cumulative spans 40.201 / +51.000 / bridge length 134.001 (G-GEO-0002..0004)
    expect(snap.supportLines.map((l) => l.stationM.value)).toEqual([0, 40.201, 91.201, 134.001]);
  });

  it("places AG1/AG2 girder lines reproducing golden endpoint offsets", () => {
    const snap = buildEngine().generateSnapshot(buildInput());
    expect(snap.girderLines).toHaveLength(2);
    expect(snap.girderLines[0].girderId).toBe("GIRDER-AG1");
    expect(snap.girderLines[1].girderId).toBe("GIRDER-AG2");
    // AG1 start offset G-GEO-0010 (1.47689); AG2 start offset G-GEO-0014 (-3.02859)
    expect(snap.girderLines[0].offsetM.value).toBe(1.47689);
    expect(snap.girderLines[1].offsetM.value).toBe(-3.02859);
    // endpoint transverse positions reproduce golden grid-point Y values
    const ag1Start = snap.girderLines[0].points[0];
    const ag1End = snap.girderLines[0].points[1];
    const ag2Start = snap.girderLines[1].points[0];
    const ag2End = snap.girderLines[1].points[1];
    expect(ag1Start.position.y).toBeCloseTo(1.47689, 9); // G-GEO-0010
    expect(ag1End.position.y).toBeCloseTo(1.55372, 9); // G-GEO-0012
    expect(ag2Start.position.y).toBeCloseTo(-3.02859, 9); // G-GEO-0014
    expect(ag2End.position.y).toBeCloseTo(-2.94155, 9); // G-GEO-0016
  });

  it("assembles the 4 endpoint grid points matching the fixture id set and golden Y", () => {
    const snap = buildEngine().generateSnapshot(buildInput());
    expect(snap.gridPoints.map((g) => g.gridPointId)).toEqual([
      "GRID-1001",
      "GRID-1027",
      "GRID-2001",
      "GRID-2027",
    ]);
    expect(snap.gridPoints.map((g) => g.position!.y)).toEqual([
      1.47689, 1.55372, -3.02859, -2.94155,
    ]);
    expect(snap.gridPoints.map((g) => g.state)).toEqual(["CONFIRMED", "CONFIRMED", "CONFIRMED", "CONFIRMED"]);
  });

  it("builds orthogonal cross-section frames at the 4 support stations", () => {
    const snap = buildEngine().generateSnapshot(buildInput());
    expect(snap.crossSectionFrames).toHaveLength(4);
    expect(snap.crossSectionFrames.map((f) => f.stationM)).toEqual([0, 40.201, 91.201, 134.001]);
    for (const frame of snap.crossSectionFrames) {
      expect(frame.skewRad).toBe(0);
      expect(frame.localFrame.tangent.x).toBeCloseTo(1, 9);
      expect(frame.localFrame.normal.y).toBeCloseTo(1, 9);
    }
  });

  it("produces a deterministic fingerprint (same input -> same fingerprint)", () => {
    const a = buildEngine().generateSnapshot(buildInput());
    const b = buildEngine().generateSnapshot(buildInput());
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(computeFingerprint(a)).toBe(a.fingerprint);
    const c = buildEngine().generateSnapshot(
      buildInput({ girderOffsetsM: { "GIRDER-AG2": -3.0, "GIRDER-AG2:end": -3.0 } }),
    );
    expect(c.fingerprint).not.toBe(a.fingerprint);
  });

  it("snapshot is immutable, versioned and carries traceability to the mapping", () => {
    const snap = buildEngine().generateSnapshot(buildInput());
    Object.freeze(snap);
    expect(Object.isFrozen(snap)).toBe(true);
    expect(snap.snapshotVersion).toBe("6.1.0");
    expect(snap.sourceModelVersion).toBe("1.0.0");
    const mappingIds = new Set(snap.traceability.map((t) => t.mappingId));
    for (const id of ["GM-001", "GM-002", "GM-006", "GM-008", "GM-014"]) {
      expect(mappingIds.has(id)).toBe(true);
    }
  });

  it("entity id set matches the frozen Common Model fixture", () => {
    const fixture = JSON.parse(readFileSync(FIXTURE, "utf-8")) as {
      alignments: { alignments: { id: string }[] };
      bridgeGeometry: {
        supports: { id: string }[];
        girders: { id: string }[];
        gridPoints: { id: string }[];
        deck: { id: string }[];
      };
    };
    const snap = buildEngine().generateSnapshot(buildInput());
    expect(snap.alignmentReferences.map((a) => a.alignmentId)).toEqual(
      fixture.alignments.alignments.map((a) => a.id),
    );
    expect(snap.supportLines.map((l) => l.supportId)).toEqual(
      fixture.bridgeGeometry.supports.map((s) => s.id),
    );
    expect(snap.girderLines.map((l) => l.girderId)).toEqual(
      fixture.bridgeGeometry.girders.map((g) => g.id),
    );
    expect(snap.gridPoints.map((g) => g.gridPointId)).toEqual(
      fixture.bridgeGeometry.gridPoints.map((g) => g.id),
    );
    expect(snap.deckReferences.map((d) => d.deckId)).toEqual(
      fixture.bridgeGeometry.deck.map((d) => d.id),
    );
  });

  it("generates the full RB-001 panel structure with HOLD intermediates (Phase 6-2)", () => {
    const input = buildInput({ gridPanelSpecs: RB001_GRID_PANEL_SPECS });
    const snap = buildEngine().generateSnapshot(input);
    expect(snap.gridPoints).toHaveLength(54); // 2 girder lines x 27 panel points
    const ag1 = snap.gridPoints.filter((g) => g.girderId === "GIRDER-AG1");
    expect(ag1).toHaveLength(27);
    expect(ag1[0].gridPointId).toBe("GRID-1001");
    expect(ag1[26].gridPointId).toBe("GRID-1027");
    // endpoints CONFIRMED with plane-grid-transformed stations
    expect(ag1[0].state).toBe("CONFIRMED");
    expect(ag1[0].stationM).toBeCloseTo(2.45821, 5);
    expect(ag1[26].stationM).toBeCloseTo(134.001, 5);
    // intermediates HOLD, no position
    expect(ag1[1].gridPointId).toBe("GRID-1002");
    expect(ag1[1].role).toBe("intermediate");
    expect(ag1[1].state).toBe("HOLD_INSUFFICIENT_SOURCE");
    expect(ag1[1].position).toBeUndefined();
    expect(ag1[25].gridPointId).toBe("GRID-1026");
    const ag2 = snap.gridPoints.filter((g) => g.girderId === "GIRDER-AG2");
    expect(ag2[0].gridPointId).toBe("GRID-2001");
    expect(ag2[26].gridPointId).toBe("GRID-2027");
    expect(ag2[1].state).toBe("HOLD_INSUFFICIENT_SOURCE");
    // fingerprint differs when panel structure changes (HOLD states counted)
    const plain = buildEngine().generateSnapshot(buildInput());
    expect(snap.fingerprint).not.toBe(plain.fingerprint);
    const again = buildEngine().generateSnapshot(input);
    expect(snap.fingerprint).toBe(again.fingerprint);
  });

  it("populates deck reference from golden dimensions when deckSpecs provided", () => {
    const snap = buildEngine().generateSnapshot(buildInput({ deckSpecs: [RB001_DECK_SPEC] }));
    expect(snap.deckReferences).toHaveLength(1);
    const deck = snap.deckReferences[0];
    expect(deck.widthM.value).toBeCloseTo(8.01, 9); // G-GEO-0017
    expect(deck.thicknessM.value).toBeCloseTo(0.23, 9); // G-GEO-0018
    expect(deck.boundary).toHaveLength(4);
    expect(deck.boundary![2].x).toBeCloseTo(134.001, 9);
    expect(deck.boundary![2].y).toBeCloseTo(4.005, 9);
  });
});
