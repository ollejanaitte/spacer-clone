import { createEmptyImporterProject } from "./factory";
import type {
  Bridge,
  GirderLineSet,
  JipLinerImporterProject,
  LastEditedStep,
  SavedSnapshotMeta,
  SourcePdfRef,
} from "./types";
import { mergeGirderLineSetIntoBridge, normalizeDisplayOrder, updateLatestSnapshotMeta } from "./line-master/lineMasterHooks";
import { evaluateProjectRenderability } from "./renderability";
import {
  createProject,
  deleteProject as deleteStoredProject,
  deleteSnapshot,
  listProjects,
  loadNamedSnapshot,
  loadProject,
  renameSnapshot,
  saveNamedSnapshot,
  saveProject,
  updateProject,
  type ProjectListEntry,
  type SaveNamedSnapshotInput,
} from "./storage/importerStorage";
import { exportProjectJson, importProjectJson } from "./storage/jsonImportExport";
import {
  clearRecoveryState,
  getRecoveryInfo,
  hasRecoveryState,
  loadRecoveryState,
  saveRecoveryState,
  type RecoveryInfo,
} from "./storage/recoveryManager";

function createUniqueId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function withUpdatedRenderability(project: JipLinerImporterProject): JipLinerImporterProject {
  return {
    ...project,
    renderability: evaluateProjectRenderability(project),
  };
}

function sanitizeGirderLineSet(girderLineSet: GirderLineSet): GirderLineSet {
  return {
    ...girderLineSet,
    name: girderLineSet.name.trim() || "CL",
    lines: normalizeDisplayOrder(
      girderLineSet.lines.filter((line) => line.label.trim().length > 0),
    ),
  };
}

export class ImporterProjectService {
  createEmptyProject(name?: string): JipLinerImporterProject {
    const project = createEmptyImporterProject(name);
    return createProject(project);
  }

  loadProject(projectId: string): JipLinerImporterProject | null {
    return loadProject(projectId);
  }

  listProjects(): ProjectListEntry[] {
    return listProjects();
  }

  saveProject(project: JipLinerImporterProject): JipLinerImporterProject {
    const nextProject = withUpdatedRenderability(project);
    return saveProject(nextProject);
  }

  deleteProject(projectId: string): void {
    deleteStoredProject(projectId);
  }

  createBridge(projectId: string, bridgeName: string): JipLinerImporterProject {
    const project = this.requireProject(projectId);
    const bridge: Bridge = {
      id: createUniqueId("bridge"),
      name: bridgeName.trim() || "新規橋梁",
      girderLineSets: [],
      spans: [],
      sections: [],
    };

    return updateProject(
      withUpdatedRenderability({
        ...project,
        bridges: [...project.bridges, bridge],
      }),
    );
  }

  deleteBridge(projectId: string, bridgeId: string): JipLinerImporterProject {
    const project = this.requireProject(projectId);
    return updateProject(
      withUpdatedRenderability({
        ...project,
        bridges: project.bridges.filter((bridge) => bridge.id !== bridgeId),
      }),
    );
  }

  saveBridgeGirderLineSet(
    projectId: string,
    bridgeId: string,
    girderLineSet: GirderLineSet,
  ): JipLinerImporterProject {
    const project = this.requireProject(projectId);
    const bridgeIndex = project.bridges.findIndex((bridge) => bridge.id === bridgeId);
    if (bridgeIndex < 0) {
      throw new Error(`Bridge not found: ${bridgeId}`);
    }

    const bridge = project.bridges[bridgeIndex]!;
    const nextBridge = mergeGirderLineSetIntoBridge(bridge, sanitizeGirderLineSet(girderLineSet));
    const nextProject = withUpdatedRenderability(
      updateLatestSnapshotMeta(
        {
          ...project,
          bridges: project.bridges.map((entry, index) =>
            index === bridgeIndex ? nextBridge : entry,
          ),
        },
        bridgeId,
      ),
    );

    const saved = this.saveProject(nextProject);
    saveRecoveryState(saved, "lineMaster", { bridgeId });
    return saved;
  }

  addPdfReference(projectId: string, fileName: string, notes?: string): JipLinerImporterProject {
    const project = this.requireProject(projectId);
    const pdfRef: SourcePdfRef = {
      id: createUniqueId("pdf-ref"),
      fileName: fileName.trim(),
      sha256: null,
      totalPages: null,
      lastReferencedAt: new Date().toISOString(),
      notes: notes?.trim() || undefined,
    };

    return updateProject({
      ...project,
      sourcePdfRefs: [...(project.sourcePdfRefs ?? []), pdfRef],
    });
  }

  removePdfReference(projectId: string, pdfRefId: string): JipLinerImporterProject {
    const project = this.requireProject(projectId);
    return updateProject({
      ...project,
      sourcePdfRefs: (project.sourcePdfRefs ?? []).filter((entry) => entry.id !== pdfRefId),
    });
  }

  markSnapshot(
    projectId: string,
    input: SaveNamedSnapshotInput,
  ): SavedSnapshotMeta {
    return saveNamedSnapshot(projectId, input);
  }

  loadSnapshot(projectId: string, snapshotId: string): JipLinerImporterProject {
    return loadNamedSnapshot(projectId, snapshotId);
  }

  deleteSnapshot(projectId: string, snapshotId: string): void {
    deleteSnapshot(projectId, snapshotId);
  }

  renameSnapshot(
    projectId: string,
    snapshotId: string,
    newName: string,
  ): SavedSnapshotMeta {
    return renameSnapshot(projectId, snapshotId, newName);
  }

  updateLastEditedStep(
    projectId: string,
    lastEditedStep: LastEditedStep,
    lastEditedRef?: SavedSnapshotMeta["lastEditedRef"],
  ): JipLinerImporterProject {
    const project = this.requireProject(projectId);
    const nextProject = updateProject({
      ...project,
      updatedAt: new Date().toISOString(),
    });

    saveRecoveryState(nextProject, lastEditedStep, lastEditedRef);
    return nextProject;
  }

  importProjectJson(jsonText: string): ReturnType<typeof importProjectJson> {
    return importProjectJson(jsonText);
  }

  exportProjectJson(project: JipLinerImporterProject): string {
    return exportProjectJson(withUpdatedRenderability(project));
  }

  getRecoveryInfo(): RecoveryInfo | null {
    return getRecoveryInfo();
  }

  hasRecoveryState(): boolean {
    return hasRecoveryState();
  }

  loadRecoveryState(): ReturnType<typeof loadRecoveryState> {
    return loadRecoveryState();
  }

  clearRecoveryState(): void {
    clearRecoveryState();
  }

  private requireProject(projectId: string): JipLinerImporterProject {
    const project = loadProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return project;
  }
}

export const defaultImporterProjectService = new ImporterProjectService();

export {
  createEmptyImporterProject,
  exportProjectJson,
  importProjectJson,
  type ProjectListEntry,
  type RecoveryInfo,
  type SaveNamedSnapshotInput,
};
