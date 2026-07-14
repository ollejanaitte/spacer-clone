"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeTopologyMetrics = computeTopologyMetrics;
exports.computeUnmatchedConnectivityEdgeCount = computeUnmatchedConnectivityEdgeCount;
exports.compareTopologyMetrics = compareTopologyMetrics;
exports.buildTopologyMetrics = buildTopologyMetrics;
const modelGraph_1 = require("./modelGraph");
function stripNodeIdentity(identity) {
    const separatorIndex = identity.lastIndexOf(":");
    return separatorIndex >= 0 ? identity.slice(0, separatorIndex) : identity;
}
function canonicalPair(first, second) {
    return [first, second].sort((a, b) => a.localeCompare(b)).join("|");
}
function computeTopologyMetrics(model) {
    const adjacency = (0, modelGraph_1.buildUndirectedAdjacency)(model.nodes, model.members);
    const components = (0, modelGraph_1.connectedComponents)(adjacency);
    const histogram = (0, modelGraph_1.degreeHistogram)(adjacency);
    let isolatedNodeCount = 0;
    for (const neighbors of adjacency.values()) {
        if (neighbors.size === 0)
            isolatedNodeCount += 1;
    }
    return {
        degreeHistogram: histogram,
        isolatedNodeCount,
        connectedComponentCount: components.length,
        connectedComponentSizes: components.map((component) => component.length).sort((a, b) => b - a),
        parallelEdgeCandidateCount: (0, modelGraph_1.countParallelEdgeCandidates)(model.members),
        selfLoopCandidateCount: (0, modelGraph_1.countSelfLoopCandidates)(model.members),
    };
}
function computeUnmatchedConnectivityEdgeCount(leftModel, rightModel, nodeMatches) {
    const leftNodeToRightNode = new Map(nodeMatches.map((match) => [stripNodeIdentity(match.leftKey), stripNodeIdentity(match.rightKey)]));
    const rightEdges = new Set(rightModel.members.map((member) => canonicalPair(member.nodeIKey, member.nodeJKey)));
    let unmatched = 0;
    for (const member of leftModel.members) {
        const mappedI = leftNodeToRightNode.get(member.nodeIKey);
        const mappedJ = leftNodeToRightNode.get(member.nodeJKey);
        if (!mappedI || !mappedJ) {
            unmatched += 1;
            continue;
        }
        const projected = canonicalPair(mappedI, mappedJ);
        if (!rightEdges.has(projected))
            unmatched += 1;
    }
    return unmatched;
}
function compareTopologyMetrics(left, right) {
    const mismatches = [];
    const warnings = [];
    if (left.isolatedNodeCount !== right.isolatedNodeCount) {
        mismatches.push({
            category: "topology",
            path: "topology.isolatedNodeCount",
            leftValue: left.isolatedNodeCount,
            rightValue: right.isolatedNodeCount,
            severity: "error",
            message: "Isolated node count differs between models.",
        });
    }
    if (left.connectedComponentCount !== right.connectedComponentCount) {
        mismatches.push({
            category: "topology",
            path: "topology.connectedComponentCount",
            leftValue: left.connectedComponentCount,
            rightValue: right.connectedComponentCount,
            severity: "error",
            message: "Connected component count differs between models.",
        });
    }
    const leftSizes = left.connectedComponentSizes.join(",");
    const rightSizes = right.connectedComponentSizes.join(",");
    if (leftSizes !== rightSizes) {
        mismatches.push({
            category: "topology",
            path: "topology.connectedComponentSizes",
            leftValue: left.connectedComponentSizes,
            rightValue: right.connectedComponentSizes,
            severity: "error",
            message: "Connected component size distribution differs between models.",
        });
    }
    const leftHistogram = JSON.stringify(left.degreeHistogram);
    const rightHistogram = JSON.stringify(right.degreeHistogram);
    if (leftHistogram !== rightHistogram) {
        mismatches.push({
            category: "topology",
            path: "topology.degreeHistogram",
            leftValue: left.degreeHistogram,
            rightValue: right.degreeHistogram,
            severity: "warning",
            message: "Degree histogram differs between models.",
        });
    }
    if (left.parallelEdgeCandidateCount > 0 || right.parallelEdgeCandidateCount > 0) {
        warnings.push({
            category: "topology",
            severity: "warning",
            code: "SEMANTIC_PARALLEL_EDGE_CANDIDATE",
            path: "topology.parallelEdgeCandidateCount",
            message: `Parallel edge candidates detected (left=${left.parallelEdgeCandidateCount}, right=${right.parallelEdgeCandidateCount}).`,
        });
    }
    if (left.unmatchedConnectivityEdgeCount !== undefined && left.unmatchedConnectivityEdgeCount > 0) {
        mismatches.push({
            category: "topology",
            path: "topology.unmatchedConnectivityEdgeCount",
            leftValue: left.unmatchedConnectivityEdgeCount,
            rightValue: 0,
            severity: "error",
            message: "Left model has connectivity edges not represented on the right via matched nodes.",
        });
    }
    return { equivalent: mismatches.length === 0, mismatches, warnings };
}
function buildTopologyMetrics(leftModel, rightModel, nodeMatches) {
    const left = {
        ...computeTopologyMetrics(leftModel),
        unmatchedConnectivityEdgeCount: computeUnmatchedConnectivityEdgeCount(leftModel, rightModel, nodeMatches),
    };
    const right = computeTopologyMetrics(rightModel);
    const comparison = compareTopologyMetrics(left, right);
    return { left, right, ...comparison };
}
