import type {
  JipLinerImporterProject,
  LastEditedStep,
  SavedSnapshotMeta,
} from "../types";
import { exportProjectJson, importProjectJson } from "./jsonImportExport";

const INDEX_KEY = "spacer.importer.projects.index";
const PROJECT_KEY_PREFIX = "spacer.importer.project.";
const SNAPSHOT_KEY_PREFIX = "spacer.importer.snapshot.";

export type ProjectListEntry = {
  id: string;
  name: string;
  updatedAt: string;
  bridgeCount: number;
  snapshotCount: number;
};

export type SaveNamedSnapshotInput = {
  name: string;
  notes?: string;
  isDraftSave: boolean;
  lastEditedStep: LastEditedStep;
  lastEditedRef?: SavedSnapshotMeta["lastEditedRef"];
};

export class ImporterStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImporterStorageError";
  }
}

type ProjectIndexEntry = {
  id: string;
  name: string;
  updatedAt: string;
};

function assertStorageAvailable(): Storage {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new ImporterStorageError("localStorage is unavailable.");
  }
  return window.localStorage;
}

function projectKey(projectId: string): string {
  return `${PROJECT_KEY_PREFIX}${projectId}`;
}

function snapshotKey(projectId: string, snapshotId: string): string {
  return `${SNAPSHOT_KEY_PREFIX}${projectId}.${snapshotId}`;
}

