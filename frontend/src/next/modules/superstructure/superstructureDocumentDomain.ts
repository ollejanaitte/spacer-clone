/**
 * SuperstructureDocument domain (Phase 5-01 A-01 FROZEN).
 *
 * Creates the empty document and builds a new SuperstructureDocument from
 * Bridge Layout references + superstructure-owned inputs. Span/Support
 * references are attached by WP-B (`attachSuperstructureHandoffs`).
 *
 * Values are never invented: MISSING is preserved, derived values carry
 * provenance. The document is DRAFT until validation passes.
 */

import { deriveStableUuid } from "../../../contracts/legacy/idStability";
import {
  SUPERSTRUCTURE_PRODUCER,
  SUPERSTRUCTURE_SCHEMA_VERSION,
  SUPERSTRUCTURE_TYPE_PLATE_GIRDER_RC_SLAB_NON_COMPOSITE,
  type BridgeLayoutReference,
  type RoadReference,
  type SpanReferences,
  type SuperstructureDocument,
  type SupportReferences,
} from "./superstructureTypes";

export const DEFAULT_CREATED_AT = "2026-08-08T00:00:00.000Z";

export interface SuperstructureDocumentInput {
  readonly projectId: string;
  readonly bridgeLayoutReference: BridgeLayoutReference;
  readonly roadReference: RoadReference;
  readonly superstructureType?: string;
  readonly structuralSystem?: { spanSystem: "simple" | "continuous"; bridgeSystem: "SIMPLE_SINGLE" | "CONTINUOUS" };
  readonly girderConfiguration: SuperstructureDocument["girderConfiguration"];
  readonly materialConfiguration?: SuperstructureDocument["materialConfiguration"];
  readonly deckConfiguration: SuperstructureDocument["deckConfiguration"];
  readonly crossBeamConfiguration?: SuperstructureDocument["crossBeamConfiguration"];
  readonly crossFrameConfiguration?: SuperstructureDocument["crossFrameConfiguration"];
  readonly bearingConfiguration?: SuperstructureDocument["bearingConfiguration"];
}

/** Deterministic stable document id for a bridge. */
export function superstructureDocumentIdFor(bridgeId: string): string {
  return deriveStableUuid("superstructure-design", bridgeId);
}

export function createEmptySuperstructureDocument(projectId: string): SuperstructureDocument {
  return {
    schemaVersion: SUPERSTRUCTURE_SCHEMA_VERSION,
    documentKind: "superstructure-design",
    documentId: "",
    projectId,
    revisionId: 1,
    status: "DRAFT",
    provenance: { createdAt: DEFAULT_CREATED_AT, createdBy: SUPERSTRUCTURE_PRODUCER, producer: SUPERSTRUCTURE_PRODUCER },
    timestamps: { updatedAt: DEFAULT_CREATED_AT, derivedAt: null },
    bridgeLayoutReference: null,
    roadReference: null,
    spanReferences: null,
    supportReferences: null,
    superstructureType: SUPERSTRUCTURE_TYPE_PLATE_GIRDER_RC_SLAB_NON_COMPOSITE,
    structuralSystem: { spanSystem: "continuous", bridgeSystem: "CONTINUOUS" },
    girderConfiguration: {
      girderCount: 0,
      girderSpacingM: null,
      girderLines: [],
      girderSectionModel: {
        depthM: null,
        webThicknessM: null,
        topFlange: null,
        bottomFlange: null,
        areaM2: null,
        unitWeightPerM: null,
      },
    },
    materialConfiguration: null,
    deckConfiguration: {
      deckId: "DECK-1",
      deckKind: "rc_non_composite",
      thicknessM: null,
      unitWeight: null,
      overhangLeftM: null,
      overhangRightM: null,
      resolvedWidthM: null,
    },
    crossBeamConfiguration: null,
    crossFrameConfiguration: null,
    bearingConfiguration: { bearingSupportRelation: [], bearingSeats: [] },
    geometryReference: {
      snapshotFingerprint: null,
      snapshotVersion: null,
      generatedAt: null,
      model3DReference: { solidsDigest: null },
    },
    loadModel: {
      deadLoads: {
        structuralGirder: { state: "MISSING", valueKN: null },
        structuralSecondary: { state: "MISSING", valueKN: null },
        deck: { state: "MISSING", valueKN: null },
        pavement: { state: "MISSING", valueKN: null },
        appurtenances: { state: "MISSING", valueKN: null },
      },
      liveLoadReference: null,
    },
    analysisModel: {
      analysisStatus: "NOT_AVAILABLE",
      modelReference: { grillageModelDigest: null },
      authorization: {
        numericDesignAuthorization: "NOT_GRANTED",
        stateReason: "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED; analysis is not authorized.",
      },
    },
    designResults: {
      designStatus: "NOT_AUTHORIZED",
      checks: [],
      reactionResultsReference: { reactionDigest: null },
    },
    reactionResults: { reactionStatus: "NOT_AVAILABLE", reactionCases: [] },
    validation: { schemaVersion: SUPERSTRUCTURE_SCHEMA_VERSION, validatedAt: null, ok: false, issues: [] },
    extensions: {},
  };
}

