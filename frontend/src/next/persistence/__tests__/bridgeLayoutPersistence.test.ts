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
import { writeRoadInputs } from "../../modules/roadModuleAdapter";
import { writeTerrainDocument } from "../../modules/terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../modules/terrainModule";
import { writeExistingConditions } from "../../modules/existingConditionsAdapter";
import { readBridgeLayoutDocument, writeBridgeLayoutDocument } from "../../modules/bridgeLayoutModuleAdapter";
import { buildBridgeLayoutFromRange } from "../../modules/bridgeLayoutModule";
import { createReferenceMountain } from "../../modules/terrain/referenceMountain";
import { buildProjectPackage } from "../package/projectPackageBuilder";
import { inspectPackageContent, extractProjectFromPackage } from "../package/projectPackageImporter";

let tempDir: string;

function createPersistence() {
  return new FilesystemProjectPersistence(new NodeFileSystemGateway(), {
    rootDir: path.join(tempDir, "projects"),
  });
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phase4-02-persist-"));
  resetProjectManagerForTest();
});

afterEach(async () => {
  resetProjectManagerForTest();
  await fs.rm(tempDir, { recursive: true, force: true });
});

function seedRoadAndContext(manager = getProjectManager(), projectId: string) {
  const mountain = createReferenceMountain();
  const roadOk = writeRoadInputs(manager, projectId, {
    label: "山岳道路",
    horizontal: mountain.roadHorizontal,
    vertical: mountain.roadVertical,
    crossSections: [mountain.roadCrossSection],
  });
  expect(roadOk.ok).toBe(true);
  const terrainDoc = {
    ...createEmptyTerrainDocument(),
    source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null },
    surfaceReference: "assets/terrain/reference.bin",
  };
  writeTerrainDocument(manager, projectId, terrainDoc);
  writeExistingConditions(manager, projectId, { schemaVersion: "0.1.0", entities: [...mountain.existing] });
}

describe("Phase 4-02 Bridge Layout persistence vertical (real filesystem)", () => {
  it("save -> restart -> restore -> bridge range / bridgeLength / A1/A2 restored", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();

    const project = applyBusinessMetadata(createEmptyProject("橋梁縦断業務"), {
      businessNumber: "BL-V-001",
      designStage: "bridge-detailed",
    });
    expect(manager.importProject(project)).toBe(true);
    seedRoadAndContext(manager, project.projectId);
    await manager.flushPendingSaves();

    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-900",
      name: "谷川橋",
      startStation: 100,
      endStation: 450,
    });
    expect(built.ok).toBe(true);
    const write = writeBridgeLayoutDocument(manager, project.projectId, built.document);
    expect(write.ok).toBe(true);
    await manager.flushPendingSaves();

    // restart (full app termination)
    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    const restore = await manager2.restoreFromPersistence();
    expect(restore.restored).toBe(1);
    expect(restore.rejected).toBe(0);

    const restored = readBridgeLayoutDocument(manager2, project.projectId);
    expect(restored).toBeTruthy();
    expect(restored?.name).toBe("谷川橋");
    expect(restored?.bridgeRange.startStation).toBe(100);
    expect(restored?.bridgeRange.endStation).toBe(450);
    expect(restored?.bridgeRange.bridgeLength).toBe(350);
    expect(restored?.abutments.A1.station).toBe(100);
    expect(restored?.abutments.A2.station).toBe(450);
    expect(restored?.roadReference.alignmentId).toBe("ROAD-MTN-1");
  });

  it("A1/A2 placement snapshots survive restart", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("橋梁縦断業務"), {
      businessNumber: "BL-V-002",
      designStage: "bridge-detailed",
    });
    manager.importProject(project);
    seedRoadAndContext(manager, project.projectId);
    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-901",
      name: "旭高架橋",
      startStation: 200,
      endStation: 550,
    });
    expect(built.ok).toBe(true);
    const write = writeBridgeLayoutDocument(manager, project.projectId, built.document);
    expect(write.ok).toBe(true);
    await manager.flushPendingSaves();

    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    await manager2.restoreFromPersistence();
    const restored = readBridgeLayoutDocument(manager2, project.projectId);
    expect(restored?.bridgeRange.startStation).toBe(200);
    expect(restored?.bridgeRange.endStation).toBe(550);
  });

  it(".spacerproj export -> import preserves the bridge layout document", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("橋梁縦断業務"), {
      businessNumber: "BL-V-003",
      designStage: "bridge-detailed",
    });
    manager.importProject(project);
    seedRoadAndContext(manager, project.projectId);
    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-902",
      name: "Package橋",
      startStation: 150,
      endStation: 400,
    });
    expect(built.ok).toBe(true);
    const write = writeBridgeLayoutDocument(manager, project.projectId, built.document);
    expect(write.ok).toBe(true);
    await manager.flushPendingSaves();

    // export
    const exported = buildProjectPackage(manager.getProject(project.projectId)!);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;

    // import into a fresh manager
    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    const inspected = inspectPackageContent("bridge.spacerproj", exported.json);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    const imported = extractProjectFromPackage(inspected.pkg!);
    expect(imported).toBeTruthy();
    if (!imported) return;
    expect(manager2.importProject(imported)).toBe(true);
    await manager2.flushPendingSaves();

    const importedDoc = readBridgeLayoutDocument(manager2, project.projectId);
    expect(importedDoc).toBeTruthy();
    expect(importedDoc?.bridgeId).toBe("BR-902");
    expect(importedDoc?.name).toBe("Package橋");
    expect(importedDoc?.bridgeRange.startStation).toBe(150);
    expect(importedDoc?.bridgeRange.endStation).toBe(400);
    expect(importedDoc?.abutments.A1.station).toBe(150);
    expect(importedDoc?.abutments.A2.station).toBe(400);
  });

  it("existing Project regression: road / terrain / existing preserved alongside bridge layout", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("統合業務"), {
      businessNumber: "BL-V-004",
      designStage: "bridge-detailed",
    });
    manager.importProject(project);
    seedRoadAndContext(manager, project.projectId);
    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-903",
      name: "統合橋",
      startStation: 300,
      endStation: 500,
    });
    expect(built.ok).toBe(true);
    writeBridgeLayoutDocument(manager, project.projectId, built.document);
    await manager.flushPendingSaves();

    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    await manager2.restoreFromPersistence();

    const restored = manager2.getProject(project.projectId)!;
    expect(restored.modules.road).toBeTruthy();
    expect(restored.modules.bridgeLayout).toBeTruthy();
    expect(restored.metadata.existingConditions).toBeTruthy();
    const bridge = readBridgeLayoutDocument(manager2, project.projectId);
    expect(bridge?.bridgeRange.endStation).toBe(500);
  });

  it("invalid bridge layout document is never persisted", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("無効橋梁"), {
      businessNumber: "BL-V-005",
      designStage: "bridge-detailed",
    });
    manager.importProject(project);
    seedRoadAndContext(manager, project.projectId);
    const bad = { bridgeId: "", name: "", schemaVersion: "0.1.0" } as never;
    const write = writeBridgeLayoutDocument(manager, project.projectId, bad);
    expect(write.ok).toBe(false);
    await manager.flushPendingSaves();

    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    await manager2.restoreFromPersistence();
    expect(readBridgeLayoutDocument(manager2, project.projectId)).toBeUndefined();
  });
});
