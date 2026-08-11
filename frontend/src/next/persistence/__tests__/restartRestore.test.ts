// @vitest-environment jsdom
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeFileSystemGateway } from "../nodeFileSystemGateway";
import { FilesystemProjectPersistence } from "../filesystemProjectPersistence";
import { PersistentProjectManager } from "../../project/persistentProjectManager";
import { InMemoryProjectRepository } from "../../project/inMemoryProjectRepository";
import { createEmptyProject } from "../../project/projectDataCore";
import { getProjectManager, setPersistenceForTest, resetProjectManagerForTest } from "../../project/projectManagerInstance";

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "r1-04-restore-"));
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

describe("restart restore vertical (real filesystem)", () => {
  it("project survives full restart and is restored to the business list", async () => {
    // First app session: create + edit a project, auto-save completes.
    const persistence1 = createPersistence();
    setPersistenceForTest(persistence1);
    const manager1 = getProjectManager();
    const created = manager1.createProject({
      name: "再起動復元業務",
      businessNumber: "RST-001",
      designStage: "bridge-detailed",
    });
    if (!created.ok) throw new Error("create failed");
    manager1.updateProject(created.project.projectId, { name: "再起動復元業務（改訂）" });
    await manager1.flushPendingSaves();

    // App fully terminates: simulate by resetting the manager (new instance).
    resetProjectManagerForTest();

    // Second app session: fresh manager backed by the same filesystem.
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    const restore = await manager2.restoreFromPersistence();
    expect(restore.restored).toBe(1);
    expect(restore.rejected).toBe(0);

    // Business list is rebuilt from filesystem.
    const projects = manager2.listProjects();
    expect(projects.length).toBe(1);
    const restored = manager2.getProject(created.project.projectId);
    expect(restored?.name).toBe("再起動復元業務（改訂）");
    expect(restored?.metadata?.businessNumber).toBe("RST-001");
  });

  it("preserves business number and design stage across restart", async () => {
    const persistence1 = createPersistence();
    setPersistenceForTest(persistence1);
    const manager1 = getProjectManager();
    const created = manager1.createProject({
      name: "保存内容検証",
      businessNumber: "RST-002",
      designStage: "other",
      designStageCustomLabel: "耐震照査",
    });
    if (!created.ok) throw new Error("create failed");
    await manager1.flushPendingSaves();

    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    await manager2.restoreFromPersistence();

    const restored = manager2.getProject(created.project.projectId);
    expect(restored?.name).toBe("保存内容検証");
    const businessNumber = restored?.metadata?.businessNumber;
    const designStage = restored?.metadata?.designStage;
    const custom = restored?.metadata?.designStageCustomLabel;
    expect(businessNumber).toBe("RST-002");
    expect(designStage).toBe("other");
    expect(custom).toBe("耐震照査");
  });

  it("deleted projects do not come back after restart", async () => {
    const persistence1 = createPersistence();
    setPersistenceForTest(persistence1);
    const manager1 = getProjectManager();
    const a = manager1.createProject({ name: "業務A", businessNumber: "A", designStage: "road-preliminary" });
    const b = manager1.createProject({ name: "業務B", businessNumber: "B", designStage: "road-detailed" });
    if (!a.ok || !b.ok) throw new Error("create failed");
    await manager1.flushPendingSaves();
    manager1.deleteProject(a.project.projectId);
    await manager1.flushPendingSaves();

    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    await manager2.restoreFromPersistence();
    const ids = manager2.listProjects().map((p) => p.projectId);
    expect(ids).toContain(b.project.projectId);
    expect(ids).not.toContain(a.project.projectId);
  });
});

describe("restoreFromPersistence with invalid files", () => {
  it("skips invalid project.json files and reports rejected count", async () => {
    const persistence = createPersistence();
    await persistence.initialize();
    const manager = new PersistentProjectManager(new InMemoryProjectRepository(), persistence);

    // valid project
    await persistence.saveProject(createEmptyProject("正常業務"));
    // invalid JSON
    const badDir = path.join(tempDir, "projects", "bad-json");
    await fs.mkdir(badDir, { recursive: true });
    await fs.writeFile(path.join(badDir, "project.json"), "{ nope", "utf8");

    const restore = await manager.restoreFromPersistence();
    expect(restore.restored).toBe(1);
    expect(restore.rejected).toBe(1);
  });
});
