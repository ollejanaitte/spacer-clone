import { ProjectManager } from "./projectManager";
import type { ProjectRepositoryResult } from "./projectRepository";
import type { Project } from "./schema";
import type { ProjectPersistence } from "../persistence/projectPersistence";

export type SaveState = "idle" | "saving" | "saved" | "failed";

export interface SaveStateListener {
  (state: SaveState): void;
}

export class PersistentProjectManager extends ProjectManager {
  private saveState: SaveState = "idle";
  private listeners = new Set<SaveStateListener>();
  private persistenceInitialized = false;
  private pendingSaves: Promise<void> = Promise.resolve();
  private pendingCount = 0;

  constructor(
    repository: import("./projectRepository").ProjectRepository,
    private readonly persistence: ProjectPersistence,
  ) {
    super(repository);
  }

  getSaveState(): SaveState {
    return this.saveState;
  }

  onSaveState(listener: SaveStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setSaveState(state: SaveState): void {
    this.saveState = state;
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  private async ensurePersistence(): Promise<void> {
    if (!this.persistenceInitialized) {
      await this.persistence.initialize();
      this.persistenceInitialized = true;
    }
  }

  async initializePersistence(): Promise<void> {
    await this.ensurePersistence();
  }

  isPersistenceInitialized(): boolean {
    return this.persistenceInitialized;
  }

  getPersistence(): ProjectPersistence {
    return this.persistence;
  }

  async restoreFromPersistence(): Promise<{ restored: number; rejected: number }> {
    await this.ensurePersistence();
    const loaded = await this.persistence.loadAllProjects();
    let restored = 0;
    let rejected = 0;
    for (const result of loaded) {
      if (!result.ok) {
        rejected += 1;
        continue;
      }
      const inserted = this.repository.create(result.project);
      if (inserted.ok) {
        restored += 1;
      } else {
        rejected += 1;
      }
    }
    return { restored, rejected };
  }

  async listBackups(projectId: string): Promise<string[]> {
    await this.ensurePersistence();
    return this.persistence.listBackupFiles(projectId);
  }

  async flushPendingSaves(): Promise<void> {
    await this.pendingSaves;
  }

  hasPendingSaves(): boolean {
    return this.pendingCount > 0;
  }

  private enqueueSave(job: () => Promise<void>): void {
    this.pendingCount += 1;
    this.pendingSaves = this.pendingSaves
      .then(job)
      .catch((error) => {
        console.error("auto-save failed:", error);
        this.setSaveState("failed");
      })
      .finally(() => {
        this.pendingCount -= 1;
      });
  }

  private async saveProjectToPersistence(project: Project): Promise<void> {
    await this.ensurePersistence();
    this.setSaveState("saving");
    const result = await this.persistence.saveProject(project);
    if (!result.ok) {
      this.setSaveState("failed");
      return;
    }
    await this.writeBackup(project);
    this.setSaveState("saved");
  }

  private async writeBackup(project: Project): Promise<void> {
    const result = await this.persistence.writeBackup(project);
    if (!result.ok) {
      // Backup failure must not mark the source-of-truth save as failed.
      console.error("backup failed (source of truth unaffected):", result.reason);
    }
  }

  override createProject(input: Parameters<ProjectManager["createProject"]>[0]): ProjectRepositoryResult {
    const result = super.createProject(input);
    if (result.ok) {
      this.enqueueSave(() => this.saveProjectToPersistence(result.project));
    }
    return result;
  }

  override updateProject(projectId: string, input: Parameters<ProjectManager["updateProject"]>[1]): ProjectRepositoryResult {
    const result = super.updateProject(projectId, input);
    if (result.ok) {
      this.enqueueSave(() => this.saveProjectToPersistence(result.project));
    }
    return result;
  }

  override duplicateProject(projectId: string): ProjectRepositoryResult {
    const result = super.duplicateProject(projectId);
    if (result.ok) {
      this.enqueueSave(() => this.saveProjectToPersistence(result.project));
    }
    return result;
  }

  override deleteProject(projectId: string): boolean {
    const deleted = super.deleteProject(projectId);
    if (deleted) {
      this.enqueueSave(() => this.persistence.deleteProject(projectId).then((r) => {
        this.setSaveState(r.ok ? "saved" : "failed");
      }));
    }
    return deleted;
  }

  importProject(project: Project): boolean {
    const result = this.repository.create(project);
    if (result.ok) {
      this.enqueueSave(() => this.saveProjectToPersistence(result.project));
      return true;
    }
    return false;
  }
}
