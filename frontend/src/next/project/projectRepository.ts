import type { Project } from "./schema";

export type ProjectRepositoryResult =
  | { ok: true; project: Project }
  | { ok: false; reason: "not-found" | "invalid" | "duplicate-id"; issues?: string[] };

export interface ProjectRepository {
  create(project: Project): ProjectRepositoryResult;
  get(projectId: string): Project | undefined;
  list(): readonly Project[];
  update(projectId: string, project: Project): ProjectRepositoryResult;
  delete(projectId: string): boolean;
}
