import type { Project } from "../project/schema";

export type ProjectSaveResult = { ok: true } | { ok: false; reason: string };

export type ProjectLoadResult =
  | { ok: true; project: Project }
  | { ok: false; projectId: string; reason: string };

export interface ProjectPersistence {
  readonly kind: "memory" | "filesystem";
  initialize(): Promise<void>;
  saveProject(project: Project): Promise<ProjectSaveResult>;
  loadAllProjects(): Promise<ProjectLoadResult[]>;
  loadProject(projectId: string): Promise<ProjectLoadResult | undefined>;
  deleteProject(projectId: string): Promise<ProjectSaveResult>;
  writeBackup(project: Project): Promise<ProjectSaveResult>;
  listBackupFiles(projectId: string): Promise<string[]>;
  getProjectsRoot(): string;
}
