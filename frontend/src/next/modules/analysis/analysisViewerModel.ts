/**
 * Analysis viewer model adapter (Phase 7-01 D FROZEN / Phase 7-02 WP-J).
 *
 * Maps the AnalysisDocument + IF3 result into the shape consumed by the
 * existing 3D Viewer (nodes / members / supports + per-case result rows),
 * using the common renderCoordinate (project-global XYZ).
 *
 * Display-only: never mutates the AnalysisDocument (D-18).
 */

import type { AnalysisDocument } from "./analysisDocumentTypes";
import { extractLinearStaticResultFromIf3 } from "./resultAdapter";
import type { FrameAnalysisResultResource } from "../../../contracts/frameAnalysisResultResource";

export interface ViewerNodeModel {
  readonly id: string;
  readonly sourceEntityId: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ViewerMemberModel {
  readonly id: string;
  readonly sourceEntityId: string;
  readonly nodeI: string;
  readonly nodeJ: string;
  readonly kind: string;
}

export interface ViewerSupportModel {
  readonly id: string;
  readonly sourceEntityId: string;
  readonly nodeId: string;
  readonly constraint: { ux: boolean; uy: boolean; uz: boolean; rx: boolean; ry: boolean; rz: boolean };
  readonly source: string;
}

export interface ViewerSpringModel {
  readonly id: string;
  readonly nodeId: string;
  readonly dof: string;
  readonly valueState: string;
}

export interface ViewerBearingModel {
  readonly id: string;
  readonly seatId: string;
  readonly position: { x: number; y: number; z: number };
  readonly fixedOrMovable: string;
}

export interface ViewerAnalysisModel {
  readonly bridgeId: string;
  readonly nodes: readonly ViewerNodeModel[];
  readonly members: readonly ViewerMemberModel[];
  readonly supports: readonly ViewerSupportModel[];
  readonly springs: readonly ViewerSpringModel[];
  readonly bearings: readonly ViewerBearingModel[];
  readonly analysisStatus: string;
  readonly resultStatus: string;
}

/**
 * Build the display model for the 3D viewer from the AnalysisDocument
 * (renderCoordinate = project-global XYZ). Never mutates the document.
 */
export function buildViewerAnalysisModel(
  document: AnalysisDocument,
  if3Result: FrameAnalysisResultResource | null,
): ViewerAnalysisModel {
  const nodes: ViewerNodeModel[] = document.nodes.map((node) => ({
    id: node.entityId,
    sourceEntityId: node.sourceEntityId,
    x: node.x,
    y: node.y,
    z: node.z,
  }));

  const members: ViewerMemberModel[] = document.members.map((member) => ({
    id: member.entityId,
    sourceEntityId: member.sourceEntityId,
    nodeI: member.nodeIId,
    nodeJ: member.nodeJId,
    kind: member.memberKind,
  }));

  const supports: ViewerSupportModel[] = document.supports.map((support) => ({
    id: support.entityId,
    sourceEntityId: support.sourceEntityId,
    nodeId: support.nodeId,
    constraint: support.constraint,
    source: support.source,
  }));

  const springs: ViewerSpringModel[] = [...document.springs, ...document.foundationSprings].map(
    (spring) => ({
      id: spring.entityId,
      nodeId: spring.nodeId,
      dof: spring.dof,
      valueState: spring.valueState,
    }),
  );

  const bearings: ViewerBearingModel[] = document.bearings.map((bearing) => ({
    id: bearing.entityId,
    seatId: bearing.seatId,
    position: bearing.position,
    fixedOrMovable: bearing.fixedOrMovable,
  }));

  let resultStatus = "NOT_RUN";
  if (if3Result) {
    resultStatus = if3Result.status ?? "UNKNOWN";
  }

  return {
    bridgeId: document.projectId,
    nodes,
    members,
    supports,
    springs,
    bearings,
    analysisStatus: document.analysisStatus,
    resultStatus,
  };
}

/**
 * Build per-case result rows for the viewer (displacements / reactions /
 * member forces), grouped by load case id (including COMBO-1).
 */
export function buildViewerResultRows(
  if3Result: FrameAnalysisResultResource,
): {
  caseIds: readonly string[];
  displacements: ReturnType<typeof extractLinearStaticResultFromIf3>["displacements"];
  reactions: ReturnType<typeof extractLinearStaticResultFromIf3>["reactions"];
  memberForces: ReturnType<typeof extractLinearStaticResultFromIf3>["memberForces"];
} {
  const view = extractLinearStaticResultFromIf3(if3Result);
  const caseIds = [...new Set(view.displacements.map((d) => d.loadCaseId))];
  return { caseIds, displacements: view.displacements, reactions: view.reactions, memberForces: view.memberForces };
}
