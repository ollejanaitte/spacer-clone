"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFiniteVector = isFiniteVector;
exports.nodesByKey = nodesByKey;
exports.memberLength = memberLength;
exports.memberLengths = memberLengths;
exports.buildUndirectedAdjacency = buildUndirectedAdjacency;
exports.connectedComponents = connectedComponents;
exports.degreeHistogram = degreeHistogram;
exports.countParallelEdgeCandidates = countParallelEdgeCandidates;
exports.countSelfLoopCandidates = countSelfLoopCandidates;
exports.computeBoundingBox = computeBoundingBox;
exports.computeCentroid = computeCentroid;
exports.computeLengthStats = computeLengthStats;
exports.normalizeOrientationVector = normalizeOrientationVector;
exports.orientationDotProduct = orientationDotProduct;
exports.createMemberLookup = createMemberLookup;
exports.zeroLengthEpsilon = zeroLengthEpsilon;
const tolerance_1 = require("./tolerance");
function isFiniteVector(vector) {
    return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}
function nodesByKey(nodes) {
    return new Map(nodes.map((node) => [node.key, node]));
}
function memberLength(member, nodeLookup) {
    const nodeI = nodeLookup.get(member.nodeIKey);
    const nodeJ = nodeLookup.get(member.nodeJKey);
    if (!nodeI || !nodeJ)
        return undefined;
    if (!isFiniteVector(nodeI.position) || !isFiniteVector(nodeJ.position))
        return undefined;
    return (0, tolerance_1.distance)(nodeI.position, nodeJ.position);
}
function memberLengths(members, nodeLookup) {
    const lengths = [];
    for (const member of members) {
        const length = memberLength(member, nodeLookup);
        if (length !== undefined && Number.isFinite(length)) {
            lengths.push(length);
        }
    }
    return lengths;
}
function buildUndirectedAdjacency(nodes, members) {
    const adjacency = new Map();
    for (const node of nodes) {
        adjacency.set(node.key, new Set());
    }
    for (const member of members) {
        if (member.nodeIKey === member.nodeJKey)
            continue;
        if (!adjacency.has(member.nodeIKey) || !adjacency.has(member.nodeJKey))
            continue;
        adjacency.get(member.nodeIKey)?.add(member.nodeJKey);
        adjacency.get(member.nodeJKey)?.add(member.nodeIKey);
    }
    return adjacency;
}
function connectedComponents(adjacency) {
    const visited = new Set();
    const components = [];
    for (const nodeKey of [...adjacency.keys()].sort()) {
        if (visited.has(nodeKey))
            continue;
        const stack = [nodeKey];
        const component = [];
        visited.add(nodeKey);
        while (stack.length > 0) {
            const current = stack.pop();
            if (!current)
                continue;
            component.push(current);
            for (const neighbor of [...(adjacency.get(current) ?? [])].sort()) {
                if (visited.has(neighbor))
                    continue;
                visited.add(neighbor);
                stack.push(neighbor);
            }
        }
        components.push(component.sort());
    }
    return components.sort((a, b) => a[0].localeCompare(b[0]));
}
function degreeHistogram(adjacency) {
    const histogram = {};
    for (const neighbors of adjacency.values()) {
        const degree = neighbors.size;
        const key = degree.toString();
        histogram[key] = (histogram[key] ?? 0) + 1;
    }
    return Object.fromEntries(Object.entries(histogram).sort(([a], [b]) => Number(a) - Number(b)));
}
function countParallelEdgeCandidates(members) {
    const endpointCounts = new Map();
    for (const member of members) {
        endpointCounts.set(member.endpointKey, (endpointCounts.get(member.endpointKey) ?? 0) + 1);
    }
    let count = 0;
    for (const value of endpointCounts.values()) {
        if (value > 1)
            count += value;
    }
    return count;
}
function countSelfLoopCandidates(members) {
    return members.filter((member) => member.nodeIKey === member.nodeJKey).length;
}
function computeBoundingBox(nodes) {
    const finiteNodes = nodes.filter((node) => isFiniteVector(node.position));
    if (finiteNodes.length === 0) {
        return {
            min: { x: Number.NaN, y: Number.NaN, z: Number.NaN },
            max: { x: Number.NaN, y: Number.NaN, z: Number.NaN },
        };
    }
    let minX = finiteNodes[0].position.x;
    let minY = finiteNodes[0].position.y;
    let minZ = finiteNodes[0].position.z;
    let maxX = minX;
    let maxY = minY;
    let maxZ = minZ;
    for (const node of finiteNodes.slice(1)) {
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        minZ = Math.min(minZ, node.position.z);
        maxX = Math.max(maxX, node.position.x);
        maxY = Math.max(maxY, node.position.y);
        maxZ = Math.max(maxZ, node.position.z);
    }
    return {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
    };
}
function computeCentroid(nodes) {
    const finiteNodes = nodes.filter((node) => isFiniteVector(node.position));
    if (finiteNodes.length === 0) {
        return { x: Number.NaN, y: Number.NaN, z: Number.NaN };
    }
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    for (const node of finiteNodes) {
        sumX += node.position.x;
        sumY += node.position.y;
        sumZ += node.position.z;
    }
    const count = finiteNodes.length;
    return { x: sumX / count, y: sumY / count, z: sumZ / count };
}
function computeLengthStats(lengths) {
    if (lengths.length === 0) {
        return { min: Number.NaN, max: Number.NaN, mean: Number.NaN, total: 0, count: 0 };
    }
    let min = lengths[0];
    let max = lengths[0];
    let total = 0;
    for (const length of lengths) {
        min = Math.min(min, length);
        max = Math.max(max, length);
        total += length;
    }
    return {
        min,
        max,
        mean: total / lengths.length,
        total,
        count: lengths.length,
    };
}
function normalizeOrientationVector(vector) {
    if (!isFiniteVector(vector))
        return undefined;
    const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    if (magnitude === 0)
        return undefined;
    return {
        x: vector.x / magnitude,
        y: vector.y / magnitude,
        z: vector.z / magnitude,
    };
}
function orientationDotProduct(left, right) {
    const normalizedLeft = normalizeOrientationVector(left);
    const normalizedRight = normalizeOrientationVector(right);
    if (!normalizedLeft || !normalizedRight)
        return undefined;
    return normalizedLeft.x * normalizedRight.x
        + normalizedLeft.y * normalizedRight.y
        + normalizedLeft.z * normalizedRight.z;
}
function createMemberLookup(members) {
    const identity = (member) => `${member.endpointKey}:${member.trace.sourceIndex}`;
    return {
        byIdentity: new Map(members.map((member) => [identity(member), member])),
        identity,
    };
}
function zeroLengthEpsilon(tolerance) {
    return tolerance.length.absolute ?? 1e-9;
}
