/**
 * SubstructureDocument contract types (Phase 6-01 A FROZEN).
 *
 * The substructure canonical document in the new Project Data Core
 * (`modules.substructure.data.substructureDocument`). Bridge Layout and
 * Superstructure documents are the upstream authorities; span/support/bearing/
 * reaction references are DERIVED (transient in the persisted DTO, regenerated
 * and validated on restore).
 *
 * The existing substructure model.ts (v0.2.0) types (Support / PierData /
 * AbutmentData / Footing / PileGroup / BearingSeat) are ADAPTED as canonical
 * input types (not duplicated).
 */

import type {
  Support,
  PierData,
  AbutmentData,
  Footing,
  PileGroup,
  BearingSeat,
} from "../../../substructure/model";

export const SUBSTRUCTURE_MODULE_ID = "substructure" as const;
export const SUBSTRUCTURE_SCHEMA_VERSION = "0.1.0" as const;
export const SUBSTRUCTURE_DATA_VERSION = "1.0.0" as const;

export type SubstructureStatus =
  | "DRAFT"
  | "VALIDATED"
  | "APPROVED"
  | "STALE"
  | "ARCHIVED";

export interface SubstructureIssue {
  readonly path: string;
  readonly message: string;
}

export interface RoadReference {
  readonly moduleId: "road";
  readonly alignmentId: string | null;
  readonly stationReferenceId: string | null;
  readonly coordinatePolicyId: string | null;
}

export interface BridgeLayoutReference {
  readonly bridgeId: string;
  readonly moduleId: "bridgeLayout";
  readonly documentVersion: string;
  readonly layoutFingerprint: string;
}

export interface SuperstructureReference {
  readonly bridgeId: string;
  readonly moduleId: "superstructure";
  readonly documentVersion: string;
  readonly superstructureDocumentId: string;
  readonly handoffSchemaVersion: string;
}

// ---------------------------------------------------------------------------
// Derived inputs from upstream Handoffs (transient in persisted DTO)
// ---------------------------------------------------------------------------

/** Phase 4 Support Handoff (derived). */
export interface SupportReferences {
  readonly handoffId: string;
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly supports: readonly SupportHandoffItem[];
}

export interface SupportHandoffItem {
  readonly supportId: string;
  readonly supportType: "abutment" | "pier";
  readonly label: string;
  readonly station: number;
  readonly position: { domainX: number; domainY: number; elevation: number };
  readonly tangentAzimuthRad: number;
  readonly skewAngleRad: number | null;
  readonly skewSource?: "automatic" | "user";
  readonly terrainElevation: number | null;
  readonly roadReferenceId: string;
  readonly coordinateContextId: string | null;
}

/** Phase 5 Superstructure Handoff (derived). */
export interface BearingReactionReferences {
  readonly handoffId: string;
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly bearingSeats: readonly BearingSeatReference[];
  readonly reactionCases: readonly ReactionCaseReference[];
  readonly girderBottomElevation: Record<string, number | null>;
  readonly deckElevation: Record<string, number | null>;
  readonly superstructureEnvelope: unknown;
  readonly selfWeight: unknown;
  readonly reactionStatus: "NOT_AUTHORIZED" | "NOT_AVAILABLE";
  readonly authorizationStatus: "NOT_AUTHORIZED" | "NOT_AVAILABLE";
}

export interface BearingSeatReference {
  readonly seatId: string; // BRG-{supportId}-{girderId} (canonical)
  readonly supportId: string;
  readonly girderId: string;
  readonly position: { x: number; y: number; z: number };
  readonly elevation: number;
  readonly localOffset: { longitudinalM: number; transverseM: number };
  readonly orientation: {
    readonly longitudinalAxis: { x: number; y: number; z: number };
    readonly transverseAxis: { x: number; y: number; z: number };
    readonly verticalAxis: { x: number; y: number; z: number };
  };
  readonly bearingType: "rubber" | "pot" | "fixed" | "custom" | null;
  readonly fixedOrMovable: "FIXED" | "MOVABLE" | "UNDECIDED";
  readonly longitudinalDirection: "+station" | "-station" | null;
  readonly transverseDirection: "L" | "R" | null;
}

export interface ReactionCaseReference {
  readonly caseId: string;
  readonly combinationId: string;
  readonly seatId: string;
  readonly supportId: string;
  readonly girderId: string;
  readonly caseKind: "permanent" | "liveLoad" | "braking" | "wind" | "seismicLevel1" | "seismicLevel2" | "UNKNOWN";
  readonly Fx: number;
  readonly Fy: number;
  readonly Fz: number;
  readonly Mx: number;
  readonly My: number;
  readonly Mz: number;
  readonly unit: "kN";
  readonly momentUnit: "kNm";
  readonly signConvention: { force: "up-positive"; moment: "right-hand-rule" };
  readonly authorizationStatus: "NOT_AUTHORIZED" | "NOT_AVAILABLE";
}

