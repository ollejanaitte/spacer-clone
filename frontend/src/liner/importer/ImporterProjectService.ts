import { createEmptyImporterProject } from "./factory";
import { buildBuiltInSampleProject } from "./sample/builtInSampleDataset";
import type {
  LinerBridge,
  GirderLineSet,
  JipLinerImporterProject,
  LastEditedStep,
  SavedSnapshotMeta,
  Section,
  SourcePdfRef,
} from "./types";
import { evaluateBridgeRenderability, evaluateSectionRenderability } from "./renderability";
import { validateBridge, validateSection } from "./diagnostics/validateImporter";
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

  createBuiltInSampleProject(): JipLinerImporterProject {
    const template = buildBuiltInSampleProject();
    const bridgeTemplate = template.bridges[0];
    if (!bridgeTemplate) {
      throw new Error("Built-in sample project is missing bridge data.");
    }

    const bridgeId = createUniqueId("bridge");
    const spanId = createUniqueId("span");
    const girderLineSetId = createUniqueId("gls");
    const lineIdMap = new Map<string, string>();

    const girderLineSetTemplate = bridgeTemplate.girderLineSets[0];
    if (!girderLineSetTemplate) {
      throw new Error("Built-in sample project is missing girder line set data.");
    }

    const lines = girderLineSetTemplate.lines.map((line) => {
      const nextId = createUniqueId("line");
      lineIdMap.set(line.id, nextId);
      return { ...line, id: nextId };
    });

    const sections = bridgeTemplate.sections.map((section) => ({
      ...section,
      id: createUniqueId("section"),
      bridgeId,
      spanId,
      points: section.points.map((point) => ({
        ...point,
        id: createUniqueId("point"),
        girderLineId: lineIdMap.get(point.girderLineId) ?? point.girderLineId,
      })),
    }));

    const bridge: LinerBridge = {
      ...bridgeTemplate,
      id: bridgeId,
      girderLineSets: [
        {
          ...girderLineSetTemplate,
          id: girderLineSetId,
          appliesToSpanIds: [spanId],
          lines,
        },
      ],
      spans: bridgeTemplate.spans.map((span) => ({
        ...span,
        id: spanId,
        girderLineSetId,
      })),
      sections,
    };

    return createProject({
      ...template,
      id: createUniqueId("importer-project"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      savedSnapshots: (template.savedSnapshots ?? []).map((snapshot) => ({
        ...snapshot,
        id: createUniqueId("snapshot"),
        savedAt: new Date().toISOString(),
        lastEditedRef: {
          bridgeId,
          sectionId: sections[0]?.id,
        },
      })),
      sourcePdfRefs: (template.sourcePdfRefs ?? []).map((pdfRef) => ({
        ...pdfRef,
        id: createUniqueId("pdf-ref"),
        lastReferencedAt: new Date().toISOString(),
      })),
      bridges: [bridge],
      renderability: evaluateProjectRenderability({
        ...template,
        bridges: [bridge],
      }),
    });
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
    const bridge: LinerBridge = {
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

  saveBridgeSections(
    projectId: string,
    bridgeId: string,
    sections: Section[],
  ): JipLinerImporterProject {
    const project = this.requireProject(projectId);
    const bridgeIndex = project.bridges.findIndex((bridge) => bridge.id === bridgeId);
    if (bridgeIndex < 0) {
      throw new Error(`Bridge not found: ${bridgeId}`);
    }

    const bridge = project.bridges[bridgeIndex]!;
    const bridgeWithSections = { ...bridge, sections };
    const bridgeErrors = validateBridge(bridgeWithSections).filter(
      (item) => item.level === "error",
    );

    const enrichedSections = sections.map((section) => {
      const sectionDiagnostics = validateSection(section, bridgeWithSections, sections);
      return {
        ...section,
        bridgeId,
        diagnostics: {
          items: sectionDiagnostics,
          lastCalculatedAt: new Date().toISOString(),
        },
        renderability: evaluateSectionRenderability(section),
      };
    });

    const nextBridge: LinerBridge = {
      ...bridge,
      sections: enrichedSections,
      renderability: evaluateBridgeRenderability(
        { ...bridge, sections: enrichedSections },
        bridgeErrors,
      ),
    };

    const nextProject = withUpdatedRenderability({
      ...project,
      bridges: project.bridges.map((entry, index) =>
        index === bridgeIndex ? nextBridge : entry,
      ),
    });

    const saved = this.saveProject(nextProject);
    saveRecoveryState(saved, "sectionList", { bridgeId });
    return saved;
  }

  saveBridgeSection(
    projectId: string,
    bridgeId: string,
    section: Section,
  ): JipLinerImporterProject {
    const project = this.requireProject(projectId);
    const bridge = project.bridges.find((entry) => entry.id === bridgeId);
    if (!bridge) {
      throw new Error(`Bridge not found: ${bridgeId}`);
    }

    const sections = bridge.sections.map((entry) =>
      entry.id === section.id ? { ...section, bridgeId } : entry,
    );
    if (!sections.some((entry) => entry.id === section.id)) {
      sections.push({ ...section, bridgeId });
    }

    const saved = this.saveBridgeSections(projectId, bridgeId, sections);
    saveRecoveryState(saved, "sectionEdit", { bridgeId, sectionId: section.id });
    return saved;
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
