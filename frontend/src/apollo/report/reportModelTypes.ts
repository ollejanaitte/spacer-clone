/**
 * STEP 9 / Phase 4-B: canonical Report Model type layer.
 *
 * Strictly additive. Does NOT modify the Step 2-B development scaffold in
 * `reportModel.ts` (REPORT_CHAPTER_REGISTRY / CH-* / legacy ReportModel).
 * This file is the Phase 4 canonical type surface that the transformer
 * (4-C), validator (4-D) and projection (4-E) consume.
 *
 * Canonical contracts referenced:
 *   - docs/apollo/step9/phase3_continuous_report_model_spec/
 *     report_entity_matrix.csv            (entities -> R-* field rules)
 *     chapter_payload_matrix.csv          (CP-01..CP-34 chapter contracts)
 *     status_code_matrix.csv              (13 status codes)
 *
 * UNVERIFIED DEVELOPMENT OUTPUT — NOT FOR DESIGN OR CONSTRUCTION
 * NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
 */

/* -------------------------------------------------------------------------- */
/* Chapter identifiers                                                        */
/* -------------------------------------------------------------------------- */

/** Canonical chapter identifiers (CP-01..CP-34). Only CP-* may appear in output. */
export type CanonicalChapterId =
  | "CP-01" | "CP-02" | "CP-03" | "CP-04" | "CP-05" | "CP-06" | "CP-07"
  | "CP-08" | "CP-09" | "CP-10" | "CP-11" | "CP-12" | "CP-13" | "CP-14"
  | "CP-15" | "CP-16" | "CP-17" | "CP-18" | "CP-19" | "CP-20" | "CP-21"
  | "CP-22" | "CP-23" | "CP-24" | "CP-25" | "CP-30" | "CP-31" | "CP-32" | "CP-33"
  | "CP-34";

/** All canonical chapters that the CONTINUOUS Report Model may emit (CP-30..34 are PROHIBITED/NOT_AVAILABLE and therefore omitted from payloads). */
export const EMITTED_CHAPTER_IDS: readonly CanonicalChapterId[] = [
  "CP-01", "CP-02", "CP-03", "CP-04", "CP-05", "CP-06", "CP-07",
  "CP-09", "CP-10", "CP-11", "CP-12", "CP-13", "CP-14", "CP-17",
  "CP-19", "CP-20", "CP-21", "CP-22", "CP-23", "CP-25",
];

/** Deprecated Step 2-B development-scaffold chapter ids (deprecated alias layer, internal only). */
export type DeprecatedChapterId =
  | "CH-COVER" | "CH-DESIGN-COND" | "CH-STRUCTURE" | "CH-INPUTS" | "CH-SECTION"
  | "CH-LOADS" | "CH-ANALYSIS-SETTINGS" | "CH-REACTIONS" | "CH-SHEAR" | "CH-MOMENT"
  | "CH-DEFLECTION" | "CH-DEMAND" | "CH-QUANTITY" | "CH-DRAWING-REF"
  | "CH-WARNINGS" | "CH-AUDIT";

/**
 * Best-effort alias from the legacy CH-* scaffold chapter to the canonical
 * CP-* chapters it overlaps. Used only to bridge old `ReportModel` output to
 * the new canonical model; CP-* is the source of truth.
 */
export const CH_TO_CP: Readonly<Record<DeprecatedChapterId, readonly CanonicalChapterId[]>> =
  {
    "CH-COVER": ["CP-01", "CP-02", "CP-03", "CP-04"],
    "CH-DESIGN-COND": ["CP-06", "CP-22"],
    "CH-STRUCTURE": ["CP-05", "CP-07", "CP-09", "CP-10", "CP-11"],
    "CH-INPUTS": ["CP-12", "CP-13"],
    "CH-SECTION": ["CP-13"],
    "CH-LOADS": ["CP-14"],
    "CH-ANALYSIS-SETTINGS": ["CP-16"],
    "CH-REACTIONS": ["CP-30"],
    "CH-SHEAR": ["CP-31"],
    "CH-MOMENT": ["CP-32"],
    "CH-DEFLECTION": ["CP-33"],
    "CH-DEMAND": ["CP-34"],
    "CH-QUANTITY": ["CP-25"],
    "CH-DRAWING-REF": ["CP-24"],
    "CH-WARNINGS": ["CP-20"],
    "CH-AUDIT": ["CP-21", "CP-22", "CP-23"],
  } satisfies Record<DeprecatedChapterId, readonly CanonicalChapterId[]>;

/* -------------------------------------------------------------------------- */
/* Status / authorization / provenance codes                                   */
/* -------------------------------------------------------------------------- */

