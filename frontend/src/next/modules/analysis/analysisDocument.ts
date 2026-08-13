/**
 * AnalysisDocument builder (Phase 7-01 A FROZEN / Phase 7-02 WP-A).
 *
 * Creates a fresh (empty) AnalysisDocument envelope. Later work packages
 * (WP-B..WP-F) fill nodes/members/sections/materials/supports/bearings/springs
 * and loads. modelChecksum / contentChecksum are recomputed on every update
 * (deterministic scope; documentId/timestamps/revision excluded).
 */

import { generateUuid } from "../../../contracts/uuid";
import {
  ANALYSIS_ID_NAMESPACE,
  ANALYSIS_PRODUCER,
  ANALYSIS_SCHEMA_VERSION,
  type AnalysisDocument,
  type AnalysisSourceReferences,
  type PersistedResultRef,
} from "./analysisDocumentTypes";
import { deriveAnalysisEntityId } from "./analysisId";
import { computeAnalysisContentChecksum, computeAnalysisModelChecksum } from "./analysisChecksum";
import { validateAnalysisDocument } from "./analysisValidation";

export const ANALYSIS_COORDINATE_CONTEXT_ID = deriveAnalysisEntityId(
  "coordinateContext",
  "project-global",
);

export interface CreateAnalysisDocumentInput {
  readonly projectId: string;
  readonly createdBy: string;
  readonly sourceReferences: AnalysisSourceReferences;
  readonly now?: string;
}

/** Create a fresh empty AnalysisDocument envelope. */
export function createEmptyAnalysisDocument(
  input: CreateAnalysisDocumentInput,
): AnalysisDocument {
  const now = input.now ?? new Date().toISOString();
  const documentId = generateUuid();
  const base: AnalysisDocument = {
    schemaId: "spacer.contracts.analysis-document",
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    documentKind: "analysis-document",
    documentId,
    projectId: input.projectId,
    revisionId: 1,
    status: "DRAFT",
    contentChecksum: "",
    modelChecksum: "",
    provenance: {
      createdAt: now,
      createdBy: input.createdBy,
      producer: ANALYSIS_PRODUCER,
    },
    timestamps: { updatedAt: now, derivedAt: now },
    sourceReferences: input.sourceReferences,
    coordinateContext: {
      entityId: ANALYSIS_COORDINATE_CONTEXT_ID,
      coordinatePolicyId: null,
      axisConvention: "x-along/y-transverse/z-up",
      handedness: "right",
      unitSystem: "metric",
      positionConvention: "project-global-XYZ",
      signConvention: {
        reactionZ: "up-positive",
        moment: "right-hand-rule",
        skew: "counterclockwise-positive",
      },
      globalOrigin: { x: 0, y: 0, z: 0 },
    },
    unitContext: {
      length: "m",
      force: "kN",
      moment: "kNm",
      modulus: "kN/m2",
      density: "kN/m3",
      angle: "rad",
    },
    nodes: [],
    members: [],
    materials: [],
    sections: [],
    supports: [],
    releases: [],
    rigidLinks: [],
    mpc: [],
    bearings: [],
    springs: [],
    foundationSprings: [],
    loadCases: [],
    nodalLoads: [],
    memberLoads: [],
    loadCombinations: [],
    analysisSettings: {
      analysisType: "linear_static",
      solver: "scipy_sparse",
      solverVersion: "0.3.0",
      includeShearDeformation: false,
      largeDisplacement: false,
      options: {},
    },
    analysisStatus: "NOT_RUN",
    resultReferences: [],
    resultDigest: null,
    validation: {
      schemaVersion: ANALYSIS_SCHEMA_VERSION,
      validatedAt: null,
      ok: true,
      issues: [],
    },
    revision: { revisionId: 1, updatedAt: now, changes: ["created"] },
    extensions: {},
  };
  return finalizeAnalysisDocument(base);
}

/**
 * Recompute checksums + validation after any content change.
 * Returns a new document (immutable-style) with contentChecksum/modelChecksum
 * and validation re-derived. Determinism: modelChecksum depends only on the
 * checksum-scope fields.
 */
export function finalizeAnalysisDocument(document: AnalysisDocument): AnalysisDocument {
  const modelChecksum = computeAnalysisModelChecksum(document);
  const contentChecksum = computeAnalysisContentChecksum(document);
  const withChecksums = {
    ...document,
    modelChecksum,
    contentChecksum,
  };
  const issues = validateAnalysisDocument(withChecksums);
  return {
    ...withChecksums,
    validation: {
      schemaVersion: ANALYSIS_SCHEMA_VERSION,
      validatedAt: new Date().toISOString(),
      ok: issues.length === 0,
      issues,
    },
  };
}

/** Bump revision (re-generation marker) and re-finalize. */
export function regenerateAnalysisDocument(
  document: AnalysisDocument,
  change: string,
  now: string = new Date().toISOString(),
): AnalysisDocument {
  const nextRevisionId = document.revisionId + 1;
  const emptyRefs: readonly PersistedResultRef[] = [];
  const next = {
    ...document,
    revisionId: nextRevisionId,
    status: "VALIDATED" as const,
    analysisStatus: "STALE" as const,
    resultReferences: emptyRefs,
    resultDigest: null,
    timestamps: { ...document.timestamps, derivedAt: now, updatedAt: now },
    revision: {
      revisionId: nextRevisionId,
      updatedAt: now,
      changes: [...document.revision.changes, change],
    },
  };
  return finalizeAnalysisDocument(next);
}

export { ANALYSIS_ID_NAMESPACE };
