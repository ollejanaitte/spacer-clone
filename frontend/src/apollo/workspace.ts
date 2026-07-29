import { createDefaultProject } from "../data/defaultProject";
import {
  hydrateApolloPhase1Unit2FromPersistence,
  serializeApolloPhase1Unit2ForPersistence,
} from "./unit2Draft";
import type { ProjectModel } from "../types";

export const APOLLO_WORKSPACE_STORAGE_KEY = "apollo_phase1_nn_workspace_v1";
const MAX_WORKSPACE_PROJECTS = 12;

export type ApolloWorkspaceEntry = {
  readonly workspaceId: string;
  readonly projectId: string;
  readonly name: string;
  readonly description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly project: ProjectModel;
};

type ApolloWorkspaceStore = {
  readonly version: 1;
  readonly projects: readonly ApolloWorkspaceEntry[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function cloneProject(project: ProjectModel): ProjectModel {
  return JSON.parse(JSON.stringify(project)) as ProjectModel;
}

function nowIsoString(): string {
  return new Date().toISOString();
}

function nextWorkspaceId(entries: readonly ApolloWorkspaceEntry[]): string {
  const used = new Set(entries.map((entry) => entry.workspaceId));
  let counter = entries.length + 1;
  while (used.has(`apollo-workspace-${counter}`)) {
    counter += 1;
  }
  return `apollo-workspace-${counter}`;
}

function normalizeEntry(value: unknown): ApolloWorkspaceEntry | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.workspaceId !== "string" ||
    typeof value.projectId !== "string" ||
    typeof value.name !== "string" ||
    typeof value.description !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string" ||
    !isRecord(value.project)
  ) {
    return null;
  }

  const hydrated = hydrateApolloPhase1Unit2FromPersistence(value.project as ProjectModel);
  if (!hydrated.ok) return null;

  return {
    workspaceId: value.workspaceId,
    projectId: value.projectId,
    name: value.name,
    description: value.description,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    project: cloneProject(hydrated.project),
  };
}

function readStore(): ApolloWorkspaceStore {
  if (!canUseStorage()) {
    return { version: 1, projects: [] };
  }
  try {
    const raw = window.localStorage.getItem(APOLLO_WORKSPACE_STORAGE_KEY);
    if (!raw) return { version: 1, projects: [] };
    const parsed = JSON.parse(raw) as { version?: unknown; projects?: unknown };
    const projects = Array.isArray(parsed.projects)
      ? parsed.projects
          .map(normalizeEntry)
          .filter((entry): entry is ApolloWorkspaceEntry => entry !== null)
      : [];
    return { version: 1, projects };
  } catch {
    return { version: 1, projects: [] };
  }
}

function writeStore(store: ApolloWorkspaceStore): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(APOLLO_WORKSPACE_STORAGE_KEY, JSON.stringify(store));
}

function normalizeProjectForWorkspace(project: ProjectModel): ProjectModel {
  const serialized = serializeApolloPhase1Unit2ForPersistence(project);
  return cloneProject(serialized.ok ? serialized.project : project);
}

export function listApolloWorkspaceEntries(): ApolloWorkspaceEntry[] {
  return [...readStore().projects].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function saveApolloWorkspaceEntry(project: ProjectModel, workspaceId?: string): ApolloWorkspaceEntry[] {
  const store = readStore();
  const normalizedProject = normalizeProjectForWorkspace(project);
  const timestamp = nowIsoString();
  const existing = workspaceId
    ? store.projects.find((entry) => entry.workspaceId === workspaceId) ?? null
    : store.projects.find((entry) => entry.projectId === project.project.id) ?? null;
  const nextEntry: ApolloWorkspaceEntry = {
    workspaceId: existing?.workspaceId ?? nextWorkspaceId(store.projects),
    projectId: normalizedProject.project.id,
    name: normalizedProject.project.name || normalizedProject.project.id,
    description: normalizedProject.project.description,
    createdAt: existing?.createdAt ?? normalizedProject.project.createdAt ?? timestamp,
    updatedAt: timestamp,
    project: normalizedProject,
  };
  const filtered = store.projects.filter((entry) => entry.workspaceId !== nextEntry.workspaceId);
  const projects = [nextEntry, ...filtered]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, MAX_WORKSPACE_PROJECTS);
  writeStore({ version: 1, projects });
  return projects;
}

export function deleteApolloWorkspaceEntry(workspaceId: string): ApolloWorkspaceEntry[] {
  const projects = readStore().projects.filter((entry) => entry.workspaceId !== workspaceId);
  writeStore({ version: 1, projects });
  return [...projects];
}

export function renameApolloWorkspaceEntry(workspaceId: string, name: string): ApolloWorkspaceEntry[] {
  const trimmed = name.trim();
  const timestamp = nowIsoString();
  const projects = readStore().projects.map((entry) =>
    entry.workspaceId === workspaceId
      ? {
          ...entry,
          name: trimmed.length > 0 ? trimmed : entry.name,
          updatedAt: timestamp,
        }
      : entry,
  );
  writeStore({ version: 1, projects });
  return [...projects];
}

export function duplicateApolloWorkspaceEntry(workspaceId: string): ApolloWorkspaceEntry[] {
  const store = readStore();
  const source = store.projects.find((entry) => entry.workspaceId === workspaceId);
  if (!source) return [...store.projects];
  const timestamp = nowIsoString();
  const duplicateProject = cloneProject(source.project);
  duplicateProject.project = {
    ...duplicateProject.project,
    id: `${duplicateProject.project.id}-copy`,
    name: `${duplicateProject.project.name} Copy`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const projects = [
    {
      workspaceId: nextWorkspaceId(store.projects),
      projectId: duplicateProject.project.id,
      name: duplicateProject.project.name,
      description: duplicateProject.project.description,
      createdAt: timestamp,
      updatedAt: timestamp,
      project: duplicateProject,
    },
    ...store.projects,
  ].slice(0, MAX_WORKSPACE_PROJECTS);
  writeStore({ version: 1, projects });
  return [...projects];
}

export function loadApolloWorkspaceProject(workspaceId: string): ProjectModel | null {
  const entry = readStore().projects.find((item) => item.workspaceId === workspaceId);
  return entry ? cloneProject(entry.project) : null;
}

export function createApolloWorkspaceProject(): ProjectModel {
  const created = createDefaultProject();
  created.project = {
    ...created.project,
    id: `apollo-nn-${Date.now()}`,
    name: "Apollo NN Draft",
    description: "Non-numeric Apollo workspace draft.",
    createdAt: nowIsoString(),
    updatedAt: nowIsoString(),
  };
  const hydrated = hydrateApolloPhase1Unit2FromPersistence(created);
  return hydrated.ok ? hydrated.project : created;
}
