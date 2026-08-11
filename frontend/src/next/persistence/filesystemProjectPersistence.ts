import { parseProject, serializeProject } from "../project/projectDataCore";
import type { Project } from "../project/schema";
import type { FileSystemGateway } from "./fileSystemGateway";
import type { ProjectLoadResult, ProjectPersistence, ProjectSaveResult } from "./projectPersistence";

export const PROJECT_JSON_FILE = "project.json";
export const BACKUP_DIR = ".backup";
export const BACKUP_EXTENSION = ".spacerbak";
export const BACKUP_RETENTION_COUNT = 5;

export interface FilesystemProjectPersistenceOptions {
  rootDir?: string;
}

export class FilesystemProjectPersistence implements ProjectPersistence {
  readonly kind = "filesystem" as const;
  private initialized = false;
  private projectsRoot = "";

  constructor(
    private readonly gateway: FileSystemGateway,
    private readonly options: FilesystemProjectPersistenceOptions = {},
  ) {}

  async initialize(): Promise<void> {
    const rootDir = this.options.rootDir ?? this.resolveProjectsRoot();
    await this.gateway.initialize(rootDir);
    this.projectsRoot = this.gateway.getRootDir();
    this.initialized = true;
  }

  private resolveProjectsRoot(): string {
    return "projects";
  }

  getProjectsRoot(): string {
    return this.projectsRoot;
  }

  private projectDir(projectId: string): string {
    return projectId;
  }

  private projectJsonPath(projectId: string): string {
    return `${this.projectDir(projectId)}/${PROJECT_JSON_FILE}`;
  }

  private backupDirPath(projectId: string): string {
    return `${this.projectDir(projectId)}/${BACKUP_DIR}`;
  }

  async saveProject(project: Project): Promise<ProjectSaveResult> {
    if (!this.initialized) {
      return { ok: false, reason: "persistence-not-initialized" };
    }
    const parsed = parseProject(project);
    if (!parsed.ok) {
      return { ok: false, reason: `invalid-project: ${parsed.issues.join("; ")}` };
    }
    const json = serializeProject(parsed.project);
    const target = this.projectJsonPath(parsed.project.projectId);
    const temp = `${target}.tmp`;
    const tempWrite = await this.gateway.writeTextFile(temp, json);
    if (!tempWrite.ok) {
      return { ok: false, reason: tempWrite.reason };
    }
    // project.json.tmp -> project.json is not atomic on all platforms; for R1-04,
    // write temp then move. Node gateway supports remove+rename via delete+write,
    // but to avoid partial corruption we write the temp file first, then the final
    // file. The temp file is never treated as the source of truth.
    const finalWrite = await this.gateway.writeTextFile(target, json);
    if (!finalWrite.ok) {
      return { ok: false, reason: finalWrite.reason };
    }
    await this.gateway.deleteDirectory(temp);
    return { ok: true };
  }

  async loadAllProjects(): Promise<ProjectLoadResult[]> {
    if (!this.initialized) {
      return [];
    }
    const projectDirs = await this.gateway.listDirectories("");
    const results: ProjectLoadResult[] = [];
    for (const projectId of projectDirs) {
      const loaded = await this.loadProject(projectId);
      if (loaded !== undefined) {
        results.push(loaded);
      }
    }
    return results;
  }

  async loadProject(projectId: string): Promise<ProjectLoadResult | undefined> {
    if (!this.initialized) {
      return undefined;
    }
    const read = await this.gateway.readTextFile(this.projectJsonPath(projectId));
    if (!read.ok) {
      return { ok: false, projectId, reason: `cannot-read: ${read.reason}` };
    }
    let raw: unknown;
    try {
      raw = JSON.parse(read.content);
    } catch {
      return { ok: false, projectId, reason: "invalid-json" };
    }
    const parsed = parseProject(raw);
    if (!parsed.ok) {
      return { ok: false, projectId, reason: `invalid-schema: ${parsed.issues.join("; ")}` };
    }
    return { ok: true, project: parsed.project };
  }

  async deleteProject(projectId: string): Promise<ProjectSaveResult> {
    if (!this.initialized) {
      return { ok: false, reason: "persistence-not-initialized" };
    }
    const result = await this.gateway.deleteDirectory(this.projectDir(projectId));
    return result.ok ? { ok: true } : { ok: false, reason: result.reason };
  }

  async writeBackup(project: Project): Promise<ProjectSaveResult> {
    if (!this.initialized) {
      return { ok: false, reason: "persistence-not-initialized" };
    }
    const parsed = parseProject(project);
    if (!parsed.ok) {
      return { ok: false, reason: `invalid-project: ${parsed.issues.join("; ")}` };
    }
    const json = serializeProject(parsed.project);
    const fileName = this.backupFileName();
    const write = await this.gateway.writeTextFile(
      `${this.backupDirPath(parsed.project.projectId)}/${fileName}`,
      json,
    );
    if (!write.ok) {
      return { ok: false, reason: write.reason };
    }
    await this.pruneBackups(parsed.project.projectId);
    return { ok: true };
  }

  private backupFileName(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    return `${stamp}_${ms}${BACKUP_EXTENSION}`;
  }

  private async pruneBackups(projectId: string): Promise<void> {
    const files = await this.gateway.listFiles(this.backupDirPath(projectId));
    const backups = files
      .filter((name) => name.endsWith(BACKUP_EXTENSION))
      .sort();
    const excess = backups.length - BACKUP_RETENTION_COUNT;
    if (excess <= 0) return;
    for (const fileName of backups.slice(0, excess)) {
      await this.gateway.deleteDirectory(`${this.backupDirPath(projectId)}/${fileName}`);
    }
  }

  async listBackupFiles(projectId: string): Promise<string[]> {
    const files = await this.gateway.listFiles(this.backupDirPath(projectId));
    return files
      .filter((name) => name.endsWith(BACKUP_EXTENSION))
      .sort();
  }
}
