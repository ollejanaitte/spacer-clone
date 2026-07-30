import type { ProjectModel } from "../types";
import { computeApolloDirtyFingerprint } from "./dirtyFingerprint";

export type ApolloHistoryEntry = {
  readonly project: ProjectModel;
};

export type ApolloHistoryCoalescing = {
  readonly key: string;
};

export type ApolloHistoryState = {
  readonly past: readonly ApolloHistoryEntry[];
  readonly future: readonly ApolloHistoryEntry[];
  readonly coalescing: ApolloHistoryCoalescing | null;
};

export type ApolloHistoryCommitMode =
  | { readonly kind: "snapshot" }
  | { readonly kind: "coalesced"; readonly key: string }
  | { readonly kind: "reset" }
  | { readonly kind: "none" };

export const APOLLO_HISTORY_LIMIT = 50;

function cloneProject(project: ProjectModel): ProjectModel {
  return JSON.parse(JSON.stringify(project)) as ProjectModel;
}

function cloneEntry(entry: ApolloHistoryEntry): ApolloHistoryEntry {
  return { project: cloneProject(entry.project) };
}

export function createApolloHistoryState(): ApolloHistoryState {
  return {
    past: [],
    future: [],
    coalescing: null,
  };
}

export function clearApolloHistoryCoalescing(state: ApolloHistoryState): ApolloHistoryState {
  if (state.coalescing === null) {
    return state;
  }
  return {
    ...state,
    coalescing: null,
  };
}

export function pushApolloHistory(
  state: ApolloHistoryState,
  currentProject: ProjectModel,
  nextProject: ProjectModel,
  mode: ApolloHistoryCommitMode,
): ApolloHistoryState {
  if (mode.kind === "none") {
    return state;
  }
  if (mode.kind === "reset") {
    return createApolloHistoryState();
  }
  if (computeApolloDirtyFingerprint(currentProject) === computeApolloDirtyFingerprint(nextProject)) {
    return state;
  }
  if (
    mode.kind === "coalesced" &&
    state.coalescing !== null &&
    state.coalescing.key === mode.key &&
    state.past.length > 0
  ) {
    return {
      ...state,
      future: [],
      coalescing: { key: mode.key },
    };
  }
  const nextPast = [...state.past, { project: cloneProject(currentProject) }]
    .slice(-APOLLO_HISTORY_LIMIT)
    .map(cloneEntry);
  return {
    past: nextPast,
    future: [],
    coalescing: mode.kind === "coalesced" ? { key: mode.key } : null,
  };
}

export function undoApolloHistory(
  state: ApolloHistoryState,
  currentProject: ProjectModel,
): { readonly state: ApolloHistoryState; readonly project: ProjectModel | null } {
  if (state.past.length === 0) {
    return { state, project: null };
  }
  const previous = state.past[state.past.length - 1]!;
  return {
    project: cloneProject(previous.project),
    state: {
      past: state.past.slice(0, -1).map(cloneEntry),
      future: [{ project: cloneProject(currentProject) }, ...state.future].slice(0, APOLLO_HISTORY_LIMIT).map(cloneEntry),
      coalescing: null,
    },
  };
}

export function redoApolloHistory(
  state: ApolloHistoryState,
  currentProject: ProjectModel,
): { readonly state: ApolloHistoryState; readonly project: ProjectModel | null } {
  if (state.future.length === 0) {
    return { state, project: null };
  }
  const [next, ...remainingFuture] = state.future;
  return {
    project: cloneProject(next!.project),
    state: {
      past: [...state.past, { project: cloneProject(currentProject) }].slice(-APOLLO_HISTORY_LIMIT).map(cloneEntry),
      future: remainingFuture.map(cloneEntry),
      coalescing: null,
    },
  };
}
