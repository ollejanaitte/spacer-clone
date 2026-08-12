import { describe, expect, it } from "vitest";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { buildLinerIntermediateFromRoad, generateSuperstructureSnapshot } from "../superstructureGeometry";
import { buildSuperstructureDocument, attachSuperstructureHandoffs } from "../superstructureDocumentDomain";
import { buildSuperstructureSceneGroup, addSuperstructureToScene } from "../superstructureSceneBuilder";
import type { LinearAlignment } from "../../../../liner/core/types";
import type { VerticalElement } from "../../../../liner/core/geometry/vertical";
import * as THREE from "three";

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

function makeSnapshot() {
  const road = straightRoad();
  const intermediate = buildLinerIntermediateFromRoad({ horizontal: road.horizontal, vertical: road.vertical, crossSections: [] });
  if (!intermediate) throw new Error("no intermediate");
  const built = buildSuperstructureDocument({
    projectId: "PROJ-1",
    bridgeLayoutReference: { bridgeId: "BR-RB", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp-rb" },
    roadReference: { moduleId: "road", alignmentId: "RB-STRAIGHT", stationReferenceId: null, coordinatePolicyId: null },
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
  if (!result.ok) throw new Error("snapshot failed: " + JSON.stringify(result.issues));
  return result.snapshot;
}

describe("Superstructure 3D scene builder (WP-C2)", () => {
  it("builds a scene group with girders, deck, cross beams and bearings", () => {
    const snapshot = makeSnapshot();
    const built = buildSuperstructureSceneGroup(snapshot);
    expect(built.meshCount).toBeGreaterThan(0);
    const names = built.group.children.map((c) => c.name);
    expect(names.some((n) => n.startsWith("super-girder-"))).toBe(true);
    expect(names.some((n) => n.startsWith("super-deck-"))).toBe(true);
    expect(names.some((n) => n.startsWith("super-brg-"))).toBe(true);
    // 2 girders
    expect(names.filter((n) => n.startsWith("super-girder-")).length).toBe(2);
    // bearing markers: 3 supports × 2 girders
    expect(names.filter((n) => n.startsWith("super-brg-")).length).toBe(6);
    // bounds finite
    expect(built.bounds.isEmpty()).toBe(false);
  });

  it("assigns selection IDs following the C-02 convention", () => {
    const snapshot = makeSnapshot();
    const built = buildSuperstructureSceneGroup(snapshot);
    const girder = built.group.children.find((c) => c.name === "super-girder-G1");
    expect(girder?.userData.selectionId).toBe("super:G1");
    const bearing = built.group.children.find((c) => c.name === "super-brg-BRG-A1-G1");
    expect(bearing?.userData.selectionId).toBe("super:BRG-A1-G1");
  });

  it("merges into an existing integrated group", () => {
    const snapshot = makeSnapshot();
    const parent = new THREE.Group();
    const built = addSuperstructureToScene(parent, snapshot);
    expect(parent.children).toContain(built.group);
    expect(built.meshCount).toBeGreaterThan(0);
  });

  it("produces deterministic output for identical snapshots", () => {
    const a = buildSuperstructureSceneGroup(makeSnapshot());
    const b = buildSuperstructureSceneGroup(makeSnapshot());
    expect(a.meshCount).toBe(b.meshCount);
    expect(a.bounds.min.lengthSq()).toBeCloseTo(b.bounds.min.lengthSq(), 3);
  });
});
