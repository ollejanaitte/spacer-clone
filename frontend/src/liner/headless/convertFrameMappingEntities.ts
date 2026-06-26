import { LINER_DIAGNOSTIC_CODES, createIssue, hasFatalIssues } from "../core/diagnostics";
import type { ComputationDiagnostic } from "../core/types";
import type {
  FrameMemberDraft,
  FrameMappingResult,
  FrameNodeDraft,
  FrameSupportDraft,
} from "../mapper/frameModelMapper";
import type { Member, NodeItem, Support } from "../../types";

export function toProjectNodes(drafts: FrameNodeDraft[]): NodeItem[] {
  return drafts.map((draft) => ({
    id: draft.id,
    x: draft.x,
    y: draft.y,
    z: draft.z,
    ...(draft.label ? { label: draft.label } : {}),
  }));
}

export function toProjectMembers(
  drafts: FrameMemberDraft[],
  diagnostics: ComputationDiagnostic[],
): Member[] {
  const members: Member[] = [];

  for (const draft of drafts) {
    if (!draft.materialId || !draft.sectionId) {
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameSection, {
          entityType: "member",
          entityId: draft.id,
          detail: `Member ${draft.id} is missing materialId or sectionId`,
        }),
      );
      continue;
    }

    members.push({
      id: draft.id,
      nodeI: draft.nodeI,
      nodeJ: draft.nodeJ,
      materialId: draft.materialId,
      sectionId: draft.sectionId,
      orientationVector: draft.orientationVector,
    });
  }

  return members;
}

export function toProjectSupports(drafts: FrameSupportDraft[]): Support[] {
  return drafts.map((draft) => ({
    nodeId: draft.nodeId,
    ux: draft.ux,
    uy: draft.uy,
    uz: draft.uz,
    rx: draft.rx,
    ry: draft.ry,
    rz: draft.rz,
  }));
}

export function convertFrameMappingEntities(
  mappingResult: FrameMappingResult,
): {
  nodes: NodeItem[];
  members: Member[];
  supports: Support[];
  diagnostics: ComputationDiagnostic[];
} {
  const diagnostics: ComputationDiagnostic[] = [...mappingResult.diagnostics];
  const nodes = toProjectNodes(mappingResult.nodes);
  const members = toProjectMembers(mappingResult.members, diagnostics);
  const supports = toProjectSupports(mappingResult.supports);

  const nodeIds = new Set(nodes.map((node) => node.id));
  for (const member of members) {
    if (!nodeIds.has(member.nodeI) || !nodeIds.has(member.nodeJ)) {
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameNode, {
          entityType: "member",
          entityId: member.id,
          detail: `Member ${member.id} references a missing node`,
        }),
      );
    }
  }

  for (const support of supports) {
    if (!nodeIds.has(support.nodeId)) {
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameNode, {
          entityType: "support",
          entityId: support.nodeId,
          detail: `Support references missing node ${support.nodeId}`,
        }),
      );
    }
  }

  return {
    nodes,
    members,
    supports,
    diagnostics,
  };
}

export function mappingResultIsConvertible(mappingResult: FrameMappingResult): boolean {
  const probeDiagnostics: ComputationDiagnostic[] = [...mappingResult.diagnostics];
  toProjectMembers(mappingResult.members, probeDiagnostics);
  return !hasFatalIssues(probeDiagnostics);
}
