import type { ProjectModel } from "../types";
import { buildApolloBsddFingerprintPayload } from "./bridgeStructure";
import { serializeApolloPhase1Unit2ForPersistence } from "./unit2Draft";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

function stableStringify(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry as JsonValue)).join(",")}]`;
  }
  const record = value as Record<string, JsonValue>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key]!)}`).join(",")}}`;
}

function buildFingerprintPayload(project: ProjectModel): JsonValue | null {
  const serialized = serializeApolloPhase1Unit2ForPersistence(project);
  if (!serialized.ok) {
    return null;
  }
  const draft = serialized.project.apolloPhase1Unit2;
  if (!draft) {
    return null;
  }
  const bsddPayload = buildApolloBsddFingerprintPayload(serialized.project);
  return {
    schemaVersion: draft.schemaVersion,
    metadata: {
      projectId: draft.metadata.projectId,
      name: draft.metadata.name,
      description: draft.metadata.description,
      createdAt: draft.metadata.createdAt,
      updatedAt: draft.metadata.updatedAt,
      provisionalStatus: draft.metadata.provisionalStatus,
    },
    nodes: draft.nodes.map((node) => ({ ...node })),
    members: draft.members.map((member) => ({ ...member })),
    supports: draft.supports.map((support) => ({ ...support })),
    materialReferences: draft.materialReferences.map((material) => ({ ...material })),
    audit: draft.audit.map((entry) => ({ ...entry })),
  ...(bsddPayload ? { apolloBsddBinding: bsddPayload as JsonValue } : {}),
  };
}

/** Canonical saved-baseline fingerprint for Apollo dirty comparison. */
export function computeApolloDirtyFingerprint(project: ProjectModel): string {
  const payload = buildFingerprintPayload(project);
  if (!payload) {
    return "apollo:fingerprint:invalid";
  }
  return `apollo:v1:${stableStringify(payload)}`;
}

export function isApolloProjectDirty(
  project: ProjectModel,
  savedBaselineFingerprint: string,
): boolean {
  return computeApolloDirtyFingerprint(project) !== savedBaselineFingerprint;
}
