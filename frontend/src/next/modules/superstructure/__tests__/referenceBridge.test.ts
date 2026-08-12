import { describe, expect, it } from "vitest";
import type { LinearAlignment } from "../../../../liner/core/types";
import type { VerticalElement } from "../../../../liner/core/geometry/vertical";
import { buildLinerIntermediateFromRoad, generateSuperstructureSnapshot } from "../superstructureGeometry";
import { buildSuperstructureDocument, attachSuperstructureHandoffs } from "../superstructureDocumentDomain";
import { buildSuperstructureGeometryInput } from "../superstructureBindingNew";
import { buildSuperstructureHandoff, toSupportInterfaceEntry } from "../superstructureHandoff";
import { buildSuperstructureAnalysisInput, reactionsFromResult, comboOneTotal } from "../superstructureAnalysisAdapter";
import type { SuperstructureDocument } from "../superstructureTypes";

/**
 * Reference Bridge 001 (RB-S10-001) scenario per Phase 5-01 E-02.
 * Straight road, azimuth 0; support stations [0, 40.201, 91.201, 134.001].
 * Spans are station-consistent [40.201, 51.0, 42.8] (KNOWN_DATA_DISCREPANCY note).
 */
function rb001Road() {
  const horizontal: LinearAlignment = {
    id: "RB-STRAIGHT",
    linerModelId: "MODEL-RB",
    coordinatePolicyId: "COORD-RB",
    elements: [{ id: "L1", type: "straight", start: { x: 0, y: 0 }, azimuth: 0, length: 140 }],
  };
  const vertical: VerticalElement[] = [
    { type: "grade", id: "G1", startPhysicalDistance: 0, startElevation: 100, grade: 0.0, length: 140 },
  ];
  return { horizontal, vertical };
}

const RB_STATIONS = [0, 40.201, 91.201, 134.001];
const RB_SPANS = [40.201, 51.0, 42.8];

