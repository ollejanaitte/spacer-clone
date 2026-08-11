import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../project/projectDataCore";
import { NodeFileSystemGateway } from "../nodeFileSystemGateway";
import { MemoryFileSystemGateway } from "../memoryFileSystemGateway";
import { FilesystemProjectPersistence, PROJECT_JSON_FILE, BACKUP_EXTENSION, BACKUP_RETENTION_COUNT } from "../filesystemProjectPersistence";
import { FilesystemProjectRepository } from "../filesystemProjectRepository";

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "r1-04-"));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

function createPersistence() {
  const gateway = new NodeFileSystemGateway();
  const persistence = new FilesystemProjectPersistence(gateway, {
    rootDir: path.join(tempDir, "projects"),
  });
  return persistence;
}

describe("FilesystemProjectPersistence (real filesystem)", () => {
  it("saves a project to project.json under the project dir", async () => {
    const persistence = createPersistence();
    await persistence.initialize();
    const project = createEmptyProject("保存テスト業務");
    const result = await persistence.saveProject(project);
    expect(result.ok).toBe(true);
    const filePath = path.join(tempDir, "projects", project.projectId, PROJECT_JSON_FILE);
    const content = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(content);
    expect(parsed.projectId).toBe(project.projectId);
    expect(parsed.name).toBe("保存テスト業務");
  });

  it("rejects invalid project without writing", async () => {
    const persistence = createPersistence();
    await persistence.initialize();
    const project = { ...createEmptyProject("x"), name: "" } as never;
    const result = await persistence.saveProject(project);
    expect(result.ok).toBe(false);
    const filePath = path.join(tempDir, "projects", "invalid", PROJECT_JSON_FILE);
    await expect(fs.access(filePath)).rejects.toThrow();
  });

  it("loads all projects back from filesystem", async () => {
    const persistence = createPersistence();
    await persistence.initialize();
    const a = createEmptyProject("業務A");
    const b = createEmptyProject("業務B");
    await persistence.saveProject(a);
    await persistence.saveProject(b);
    const loaded = await persistence.loadAllProjects();
    expect(loaded.length).toBe(2);
    const ids = loaded.filter((r) => r.ok).map((r) => (r as { project: { projectId: string } }).project.projectId);
    expect(ids).toContain(a.projectId);
    expect(ids).toContain(b.projectId);
  });

  it("handles invalid JSON and invalid schema files safely", async () => {
    const persistence = createPersistence();
    await persistence.initialize();
    const project = createEmptyProject("正常業務");
    await persistence.saveProject(project);
    // bad json
    const badJsonDir = path.join(tempDir, "projects", "bad-json");
    await fs.mkdir(badJsonDir, { recursive: true });
    await fs.writeFile(path.join(badJsonDir, PROJECT_JSON_FILE), "{ not valid json", "utf8");
    // invalid schema
    const badSchemaDir = path.join(tempDir, "projects", "bad-schema");
    await fs.mkdir(badSchemaDir, { recursive: true });
    await fs.writeFile(path.join(badSchemaDir, PROJECT_JSON_FILE), JSON.stringify({ hello: 1 }), "utf8");

    const loaded = await persistence.loadAllProjects();
    const okCount = loaded.filter((r) => r.ok).length;
    const invalidJson = loaded.find((r) => !r.ok && (r as { projectId: string }).projectId === "bad-json");
    const invalidSchema = loaded.find((r) => !r.ok && (r as { projectId: string }).projectId === "bad-schema");
    expect(okCount).toBe(1);
    expect(invalidJson && !invalidJson.ok && (invalidJson as { reason: string }).reason).toContain("invalid-json");
    expect(invalidSchema && !invalidSchema.ok && (invalidSchema as { reason: string }).reason).toContain("invalid-schema");
  });

  it("deletes a project directory completely", async () => {
    const persistence = createPersistence();
    await persistence.initialize();
    const project = createEmptyProject("削除対象");
    await persistence.saveProject(project);
    const dirPath = path.join(tempDir, "projects", project.projectId);
    await expect(fs.access(dirPath)).resolves.toBeUndefined();
    const result = await persistence.deleteProject(project.projectId);
    expect(result.ok).toBe(true);
    await expect(fs.access(dirPath)).rejects.toThrow();
    expect(await persistence.loadAllProjects()).toHaveLength(0);
  });
});

