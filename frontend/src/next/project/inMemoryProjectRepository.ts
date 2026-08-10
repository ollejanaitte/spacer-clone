import { parseProject } from "./projectDataCore";
import type { Project } from "./schema";
import type { ProjectRepository, ProjectRepositoryResult } from "./projectRepository";

export class InMemoryProjectRepository implements ProjectRepository {
  private store = new Map<string, Project>();

  create(project: Project): ProjectRepositoryResult {
    const parsed = parseProject(project);
    if (!parsed.ok) {
      return { ok: false, reason: "invalid", issues: parsed.issues };
    }
    if (this.store.has(parsed.project.projectId)) {
      return { ok: false, reason: "duplicate-id" };
    }
    this.store.set(parsed.project.projectId, parsed.project);
    return { ok: true, project: parsed.project };
  }

  get(projectId: string): Project | undefined {
    return this.store.get(projectId);
  }

  list(): readonly Project[] {
    return Array.from(this.store.values());
  }

  update(projectId: string, project: Project): ProjectRepositoryResult {
    if (!this.store.has(projectId)) {
      return { ok: false, reason: "not-found" };
    }
    const parsed = parseProject(project);
    if (!parsed.ok) {
      return { ok: false, reason: "invalid", issues: parsed.issues };
    }
    if (parsed.project.projectId !== projectId) {
      return { ok: false, reason: "invalid", issues: ["projectId mismatch"] };
    }
    this.store.set(projectId, parsed.project);
    return { ok: true, project: parsed.project };
  }

  delete(projectId: string): boolean {
    return this.store.delete(projectId);
  }
}
