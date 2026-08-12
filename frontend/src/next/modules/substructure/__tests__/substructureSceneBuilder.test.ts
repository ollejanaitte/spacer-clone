import { describe, expect, it } from "vitest";
import { buildSubstructureDocument } from "../substructureDocumentDomain";
import { buildSubstructureSceneGroup } from "../substructureSceneBuilder";
import { generateSubstructureFromLayout } from "../substructureGenerator";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { writeRoadInputs } from "../../roadModuleAdapter";
import { writeTerrainDocument } from "../../terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../terrainModule";
import { writeExistingConditions } from "../../existingConditionsAdapter";
import { buildBridgeLayoutFromRange, addPier, generateSpans } from "../../bridgeLayoutModule";
import { writeBridgeLayoutDocument } from "../../bridgeLayoutModuleAdapter";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import type { SubstructureDocument } from "../substructureTypes";

function makeDocument(): SubstructureDocument {
  const built = buildSubstructureDocument({
    projectId: "PROJ-1",
    bridgeLayoutReference: { bridgeId: "BR-900", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" },
    superstructureReference: { bridgeId: "BR-900", moduleId: "superstructure", documentVersion: "0.1.0", superstructureDocumentId: "SS-1", handoffSchemaVersion: "1.0.0" },
    roadReference: { moduleId: "road", alignmentId: "ALN-1", stationReferenceId: null, coordinatePolicyId: null },
    supports: [
      {
        supportId: "P1",
        supportType: "pier",
        placement: { source: "liner", alignmentId: "ALN-1", station: 300, offset: 0 },
        skewRad: 0,
        placementSnapshot: { source: "liner", position: { x: 300, y: 0, z: 100 }, tangent: { x: 1, y: 0, z: 0 }, transverse: { x: 0, y: 1, z: 0 }, vertical: { x: 0, y: 0, z: 1 }, azimuthRad: 0, skewRad: 0 },
        bearingSeats: [],
        pier: {
          id: "p1",
          formType: "single_column_rect",
          column: { id: "c1", width: 2.0, depth: 2.0, height: 8.0 },
          footing: { id: "ft-p1", length: 6.0, width: 6.0, thickness: 2.0, topElevation: 99.0 },
          pileGroup: null,
        },
      },
    ],
  });
  if (!built.ok) throw new Error("build failed");
  return built.document;
}

describe("Substructure scene builder (WP-I)", () => {
  it("builds a scene group with entity IDs and selection keys (T6-3D-001/003)", () => {
    const built = buildSubstructureSceneGroup(makeDocument());
    expect(built.meshCount).toBeGreaterThan(0);
    const names = built.group.children.map((c) => c.name);
    expect(names.some((n) => n.startsWith("sub-P1"))).toBe(true);
    const mesh = built.group.children[0];
    expect(mesh.userData.selectionId).toBe("sub:P1");
    expect(built.bounds.isEmpty()).toBe(false);
  });

  it("is deterministic for identical documents (T6-3D-002)", () => {
    const a = buildSubstructureSceneGroup(makeDocument());
    const b = buildSubstructureSceneGroup(makeDocument());
    expect(a.meshCount).toBe(b.meshCount);
  });
});

describe("Substructure generator (WP-I)", () => {
  it("generates a document from Bridge Layout (T6-UI-003)", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("GEN"), { businessNumber: "GEN-6", designStage: "bridge-detailed" }));
    const projectId = manager.listProjects()[0].projectId;
    const mountain = createReferenceMountain();
    writeRoadInputs(manager, projectId, { label: "山岳道路", horizontal: mountain.roadHorizontal, vertical: mountain.roadVertical, crossSections: [mountain.roadCrossSection] });
    writeTerrainDocument(manager, projectId, { ...createEmptyTerrainDocument(), source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null }, surfaceReference: "assets/terrain/reference.bin" });
    writeExistingConditions(manager, projectId, { schemaVersion: "0.1.0", entities: [...mountain.existing] });
    const built = buildBridgeLayoutFromRange(manager, projectId, { bridgeId: "BR-900", name: "谷川橋", startStation: 100, endStation: 450 });
    if (!built.ok) throw new Error("layout failed");
    let layout = built.document!;
    layout = addPier(layout, { supportId: "P1", station: 300 });
    layout = { ...layout, spans: generateSpans(layout) };
    expect(writeBridgeLayoutDocument(manager, projectId, layout).ok).toBe(true);

    const result = generateSubstructureFromLayout(manager, projectId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.supports).toHaveLength(3);
    expect(result.document.bridgeLayoutReference?.bridgeId).toBe("BR-900");
  });

  it("fails closed when Bridge Layout missing (T6-UI-003)", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("GEN-NG"), { businessNumber: "GEN-NG", designStage: "bridge-detailed" }));
    const projectId = manager.listProjects()[0].projectId;
    const result = generateSubstructureFromLayout(manager, projectId);
    expect(result.ok).toBe(false);
  });
});
