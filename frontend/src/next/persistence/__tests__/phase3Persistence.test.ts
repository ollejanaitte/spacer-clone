// @vitest-environment jsdom
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeFileSystemGateway } from "../nodeFileSystemGateway";
import { FilesystemProjectPersistence } from "../filesystemProjectPersistence";
import { setPersistenceForTest, resetProjectManagerForTest, getProjectManager } from "../../project/projectManagerInstance";
import { applyBusinessMetadata } from "../../project/businessMetadata";
import { createEmptyProject } from "../../project/projectDataCore";
import { parseTerrainText } from "../../modules/terrain/terrainImport";
import { registerTerrainImport } from "../../modules/terrain/terrainImportAdapter";
import { readTerrainDocument } from "../../modules/terrainModuleAdapter";
import { writeExistingConditions, readExistingConditions } from "../../modules/existingConditionsAdapter";
import { createEmptyExistingConditionsDocument, type ExistingConditionEntity } from "../../modules/existingConditions";
import { buildProjectPackage } from "../package/projectPackageBuilder";
import { inspectPackageContent, extractProjectFromPackage } from "../package/projectPackageImporter";

let tempDir: string;

function createPersistence() {
  return new FilesystemProjectPersistence(new NodeFileSystemGateway(), {
    rootDir: path.join(tempDir, "projects"),
  });
}

function makeRiver(): ExistingConditionEntity {
  return {
    entityId: "RIVER-1",
    type: "river",
    label: "山岳河川",
    geometry: { kind: "line", points: [{ x: 0, y: 200, z: 0 }, { x: 800, y: 200, z: 0 }] },
    coordinateContextId: "COORD-1",
    metadata: {},
    visibility: true,
    layer: "water",
    styleReference: null,
    sourceReference: null,
  };
}

const TERRAIN_CSV = [
  "x,y,z",
  "0,0,100",
  "200,0,140",
  "0,200,120",
  "200,200,160",
  "100,100,130",
  "400,0,180",
  "400,200,200",
  "600,0,220",
  "600,200,240",
  "800,0,260",
  "800,200,280",
].join("\n");

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phase3-11-"));
  resetProjectManagerForTest();
});

afterEach(async () => {
  resetProjectManagerForTest();
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("Phase 3-11 Terrain + Existing persistence / auto-save / .spacerproj", () => {
  it("import -> terrain + existing -> save -> restart -> restore -> export -> import -> full restore", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();

    const project = applyBusinessMetadata(createEmptyProject("山岳統合業務"), {
      businessNumber: "MTN-001",
      designStage: "road-detailed",
    });
    expect(manager.importProject(project)).toBe(true);
    await manager.flushPendingSaves();

    // terrain import
    const parsed = parseTerrainText(TERRAIN_CSV);
    expect(parsed.ok).toBe(true);
    const terrain = registerTerrainImport(manager, project.projectId, {
      sourceType: "csv",
      sourceName: "山岳地形.csv",
      importResult: parsed,
      surfaceAssetRef: "assets/terrain/mountain.bin",
    });
    expect(terrain.ok).toBe(true);

    // existing conditions
    const ecDoc = { ...createEmptyExistingConditionsDocument(), entities: [makeRiver()] };
    const ec = writeExistingConditions(manager, project.projectId, ecDoc);
    expect(ec.ok).toBe(true);
    await manager.flushPendingSaves();

    // restart
    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    const restore = await manager2.restoreFromPersistence();
    expect(restore.restored).toBe(1);

    // terrain + existing restored
    const terrainRestored = readTerrainDocument(manager2, project.projectId);
    expect(terrainRestored?.source.sourceName).toBe("山岳地形.csv");
    expect(terrainRestored?.bounds?.maxX).toBe(800);
    expect(terrainRestored?.surfaceReference).toBe("assets/terrain/mountain.bin");

    const existingRestored = readExistingConditions(manager2, project.projectId);
    expect(existingRestored?.entities[0].label).toBe("山岳河川");
    expect(existingRestored?.entities[0].type).toBe("river");

    // export .spacerproj
    const built = buildProjectPackage(manager2.getProject(project.projectId)!);
    if (!built.ok) throw new Error("build failed");

    // import into fresh environment
    resetProjectManagerForTest();
    const persistence3 = createPersistence();
    setPersistenceForTest(persistence3);
    const manager3 = getProjectManager();
    const inspected = inspectPackageContent("mtn.spacerproj", built.json);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    const imported = extractProjectFromPackage(inspected.pkg!);
    if (!imported) throw new Error("extract failed");
    expect(manager3.importProject(imported)).toBe(true);
    await manager3.flushPendingSaves();

    // full restore of terrain + existing after import
    const terrainImported = readTerrainDocument(manager3, project.projectId);
    expect(terrainImported?.source.sourceName).toBe("山岳地形.csv");
    expect(terrainImported?.bounds?.maxElevation).toBe(280);

    const existingImported = readExistingConditions(manager3, project.projectId);
    expect(existingImported?.entities[0].label).toBe("山岳河川");
  });

  it("invalid terrain/existing data never persists", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("無効統合"), {
      businessNumber: "BAD",
      designStage: "road-preliminary",
    });
    manager.importProject(project);
    await manager.flushPendingSaves();

    const badEc = { schemaVersion: "0.1.0", entities: [{ entityId: "" }] } as never;
    const ec = writeExistingConditions(manager, project.projectId, badEc);
    expect(ec.ok).toBe(false);
    expect(readExistingConditions(manager, project.projectId)).toBeUndefined();
  });
});
