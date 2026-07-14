"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareSupportParity = compareSupportParity;
function stripNodeIdentity(identity) {
    const separatorIndex = identity.lastIndexOf(":");
    return separatorIndex >= 0 ? identity.slice(0, separatorIndex) : identity;
}
function fixityKey(support) {
    const { fixity } = support;
    return [
        fixity.ux ? 1 : 0,
        fixity.uy ? 1 : 0,
        fixity.uz ? 1 : 0,
        fixity.rx ? 1 : 0,
        fixity.ry ? 1 : 0,
        fixity.rz ? 1 : 0,
    ].join(",");
}
function supportsByNodeKey(supports) {
    const grouped = new Map();
    for (const support of supports) {
        const nodeKey = support.nodeKey;
        if (!nodeKey)
            continue;
        grouped.set(nodeKey, [...(grouped.get(nodeKey) ?? []), support]);
    }
    return grouped;
}
function compareSupportParity(leftModel, rightModel, nodeMatches) {
    const leftByNode = supportsByNodeKey(leftModel.supports);
    const rightByNode = supportsByNodeKey(rightModel.supports);
    const mismatches = [];
    const ambiguities = [];
    let matchedSupportCount = 0;
    let unmatchedLeftCount = 0;
    let unmatchedRightCount = 0;
    let fixityMismatchCount = 0;
    let ambiguousNodeCount = 0;
    const matchedRightNodes = new Set();
    for (const match of nodeMatches) {
        const leftNodeKey = stripNodeIdentity(match.leftKey);
        const rightNodeKey = stripNodeIdentity(match.rightKey);
        const leftSupports = leftByNode.get(leftNodeKey) ?? [];
        const rightSupports = rightByNode.get(rightNodeKey) ?? [];
        if (leftSupports.length > 1 || rightSupports.length > 1) {
            ambiguousNodeCount += 1;
            ambiguities.push({
                category: "node",
                leftKeys: [leftNodeKey],
                rightKeys: [rightNodeKey],
                message: `Multiple supports on matched node pair (${leftSupports.length} left, ${rightSupports.length} right).`,
            });
            continue;
        }
        if (leftSupports.length === 0 && rightSupports.length === 0)
            continue;
        if (leftSupports.length === 0) {
            unmatchedRightCount += 1;
            mismatches.push({
                category: "support",
                path: rightSupports[0].trace.sourcePath,
                leftValue: undefined,
                rightValue: fixityKey(rightSupports[0]),
                severity: "error",
                message: "Right model has support at matched node with no left counterpart.",
            });
            continue;
        }
        if (rightSupports.length === 0) {
            unmatchedLeftCount += 1;
            mismatches.push({
                category: "support",
                path: leftSupports[0].trace.sourcePath,
                leftValue: fixityKey(leftSupports[0]),
                rightValue: undefined,
                severity: "error",
                message: "Left model has support at matched node with no right counterpart.",
            });
            continue;
        }
        const leftSupport = leftSupports[0];
        const rightSupport = rightSupports[0];
        matchedRightNodes.add(rightNodeKey);
        const leftFixity = fixityKey(leftSupport);
        const rightFixity = fixityKey(rightSupport);
        if (leftFixity !== rightFixity) {
            fixityMismatchCount += 1;
            mismatches.push({
                category: "support",
                path: leftSupport.trace.sourcePath,
                leftValue: leftFixity,
                rightValue: rightFixity,
                severity: "error",
                message: "Support fixity mismatch at matched node.",
            });
            continue;
        }
        matchedSupportCount += 1;
    }
    for (const [nodeKey, supports] of leftByNode.entries()) {
        const hasMatchedNode = nodeMatches.some((match) => stripNodeIdentity(match.leftKey) === nodeKey);
        if (!hasMatchedNode) {
            unmatchedLeftCount += supports.length;
            for (const support of supports) {
                mismatches.push({
                    category: "support",
                    path: support.trace.sourcePath,
                    leftValue: fixityKey(support),
                    rightValue: undefined,
                    severity: "error",
                    message: "Left support node was not matched to any right node.",
                });
            }
        }
    }
    for (const [nodeKey, supports] of rightByNode.entries()) {
        if (matchedRightNodes.has(nodeKey))
            continue;
        const hasMatchedNode = nodeMatches.some((match) => stripNodeIdentity(match.rightKey) === nodeKey);
        if (!hasMatchedNode) {
            unmatchedRightCount += supports.length;
            for (const support of supports) {
                mismatches.push({
                    category: "support",
                    path: support.trace.sourcePath,
                    leftValue: undefined,
                    rightValue: fixityKey(support),
                    severity: "error",
                    message: "Right support node was not matched to any left node.",
                });
            }
        }
    }
    return {
        summary: {
            matchedSupportCount,
            unmatchedLeftCount,
            unmatchedRightCount,
            fixityMismatchCount,
            ambiguousNodeCount,
        },
        mismatches,
        ambiguities,
    };
}