/** 13-codes from status_code_matrix.csv. */
export type ReportStatusCode =
  | "AVAILABLE"
  | "PARTIALLY_AVAILABLE"
  | "NOT_IMPLEMENTED"
  | "NOT_AUTHORIZED"
  | "PROHIBITED"
  | "STALE"
  | "INVALID"
  | "MISSING"
  | "LEGACY_DATA"
  | "HUMAN_CONFIRMATION_REQUIRED"
  | "CONFLICTING_EVIDENCE"
  | "NOT_AVAILABLE"
  | "UNKNOWN";

/** Report-level / value-level authorization status. */
export type AuthorizationStatus =
  | "NOT_GRANTED"
  | "NOT_AUTHORIZED"
  | "UNVERIFIED"
  | "USER_PROVIDED_UNVERIFIED"
  | "UNKNOWN";

/** Why a value is absent (no zero-fill, no blank masking). */
export type MissingReason =
  | "NOT_AVAILABLE"
  | "NOT_IMPLEMENTED"
  | "PROHIBITED"
  | "STALE_OR_UNGENERATED"
  | "LEGACY_DATA"
  | "NOT_CAPTURED_IN_BROWSER"
  | "UNRESOLVED"
  | null;

/** Legacy classification per 10_legacy_and_compatibility_contract.md. */
export type LegacyStatus = "current" | "LEGACY_DATA" | "UNKNOWN" | null;

export type ReportMode = "DEVELOPMENT" | "FORMAL";

/* -------------------------------------------------------------------------- */
/* Canonical row + chapter                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Canonical report row (R-01..R-22). Carries raw/display/unit/status/source
 * plus the cross-cutting provenance fields (R-13..R-22).
 */
export type CanonicalReportRow = {
  /** Canonical machine value (raw). */
  readonly value: string;
  /** Localized/user-facing display form (display != raw for numbers). */
  readonly display: string;
  readonly unit: string;
  readonly status: ReportStatusCode;
  /** Domain source path + symbol, e.g. "draft.bridgeLength | draft.bridgeLength". */
  readonly source: string;
  readonly authorizationStatus: AuthorizationStatus;
  readonly stale: boolean;
  readonly missingReason: MissingReason;
  readonly legacyStatus: LegacyStatus;
  readonly note?: string;
};

export type CanonicalReportChapter = {
  readonly id: CanonicalChapterId;
  readonly summary: readonly CanonicalReportRow[];
  readonly detail?: readonly CanonicalReportRow[];
};

export type ReportProjection = "summary" | "detail";

/* -------------------------------------------------------------------------- */
/* Canonical model skeleton (entity summaries, R-01..R-22)                     */
/* -------------------------------------------------------------------------- */

export type ReportIdentity = {
  readonly reportId: string;
  readonly projectId: string;
  readonly mode: "DEVELOPMENT";
};

export type ReportMetadata = {
  readonly schemaVersion: string;
  readonly reportId: string;
  readonly projectId: string;
  readonly generatedAt: string;
  readonly inputRevision: string;
  readonly inputChecksum: string;
  readonly resultChecksum: string;
  readonly quantityChecksum: string;
};

export type ProjectSummary = {
  readonly projectId: string;
  readonly projectName: string;
  readonly projectNumber: string | null;
  readonly createdAt: string | null;
};

export type BridgeSummary = {
  readonly bridgeSystem: string;
  readonly spanSystem: string | null;
  readonly bridgeLength: number | null;
  readonly width: number | null;
  readonly girderCount: number | null;
  readonly girderDepth: number | null;
  readonly spanCount: number;
  readonly supportCount: number;
  readonly adoptionStatus: string | null;
};

export type SpanSummary = {
  readonly spanId: string;
  /** NOT_AVAILABLE for CONTINUOUS (U-03 verdict B). */
  readonly spanLength: number | null;
  readonly length: number | null;
};

export type SupportSummary = {
  readonly supportId: string;
  readonly station: number;
  readonly role: string;
  readonly fixity: string;
};

export type GirderSummary = {
  readonly girderId: string;
  readonly offset: number;
  readonly count: number;
  readonly depth: number | null;
  readonly spacing: number | null;
  readonly segments: readonly number[];
};

export type CrossMemberSummary = {
  readonly count: number;
  readonly spacing: number | null;
  readonly station: number | null;
};

