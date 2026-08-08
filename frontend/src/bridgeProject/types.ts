/**
 * BridgeProject integration shared types (Phase 3-1/3-2).
 *
 * These are the intermediate, tool-agnostic representations produced by the
 * Alignment Adapter (Phase 3-1) and the BridgeGeometry generator (Phase 3-2)
 * before serialization into the canonical Common Bridge Data Model (CBDM).
 *
 * Every shared engineering value carries value/unit/status/source/generatedBy/
 * sourceReference so downstream tools never mistake a reconstructed or derived
 * value for a confirmed original input (see docs/integration/value-status-unit-policy.md).
 */

export const BRIDGE_PROJECT_ALIGNMENT_TOOL_ID = "spacer-bridge-project-alignment-adapter";
export const BRIDGE_PROJECT_GEOMETRY_TOOL_ID = "spacer-bridge-project-geometry-generator";

/** Status vocabulary for shared cross-tool values. */
export type BpValueStatus =
  | "CONFIRMED" // 原本/入力値として確認済み
  | "DERIVED" // 現行モデルから決定論的に導出
  | "INFERRED" // 推定
  | "MISSING" // 不足
  | "DEFERRED" // 保留
  | "NOT_AUTHORIZED"; // 未認証

export type BpValueSource =
  | "ORIGINAL"
  | "USER_INPUT"
  | "GENERATED_BY_TOOL"
  | "RECONSTRUCTED";

/** A shared value with provenance/status metadata. `value` is absent for MISSING/DEFERRED. */
export interface BpValue {
  readonly value?: number;
  readonly unit: string; // canonical unit (m / rad / % / ratio / 1/m)
  readonly status: BpValueStatus;
  readonly source?: BpValueSource;
  readonly generatedBy?: string;
  readonly sourceReference?: string; // pier/support id, golden id, doc reference
  readonly stateReason?: string; // MISSING / DEFERRED / NOT_AUTHORIZED の理由
  readonly derivedFrom?: string; // DERIVED の導出元記述
}

export function bpConfirmed(
  value: number,
  unit: string,
  sourceReference?: string,
  source: BpValueSource = "USER_INPUT",
): BpValue {
  return { value, unit, status: "CONFIRMED", source, sourceReference };
}

export function bpDerived(
  value: number,
  unit: string,
  derivedFrom: string,
  generatedBy: string,
  sourceReference?: string,
): BpValue {
  return { value, unit, status: "DERIVED", source: "GENERATED_BY_TOOL", derivedFrom, generatedBy, sourceReference };
}

export function bpMissing(unit: string, stateReason: string): BpValue {
  return { unit, status: "MISSING", stateReason };
}

export function bpDeferred(unit: string, stateReason: string): BpValue {
  return { unit, status: "DEFERRED", stateReason };
}

export function bpNotAuthorized(unit: string, stateReason: string): BpValue {
  return { unit, status: "NOT_AUTHORIZED", stateReason };
}

export interface BpVec3 {
  readonly x: BpValue;
  readonly y: BpValue;
  readonly z: BpValue;
}

export interface BpCoordinateSystem {
  readonly name: string; // e.g. "liner-global" (x-east/y-north/z-up)
  readonly handedness: "right";
  readonly verticalAxis: "z";
  readonly stationConvention: {
    readonly tangentDirection: "+x";
    readonly offsetSign: "right_positive";
    readonly elevationSign: "up_positive";
  };
  readonly angleUnit: "rad";
}

export interface BpUnitContext {
  readonly length: "m";
  readonly angle: "rad";
  readonly crossfall: "%";
  readonly grade: "ratio";
  readonly curvature: "1/m";
}

/** One deterministic sampled point of the alignment along the bridge. */
export interface BpAlignmentStation {
  readonly stationM: BpValue; // physical distance (m)
  readonly position: BpVec3; // global x/y/z (m)
  readonly tangent: BpVec3; // unit local basis (travel direction)
  readonly transverse: BpVec3; // unit local basis (right-positive)
  readonly azimuthRad: BpValue; // tangent heading (rad)
  readonly curvaturePerM: BpValue; // 1/m (0 for straight)
  readonly grade?: BpValue; // vertical grade ratio
  readonly crossfallPercent?: BpValue; // % right_down_positive
  readonly widthM?: BpValue; // total cross-section width (m)
  readonly widthLeftM?: BpValue;
  readonly widthRightM?: BpValue;
  readonly elementId?: string;
  readonly supportId?: string; // set when this station is a support
}