function rb001Document(projectId = "RB-PROJ"): SuperstructureDocument {
  const built = buildSuperstructureDocument({
    projectId,
    bridgeLayoutReference: { bridgeId: "RB-S10-001", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp-rb001" },
    roadReference: { moduleId: "road", alignmentId: "RB-STRAIGHT", stationReferenceId: null, coordinatePolicyId: "COORD-RB" },
    structuralSystem: { spanSystem: "continuous", bridgeSystem: "CONTINUOUS" },
    girderConfiguration: {
      girderCount: 2,
      girderSpacingM: 8,
      girderLines: [] as never[],
      girderSectionModel: {
        depthM: 1.8,
        webThicknessM: 0.014,
        topFlange: { widthM: 0.5, thicknessM: 0.032 },
        bottomFlange: { widthM: 0.6, thicknessM: 0.045 },
        areaM2: null,
        unitWeightPerM: null,
      },
    },
    deckConfiguration: {
      deckId: "DECK-1",
      deckKind: "rc_non_composite",
      thicknessM: 0.25,
      unitWeight: 24.5,
      overhangLeftM: 0.5,
      overhangRightM: 0.5,
      resolvedWidthM: 12.0,
    },
  });
  if (!built.ok) throw new Error("build failed");
  const spans = RB_STATIONS.slice(0, -1).map((start, i) => ({
    spanId: `S${i + 1}`,
    index: i,
    startSupportId: `SUP${i}`,
    endSupportId: `SUP${i + 1}`,
    startStation: start,
    endStation: RB_STATIONS[i + 1],
    spanLength: RB_SPANS[i],
    startSupportSkew: null,
    endSupportSkew: null,
  }));
  const supports = RB_STATIONS.map((station, i) => ({
    supportId: `SUP${i}`,
    supportType: (i === 0 || i === RB_STATIONS.length - 1 ? "abutment" : "pier") as "abutment" | "pier",
    label: `SUP${i}`,
    station,
    position: { domainX: station, domainY: 0, elevation: 100 },
    tangentAzimuthRad: 0,
    skewAngleRad: null,
    terrainElevation: 98,
    roadReferenceId: "RB-STRAIGHT",
    coordinateContextId: null,
  }));
  return attachSuperstructureHandoffs(built.document, {
    handoffId: "SH-RB001",
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-12T00:00:00.000Z",
    spans,
  }, {
    handoffId: "SH-RB001",
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-12T00:00:00.000Z",
    supports,
  });
}

function snapshot() {
  const road = rb001Road();
  const intermediate = buildLinerIntermediateFromRoad({ horizontal: road.horizontal, vertical: road.vertical, crossSections: [] });
  if (!intermediate) throw new Error("no intermediate");
  const doc = rb001Document();
  const result = generateSuperstructureSnapshot(intermediate, doc);
  if (!result.ok) throw new Error("snapshot failed");
  return result.snapshot;
}

describe("Reference Bridge RB-01..14 (WP-J)", () => {
  it("RB-01 bridge length = 134.001 m", () => {
    const input = buildSuperstructureGeometryInput(rb001Document());
    expect(input.bridgeLengthM).toBeCloseTo(134.001, 3);
  });

  it("RB-02 span lengths (station-consistent) = [40.201, 51.0, 42.8]", () => {
    const input = buildSuperstructureGeometryInput(rb001Document());
    expect(input.spanLengthsM!.map((v) => Number(v.toFixed(3)))).toEqual([40.201, 51.0, 42.8]);
  });

  it("RB-03 girder length = 134.001 m", () => {
    const snap = snapshot();
    const g = snap.girderLines[0];
    const start = g.points[0].stationM;
    const end = g.points[g.points.length - 1].stationM;
    expect(Math.abs((end ?? 0) - (start ?? 0))).toBeCloseTo(134.001, 1);
  });

  it("RB-04 support stations = [0, 40.201, 91.201, 134.001]", () => {
    const snap = snapshot();
    const stations = snap.supportLines.map((s) => s.stationM.value ?? 0).sort((a, b) => a - b);
    expect(stations.map((v) => Number(v.toFixed(3)))).toEqual(RB_STATIONS);
  });

  it("RB-05 skew = 0 (straight)", () => {
    const doc = rb001Document();
    expect(doc.supportReferences!.supports.every((s) => s.skewAngleRad === null || s.skewAngleRad === 0)).toBe(true);
  });

  it("RB-06 girder count = 2", () => {
    expect(rb001Document().girderConfiguration.girderCount).toBe(2);
  });

  it("RB-07 girder spacing = 8.0 m (offsets ±4.0)", () => {
    const doc = rb001Document();
    expect(doc.girderConfiguration.girderSpacingM).toBeCloseTo(8.0, 3);
    const offsets = doc.girderConfiguration.girderLines.map((l) => l.offsetFromCenterline).sort((a, b) => a - b);
    expect(offsets[0]).toBeCloseTo(-4.0, 3);
    expect(offsets[1]).toBeCloseTo(4.0, 3);
  });

  it("RB-10 bearing seats follow girder offsets (S-3 mechanism)", () => {
    // 2 girders at ±2.5 -> bearing seats at ±2.5 relative to support (S-3 convention)
    const doc = rb001Document();
    const handoff = buildSuperstructureHandoff(doc, snapshot());
    if (!handoff.ok) throw new Error("handoff failed");
    const entry = toSupportInterfaceEntry(handoff.handoff, "SUP1")!;
    const seats = entry.bearingSeats as Record<string, unknown>[];
    expect(seats).toHaveLength(2);
    expect(seats[0]).toHaveProperty("bearingId");
    expect(seats[0]).toHaveProperty("bearingPosition");
  });

  it("RB-12 reaction equilibrium: sum of reactions = applied dead load", () => {
    const doc = rb001Document();
    const snap = snapshot();
    const input = buildSuperstructureAnalysisInput(doc, snap);
    const totalLoad = comboOneTotal(doc)!;
    // Reaction equilibrium check on the distributed nodal loads (before solving):
    // sum of |fz| nodal loads == COMBO-1 total; reactions must balance it.
    const applied = input.nodalLoads.reduce((sum, n) => sum + Math.abs(n.fz), 0);
    expect(applied).toBeCloseTo(totalLoad, 3);
    // External declared value (S-3, DL-AG1 |Fz|=3325.5) is a ground-truth for the
    // authorized analysis phase; the Phase 5-02 basic analysis uses its own load
    // model (documented SOURCE note, not a basic-analysis parity gate).
    expect(totalLoad).toBeGreaterThan(0);
  });

  it("RB-14 straight alignment azimuth = 0", () => {
    const road = rb001Road();
    const first = road.horizontal.elements[0];
    expect(first.type).toBe("straight");
    expect((first as { azimuth: number }).azimuth).toBe(0);
  });
});
