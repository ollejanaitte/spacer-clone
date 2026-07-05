import { LINER_DIAGNOSTIC_CODES, createIssue } from "../core/diagnostics";
import { DEFAULT_TOLERANCES } from "../core/tolerances";
import type {
  CanonicalLinerIntermediateResult,
  ComputationDiagnostic,
  GridLineResult,
  GridPointResult,
  GridPointRole,
  MemberGroupRule,
  SupportTemplateHint,
} from "../core/types";
import { frameMemberId, frameNodeId, frameSupportId } from "./frameIds";

export type FrameNodeDraft = {
  id: string;
  x: number;
  y: number;
  z: number;
  label?: string;
};

export type FrameMemberDraft = {
  id: string;
  nodeI: string;
  nodeJ: string;
  direction: "longitudinal" | "transverse";
  memberGroupKey: string;
  materialId?: string;
  sectionId?: string;
  orientationVector: { x: number; y: number; z: number };
};

export type FrameSupportDraft = {
  id: string;
  nodeId: string;
  ux: boolean;
  uy: boolean;
  uz: boolean;
  rx: boolean;
  ry: boolean;
  rz: boolean;
  coordinateSystem: SupportTemplateHint["coordinateSystem"];
  templateId: string;
};

export type LinerTraceEntry = {
  frameEntityId: string;
  frameEntityType: "node" | "member" | "support";
  linerModelId: string;
  coordinatePolicyId: string;
  sourceRevision: string;
  gridPointId?: string;
  gridLineId?: string;
  gridPointIds?: string[];
  sectionId?: string;
  longitudinalLineId?: string;
  physicalDistance?: number;
  displayedStation?: number;
  offset?: number;
  spanId?: string;
  pierId?: string;
  role?: GridPointRole;
  memberDirection?: "longitudinal" | "transverse";
  memberGroupKey?: string;
  supportTemplateId?: string;
};

export type FrameMappingOptions = {
  defaultMaterialId?: string;
  defaultSectionId?: string;
  materialIds?: readonly string[];
  sectionIds?: readonly string[];
  lengthTolerance?: number;
};

export type FrameMappingResult = {
  nodes: FrameNodeDraft[];
  members: FrameMemberDraft[];
  supports: FrameSupportDraft[];
  linerTrace: LinerTraceEntry[];
  diagnostics: ComputationDiagnostic[];
};

type ResolvedMemberGroup = {
  key: string;
  materialId?: string;
  sectionId?: string;
};

function nodeIdForPoint(linerModelId: string, point: GridPointResult): string {
  return frameNodeId(
    linerModelId,
    point.labels.longitudinalIndex,
    point.labels.transverseIndex,
  );
}

function traceBase(intermediate: CanonicalLinerIntermediateResult) {
  return {
    linerModelId: intermediate.linerModelId,
    coordinatePolicyId: intermediate.coordinatePolicyId,
    sourceRevision: intermediate.sourceRevision,
  };
}

function mostSpecificRule(
  rules: MemberGroupRule[],
  direction: GridLineResult["direction"],
  pointI: GridPointResult,
  pointJ: GridPointResult,
  line: GridLineResult,
): MemberGroupRule | undefined {
  const pointRoles = new Set([...pointI.roles, ...pointJ.roles, line.role]);

  return rules
    .filter((rule) => {
      const match = rule.match;
      if (match.direction && match.direction !== direction) return false;
      if (match.transverseIndex !== undefined && match.transverseIndex !== pointI.labels.transverseIndex) {
        return false;
      }
      if (match.spanId && match.spanId !== line.spanId && match.spanId !== pointI.source.spanId && match.spanId !== pointJ.source.spanId) {
        return false;
      }
      if (match.role && !pointRoles.has(match.role)) return false;
      return true;
    })
    .sort((a, b) => specificityScore(b) - specificityScore(a))[0];
}

