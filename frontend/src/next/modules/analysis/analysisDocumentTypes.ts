/**
 * AnalysisDocument contract types (Phase 7-01 A FROZEN / Phase 7-02 WP-A).
 *
 * The analysis canonical document in the new Project Data Core
 * (`modules.analysis.data.analysisDocument`). Bridge Layout / Superstructure /
 * Substructure are the upstream authorities; AnalysisDocument is a DERIVED
 * document regenerated deterministically from them (+ GeometrySnapshot).
 *
 * Conventions (Phase 7-01 A-01 FROZEN + Sol review #1/#3/#10/#11):
 *  - right-handed Cartesian; bridge-local x = longitudinal (station direction),
 *    y = transverse (right-positive), z = vertical up
 *  - single coordinateContext; nodes do not carry a coordinateContextId
 *  - units: m / kN / kNm / rad; force kN, moment kNm, modulus kN/m2, density kN/m3
 *  - reactionZ up-positive, moment right-hand-rule, skew counterclockwise-positive
 *  - every entity carries sourceEntityId + sourceKind (D-11)
 *  - modelChecksum is the IF3 binding source of truth (contentChecksum scope)
 */

import type { UuidString } from "../../../contracts/uuid";

export type { UuidString };

export const ANALYSIS_MODULE_ID = "analysis" as const;
export const ANALYSIS_SCHEMA_VERSION = "1.0.0" as const;
export const ANALYSIS_DOCUMENT_KIND = "analysis-document" as const;
export const ANALYSIS_PRODUCER = "spacer-analysis-module" as const;

export const ANALYSIS_ID_NAMESPACE = "a12d8c1e-11f4-4d6b-9a2e-7f8c5d0e1b3a" as const;

export type AnalysisDocumentStatus =
  | "DRAFT"
  | "VALIDATED"
  | "APPROVED"
  | "STALE"
  | "ARCHIVED";

export type AnalysisStatus =
  | "NOT_RUN"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "STALE"
  | "PARTIAL"
  | "NOT_AVAILABLE"
  | "NOT_AUTHORIZED";

export interface AnalysisIssue {
  readonly path: string;
  readonly message: string;
}

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export interface AnalysisProvenance {
  readonly createdAt: string;
  readonly createdBy: string;
  readonly producer: typeof ANALYSIS_PRODUCER;
}

export interface AnalysisTimestamps {
  readonly updatedAt: string;
  readonly derivedAt: string | null;
}

// ---------------------------------------------------------------------------
// sourceReferences (upstream authority tracking)
// ---------------------------------------------------------------------------

export interface BridgeLayoutSourceReference {
  readonly bridgeId: string;
  readonly documentVersion: string;
  readonly layoutFingerprint: string;
}

export interface SuperstructureSourceReference {
  readonly superstructureDocumentId: string;
  readonly documentVersion: string;
  readonly dataFingerprint: string;
  readonly geometrySnapshotFingerprint: string;
}

export interface SubstructureSourceReference {
  readonly substructureDocumentId: string;
  readonly documentVersion: string;
  readonly dataFingerprint: string;
}

export interface AnalysisSourceReferences {
  readonly bridgeLayout: BridgeLayoutSourceReference | null;
  readonly superstructure: SuperstructureSourceReference | null;
  readonly substructure: SubstructureSourceReference | null;
  readonly loadFingerprint: string | null;
  readonly solverSettingsFingerprint: string | null;
}

// ---------------------------------------------------------------------------
// coordinateContext (single)
// ---------------------------------------------------------------------------

export interface AnalysisVec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface AnalysisSignConvention {
  readonly reactionZ: "up-positive";
  readonly moment: "right-hand-rule";
  readonly skew: "counterclockwise-positive";
}

