import type { ProjectModel } from "../../types";
import type { FrameMappingResult } from "../mapper/frameModelMapper";

function linerEntityIdPrefix(linerModelId: string, kind: "node" | "member"): string {
  return kind === "node" ? `N_LINER_${linerModelId}_` : `M_LINER_${linerModelId}_`;
}

function isLinerScopedEntityId(id: string, linerModelId: string, kind: "node" | "member"): boolean {
  return id.startsWith(linerEntityIdPrefix(linerModelId, kind));
}

export function removeLinerScopedFrameEntities(
  project: ProjectModel,
  linerModelId: string,
): Pick<ProjectModel, "nodes" | "members" | "supports" | "nodalLoads" | "memberLoads" | "linerTrace"> {
  const removedNodeIds = new Set(
    project.nodes
      .filter((node) => isLinerScopedEntityId(node.id, linerModelId, "node"))
      .map((node) => node.id),
  );
  const removedMemberIds = new Set(
    project.members
      .filter((member) => isLinerScopedEntityId(member.id, linerModelId, "member"))
      .map((member) => member.id),
  );
  const traceIds = new Set(
    (project.linerTrace ?? [])
      .filter((entry) => entry.linerModelId === linerModelId)
      .map((entry) => entry.frameEntityId),
  );

  for (const node of project.nodes) {
    if (traceIds.has(node.id)) {
      removedNodeIds.add(node.id);
    }
  }
  for (const member of project.members) {
    if (traceIds.has(member.id)) {
      removedMemberIds.add(member.id);
    }
  }

  const nodes = project.nodes.filter((node) => !removedNodeIds.has(node.id));
  const members = project.members.filter((member) => !removedMemberIds.has(member.id));
  const supports = project.supports.filter((support) => !removedNodeIds.has(support.nodeId));
  const nodalLoads = project.nodalLoads.filter((load) => !removedNodeIds.has(load.nodeId));
  const memberLoads = project.memberLoads.filter((load) => !removedMemberIds.has(load.memberId));
  const linerTrace = (project.linerTrace ?? []).filter((entry) => entry.linerModelId !== linerModelId);

  return {
    nodes,
    members,
    supports,
    nodalLoads,
    memberLoads,
    linerTrace,
  };
}

export function mergeLinerFrameEntitiesIntoProject(
  baseProject: ProjectModel,
  linerModelId: string,
  mappingResult: FrameMappingResult,
  frameEntities: Pick<ProjectModel, "nodes" | "members" | "supports">,
): ProjectModel {
  const retained = removeLinerScopedFrameEntities(baseProject, linerModelId);

  return {
    ...baseProject,
    nodes: [...retained.nodes, ...frameEntities.nodes],
    members: [...retained.members, ...frameEntities.members],
    supports: [...retained.supports, ...frameEntities.supports],
    nodalLoads: retained.nodalLoads,
    memberLoads: retained.memberLoads,
    linerTrace: [...(retained.linerTrace ?? []), ...mappingResult.linerTrace],
  };
}
