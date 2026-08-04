import { createDefaultProject } from "../data/defaultProject";
import { buildDuplicateProjectName } from "./duplicateNaming";
import { generateApolloProjectId } from "./projectId";
import {
  hydrateApolloPhase1Unit2FromPersistence,
  serializeApolloPhase1Unit2ForPersistence,
} from "./unit2Draft";
import type { ProjectModel } from "../types";

export const APOLLO_WORKSPACE_STORAGE_KEY = "apollo_phase1_nn_workspace_v1";
export const APOLLO_WORKSPACE_STORE_MALFORMED_ID = "apollo-workspace-store";
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

export type ApolloWorkspaceMalformedEntry = {
  readonly workspaceId: string;
  readonly diagnostics: readonly string[];
  readonly raw: unknown;
};

export type ApolloWorkspaceSnapshot = {
  readonly valid: readonly ApolloWorkspaceEntry[];
  readonly malformed: readonly ApolloWorkspaceMalformedEntry[];
};

type ApolloWorkspaceStore = {
  readonly version: 1;
  readonly projects: readonly unknown[];
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

function readWorkspaceId(value: unknown): string | null {
  if (!isRecord(value) || typeof value.workspaceId !== "string") {
    return null;
  }
  return value.workspaceId;
}

function normalizeEntry(value: unknown): ApolloWorkspaceEntry | ApolloWorkspaceMalformedEntry {
  const workspaceId = readWorkspaceId(value) ?? "apollo-workspace-unknown";
  if (!isRecord(value)) {
    return {
      workspaceId,
      diagnostics: ["Workspace entry is not an object."],
      raw: value,
    };
  }
  if (
    typeof value.projectId !== "string" ||
    typeof value.name !== "string" ||
    typeof value.description !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string" ||
    !isRecord(value.project)
  ) {
    return {
      workspaceId,
      diagnostics: ["Workspace entry is missing required metadata fields."],
      raw: value,
    };
  }

  const hydrated = hydrateApolloPhase1Unit2FromPersistence(value.project as ProjectModel);
  if (!hydrated.ok) {
    return {
      workspaceId,
      diagnostics: hydrated.diagnostics,
      raw: value,
    };
  }

  return {
    workspaceId,
    projectId: value.projectId,
    name: value.name,
    description: value.description,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    project: cloneProject(hydrated.project),
  };
}

function readSnapshot(): ApolloWorkspaceSnapshot {
  if (!canUseStorage()) {
    return { valid: [], malformed: [] };
  }
  const raw = window.localStorage.getItem(APOLLO_WORKSPACE_STORAGE_KEY);
  if (!raw) return { valid: [], malformed: [] };
  let parsed: { version?: unknown; projects?: unknown };
  try {
    parsed = JSON.parse(raw) as { version?: unknown; projects?: unknown };
  } catch {
    return {
      valid: [],
      malformed: [
        {
          workspaceId: APOLLO_WORKSPACE_STORE_MALFORMED_ID,
          diagnostics: ["Workspace store JSON could not be parsed."],
          raw,
        },
      ],
    };
  }
  const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
  const valid: ApolloWorkspaceEntry[] = [];
  const malformed: ApolloWorkspaceMalformedEntry[] = [];
  for (const entry of projects) {
    const normalized = normalizeEntry(entry);
    if ("project" in normalized) {
      valid.push(normalized);
    } else {
      malformed.push(normalized);
    }
  }
  return { valid, malformed };
}

function writeStore(snapshot: ApolloWorkspaceSnapshot): void {
  if (!canUseStorage()) return;
  const store: ApolloWorkspaceStore = {
    version: 1,
    projects: [
      ...snapshot.valid.map((entry) => ({
        workspaceId: entry.workspaceId,
        projectId: entry.projectId,
        name: entry.name,
        description: entry.description,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        project: entry.project,
      })),
      ...snapshot.malformed.map((entry) => entry.raw),
    ],
  };
  window.localStorage.setItem(APOLLO_WORKSPACE_STORAGE_KEY, JSON.stringify(store));
}

function normalizeProjectForWorkspace(project: ProjectModel): ProjectModel {
  const serialized = serializeApolloPhase1Unit2ForPersistence(project);
  return cloneProject(serialized.ok ? serialized.project : project);
}

function sortEntries(entries: readonly ApolloWorkspaceEntry[]): ApolloWorkspaceEntry[] {
  return [...entries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function listApolloWorkspaceSnapshot(): ApolloWorkspaceSnapshot {
  return readSnapshot();
}

export function listApolloWorkspaceEntries(): ApolloWorkspaceEntry[] {
  return sortEntries(readSnapshot().valid);
}

export function listApolloWorkspaceMalformedEntries(): ApolloWorkspaceMalformedEntry[] {
  return [...readSnapshot().malformed];
}

export function saveApolloWorkspaceEntry(project: ProjectModel, workspaceId?: string): ApolloWorkspaceEntry[] {
  const snapshot = readSnapshot();
  const normalizedProject = normalizeProjectForWorkspace(project);
  const timestamp = nowIsoString();
  const existing = workspaceId
    ? snapshot.valid.find((entry) => entry.workspaceId === workspaceId) ?? null
    : snapshot.valid.find((entry) => entry.projectId === project.project.id) ?? null;
  const nextEntry: ApolloWorkspaceEntry = {
    workspaceId: existing?.workspaceId ?? nextWorkspaceId(snapshot.valid),
    projectId: normalizedProject.project.id,
    name: normalizedProject.project.name || normalizedProject.project.id,
    description: normalizedProject.project.description,
    createdAt: existing?.createdAt ?? normalizedProject.project.createdAt ?? timestamp,
    updatedAt: timestamp,
    project: normalizedProject,
  };
  const filtered = snapshot.valid.filter((entry) => entry.workspaceId !== nextEntry.workspaceId);
  const valid = sortEntries([nextEntry, ...filtered]).slice(0, MAX_WORKSPACE_PROJECTS);
  writeStore({ valid, malformed: snapshot.malformed });
  return valid;
}

export function deleteApolloWorkspaceEntry(workspaceId: string): ApolloWorkspaceEntry[] {
  const snapshot = readSnapshot();
  const valid = snapshot.valid.filter((entry) => entry.workspaceId !== workspaceId);
  const malformed = snapshot.malformed.filter((entry) => entry.workspaceId !== workspaceId);
  writeStore({ valid, malformed });
  return sortEntries(valid);
}

export function renameApolloWorkspaceEntry(workspaceId: string, name: string): ApolloWorkspaceEntry[] {
  const snapshot = readSnapshot();
  const trimmed = name.trim();
  const timestamp = nowIsoString();
  const valid = sortEntries(
    snapshot.valid.map((entry) =>
      entry.workspaceId === workspaceId
        ? {
            ...entry,
            name: trimmed.length > 0 ? trimmed : entry.name,
            updatedAt: timestamp,
          }
        : entry,
    ),
  );
  writeStore({ valid, malformed: snapshot.malformed });
  return valid;
}

export function duplicateApolloWorkspaceEntry(workspaceId: string): ApolloWorkspaceEntry[] {
  const snapshot = readSnapshot();
  const source = snapshot.valid.find((entry) => entry.workspaceId === workspaceId);
  if (!source) return sortEntries(snapshot.valid);
  const timestamp = nowIsoString();
  const duplicateProject = cloneProject(source.project);
  const nextProjectId = generateApolloProjectId();
  const nextName = buildDuplicateProjectName(
    source.name,
    snapshot.valid.map((entry) => entry.name),
  );
  duplicateProject.project = {
    ...duplicateProject.project,
    id: nextProjectId,
    name: nextName,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  if (duplicateProject.apolloPhase1Unit2) {
    duplicateProject.apolloPhase1Unit2 = {
      ...duplicateProject.apolloPhase1Unit2,
      metadata: {
        ...duplicateProject.apolloPhase1Unit2.metadata,
        projectId: nextProjectId,
        name: nextName,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    };
  }
  const valid = sortEntries([
    {
      workspaceId: nextWorkspaceId(snapshot.valid),
      projectId: nextProjectId,
      name: nextName,
      description: duplicateProject.project.description,
      createdAt: timestamp,
      updatedAt: timestamp,
      project: duplicateProject,
    },
    ...snapshot.valid,
  ]).slice(0, MAX_WORKSPACE_PROJECTS);
  writeStore({ valid, malformed: snapshot.malformed });
  return valid;
}

export function loadApolloWorkspaceProject(workspaceId: string): ProjectModel | null {
  const malformed = readSnapshot().malformed.some((entry) => entry.workspaceId === workspaceId);
  if (malformed) {
    return null;
  }
  const entry = readSnapshot().valid.find((item) => item.workspaceId === workspaceId);
  return entry ? cloneProject(entry.project) : null;
}

export function isApolloWorkspaceEntryMalformed(workspaceId: string): ApolloWorkspaceMalformedEntry | null {
  return readSnapshot().malformed.find((entry) => entry.workspaceId === workspaceId) ?? null;
}

export function createApolloWorkspaceProject(name = "Apollo非数値下書き"): ProjectModel {
  const created = createDefaultProject();
  const timestamp = nowIsoString();
  const projectId = generateApolloProjectId();
  created.project = {
    ...created.project,
    id: projectId,
    name,
    description: "非数値Apollo作業用の下書きです。",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const hydrated = hydrateApolloPhase1Unit2FromPersistence(created);
  return hydrated.ok ? hydrated.project : created;
}
