import { describe, expect, it } from "vitest";
import type { LinearAlignment } from "../../../../liner/core/types";
import type { VerticalElement } from "../../../../liner/core/geometry/vertical";
import { buildLinerIntermediateFromRoad, generateSuperstructureSnapshot } from "../superstructureGeometry";
import { buildSuperstructureDocument, attachSuperstructureHandoffs } from "../superstructureDocumentDomain";
import { applySuperstructureAnalysisResult } from "../superstructureAnalysisAdapter";
import {
  buildSuperstructureHandoff,
  toSupportInterfaceEntry,
} from "../superstructureHandoff";
import type { BridgeLayoutReference, RoadReference, SuperstructureDocument } from "../superstructureTypes";

function straightRoad() {
  const horizontal: LinearAlignment = {
    id: "RB-STRAIGHT",
    linerModelId: "MODEL-RB",
    coordinatePolicyId: "COORD-RB",
    elements: [{ id: "L1", type: "straight", start: { x: 0, y: 0 }, azimuth: 0, length: 600 }],
  };
  const vertical: VerticalElement[] = [
    { type: "grade", id: "G1", startPhysicalDistance: 0, startElevation: 100, grade: 0.0, length: 600 },
  ];
  return { horizontal, vertical };
}

function makeDocAndSnapshot() {
  const road = straightRoad();
  const intermediate = buildLinerIntermediateFromRoad({ horizontal: road.horizontal, vertical: road.vertical, crossSections: [] });
  if (!intermediate) throw new Error("no intermediate");
  const built = buildSuperstructureDocument({
    projectId: "PROJ-1",
    bridgeLayoutReference: { bridgeId: "BR-RB", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp-rb" } as BridgeLayoutReference,
    roadReference: { moduleId: "road", alignmentId: "RB-STRAIGHT", stationReferenceId: null, coordinatePolicyId: "COORD-RB" } as RoadReference,
    structuralSystem: { spanSystem: "continuous", bridgeSystem: "CONTINUOUS" },
    girderConfiguration: {
      girderCount: 2,
      girderSpacingM: 8,
      girderLines: [] as never[],
      girderSectionModel: {
        depthM: 2.0,
        webThicknessM: 0.012,
        topFlange: { widthM: 0.5, thicknessM: 0.03 },
        bottomFlange: { widthM: 0.6, thicknessM: 0.04 },
        areaM2: null,
        unitWeightPerM: null,
      },
    },
    deckConfiguration: {
      deckId: "DECK-1",
      deckKind: "rc_non_composite",
      thicknessM: 0.24,
      unitWeight: 24.5,
      overhangLeftM: 0.5,
      overhangRightM: 0.5,
      resolvedWidthM: 12.0,
    },
  });
  if (!built.ok) throw new Error("build failed");
  const doc = attachSuperstructureHandoffs(built.document, {
    handoffId: "SH-1",
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-12T00:00:00.000Z",
    spans: [
      { spanId: "S1", index: 0, startSupportId: "A1", endSupportId: "P1", startStation: 100, endStation: 300, spanLength: 200, startSupportSkew: null, endSupportSkew: null },
      { spanId: "S2", index: 1, startSupportId: "P1", endSupportId: "A2", startStation: 300, endStation: 500, spanLength: 200, startSupportSkew: null, endSupportSkew: null },
    ],
  }, {
    handoffId: "SH-2",
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-12T00:00:00.000Z",
    supports: [
      { supportId: "A1", supportType: "abutment", label: "A1", station: 100, position: { domainX: 100, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 95, roadReferenceId: "r", coordinateContextId: null },
      { supportId: "P1", supportType: "pier", label: "P1", station: 300, position: { domainX: 300, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 92, roadReferenceId: "r", coordinateContextId: null },
      { supportId: "A2", supportType: "abutment", label: "A2", station: 500, position: { domainX: 500, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 96, roadReferenceId: "r", coordinateContextId: null },
    ],
  });
  const result = generateSuperstructureSnapshot(intermediate, doc);
  if (!result.ok) throw new Error("snapshot failed");
  return { doc, snapshot: result.snapshot };
}

describe("Superstructure handoff (WP-H)", () => {
  it("builds a v1.0.0 handoff with all supports and per-seat bearing data", () => {
    const { doc, snapshot } = makeDocAndSnapshot();
    const result = buildSuperstructureHandoff(doc, snapshot);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const handoff = result.handoff;
    expect(handoff.handoffKind).toBe("superstructure-handoff");
    expect(handoff.schemaVersion).toBe("1.0.0");
    expect(handoff.handoffId).toBe("SH-BR-RB");
    expect(handoff.bridgeId).toBe("BR-RB");
    expect(handoff.documentReference).toBe(doc.documentId);
    expect(handoff.supports).toHaveLength(3);
    expect(handoff.supports.map((s) => s.supportId).sort()).toEqual(["A1", "A2", "P1"]);
    // bearing seats: 2 girders per support
    for (const s of handoff.supports) {
      expect(s.bearingSeats).toHaveLength(2);
      expect(s.bearingSeats.map((b) => b.seatId)).toContain(`BRG-${s.supportId}-G1`);
    }
    // coordinate context convention
    expect(handoff.coordinateContext.signConvention.skew).toBe("counterclockwise-positive");
    expect(handoff.coordinateContext.positionConvention).toBe("project-global-XYZ");
    // envelope finite
    expect(handoff.superstructureEnvelope.maxX).toBeGreaterThan(handoff.superstructureEnvelope.minX);
    // self weight from dead loads (girder derived)
    expect(handoff.selfWeight.structuralGirderKN).toBeGreaterThan(0);
    expect(handoff.validation.ok).toBe(true);
  });

  it("fails closed without Bridge Layout / supports", () => {
    const { doc, snapshot } = makeDocAndSnapshot();
    const bad = { ...doc, supportReferences: null };
    const result = buildSuperstructureHandoff(bad, snapshot);
    expect(result.ok).toBe(false);
  });

  it("carries gated reactions as input data (NOT_AUTHORIZED)", () => {
    const { doc, snapshot } = makeDocAndSnapshot();
    const withReactions = applySuperstructureAnalysisResult(doc, {
      authorization: "NOT_GRANTED",
      numericDesignAuthorization: "NOT_GRANTED",
      reactions: [
        { loadCaseId: "DL-STRUCTURAL", nodeId: "N-A1-G1", rz: 150 },
        { loadCaseId: "DL-STRUCTURAL", nodeId: "N-A1-G2", rz: 150 },
      ],
    });
    const result = buildSuperstructureHandoff(withReactions, snapshot);
    if (!result.ok) throw new Error("handoff failed");
    const a1 = result.handoff.supports.find((s) => s.supportId === "A1")!;
    expect(a1.reactionCases.find((r) => r.seatId === "BRG-A1-G1")?.Fz).toBe(150);
    expect(a1.reactionCases.find((r) => r.seatId === "BRG-A1-G1")?.caseId).toBe("RC-DL-STRUCTURAL-BRG-A1-G1");
  });

  it("converts to a v0.1.0 support-interface entry (Phase 6 compatibility)", () => {
    const { doc, snapshot } = makeDocAndSnapshot();
    const result = buildSuperstructureHandoff(doc, snapshot);
    if (!result.ok) throw new Error("handoff failed");
    const entry = toSupportInterfaceEntry(result.handoff, "P1");
    expect(entry).not.toBeNull();
    expect(entry!.schemaVersion).toBe("0.1.0");
    expect(entry!.supportId).toBe("P1");
    expect(entry!.supportType).toBe("pier");
    expect(entry!.coordinateSystem).toBe("x-longitudinal-y-transverse-z-up");
    const seats = entry!.bearingSeats as Record<string, unknown>[];
    expect(seats).toHaveLength(2);
    expect(seats[0]).toHaveProperty("bearingId");
    expect(seats[0]).toHaveProperty("bearingPosition");
    expect(entry!.reactionCases).toBeDefined();
    const metadata = entry!.metadata as Record<string, unknown>;
    expect(metadata.sourceDocumentReference).toBe(doc.documentId);
    // null for unknown support
    expect(toSupportInterfaceEntry(result.handoff, "A2")).not.toBeNull();
  });
});
