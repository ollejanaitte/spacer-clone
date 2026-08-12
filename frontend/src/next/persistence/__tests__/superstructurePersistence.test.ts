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
import {
  readSuperstructureDocument,
  writeSuperstructureDocument,
} from "../../modules/superstructureModuleAdapter";
import {
  serializeSuperstructureDocumentForPersistence,
  deserializeSuperstructureDocumentFromPersistence,
  regenerateSuperstructureDerived,
} from "../../modules/superstructure/superstructurePersistence";
import { buildSuperstructureDocument, attachSuperstructureHandoffs } from "../../modules/superstructure/superstructureDocumentDomain";
import type { SuperstructureDocument } from "../../modules/superstructure/superstructureTypes";

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

function makeDocument(projectId: string): SuperstructureDocument {
  const built = buildSuperstructureDocument({
    projectId,
    bridgeLayoutReference: { bridgeId: "BR-900", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp-900" },
    roadReference: { moduleId: "road", alignmentId: "ROAD-MTN-1", stationReferenceId: null, coordinatePolicyId: null },
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
  return attachSuperstructureHandoffs(built.document, {
    handoffId: "SH-1",
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-12T00:00:00.000Z",
    spans: [
      { spanId: "S1", index: 0, startSupportId: "A1", endSupportId: "P1", startStation: 100, endStation: 300, spanLength: 200, startSupportSkew: null, endSupportSkew: null },
      { spanId: "S2", index: 1, startSupportId: "P1", endSupportId: "A2", startStation: 300, endStation: 450, spanLength: 150, startSupportSkew: null, endSupportSkew: null },
    ],
  }, {
    handoffId: "SH-2",
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-12T00:00:00.000Z",
    supports: [
      { supportId: "A1", supportType: "abutment", label: "A1", station: 100, position: { domainX: 0, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 95, roadReferenceId: "r", coordinateContextId: null },
      { supportId: "P1", supportType: "pier", label: "P1", station: 300, position: { domainX: 0, domainY: 0, elevation: 101 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 92, roadReferenceId: "r", coordinateContextId: null },
      { supportId: "A2", supportType: "abutment", label: "A2", station: 450, position: { domainX: 0, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 96, roadReferenceId: "r", coordinateContextId: null },
    ],
  });
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phase5-02-persist-"));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("Superstructure persistence (WP-I)", () => {
  it("serialize strips derived arrays (transient), deserialize round-trips", () => {
    const doc = makeDocument("PROJ-1");
    const serialized = serializeSuperstructureDocumentForPersistence(doc);
    expect(serialized.spanReferences).toBeNull();
    expect(serialized.supportReferences).toBeNull();
    expect(serialized.documentId).toBe(doc.documentId);
    expect(serialized.bridgeLayoutReference).toBeTruthy();
    const parsed = deserializeSuperstructureDocumentFromPersistence(serialized);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.document.documentId).toBe(doc.documentId);
      expect(parsed.document.spanReferences).toBeNull();
    }
  });

  it("deserialize rejects unsupported schemaVersion (fail-closed)", () => {
    const doc = makeDocument("PROJ-1");
    const result = deserializeSuperstructureDocumentFromPersistence({ ...doc, schemaVersion: "9.9.9" });
    expect(result.ok).toBe(false);
  });

  it("save -> restart -> restore -> derived regenerated from Bridge Layout", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();

    const project = applyBusinessMetadata(createEmptyProject("上部工縦断業務"), {
      businessNumber: "SUP-V-001",
      designStage: "bridge-detailed",
    });
    expect(manager.importProject(project)).toBe(true);
    seedRoad(manager, project.projectId);
    await manager.flushPendingSaves();

    // bridge layout with a pier
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

    // write superstructure document
    const doc = makeDocument(project.projectId);
    expect(writeSuperstructureDocument(manager, project.projectId, doc).ok).toBe(true);
    await manager.flushPendingSaves();

    // full app termination
    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    const restore = await manager2.restoreFromPersistence();
    expect(restore.restored).toBe(1);
    expect(restore.rejected).toBe(0);

    const restored = readSuperstructureDocument(manager2, project.projectId);
    expect(restored).toBeTruthy();
    expect(restored?.documentId).toBe(doc.documentId);
    // derived stripped in persisted form
    expect(restored?.spanReferences).toBeNull();
    expect(restored?.supportReferences).toBeNull();

    // regenerate derived from Bridge Layout
    const regenerated = regenerateSuperstructureDerived(manager2, project.projectId, restored!);
    expect(regenerated.spanReferences).not.toBeNull();
    expect(regenerated.spanReferences!.spans).toHaveLength(2);
    expect(regenerated.supportReferences).not.toBeNull();
    expect(regenerated.supportReferences!.supports).toHaveLength(3);
    // span derived from bridge layout (100-300-450)
    expect(regenerated.spanReferences!.spans[0].spanLength).toBe(200);
    expect(regenerated.spanReferences!.spans[1].spanLength).toBe(150);
  });

  it(".spacerproj round-trip includes the superstructure module", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("上部工パッケージ"), {
      businessNumber: "SUP-PKG-001",
      designStage: "bridge-detailed",
    });
    manager.importProject(project);
    const doc = makeDocument(project.projectId);
    expect(writeSuperstructureDocument(manager, project.projectId, doc).ok).toBe(true);
    await manager.flushPendingSaves();

    const savedProject = manager.getProject(project.projectId);
    expect(savedProject).toBeTruthy();
    const pkg = buildProjectPackage(savedProject!);
    expect(pkg.ok).toBe(true);
    if (!pkg.ok) return;
    const extracted = extractProjectFromPackage(pkg.pkg);
    expect(extracted).toBeTruthy();
    if (!extracted) return;
    const superModule = extracted.modules.superstructure as Record<string, unknown>;
    const superDoc = (superModule.data as Record<string, unknown>).superstructureDocument as Record<string, unknown> | undefined;
    expect(superDoc).toBeTruthy();
    expect(superDoc!.documentId).toBe(doc.documentId);
    // derived stripped in the package too
    expect(superDoc!.spanReferences).toBeNull();
  });
});
