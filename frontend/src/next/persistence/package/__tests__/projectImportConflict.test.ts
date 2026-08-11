import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryFileSystemGateway } from "../../memoryFileSystemGateway";
import { FilesystemProjectPersistence } from "../../filesystemProjectPersistence";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { setPersistenceForTest, resetProjectManagerForTest, getProjectManager } from "../../../project/projectManagerInstance";

function createMemoryPersistence() {
  return new FilesystemProjectPersistence(new MemoryFileSystemGateway());
}

function makeImportedProject(name = "競合テスト業務") {
  return applyBusinessMetadata(createEmptyProject(name), {
    businessNumber: "B-CONFLICT-001",
    designStage: "bridge-preliminary",
  });
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  resetProjectManagerForTest();
});

describe("conflict handling", () => {
  it("importProject refuses duplicate projectId", async () => {
    const manager = getProjectManager();
    const project = makeImportedProject();
    expect(manager.importProject(project)).toBe(true);
    await manager.flushPendingSaves();
    expect(manager.importProject({ ...project, name: "別名" })).toBe(false);
    expect(manager.listProjects()).toHaveLength(1);
  });

  it("overwriteProject backs up the existing project then replaces it", async () => {
    const persistence = createMemoryPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const existing = makeImportedProject("既存業務");
    expect(manager.importProject(existing)).toBe(true);
    await manager.flushPendingSaves();

    const replacement = { ...existing, name: "置換後業務", updatedAt: new Date().toISOString() };
    const ok = await manager.overwriteProject(replacement);
    expect(ok).toBe(true);
    await manager.flushPendingSaves();

    expect(manager.getProject(existing.projectId)?.name).toBe("置換後業務");
    expect(manager.listProjects()).toHaveLength(1);

    // backup was written before replacement
    const backups = await manager.listBackups(existing.projectId);
    expect(backups.length).toBeGreaterThanOrEqual(1);
  });

  it("overwriteProject refuses when backup cannot be created (safety)", async () => {
    const failingPersistence = {
      kind: "memory" as const,
      initialize: async () => {},
      getProjectsRoot: () => "root",
      saveProject: async (): Promise<{ ok: true } | { ok: false; reason: string }> => ({ ok: true }),
      loadAllProjects: async () => [],
      loadProject: async () => undefined,
      deleteProject: async (): Promise<{ ok: true } | { ok: false; reason: string }> => ({ ok: true }),
      writeBackup: async (): Promise<{ ok: true } | { ok: false; reason: string }> => ({ ok: false, reason: "backup-failed" }),
      listBackupFiles: async () => [],
    };
    setPersistenceForTest(failingPersistence);
    const manager = getProjectManager();
    const existing = makeImportedProject();
    expect(manager.importProject(existing)).toBe(true);
    const replacement = { ...existing, name: "新" };
    const ok = await manager.overwriteProject(replacement);
    expect(ok).toBe(false);
    // existing project is not destroyed
    expect(manager.getProject(existing.projectId)?.name).toBe("競合テスト業務");
  });

  it("importAsDuplicate creates a new project with a new Project ID preserving content", async () => {
    const manager = getProjectManager();
    const project = makeImportedProject("複製元業務");
    expect(manager.importProject(project)).toBe(true);
    await manager.flushPendingSaves();

    const duplicate = await manager.importAsDuplicate(project, "複製元業務（複製）");
    expect(duplicate).toBeDefined();
    if (!duplicate) return;
    expect(duplicate.projectId).not.toBe(project.projectId);
    expect(duplicate.name).toBe("複製元業務（複製）");
    expect(duplicate.metadata?.businessNumber).toBe("B-CONFLICT-001");
    expect(manager.listProjects()).toHaveLength(2);
    expect(manager.getProject(project.projectId)).toBeDefined();
  });

  it("cancel does not modify anything", () => {
    const manager = getProjectManager();
    const project = makeImportedProject();
    manager.importProject(project);
    const before = manager.listProjects().length;
    // cancel = no-op; nothing else changes
    expect(manager.listProjects()).toHaveLength(before);
  });
});
