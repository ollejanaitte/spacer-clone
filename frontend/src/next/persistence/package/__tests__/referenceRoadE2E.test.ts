import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { NodeFileSystemGateway } from "../../nodeFileSystemGateway";
import { FilesystemProjectPersistence } from "../../filesystemProjectPersistence";
import { setPersistenceForTest, resetProjectManagerForTest, getProjectManager } from "../../../project/projectManagerInstance";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { createEmptyProject } from "../../../project/projectDataCore";
import { writeRoadInputs, readRoadInputs } from "../../../modules/roadModuleAdapter";
import { buildRoadIntermediate } from "../../../modules/road/intermediateResult";
import { buildRoadCimGeometry } from "../../../modules/road/roadCimGeometry";
import { buildRoadMesh } from "../../../modules/road/roadMesh";
import { buildProjectPackage } from "../../package/projectPackageBuilder";
import { inspectPackageContent, extractProjectFromPackage } from "../../package/projectPackageImporter";
import { createMountainRoadSample } from "../../../modules/road/referenceSamples";
import type { LinearAlignment } from "../../../../liner/core/types";
import type { VerticalElement } from "../../../../liner/core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../../../liner/schema/types";

let tempDir: string;

function createPersistence() {
  return new FilesystemProjectPersistence(new NodeFileSystemGateway(), {
    rootDir: path.join(tempDir, "projects"),
  });
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phase2-12-"));
  resetProjectManagerForTest();
});

afterEach(async () => {
  resetProjectManagerForTest();
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("Phase 2-12 Reference Road E2E (mountain road)", () => {
  it("runs the full Phase 2 vertical: intermediate -> 3D -> CIM -> save -> restart -> export -> import", async () => {
    const sample = createMountainRoadSample();
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();

    const project = applyBusinessMetadata(createEmptyProject(sample.name), {
      businessNumber: "REF-MTN-001",
      designStage: "road-detailed",
    });
    expect(manager.importProject(project)).toBe(true);
    await manager.flushPendingSaves();

    // write reference road inputs
    const write = writeRoadInputs(manager, project.projectId, {
      label: sample.name,
      horizontal: sample.horizontal,
      vertical: sample.vertical,
      crossSections: sample.crossSections,
    });
    expect(write.ok).toBe(true);
    await manager.flushPendingSaves();

    // intermediate result over the reference
    const intermediate = buildRoadIntermediate({
      horizontal: sample.horizontal,
      vertical: sample.vertical,
      crossSections: sample.crossSections,
      widthChangePoints: sample.widthChangePoints,
      crossSlopeIntervals: sample.crossSlopeIntervals,
      stationDefinition: sample.stationDefinition,
    }, { sampleInterval: 20 });
    expect(intermediate.ok).toBe(true);
    expect(intermediate.totalLength).toBeCloseTo(500, 6);
    expect(intermediate.samplePoints.length).toBeGreaterThan(5);
    // arc region curvature non-zero
    const arcPoint = intermediate.sample(240);
    expect(arcPoint).toBeDefined();
    if (arcPoint) expect(arcPoint.curvature).toBeGreaterThan(0);

    // 3D mesh and CIM
    const mesh = buildRoadMesh({
      horizontal: sample.horizontal,
      vertical: sample.vertical,
      crossSection: sample.crossSections[0],
      widthChangePoints: sample.widthChangePoints,
      crossSlopeIntervals: sample.crossSlopeIntervals,
      stationInterval: 10,
    });
    expect(mesh.vertices.length).toBeGreaterThan(0);
    expect(mesh.triangles.length).toBeGreaterThan(0);

    const cim = buildRoadCimGeometry({
      horizontal: sample.horizontal,
      vertical: sample.vertical,
      crossSection: sample.crossSections[0],
      widthChangePoints: sample.widthChangePoints,
      crossSlopeIntervals: sample.crossSlopeIntervals,
      stationInterval: 10,
    });
    expect(cim.surface.vertices.length).toBe(mesh.vertices.length);

    // restart
    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    const restore = await manager2.restoreFromPersistence();
    expect(restore.restored).toBe(1);

    const restoredInputs = readRoadInputs(manager2, project.projectId);
    expect(restoredInputs.horizontal).toEqual(sample.horizontal);
    expect(restoredInputs.vertical).toEqual(sample.vertical);
    expect(restoredInputs.crossSections).toEqual(sample.crossSections);

    // geometry reproduces from restored
    const rIntermediate = buildRoadIntermediate({
      horizontal: restoredInputs.horizontal as LinearAlignment,
      vertical: restoredInputs.vertical as VerticalElement[],
      crossSections: restoredInputs.crossSections as CrossSectionTemplateDraft[],
      widthChangePoints: sample.widthChangePoints,
      crossSlopeIntervals: sample.crossSlopeIntervals,
      stationDefinition: sample.stationDefinition,
    }, { sampleInterval: 20 });
    expect(rIntermediate.totalLength).toBeCloseTo(500, 6);

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

    const importedInputs = readRoadInputs(manager3, project.projectId);
    expect(importedInputs.horizontal).toEqual(sample.horizontal);
    expect(importedInputs.crossSections).toEqual(sample.crossSections);
  });

  it("rejects corrupted road inputs (never persists invalid data)", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("無効道路"), {
      businessNumber: "BAD",
      designStage: "road-preliminary",
    });
    manager.importProject(project);
    await manager.flushPendingSaves();

    const bad = writeRoadInputs(manager, project.projectId, { label: 42 as never });
    expect(bad.ok).toBe(false);
    // project remains valid; no partial data
    const restored = readRoadInputs(manager, project.projectId);
    expect(restored.label).toBeUndefined();
  });
});
