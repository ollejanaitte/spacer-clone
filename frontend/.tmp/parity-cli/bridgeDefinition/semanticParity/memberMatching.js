"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchNormalizedMembers = matchNormalizedMembers;
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
function memberIdentity(member) {
    return `${member.endpointKey}:${member.trace.sourceIndex}`;
}
function unmatchedMember(side, member, reason) {
    return {
        side,
        key: member.key,
        sourceId: member.sourceId,
        path: member.trace.sourcePath,
        reason,
    };
}
function matchNormalizedMembers(leftMembers, rightMembers, nodeMatches) {
    const leftNodeToRightNode = nodeMatchMap(nodeMatches);
    const rightByEndpoint = new Map();
    for (const right of rightMembers) {
        rightByEndpoint.set(right.endpointKey, [...(rightByEndpoint.get(right.endpointKey) ?? []), right]);
    }
    const leftByProjectedEndpoint = new Map();
    const projectedEndpointByLeft = new Map();
    const missingNodeLeft = new Set();
    for (const left of leftMembers) {
        const identity = memberIdentity(left);
        const mappedI = leftNodeToRightNode.get(left.nodeIKey);
        const mappedJ = leftNodeToRightNode.get(left.nodeJKey);
        if (!mappedI || !mappedJ) {
            missingNodeLeft.add(identity);
            continue;
        }
        const endpoint = canonicalPair(mappedI, mappedJ);
        projectedEndpointByLeft.set(identity, endpoint);
        leftByProjectedEndpoint.set(endpoint, [...(leftByProjectedEndpoint.get(endpoint) ?? []), left]);
    }
    const matched = [];
    const ambiguities = [];
    const matchedLeft = new Set();
    const matchedRight = new Set();
    const ambiguousLeft = new Set();
    const ambiguousRight = new Set();
    for (const [endpoint, leftGroup] of [...leftByProjectedEndpoint.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const rightGroup = rightByEndpoint.get(endpoint) ?? [];
        if (leftGroup.length === 1 && rightGroup.length === 1) {
            const left = leftGroup[0];
            const right = rightGroup[0];
            const leftIdentity = memberIdentity(left);
            const rightIdentity = memberIdentity(right);
            matched.push({ leftKey: leftIdentity, rightKey: rightIdentity });
            matchedLeft.add(leftIdentity);
            matchedRight.add(rightIdentity);
            continue;
        }
        if (rightGroup.length > 0) {
            ambiguities.push({
                category: "member",
                leftKeys: leftGroup.map((member) => member.key),
                rightKeys: rightGroup.map((member) => member.key),
                message: "Multiple members share the same matched endpoint pair.",
            });
            for (const member of leftGroup)
                ambiguousLeft.add(memberIdentity(member));
            for (const member of rightGroup)
                ambiguousRight.add(memberIdentity(member));
        }
    }
    return {
        matched,
        unmatchedLeft: leftMembers
            .filter((member) => !matchedLeft.has(memberIdentity(member)))
            .map((member) => {
            const identity = memberIdentity(member);
            const projectedEndpoint = projectedEndpointByLeft.get(identity);
            const reason = missingNodeLeft.has(identity)
                ? "endpoint node was not matched"
                : ambiguousLeft.has(identity)
                    ? "ambiguous endpoint match"
                    : projectedEndpoint && !rightByEndpoint.has(projectedEndpoint)
                        ? "no member with matched endpoint pair"
                        : "unmatched";
            return unmatchedMember("left", member, reason);
        }),
        unmatchedRight: rightMembers
            .filter((member) => !matchedRight.has(memberIdentity(member)))
            .map((member) => unmatchedMember("right", member, ambiguousRight.has(memberIdentity(member)) ? "ambiguous endpoint match" : "no member with matched endpoint pair")),
        ambiguities,
        diagnostics: { warnings: [], errors: [] },
    };
}
