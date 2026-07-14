"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareLoadParity = compareLoadParity;
const tolerance_1 = require("./tolerance");
function stripNodeIdentity(identity) {
    const separatorIndex = identity.lastIndexOf(":");
    return separatorIndex >= 0 ? identity.slice(0, separatorIndex) : identity;
}
function nodeMatchMap(nodeMatches) {
    return new Map(nodeMatches.map((match) => [
        stripNodeIdentity(match.leftKey),
        stripNodeIdentity(match.rightKey),
    ]));
}
function canonicalPair(first, second) {
    return [first, second].sort((a, b) => a.localeCompare(b)).join("|");
}
function projectEndpointKey(nodeIKey, nodeJKey, nodeMatchMapByLeft) {
    const mappedI = nodeMatchMapByLeft.get(nodeIKey);
    const mappedJ = nodeMatchMapByLeft.get(nodeJKey);
    if (!mappedI || !mappedJ)
        return undefined;
    return canonicalPair(mappedI, mappedJ);
}
function nodalTargetKey(nodeKey, loadCaseSemanticKey) {
    return `${nodeKey}:${loadCaseSemanticKey}`;
}
function memberTargetKey(endpointKey, loadCaseSemanticKey, coordinateSystem) {
    return `${endpointKey}:${loadCaseSemanticKey}:${coordinateSystem}`;
}
function nodalCrossModelKey(load, nodeKey) {
    return nodalTargetKey(nodeKey, load.loadCaseSemanticKey);
}
function memberCrossModelKey(load, endpointKey) {
    return memberTargetKey(endpointKey, load.loadCaseSemanticKey, load.coordinateSystem);
}
function nodalMagnitude(vector) {
    return Math.sqrt(vector.fx * vector.fx
        + vector.fy * vector.fy
        + vector.fz * vector.fz
        + vector.mx * vector.mx
        + vector.my * vector.my
        + vector.mz * vector.mz);
}
function memberMagnitude(vector) {
    return Math.sqrt(vector.wx * vector.wx + vector.wy * vector.wy + vector.wz * vector.wz);
}
function totalAppliedLoad(nodalLoads, memberLoads) {
    let total = 0;
    for (const load of nodalLoads ?? []) {
        total += nodalMagnitude(load.vector);
    }
    for (const load of memberLoads ?? []) {
        total += memberMagnitude(load.vector);
    }
    return total;
}
function vectorsEqualWithinTolerance(left, right, tolerance) {
    return ((0, tolerance_1.nearlyEqual)(left.fx, right.fx, tolerance)
        && (0, tolerance_1.nearlyEqual)(left.fy, right.fy, tolerance)
        && (0, tolerance_1.nearlyEqual)(left.fz, right.fz, tolerance)
        && (0, tolerance_1.nearlyEqual)(left.mx, right.mx, tolerance)
        && (0, tolerance_1.nearlyEqual)(left.my, right.my, tolerance)
        && (0, tolerance_1.nearlyEqual)(left.mz, right.mz, tolerance));
}
function memberVectorsEqualWithinTolerance(left, right, tolerance) {
    return ((0, tolerance_1.nearlyEqual)(left.wx, right.wx, tolerance)
        && (0, tolerance_1.nearlyEqual)(left.wy, right.wy, tolerance)
        && (0, tolerance_1.nearlyEqual)(left.wz, right.wz, tolerance));
}
function groupByKey(items, keyForItem) {
    const grouped = new Map();
    for (const item of items) {
        const key = keyForItem(item);
        if (!key)
            continue;
        grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }
    return grouped;
}
function compareLoadCaseSets(leftModel, rightModel) {
    const leftCases = leftModel.loadCases ?? [];
    const rightCases = rightModel.loadCases ?? [];
    const leftGrouped = groupByKey(leftCases, (loadCase) => loadCase.semanticKey);
    const rightGrouped = groupByKey(rightCases, (loadCase) => loadCase.semanticKey);
    const mismatches = [];
    const ambiguities = [];
    let matchedLoadCaseCount = 0;
    let unmatchedLeftLoadCaseCount = 0;
    let unmatchedRightLoadCaseCount = 0;
    let ambiguousCount = 0;
    const keys = [...new Set([...leftGrouped.keys(), ...rightGrouped.keys()])].sort((a, b) => a.localeCompare(b));
    for (const key of keys) {
        const leftGroup = leftGrouped.get(key) ?? [];
        const rightGroup = rightGrouped.get(key) ?? [];
        if (leftGroup.length > 1 || rightGroup.length > 1) {
            ambiguousCount += Math.max(leftGroup.length, rightGroup.length);
            ambiguities.push({
                category: "load",
                leftKeys: leftGroup.map((loadCase) => loadCase.trace.sourcePath),
                rightKeys: rightGroup.map((loadCase) => loadCase.trace.sourcePath),
                message: `Duplicate semantic load case candidates for key "${key}" (${leftGroup.length} left, ${rightGroup.length} right).`,
            });
            continue;
        }
        if (leftGroup.length === 0 && rightGroup.length === 1) {
            unmatchedRightLoadCaseCount += 1;
            mismatches.push({
                category: "load",
                path: rightGroup[0].trace.sourcePath,
                leftValue: undefined,
                rightValue: rightGroup[0].semanticKey,
                severity: "error",
                message: "Right load case has no left counterpart with the same semantic key.",
            });
            continue;
        }
        if (leftGroup.length === 1 && rightGroup.length === 0) {
            unmatchedLeftLoadCaseCount += 1;
            mismatches.push({
                category: "load",
                path: leftGroup[0].trace.sourcePath,
                leftValue: leftGroup[0].semanticKey,
                rightValue: undefined,
                severity: "error",
                message: "Left load case has no right counterpart with the same semantic key.",
            });
            continue;
        }
        if (leftGroup.length === 1 && rightGroup.length === 1) {
            matchedLoadCaseCount += 1;
        }
    }
    return {
        matchedLoadCaseCount,
        unmatchedLeftLoadCaseCount,
        unmatchedRightLoadCaseCount,
        ambiguousCount,
        mismatches,
        ambiguities,
    };
}
function compareGroupedLoads(leftGrouped, rightGrouped, compareVectors, describeItem) {
    const mismatches = [];
    const ambiguities = [];
    let matchedCount = 0;
    let unmatchedLeftCount = 0;
    let unmatchedRightCount = 0;
    let valueMismatchCount = 0;
    let ambiguousCount = 0;
    const keys = [...new Set([...leftGrouped.keys(), ...rightGrouped.keys()])].sort((a, b) => a.localeCompare(b));
    for (const key of keys) {
        const leftGroup = leftGrouped.get(key) ?? [];
        const rightGroup = rightGrouped.get(key) ?? [];
        if (leftGroup.length > 1 || rightGroup.length > 1) {
            ambiguousCount += Math.max(leftGroup.length, rightGroup.length);
            ambiguities.push({
                category: "load",
                leftKeys: leftGroup.map((item) => item.trace.sourcePath),
                rightKeys: rightGroup.map((item) => item.trace.sourcePath),
                message: `Duplicate semantic load candidates for key "${key}" (${leftGroup.length} left, ${rightGroup.length} right).`,
            });
            continue;
        }
        if (leftGroup.length === 0 && rightGroup.length === 1) {
            unmatchedRightCount += 1;
            mismatches.push({
                category: "load",
                path: rightGroup[0].trace.sourcePath,
                leftValue: undefined,
                rightValue: describeItem(rightGroup[0]),
                severity: "error",
                message: "Right load item has no left counterpart for the same semantic target.",
            });
            continue;
        }
        if (leftGroup.length === 1 && rightGroup.length === 0) {
            unmatchedLeftCount += 1;
            mismatches.push({
                category: "load",
                path: leftGroup[0].trace.sourcePath,
                leftValue: describeItem(leftGroup[0]),
                rightValue: undefined,
                severity: "error",
                message: "Left load item has no right counterpart for the same semantic target.",
            });
            continue;
        }
        if (leftGroup.length === 1 && rightGroup.length === 1) {
            const comparison = compareVectors(leftGroup[0], rightGroup[0]);
            if (!comparison.equal) {
                valueMismatchCount += 1;
                if (comparison.mismatch)
                    mismatches.push(comparison.mismatch);
            }
            else {
                matchedCount += 1;
            }
        }
    }
    return {
        matchedCount,
        unmatchedLeftCount,
        unmatchedRightCount,
        valueMismatchCount,
        ambiguousCount,
        mismatches,
        ambiguities,
    };
}
function compareLoadParity(leftModel, rightModel, nodeMatches, memberMatches, tolerance) {
    const loadTolerance = tolerance.scalar;
    const leftNodeToRightNode = nodeMatchMap(nodeMatches);
    const mismatches = [];
    const ambiguities = [];
    const warnings = [];
    if (leftModel.metadata.loadsMapped === false) {
        warnings.push({
            category: "load",
            severity: "info",
            code: "SEMANTIC_LOAD_PARITY_SKIPPED_LEFT",
            path: "metadata.loadsMapped",
            message: "Left model loads are not mapped; load parity treats absent loads conservatively.",
        });
    }
    if (rightModel.metadata.loadsMapped === false) {
        warnings.push({
            category: "load",
            severity: "info",
            code: "SEMANTIC_LOAD_PARITY_SKIPPED_RIGHT",
            path: "metadata.loadsMapped",
            message: "Right model loads are not mapped; load parity treats absent loads conservatively.",
        });
    }
    const loadCaseResult = compareLoadCaseSets(leftModel, rightModel);
    mismatches.push(...loadCaseResult.mismatches);
    ambiguities.push(...loadCaseResult.ambiguities);
    const leftNodalGrouped = groupByKey(leftModel.nodalLoads ?? [], (load) => {
        if (!load.nodeKey)
            return undefined;
        const projectedNodeKey = leftNodeToRightNode.get(load.nodeKey);
        if (!projectedNodeKey)
            return undefined;
        return nodalCrossModelKey(load, projectedNodeKey);
    });
    const rightNodalGrouped = groupByKey(rightModel.nodalLoads ?? [], (load) => {
        if (!load.nodeKey)
            return undefined;
        return nodalCrossModelKey(load, load.nodeKey);
    });
    for (const load of leftModel.nodalLoads ?? []) {
        if (!load.nodeKey || leftNodeToRightNode.has(load.nodeKey))
            continue;
        mismatches.push({
            category: "load",
            path: load.trace.sourcePath,
            leftValue: load.vector,
            rightValue: undefined,
            severity: "error",
            message: "Left nodal load node was not matched to any right node.",
        });
    }
    for (const load of rightModel.nodalLoads ?? []) {
        const hasMatchedNode = nodeMatches.some((match) => stripNodeIdentity(match.rightKey) === load.nodeKey);
        if (!load.nodeKey || hasMatchedNode)
            continue;
        mismatches.push({
            category: "load",
            path: load.trace.sourcePath,
            leftValue: undefined,
            rightValue: load.vector,
            severity: "error",
            message: "Right nodal load node was not matched to any left node.",
        });
    }
    const nodalResult = compareGroupedLoads(leftNodalGrouped, rightNodalGrouped, (left, right) => {
        const equal = vectorsEqualWithinTolerance(left.vector, right.vector, loadTolerance);
        if (equal)
            return { equal: true };
        return {
            equal: false,
            mismatch: {
                category: "load",
                path: left.trace.sourcePath,
                leftValue: left.vector,
                rightValue: right.vector,
                severity: "blocker",
                message: "Nodal load vector mismatch at matched semantic target.",
                tolerance: loadTolerance,
            },
        };
    }, (item) => item.vector);
    mismatches.push(...nodalResult.mismatches);
    ambiguities.push(...nodalResult.ambiguities);
    const leftMembersByEndpoint = new Map();
    for (const member of leftModel.members) {
        leftMembersByEndpoint.set(member.endpointKey, { nodeIKey: member.nodeIKey, nodeJKey: member.nodeJKey });
    }
    const leftMemberGrouped = groupByKey(leftModel.memberLoads ?? [], (load) => {
        if (!load.endpointKey)
            return undefined;
        const endpoints = leftMembersByEndpoint.get(load.endpointKey);
        if (!endpoints)
            return undefined;
        const projectedEndpoint = projectEndpointKey(endpoints.nodeIKey, endpoints.nodeJKey, leftNodeToRightNode);
        if (!projectedEndpoint)
            return undefined;
        return memberCrossModelKey(load, projectedEndpoint);
    });
    const rightMemberGrouped = groupByKey(rightModel.memberLoads ?? [], (load) => {
        if (!load.endpointKey)
            return undefined;
        return memberCrossModelKey(load, load.endpointKey);
    });
    for (const load of leftModel.memberLoads ?? []) {
        if (!load.endpointKey)
            continue;
        const endpoints = leftMembersByEndpoint.get(load.endpointKey);
        if (!endpoints)
            continue;
        const projectedEndpoint = projectEndpointKey(endpoints.nodeIKey, endpoints.nodeJKey, leftNodeToRightNode);
        if (projectedEndpoint)
            continue;
        mismatches.push({
            category: "load",
            path: load.trace.sourcePath,
            leftValue: { coordinateSystem: load.coordinateSystem, vector: load.vector },
            rightValue: undefined,
            severity: "error",
            message: "Left member load endpoints were not matched to any right member.",
        });
    }
    const memberResult = compareGroupedLoads(leftMemberGrouped, rightMemberGrouped, (left, right) => {
        const leftLoad = left;
        const rightLoad = right;
        if (leftLoad.coordinateSystem !== rightLoad.coordinateSystem) {
            return {
                equal: false,
                mismatch: {
                    category: "load",
                    path: leftLoad.trace.sourcePath,
                    leftValue: leftLoad.coordinateSystem,
                    rightValue: rightLoad.coordinateSystem,
                    severity: "error",
                    message: "Member load coordinateSystem mismatch at matched semantic target.",
                },
            };
        }
        const equal = memberVectorsEqualWithinTolerance(leftLoad.vector, rightLoad.vector, loadTolerance);
        if (equal)
            return { equal: true };
        return {
            equal: false,
            mismatch: {
                category: "load",
                path: leftLoad.trace.sourcePath,
                leftValue: leftLoad.vector,
                rightValue: rightLoad.vector,
                severity: "blocker",
                message: "Member load vector mismatch at matched semantic target.",
                tolerance: loadTolerance,
            },
        };
    }, (item) => ({
        coordinateSystem: item.coordinateSystem,
        vector: item.vector,
    }));
    mismatches.push(...memberResult.mismatches);
    ambiguities.push(...memberResult.ambiguities);
    for (const load of leftModel.memberLoads ?? []) {
        if (load.coordinateSystem === "local") {
            warnings.push({
                category: "load",
                severity: "warning",
                code: "SEMANTIC_MEMBER_LOAD_LOCAL_BASIS",
                path: load.trace.sourcePath,
                sourceId: load.sourceId,
                message: "Local coordinateSystem member load parity does not transform local axes across I/J reversal.",
            });
        }
    }
    for (const load of rightModel.memberLoads ?? []) {
        if (load.coordinateSystem === "local") {
            warnings.push({
                category: "load",
                severity: "warning",
                code: "SEMANTIC_MEMBER_LOAD_LOCAL_BASIS",
                path: load.trace.sourcePath,
                sourceId: load.sourceId,
                message: "Local coordinateSystem member load parity does not transform local axes across I/J reversal.",
            });
        }
    }
    const totalAppliedLoadLeft = totalAppliedLoad(leftModel.nodalLoads, leftModel.memberLoads);
    const totalAppliedLoadRight = totalAppliedLoad(rightModel.nodalLoads, rightModel.memberLoads);
    const totalComparison = (0, tolerance_1.compareScalarWithTolerance)(totalAppliedLoadLeft, totalAppliedLoadRight, loadTolerance);
    if (!totalComparison.equal) {
        mismatches.push({
            category: "load",
            path: "load.totalApplied",
            leftValue: totalAppliedLoadLeft,
            rightValue: totalAppliedLoadRight,
            delta: totalComparison.delta,
            tolerance: loadTolerance,
            severity: "blocker",
            message: "Total applied load magnitude mismatch.",
        });
    }
    const ambiguousLoadCandidateCount = loadCaseResult.ambiguousCount + nodalResult.ambiguousCount + memberResult.ambiguousCount;
    const unmatchedLeftNodalFromNode = (leftModel.nodalLoads ?? []).filter((load) => load.nodeKey && !leftNodeToRightNode.has(load.nodeKey)).length;
    const unmatchedRightNodalFromNode = (rightModel.nodalLoads ?? []).filter((load) => {
        if (!load.nodeKey)
            return false;
        return !nodeMatches.some((match) => stripNodeIdentity(match.rightKey) === load.nodeKey);
    }).length;
    const unmatchedLeftMemberFromEndpoint = (leftModel.memberLoads ?? []).filter((load) => {
        if (!load.endpointKey)
            return false;
        const endpoints = leftMembersByEndpoint.get(load.endpointKey);
        if (!endpoints)
            return false;
        return !projectEndpointKey(endpoints.nodeIKey, endpoints.nodeJKey, leftNodeToRightNode);
    }).length;
    return {
        summary: {
            matchedLoadCaseCount: loadCaseResult.matchedLoadCaseCount,
            unmatchedLeftLoadCaseCount: loadCaseResult.unmatchedLeftLoadCaseCount,
            unmatchedRightLoadCaseCount: loadCaseResult.unmatchedRightLoadCaseCount,
            matchedNodalLoadCount: nodalResult.matchedCount,
            unmatchedLeftNodalLoadCount: nodalResult.unmatchedLeftCount + unmatchedLeftNodalFromNode,
            unmatchedRightNodalLoadCount: nodalResult.unmatchedRightCount + unmatchedRightNodalFromNode,
            nodalLoadValueMismatchCount: nodalResult.valueMismatchCount,
            matchedMemberLoadCount: memberResult.matchedCount,
            unmatchedLeftMemberLoadCount: memberResult.unmatchedLeftCount + unmatchedLeftMemberFromEndpoint,
            unmatchedRightMemberLoadCount: memberResult.unmatchedRightCount,
            memberLoadValueMismatchCount: memberResult.valueMismatchCount,
            ambiguousLoadCandidateCount,
            totalAppliedLoadLeft,
            totalAppliedLoadRight,
            totalAppliedLoadEquivalent: totalComparison.equal,
        },
        mismatches,
        ambiguities,
        warnings,
    };
}
