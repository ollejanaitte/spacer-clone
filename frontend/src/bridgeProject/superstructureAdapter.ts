/**
 * Phase 3-4: ②上部工 → BridgeProject.Superstructure Adapter.
 *
 * Extracts the superstructure's SHARED design facts (girder arrangement, deck,
 * bearing/support incidence, span system, 3D reference, authorization state)
 * from the ② GeometrySnapshot + BSDD + bridge-structure input, and produces the
 * BridgeProject.Superstructure record with full provenance.
 *
 * Responsibilities:
 *  - mapping (snapshot/BSDD/input -> shared facts)
 *  - unit normalization (m / rad)
 *  - provenance / revision attribution
 *  - authorization guard (NOT_AUTHORIZED analysis is never promoted)
 *  - deterministic serialization (Save / Load / Replay)
 *
 * Out of scope: superstructure design algorithms, analysis, reactions,
 * workflow engine.
 */

import { deriveStableUuid } from "../contracts/legacy/idStability";
import { canonicalJsonForChecksum } from "../contracts/legacy/checksum";
import type { GeometrySnapshot } from "../apollo/geometry/types";
import type { BridgeSuperstructureDesignDocument } from "../contracts/bridgeSuperstructureDesignDocument";
import {
  BRIDGE_PROJECT_SUPERSTRUCTURE_SCHEMA_VERSION,
  BRIDGE_PROJECT_SUPERSTRUCTURE_TOOL_ID,
  SUPERSTRUCTURE_KIND_PLATE_GIRDER_RC_SLAB_NON_COMPOSITE,
  type BpDeckFacts,
  type BpGirderArrangement,
  type BridgeProjectSuperstructure,
  bpConfirmed,
  bpMissing,
} from "./types";
import { BridgeProjectAdapterError, BP_CODES, assertFinite } from "./validation";

export interface SuperstructureAdapterOptions {
  /** Superstructure type declaration (SUPERSTRUCTURE_OWNER). Default: the supported plate-girder kind. */
  readonly superstructureType?: string;
  readonly spanSystem?: "simple" | "continuous";
  /** Bridge-structure input draft (superstructure-owned scalars: deckThickness, etc.). */
  readonly bridgeStructureInput?: {
    readonly deckThickness: number | null;
    readonly girderCount: number | null;
  };
  readonly createdAt?: string;
  readonly revisionId?: number;
}

const DEFAULT_CREATED_AT = "2026-08-08T00:00:00.000Z";

function documentIdFor(bridgeId: string): string {
  return deriveStableUuid("bridge-project.superstructure", bridgeId);
}

/**
 * Build the shared BridgeProject.Superstructure record from ② state.
 * Deterministic for identical inputs. Never invents design values.
 */