export interface AnalysisCoordinateContext {
  readonly entityId: UuidString;
  readonly coordinatePolicyId: string | null;
  readonly axisConvention: "x-along/y-transverse/z-up";
  readonly handedness: "right";
  readonly unitSystem: "metric";
  readonly positionConvention: "project-global-XYZ";
  readonly signConvention: AnalysisSignConvention;
  readonly globalOrigin: AnalysisVec3;
}

export interface AnalysisUnitContext {
  readonly length: "m";
  readonly force: "kN";
  readonly moment: "kNm";
  readonly modulus: "kN/m2";
  readonly density: "kN/m3";
  readonly angle: "rad";
}

// ---------------------------------------------------------------------------
// FEM model entities (all carry sourceEntityId + sourceKind, D-11)
// ---------------------------------------------------------------------------

export type NodeSourceKind =
  | "supportPoint"
  | "girderPanel"
  | "crossBeamPoint"
  | "deckPoint"
  | "substructureNode";

export interface AnalysisNode {
  readonly entityId: UuidString;
  readonly sourceEntityId: string;
  readonly sourceKind: NodeSourceKind;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly stationM: number | null;
  readonly offsetM: number | null;
}

export type MemberSourceKind =
  | "mainGirder"
  | "crossBeam"
  | "crossFrame"
  | "swayBracing"
  | "lateralBracing"
  | "stiffener";

export interface AnalysisMemberRelease {
  readonly end: "i" | "j";
  readonly dof: "ux" | "uy" | "uz" | "rx" | "ry" | "rz";
  readonly releaseKind: "FIXED" | "FREE" | "SPRING";
  readonly valueState: "CONFIRMED" | "NOT_AVAILABLE";
}

export interface AnalysisMember {
  readonly entityId: UuidString;
  readonly sourceEntityId: string;
  readonly sourceKind: MemberSourceKind;
  readonly elementType: "frame";
  readonly nodeIId: UuidString;
  readonly nodeJId: UuidString;
  readonly materialId: UuidString;
  readonly sectionId: UuidString;
  readonly memberKind: MemberSourceKind;
  readonly orientationVector: AnalysisVec3;
  readonly localAxis: { x: AnalysisVec3; y: AnalysisVec3; z: AnalysisVec3 } | null;
  readonly release: AnalysisMemberRelease[] | null;
  readonly eccentricity: AnalysisVec3 | null;
}

export type MaterialSourceKind = "structuralSteel" | "concrete" | "NOT_AVAILABLE";

export interface AnalysisMaterial {
  readonly entityId: UuidString;
  readonly sourceEntityId: string;
  readonly sourceKind: MaterialSourceKind;
  readonly name: string | null;
  readonly elasticModulus: number;
  readonly shearModulus: number;
  readonly poissonRatio: number;
  readonly density: number;
  readonly source: "CONFIRMED" | "DERIVED" | "NOT_AVAILABLE";
}

export type SectionSourceKind = "girderSectionModel" | "computed" | "NOT_AVAILABLE";
export type SectionDerivation = "DECLARED_INTENT" | "COMPUTED" | "NOT_AVAILABLE";

export interface AnalysisSection {
  readonly entityId: UuidString;
  readonly sourceEntityId: string;
  readonly sourceKind: SectionSourceKind;
  readonly name: string | null;
  readonly area: number;
  readonly iy: number;
  readonly iz: number;
  readonly j: number;
  readonly depthM: number | null;
  readonly webThicknessM: number | null;
  readonly topFlangeWidthM: number | null;
  readonly topFlangeThicknessM: number | null;
  readonly bottomFlangeWidthM: number | null;
  readonly bottomFlangeThicknessM: number | null;
  readonly derivation: SectionDerivation;
  readonly unitWeightPerM: number | null;
}

export type SupportSourceKind =
  | "bridgeLayoutSupport"
  | "bearingSeat"
  | "substructureSupport";

export type SupportSource = "FROM_BEARING" | "FROM_SUPPORT" | "FROM_BEARING_DEFAULT";