// ---------------------------------------------------------------------------
// Canonical inputs (ADAPTED from substructure model.ts v0.2.0)
// ---------------------------------------------------------------------------

export interface FootingConfiguration {
  readonly id: string;
  readonly length: number; // 橋軸方向長 m
  readonly width: number; // 橋軸直角幅 m
  readonly thickness: number;
  readonly topElevation: number;
}

export interface PileConfiguration {
  readonly id: string;
  readonly pileType: "bored_pile" | "steel_pipe";
  readonly diameter: number;
  readonly length: number;
  readonly pileCount: number;
  readonly spacing: { x: number; y: number };
}

export interface FoundationConfiguration {
  readonly id: string;
  readonly formType: "spread" | "piled";
  readonly footingRefId: string;
  readonly pileGroupRefId: string | null;
}

export interface SubstructureSupport {
  // model.ts Support (ADAPT) — canonical, user-editable
  readonly supportId: string;
  readonly supportType: "pier" | "abutment";
  readonly placement: Support["placement"];
  readonly skewRad: number;
  readonly zOverride?: number;
  readonly placementSnapshot?: Support["placementSnapshot"];
  readonly bearingSeats: BearingSeat[];
  readonly pier?: PierData;
  readonly abutment?: AbutmentData;
}

export interface TerrainReferences {
  readonly moduleId: "terrain";
  readonly surfaceReference: string | null;
  readonly coordinateContextId: string | null;
}

export interface ExistingReferences {
  readonly moduleId: "existingConditions";
  readonly documentReferenceId: string | null;
}

export interface GeometryReference {
  readonly snapshotFingerprint: string | null;
  readonly snapshotVersion: string | null;
  readonly generatedAt: string | null;
  readonly model3DReference: { solidsDigest: string | null };
}

export interface DesignInputs {
  readonly superstructureReactions: readonly ReactionCaseReference[];
}

export interface DesignResults {
  readonly designStatus:
    | "NOT_AUTHORIZED"
    | "INCOMPLETE"
    | "READY"
    | "STALE"
    | "OK"
    | "NG"
    | "WARNING"
    | "ERROR";
  readonly checks: readonly { checkId: string; status: string; message: string | null }[];
  readonly reactionStatus: "NOT_AUTHORIZED" | "NOT_AVAILABLE";
}

export interface QuantityResults {
  readonly quantityStatus: "DERIVED" | "NOT_AVAILABLE";
  readonly totalConcreteVolumeM3: number | null;
  readonly totalPileLengthM: number | null;
  readonly units: string;
}

export interface SubstructureValidationState {
  readonly schemaVersion: string;
  readonly validatedAt: string | null;
  readonly ok: boolean;
  readonly issues: readonly SubstructureIssue[];
}

export interface SubstructureDocument {
  readonly schemaVersion: typeof SUBSTRUCTURE_SCHEMA_VERSION;
  readonly documentKind: "substructure-design";
  readonly documentId: string;
  readonly projectId: string;
  readonly revisionId: number;
  readonly status: SubstructureStatus;
  readonly provenance: {
    readonly createdAt: string;
    readonly createdBy: string;
    readonly producer: string;
  };
  readonly timestamps: { readonly updatedAt: string; readonly derivedAt: string | null };
  readonly bridgeLayoutReference: BridgeLayoutReference | null;
  readonly superstructureReference: SuperstructureReference | null;
  readonly roadReference: RoadReference | null;
  /** derived from Phase 4 Support Handoff. Transient in persisted DTO. */
  readonly supportReferences: SupportReferences | null;
  /** derived from Phase 5 Handoff. Transient in persisted DTO. */
  readonly bearingReactionReferences: BearingReactionReferences | null;
  readonly supports: readonly SubstructureSupport[];
  readonly bearingSeatReferences: readonly BearingSeatReference[];
  readonly footingConfigurations: readonly FootingConfiguration[];
  readonly foundationConfigurations: readonly FoundationConfiguration[];
  readonly pileConfigurations: readonly PileConfiguration[];
  readonly terrainReferences: TerrainReferences | null;
  readonly existingReferences: ExistingReferences | null;
  readonly geometryReference: GeometryReference;
  readonly designInputs: DesignInputs;
  readonly designResults: DesignResults;
  readonly quantityResults: QuantityResults;
  readonly validation: SubstructureValidationState;
  readonly extensions: Record<string, unknown>;
}

export interface SubstructureModuleData {
  readonly substructureDocument?: SubstructureDocument;
}

export const SUBSTRUCTURE_PRODUCER = "spacer-substructure-module" as const;
