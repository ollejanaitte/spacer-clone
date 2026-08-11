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
import { writeTerrainDocument, readTerrainDocument, hasTerrainDocument } from "../../modules/terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../modules/terrainModule";
import { buildProjectPackage } from "../package/projectPackageBuilder";
import { inspectPackageContent, extractProjectFromPackage } from "../package/projectPackageImporter";

let tempDir: string;

function createPersistence() {
  return new FilesystemProjectPersistence(new NodeFileSystemGateway(), {
    rootDir: path.join(tempDir, "projects"),
  });
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phase3-a-"));
  resetProjectManagerForTest();
});

afterEach(async () => {
  resetProjectManagerForTest();
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("Phase 3-A minimal Terrain vertical (real filesystem)", () => {
  it("save -> restart -> restore -> export -> import -> terrain metadata restored", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();

    const project = applyBusinessMetadata(createEmptyProject("地形縦断業務"), {
      businessNumber: "TRN-V-001",
      designStage: "road-preliminary",
    });
    expect(manager.importProject(project)).toBe(true);
    await manager.flushPendingSaves();

    const doc = createEmptyTerrainDocument();
    const withSource = {
      ...doc,
      source: { ...doc.source, sourceType: "csv" as const, sourceName: "山岳地形測量.csv", importedAt: "2026-08-11T00:00:00.000Z" },
      bounds: { minX: 0, minY: 0, maxX: 500, maxY: 500, minElevation: 100, maxElevation: 200 },
    };
    const write = writeTerrainDocument(manager, project.projectId, withSource);
    expect(write.ok).toBe(true);
    await manager.flushPendingSaves();

    // restart
    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    const restore = await manager2.restoreFromPersistence();
    expect(restore.restored).toBe(1);

    expect(hasTerrainDocument(manager2, project.projectId)).toBe(true);
    const restored = readTerrainDocument(manager2, project.projectId);
    expect(restored?.source.sourceType).toBe("csv");
    expect(restored?.source.sourceName).toBe("山岳地形測量.csv");
    expect(restored?.bounds?.maxX).toBe(500);

    // export + import
    const built = buildProjectPackage(manager2.getProject(project.projectId)!);
    if (!built.ok) throw new Error("build failed");
    resetProjectManagerForTest();
    const persistence3 = createPersistence();
    setPersistenceForTest(persistence3);
    const manager3 = getProjectManager();
    const inspected = inspectPackageContent("terrain.spacerproj", built.json);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    const imported = extractProjectFromPackage(inspected.pkg!);
    if (!imported) throw new Error("extract failed");
    expect(manager3.importProject(imported)).toBe(true);
    await manager3.flushPendingSaves();

    const importedDoc = readTerrainDocument(manager3, project.projectId);
    expect(importedDoc?.source.sourceName).toBe("山岳地形測量.csv");
    expect(importedDoc?.bounds?.minElevation).toBe(100);
  });

  it("rejects invalid terrain document (never persists)", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("無効地形"), {
      businessNumber: "BAD-TRN",
      designStage: "road-preliminary",
    });
    manager.importProject(project);
    await manager.flushPendingSaves();

    const bad = writeTerrainDocument(manager, project.projectId, { terrainId: 42 } as never);
    expect(bad.ok).toBe(false);
    expect(hasTerrainDocument(manager, project.projectId)).toBe(false);
  });
});
