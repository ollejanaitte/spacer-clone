import { describe, expect, it } from "vitest";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { buildLinerIntermediateFromRoad, generateSuperstructureSnapshot } from "../superstructureGeometry";
import { buildSuperstructureDocument, attachSuperstructureHandoffs } from "../superstructureDocumentDomain";
import {
  buildSuperstructureAnalysisInput,
  reactionsFromResult,
  applySuperstructureAnalysisResult,
  comboOneTotal,
  LC_DECK,
  LC_STRUCTURAL,
  type SuperstructureAnalysisInput,
} from "../superstructureAnalysisAdapter";
import type { BridgeLayoutReference, RoadReference, SuperstructureDocument } from "../superstructureTypes";
import type { LinearAlignment } from "../../../../liner/core/types";
import type { VerticalElement } from "../../../../liner/core/geometry/vertical";

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

function makeDocumentAndSnapshot(): { doc: SuperstructureDocument; snapshot: import("../../../../apollo/geometry/types").GeometrySnapshot } {
  const road = straightRoad();
  const intermediate = buildLinerIntermediateFromRoad({ horizontal: road.horizontal, vertical: road.vertical, crossSections: [] });
  if (!intermediate) throw new Error("no intermediate");
  const built = buildSuperstructureDocument({
    projectId: "PROJ-1",
    bridgeLayoutReference: { bridgeId: "BR-RB", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp-rb" } as BridgeLayoutReference,
    roadReference: { moduleId: "road", alignmentId: "RB-STRAIGHT", stationReferenceId: null, coordinatePolicyId: null } as RoadReference,
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

describe("Superstructure analysis adapter (WP-F)", () => {
  it("builds a grillage input with dead-load cases and nodal loads", () => {
    const { doc, snapshot } = makeDocumentAndSnapshot();
    const input: SuperstructureAnalysisInput = buildSuperstructureAnalysisInput(doc, snapshot);
    expect(input.bridgeId).toBe("BR-RB");
    expect(input.loadCases.map((c) => c.id).sort()).toEqual([LC_DECK, LC_STRUCTURAL].sort());
    expect(input.nodalLoads.length).toBeGreaterThan(0);
    // 2 girders x 3 supports = 6 nodes per load case
    expect(input.nodalLoads.filter((n) => n.loadCaseId === LC_STRUCTURAL)).toHaveLength(6);
    expect(input.nodalLoads.filter((n) => n.loadCaseId === LC_DECK)).toHaveLength(6);
    // gravity downward (-z)
    expect(input.nodalLoads.every((n) => n.fz < 0)).toBe(true);
    expect(input.authorization).toBe("NOT_GRANTED");
  });

  it("maps backend reactions to per-seat snapshots", () => {
    const result = {
      authorization: "NOT_GRANTED",
      reactions: [
        { loadCaseId: LC_STRUCTURAL, nodeId: "N-A1-G1", rz: 123.5 },
        { loadCaseId: LC_STRUCTURAL, nodeId: "N-P1-G2", rz: 456.7 },
      ],
    };
    const reactions = reactionsFromResult(result, ["G1", "G2"]);
    expect(reactions).toHaveLength(2);
    expect(reactions[0]).toMatchObject({ seatId: "BRG-A1-G1", Fz: 123.5 });
    expect(reactions[1]).toMatchObject({ seatId: "BRG-P1-G2", Fz: 456.7 });
  });

  it("applies gated results: analysis + reactions stay NOT_AUTHORIZED", () => {
    const { doc, snapshot } = makeDocumentAndSnapshot();
    const result = {
      authorization: "NOT_GRANTED",
      numericDesignAuthorization: "NOT_GRANTED",
      reactions: [
        { loadCaseId: LC_STRUCTURAL, nodeId: "N-A1-G1", rz: 100 },
        { loadCaseId: LC_STRUCTURAL, nodeId: "N-A2-G2", rz: 200 },
      ],
    };
    const updated = applySuperstructureAnalysisResult(doc, result);
    expect(updated.analysisModel.analysisStatus).toBe("NOT_AUTHORIZED");
    expect(updated.analysisModel.authorization.numericDesignAuthorization).toBe("NOT_GRANTED");
    expect(updated.reactionResults.reactionStatus).toBe("NOT_AUTHORIZED");
    expect(updated.reactionResults.reactionCases).toHaveLength(2);
    expect(updated.reactionResults.reactionCases[0].caseId).toBe("RC-DL-STRUCTURAL-BRG-A1-G1");
  });

  it("does not promote authorized-looking results (fail-closed)", () => {
    const { doc, snapshot } = makeDocumentAndSnapshot();
    const result = { authorization: "GRANTED", numericDesignAuthorization: "GRANTED", reactions: [] };
    const updated = applySuperstructureAnalysisResult(doc, result);
    // Not a recognized gate -> document unchanged (no promotion)
    expect(updated.analysisModel.analysisStatus).toBe(doc.analysisModel.analysisStatus);
  });

  it("combo total is computable from the document", () => {
    const { doc } = makeDocumentAndSnapshot();
    const total = comboOneTotal(doc);
    expect(total).toBeGreaterThan(0);
  });
});
