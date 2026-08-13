/**
 * Substructure -> Analysis adapter (Phase 7-01 B FROZEN / Phase 7-02 WP-C).
 *
 * SubstructureDocument (sole source) -> AnalysisDocument substructure-origin
 * source fragments: support placement, bearing seat connection, foundation
 * spring source fragments.
 *
 * Phase 7-02 scope: substructure feeds supports / bearings / foundation springs
 * only. Detailed substructure member FEM is DEFER (never implemented here).
 * Foundation spring stiffness is never fabricated: missing source values are
 * closed as SOURCE_NOT_AVAILABLE (FROZEN §2.2 / Sol review #12).
 */

import type { SubstructureDocument } from "../substructure/substructureTypes";
import type {
  AnalysisBearing,
  AnalysisFoundationSpring,
  AnalysisSupport,
  AnalysisVec3,
  BearingType,
} from "./analysisDocumentTypes";
import { deriveAnalysisEntityId } from "./analysisId";

/** NIL UUID placeholder for fragment-stage nodeId; resolved by BearingSupportResolver. */
export const NIL_ANALYSIS_NODE_ID =
  "00000000-0000-0000-0000-000000000000" as UuidString;

import type { UuidString } from "../../../contracts/uuid";

function mapBearingType(bearingType: BearingSeatReferenceBearingType): BearingType {
  switch (bearingType) {
    case "elastomeric":
      return "rubber";
    case "pot":
      return "pot";
    case "fixed":
      return "fixed";
    case "custom":
      return "custom";
    case null:
      return null;
  }
}

type BearingSeatReferenceBearingType =
  "elastomeric" | "pot" | "fixed" | "custom" | null;

export interface SubstructureAnalysisFragment {
  readonly supports: readonly AnalysisSupport[];
  readonly bearings: readonly AnalysisBearing[];
  readonly foundationSprings: readonly AnalysisFoundationSpring[];
  readonly issues: readonly { path: string; message: string }[];
}

function toVec3(position: { x: number; y: number; z: number }): AnalysisVec3 {
  return { x: position.x, y: position.y, z: position.z };
}

/**
 * Build the substructure-origin analysis fragment.
 * supportReferences missing -> the document is incomplete: issues are surfaced
 * and no support nodes are generated (fail-closed, FROZEN §10 / Sol review #6).
 */
export function buildSubstructureAnalysisFragment(
  document: SubstructureDocument,
): SubstructureAnalysisFragment {
  const issues: { path: string; message: string }[] = [];
  const supports: AnalysisSupport[] = [];
  const bearings: AnalysisBearing[] = [];
  const foundationSprings: AnalysisFoundationSpring[] = [];

  const supportRefs = document.supportReferences;
  if (!supportRefs || supportRefs.supports.length === 0) {
    issues.push({
      path: "substructureDocument.supportReferences",
      message: "supportReferences missing; support positions NOT_AVAILABLE (analysis stop).",
    });
    return { supports, bearings, foundationSprings, issues };
  }

  // --- support placement fragments (from Phase 4 Support Handoff) ---
  for (const support of supportRefs.supports) {
    const tangentAzimuth = support.tangentAzimuthRad ?? 0;
    const skew = support.skewAngleRad ?? 0;
    const tangent: AnalysisVec3 = { x: Math.cos(tangentAzimuth), y: Math.sin(tangentAzimuth), z: 0 };
    const transverse: AnalysisVec3 = { x: -Math.sin(tangentAzimuth), y: Math.cos(tangentAzimuth), z: 0 };
    const vertical: AnalysisVec3 = { x: 0, y: 0, z: 1 };
    // Bridge-local frame with skew applied about the vertical axis.
    const cosS = Math.cos(skew);
    const sinS = Math.sin(skew);
    const skewedTransverse: AnalysisVec3 = {
      x: transverse.x * cosS - tangent.x * sinS,
      y: transverse.y * cosS - tangent.y * sinS,
      z: 0,
    };
    const sourceEntityId = support.supportId;
    supports.push({
      entityId: deriveAnalysisEntityId("support", sourceEntityId),
      sourceEntityId,
      sourceKind: "bridgeLayoutSupport",
      nodeId: NIL_ANALYSIS_NODE_ID,
      seatId: null,
      constraint: { ux: false, uy: true, uz: true, rx: false, ry: false, rz: false },
      constraintApproximation: Math.abs(skew) > 1e-9 ? "globalAxisApproximation" : null,
      springIds: [],
      localFrame: { tangent, transverse: skewedTransverse, vertical },
      source: "FROM_SUPPORT",
    });
    void skew;
  }

  // --- bearing seat fragments (from Phase 5 Superstructure Handoff) ---
  const bearingSeats = document.bearingReactionReferences?.bearingSeats ?? document.bearingSeatReferences;
  for (const seat of bearingSeats) {
    const seatId = `BRG-${seat.supportId}-${seat.girderId}`;
    const orientation = seat.orientation;
    bearings.push({
      entityId: deriveAnalysisEntityId("bearing", seatId),
      sourceEntityId: seatId,
      sourceKind: "bearingSeat",
      seatId,
      supportId: seat.supportId,
      girderId: seat.girderId,
      bearingType: mapBearingType(seat.bearingType),
      fixedOrMovable: seat.fixedOrMovable,
      position: toVec3(seat.position),
      localFrame: {
        tangent: toVec3(orientation.longitudinalAxis),
        transverse: toVec3(orientation.transverseAxis),
        vertical: toVec3(orientation.verticalAxis),
      },
      dofConstraint: { ux: false, uy: true, uz: true, rx: false, ry: false, rz: false },
      constraintApproximation: null,
      springIds: [],
    });
  }

  // --- foundation spring source fragments ---
  // Phase 7-02: stiffness values are not present in the source documents, so
  // every foundation spring is closed as SOURCE_NOT_AVAILABLE (never invented).
  for (const support of supportRefs.supports) {
    const sourceEntityId = `foundation:${support.supportId}:uz`;
    foundationSprings.push({
      entityId: deriveAnalysisEntityId("spring", sourceEntityId),
      sourceEntityId,
      sourceKind: "foundationSpring",
      source: "TRANSLATIONAL",
      nodeId: NIL_ANALYSIS_NODE_ID,
      dof: "uz",
      coordinateSystem: "global",
      stiffness: null,
      valueState: "SOURCE_NOT_AVAILABLE",
      supportId: support.supportId,
      basis: null,
    });
  }

  return { supports, bearings, foundationSprings, issues };
}