export type SectionInputSummary = {
  /** SIMPLE only. CONTINUOUS design drawings PROHIBITED (CP-13). */
  readonly spanLength: number | null;
  readonly bridgeLength: number | null;
  readonly girderCount: number | null;
  readonly girderSpacing: number | null;
  readonly girderDepth: number | null;
  readonly topFlangeWidth: number | null;
  readonly topFlangeThickness: number | null;
  readonly bottomFlangeWidth: number | null;
  readonly bottomFlangeThickness: number | null;
  readonly webThickness: number | null;
  readonly deckThickness: number | null;
  readonly crossBeamSpacing: number | null;
};

export type SectionPropertiesSummary = {
  readonly webHeight: number | null;
  readonly totalArea: number | null;
  readonly centroidFromBottom: number | null;
  readonly secondMomentOfArea: number | null;
  readonly sectionModulusTop: number | null;
  readonly sectionModulusBottom: number | null;
  readonly steelVolumePerGirder: number | null;
};

export type MaterialInputSummary = {
  readonly steelUnitWeight: number | null;
  readonly rcUnitWeight: number | null;
};

export type AdoptionSummary = {
  readonly adoptionStatus: string | null;
};

export type LoadInputSummary = {
  readonly loadCaseCount: number;
  /** Detail values PROHIBITED (O-19..O-30). */
  readonly detailAvailable: false;
};

export type GeometrySummary = {
  readonly solidsPresent: boolean;
  readonly stlManifest: string | null;
};

export type ValidationSummary = {
  readonly valid: boolean;
  readonly issueCount: number;
};

export type PersistenceSummary = {
  readonly inputRevision: string;
  readonly stale: boolean;
  readonly sidecarKeys: readonly string[];
};

export type EvidenceSummary = {
  readonly inputChecksum: string;
  readonly resultChecksum: string;
  readonly quantityChecksum: string;
  readonly inputRevision: string;
  readonly generatedAt: string;
  readonly dataSources: readonly string[];
  readonly calculationReferenceIds: readonly string[];
  readonly appCommitSha: string | null;
};

export type AuditMetadata = {
  readonly schemaVersions: readonly string[];
  readonly calcRefs: readonly string[];
  readonly formalOkNgEmitted: false;
};

export type WarningSummary = {
  readonly watermark: readonly string[];
  readonly warnings: readonly string[];
  readonly states: readonly string[];
  /** H-01..H-03 resolved list. */
  readonly humanConfirmationItems: readonly string[];
};

export type AuthorizationSummary = {
  readonly numericAuthorization: "NOT_GRANTED";
  readonly gate: string | null;
};

export type LegacyCompatibilitySummary = {
  readonly legacy: boolean;
  readonly legacyStatus: LegacyStatus;
};

export type GapList = { readonly ids: readonly string[] };

export type ReferenceList = { readonly refs: readonly string[] };

export type ChapterAvailabilitySummary = {
  readonly id: CanonicalChapterId;
  readonly available: boolean;
  readonly reason: MissingReason;
};

export type ContinuousReportModel = {
  readonly schemaVersion: string;
  readonly reportId: string;
  readonly projectId: string;
  readonly generatedAt: string;
  readonly inputRevision: string;
  readonly inputChecksum: string;
  readonly resultChecksum: string;
  readonly quantityChecksum: string;
  readonly mode: "DEVELOPMENT";
  readonly authorizationStatus: "NOT_GRANTED";
  readonly designOrConstructionUse: "PROHIBITED";
  readonly developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY";
  readonly stale: boolean;
  readonly warnings: readonly string[];
  readonly identity: ReportIdentity;
  readonly metadata: ReportMetadata;
  readonly project: ProjectSummary;
  readonly bridge: BridgeSummary;
  readonly spans: readonly SpanSummary[];
  readonly supports: readonly SupportSummary[];
  readonly girders: readonly GirderSummary[];
  readonly crossMembers: CrossMemberSummary;
  readonly section: SectionInputSummary & { properties: SectionPropertiesSummary | null };
  readonly materials: MaterialInputSummary;
  readonly adoption: AdoptionSummary;
  readonly loads: LoadInputSummary;
  readonly geometry: GeometrySummary;
  readonly validation: ValidationSummary;
  readonly persistence: PersistenceSummary;
  readonly authorization: AuthorizationSummary;
  readonly warningsChapter: WarningSummary;
  readonly legacy: LegacyCompatibilitySummary;
  readonly gaps: GapList;
  readonly evidence: EvidenceSummary;
  /** Canonical chapters (CP-*). CH-* never canonical. */
  readonly chapters: readonly CanonicalReportChapter[];
  /** Deprecated CH-* alias map, internal only. */
  readonly deprecatedAliases: Readonly<Record<string, readonly CanonicalChapterId[]>>;
  readonly audit: AuditMetadata;
};

/** Result of validateReportModel (4-D). */
export type ValidationReport = {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
};
