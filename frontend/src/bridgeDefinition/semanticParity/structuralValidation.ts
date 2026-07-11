import {
  buildUndirectedAdjacency,
  connectedComponents,
  isFiniteVector,
  memberLength,
  nodesByKey,
  zeroLengthEpsilon,
} from "./modelGraph";
import type {
  NormalizedModel,
  SemanticParityDiagnostic,
  StructuralValidationSummary,
} from "./types";
import type { SemanticTolerance } from "./types";

export function validateStructuralModel(
  model: NormalizedModel,
  tolerance: SemanticTolerance,
): { summary: StructuralValidationSummary; errors: SemanticParityDiagnostic[]; warnings: SemanticParityDiagnostic[] } {
  const errors: SemanticParityDiagnostic[] = [];
  const warnings: SemanticParityDiagnostic[] = [];
  const nodeLookup = nodesByKey(model.nodes);
  const adjacency = buildUndirectedAdjacency(model.nodes, model.members);
  const components = connectedComponents(adjacency);

  let isolatedNodeCount = 0;
  const hasMembers = model.members.length > 0;
  for (const [nodeKey, neighbors] of adjacency.entries()) {
    if (neighbors.size === 0 && hasMembers) {
      isolatedNodeCount += 1;
      const node = nodeLookup.get(nodeKey);
      errors.push({
        category: "topology",
        severity: "blocker",
        code: "SEMANTIC_NODE_ISOLATED",
        path: node?.trace.sourcePath ?? `nodes/${nodeKey}`,
        sourceId: node?.sourceId,
        message: "Node has no member connections.",
      });
    }
  }

  if (hasMembers && components.length > 1) {
    errors.push({
      category: "topology",
      severity: "blocker",
      code: "SEMANTIC_MODEL_DISCONNECTED",
      path: "topology/connectedComponents",
      message: `Model has ${components.length} connected components; expected 1.`,
    });
  }

  let zeroLengthMemberCount = 0;
  let selfLoopCount = 0;
  let missingEndpointCount = 0;
  let nonFiniteGeometryCount = 0;
  const epsilon = zeroLengthEpsilon(tolerance);

  for (const node of model.nodes) {
    if (!isFiniteVector(node.position)) {
      nonFiniteGeometryCount += 1;
    }
  }

  for (const member of model.members) {
    const nodeI = nodeLookup.get(member.nodeIKey);
    const nodeJ = nodeLookup.get(member.nodeJKey);
    if (!nodeI || !nodeJ || member.nodeIKey.startsWith("missing:") || member.nodeJKey.startsWith("missing:")) {
      missingEndpointCount += 1;
      errors.push({
        category: "member",
        severity: "error",
        code: "SEMANTIC_MEMBER_MISSING_ENDPOINT",
        path: member.trace.sourcePath,
        sourceId: member.sourceId,
        message: "Member endpoint node reference is missing.",
      });
      continue;
    }

    if (member.nodeIKey === member.nodeJKey) {
      selfLoopCount += 1;
      errors.push({
        category: "member",
        severity: "error",
        code: "SEMANTIC_MEMBER_SELF_LOOP",
        path: member.trace.sourcePath,
        sourceId: member.sourceId,
        message: "Member connects a node to itself.",
      });
      continue;
    }

    if (!isFiniteVector(nodeI.position) || !isFiniteVector(nodeJ.position)) {
      nonFiniteGeometryCount += 1;
      errors.push({
        category: "member",
        severity: "error",
        code: "SEMANTIC_MEMBER_NON_FINITE_GEOMETRY",
        path: member.trace.sourcePath,
        sourceId: member.sourceId,
        message: "Member endpoints have non-finite coordinates.",
      });
      continue;
    }

    const length = memberLength(member, nodeLookup);
    if (length !== undefined && length < epsilon) {
      zeroLengthMemberCount += 1;
      errors.push({
        category: "member",
        severity: "blocker",
        code: "SEMANTIC_MEMBER_ZERO_LENGTH",
        path: member.trace.sourcePath,
        sourceId: member.sourceId,
        message: `Member length ${length} is below zero-length tolerance ${epsilon}.`,
      });
    }

    if (member.orientationVector && !isFiniteVector(member.orientationVector)) {
      nonFiniteGeometryCount += 1;
      errors.push({
        category: "member",
        severity: "error",
        code: "SEMANTIC_MEMBER_ORIENTATION_NON_FINITE",
        path: `${member.trace.sourcePath}/orientationVector`,
        sourceId: member.sourceId,
        message: "Member orientationVector must contain finite numbers.",
      });
    }
  }

  const endpointCounts = new Map<string, number>();
  for (const member of model.members) {
    endpointCounts.set(member.endpointKey, (endpointCounts.get(member.endpointKey) ?? 0) + 1);
  }
  for (const [endpointKey, count] of endpointCounts.entries()) {
    if (count > 1) {
      warnings.push({
        category: "topology",
        severity: "warning",
        code: "SEMANTIC_PARALLEL_EDGE_CANDIDATE",
        path: `members/endpoint/${endpointKey}`,
        message: `${count} members share the same endpoint pair.`,
      });
    }
  }

  const summary: StructuralValidationSummary = {
    valid: errors.length === 0,
    isolatedNodeCount,
    disconnectedComponentCount: components.length,
    zeroLengthMemberCount,
    selfLoopCount,
    missingEndpointCount,
    nonFiniteGeometryCount,
  };

  return { summary, errors, warnings };
}
