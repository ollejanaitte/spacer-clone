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
import { addPier, updatePierSkew } from "../../modules/bridgeLayoutModule";
import { refreshPierPlacements } from "../../modules/bridgeLayoutModule";
import { generateSpans } from "../../modules/bridgeLayoutModule";
import { readRoadAlignmentContext } from "../../modules/bridgeLayoutModule";
import { getProjectTerrainGrid } from "../../modules/bridgeLayoutModule";
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
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phase4-03-persist-"));
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

function buildPierDocument(manager = getProjectManager(), projectId: string) {
  const built = buildBridgeLayoutFromRange(manager, projectId, {
    bridgeId: "BR-700",
    name: "P1..Pn永続化橋",
    startStation: 100,
    endStation: 700,
  });
  expect(built.ok).toBe(true);
  let doc = built.document!;
  doc = addPier(doc, { supportId: "P1", station: 300 });
  doc = addPier(doc, { supportId: "P2", station: 500 });
  doc = updatePierSkew(doc, "P1", 0.25, "user");
  const road = readRoadAlignmentContext(manager, projectId);
  doc = refreshPierPlacements(doc, road, getProjectTerrainGrid(manager, projectId));
  doc = { ...doc, spans: generateSpans(doc) };
  return {
    ...doc,
    validation: {
      schemaVersion: doc.schemaVersion,
      validatedAt: new Date().toISOString(),
      ok: true,
      issues: [],
    },
  };
}

describe("Phase 4-03 Pier / span persistence vertical (real filesystem)", () => {
  it("save -> restart -> restore -> P1..Pn / station / skew / spans restored", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("橋脚縦断業務"), {
      businessNumber: "BL-P-001",
      designStage: "bridge-detailed",
    });
    expect(manager.importProject(project)).toBe(true);
    seedRoadAndContext(manager, project.projectId);
    const doc = buildPierDocument(manager, project.projectId);
    expect(writeBridgeLayoutDocument(manager, project.projectId, doc).ok).toBe(true);
    await manager.flushPendingSaves();

    // full restart
    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    const restore = await manager2.restoreFromPersistence();
    expect(restore.restored).toBe(1);
    expect(restore.rejected).toBe(0);

    const restored = readBridgeLayoutDocument(manager2, project.projectId);
    expect(restored).toBeTruthy();
    expect(restored?.piers).toHaveLength(2);
    expect(restored?.piers.map((p) => p.supportId)).toEqual(["P1", "P2"]);
    expect(restored?.piers[0].station).toBe(300);
    expect(restored?.piers[1].station).toBe(500);
    expect(restored?.piers[0].skewAngleRad).toBeCloseTo(0.25, 6);
    expect(restored?.piers[0].skewSource).toBe("user");
    expect(restored?.piers[0].placement?.domainX).toBeGreaterThan(0);
    expect(restored?.spans).toHaveLength(3);
    expect(restored?.spans[0].length).toBeCloseTo(200, 6);
    expect(restored?.spans[2].length).toBeCloseTo(200, 6);
  });

  it("restored document remains valid (validation state / span total == bridgeLength)", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("橋脚縦断業務"), {
      businessNumber: "BL-P-002",
      designStage: "bridge-detailed",
    });
    manager.importProject(project);
    seedRoadAndContext(manager, project.projectId);
    const doc = buildPierDocument(manager, project.projectId);
    writeBridgeLayoutDocument(manager, project.projectId, doc);
    await manager.flushPendingSaves();

    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    await manager2.restoreFromPersistence();
    const restored = readBridgeLayoutDocument(manager2, project.projectId);
    expect(restored?.bridgeRange.bridgeLength).toBeCloseTo(600, 6);
    const total = restored!.spans.reduce((sum, s) => sum + s.length, 0);
    expect(total).toBeCloseTo(600, 6);
    expect(restored?.validation.ok).toBe(true);
  });

  it(".spacerproj export -> import preserves P1..Pn / spans / skew", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("橋脚縦断業務"), {
      businessNumber: "BL-P-003",
      designStage: "bridge-detailed",
    });
    manager.importProject(project);
    seedRoadAndContext(manager, project.projectId);
    const doc = buildPierDocument(manager, project.projectId);
    writeBridgeLayoutDocument(manager, project.projectId, doc);
    await manager.flushPendingSaves();

    const exported = buildProjectPackage(manager.getProject(project.projectId)!);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;

    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    const inspected = inspectPackageContent("pier.spacerproj", exported.json);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    const imported = extractProjectFromPackage(inspected.pkg!);
    expect(imported).toBeTruthy();
    if (!imported) return;
    expect(manager2.importProject(imported)).toBe(true);
    await manager2.flushPendingSaves();

    const importedDoc = readBridgeLayoutDocument(manager2, project.projectId);
    expect(importedDoc).toBeTruthy();
    expect(importedDoc?.piers).toHaveLength(2);
    expect(importedDoc?.piers[1].supportId).toBe("P2");
    expect(importedDoc?.piers[1].station).toBe(500);
    expect(importedDoc?.piers[0].skewAngleRad).toBeCloseTo(0.25, 6);
    expect(importedDoc?.spans).toHaveLength(3);
  });

  it("existing Project regression: road / terrain / existing preserved alongside piers", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("統合業務"), {
      businessNumber: "BL-P-004",
      designStage: "bridge-detailed",
    });
    manager.importProject(project);
    seedRoadAndContext(manager, project.projectId);
    const doc = buildPierDocument(manager, project.projectId);
    writeBridgeLayoutDocument(manager, project.projectId, doc);
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
    expect(bridge?.piers).toHaveLength(2);
    expect(bridge?.spans).toHaveLength(3);
  });

  it("invalid pier configuration (ordering violation) is never persisted", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("無効橋脚"), {
      businessNumber: "BL-P-005",
      designStage: "bridge-detailed",
    });
    manager.importProject(project);
    seedRoadAndContext(manager, project.projectId);
    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-701",
      name: "無効橋脚",
      startStation: 100,
      endStation: 700,
    });
    expect(built.ok).toBe(true);
    // out-of-order piers -> document invalid -> write rejected
    const badDoc = {
      ...built.document!,
      piers: [
        { supportId: "P1", station: 500, skewAngleRad: null },
        { supportId: "P2", station: 300, skewAngleRad: null },
      ],
    };
    const write = writeBridgeLayoutDocument(manager, project.projectId, badDoc);
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
