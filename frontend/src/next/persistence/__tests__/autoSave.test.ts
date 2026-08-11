import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { MemoryFileSystemGateway } from "../memoryFileSystemGateway";
import { FilesystemProjectPersistence } from "../filesystemProjectPersistence";
import { setPersistenceForTest, resetProjectManagerForTest, getProjectManager } from "../../project/projectManagerInstance";

function createMemoryPersistence() {
  return new FilesystemProjectPersistence(new MemoryFileSystemGateway());
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  resetProjectManagerForTest();
});

describe("PersistentProjectManager auto-save", () => {
  it("saves a created project to persistence and reports saved state", async () => {
    const persistence = createMemoryPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const states: string[] = [];
    manager.onSaveState((s) => states.push(s));

    const result = manager.createProject({
      name: "自動保存テスト",
      businessNumber: "B-AS-001",
      designStage: "road-detailed",
    });
    expect(result.ok).toBe(true);
    await manager.flushPendingSaves();

    const loaded = await persistence.loadAllProjects();
    expect(loaded.filter((r) => r.ok).length).toBe(1);
    expect(states).toContain("saving");
    expect(states).toContain("saved");
    expect(manager.getSaveState()).toBe("saved");
  });

  it("auto-saves an updated project", async () => {
    const persistence = createMemoryPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const created = manager.createProject({
      name: "編集前",
      businessNumber: "B-AS-002",
      designStage: "bridge-preliminary",
    });
    if (!created.ok) throw new Error("create failed");
    await manager.flushPendingSaves();

    const updated = manager.updateProject(created.project.projectId, { name: "編集後" });
    expect(updated.ok).toBe(true);
    await manager.flushPendingSaves();

    const loaded = await persistence.loadAllProjects();
    const restored = loaded.find((r) => r.ok && (r as { project: { projectId: string } }).project.projectId === created.project.projectId);
    expect(restored && restored.ok && (restored as { project: { name: string } }).project.name).toBe("編集後");
    expect(manager.getSaveState()).toBe("saved");
  });

  it("auto-saves duplicate and delete operations", async () => {
    const persistence = createMemoryPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const created = manager.createProject({
      name: "複製元",
      businessNumber: "B-AS-003",
      designStage: "road-preliminary",
    });
    if (!created.ok) throw new Error("create failed");
    await manager.flushPendingSaves();

    const duplicated = manager.duplicateProject(created.project.projectId);
    expect(duplicated.ok).toBe(true);
    await manager.flushPendingSaves();
    expect((await persistence.loadAllProjects()).filter((r) => r.ok).length).toBe(2);

    expect(manager.deleteProject(created.project.projectId)).toBe(true);
    await manager.flushPendingSaves();
    expect((await persistence.loadAllProjects()).filter((r) => r.ok).length).toBe(1);
  });

  it("reports failed state when persistence write fails", async () => {
    const failingPersistence = {
      kind: "memory" as const,
      initialize: async () => {},
      getProjectsRoot: () => "root",
      saveProject: async () => ({ ok: false, reason: "disk-error" }),
      loadAllProjects: async () => [],
      loadProject: async () => undefined,
      deleteProject: async () => ({ ok: false, reason: "disk-error" }),
      writeBackup: async () => ({ ok: false, reason: "disk-error" }),
      listBackupFiles: async () => [],
    };
    setPersistenceForTest(failingPersistence);
    const manager = getProjectManager();
    const states: string[] = [];
    manager.onSaveState((s) => states.push(s));

    const result = manager.createProject({
      name: "失敗テスト",
      businessNumber: "B-FAIL",
      designStage: "other",
    });
    expect(result.ok).toBe(true);
    await manager.flushPendingSaves();
    expect(states).toContain("failed");
    expect(manager.getSaveState()).toBe("failed");
  });

  it("does not corrupt the in-memory repository when persistence fails", async () => {
    const failingPersistence = {
      kind: "memory" as const,
      initialize: async () => {},
      getProjectsRoot: () => "root",
      saveProject: async () => ({ ok: false, reason: "disk-error" }),
      loadAllProjects: async () => [],
      loadProject: async () => undefined,
      deleteProject: async () => ({ ok: false, reason: "disk-error" }),
      writeBackup: async () => ({ ok: false, reason: "disk-error" }),
      listBackupFiles: async () => [],
    };
    setPersistenceForTest(failingPersistence);
    const manager = getProjectManager();
    const created = manager.createProject({
      name: "保持テスト",
      businessNumber: "B-HOLD",
      designStage: "road-detailed",
    });
    if (!created.ok) throw new Error("create failed");
    await manager.flushPendingSaves();
    expect(manager.listProjects()).toHaveLength(1);
    expect(manager.getProject(created.project.projectId)?.name).toBe("保持テスト");
  });
});

describe("Save status UI integration", () => {
  it("SaveStatusIndicator shows saved after create", async () => {
    const persistence = createMemoryPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    manager.createProject({
      name: "UI状態テスト",
      businessNumber: "B-UI-001",
      designStage: "bridge-detailed",
    });
    await manager.flushPendingSaves();
    expect(manager.getSaveState()).toBe("saved");
  });
});