describe("FilesystemProjectPersistence backups", () => {
  it("writes a backup file separated from the project source of truth", async () => {
    const persistence = createPersistence();
    await persistence.initialize();
    const project = createEmptyProject("バックアップ業務");
    await persistence.saveProject(project);
    const result = await persistence.writeBackup(project);
    expect(result.ok).toBe(true);
    const backups = await persistence.listBackupFiles(project.projectId);
    expect(backups.length).toBe(1);
    expect(backups[0].endsWith(BACKUP_EXTENSION)).toBe(true);
    const backupPath = path.join(tempDir, "projects", project.projectId, ".backup", backups[0]);
    const content = await fs.readFile(backupPath, "utf8");
    const parsed = JSON.parse(content);
    expect(parsed.projectId).toBe(project.projectId);
  });

  it("prunes backups beyond the retention count", async () => {
    const persistence = createPersistence();
    await persistence.initialize();
    const project = createEmptyProject("世代管理業務");
    await persistence.saveProject(project);
    for (let i = 0; i < BACKUP_RETENTION_COUNT + 3; i++) {
      await persistence.writeBackup(project);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const backups = await persistence.listBackupFiles(project.projectId);
    expect(backups.length).toBeLessThanOrEqual(BACKUP_RETENTION_COUNT);
    expect(backups.length).toBe(BACKUP_RETENTION_COUNT);
  });

  it("backup failure does not corrupt the project source of truth", async () => {
    const persistence = createPersistence();
    await persistence.initialize();
    const project = createEmptyProject("正本保護業務");
    await persistence.saveProject(project);
    const originalJson = await fs.readFile(
      path.join(tempDir, "projects", project.projectId, PROJECT_JSON_FILE),
      "utf8",
    );
    // force a backup write failure by using a read-only-ish scenario: project.json stays intact
    const badBackup = { ...project, name: "" } as never;
    const fail = await persistence.writeBackup(badBackup);
    expect(fail.ok).toBe(false);
    const afterJson = await fs.readFile(
      path.join(tempDir, "projects", project.projectId, PROJECT_JSON_FILE),
      "utf8",
    );
    expect(afterJson).toBe(originalJson);
  });
});

describe("FilesystemProjectRepository", () => {
  function createRepository(persistence: FilesystemProjectPersistence) {
    return new FilesystemProjectRepository(persistence);
  }

  it("create/get/list/update/delete work against the filesystem", async () => {
    const persistence = createPersistence();
    const repository = createRepository(persistence);
    await repository.initialize();

    const created = await repository.create(createEmptyProject("業務X"));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const got = await repository.get(created.project.projectId);
    expect(got?.name).toBe("業務X");
    expect((await repository.list()).length).toBe(1);

    const updated = await repository.update(created.project.projectId, { ...created.project, name: "業務X改訂" });
    expect(updated.ok).toBe(true);
    expect((await repository.get(created.project.projectId))?.name).toBe("業務X改訂");

    expect(await repository.delete(created.project.projectId)).toBe(true);
    expect(await repository.get(created.project.projectId)).toBeUndefined();
    expect((await repository.list()).length).toBe(0);
  });

  it("rejects duplicate projectId", async () => {
    const persistence = createPersistence();
    const repository = createRepository(persistence);
    await repository.initialize();
    const project = createEmptyProject("重複テスト");
    await repository.create(project);
    const duplicate = { ...project, name: "別名" };
    const result = await repository.create(duplicate);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("duplicate-id");
  });

  it("restores cache from filesystem on a fresh instance (restart equivalent)", async () => {
    const persistence1 = createPersistence();
    const repo1 = createRepository(persistence1);
    await repo1.initialize();
    const project = createEmptyProject("再起動テスト");
    await repo1.create(project);

    // simulate app restart with a brand new persistence/repository
    const persistence2 = createPersistence();
    const repo2 = createRepository(persistence2);
    await repo2.initialize();
    const restored = await repo2.get(project.projectId);
    expect(restored?.name).toBe("再起動テスト");
    expect(restored?.projectId).toBe(project.projectId);
  });
});

describe("MemoryFileSystemGateway", () => {
  it("behaves like a filesystem for UI tests", async () => {
    const gateway = new MemoryFileSystemGateway();
    await gateway.initialize("projects");
    expect(await gateway.writeTextFile("p1/project.json", "{}")).toEqual({ ok: true });
    const read = await gateway.readTextFile("p1/project.json");
    expect(read.ok && read.content).toBe("{}");
    expect(await gateway.listDirectories("")).toEqual(["p1"]);
    expect(await gateway.exists("p1")).toBe(true);
    await gateway.deleteDirectory("p1");
    expect(await gateway.exists("p1")).toBe(false);
  });
});
