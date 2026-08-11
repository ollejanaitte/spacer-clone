import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeFileSystemGateway } from "../nodeFileSystemGateway";
import { FilesystemProjectPersistence, BACKUP_EXTENSION, BACKUP_RETENTION_COUNT } from "../filesystemProjectPersistence";
import { getProjectManager, setPersistenceForTest, resetProjectManagerForTest } from "../../project/projectManagerInstance";

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "r1-04-backup-"));
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

describe("auto-backup generation (R1-04)", () => {
  it("auto-save generates a backup separated from the project source of truth", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const created = manager.createProject({
      name: "バックアップ業務",
      businessNumber: "BK-001",
      designStage: "road-detailed",
    });
    if (!created.ok) throw new Error("create failed");
    await manager.flushPendingSaves();

    // Source of truth: project.json
    const projectJson = path.join(tempDir, "projects", created.project.projectId, "project.json");
    await expect(fs.access(projectJson)).resolves.toBeUndefined();

    // Backup: .backup/<timestamp>.spacerbak, clearly separated
    const backups = await manager.listBackups(created.project.projectId);
    expect(backups.length).toBe(1);
    expect(backups[0].endsWith(BACKUP_EXTENSION)).toBe(true);
    const backupPath = path.join(tempDir, "projects", created.project.projectId, ".backup", backups[0]);
    const backupContent = await fs.readFile(backupPath, "utf8");
    expect(backupContent).toContain(created.project.projectId);
  });

  it("multiple auto-saves are pruned to the retention count", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const created = manager.createProject({
      name: "世代管理業務",
      businessNumber: "BK-002",
      designStage: "bridge-preliminary",
    });
    if (!created.ok) throw new Error("create failed");
    await manager.flushPendingSaves();

    for (let i = 0; i < BACKUP_RETENTION_COUNT + 2; i++) {
      manager.updateProject(created.project.projectId, { name: `更新 ${i}` });
      await manager.flushPendingSaves();
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    const backups = await manager.listBackups(created.project.projectId);
    expect(backups.length).toBe(BACKUP_RETENTION_COUNT);
  });

  it("backup does not serve as source of truth (project.json still authoritative)", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const created = manager.createProject({
      name: "正本優先業務",
      businessNumber: "BK-003",
      designStage: "road-preliminary",
    });
    if (!created.ok) throw new Error("create failed");
    await manager.flushPendingSaves();

    // Delete the backup only; the source of truth remains and restores fine.
    const backupDir = path.join(tempDir, "projects", created.project.projectId, ".backup");
    await fs.rm(backupDir, { recursive: true, force: true });

    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    const restore = await manager2.restoreFromPersistence();
    expect(restore.restored).toBe(1);
    expect(manager2.getProject(created.project.projectId)?.name).toBe("正本優先業務");
  });
});
