import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { writeRoadInputs, readRoadInputs } from "../../roadModuleAdapter";
import type { LinearAlignment } from "../../../../liner/core/types";
import type { VerticalElement } from "../../../../liner/core/geometry/vertical";
import type { BridgeLayoutReference, RoadReference, SuperstructureDocument } from "../superstructureTypes";
import { buildSuperstructureDocument, attachSuperstructureHandoffs } from "../superstructureDocumentDomain";
import {
  buildLinerIntermediateFromRoad,
  generateSuperstructureSnapshot,
  withGeometryReference,
  toVerticalElementDraft,
} from "../superstructureGeometry";

/** RB001-style straight flat road (C0-continuous, LINER-valid). */
function straightRoad() {
  const horizontal: LinearAlignment = {
    id: "RB-STRAIGHT",
    linerModelId: "MODEL-RB",
    coordinatePolicyId: "COORD-RB",
    elements: [
      { id: "L1", type: "straight", start: { x: 0, y: 0 }, azimuth: 0, length: 600 },
    ],
  };
  const vertical: VerticalElement[] = [
    { type: "grade", id: "G1", startPhysicalDistance: 0, startElevation: 100, grade: 0.0, length: 600 },
  ];
  return { horizontal, vertical };
}

function bridgeRef(): BridgeLayoutReference {
  return { bridgeId: "BR-RB", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp-rb" };
}

function roadRef(): RoadReference {
  return { moduleId: "road", alignmentId: "RB-STRAIGHT", stationReferenceId: null, coordinatePolicyId: null };
}

function makeDocument(projectId: string): SuperstructureDocument {
  const built = buildSuperstructureDocument({
    projectId,
    bridgeLayoutReference: bridgeRef(),
    roadReference: roadRef(),
    structuralSystem: { spanSystem: "continuous", bridgeSystem: "CONTINUOUS" },
    girderConfiguration: {
      girderCount: 2,
      girderSpacingM: 8,
      girderLines: [] as never[],
      girderSectionModel: { depthM: null, webThicknessM: null, topFlange: null, bottomFlange: null, areaM2: null, unitWeightPerM: null },
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
  return attachSuperstructureHandoffs(
    built.document,
    {
      handoffId: "SH-1",
      schemaVersion: "1.0.0",
      generatedAt: "2026-08-12T00:00:00.000Z",
      spans: [
        { spanId: "S1", index: 0, startSupportId: "A1", endSupportId: "P1", startStation: 100, endStation: 300, spanLength: 200, startSupportSkew: null, endSupportSkew: null },
        { spanId: "S2", index: 1, startSupportId: "P1", endSupportId: "A2", startStation: 300, endStation: 500, spanLength: 200, startSupportSkew: null, endSupportSkew: null },
      ],
    },
    {
      handoffId: "SH-2",
      schemaVersion: "1.0.0",
      generatedAt: "2026-08-12T00:00:00.000Z",
      supports: [
        { supportId: "A1", supportType: "abutment", label: "A1", station: 100, position: { domainX: 100, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 95, roadReferenceId: "r", coordinateContextId: null },
        { supportId: "P1", supportType: "pier", label: "P1", station: 300, position: { domainX: 300, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 92, roadReferenceId: "r", coordinateContextId: null },
        { supportId: "A2", supportType: "abutment", label: "A2", station: 500, position: { domainX: 500, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 96, roadReferenceId: "r", coordinateContextId: null },
      ],
    },
  );
}

describe("Superstructure geometry (WP-C1)", () => {
  it("maps a LINER core vertical element to the draft shape", () => {
    const draft = toVerticalElementDraft({ type: "grade", id: "G1", startPhysicalDistance: 0, startElevation: 100, grade: 0.0, length: 600 });
    expect(draft).toEqual({ type: "grade", id: "G1", startStation: 0, endStation: 600, startElevation: 100, grade: 0.0, length: 600 });
  });

  it("builds a LINER intermediate from Road Module inputs", () => {
    const road = straightRoad();
    const intermediate = buildLinerIntermediateFromRoad({ horizontal: road.horizontal, vertical: road.vertical, crossSections: [] });
    expect(intermediate).toBeDefined();
    expect(intermediate!.verticalAlignment?.elements).toHaveLength(1);
  });

  it("returns undefined when road is absent (fail-closed)", () => {
    expect(buildLinerIntermediateFromRoad({})).toBeUndefined();
  });

  it("generates a deterministic GeometrySnapshot through the frozen engine", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("WP-C1"), {
      businessNumber: "WP-C1-1",
      designStage: "bridge-detailed",
    }));
    const projectId = manager.listProjects()[0].projectId;
    const road = straightRoad();
    const roadOk = writeRoadInputs(manager, projectId, {
      label: "RB直線道路",
      horizontal: road.horizontal,
      vertical: road.vertical,
      crossSections: [],
    });
    expect(roadOk.ok).toBe(true);

    const inputs = readRoadInputs(manager, projectId);
    const intermediate = buildLinerIntermediateFromRoad(inputs);
    expect(intermediate).toBeDefined();

    const document = makeDocument(projectId);
    const result = generateSuperstructureSnapshot(intermediate!, document);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { snapshot } = result;
    expect(snapshot.bridgeId).toBe("BR-RB");
    expect(snapshot.snapshotVersion).toBe("6.1.0");
    expect(snapshot.supportLines.length).toBe(3);
    expect(snapshot.girderLines.length).toBe(2);
    // supports at stations 100/300/500
    const stations = snapshot.supportLines.map((s) => s.stationM.value).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(stations[0]).toBe(100);
    expect(stations[2]).toBe(500);
    // girder offsets ±4
    const offsets = snapshot.girderLines.map((g) => g.offsetM.value).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(offsets).toEqual([-4, 4]);
    // deterministic fingerprint
    const again = generateSuperstructureSnapshot(intermediate!, document);
    if (!again.ok) throw new Error("second generation failed");
    expect(again.fingerprint).toBe(result.fingerprint);

    // geometryReference update
    const updated = withGeometryReference(document, snapshot);
    expect(updated.geometryReference.snapshotFingerprint).toBe(snapshot.fingerprint);
  });

  it("fails closed when binding fails (missing handoffs)", () => {
    const road = straightRoad();
    const intermediate = buildLinerIntermediateFromRoad({ horizontal: road.horizontal, vertical: road.vertical, crossSections: [] });
    const built = buildSuperstructureDocument({
      projectId: "PROJ-1",
      bridgeLayoutReference: bridgeRef(),
      roadReference: roadRef(),
      girderConfiguration: {
        girderCount: 2,
        girderSpacingM: 8,
        girderLines: [] as never[],
        girderSectionModel: { depthM: null, webThicknessM: null, topFlange: null, bottomFlange: null, areaM2: null, unitWeightPerM: null },
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
    const result = generateSuperstructureSnapshot(intermediate!, built.document);
    expect(result.ok).toBe(false);
  });
});