/** Derive equal-spaced girder offsets when girderSpacingM is declared (never invents offsets otherwise). */
export function deriveGirderOffsets(girderCount: number, girderSpacingM: number | null): number[] | null {
  if (girderCount < 1) return null;
  if (girderSpacingM === null || !(girderSpacingM > 0)) return null;
  const offsets: number[] = [];
  for (let i = 0; i < girderCount; i += 1) {
    offsets.push((i - (girderCount - 1) / 2) * girderSpacingM);
  }
  return offsets;
}

/** Build a new SuperstructureDocument (DRAFT). Bridge Layout must be set (fail-closed). */
export function buildSuperstructureDocument(
  input: SuperstructureDocumentInput,
  now: string = new Date().toISOString(),
): { ok: true; document: SuperstructureDocument } | { ok: false; issues: readonly { path: string; message: string }[] } {
  const documentId = superstructureDocumentIdFor(input.bridgeLayoutReference.bridgeId);
  const base = createEmptySuperstructureDocument(input.projectId);

  // girder offsets: spacing-derived unless explicit offsets provided
  let girderLines = input.girderConfiguration.girderLines;
  if (girderLines.length === 0 && input.girderConfiguration.girderSpacingM !== null) {
    const offsets = deriveGirderOffsets(input.girderConfiguration.girderCount, input.girderConfiguration.girderSpacingM);
    if (offsets === null) {
      return {
        ok: false,
        issues: [{ path: "girderConfiguration", message: "cannot derive girder offsets: girderSpacingM missing or invalid" }],
      };
    }
    girderLines = offsets.map((offset, index) => ({
      girderId: `G${index + 1}`,
      index,
      label: `G${index + 1}`,
      offsetFromCenterline: offset,
      offsetEndFromCenterline: null,
      materialRefId: null,
      sectionIntentRefId: null,
    }));
  }

  const document: SuperstructureDocument = {
    ...base,
    documentId,
    provenance: { ...base.provenance, createdAt: now, createdBy: SUPERSTRUCTURE_PRODUCER, producer: SUPERSTRUCTURE_PRODUCER },
    timestamps: { updatedAt: now, derivedAt: null },
    bridgeLayoutReference: input.bridgeLayoutReference,
    roadReference: input.roadReference,
    superstructureType: input.superstructureType ?? SUPERSTRUCTURE_TYPE_PLATE_GIRDER_RC_SLAB_NON_COMPOSITE,
    structuralSystem: input.structuralSystem ?? base.structuralSystem,
    girderConfiguration: { ...input.girderConfiguration, girderLines },
    materialConfiguration: input.materialConfiguration ?? null,
    deckConfiguration: input.deckConfiguration,
    crossBeamConfiguration: input.crossBeamConfiguration ?? null,
    crossFrameConfiguration: input.crossFrameConfiguration ?? null,
    bearingConfiguration: input.bearingConfiguration ?? base.bearingConfiguration,
  };
  return { ok: true, document };
}

/** Attach derived Span/Support Handoff snapshots (WP-B). Transient in the persisted DTO. */
export function attachSuperstructureHandoffs(
  document: SuperstructureDocument,
  spanReferences: SpanReferences | null,
  supportReferences: SupportReferences | null,
  now: string = new Date().toISOString(),
): SuperstructureDocument {
  return {
    ...document,
    spanReferences,
    supportReferences,
    timestamps: { ...document.timestamps, derivedAt: now },
  };
}
