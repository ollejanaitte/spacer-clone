/**
 * SubstructureDocument domain (Phase 6-01 A FROZEN).
 *
 * Creates the empty document and builds a new SubstructureDocument from Bridge
 * Layout + Superstructure references. Support/Bearing/Reaction references are
 * attached by WP-B/WP-C adapters.
 */

import { deriveStableUuid } from "../../../contracts/legacy/idStability";
import {
  SUBSTRUCTURE_PRODUCER,
  SUBSTRUCTURE_SCHEMA_VERSION,
  type BridgeLayoutReference,
  type RoadReference,
  type SubstructureDocument,
  type SuperstructureReference,
} from "./substructureTypes";

export const DEFAULT_CREATED_AT = "2026-08-08T00:00:00.000Z";

/** Deterministic stable document id for a bridge. */
export function substructureDocumentIdFor(bridgeId: string): string {
  return deriveStableUuid("substructure-design", bridgeId);
}

export function createEmptySubstructureDocument(projectId: string): SubstructureDocument {
  return {
    schemaVersion: SUBSTRUCTURE_SCHEMA_VERSION,
    documentKind: "substructure-design",
    documentId: "",
    projectId,
    revisionId: 1,
    status: "DRAFT",
    provenance: { createdAt: DEFAULT_CREATED_AT, createdBy: SUBSTRUCTURE_PRODUCER, producer: SUBSTRUCTURE_PRODUCER },
    timestamps: { updatedAt: DEFAULT_CREATED_AT, derivedAt: null },
    bridgeLayoutReference: null,
    superstructureReference: null,
    roadReference: null,
    supportReferences: null,
    bearingReactionReferences: null,
    supports: [],
    bearingSeatReferences: [],
    footingConfigurations: [],
    foundationConfigurations: [],
    pileConfigurations: [],
    terrainReferences: null,
    existingReferences: null,
    geometryReference: {
      snapshotFingerprint: null,
      snapshotVersion: null,
      generatedAt: null,
      model3DReference: { solidsDigest: null },
    },
    designInputs: { superstructureReactions: [] },
    designResults: {
      designStatus: "NOT_AUTHORIZED",
      checks: [],
      reactionStatus: "NOT_AVAILABLE",
    },
    quantityResults: { quantityStatus: "NOT_AVAILABLE", totalConcreteVolumeM3: null, totalPileLengthM: null, units: "m³ / m" },
    validation: { schemaVersion: SUBSTRUCTURE_SCHEMA_VERSION, validatedAt: null, ok: false, issues: [] },
    extensions: {},
  };
}

export interface SubstructureDocumentInput {
  readonly projectId: string;
  readonly bridgeLayoutReference: BridgeLayoutReference;
  readonly superstructureReference: SuperstructureReference;
  readonly roadReference: RoadReference;
  readonly supports?: SubstructureDocument["supports"];
  readonly footingConfigurations?: SubstructureDocument["footingConfigurations"];
  readonly foundationConfigurations?: SubstructureDocument["foundationConfigurations"];
  readonly pileConfigurations?: SubstructureDocument["pileConfigurations"];
  readonly terrainReferences?: SubstructureDocument["terrainReferences"];
  readonly existingReferences?: SubstructureDocument["existingReferences"];
}

/** Build a new SubstructureDocument (DRAFT). Fail-closed: references required. */
export function buildSubstructureDocument(
  input: SubstructureDocumentInput,
  now: string = new Date().toISOString(),
): { ok: true; document: SubstructureDocument } | { ok: false; issues: readonly { path: string; message: string }[] } {
  const documentId = substructureDocumentIdFor(input.bridgeLayoutReference.bridgeId);
  const base = createEmptySubstructureDocument(input.projectId);
  const document: SubstructureDocument = {
    ...base,
    documentId,
    provenance: { ...base.provenance, createdAt: now, createdBy: SUBSTRUCTURE_PRODUCER, producer: SUBSTRUCTURE_PRODUCER },
    timestamps: { updatedAt: now, derivedAt: null },
    bridgeLayoutReference: input.bridgeLayoutReference,
    superstructureReference: input.superstructureReference,
    roadReference: input.roadReference,
    supports: input.supports ?? [],
    footingConfigurations: input.footingConfigurations ?? [],
    foundationConfigurations: input.foundationConfigurations ?? [],
    pileConfigurations: input.pileConfigurations ?? [],
    terrainReferences: input.terrainReferences ?? null,
    existingReferences: input.existingReferences ?? null,
  };
  return { ok: true, document };
}

/** Attach derived Handoff snapshots (WP-B/C). Transient in the persisted DTO. */
export function attachSubstructureHandoffs(
  document: SubstructureDocument,
  supportReferences: SubstructureDocument["supportReferences"],
  bearingReactionReferences: SubstructureDocument["bearingReactionReferences"],
  now: string = new Date().toISOString(),
): SubstructureDocument {
  return {
    ...document,
    supportReferences,
    bearingReactionReferences,
    timestamps: { ...document.timestamps, derivedAt: now },
  };
}
