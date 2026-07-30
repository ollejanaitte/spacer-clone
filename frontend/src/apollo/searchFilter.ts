import type { ApolloPhase1Unit2Draft } from "../types";
import type { ApolloEntityKind, ApolloEntityRef } from "./selection";

export type ApolloSearchFilterState = {
  readonly query: string;
  readonly entityType: ApolloEntityKind | "all";
};

export function createApolloSearchFilterState(): ApolloSearchFilterState {
  return {
    query: "",
    entityType: "all",
  };
}

function normalizeComparisonText(value: string): string {
  return value.trim().normalize("NFKC").toLocaleLowerCase("en-US");
}

function matchesQuery(query: string, values: readonly string[]): boolean {
  const normalizedQuery = normalizeComparisonText(query);
  if (normalizedQuery.length === 0) {
    return true;
  }
  return values.some((value) => normalizeComparisonText(value).includes(normalizedQuery));
}

export function matchesApolloSearchFilter(
  state: ApolloSearchFilterState,
  kind: ApolloEntityKind,
  fields: readonly string[],
): boolean {
  if (state.entityType !== "all" && state.entityType !== kind) {
    return false;
  }
  return matchesQuery(state.query, fields);
}

export function buildApolloVisibleRefs(
  draft: ApolloPhase1Unit2Draft,
  state: ApolloSearchFilterState,
): ApolloEntityRef[] {
  const refs: ApolloEntityRef[] = [];
  for (const node of draft.nodes) {
    if (matchesApolloSearchFilter(state, "node", [node.id, node.label])) {
      refs.push({ kind: "node", id: node.id });
    }
  }
  for (const member of draft.members) {
    if (matchesApolloSearchFilter(state, "member", [member.id, member.label])) {
      refs.push({ kind: "member", id: member.id });
    }
  }
  for (const support of draft.supports) {
    if (matchesApolloSearchFilter(state, "support", [support.id, support.label])) {
      refs.push({ kind: "support", id: support.id });
    }
  }
  for (const material of draft.materialReferences) {
    if (matchesApolloSearchFilter(state, "material", [material.id, material.displayName])) {
      refs.push({ kind: "material", id: material.id });
    }
  }
  return refs;
}

export function countApolloVisibleByKind(
  refs: readonly ApolloEntityRef[],
  kind: ApolloEntityKind,
): number {
  return refs.filter((ref) => ref.kind === kind).length;
}
