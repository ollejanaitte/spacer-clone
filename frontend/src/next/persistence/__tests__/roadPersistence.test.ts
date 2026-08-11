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
import { writeRoadInputs, readRoadInputs } from "../../modules/roadModuleAdapter";
import { buildRoadIntermediate } from "../../modules/road/intermediateResult";
import { buildRoadCimGeometry } from "../../modules/road/roadCimGeometry";
import { buildProjectPackage } from "../package/projectPackageBuilder";
import { inspectPackageContent, extractProjectFromPackage } from "../package/projectPackageImporter";
import type { LinearAlignment } from "../../../liner/core/types";
import type { VerticalElement } from "../../../liner/core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../../liner/schema/types";

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phase2-11-"));
  resetProjectManagerForTest();
});

afterEach(async () => {
  resetProjectManagerForTest();
  await fs.rm(tempDir, { recursive: true, force: true });
});

function createPersistence() {
  return new FilesystemProjectPersistence(new NodeFileSystemGateway(), {
    rootDir: path.join(tempDir, "projects"),
  });
}

const HORIZONTAL: LinearAlignment = {
  id: "ALIGN-P11",
  linerModelId: "MODEL-1",
  coordinatePolicyId: "COORD-1",
  elements: [
    { id: "S1", type: "straight", start: { x: 0, y: 0 }, azimuth: 0, length: 100 },
    { id: "A1", type: "arc", start: { x: 100, y: 0 }, azimuth: 0, radius: 50, turn: "left", length: 50 },
  ],
};

const VERTICAL: VerticalElement[] = [
  { type: "grade", id: "G1", startPhysicalDistance: 0, startElevation: 10, grade: 0.01, length: 150 },
];

const CROSS: CrossSectionTemplateDraft = {
  id: "XS1",
  name: "標準",
  offsetLines: [
    { id: "L1", offset: -5.5, elevation: 0, role: "lane" },
    { id: "C1", offset: 0, elevation: 0, role: "lane" },
    { id: "R1", offset: 5.5, elevation: 0, role: "lane" },
  ],
  crossSlope: { signConvention: "right_down_positive", valuePercent: 2 },
};

describe("Phase 2-11 Road persistence / auto-save / .spacerproj vertical", () => {
  it("auto-saves road inputs, restores on restart, round-trips export/import, geometry reproduces", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();

    const project = applyBusinessMetadata(createEmptyProject("道路永続化業務"), {
      businessNumber: "P11-001",
      designStage: "road-preliminary",
    });
    expect(manager.importProject(project)).toBe(true);
    await manager.flushPendingSaves();

    // write full road inputs via adapter (auto-save path)
    const write = writeRoadInputs(manager, project.projectId, {
      label: "道路永続化テスト",
      horizontal: HORIZONTAL,
      vertical: VERTICAL,
      crossSections: [CROSS],
    });
    expect(write.ok).toBe(true);
    await manager.flushPendingSaves();

    // restart
    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    const restore = await manager2.restoreFromPersistence();
    expect(restore.restored).toBe(1);

    const restoredInputs = readRoadInputs(manager2, project.projectId);
    expect(restoredInputs.label).toBe("道路永続化テスト");
    expect(restoredInputs.horizontal).toEqual(HORIZONTAL);
    expect(restoredInputs.vertical).toEqual(VERTICAL);
    expect(restoredInputs.crossSections).toEqual([CROSS]);

    // geometry reproduces from restored inputs
    const horizontal = restoredInputs.horizontal as LinearAlignment;
    const vertical = restoredInputs.vertical as VerticalElement[];
    const crossSections = restoredInputs.crossSections as CrossSectionTemplateDraft[];
    const intermediate = buildRoadIntermediate({
      horizontal,
      vertical,
      crossSections,
      widthChangePoints: [],
      crossSlopeIntervals: [],
      stationDefinition: { originDisplayedStation: 0, equations: [] },
    }, { sampleInterval: 25 });
    expect(intermediate.ok).toBe(true);
    expect(intermediate.totalLength).toBeCloseTo(150, 6);
    expect(intermediate.sample(50)?.z).toBeCloseTo(10.5, 6);

    const cim = buildRoadCimGeometry({
      horizontal,
      vertical,
      crossSection: crossSections[0],
      stationInterval: 25,
    });
    expect(cim.surface.vertices.length).toBeGreaterThan(0);

    // export .spacerproj
    const built = buildProjectPackage(manager2.getProject(project.projectId)!);
    if (!built.ok) throw new Error("build failed");

    // import into fresh environment
    resetProjectManagerForTest();
    const persistence3 = createPersistence();
    setPersistenceForTest(persistence3);
    const manager3 = getProjectManager();
    const inspected = inspectPackageContent("pcb.spacerproj", built.json);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    const imported = extractProjectFromPackage(inspected.pkg!);
    if (!imported) throw new Error("extract failed");
    expect(manager3.importProject(imported)).toBe(true);
    await manager3.flushPendingSaves();

    const importedInputs = readRoadInputs(manager3, project.projectId);
    expect(importedInputs.horizontal).toEqual(HORIZONTAL);
    expect(importedInputs.vertical).toEqual(VERTICAL);
    expect(importedInputs.crossSections).toEqual([CROSS]);
  });

  it("does not persist invalid road inputs", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("無効道路業務"), {
      businessNumber: "P11-BAD",
      designStage: "road-preliminary",
    });
    manager.importProject(project);
    await manager.flushPendingSaves();

    const bad = writeRoadInputs(manager, project.projectId, { label: 42 as never });
    expect(bad.ok).toBe(false);
    // nothing bad written; project untouched
    const restored = readRoadInputs(manager, project.projectId);
    expect(restored.label).toBeUndefined();
  });
});