export interface AnalysisSupportConstraint {
  readonly ux: boolean;
  readonly uy: boolean;
  readonly uz: boolean;
  readonly rx: boolean;
  readonly ry: boolean;
  readonly rz: boolean;
}

export interface AnalysisLocalFrame {
  readonly tangent: AnalysisVec3;
  readonly transverse: AnalysisVec3;
  readonly vertical: AnalysisVec3;
}

export interface AnalysisSupport {
  readonly entityId: UuidString;
  readonly sourceEntityId: string;
  readonly sourceKind: SupportSourceKind;
  readonly nodeId: UuidString;
  readonly seatId: string | null;
  readonly constraint: AnalysisSupportConstraint;
  readonly constraintApproximation: "globalAxisApproximation" | null;
  readonly springIds: readonly string[];
  readonly localFrame: AnalysisLocalFrame | null;
  readonly source: SupportSource;
}

export type BearingType = "rubber" | "fixed" | "movable" | "pot" | "custom" | null;
export type FixedOrMovable = "FIXED" | "MOVABLE" | "UNDECIDED";

export interface AnalysisBearing {
  readonly entityId: UuidString;
  readonly sourceEntityId: string;
  readonly sourceKind: "bearingSeat";
  readonly seatId: string;
  readonly supportId: string;
  readonly girderId: string;
  readonly bearingType: BearingType;
  readonly fixedOrMovable: FixedOrMovable;
  readonly position: AnalysisVec3;
  readonly localFrame: AnalysisLocalFrame;
  readonly dofConstraint: AnalysisSupportConstraint;
  readonly constraintApproximation: "globalAxisApproximation" | null;
  readonly springIds: readonly string[];
}

export type SpringSourceKind = "spring" | "foundationSpring";
export type SpringType = "TRANSLATIONAL" | "ROTATIONAL";
export type SpringDof = "ux" | "uy" | "uz" | "rx" | "ry" | "rz";
export type SpringValueState =
  | "CONFIRMED"
  | "SOURCE_NOT_AVAILABLE"
  | "NOT_AUTHORIZED"
  | "NOT_AVAILABLE";

export interface AnalysisSpring {
  readonly entityId: UuidString;
  readonly sourceEntityId: string;
  readonly sourceKind: SpringSourceKind;
  readonly source: SpringType;
  readonly nodeId: UuidString;
  readonly dof: SpringDof;
  readonly coordinateSystem: "local" | "global";
  readonly stiffness: number | null;
  readonly valueState: SpringValueState;
}

export interface AnalysisFoundationSpring extends AnalysisSpring {
  readonly sourceKind: "foundationSpring";
  readonly supportId: string;
  readonly basis: string | null;
}

export interface AnalysisRigidLink {
  readonly entityId: UuidString;
  readonly sourceEntityId: string;
  readonly sourceKind: "rigidLink";
  readonly masterNodeId: UuidString;
  readonly slaveNodeId: UuidString;
  readonly dofs: readonly SpringDof[];
}

export interface AnalysisMpcEntry {
  readonly entityId: UuidString;
  readonly sourceEntityId: string;
  readonly sourceKind: "mpc";
  readonly type: "EQUALITY" | "LINEAR_COMBINATION";
  readonly nodeIds: readonly UuidString[];
  readonly dofs: readonly SpringDof[];
}

// ---------------------------------------------------------------------------
// Load / Combination
// ---------------------------------------------------------------------------

export type LoadCaseKind = "dead" | "live" | "other";
export type LoadValueState = "CONFIRMED" | "DERIVED" | "MISSING";

export interface AnalysisLoadCase {
  readonly caseId: string;
  readonly kind: LoadCaseKind;
  readonly state: LoadValueState;
  readonly source: string;
  readonly totalKN: number | null;
}

export type MemberLoadType = "distributed" | "point";

export interface AnalysisNodalLoad {
  readonly id: string;
  readonly loadCaseId: string;
  readonly nodeId: UuidString;
  readonly fx: number;
  readonly fy: number;
  readonly fz: number;
  readonly mx: number;
  readonly my: number;
  readonly mz: number;
}

