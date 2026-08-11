import { parseProject } from "../project/projectDataCore";
import type { Project } from "../project/schema";
import type { ProjectPersistence } from "./projectPersistence";

export type FilesystemRepositoryResult =
  | { ok: true; project: Project }
  | { ok: false; reason: "not-found" | "invalid" | "duplicate-id" | "write-failed"; issues?: string[] };

export class FilesystemProjectRepository {
  private cache = new Map<string, Project>();
  private initialized = false;

  constructor(
    private readonly persistence: ProjectPersistence,
  ) {}

  async initialize(): Promise<void> {
    await this.persistence.initialize();
    await this.restoreCache();
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private async restoreCache(): Promise<void> {
    this.cache.clear();
    const loaded = await this.persistence.loadAllProjects();
    for (const result of loaded) {
      if (result.ok) {
        this.cache.set(result.project.projectId, result.project);
      }
    }
  }

  async create(project: Project): Promise<FilesystemRepositoryResult> {
    const parsed = parseProject(project);
    if (!parsed.ok) {
      return { ok: false, reason: "invalid", issues: parsed.issues };
    }
    if (this.cache.has(parsed.project.projectId)) {
      return { ok: false, reason: "duplicate-id" };
    }
    const saved = await this.persistence.saveProject(parsed.project);
    if (!saved.ok) {
      return { ok: false, reason: "write-failed", issues: [saved.reason] };
    }
    this.cache.set(parsed.project.projectId, parsed.project);
    return { ok: true, project: parsed.project };
  }

  async get(projectId: string): Promise<Project | undefined> {
    return this.cache.get(projectId);
  }

  async list(): Promise<readonly Project[]> {
    return Array.from(this.cache.values());
  }

  async update(projectId: string, project: Project): Promise<FilesystemRepositoryResult> {
    if (!this.cache.has(projectId)) {
      return { ok: false, reason: "not-found" };
    }
    const parsed = parseProject(project);
    if (!parsed.ok) {
      return { ok: false, reason: "invalid", issues: parsed.issues };
    }
    if (parsed.project.projectId !== projectId) {
      return { ok: false, reason: "invalid", issues: ["projectId mismatch"] };
    }
    const saved = await this.persistence.saveProject(parsed.project);
    if (!saved.ok) {
      return { ok: false, reason: "write-failed", issues: [saved.reason] };
    }
    this.cache.set(projectId, parsed.project);
    return { ok: true, project: parsed.project };
  }

  async delete(projectId: string): Promise<boolean> {
    if (!this.cache.has(projectId)) {
      return false;
    }
    const result = await this.persistence.deleteProject(projectId);
    if (!result.ok) {
      return false;
    }
    this.cache.delete(projectId);
    return true;
  }
}
