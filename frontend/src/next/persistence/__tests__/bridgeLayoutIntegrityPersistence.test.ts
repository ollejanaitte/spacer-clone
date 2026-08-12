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
import { addPier, updatePierSkew, generateSpans, refreshPierPlacements, readRoadAlignmentContext, getProjectTerrainGrid, runBridgeLayoutIntegrityGate, buildSupportHandoff, buildSpanHandoff } from "../../modules/bridgeLayoutModule";
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
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phase4-04-persist-"));
  resetProjectManagerForTest();
});

afterEach(async () => {
  resetProjectManagerForTest();
  await fs.rm(tempDir, { recursive: true, force: true });
});

function seedAll(manager = getProjectManager(), projectId: string) {
  const mountain = createReferenceMountain();
  const roadOk = writeRoadInputs(manager, projectId, {
    label: "山岳道路",
    horizontal: mountain.roadHorizontal,
    vertical: mountain.roadVertical,
    crossSections: [mountain.roadCrossSection],
  });
  expect(roadOk.ok).toBe(true);
  writeTerrainDocument(manager, projectId, {
    ...createEmptyTerrainDocument(),
    source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null },
    surfaceReference: "assets/terrain/reference.bin",
  });
  writeExistingConditions(manager, projectId, { schemaVersion: "0.1.0", entities: [...mountain.existing] });
}

function buildValidDoc(manager = getProjectManager(), projectId: string) {
  const built = buildBridgeLayoutFromRange(manager, projectId, {
    bridgeId: "BR-950",
    name: "P4-04永続化橋",
    startStation: 100,
    endStation: 700,
  });
  expect(built.ok).toBe(true);
  let doc = built.document!;
  doc = addPier(doc, { supportId: "P1", station: 300 });
  doc = addPier(doc, { supportId: "P2", station: 500 });
  doc = updatePierSkew(doc, "P1", 0.25, "user");
  doc = refreshPierPlacements(doc, readRoadAlignmentContext(manager, projectId), getProjectTerrainGrid(manager, projectId));
  doc = { ...doc, spans: generateSpans(doc) };
  return {
    ...doc,
    validation: { schemaVersion: doc.schemaVersion, validatedAt: new Date().toISOString(), ok: true, issues: [] },
  };
}

describe("Phase 4-04 Integrity + Persistence vertical (real filesystem)", () => {
  it("edit -> auto save -> restart -> restore -> handoff regenerate -> integrity re-verify", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("Integrity縦断"), {
      businessNumber: "BL-I-V1",
      designStage: "bridge-detailed",
    });
    expect(manager.importProject(project)).toBe(true);
    seedAll(manager, project.projectId);
    const doc = buildValidDoc(manager, project.projectId);
    expect(writeBridgeLayoutDocument(manager, project.projectId, doc).ok).toBe(true);
    await manager.flushPendingSaves();

    // pre-restart integrity
    const before = runBridgeLayoutIntegrityGate(manager, project.projectId, doc);
    expect(before.ok).toBe(true);
    expect(before.phase5Ready).toBe(true);
    expect(before.phase6Ready).toBe(true);

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
    expect(restored?.spans).toHaveLength(3);

    // handoff regenerate from restored document
    const support = buildSupportHandoff(manager2, project.projectId, restored!);
    const span = buildSpanHandoff(manager2, project.projectId, restored!);
    expect(support.ok).toBe(true);
    expect(span.ok).toBe(true);
    if (support.ok) {
      expect(support.handoff.supports.map((s) => s.supportId)).toEqual(["A1", "P1", "P2", "A2"]);
    }
    if (span.ok) {
      expect(span.handoff.spans.map((s) => s.spanId)).toEqual(["S1", "S2", "S3"]);
    }

    // integrity re-verify after restore
    const after = runBridgeLayoutIntegrityGate(manager2, project.projectId, restored!);
    expect(after.ok).toBe(true);
    expect(after.phase5Ready).toBe(true);
    expect(after.phase6Ready).toBe(true);
  });

  it(".spacerproj export -> import -> handoff regenerate -> integrity re-verify", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("Integrity縦断"), {
      businessNumber: "BL-I-V2",
      designStage: "bridge-detailed",
    });
    manager.importProject(project);
    seedAll(manager, project.projectId);
    const doc = buildValidDoc(manager, project.projectId);
    writeBridgeLayoutDocument(manager, project.projectId, doc);
    await manager.flushPendingSaves();

    const exported = buildProjectPackage(manager.getProject(project.projectId)!);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;

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
    expect(importedDoc?.piers).toHaveLength(2);
    expect(importedDoc?.spans).toHaveLength(3);
    const support = buildSupportHandoff(manager2, project.projectId, importedDoc!);
    expect(support.ok).toBe(true);
    const integrity = runBridgeLayoutIntegrityGate(manager2, project.projectId, importedDoc!);
    expect(integrity.ok).toBe(true);
    expect(integrity.phase5Ready).toBe(true);
    expect(integrity.phase6Ready).toBe(true);
  });

  it("invalid bridge layout (out-of-order piers) is never persisted", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("不正橋梁"), {
      businessNumber: "BL-I-V3",
      designStage: "bridge-detailed",
    });
    manager.importProject(project);
    seedAll(manager, project.projectId);
    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-951",
      name: "不正橋",
      startStation: 100,
      endStation: 700,
    });
    expect(built.ok).toBe(true);
    const bad = {
      ...built.document!,
      piers: [
        { supportId: "P1", station: 500, skewAngleRad: null },
        { supportId: "P2", station: 300, skewAngleRad: null },
      ],
    };
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
