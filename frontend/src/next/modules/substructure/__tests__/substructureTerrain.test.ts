import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { writeTerrainDocument } from "../../terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../terrainModule";
import { writeExistingConditions } from "../../existingConditionsAdapter";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { buildSubstructureDocument } from "../substructureDocumentDomain";
import { resolveTerrainElevations, resolveExistingInterference, computeSupportEmbedment } from "../substructureTerrain";
import type { SubstructureDocument } from "../substructureTypes";

function makeDocument(projectId: string): SubstructureDocument {
  const built = buildSubstructureDocument({
    projectId,
    bridgeLayoutReference: { bridgeId: "BR-900", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" },
    superstructureReference: { bridgeId: "BR-900", moduleId: "superstructure", documentVersion: "0.1.0", superstructureDocumentId: "SS-1", handoffSchemaVersion: "1.0.0" },
    roadReference: { moduleId: "road", alignmentId: "ROAD-MTN-1", stationReferenceId: null, coordinatePolicyId: null },
    supports: [
      {
        supportId: "P1",
        supportType: "pier",
        placement: { source: "liner", alignmentId: "ROAD-MTN-1", station: 300, offset: 0 },
        skewRad: 0,
        placementSnapshot: { source: "liner", position: { x: 300, y: 0, z: 100 }, tangent: { x: 1, y: 0, z: 0 }, transverse: { x: 0, y: 1, z: 0 }, vertical: { x: 0, y: 0, z: 1 }, azimuthRad: 0, skewRad: 0 },
        bearingSeats: [],
        pier: {
          id: "p1",
          formType: "single_column_rect",
          column: { id: "c1", width: 2.0, depth: 2.0, height: 8.0 },
          footing: { id: "ft-p1", length: 6.0, width: 6.0, thickness: 2.0, topElevation: 99.0 },
          pileGroup: { id: "pg", pileType: "bored_pile", diameter: 1.2, length: 20.0, pileCount: 6, spacing: { x: 3.0, y: 2.5 } },
        },
      },
    ],
  });
  if (!built.ok) throw new Error("build failed");
  return built.document;
}

describe("Substructure terrain/existing (WP-G)", () => {
  it("resolves terrain elevation from Terrain Module reference (T6-TER-001)", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("TG"), { businessNumber: "TG-1", designStage: "bridge-detailed" }));
    const projectId = manager.listProjects()[0].projectId;
    writeTerrainDocument(manager, projectId, {
      ...createEmptyTerrainDocument(),
      source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null },
      surfaceReference: "assets/terrain/reference.bin",
    });
    const doc = makeDocument(projectId);
    const res = resolveTerrainElevations(manager, projectId, doc);
    expect(res.groundElevationBySupport.P1).not.toBeNull();
    expect(res.issues).toEqual([]);
  });

  it("warns when terrain is missing (T6-TER-003)", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("TG-NG"), { businessNumber: "TG-NG", designStage: "bridge-detailed" }));
    const projectId = manager.listProjects()[0].projectId;
    const doc = makeDocument(projectId);
    const res = resolveTerrainElevations(manager, projectId, doc);
    expect(res.groundElevationBySupport.P1).toBeNull();
    expect(res.issues.some((i) => i.path === "terrainReferences")).toBe(true);
  });

  it("resolves existing conditions + interference (T6-EXT-001/002)", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("EX"), { businessNumber: "EX-1", designStage: "bridge-detailed" }));
    const projectId = manager.listProjects()[0].projectId;
    const mountain = createReferenceMountain();
    writeExistingConditions(manager, projectId, { schemaVersion: "0.1.0", entities: [...mountain.existing] });
    const doc = makeDocument(projectId);
    const res = resolveExistingInterference(manager, projectId, doc);
    expect(res.nearbyEntities).toBeDefined();
    expect(res.issues).toEqual([]);
  });

  it("warns when existing is missing (T6-EXT-003)", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("EX-NG"), { businessNumber: "EX-NG", designStage: "bridge-detailed" }));
    const projectId = manager.listProjects()[0].projectId;
    const doc = makeDocument(projectId);
    const res = resolveExistingInterference(manager, projectId, doc);
    expect(res.issues.some((i) => i.path === "existingReferences")).toBe(true);
  });

  it("computes embedment + pile tip from ground elevation (T6-TER-002)", () => {
    const doc = makeDocument("PROJ-1");
    const emb = computeSupportEmbedment(doc, "P1", 95.0);
    expect(emb.embedmentM).toBe(-2.0); // 95 - (99-2) = -2
    expect(emb.pileTipElevation).toBe(77.0); // 97 - 20
  });
});
