import type { JipLinerImporterProject, LastEditedStep } from "../types";
import { loadProject } from "./importerStorage";

const RECOVERY_KEY = "spacer.importer.recovery";

export type RecoveryInfo = {
  projectId: string;
  projectName: string;
  lastEditedAt: string;
  lastEditedStep: LastEditedStep;
  lastEditedRef?: {
    bridgeId?: string;
    sectionId?: string;
  };
};

type RecoveryState = {
  project: JipLinerImporterProject;
  savedAt: string;
  lastEditedStep: LastEditedStep;
  lastEditedRef?: RecoveryInfo["lastEditedRef"];
};

export class RecoveryManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecoveryManagerError";
  }
}

function assertStorageAvailable(): Storage {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new RecoveryManagerError("localStorage is unavailable.");
  }
  return window.localStorage;
}

function readRecoveryState(): RecoveryState | null {
  const storage = assertStorageAvailable();
  const raw = storage.getItem(RECOVERY_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as RecoveryState;
  } catch {
    return null;
  }
}

function writeRecoveryState(state: RecoveryState): void {
  assertStorageAvailable().setItem(RECOVERY_KEY, JSON.stringify(state));
}

export function saveRecoveryState(
  project: JipLinerImporterProject,
  lastEditedStep: LastEditedStep,
  lastEditedRef?: RecoveryInfo["lastEditedRef"],
): void {
  writeRecoveryState({
    project: JSON.parse(JSON.stringify(project)) as JipLinerImporterProject,
    savedAt: new Date().toISOString(),
    lastEditedStep,
    lastEditedRef,
  });
}

export function loadRecoveryState(): RecoveryState | null {
  return readRecoveryState();
}

export function clearRecoveryState(): void {
  assertStorageAvailable().removeItem(RECOVERY_KEY);
}

export function hasRecoveryState(): boolean {
  return readRecoveryState() != null;
}

export function getRecoveryInfo(): RecoveryInfo | null {
  const state = readRecoveryState();
  if (!state) {
    return null;
  }

  return {
    projectId: state.project.id,
    projectName: state.project.name,
    lastEditedAt: state.savedAt,
    lastEditedStep: state.lastEditedStep,
    lastEditedRef: state.lastEditedRef,
  };
}

export function restoreRecoveryProject(): JipLinerImporterProject {
  const state = readRecoveryState();
  if (!state) {
    throw new RecoveryManagerError("Recovery state is unavailable.");
  }

  const storedProject = loadProject(state.project.id);
  if (storedProject) {
    return storedProject;
  }

  return state.project;
}

/** Test helper: clears recovery state from localStorage. */
export function clearRecoveryStateForTests(): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  window.localStorage.removeItem(RECOVERY_KEY);
}