export function buildBridgeProjectSuperstructure(
  snapshot: GeometrySnapshot,
  options: SuperstructureAdapterOptions = {},
): BridgeProjectSuperstructure {
  const bridgeId = snapshot.bridgeId;
  if (!bridgeId || bridgeId.trim().length === 0) {
    throw new BridgeProjectAdapterError(
      BP_CODES.UNIT_INVALID,
      "BridgeProject.Superstructure requires a non-empty bridgeId from the Geometry snapshot.",
    );
  }

  // Girder arrangement: SUPERSTRUCTURE-owned offsets from the snapshot girder lines.
  const mainGirderArrangement: BpGirderArrangement[] = snapshot.girderLines.map((line) => {
    const offsetM = line.offsetM.value;
    if (typeof offsetM !== "number" || !Number.isFinite(offsetM)) {
      throw new BridgeProjectAdapterError(
        BP_CODES.NON_FINITE,
        `BridgeProject.Superstructure requires a finite girder offset for ${line.girderId}.`,
      );
    }
    return {
      girderId: line.girderId,
      offsetM: bpConfirmed(offsetM, "m", line.girderId),
    };
  });
  if (mainGirderArrangement.length === 0) {
    throw new BridgeProjectAdapterError(
      BP_CODES.SOURCE_INVALID,
      "BridgeProject.Superstructure requires at least one girder line in the Geometry snapshot.",
    );
  }

  // Deck facts: width from the snapshot deck reference; thickness only when
  // declared by the superstructure input (else MISSING — never invented).
  const deckRef = snapshot.deckReferences[0];
  let deck: BpDeckFacts | undefined;
  if (deckRef !== undefined) {
    const widthM = deckRef.widthM.value;
    if (typeof widthM !== "number" || !Number.isFinite(widthM)) {
      throw new BridgeProjectAdapterError(
        BP_CODES.NON_FINITE,
        "BridgeProject.Superstructure requires a finite deck width from the snapshot.",
      );
    }
    const thickness = options.bridgeStructureInput?.deckThickness;
    deck = {
      deckId: deckRef.deckId,
      widthM: bpConfirmed(widthM, "m", "snapshot deck reference"),
      ...(thickness !== undefined && thickness !== null && Number.isFinite(thickness)
        ? { thicknessM: bpConfirmed(thickness, "m", "superstructure deck input") }
        : { thicknessM: bpMissing("m", "deck thickness not declared in the superstructure input") }),
    };
  }

  // Bearing/support incidence: dedupe snapshot bearingPoints (support × girder).
  const bearingSupportRelation = Array.from(
    new Map(
      snapshot.bearingPoints.map((bp) => [`${bp.supportId}:${bp.girderId}`, bp]),
    ).values(),
  ).map((bp) => ({ supportId: bp.supportId, girderId: bp.girderId }));

  const analysisReference = {
    status: "NOT_AUTHORIZED" as const,
    stateReason:
      "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED; formal superstructure analysis is not authorized.",
  };

  return {
    schemaVersion: BRIDGE_PROJECT_SUPERSTRUCTURE_SCHEMA_VERSION,
    documentId: documentIdFor(bridgeId),
    revisionId: options.revisionId ?? 1,
    provenance: {
      createdAt: options.createdAt ?? DEFAULT_CREATED_AT,
      createdBy: BRIDGE_PROJECT_SUPERSTRUCTURE_TOOL_ID,
      producer: BRIDGE_PROJECT_SUPERSTRUCTURE_TOOL_ID,
    },
    bridgeId,
    superstructureType:
      options.superstructureType ?? SUPERSTRUCTURE_KIND_PLATE_GIRDER_RC_SLAB_NON_COMPOSITE,
    spanSystem: options.spanSystem ?? "continuous",
    mainGirderArrangement,
    ...(deck !== undefined ? { deck } : {}),
    bearingSupportRelation,
    analysisReference,
    model3DReference: {
      snapshotFingerprint: snapshot.fingerprint,
      snapshotVersion: snapshot.snapshotVersion,
    },
    generatedBy: BRIDGE_PROJECT_SUPERSTRUCTURE_TOOL_ID,
  };
}

/**
 * Deterministic serialization / parse for the BridgeProject.Superstructure
 * record (Save / Load / Replay).
 */
export function serializeBridgeProjectSuperstructure(
  superstructure: BridgeProjectSuperstructure,
): string {
  return canonicalJsonForChecksum(superstructure);
}

export function parseBridgeProjectSuperstructure(text: string): BridgeProjectSuperstructure {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    throw new BridgeProjectAdapterError(
      BP_CODES.UNIT_INVALID,
      `Invalid BridgeProject.Superstructure JSON: ${(error as Error).message}`,
    );
  }
  const parsed = value as BridgeProjectSuperstructure;
  if (parsed.schemaVersion !== BRIDGE_PROJECT_SUPERSTRUCTURE_SCHEMA_VERSION) {
    throw new BridgeProjectAdapterError(
      BP_CODES.UNIT_INVALID,
      `Unsupported BridgeProject.Superstructure schemaVersion ${parsed.schemaVersion}.`,
    );
  }
  if (typeof parsed.bridgeId !== "string" || parsed.bridgeId.trim().length === 0) {
    throw new BridgeProjectAdapterError(
      BP_CODES.UNIT_INVALID,
      "BridgeProject.Superstructure bridgeId must be a non-empty string.",
    );
  }
  if (parsed.mainGirderArrangement === undefined || !Array.isArray(parsed.mainGirderArrangement)) {
    throw new BridgeProjectAdapterError(
      BP_CODES.UNIT_INVALID,
      "BridgeProject.Superstructure mainGirderArrangement is required.",
    );
  }
  if (
    parsed.analysisReference === undefined ||
    !["NOT_AUTHORIZED", "NOT_AVAILABLE"].includes(parsed.analysisReference.status)
  ) {
    throw new BridgeProjectAdapterError(
      BP_CODES.UNIT_INVALID,
      "BridgeProject.Superstructure analysisReference.status must be NOT_AUTHORIZED or NOT_AVAILABLE.",
    );
  }
  return parsed;
}

/** Re-export the error type for consumers. */
export { BridgeProjectAdapterError };
