/**
 * Keep the FEM line-model overlay aligned with Apollo bridge layout stations.
 * Visualization-only sync: does not change design authorization or solver results.
 */

import type { Member, NodeItem, ProjectModel, Support } from "../../types";
import {
  SupportLayoutRole,
  type BridgeLayoutContract,
  type BridgeLayoutSupport,
} from "../contracts";

function supportLabel(support: BridgeLayoutSupport, index: number, _total: number): string {
  if (support.role === SupportLayoutRole.ABUTMENT) {
    return index === 0 ? "A1" : "A2";
  }
  return `P${index}`;
}

function pickMaterialId(project: ProjectModel): string {
  return project.materials[0]?.id ?? "MAT-BRIDGE";
}

function pickSectionId(project: ProjectModel): string {
  return project.sections[0]?.id ?? "SEC-BRIDGE";
}

/**
 * Rebuild project nodes/members/supports so the line overlay matches layout stations
 * (same longitudinal source of truth as BSDD solids).
 */
export function syncOverlayFrameToLayout(
  project: ProjectModel,
  layout: BridgeLayoutContract,
): Pick<ProjectModel, "nodes" | "members" | "supports"> {
  const supportsLayout = layout.supports;
  if (supportsLayout.length < 2) {
    return {
      nodes: project.nodes,
      members: project.members,
      supports: project.supports,
    };
  }

  const materialId = pickMaterialId(project);
  const sectionId = pickSectionId(project);

  const nodes: NodeItem[] = supportsLayout.map((support, index) => ({
    id: `N-${support.id}`,
    x: support.station,
    y: 0,
    z: 0,
    label: supportLabel(support, index, supportsLayout.length),
  }));

  const members: Member[] = [];
  for (let index = 0; index < nodes.length - 1; index += 1) {
    const nodeI = nodes[index]!;
    const nodeJ = nodes[index + 1]!;
    members.push({
      id: `M-${layout.spans[index]?.id ?? `span-${index}`}`,
      nodeI: nodeI.id,
      nodeJ: nodeJ.id,
      materialId,
      sectionId,
      label: `第${index + 1}径間`,
    });
  }

  const supports: Support[] = supportsLayout.map((support, index) => {
    const isAbutment = support.role === SupportLayoutRole.ABUTMENT;
    return {
      id: `SUP-${support.id}`,
      nodeId: `N-${support.id}`,
      label: supportLabel(support, index, supportsLayout.length),
      ux: true,
      uy: true,
      uz: true,
      rx: isAbutment,
      ry: isAbutment,
      rz: isAbutment,
    };
  });

  return { nodes, members, supports };
}