function specificityScore(rule: MemberGroupRule): number {
  return [
    rule.match.spanId,
    rule.match.role,
    rule.match.direction,
    rule.match.transverseIndex,
  ].filter((value) => value !== undefined).length;
}

function resolveMemberGroup(
  intermediate: CanonicalLinerIntermediateResult,
  options: FrameMappingOptions,
  line: GridLineResult,
  pointI: GridPointResult,
  pointJ: GridPointResult,
): ResolvedMemberGroup {
  const rule =
    mostSpecificRule(intermediate.frameHints.memberGroupRules, line.direction, pointI, pointJ, line) ??
    intermediate.frameHints.memberGroupRules.find(
      (candidate) => candidate.key === intermediate.frameHints.defaultMemberGroupKey,
    );

  return {
    key: rule?.key ?? pointI.memberGroupKey ?? pointJ.memberGroupKey ?? intermediate.frameHints.defaultMemberGroupKey,
    materialId: rule?.materialId ?? options.defaultMaterialId,
    sectionId: rule?.sectionId ?? options.defaultSectionId,
  };
}

function validateMemberSection(
  diagnostics: ComputationDiagnostic[],
  memberId: string,
  resolved: ResolvedMemberGroup,
  options: FrameMappingOptions,
): void {
  const materialSet = options.materialIds ? new Set(options.materialIds) : undefined;
  const sectionSet = options.sectionIds ? new Set(options.sectionIds) : undefined;
  const materialMissing = materialSet && (!resolved.materialId || !materialSet.has(resolved.materialId));
  const sectionMissing = sectionSet && (!resolved.sectionId || !sectionSet.has(resolved.sectionId));

  if (materialMissing || sectionMissing) {
    diagnostics.push(
      createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameSection, {
        entityType: "member",
        entityId: memberId,
        detail: `Missing material or section for member group ${resolved.key}`,
      }),
    );
  }
}

function shouldMapLine(intermediate: CanonicalLinerIntermediateResult, line: GridLineResult): boolean {
  const mode = intermediate.frameHints.connectivityMode;
  if (mode === "grid_full") return true;
  if (mode === "longitudinal_only") return line.direction === "longitudinal";
  return line.direction === "transverse";
}

function distance(a: GridPointResult, b: GridPointResult): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function findPierIdForPoint(intermediate: CanonicalLinerIntermediateResult, point: GridPointResult): string | undefined {
  return point.source.pierId ?? intermediate.piers.find((pier) => pier.supportLinePointIds.includes(point.id))?.id;
}

function supportCandidatePoints(
  intermediate: CanonicalLinerIntermediateResult,
  template: SupportTemplateHint,
  diagnostics: ComputationDiagnostic[],
): GridPointResult[] {
  const pointById = new Map(intermediate.grid.points.map((point) => [point.id, point]));
  const pier = template.pierId
    ? intermediate.piers.find((candidate) => candidate.id === template.pierId)
    : intermediate.piers.find((candidate) => candidate.physicalDistance === template.physicalDistance);

  const candidates: GridPointResult[] = [];
  if (pier) {
    for (const pointId of pier.supportLinePointIds) {
      const point = pointById.get(pointId);
      if (point) {
        candidates.push(point);
      } else {
        diagnostics.push(
          createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameNode, {
            entityType: "pier",
            entityId: pier.id,
            detail: `Missing support line grid point ${pointId}`,
          }),
        );
      }
    }
  } else {
    candidates.push(...intermediate.grid.points.filter((point) => point.physicalDistance === template.physicalDistance));
  }

  return candidates.filter((point) =>
    template.nodeRoles.length === 0 || point.roles.some((role) => template.nodeRoles.includes(role)),
  );
}

