import type { BridgeProject } from "../../contracts/bridgeProject";
import type { BusinessProjectRef } from "../../contracts/businessProject";
import type { DocumentReference } from "../../contracts/documentReference";
import type { RoadDesignDocument } from "../../contracts/roadDesignDocument";
import type { UuidString } from "../../contracts/uuid";
import { requireRevisionId } from "../../contracts/revision";

export interface BridgeProjectAdapterResult {
  readonly ok: true;
  readonly ref: BusinessProjectRef;
  readonly bridge: BridgeProject;
  readonly verbatim: boolean;
}

export interface AdapterFailure {
  readonly ok: false;
  readonly reason: string;
}

export type BridgeProjectAdapterOutcome = BridgeProjectAdapterResult | AdapterFailure;

/**
 * BridgeProject canonical -> BusinessProject child ref.
 * The canonical doc is reused verbatim (no field changes, no payload embedding).
 */
export function adaptBridgeProjectToBusinessRef(
  bridge: BridgeProject,
  uri: string,
): BridgeProjectAdapterOutcome {
  if (typeof bridge.documentId !== "string") {
    return { ok: false, reason: "bridge.documentId must be a string." };
  }
  if (typeof bridge.revisionId !== "number" || bridge.revisionId < 1) {
    return { ok: false, reason: "bridge.revisionId must be a positive integer." };
  }
  if (bridge.contentChecksum === undefined || bridge.contentChecksum.hexDigest === undefined) {
    return { ok: false, reason: "bridge.contentChecksum is required." };
  }

  const ref: BusinessProjectRef = {
    documentKind: "bridge-project",
    documentId: bridge.documentId,
    revisionId: bridge.revisionId,
    contentChecksum: bridge.contentChecksum,
    uri,
  };

  return { ok: true, ref, bridge, verbatim: true };
}

/**
 * Road design document -> BusinessProject child ref.
 * The road doc is reused verbatim (no fabrication of missing values).
 */
export function adaptRoadDesignToBusinessRef(
  road: RoadDesignDocument,
  uri: string,
): BridgeProjectAdapterOutcome {
  if (typeof road.documentId !== "string") {
    return { ok: false, reason: "road.documentId must be a string." };
  }
  if (typeof road.revisionId !== "number" || road.revisionId < 1) {
    return { ok: false, reason: "road.revisionId must be a positive integer." };
  }
  if (road.contentChecksum === undefined || road.contentChecksum.hexDigest === undefined) {
    return { ok: false, reason: "road.contentChecksum is required." };
  }

  const ref: BusinessProjectRef = {
    documentKind: "road-design",
    documentId: road.documentId,
    revisionId: requireRevisionId(road.revisionId),
    contentChecksum: road.contentChecksum,
    uri,
  };

  return {
    ok: true,
    ref,
    bridge: road as unknown as BridgeProject,
    verbatim: true,
  };
}

export interface ProjectJsonAdapterInput {
  readonly raw: unknown;
  readonly sourceUri: string;
}

export interface ProjectJsonAdapterResult {
  readonly ok: true;
  readonly refs: readonly BusinessProjectRef[];
  readonly notes: readonly string[];
}

export type ProjectJsonAdapterOutcome = ProjectJsonAdapterResult | AdapterFailure;

/**
 * Best-effort project.json -> BusinessProject child refs.
 * Extracts only recognized, complete entities; never fabricates missing values.
 */
export function adaptProjectJsonToBusinessRefs(
  input: ProjectJsonAdapterInput,
): ProjectJsonAdapterOutcome {
  const raw = input.raw;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, reason: "project.json payload must be an object." };
  }

  const record = raw as Record<string, unknown>;
  const refs: BusinessProjectRef[] = [];
  const notes: string[] = [];

  const bridge = record.bridgeProject as BridgeProject | undefined;
  if (bridge !== undefined && typeof bridge === "object") {
    const adapted = adaptBridgeProjectToBusinessRef(bridge, input.sourceUri);
    if (adapted.ok) {
      refs.push(adapted.ref);
    } else {
      notes.push(`bridgeProject skipped: ${adapted.reason}`);
    }
  }

  return { ok: true, refs, notes };
}

export function documentReferenceToBusinessRef(
  ref: DocumentReference,
  uri: string,
): BusinessProjectRef | null {
  if (
    typeof ref.documentId !== "string" ||
    typeof ref.revisionId !== "number" ||
    ref.revisionId < 1 ||
    ref.contentChecksum === undefined
  ) {
    return null;
  }
  return {
    documentKind: ref.documentKind as BusinessProjectRef["documentKind"],
    documentId: ref.documentId as UuidString,
    revisionId: ref.revisionId,
    contentChecksum: ref.contentChecksum,
    uri,
  };
}