export interface BridgeProjectAlignment {
  readonly alignmentId: string;
  readonly coordinateSystem: BpCoordinateSystem;
  readonly unitContext: BpUnitContext;
  readonly bridgeStartStationM: BpValue; // CONFIRMED
  readonly bridgeEndStationM: BpValue; // CONFIRMED
  readonly bridgeLengthM: BpValue; // DERIVED
  readonly stations: readonly BpAlignmentStation[];
  readonly sampledIntervalM: number;
  readonly generatedBy: string;
}

export type BpSupportKind = "abutment" | "pier" | "virtual_pier";

export interface BpSupport {
  readonly supportId: string;
  readonly kind: BpSupportKind;
  readonly stationM: BpValue; // CONFIRMED (draft input)
  readonly skewRad: BpValue; // CONFIRMED (input) or DEFERRED
  readonly position: BpVec3; // DERIVED from alignment
  readonly tangent: BpVec3; // DERIVED local basis
  readonly transverse: BpVec3; // DERIVED local basis
}

export interface BpSpan {
  readonly spanId: string;
  readonly startSupportId: string;
  readonly endSupportId: string;
  readonly startStationM: BpValue;
  readonly endStationM: BpValue;
  readonly lengthM: BpValue; // DERIVED = end - start
}

export interface BridgeProjectBridgeGeometry {
  readonly bridgeId: string;
  readonly bridgeStartStationM: BpValue; // CONFIRMED
  readonly bridgeEndStationM: BpValue; // CONFIRMED
  readonly bridgeLengthM: BpValue; // DERIVED
  readonly deckWidthM?: BpValue; // CONFIRMED / DERIVED / MISSING
  readonly centerOffsetM: BpValue; // bridge center/reference line offset (default 0)
  readonly supports: readonly BpSupport[];
  readonly spans: readonly BpSpan[];
  readonly coordinateSystem: BpCoordinateSystem;
  readonly unitContext: BpUnitContext;
  readonly generatedBy: string;
}

// ---------------------------------------------------------------------------
// Phase 3-4: BridgeProject.Superstructure (shared superstructure facts)
// ---------------------------------------------------------------------------

export const BRIDGE_PROJECT_SUPERSTRUCTURE_SCHEMA_VERSION = "0.1.0";
export const BRIDGE_PROJECT_SUPERSTRUCTURE_TOOL_ID = "spacer-bridge-project-superstructure-adapter";
export const SUPERSTRUCTURE_KIND_PLATE_GIRDER_RC_SLAB_NON_COMPOSITE =
  "plate_girder_rc_slab_non_composite";

export interface BpGirderArrangement {
  readonly girderId: string;
  /** Start offset (m) from the bridge centerline (SUPERSTRUCTURE-owned input). */
  readonly offsetM: BpValue;
  /** End offset (m); present for tapered lines. */
  readonly offsetEndM?: BpValue;
}

export interface BpDeckFacts {
  readonly deckId: string;
  readonly widthM: BpValue; // CONFIRMED / DERIVED
  /** Thickness is SUPERSTRUCTURE-owned; MISSING when not declared. */
  readonly thicknessM?: BpValue;
}

/** Support × girder bearing incidence (which girder bears on which support). */
export interface BpBearingRelation {
  readonly supportId: string;
  readonly girderId: string;
}

export interface BpSuperstructureAnalysisReference {
  readonly status: "NOT_AUTHORIZED" | "NOT_AVAILABLE";
  readonly stateReason?: string;
}

/**
 * BridgeProject.Superstructure — the shared superstructure facts that ③ (and
 * downstream) may consume. Built by `buildBridgeProjectSuperstructure` from the
 * ② GeometrySnapshot + BSDD + bridge-structure input. Carries provenance and an
 * explicit authorization state; NEVER upgrades NOT_AUTHORIZED design values.
 */
export interface BridgeProjectSuperstructure {
  readonly schemaVersion: typeof BRIDGE_PROJECT_SUPERSTRUCTURE_SCHEMA_VERSION;
  readonly documentId: string;
  readonly revisionId: number;
  readonly provenance: {
    readonly createdAt: string;
    readonly createdBy: string;
    readonly producer: string;
  };
  readonly bridgeId: string;
  readonly superstructureType: string; // SUPERSTRUCTURE_OWNER declaration
  readonly spanSystem: "simple" | "continuous";
  readonly mainGirderArrangement: readonly BpGirderArrangement[];
  readonly deck?: BpDeckFacts;
  readonly bearingSupportRelation: readonly BpBearingRelation[];
  readonly analysisReference: BpSuperstructureAnalysisReference;
  /** 3D reference (deterministic snapshot fingerprint), not the geometry itself. */
  readonly model3DReference?: {
    readonly snapshotFingerprint: string;
    readonly snapshotVersion: string;
  };
  readonly generatedBy: string;
}