export interface AnalysisMemberLoad {
  readonly id: string;
  readonly loadCaseId: string;
  readonly memberId: UuidString;
  readonly type: MemberLoadType;
  readonly direction: "z" | "y" | "x";
  readonly coordinateSystem: "local" | "global";
  readonly magnitude: number;
  readonly positionM: number | null;
  readonly unit: "kN_per_m" | "kN";
}

export interface AnalysisLoadCombinationEntry {
  readonly caseId: string;
  readonly factor: number;
}

export interface AnalysisLoadCombination {
  readonly combinationId: string;
  readonly expression: string;
  readonly factors: readonly AnalysisLoadCombinationEntry[];
  readonly resultCaseId: string;
  readonly executable: boolean;
}

// ---------------------------------------------------------------------------
// Analysis settings / solver reference
// ---------------------------------------------------------------------------

export interface AnalysisSettings {
  readonly analysisType: "linear_static";
  readonly solver: "scipy_sparse";
  readonly solverVersion: string;
  readonly includeShearDeformation: false;
  readonly largeDisplacement: false;
  readonly options: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Results / status
// ---------------------------------------------------------------------------

export interface PersistedResultRef {
  readonly documentKind: string;
  readonly documentId: UuidString;
  readonly revisionId: number;
  readonly contentChecksum: string;
  readonly uri: string;
}

export interface AnalysisValidationState {
  readonly schemaVersion: string;
  readonly validatedAt: string | null;
  readonly ok: boolean;
  readonly issues: readonly AnalysisIssue[];
}

export interface AnalysisRevision {
  readonly revisionId: number;
  readonly updatedAt: string;
  readonly changes: readonly string[];
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export interface AnalysisDocument {
  readonly schemaId: "spacer.contracts.analysis-document";
  readonly schemaVersion: typeof ANALYSIS_SCHEMA_VERSION;
  readonly documentKind: typeof ANALYSIS_DOCUMENT_KIND;
  readonly documentId: UuidString;
  readonly projectId: string;
  readonly revisionId: number;
  readonly status: AnalysisDocumentStatus;
  readonly contentChecksum: string;
  readonly modelChecksum: string;
  readonly provenance: AnalysisProvenance;
  readonly timestamps: AnalysisTimestamps;
  readonly sourceReferences: AnalysisSourceReferences;
  readonly coordinateContext: AnalysisCoordinateContext;
  readonly unitContext: AnalysisUnitContext;
  readonly nodes: readonly AnalysisNode[];
  readonly members: readonly AnalysisMember[];
  readonly materials: readonly AnalysisMaterial[];
  readonly sections: readonly AnalysisSection[];
  readonly supports: readonly AnalysisSupport[];
  readonly releases: readonly AnalysisMemberRelease[];
  readonly rigidLinks: readonly AnalysisRigidLink[];
  readonly mpc: readonly AnalysisMpcEntry[];
  readonly bearings: readonly AnalysisBearing[];
  readonly springs: readonly AnalysisSpring[];
  readonly foundationSprings: readonly AnalysisFoundationSpring[];
  readonly loadCases: readonly AnalysisLoadCase[];
  readonly nodalLoads: readonly AnalysisNodalLoad[];
  readonly memberLoads: readonly AnalysisMemberLoad[];
  readonly loadCombinations: readonly AnalysisLoadCombination[];
  readonly analysisSettings: AnalysisSettings;
  readonly analysisStatus: AnalysisStatus;
  readonly resultReferences: readonly PersistedResultRef[];
  readonly resultDigest: string | null;
  readonly validation: AnalysisValidationState;
  readonly revision: AnalysisRevision;
  readonly extensions: Record<string, unknown>;
}

export interface AnalysisModuleData {
  readonly analysisDocument?: AnalysisDocument;
}
