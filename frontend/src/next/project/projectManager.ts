import {
  applyBusinessMetadata,
  type BusinessMetadataInput,
} from "./businessMetadata";
import { createEmptyProject, generateProjectId, parseProject } from "./projectDataCore";
import type { Project, ProjectModuleKey } from "./schema";
import type { ProjectRepository, ProjectRepositoryResult } from "./projectRepository";

export interface CreateProjectInput extends BusinessMetadataInput {
  name: string;
}

export interface UpdateProjectInput {
  name?: string;
  businessNumber?: string;
  designStage?: BusinessMetadataInput["designStage"];
  designStageCustomLabel?: string | null;
}

export class ProjectManager {
  constructor(protected readonly repository: ProjectRepository) {}

  createProject(input: CreateProjectInput): ProjectRepositoryResult {
    const base = createEmptyProject(input.name);
    const withMetadata = applyBusinessMetadata(base, {
      businessNumber: input.businessNumber,
      designStage: input.designStage,
      designStageCustomLabel: input.designStageCustomLabel,
    });
    return this.repository.create(withMetadata);
  }

  getProject(projectId: string): Project | undefined {
    return this.repository.get(projectId);
  }

  listProjects(): readonly Project[] {
    return this.repository.list();
  }

  updateProject(projectId: string, input: UpdateProjectInput): ProjectRepositoryResult {
    const existing = this.repository.get(projectId);
    if (!existing) {
      return { ok: false, reason: "not-found" };
    }
    const merged: Project = {
      ...existing,
      name: input.name !== undefined ? input.name : existing.name,
      metadata: {
        ...existing.metadata,
        ...(input.businessNumber !== undefined
          ? { businessNumber: input.businessNumber }
          : {}),
        ...(input.designStage !== undefined
          ? {
              designStage: input.designStage,
              ...(input.designStage === "other" && input.designStageCustomLabel
                ? { designStageCustomLabel: input.designStageCustomLabel }
                : {}),
            }
          : {}),
      },
      updatedAt: new Date().toISOString(),
    };
    return this.repository.update(projectId, merged);
  }

  updateProjectModule(
    projectId: string,
    moduleId: ProjectModuleKey,
    moduleData: Record<string, unknown>,
  ): ProjectRepositoryResult {
    const existing = this.repository.get(projectId);
    if (!existing) {
      return { ok: false, reason: "not-found" };
    }
    const merged: Project = {
      ...existing,
      modules: {
        ...existing.modules,
        [moduleId]: moduleData,
      },
      updatedAt: new Date().toISOString(),
    };
    return this.repository.update(projectId, merged);
  }

  updateProjectMetadata(
    projectId: string,
    metadata: Record<string, unknown>,
  ): ProjectRepositoryResult {
    const existing = this.repository.get(projectId);
    if (!existing) {
      return { ok: false, reason: "not-found" };
    }
    const merged: Project = {
      ...existing,
      metadata: {
        ...existing.metadata,
        ...metadata,
      },
      updatedAt: new Date().toISOString(),
    };
    return this.repository.update(projectId, merged);
  }

  duplicateProject(projectId: string): ProjectRepositoryResult {
    const existing = this.repository.get(projectId);
    if (!existing) {
      return { ok: false, reason: "not-found" };
    }
    const now = new Date().toISOString();
    const duplicate: Project = {
      ...existing,
      projectId: generateProjectId(),
      createdAt: now,
      updatedAt: now,
    };
    const parsed = parseProject(duplicate);
    if (!parsed.ok) {
      return { ok: false, reason: "invalid", issues: parsed.issues };
    }
    return this.repository.create(parsed.project);
  }

  deleteProject(projectId: string): boolean {
    return this.repository.delete(projectId);
  }
}
