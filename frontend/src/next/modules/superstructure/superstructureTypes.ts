/**
 * SuperstructureDocument contract types (Phase 5-01 A-01 FROZEN).
 *
 * The superstructure canonical document in the new Project Data Core
 * (`modules.superstructure.data.superstructureDocument`). Bridge Layout is the
 * sole layout authority; span/support references are DERIVED (transient in the
 * persisted DTO, regenerated and validated on restore).
 */

export const SUPERSTRUCTURE_MODULE_ID = "superstructure" as const;
export const SUPERSTRUCTURE_SCHEMA_VERSION = "0.1.0" as const;
export const SUPERSTRUCTURE_DATA_VERSION = "1.0.0" as const;

export const SUPERSTRUCTURE_TYPE_PLATE_GIRDER_RC_SLAB_NON_COMPOSITE =
  "plate_girder_rc_slab_non_composite" as const;

export type SuperstructureDocumentStatus =
  | "DRAFT"
  | "VALIDATED"
  | "APPROVED"
  | "STALE"
  | "ARCHIVED";

export interface SuperstructureIssue {
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

// ---------------------------------------------------------------------------
// Derived inputs from Bridge Layout (transient in persisted DTO)
// ---------------------------------------------------------------------------

export interface SpanHandoffItem {
  readonly spanId: string;
  readonly index: number;
  readonly startSupportId: string;
  readonly endSupportId: string;
  readonly startStation: number;
  readonly endStation: number;
  readonly spanLength: number;
  readonly startSupportSkew: number | null;
  readonly endSupportSkew: number | null;
}

export interface SpanReferences {
  readonly handoffId: string;
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly spans: readonly SpanHandoffItem[];
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

export interface SupportReferences {
  readonly handoffId: string;
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly supports: readonly SupportHandoffItem[];
}

// ---------------------------------------------------------------------------
// Superstructure-owned inputs
// ---------------------------------------------------------------------------

export interface StructuralSystem {
  readonly spanSystem: "simple" | "continuous";
  /** derived resolution (SIMPLE_SINGLE=1 span / CONTINUOUS>=2). Validated against spanReferences. */
  readonly bridgeSystem: "SIMPLE_SINGLE" | "CONTINUOUS";
}

export interface GirderLine {
  readonly girderId: string;
  readonly index: number;
  readonly label: string;
  readonly offsetFromCenterline: number;
  readonly offsetEndFromCenterline: number | null;
  readonly materialRefId: string | null;
  readonly sectionIntentRefId: string | null;
}

export interface FlangeDimensions {
  readonly widthM: number | null;
  readonly thicknessM: number | null;
}

export interface GirderSectionModel {
  readonly depthM: number | null;
  readonly webThicknessM: number | null;
  readonly topFlange: FlangeDimensions | null;
  readonly bottomFlange: FlangeDimensions | null;
  readonly areaM2: number | null;
  readonly unitWeightPerM: number | null;
}

export interface GirderConfiguration {
  readonly girderCount: number;
  readonly girderSpacingM: number | null;
  readonly girderLines: readonly GirderLine[];
  readonly girderSectionModel: GirderSectionModel;
}

/**
 * Steel material configuration (Phase 7-01C §3.1 FROZEN).
 * Optional: when unset the frozen engineering default steel applies
 * (E=2.05e8 kN/m2, G=8.0e7, nu=0.3, rho=78.5 kN/m3, DERIVED). When declared
 * the values become CONFIRMED (AUTHORIZED input; the frozen default is
 * overridden upstream).
 */
export interface MaterialConfiguration {
  readonly elasticModulusKN_M2: number | null;
  readonly shearModulusKN_M2: number | null;
  readonly poissonRatio: number | null;
  readonly densityKN_M3: number | null;
}

export interface DeckConfiguration {
  readonly deckId: string;
  readonly deckKind: "rc_non_composite";
  readonly thicknessM: number | null;
  readonly unitWeight: number | null;
  readonly overhangLeftM: number | null;
  readonly overhangRightM: number | null;
  /** derived resolution (road cross-section width + overhang). null when not resolvable. */
  readonly resolvedWidthM: number | null;
}

export interface CrossBeam {
  readonly crossBeamId: string;
  readonly kind: "end" | "support" | "intermediate";
  readonly stationM: number;
  readonly depthM: number | null;
  readonly widthM: number | null;
}

export interface CrossBeamConfiguration {
  readonly crossBeamSpacingM: number;
  readonly crossBeams: readonly CrossBeam[];
}

export interface CrossFrameConfiguration {
  readonly crossFrameSpacingM: number;
  readonly swayBracing: { intervalM: number };
  readonly lateralBracing: { intervalM: number };
}

export interface BearingRelation {
  readonly supportId: string;
  readonly girderId: string;
}

export interface BearingSeat {
  readonly seatId: string;
  readonly supportId: string;
  readonly girderId: string;
  readonly bearingType: "rubber" | "fixed" | "movable" | null;
  readonly fixedOrMovable: "FIXED" | "MOVABLE" | "UNDECIDED";
  readonly longitudinalDirection: "+station" | "-station" | null;
  readonly transverseDirection: "L" | "R" | null;
}

export interface BearingConfiguration {
  readonly bearingSupportRelation: readonly BearingRelation[];
  readonly bearingSeats: readonly BearingSeat[];
}

// ---------------------------------------------------------------------------
// Derived results / references
// ---------------------------------------------------------------------------

export interface GeometryReference {
  readonly snapshotFingerprint: string | null;
  readonly snapshotVersion: string | null;
  readonly generatedAt: string | null;
  readonly model3DReference: { solidsDigest: string | null };
}

export type LoadValueState = "CONFIRMED" | "DERIVED" | "MISSING";

export interface DeadLoadEntry {
  readonly state: LoadValueState;
  readonly valueKN: number | null;
}

export interface DeadLoads {
  readonly structuralGirder: DeadLoadEntry;
  readonly structuralSecondary: DeadLoadEntry;
  readonly deck: DeadLoadEntry;
  readonly pavement: DeadLoadEntry;
  readonly appurtenances: DeadLoadEntry;
}

export interface LoadModel {
  readonly deadLoads: DeadLoads;
  /** Live load is an input boundary only (not implemented in Phase 5-02). */
  readonly liveLoadReference: null;
}

export interface AnalysisModel {
  readonly analysisStatus: "NOT_AUTHORIZED" | "NOT_AVAILABLE" | "PENDING" | "READY";
  readonly modelReference: { grillageModelDigest: string | null };
  readonly authorization: {
    readonly numericDesignAuthorization: "NOT_GRANTED";
    readonly stateReason: string;
  };
}

export type DesignCheckStatus = "NOT_AUTHORIZED" | "OK" | "NG" | "WARNING" | "STALE" | "NOT_AVAILABLE";

export interface DesignCheckResult {
  readonly checkId: string;
  readonly status: DesignCheckStatus;
  readonly ruleReference: string;
  readonly message: string | null;
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
  readonly checks: readonly DesignCheckResult[];
  readonly reactionResultsReference: { reactionDigest: string | null };
}

export interface ReactionCase {
  readonly caseId: string;
  readonly combinationId: string;
  readonly seatId: string;
  readonly supportId: string;
  readonly girderId: string;
  readonly Fx: number;
  readonly Fy: number;
  readonly Fz: number;
  readonly Mx: number;
  readonly My: number;
  readonly Mz: number;
  readonly unit: "kN";
  readonly momentUnit: "kNm";
  readonly signConvention: { force: "up-positive"; moment: "right-hand-rule" };
}

export interface ReactionResults {
  readonly reactionStatus: "NOT_AUTHORIZED" | "NOT_AVAILABLE";
  readonly reactionCases: readonly ReactionCase[];
}

export interface SuperstructureValidationState {
  readonly schemaVersion: string;
  readonly validatedAt: string | null;
  readonly ok: boolean;
  readonly issues: readonly SuperstructureIssue[];
}

export interface SuperstructureDocument {
  readonly schemaVersion: typeof SUPERSTRUCTURE_SCHEMA_VERSION;
  readonly documentKind: "superstructure-design";
  readonly documentId: string;
  readonly projectId: string;
  readonly revisionId: number;
  readonly status: SuperstructureDocumentStatus;
  readonly provenance: {
    readonly createdAt: string;
    readonly createdBy: string;
    readonly producer: string;
  };
  readonly timestamps: { readonly updatedAt: string; readonly derivedAt: string | null };
  readonly bridgeLayoutReference: BridgeLayoutReference | null;
  readonly roadReference: RoadReference | null;
  /** derived from Span Handoff. Transient in the persisted DTO. */
  readonly spanReferences: SpanReferences | null;
  /** derived from Support Handoff. Transient in the persisted DTO. */
  readonly supportReferences: SupportReferences | null;
  readonly superstructureType: string;
  readonly structuralSystem: StructuralSystem;
  readonly girderConfiguration: GirderConfiguration;
  readonly materialConfiguration: MaterialConfiguration | null;
  readonly deckConfiguration: DeckConfiguration;
  readonly crossBeamConfiguration: CrossBeamConfiguration | null;
  readonly crossFrameConfiguration: CrossFrameConfiguration | null;
  readonly bearingConfiguration: BearingConfiguration;
  readonly geometryReference: GeometryReference;
  readonly loadModel: LoadModel;
  readonly analysisModel: AnalysisModel;
  readonly designResults: DesignResults;
  readonly reactionResults: ReactionResults;
  readonly validation: SuperstructureValidationState;
  readonly extensions: Record<string, unknown>;
}

export interface SuperstructureModuleData {
  readonly superstructureDocument?: SuperstructureDocument;
}

export const SUPERSTRUCTURE_PRODUCER = "spacer-superstructure-module" as const;
