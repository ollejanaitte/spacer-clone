import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { NodeFileSystemGateway } from "../../nodeFileSystemGateway";
import { FilesystemProjectPersistence } from "../../filesystemProjectPersistence";
import { setPersistenceForTest, resetProjectManagerForTest, getProjectManager } from "../../../project/projectManagerInstance";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { createEmptyProject } from "../../../project/projectDataCore";
import { createReferenceMountain } from "../../../modules/terrain/referenceMountain";
import { gridToMesh } from "../../../modules/terrain/terrainSurface";
import { buildTerrainTiles, selectLodLevel } from "../../../modules/terrain/terrainTiles";
import { buildTerrainCimGeometry, buildExistingConditionsCimGeometry } from "../../../modules/terrainCimGeometry";
import { buildIntegratedThreeScene } from "../../../modules/integratedSceneBuilder";
import { buildRoadMesh } from "../../../modules/road/roadMesh";
import { registerTerrainImport } from "../../../modules/terrain/terrainImportAdapter";
import { parseTerrainText } from "../../../modules/terrain/terrainImport";
import { readTerrainDocument } from "../../../modules/terrainModuleAdapter";
import { writeExistingConditions, readExistingConditions } from "../../../modules/existingConditionsAdapter";
import { createEmptyTerrainDocument } from "../../../modules/terrainModule";
import { buildProjectPackage } from "../projectPackageBuilder";
import { inspectPackageContent, extractProjectFromPackage } from "../projectPackageImporter";

let tempDir: string;

function createPersistence() {
  return new FilesystemProjectPersistence(new NodeFileSystemGateway(), {
    rootDir: path.join(tempDir, "projects"),
  });
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phase3-12-"));
  resetProjectManagerForTest();
});

afterEach(async () => {
  resetProjectManagerForTest();
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("Phase 3-12 Reference Mountain E2E", () => {
  it("terrain + existing + road integration -> save -> restart -> restore -> export -> import -> full restore", async () => {
    const sample = createReferenceMountain();

    // terrain surface + tiles + LOD operate on the reference
    const terrainMesh = gridToMesh(sample.terrainGrid);
    expect(terrainMesh.vertexCount).toBe(41 * 41);
    expect(terrainMesh.triangleCount).toBeGreaterThan(0);
    const tiles = buildTerrainTiles(sample.terrainGrid, { tileSize: 20 });
    expect(tiles.tiles.length).toBeGreaterThan(1);
    const lod = selectLodLevel(tiles.tiles[0], { x: 500, y: 500 });
    expect(lod).toBeGreaterThanOrEqual(0);

    // road mesh over the reference
    const roadMesh = buildRoadMesh({
      horizontal: sample.roadHorizontal,
      vertical: sample.roadVertical,
      crossSection: sample.roadCrossSection,
      stationInterval: 20,
    });
    expect(roadMesh.vertices.length).toBeGreaterThan(0);

    // integrated scene (terrain + road + existing) builds without error
    const integrated = buildIntegratedThreeScene({
      terrain: terrainMesh,
      road: roadMesh,
      existing: sample.existing,
    });
    expect(integrated.terrainMesh).not.toBeNull();
    expect(integrated.roadMesh).not.toBeNull();
    expect(integrated.existingGroup.children.length).toBe(4);

    // CIM geometries
    const terrainDoc = {
      ...createEmptyTerrainDocument(),
      source: { sourceType: "csv" as const, sourceName: "reference-mountain.csv", importedAt: "2026-08-11T00:00:00.000Z" },
    };
    const terrainCim = buildTerrainCimGeometry(terrainDoc, terrainMesh, "assets/terrain/reference.bin");
    expect(terrainCim.surface.vertexCount).toBe(41 * 41);

    // persist full project
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject(sample.name), {
      businessNumber: "REF-MTN-E2E",
      designStage: "road-detailed",
    });
    expect(manager.importProject(project)).toBe(true);
    await manager.flushPendingSaves();

    // terrain import via points (CSV-like)
    const points: string[] = ["x,y,z"];
    for (let row = 0; row < sample.terrainGrid.height; row += 4) {
      for (let col = 0; col < sample.terrainGrid.width; col += 4) {
        const z = sample.terrainGrid.heights[row * sample.terrainGrid.width + col];
        const x = sample.terrainGrid.originX + col * sample.terrainGrid.cellSize;
        const y = sample.terrainGrid.originY + row * sample.terrainGrid.cellSize;
        points.push(`${x},${y},${z}`);
      }
    }
    const parsed = parseTerrainText(points.join("\n"));
    expect(parsed.ok).toBe(true);
    const terrainImport = registerTerrainImport(manager, project.projectId, {
      sourceType: "csv",
      sourceName: "reference-mountain.csv",
      importResult: parsed,
      surfaceAssetRef: "assets/terrain/reference.bin",
    });
    expect(terrainImport.ok).toBe(true);

    const ecDoc = { ...createEmptyTerrainDocument(), ...{ entities: sample.existing } } as never;
    void ecDoc;
    // existing conditions document
    const existingDoc = {
      schemaVersion: "0.1.0",
      entities: sample.existing,
    };    const ec = writeExistingConditions(manager, project.projectId, existingDoc);
    expect(ec.ok).toBe(true);
    await manager.flushPendingSaves();

    // restart
    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    const restore = await manager2.restoreFromPersistence();
    expect(restore.restored).toBe(1);

    const restoredTerrain = readTerrainDocument(manager2, project.projectId);
    expect(restoredTerrain?.source.sourceName).toBe("reference-mountain.csv");
    expect(restoredTerrain?.surfaceReference).toBe("assets/terrain/reference.bin");
    expect(restoredTerrain?.bounds?.minX).toBeLessThan(500);

    const restoredExisting = readExistingConditions(manager2, project.projectId);
    expect(restoredExisting?.entities.length).toBe(4);
    expect(restoredExisting?.entities.map((e) => e.type)).toContain("river");

    const ecCim = buildExistingConditionsCimGeometry(restoredExisting!);
    expect(ecCim.entityCount).toBe(4);

    // export + import
    const built = buildProjectPackage(manager2.getProject(project.projectId)!);
    if (!built.ok) throw new Error("build failed");
    resetProjectManagerForTest();
    const persistence3 = createPersistence();
    setPersistenceForTest(persistence3);
    const manager3 = getProjectManager();
    const inspected = inspectPackageContent("ref.spacerproj", built.json);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    const imported = extractProjectFromPackage(inspected.pkg!);
    if (!imported) throw new Error("extract failed");
    expect(manager3.importProject(imported)).toBe(true);
    await manager3.flushPendingSaves();

    const importedTerrain = readTerrainDocument(manager3, project.projectId);
    expect(importedTerrain?.surfaceReference).toBe("assets/terrain/reference.bin");
    const importedExisting = readExistingConditions(manager3, project.projectId);
    expect(importedExisting?.entities.length).toBe(4);
  });

  it("invalid terrain data never persists", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("無効"), {
      businessNumber: "BAD",
      designStage: "road-preliminary",
    });
    manager.importProject(project);
    await manager.flushPendingSaves();

    const empty = parseTerrainText("");
    const terrain = registerTerrainImport(manager, project.projectId, {
      sourceType: "csv",
      sourceName: "bad.csv",
      importResult: empty,
    });
    expect(terrain.ok).toBe(false);
    expect(readTerrainDocument(manager, project.projectId)).toBeUndefined();
  });
});
