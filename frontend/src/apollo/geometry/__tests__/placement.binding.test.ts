import { describe, expect, it } from "vitest";
import type { LinearAlignment } from "../../../liner/core/types";
import { LinerAlignmentConnector } from "../alignmentConnector";
import { DefaultGeometryEngine } from "../engine";
import { placeSupportLines } from "../placement";
import type { GeometryEngineInput } from "../contracts";

/** A 500 m straight alignment (simplified mountain-viaduct-500 style). */
const ALIGNMENT: LinearAlignment = {
  id: "ALN-MTN",
  linerModelId: "mountain-viaduct-500",
  coordinatePolicyId: "global",
  elements: [
    { type: "straight", id: "L1", start: { x: 0, y: 0 }, azimuth: 0, length: 500 },
  ],
};

function buildEngine(): DefaultGeometryEngine {
  return new DefaultGeometryEngine({
    alignment: ALIGNMENT,
    stationDefinition: { originDisplayedStation: 0, interval: 10 },
    offsets: [0],
    z: 0,
    computedAt: "2026-01-01T00:00:00.000Z",
  });
}

const BOUND_STATIONS = [50, 100, 150, 200, 250, 300, 350, 400, 450];
const BOUND_SKEW = Math.PI / 2;

function boundInput(overrides: Partial<GeometryEngineInput> = {}): GeometryEngineInput {
  return {
    sourceModelVersion: "1.0.0",
    bridgeId: "bridge-mtn",
    alignmentIds: ["ALN-MTN"],
    supports: BOUND_STATIONS.map((station, i) => ({
      id: i === 0 ? "A1" : i === BOUND_STATIONS.length - 1 ? "A2" : `P${i}`,
      stationM: station,
      skewRad: BOUND_SKEW,
      state: "CONFIRMED",
    })),
    girders: [
      { id: "GIRDER-1", offsetM: -4, state: "CONFIRMED" },
      { id: "GIRDER-2", offsetM: 4, state: "CONFIRMED" },
    ],
    gridPointIds: [],
    deckIds: [],
    sectionIds: ["SECTION-DECK"],
    spanLengthsM: [50, 50, 50, 50, 50, 50, 50, 50],
    bridgeLengthM: 400,
    girderOffsetsM: { "GIRDER-1": -4, "GIRDER-2": 4 },
    deckSpecs: [{ deckId: "DECK-01", widthM: 12, thicknessM: 0.23 }],
    unresolved: [],
    ...overrides,
  };
}

describe("BridgeProject-bound support placement (Phase 3-3)", () => {
  it("places support lines at the declared global alignment stations", () => {
    const engine = buildEngine();
    const snapshot = engine.generateSnapshot(boundInput());
    const stations = snapshot.supportLines.map((line) => line.stationM.value);
    expect(stations).toEqual(BOUND_STATIONS);
    expect(snapshot.supportLines[0]!.supportId).toBe("A1");
    expect(snapshot.supportLines[8]!.supportId).toBe("A2");
  });

  it("samples support XYZ on the real alignment at the global stations", () => {
    const engine = buildEngine();
    const snapshot = engine.generateSnapshot(boundInput());
    // A1 at global station 50 along +x: x=50, y=0
    const a1 = snapshot.supportLines[0]!;
    expect(a1.elevationM.value).toBe(0);
    // P4 at global station 250 -> x=250
    const p4 = snapshot.supportLines[4]!;
    expect(p4.stationM.value).toBe(250);
  });

  it("applies per-support skew from the bound input", () => {
    const engine = buildEngine();
    const snapshot = engine.generateSnapshot(boundInput());
    for (const line of snapshot.supportLines) {
      expect(line.skewRad.value).toBeCloseTo(Math.PI / 2, 9);
    }
  });

  it("samples girder lines and the deck across the bridge extent", () => {
    const engine = buildEngine();
    const snapshot = engine.generateSnapshot(boundInput());
    expect(snapshot.girderLines[0]!.stationStartM).toBe(50);
    expect(snapshot.girderLines[0]!.stationEndM).toBe(450);
    expect(snapshot.girderLines[0]!.points[0].stationM).toBe(50);
    expect(snapshot.deckReferences[0]!.widthM.value).toBe(12);
  });

  it("fails closed when only some supports declare stations", () => {
    const input = boundInput({
      supports: [
        { id: "A1", stationM: 50, state: "CONFIRMED" },
        { id: "P1", state: "CONFIRMED" },
        { id: "A2", stationM: 450, state: "CONFIRMED" },
      ],
    });
    const engine = buildEngine();
    expect(() => engine.generateSnapshot(input)).toThrow(/mixed station presence/);
  });

  it("fails closed on non-ascending explicit stations", () => {
    const input = boundInput({
      supports: [
        { id: "A1", stationM: 100, state: "CONFIRMED" },
        { id: "P1", stationM: 50, state: "CONFIRMED" },
        { id: "A2", stationM: 450, state: "CONFIRMED" },
      ],
    });
    const engine = buildEngine();
    expect(() => engine.generateSnapshot(input)).toThrow(/ascending/);
  });

  it("fails closed when bridgeLength disagrees with the support span", () => {
    const input = boundInput({ bridgeLengthM: 500 });
    const engine = buildEngine();
    expect(() => engine.generateSnapshot(input)).toThrow(/does not match support span/);
  });

  it("fails closed when span sum disagrees with the support span", () => {
    const input = boundInput({ spanLengthsM: [60, 50, 50, 50, 50, 50, 50, 50] });
    const engine = buildEngine();
    expect(() => engine.generateSnapshot(input)).toThrow(/span length sum/);
  });

  it("keeps legacy span-sum behavior when no stations are declared", () => {
    const legacy: GeometryEngineInput = {
      ...boundInput({ spanLengthsM: [40.201, 51.0, 40.2], bridgeLengthM: 134.001 }),
      supports: [
        { id: "SUP-AR2", state: "CONFIRMED" },
        { id: "SUP-PR1", state: "CONFIRMED" },
        { id: "SUP-PR2", state: "CONFIRMED" },
        { id: "SUP-PU15", state: "CONFIRMED" },
      ],
      bridgeId: "RB-S10-001",
      alignmentIds: ["ALN-MTN"],
    };
    const engine = buildEngine();
    const snapshot = engine.generateSnapshot(legacy);
    expect(snapshot.supportLines.map((line) => line.stationM.value)).toEqual([
      0, 40.201, 91.201, 134.001,
    ]);
  });

  it("placeSupportLines validates explicit station count and order", () => {
    const connector = new LinerAlignmentConnector({ alignment: ALIGNMENT, stationDefinition: { originDisplayedStation: 0, interval: 10 }, offsets: [0], z: 0, computedAt: "2026-01-01T00:00:00.000Z" });
    expect(() =>
      placeSupportLines(
        {
          supports: [
            { id: "A1", role: "abutment" },
            { id: "A2", role: "abutment" },
          ],
          spanLengthsM: [400],
          bridgeLengthM: 400,
          girderIds: [],
          alignmentId: "ALN-MTN",
          supportStationsM: [50],
        },
        connector,
        {},
      ),
    ).toThrow(/length/);
  });
});