function addConnectivityDiagnostics(
  nodes: FrameNodeDraft[],
  members: FrameMemberDraft[],
  diagnostics: ComputationDiagnostic[],
): void {
  if (nodes.length === 0 || members.length === 0) return;

  const adjacency = new Map(nodes.map((node) => [node.id, new Set<string>()]));
  for (const member of members) {
    adjacency.get(member.nodeI)?.add(member.nodeJ);
    adjacency.get(member.nodeJ)?.add(member.nodeI);
  }

  const first = nodes[0]?.id;
  if (!first) return;
  const visited = new Set<string>([first]);
  const queue = [first];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const next of adjacency.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  if (visited.size !== nodes.length) {
    diagnostics.push(
      createIssue("warning", LINER_DIAGNOSTIC_CODES.disconnectedFrame, {
        entityType: "frameMapping",
        detail: `Connected ${visited.size} of ${nodes.length} nodes`,
      }),
    );
  }
}

export function mapToFrameModel(
  intermediate: CanonicalLinerIntermediateResult,
  options: FrameMappingOptions = {},
): FrameMappingResult {
  const diagnostics: ComputationDiagnostic[] = [];
  const linerTrace: LinerTraceEntry[] = [];
  const lengthTolerance = options.lengthTolerance ?? DEFAULT_TOLERANCES.length;
  const base = traceBase(intermediate);
  const nodeIdByGridPointId = new Map<string, string>();
  const pointById = new Map(intermediate.grid.points.map((point) => [point.id, point]));
  const seenNodeIds = new Set<string>();

  const nodes = intermediate.grid.points.map((point) => {
    const id = nodeIdForPoint(intermediate.linerModelId, point);
    if (seenNodeIds.has(id)) {
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.duplicateFrameId, {
          entityType: "node",
          entityId: id,
          detail: `Duplicate node id generated from grid point ${point.id}`,
        }),
      );
    }
    seenNodeIds.add(id);
    nodeIdByGridPointId.set(point.id, id);
    linerTrace.push({
      ...base,
      frameEntityId: id,
      frameEntityType: "node",
      gridPointId: point.id,
      sectionId: point.source.sectionId,
      longitudinalLineId: point.source.longitudinalLineId,
      physicalDistance: point.physicalDistance,
      displayedStation: point.displayedStation,
      offset: point.offset,
      spanId: point.source.spanId,
      pierId: findPierIdForPoint(intermediate, point),
      role: point.roles[0],
      memberGroupKey: point.memberGroupKey,
    });

    return {
      id,
      x: point.x,
      y: point.y,
      z: point.z,
      label: `L${point.labels.longitudinalIndex}T${point.labels.transverseIndex}`,
    };
  });

  const members: FrameMemberDraft[] = [];
  const seenMemberIds = new Set<string>();
  for (const line of intermediate.grid.lines.filter((candidate) => shouldMapLine(intermediate, candidate))) {
    for (let index = 0; index < line.pointIds.length - 1; index += 1) {
      const pointI = pointById.get(line.pointIds[index]);
      const pointJ = pointById.get(line.pointIds[index + 1]);
      if (!pointI || !pointJ) {
        diagnostics.push(
          createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameNode, {
            entityType: "gridLine",
            entityId: line.id,
            detail: `Missing grid point reference in ${line.id}`,
          }),
        );
        continue;
      }

      const directionCode = line.direction === "longitudinal" ? "L" : "T";
      const id = frameMemberId(
        intermediate.linerModelId,
        directionCode,
        pointI.labels.longitudinalIndex,
        pointI.labels.transverseIndex,
      );
      if (seenMemberIds.has(id)) {
        diagnostics.push(
          createIssue("error", LINER_DIAGNOSTIC_CODES.duplicateFrameId, {
            entityType: "member",
            entityId: id,
          }),
        );
        continue;
      }
      seenMemberIds.add(id);

      if (distance(pointI, pointJ) <= lengthTolerance) {
        diagnostics.push(
          createIssue("warning", LINER_DIAGNOSTIC_CODES.zeroLengthMember, {
            entityType: "member",
            entityId: id,
            physicalDistance: pointI.physicalDistance,
            station: pointI.displayedStation,
          }),
        );
        continue;
      }

      const nodeI = nodeIdByGridPointId.get(pointI.id);
      const nodeJ = nodeIdByGridPointId.get(pointJ.id);
      if (!nodeI || !nodeJ) {
        diagnostics.push(
          createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameNode, {
            entityType: "member",
            entityId: id,
          }),
        );
        continue;
      }

      const resolved = resolveMemberGroup(intermediate, options, line, pointI, pointJ);
      validateMemberSection(diagnostics, id, resolved, options);

      members.push({
        id,
        nodeI,
        nodeJ,
        direction: line.direction,
        memberGroupKey: resolved.key,
        materialId: resolved.materialId,
        sectionId: resolved.sectionId,
        orientationVector: { x: 0, y: 0, z: 1 },
      });
      const sharedLongitudinalLineId =
        line.direction === "longitudinal" &&
        pointI.source.longitudinalLineId !== undefined &&
        pointI.source.longitudinalLineId === pointJ.source.longitudinalLineId
          ? pointI.source.longitudinalLineId
          : undefined;
      const sharedSectionId =
        line.direction === "transverse" &&
        pointI.source.sectionId !== undefined &&
        pointI.source.sectionId === pointJ.source.sectionId
          ? pointI.source.sectionId
          : undefined;

      linerTrace.push({
        ...base,
        frameEntityId: id,
        frameEntityType: "member",
        gridLineId: line.id,
        gridPointIds: [pointI.id, pointJ.id],
        sectionId: sharedSectionId,
        longitudinalLineId: sharedLongitudinalLineId,
        physicalDistance: pointI.physicalDistance,
        displayedStation: pointI.displayedStation,
        offset: pointI.offset,
        spanId: line.spanId ?? pointI.source.spanId,
        pierId: line.pierId ?? pointI.source.pierId,
        role: line.role,
        memberDirection: line.direction,
        memberGroupKey: resolved.key,
      });
    }
  }

  const supports: FrameSupportDraft[] = [];
  const seenSupportIds = new Set<string>();
  for (const template of intermediate.frameHints.supportTemplates) {
    const candidates = supportCandidatePoints(intermediate, template, diagnostics);
    if (candidates.length === 0) {
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameNode, {
          entityType: "supportTemplate",
          entityId: template.templateId,
        }),
      );
      continue;
    }

    for (const point of candidates) {
      const nodeId = nodeIdByGridPointId.get(point.id);
      if (!nodeId) {
        diagnostics.push(
          createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameNode, {
            entityType: "supportTemplate",
            entityId: template.templateId,
            detail: `Missing mapped node for grid point ${point.id}`,
          }),
        );
        continue;
      }

      const id = frameSupportId(intermediate.linerModelId, template.templateId, nodeId);
      if (seenSupportIds.has(id)) {
        diagnostics.push(
          createIssue("error", LINER_DIAGNOSTIC_CODES.duplicateFrameId, {
            entityType: "support",
            entityId: id,
          }),
        );
        continue;
      }
      seenSupportIds.add(id);

      supports.push({
        id,
        nodeId,
        ...template.dof,
        coordinateSystem: template.coordinateSystem,
        templateId: template.templateId,
      });
      linerTrace.push({
        ...base,
        frameEntityId: id,
        frameEntityType: "support",
        gridPointId: point.id,
        physicalDistance: point.physicalDistance,
        displayedStation: point.displayedStation,
        offset: point.offset,
        spanId: point.source.spanId,
        pierId: template.pierId ?? point.source.pierId ?? findPierIdForPoint(intermediate, point),
        role: point.roles[0],
        supportTemplateId: template.templateId,
      });
    }
  }

  addConnectivityDiagnostics(nodes, members, diagnostics);

  return {
    nodes,
    members,
    supports,
    linerTrace,
    diagnostics,
  };
}
