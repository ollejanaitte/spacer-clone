"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeGeometryMetrics = computeGeometryMetrics;
exports.computeMatchedGeometryMetrics = computeMatchedGeometryMetrics;
exports.compareGeometryMetrics = compareGeometryMetrics;
exports.buildGeometryMetrics = buildGeometryMetrics;
const modelGraph_1 = require("./modelGraph");
const tolerance_1 = require("./tolerance");
function compareVector(left, right, tolerance, path) {
    const axes = ["x", "y", "z"];
    for (const axis of axes) {
        const result = (0, tolerance_1.compareScalarWithTolerance)(left[axis], right[axis], tolerance.coordinate);
        if (!result.equal) {
            return {
                category: "geometry",
                path,
                leftValue: left[axis],
                rightValue: right[axis],
                delta: result.delta,
                tolerance: tolerance.coordinate,
                severity: "error",
                message: `Geometry ${path}.${axis} differs beyond coordinate tolerance.`,
            };
        }
    }
    return undefined;
}
function computeGeometryMetrics(model) {
    const nodeLookup = (0, modelGraph_1.nodesByKey)(model.nodes);
    const lengths = (0, modelGraph_1.memberLengths)(model.members, nodeLookup);
    return {
        nodeCount: model.nodes.length,
        memberCount: model.members.length,
        boundingBox: (0, modelGraph_1.computeBoundingBox)(model.nodes),
        centroid: (0, modelGraph_1.computeCentroid)(model.nodes),
        memberLengths: (0, modelGraph_1.computeLengthStats)(lengths),
    };
}
function computeMatchedGeometryMetrics(leftNodes, rightNodes, leftMembers, rightMembers, nodeMatches, memberMatches, tolerance) {
    const leftNodeByIdentity = new Map(leftNodes.map((node) => [`${node.key}:${node.trace.sourceIndex}`, node]));
    const rightNodeByIdentity = new Map(rightNodes.map((node) => [`${node.key}:${node.trace.sourceIndex}`, node]));
    const leftNodeLookup = (0, modelGraph_1.nodesByKey)(leftNodes);
    const rightNodeLookup = (0, modelGraph_1.nodesByKey)(rightNodes);
    let maxMatchedNodeDistance = 0;
    for (const match of nodeMatches) {
        const left = leftNodeByIdentity.get(match.leftKey);
        const right = rightNodeByIdentity.get(match.rightKey);
        if (!left || !right)
            continue;
        const result = (0, tolerance_1.distanceWithinTolerance)(left.position, right.position, tolerance.coordinate);
        if (Number.isFinite(result.delta)) {
            maxMatchedNodeDistance = Math.max(maxMatchedNodeDistance, result.delta);
        }
    }
    const leftMemberLookup = new Map(leftMembers.map((member) => [`${member.endpointKey}:${member.trace.sourceIndex}`, member]));
    const rightMemberLookup = new Map(rightMembers.map((member) => [`${member.endpointKey}:${member.trace.sourceIndex}`, member]));
    const matchedMemberLengthDeltas = [];
    let maxMatchedMemberLengthDelta = 0;
    for (const match of memberMatches) {
        const left = leftMemberLookup.get(match.leftKey);
        const right = rightMemberLookup.get(match.rightKey);
        if (!left || !right)
            continue;
        const leftLength = (0, modelGraph_1.memberLengths)([left], leftNodeLookup)[0];
        const rightLength = (0, modelGraph_1.memberLengths)([right], rightNodeLookup)[0];
        if (leftLength === undefined || rightLength === undefined)
            continue;
        const delta = Math.abs(leftLength - rightLength);
        matchedMemberLengthDeltas.push(delta);
        maxMatchedMemberLengthDelta = Math.max(maxMatchedMemberLengthDelta, delta);
    }
    return {
        maxMatchedNodeDistance: nodeMatches.length > 0 ? maxMatchedNodeDistance : undefined,
        maxMatchedMemberLengthDelta: memberMatches.length > 0 ? maxMatchedMemberLengthDelta : undefined,
        matchedMemberLengthDeltas,
    };
}
function compareGeometryMetrics(left, right, tolerance) {
    const mismatches = [];
    const boundingBoxMismatch = compareVector(left.boundingBox.min, right.boundingBox.min, tolerance, "boundingBox.min")
        ?? compareVector(left.boundingBox.max, right.boundingBox.max, tolerance, "boundingBox.max");
    if (boundingBoxMismatch)
        mismatches.push(boundingBoxMismatch);
    const centroidMismatch = compareVector(left.centroid, right.centroid, tolerance, "centroid");
    if (centroidMismatch)
        mismatches.push(centroidMismatch);
    const lengthComparisons = [
        { key: "min", label: "Minimum member length" },
        { key: "max", label: "Maximum member length" },
        { key: "mean", label: "Mean member length" },
        { key: "total", label: "Total member length" },
    ];
    for (const { key, label } of lengthComparisons) {
        const result = (0, tolerance_1.compareScalarWithTolerance)(left.memberLengths[key], right.memberLengths[key], tolerance.length);
        if (!result.equal) {
            mismatches.push({
                category: "geometry",
                path: `geometry.memberLengths.${key}`,
                leftValue: left.memberLengths[key],
                rightValue: right.memberLengths[key],
                delta: result.delta,
                tolerance: tolerance.length,
                severity: "error",
                message: `${label} differs beyond tolerance.`,
            });
        }
    }
    if (left.maxMatchedNodeDistance !== undefined
        && right.maxMatchedNodeDistance !== undefined
        && left.maxMatchedNodeDistance !== right.maxMatchedNodeDistance) {
        const delta = Math.abs(left.maxMatchedNodeDistance - right.maxMatchedNodeDistance);
        const result = (0, tolerance_1.compareScalarWithTolerance)(left.maxMatchedNodeDistance, right.maxMatchedNodeDistance, tolerance.coordinate);
        if (!result.equal) {
            mismatches.push({
                category: "node",
                path: "geometry.maxMatchedNodeDistance",
                leftValue: left.maxMatchedNodeDistance,
                rightValue: right.maxMatchedNodeDistance,
                delta,
                tolerance: tolerance.coordinate,
                severity: "warning",
                message: "Matched node distance summary differs between sides.",
            });
        }
    }
    if (left.maxMatchedMemberLengthDelta !== undefined && right.maxMatchedMemberLengthDelta !== undefined) {
        const result = (0, tolerance_1.compareScalarWithTolerance)(left.maxMatchedMemberLengthDelta, right.maxMatchedMemberLengthDelta, tolerance.length);
        if (!result.equal) {
            mismatches.push({
                category: "member",
                path: "geometry.maxMatchedMemberLengthDelta",
                leftValue: left.maxMatchedMemberLengthDelta,
                rightValue: right.maxMatchedMemberLengthDelta,
                delta: result.delta,
                tolerance: tolerance.length,
                severity: "warning",
                message: "Matched member length delta summary differs between sides.",
            });
        }
    }
    return { equivalent: mismatches.length === 0, mismatches };
}
function buildGeometryMetrics(leftModel, rightModel, nodeMatches, memberMatches, tolerance) {
    const leftBase = computeGeometryMetrics(leftModel);
    const rightBase = computeGeometryMetrics(rightModel);
    const matched = computeMatchedGeometryMetrics(leftModel.nodes, rightModel.nodes, leftModel.members, rightModel.members, nodeMatches, memberMatches, tolerance);
    const left = { ...leftBase, ...matched };
    const right = { ...rightBase, ...matched };
    const comparison = compareGeometryMetrics(left, right, tolerance);
    return { left, right, ...comparison };
}
