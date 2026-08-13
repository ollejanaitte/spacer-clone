/**
 * Bearing / Support / Spring resolution (Phase 7-01 B FROZEN / Phase 7-02 WP-D).
 *
 * BearingSupportResolver is the SINGLE authority that joins the superstructure
 * and substructure bearing/support source fragments by seatId and produces the
 * final AnalysisDocument supports / bearings / springs (Sol review #5).
 *
 * Unique DOF mapping table (FROZEN §3.3): FIXED = ux,uy,uz; MOVABLE-long =
 * uy,uz; MOVABLE-both = uz; UNDECIDED = uy,uz. Rotations always released.
 * Values are never invented: missing spring stiffness closes as
 * SOURCE_NOT_AVAILABLE and the authorized bearing DOF mapping applies
 * (Sol review #12).
 */

import type {
  AnalysisBearing,
  AnalysisFoundationSpring,
  AnalysisNode,
  AnalysisSpring,
  AnalysisSupport,
  AnalysisSupportConstraint,
  FixedOrMovable,
} from "./analysisDocumentTypes";
import { deriveAnalysisEntityId } from "./analysisId";

export interface BearingSupportResolverInput {
  readonly nodes: readonly AnalysisNode[];
  readonly superBearings: readonly AnalysisBearing[];
  readonly subSupports: readonly AnalysisSupport[];
  readonly subBearings: readonly AnalysisBearing[];
  readonly foundationSprings: readonly AnalysisFoundationSpring[];
}

export interface BearingSupportResolverResult {
  readonly supports: readonly AnalysisSupport[];
  readonly bearings: readonly AnalysisBearing[];
  readonly springs: readonly AnalysisSpring[];
  readonly foundationSprings: readonly AnalysisFoundationSpring[];
  readonly issues: readonly { path: string; message: string }[];
}

const FREE: AnalysisSupportConstraint = { ux: false, uy: false, uz: false, rx: false, ry: false, rz: false };

/** Unique DOF mapping table (FROZEN §3.3). */
export function resolveBearingDofConstraint(fixedOrMovable: FixedOrMovable): AnalysisSupportConstraint {
  switch (fixedOrMovable) {
    case "FIXED":
      return { ux: true, uy: true, uz: true, rx: false, ry: false, rz: false };
    case "MOVABLE":
      return { ux: false, uy: true, uz: true, rx: false, ry: false, rz: false };
    case "UNDECIDED":
      return { ux: false, uy: true, uz: true, rx: false, ry: false, rz: false };
    default:
      return { ...FREE, uz: true };
  }
}

function nearVec(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): boolean {
  return (
    Math.abs(a.x - b.x) < 1e-6 &&
    Math.abs(a.y - b.y) < 1e-6 &&
    Math.abs(a.z - b.z) < 1e-6
  );
}

/**
 * The single resolver. Joins fragments by seatId, applies the frozen DOF
 * mapping, resolves support nodes, and closes missing spring values.
 */
export function resolveBearingSupport(input: BearingSupportResolverInput): BearingSupportResolverResult {
  const issues: { path: string; message: string }[] = [];
  const supports: AnalysisSupport[] = [];
  const bearings: AnalysisBearing[] = [];
  const springs: AnalysisSpring[] = [];

  const nodeBySource = new Map<string, AnalysisNode>();
  for (const node of input.nodes) {
    nodeBySource.set(node.sourceEntityId, node);
  }

  const subBearingBySeat = new Map<string, AnalysisBearing>();
  for (const bearing of input.subBearings) {
    subBearingBySeat.set(bearing.seatId, bearing);
  }
  const subSupportBySupportId = new Map<string, AnalysisSupport>();
  for (const support of input.subSupports) {
    subSupportBySupportId.set(support.sourceEntityId, support);
  }

  const seenSeatIds = new Set<string>();

  for (const superBearing of input.superBearings) {
    const seatId = superBearing.seatId;
    seenSeatIds.add(seatId);

    // Detect mismatch with the substructure bearing fragment.
    const subBearing = subBearingBySeat.get(seatId);
    if (subBearing && !nearVec(superBearing.position, subBearing.position)) {
      issues.push({
        path: `bearings[${seatId}]`,
        message: "BEARING_SOURCE_MISMATCH: superstructure and substructure positions differ.",
      });
    }

    // Resolve the support node (supportPoint node for support x girder).
    const node = nodeBySource.get(`supportPoint:${superBearing.supportId}:${superBearing.girderId}`);
    if (!node) {
      issues.push({
        path: `bearings[${seatId}]`,
        message: `support node missing for supportPoint:${superBearing.supportId}:${superBearing.girderId}`,
      });
      continue;
    }

    // Sub support placement (for local frame and source), if present.
    const subSupport = subSupportBySupportId.get(superBearing.supportId);
    const source: AnalysisSupport["source"] =
      superBearing.bearingType === null || superBearing.fixedOrMovable === "UNDECIDED"
        ? "FROM_BEARING_DEFAULT"
        : "FROM_BEARING";

    // Springs: rubber bearings use a spring when stiffness is available; the
    // source document has none, so the authorized DOF mapping applies.
    const springIds: string[] = [];
    if (superBearing.bearingType === "rubber") {
      const springId = deriveAnalysisEntityId(
        "spring",
        `bearing:${seatId}:uz`,
      );
      springIds.push(springId);
      springs.push({
        entityId: springId,
        sourceEntityId: `bearing:${seatId}:uz`,
        sourceKind: "spring",
        source: "TRANSLATIONAL",
        nodeId: node.entityId,
        dof: "uz",
        coordinateSystem: "local",
        stiffness: null,
        valueState: "SOURCE_NOT_AVAILABLE",
      });
    }

    const dofConstraint = resolveBearingDofConstraint(superBearing.fixedOrMovable);
    const constraintApproximation =
      subSupport?.constraintApproximation ?? superBearing.constraintApproximation;

    const support: AnalysisSupport = {
      entityId: deriveAnalysisEntityId(
        "support",
        `${superBearing.supportId}-${superBearing.girderId}`,
      ),
      sourceEntityId: `${superBearing.supportId}-${superBearing.girderId}`,
      sourceKind: "bearingSeat",
      nodeId: node.entityId,
      seatId,
      constraint: dofConstraint,
      constraintApproximation,
      springIds,
      localFrame: superBearing.localFrame,
      source,
    };
    supports.push(support);

    bearings.push({
      ...superBearing,
      dofConstraint,
      constraintApproximation,
      springIds,
    });
  }

  // Support placements with no bearing seat -> FROM_SUPPORT (substructure only).
  for (const subSupport of input.subSupports) {
    const hasBearingSeat = input.superBearings.some(
      (b) => b.supportId === subSupport.sourceEntityId,
    );
    if (hasBearingSeat) {
      continue;
    }
    supports.push({
      ...subSupport,
      source: "FROM_SUPPORT",
    });
  }

  // Resolve foundation spring nodeIds to the first support node of each support.
  const foundationSprings: AnalysisFoundationSpring[] = [];
  for (const fs of input.foundationSprings) {
    const supportNode = input.nodes.find(
      (n) => n.sourceKind === "supportPoint" && n.sourceEntityId.startsWith(`supportPoint:${fs.supportId}:`),
    );
    if (!supportNode) {
      issues.push({
        path: `foundationSprings[${fs.sourceEntityId}]`,
        message: "support node missing for foundation spring.",
      });
      continue;
    }
    foundationSprings.push({ ...fs, nodeId: supportNode.entityId });
  }

  return {
    supports,
    bearings,
    springs,
    foundationSprings,
    issues,
  };
}
