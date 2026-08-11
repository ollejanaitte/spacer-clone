import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryFileSystemGateway } from "../../memoryFileSystemGateway";
import { FilesystemProjectPersistence } from "../../filesystemProjectPersistence";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { buildProjectPackage } from "../projectPackageBuilder";
import { inspectPackageContent, extractProjectFromPackage } from "../projectPackageImporter";
import { exportProjectToPackage } from "../projectPackageExporter";
import { setPersistenceForTest, resetProjectManagerForTest, getProjectManager } from "../../../project/projectManagerInstance";
import * as projectFileDialog from "../../../../desktop/projectFileDialog";

function createMemoryPersistence() {
  return new FilesystemProjectPersistence(new MemoryFileSystemGateway());
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  resetProjectManagerForTest();
  vi.restoreAllMocks();
});

describe("Export -> Import round-trip", () => {
  it("preserves Project Data Core values through export and import", async () => {
    const persistence = createMemoryPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();

    // Build original project with rich metadata
    const original = applyBusinessMetadata(createEmptyProject("円滑な橋梁詳細設計業務"), {
      businessNumber: "RT-2026-777",
      designStage: "other",
      designStageCustomLabel: "耐震照査",
    });

    // Register original via manager (in-memory + persistence)
    expect(manager.importProject(original)).toBe(true);
    await manager.flushPendingSaves();

    // Export: capture package JSON written through saveSpacerProjFile
    const spy = vi.spyOn(projectFileDialog, "saveSpacerProjFile").mockResolvedValue({
      canceled: false,
      filePath: "/tmp/roundtrip.spacerproj",
    } as never);
    const exportResult = await exportProjectToPackage(original);
    expect(exportResult.ok).toBe(true);
    const packageJson = spy.mock.calls[0]?.[0] as string;
    expect(packageJson).toBeTruthy();

    // Inspect package (pre-import check)
    const inspected = inspectPackageContent("roundtrip.spacerproj", packageJson);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;

    // Extract project from package
    const extracted = extractProjectFromPackage(inspected.pkg!);
    expect(extracted).toBeDefined();
    if (!extracted) return;

    // Round-trip assertions: core Project Data values match
    expect(extracted.projectId).toBe(original.projectId);
    expect(extracted.name).toBe(original.name);
    expect(extracted.schemaVersion).toBe(original.schemaVersion);
    expect(extracted.createdAt).toBe(original.createdAt);
    expect(extracted.updatedAt).toBe(original.updatedAt);
    expect(extracted.metadata?.businessNumber).toBe("RT-2026-777");
    expect(extracted.metadata?.designStage).toBe("other");
    expect(extracted.metadata?.designStageCustomLabel).toBe("耐震照査");
    expect(extracted.modules).toEqual(original.modules);
  });

  it("round-trips through the manager: import into a fresh environment", async () => {
    // environment A: create + export
    const persistenceA = createMemoryPersistence();
    setPersistenceForTest(persistenceA);
    const managerA = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("PC-A業務"), {
      businessNumber: "RT-A-001",
      designStage: "road-detailed",
    });
    managerA.importProject(project);
    await managerA.flushPendingSaves();
    const built = buildProjectPackage(project);
    if (!built.ok) return;

    // "other PC" environment B: fresh manager + fresh persistence
    resetProjectManagerForTest();
    const persistenceB = createMemoryPersistence();
    setPersistenceForTest(persistenceB);
    const managerB = getProjectManager();
    expect(managerB.listProjects()).toHaveLength(0);

    const inspected = inspectPackageContent("pcb.spacerproj", built.json);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    const extracted = extractProjectFromPackage(inspected.pkg!);
    if (!extracted) return;

    expect(managerB.importProject(extracted)).toBe(true);
    await managerB.flushPendingSaves();
    expect(managerB.listProjects()).toHaveLength(1);
    expect(managerB.getProject(project.projectId)?.name).toBe("PC-A業務");
    expect(managerB.getProject(project.projectId)?.metadata?.businessNumber).toBe("RT-A-001");
  });
});

describe("corrupted package does not contaminate existing projects (R1-05 requirement)", () => {
  it("importing a corrupted package never touches the existing project", async () => {
    const persistence = createMemoryPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const existing = applyBusinessMetadata(createEmptyProject("既存業務"), {
      businessNumber: "EXIST-1",
      designStage: "bridge-preliminary",
    });
    expect(manager.importProject(existing)).toBe(true);
    await manager.flushPendingSaves();
    const before = manager.listProjects().length;

    // Corrupted package (invalid JSON) attempts import -> rejected
    const corrupted = "{ broken";
    const inspected = inspectPackageContent("corrupt.spacerproj", corrupted);
    expect(inspected.ok).toBe(false);

    // No partial data is registered; existing project untouched
    expect(manager.listProjects()).toHaveLength(before);
    expect(manager.getProject(existing.projectId)?.name).toBe("既存業務");
    // The auto-save backup of the existing project is intact (backup from registration only)
    expect((await manager.listBackups(existing.projectId)).length).toBeLessThanOrEqual(1);
  });

  it("path-traversal package is rejected before any registration", async () => {
    const manager = getProjectManager();
    const project = applyBusinessMetadata(createEmptyProject("安全業務"), {
      businessNumber: "SAFE-1",
      designStage: "road-preliminary",
    });
    const built = buildProjectPackage(project);
    if (!built.ok) return;
    const malicious = {
      ...built.pkg,
      files: [...built.pkg.files, { path: "../../etc/passwd", content: "x" }],
    };
    const inspected = inspectPackageContent("malicious.spacerproj", JSON.stringify(malicious));
    expect(inspected.ok).toBe(false);
    if (!inspected.ok) expect(inspected.reason).toBe("unsafe-path-in-package");
    expect(manager.listProjects()).toHaveLength(0);
  });
});
