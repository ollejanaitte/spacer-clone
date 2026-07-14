"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateStructuralModel = validateStructuralModel;
const modelGraph_1 = require("./modelGraph");
function validateStructuralModel(model, tolerance) {
    const errors = [];
    const warnings = [];
    const nodeLookup = (0, modelGraph_1.nodesByKey)(model.nodes);
    const adjacency = (0, modelGraph_1.buildUndirectedAdjacency)(model.nodes, model.members);
    const components = (0, modelGraph_1.connectedComponents)(adjacency);
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
    const epsilon = (0, modelGraph_1.zeroLengthEpsilon)(tolerance);
    for (const node of model.nodes) {
        if (!(0, modelGraph_1.isFiniteVector)(node.position)) {
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
        if (!(0, modelGraph_1.isFiniteVector)(nodeI.position) || !(0, modelGraph_1.isFiniteVector)(nodeJ.position)) {
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
        const length = (0, modelGraph_1.memberLength)(member, nodeLookup);
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
        if (member.orientationVector && !(0, modelGraph_1.isFiniteVector)(member.orientationVector)) {
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
    const endpointCounts = new Map();
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
    const summary = {
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
