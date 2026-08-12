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
import { buildBridgeLayoutFromRange, addPier, generateSpans } from "../../modules/bridgeLayoutModule";
import { writeBridgeLayoutDocument } from "../../modules/bridgeLayoutModuleAdapter";
import { createReferenceMountain } from "../../modules/terrain/referenceMountain";
import { buildProjectPackage } from "../package/projectPackageBuilder";
import { extractProjectFromPackage } from "../package/projectPackageImporter";
import { readSubstructureDocument, writeSubstructureDocument } from "../../modules/substructureModuleAdapter";
import { regenerateSubstructureDerived } from "../../modules/substructure/substructurePersistence";
import { generateSubstructureFromLayout } from "../../modules/substructure/substructureGenerator";
import { substructureDocumentIdFor } from "../../modules/substructure/substructureDocumentDomain";

let tempDir: string;

function createPersistence() {
  return new FilesystemProjectPersistence(new NodeFileSystemGateway(), {
    rootDir: path.join(tempDir, "projects"),
  });
}

function seedRoad(manager: ReturnType<typeof getProjectManager>, projectId: string) {
  const mountain = createReferenceMountain();
  writeRoadInputs(manager, projectId, {
    label: "山岳道路",
    horizontal: mountain.roadHorizontal,
    vertical: mountain.roadVertical,
    crossSections: [mountain.roadCrossSection],
  });
  writeTerrainDocument(manager, projectId, {
    ...createEmptyTerrainDocument(),
    source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null },
    surfaceReference: "assets/terrain/reference.bin",
  });
  writeExistingConditions(manager, projectId, { schemaVersion: "0.1.0", entities: [...mountain.existing] });
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phase6-02-persist-"));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("Substructure persistence (WP-J)", () => {
  it("save -> restart -> restore -> derived regenerated (T6-PER-001/002)", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();

    const project = applyBusinessMetadata(createEmptyProject("下部工縦断"), {
      businessNumber: "SUB-V-001",
      designStage: "bridge-detailed",
    });
    expect(manager.importProject(project)).toBe(true);
    seedRoad(manager, project.projectId);
    await manager.flushPendingSaves();

    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-900",
      name: "谷川橋",
      startStation: 100,
      endStation: 450,
    });
    expect(built.ok).toBe(true);
    let layout = built.document!;
    layout = addPier(layout, { supportId: "P1", station: 300 });
    layout = { ...layout, spans: generateSpans(layout) };
    expect(writeBridgeLayoutDocument(manager, project.projectId, layout).ok).toBe(true);
    await manager.flushPendingSaves();

    const gen = generateSubstructureFromLayout(manager, project.projectId);
    expect(gen.ok).toBe(true);
    if (!gen.ok) return;
    await manager.flushPendingSaves();

    // full app termination
    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    const restore = await manager2.restoreFromPersistence();
    expect(restore.restored).toBe(1);
    expect(restore.rejected).toBe(0);

    const restored = readSubstructureDocument(manager2, project.projectId);
    expect(restored).toBeTruthy();
    expect(restored?.documentId).toBe(gen.document.documentId);
    // derived stripped in persisted form
    expect(restored?.supportReferences).toBeNull();
    // supports preserved (canonical)
    expect(restored?.supports).toHaveLength(3);

    // regenerate derived from Bridge Layout
    const regenerated = regenerateSubstructureDerived(manager2, project.projectId, restored!);
    expect(regenerated.supportReferences).not.toBeNull();
    expect(regenerated.supportReferences!.supports).toHaveLength(3);
    expect(regenerated.supports).toHaveLength(3);
  });

  it(".spacerproj round-trip includes the substructure module (T6-PER-004)", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("下部工パッケージ"), {
      businessNumber: "SUB-PKG-001",
      designStage: "bridge-detailed",
    });
    manager.importProject(project);
    seedRoad(manager, project.projectId);
    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-900",
      name: "谷川橋",
      startStation: 100,
      endStation: 450,
    });
    if (!built.ok) throw new Error("layout failed");
    let layout = built.document!;
    layout = addPier(layout, { supportId: "P1", station: 300 });
    layout = { ...layout, spans: generateSpans(layout) };
    writeBridgeLayoutDocument(manager, project.projectId, layout);
    expect(generateSubstructureFromLayout(manager, project.projectId).ok).toBe(true);
    await manager.flushPendingSaves();

    const saved = manager.getProject(project.projectId);
    expect(saved).toBeTruthy();
    const pkg = buildProjectPackage(saved!);
    expect(pkg.ok).toBe(true);
    if (!pkg.ok) return;
    const extracted = extractProjectFromPackage(pkg.pkg);
    expect(extracted).toBeTruthy();
    if (!extracted) return;
    const subModule = extracted.modules.substructure as Record<string, unknown>;
    const subDoc = (subModule.data as Record<string, unknown>).substructureDocument as Record<string, unknown> | undefined;
    expect(subDoc).toBeTruthy();
    expect(subDoc!.documentId).toBe(substructureDocumentIdFor("BR-900"));
    // derived stripped in package
    expect(subDoc!.supportReferences).toBeNull();
  });
});

