"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapToFrameModel = mapToFrameModel;
const diagnostics_1 = require("../core/diagnostics");
const tolerances_1 = require("../core/tolerances");
const frameIds_1 = require("./frameIds");
function nodeIdForPoint(linerModelId, point) {
    return (0, frameIds_1.frameNodeId)(linerModelId, point.labels.longitudinalIndex, point.labels.transverseIndex);
}
function traceBase(intermediate) {
    return {
        linerModelId: intermediate.linerModelId,
        coordinatePolicyId: intermediate.coordinatePolicyId,
        sourceRevision: intermediate.sourceRevision,
    };
}
function mostSpecificRule(rules, direction, pointI, pointJ, line) {
    const pointRoles = new Set([...pointI.roles, ...pointJ.roles, line.role]);
    return rules
        .filter((rule) => {
        const match = rule.match;
        if (match.direction && match.direction !== direction)
            return false;
        if (match.transverseIndex !== undefined && match.transverseIndex !== pointI.labels.transverseIndex) {
            return false;
        }
        if (match.spanId && match.spanId !== line.spanId && match.spanId !== pointI.source.spanId && match.spanId !== pointJ.source.spanId) {
            return false;
        }
        if (match.role && !pointRoles.has(match.role))
            return false;
        return true;
    })
        .sort((a, b) => specificityScore(b) - specificityScore(a))[0];
}
function specificityScore(rule) {
    return [
        rule.match.spanId,
        rule.match.role,
        rule.match.direction,
        rule.match.transverseIndex,
    ].filter((value) => value !== undefined).length;
}
function resolveMemberGroup(intermediate, options, line, pointI, pointJ) {
    const rule = mostSpecificRule(intermediate.frameHints.memberGroupRules, line.direction, pointI, pointJ, line) ??
        intermediate.frameHints.memberGroupRules.find((candidate) => candidate.key === intermediate.frameHints.defaultMemberGroupKey);
    return {
        key: rule?.key ?? pointI.memberGroupKey ?? pointJ.memberGroupKey ?? intermediate.frameHints.defaultMemberGroupKey,
        materialId: rule?.materialId ?? options.defaultMaterialId,
        sectionId: rule?.sectionId ?? options.defaultSectionId,
    };
}
function validateMemberSection(diagnostics, memberId, resolved, options) {
    const materialSet = options.materialIds ? new Set(options.materialIds) : undefined;
    const sectionSet = options.sectionIds ? new Set(options.sectionIds) : undefined;
    const materialMissing = materialSet && (!resolved.materialId || !materialSet.has(resolved.materialId));
    const sectionMissing = sectionSet && (!resolved.sectionId || !sectionSet.has(resolved.sectionId));
    if (materialMissing || sectionMissing) {
        diagnostics.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.missingFrameSection, {
            entityType: "member",
            entityId: memberId,
            detail: `Missing material or section for member group ${resolved.key}`,
        }));
    }
}
function shouldMapLine(intermediate, line) {
    const mode = intermediate.frameHints.connectivityMode;
    if (mode === "grid_full")
        return true;
    if (mode === "longitudinal_only")
        return line.direction === "longitudinal";
    return line.direction === "transverse";
}
function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function findPierIdForPoint(intermediate, point) {
    return point.source.pierId ?? intermediate.piers.find((pier) => pier.supportLinePointIds.includes(point.id))?.id;
}
function supportCandidatePoints(intermediate, template, diagnostics) {
    const pointById = new Map(intermediate.grid.points.map((point) => [point.id, point]));
    const pier = template.pierId
        ? intermediate.piers.find((candidate) => candidate.id === template.pierId)
        : intermediate.piers.find((candidate) => candidate.physicalDistance === template.physicalDistance);
    const candidates = [];
    if (pier) {
        for (const pointId of pier.supportLinePointIds) {
            const point = pointById.get(pointId);
            if (point) {
                candidates.push(point);
            }
            else {
                diagnostics.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.missingFrameNode, {
                    entityType: "pier",
                    entityId: pier.id,
                    detail: `Missing support line grid point ${pointId}`,
                }));
            }
        }
    }
    else {
        candidates.push(...intermediate.grid.points.filter((point) => point.physicalDistance === template.physicalDistance));
    }
    return candidates.filter((point) => template.nodeRoles.length === 0 || point.roles.some((role) => template.nodeRoles.includes(role)));
}
function addConnectivityDiagnostics(nodes, members, diagnostics) {
    if (nodes.length === 0 || members.length === 0)
        return;
    const adjacency = new Map(nodes.map((node) => [node.id, new Set()]));
    for (const member of members) {
        adjacency.get(member.nodeI)?.add(member.nodeJ);
        adjacency.get(member.nodeJ)?.add(member.nodeI);
    }
    const first = nodes[0]?.id;
    if (!first)
        return;
    const visited = new Set([first]);
    const queue = [first];
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current)
            continue;
        for (const next of adjacency.get(current) ?? []) {
            if (!visited.has(next)) {
                visited.add(next);
                queue.push(next);
            }
        }
    }
    if (visited.size !== nodes.length) {
        diagnostics.push((0, diagnostics_1.createIssue)("warning", diagnostics_1.LINER_DIAGNOSTIC_CODES.disconnectedFrame, {
            entityType: "frameMapping",
            detail: `Connected ${visited.size} of ${nodes.length} nodes`,
        }));
    }
}
function mapToFrameModel(intermediate, options = {}) {
    const diagnostics = [];
    const linerTrace = [];
    const lengthTolerance = options.lengthTolerance ?? tolerances_1.DEFAULT_TOLERANCES.length;
    const base = traceBase(intermediate);
    const nodeIdByGridPointId = new Map();
    const pointById = new Map(intermediate.grid.points.map((point) => [point.id, point]));
    const seenNodeIds = new Set();
    const nodes = intermediate.grid.points.map((point) => {
        const id = nodeIdForPoint(intermediate.linerModelId, point);
        if (seenNodeIds.has(id)) {
            diagnostics.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.duplicateFrameId, {
                entityType: "node",
                entityId: id,
                detail: `Duplicate node id generated from grid point ${point.id}`,
            }));
        }
        seenNodeIds.add(id);
        nodeIdByGridPointId.set(point.id, id);
        linerTrace.push({
            ...base,
            frameEntityId: id,
            frameEntityType: "node",
            gridPointId: point.id,
            sectionId: point.source.sectionId,
            longitudinalLineId: point.source.longitudinalLineId,
            physicalDistance: point.physicalDistance,
            displayedStation: point.displayedStation,
            offset: point.offset,
            spanId: point.source.spanId,
            pierId: findPierIdForPoint(intermediate, point),
            role: point.roles[0],
            memberGroupKey: point.memberGroupKey,
        });
        return {
            id,
            x: point.x,
            y: point.y,
            z: point.z,
            label: `L${point.labels.longitudinalIndex}T${point.labels.transverseIndex}`,
        };
    });
    const members = [];
    const seenMemberIds = new Set();
    for (const line of intermediate.grid.lines.filter((candidate) => shouldMapLine(intermediate, candidate))) {
        for (let index = 0; index < line.pointIds.length - 1; index += 1) {
            const pointI = pointById.get(line.pointIds[index]);
            const pointJ = pointById.get(line.pointIds[index + 1]);
            if (!pointI || !pointJ) {
                diagnostics.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.missingFrameNode, {
                    entityType: "gridLine",
                    entityId: line.id,
                    detail: `Missing grid point reference in ${line.id}`,
                }));
                continue;
            }
            const directionCode = line.direction === "longitudinal" ? "L" : "T";
            const id = (0, frameIds_1.frameMemberId)(intermediate.linerModelId, directionCode, pointI.labels.longitudinalIndex, pointI.labels.transverseIndex);
            if (seenMemberIds.has(id)) {
                diagnostics.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.duplicateFrameId, {
                    entityType: "member",
                    entityId: id,
                }));
                continue;
            }
            seenMemberIds.add(id);
            if (distance(pointI, pointJ) <= lengthTolerance) {
                diagnostics.push((0, diagnostics_1.createIssue)("warning", diagnostics_1.LINER_DIAGNOSTIC_CODES.zeroLengthMember, {
                    entityType: "member",
                    entityId: id,
                    physicalDistance: pointI.physicalDistance,
                    station: pointI.displayedStation,
                }));
                continue;
            }
            const nodeI = nodeIdByGridPointId.get(pointI.id);
            const nodeJ = nodeIdByGridPointId.get(pointJ.id);
            if (!nodeI || !nodeJ) {
                diagnostics.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.missingFrameNode, {
                    entityType: "member",
                    entityId: id,
                }));
                continue;
            }
            const resolved = resolveMemberGroup(intermediate, options, line, pointI, pointJ);
            validateMemberSection(diagnostics, id, resolved, options);
            members.push({
                id,
                nodeI,
                nodeJ,
                direction: line.direction,
                memberGroupKey: resolved.key,
                materialId: resolved.materialId,
                sectionId: resolved.sectionId,
                orientationVector: { x: 0, y: 0, z: 1 },
            });
            const sharedLongitudinalLineId = line.direction === "longitudinal" &&
                pointI.source.longitudinalLineId !== undefined &&
                pointI.source.longitudinalLineId === pointJ.source.longitudinalLineId
                ? pointI.source.longitudinalLineId
                : undefined;
            const sharedSectionId = line.direction === "transverse" &&
                pointI.source.sectionId !== undefined &&
                pointI.source.sectionId === pointJ.source.sectionId
                ? pointI.source.sectionId
                : undefined;
            linerTrace.push({
                ...base,
                frameEntityId: id,
                frameEntityType: "member",
                gridLineId: line.id,
                gridPointIds: [pointI.id, pointJ.id],
                sectionId: sharedSectionId,
                longitudinalLineId: sharedLongitudinalLineId,
                physicalDistance: pointI.physicalDistance,
                displayedStation: pointI.displayedStation,
                offset: pointI.offset,
                spanId: line.spanId ?? pointI.source.spanId,
                pierId: line.pierId ?? pointI.source.pierId,
                role: line.role,
                memberDirection: line.direction,
                memberGroupKey: resolved.key,
            });
        }
    }
    const supports = [];
    const seenSupportIds = new Set();
    for (const template of intermediate.frameHints.supportTemplates) {
        const candidates = supportCandidatePoints(intermediate, template, diagnostics);
        if (candidates.length === 0) {
            diagnostics.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.missingFrameNode, {
                entityType: "supportTemplate",
                entityId: template.templateId,
            }));
            continue;
        }
        for (const point of candidates) {
            const nodeId = nodeIdByGridPointId.get(point.id);
            if (!nodeId) {
                diagnostics.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.missingFrameNode, {
                    entityType: "supportTemplate",
                    entityId: template.templateId,
                    detail: `Missing mapped node for grid point ${point.id}`,
                }));
                continue;
            }
            const id = (0, frameIds_1.frameSupportId)(intermediate.linerModelId, template.templateId, nodeId);
            if (seenSupportIds.has(id)) {
                diagnostics.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.duplicateFrameId, {
                    entityType: "support",
                    entityId: id,
                }));
                continue;
            }
            seenSupportIds.add(id);
            supports.push({
                id,
                nodeId,
                ...template.dof,
                coordinateSystem: template.coordinateSystem,
                templateId: template.templateId,
            });
            linerTrace.push({
                ...base,
                frameEntityId: id,
                frameEntityType: "support",
                gridPointId: point.id,
                physicalDistance: point.physicalDistance,
                displayedStation: point.displayedStation,
                offset: point.offset,
                spanId: point.source.spanId,
                pierId: template.pierId ?? point.source.pierId ?? findPierIdForPoint(intermediate, point),
                role: point.roles[0],
                supportTemplateId: template.templateId,
            });
        }
    }
    addConnectivityDiagnostics(nodes, members, diagnostics);
    return {
        nodes,
        members,
        supports,
        linerTrace,
        diagnostics,
    };
}