function readIndex(storage: Storage): ProjectIndexEntry[] {
  const raw = storage.getItem(INDEX_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ProjectIndexEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(storage: Storage, index: ProjectIndexEntry[]): void {
  storage.setItem(INDEX_KEY, JSON.stringify(index));
}

function createUniqueId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function cloneProject(project: JipLinerImporterProject): JipLinerImporterProject {
  return JSON.parse(JSON.stringify(project)) as JipLinerImporterProject;
}

function persistProject(storage: Storage, project: JipLinerImporterProject): void {
  storage.setItem(projectKey(project.id), exportProjectJson(project));

  const index = readIndex(storage);
  const nextEntry: ProjectIndexEntry = {
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
  };
  const existingIndex = index.findIndex((entry) => entry.id === project.id);
  if (existingIndex >= 0) {
    index[existingIndex] = nextEntry;
  } else {
    index.push(nextEntry);
  }
  writeIndex(storage, index);
}

export function createProject(project: JipLinerImporterProject): JipLinerImporterProject {
  const storage = assertStorageAvailable();
  if (loadProject(project.id) != null) {
    throw new ImporterStorageError(`Project already exists: ${project.id}`);
  }

  const nextProject = cloneProject(project);
  persistProject(storage, nextProject);
  return nextProject;
}

export function updateProject(project: JipLinerImporterProject): JipLinerImporterProject {
  const storage = assertStorageAvailable();
  if (loadProject(project.id) == null) {
    throw new ImporterStorageError(`Project not found: ${project.id}`);
  }

  const nextProject = cloneProject({
    ...project,
    updatedAt: new Date().toISOString(),
  });
  persistProject(storage, nextProject);
  return nextProject;
}

export function saveProject(project: JipLinerImporterProject): JipLinerImporterProject {
  const storage = assertStorageAvailable();
  const nextProject = cloneProject({
    ...project,
    updatedAt: new Date().toISOString(),
  });
  persistProject(storage, nextProject);
  return nextProject;
}

export function deleteProject(projectId: string): void {
  const storage = assertStorageAvailable();
  const project = loadProject(projectId);
  if (!project) {
    throw new ImporterStorageError(`Project not found: ${projectId}`);
  }

  for (const snapshot of project.savedSnapshots ?? []) {
    storage.removeItem(snapshotKey(projectId, snapshot.id));
  }

  storage.removeItem(projectKey(projectId));
  writeIndex(
    storage,
    readIndex(storage).filter((entry) => entry.id !== projectId),
  );
}

export function loadProject(projectId: string): JipLinerImporterProject | null {
  const storage = assertStorageAvailable();
  const raw = storage.getItem(projectKey(projectId));
  if (!raw) {
    return null;
  }

  const imported = importProjectJson(raw);
  if (!imported.ok || !imported.project) {
    throw new ImporterStorageError(
      imported.diagnostics[0]?.message ?? `Failed to load project: ${projectId}`,
    );
  }

  return imported.project;
}

export function listProjects(): ProjectListEntry[] {
  const storage = assertStorageAvailable();
  return readIndex(storage)
    .map((entry) => {
      const project = loadProject(entry.id);
      return {
        id: entry.id,
        name: entry.name,
        updatedAt: entry.updatedAt,
        bridgeCount: project?.bridges.length ?? 0,
        snapshotCount: project?.savedSnapshots?.length ?? 0,
      };
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function saveNamedSnapshot(
  projectId: string,
  input: SaveNamedSnapshotInput,
): SavedSnapshotMeta {
  const trimmedName = input.name.trim();
  if (trimmedName.length === 0) {
    throw new ImporterStorageError("Snapshot name is required.");
  }

  const project = loadProject(projectId);
  if (!project) {
    throw new ImporterStorageError(`Project not found: ${projectId}`);
  }

  const storage = assertStorageAvailable();
  const snapshot: SavedSnapshotMeta = {
    id: createUniqueId("snapshot"),
    name: trimmedName,
    savedAt: new Date().toISOString(),
    lastEditedStep: input.lastEditedStep,
    lastEditedRef: input.lastEditedRef,
    isDraftSave: input.isDraftSave,
    notes: input.notes?.trim() || undefined,
  };

  storage.setItem(snapshotKey(projectId, snapshot.id), exportProjectJson(project));

  const nextProject = updateProject({
    ...project,
    savedSnapshots: [...(project.savedSnapshots ?? []), snapshot],
  });

  const savedSnapshot = nextProject.savedSnapshots?.find((entry) => entry.id === snapshot.id);
  if (!savedSnapshot) {
    throw new ImporterStorageError(`Failed to persist snapshot metadata: ${snapshot.id}`);
  }

  return savedSnapshot;
}

export function loadNamedSnapshot(
  projectId: string,
  snapshotId: string,
): JipLinerImporterProject {
  const storage = assertStorageAvailable();
  const raw = storage.getItem(snapshotKey(projectId, snapshotId));
  if (!raw) {
    throw new ImporterStorageError(`Snapshot not found: ${projectId}/${snapshotId}`);
  }

  const imported = importProjectJson(raw);
  if (!imported.ok || !imported.project) {
    throw new ImporterStorageError(
      imported.diagnostics[0]?.message ?? `Failed to load snapshot: ${snapshotId}`,
    );
  }

  return imported.project;
}

export function deleteSnapshot(projectId: string, snapshotId: string): void {
  const project = loadProject(projectId);
  if (!project) {
    throw new ImporterStorageError(`Project not found: ${projectId}`);
  }

  const snapshots = project.savedSnapshots ?? [];
  if (!snapshots.some((entry) => entry.id === snapshotId)) {
    throw new ImporterStorageError(`Snapshot not found: ${projectId}/${snapshotId}`);
  }

  assertStorageAvailable().removeItem(snapshotKey(projectId, snapshotId));
  updateProject({
    ...project,
    savedSnapshots: snapshots.filter((entry) => entry.id !== snapshotId),
  });
}

export function renameSnapshot(
  projectId: string,
  snapshotId: string,
  newName: string,
): SavedSnapshotMeta {
  const trimmedName = newName.trim();
  if (trimmedName.length === 0) {
    throw new ImporterStorageError("Snapshot name is required.");
  }

  const project = loadProject(projectId);
  if (!project) {
    throw new ImporterStorageError(`Project not found: ${projectId}`);
  }

  const snapshots = project.savedSnapshots ?? [];
  const target = snapshots.find((entry) => entry.id === snapshotId);
  if (!target) {
    throw new ImporterStorageError(`Snapshot not found: ${projectId}/${snapshotId}`);
  }

  const nextSnapshot: SavedSnapshotMeta = {
    ...target,
    name: trimmedName,
  };

  updateProject({
    ...project,
    savedSnapshots: snapshots.map((entry) =>
      entry.id === snapshotId ? nextSnapshot : entry,
    ),
  });

  return nextSnapshot;
}

/** Test helper: clears importer storage keys from localStorage. */
export function clearImporterStorageForTests(): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  const storage = window.localStorage;
  const keys = Object.keys(storage).filter(
    (key) =>
      key === INDEX_KEY ||
      key.startsWith(PROJECT_KEY_PREFIX) ||
      key.startsWith(SNAPSHOT_KEY_PREFIX),
  );
  for (const key of keys) {
    storage.removeItem(key);
  }
}
