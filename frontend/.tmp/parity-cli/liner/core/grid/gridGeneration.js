"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gridPointId = gridPointId;
exports.generateGridPoints = generateGridPoints;
exports.createNodeCandidates = createNodeCandidates;
exports.frameNodeIdFromGridPoint = frameNodeIdFromGridPoint;
exports.createLongitudinalMemberCandidates = createLongitudinalMemberCandidates;
const elevationAt_1 = require("../elevationAt");
const crossSectionTemplateResolution_1 = require("../crossSectionTemplateResolution");
const diagnostics_1 = require("../diagnostics");
const horizontal_1 = require("../geometry/horizontal");
const stationFormat_1 = require("../station/stationFormat");
const tolerances_1 = require("../tolerances");
const vector_1 = require("../vector");
const crossfallResolution_1 = require("./crossfallResolution");
function padIndex(index) {
    return index.toString().padStart(3, "0");
}
function resolveProfileElevation(input, physicalDistance) {
    if (input.verticalAlignment !== undefined) {
        return (0, elevationAt_1.elevationAt)(physicalDistance, input.verticalAlignment);
    }
    const fallback = input.z ?? 0;
    return Number.isFinite(fallback) ? fallback : null;
}
function verticalProfileEndStation(input) {
    if (input.verticalAlignment === undefined) {
        return 0;
    }
    let maxEnd = 0;
    for (const element of input.verticalAlignment.elements) {
        maxEnd = Math.max(maxEnd, element.endStation);
    }
    return maxEnd;
}
function isEndCoverageMiss(input, physicalDistance) {
    const profileEnd = verticalProfileEndStation(input);
    return physicalDistance > profileEnd + tolerances_1.DEFAULT_TOLERANCES.station;
}
function gridPointId(linerModelId, longitudinalIndex, transverseIndex) {
    return `GP-${linerModelId}-${padIndex(longitudinalIndex)}-${padIndex(transverseIndex)}`;
}
function generateGridPoints(input) {
    const issues = (0, crossfallResolution_1.validateCrossSlopeIntervals)(input.crossSlopeIntervals);
    const sortedStations = [...input.stations].sort((a, b) => a.physicalDistance - b.physicalDistance);
    const gridPoints = [];
    for (const [longitudinalIndex, station] of sortedStations.entries()) {
        const base = (0, horizontal_1.evaluateAlignmentAtDistance)(input.alignment, station.physicalDistance, station.displayedStation);
        const profileElevation = resolveProfileElevation(input, station.physicalDistance);
        if (profileElevation === null) {
            const endCoverageMiss = isEndCoverageMiss(input, station.physicalDistance);
            issues.push((0, diagnostics_1.createIssue)(endCoverageMiss ? "warning" : "error", endCoverageMiss
                ? diagnostics_1.LINER_DIAGNOSTIC_CODES.profileEndCoverageGap
                : diagnostics_1.LINER_DIAGNOSTIC_CODES.profileCoverageGap, {
                station: station.physicalDistance,
                entityType: "verticalAlignment",
                detail: `No vertical profile elevation at station ${(0, stationFormat_1.formatStationDisplay)(station.physicalDistance)}.`,
            }));
            continue;
        }
        const resolvedTemplate = (0, crossSectionTemplateResolution_1.resolveCrossSectionTemplateForPhysicalDistance)({
            crossSections: input.crossSections,
            gridDefinitions: input.gridDefinitions,
        }, station.physicalDistance);
        const crossfallState = (0, crossfallResolution_1.resolveCrossfallState)({
            crossSectionTemplate: resolvedTemplate,
            crossSlopeIntervals: input.crossSlopeIntervals,
        }, station.physicalDistance, station.displayedStation);
        const stationOffsetLines = resolvedTemplate?.offsetLines.length
            ? [...resolvedTemplate.offsetLines].sort((left, right) => left.offset - right.offset)
            : [...input.offsets].sort((a, b) => a - b).map((offset, index) => ({
                id: `offset-${index}`,
                offset,
                elevation: 0,
                role: index === 0 ? "edge" : "custom",
            }));
        for (const [transverseIndex, offsetLine] of stationOffsetLines.entries()) {
            const offset = offsetLine.offset;
            const planPoint = (0, vector_1.offsetPoint)(base.point, base.azimuth, offset);
            const crossfallOffset = (0, crossfallResolution_1.resolveCrossfallOffset)(crossfallState, offset);
            const templateElevation = Number.isFinite(offsetLine.elevation) ? offsetLine.elevation : 0;
            const z = profileElevation + templateElevation + crossfallOffset;
            gridPoints.push({
                id: gridPointId(input.alignment.linerModelId, longitudinalIndex, transverseIndex),
                physicalDistance: station.physicalDistance,
                displayedStation: station.displayedStation,
                offset,
                x: planPoint.x,
                y: planPoint.y,
                z,
                localFrame: base.localFrame,
                labels: {
                    longitudinalIndex,
                    transverseIndex,
                },
                source: {
                    alignmentId: input.alignment.id,
                    stationId: station.id,
                    elementId: base.elementId,
                    crossSectionTemplateId: resolvedTemplate?.id,
                },
                roles: offsetLine.role === "edge" ? ["edge"] : ["main_girder"],
                zProvenance: {
                    profileElevation,
                    crossfallOffset,
                    structuralReferenceOffset: 0,
                    sectionDepthOffset: templateElevation,
                    girderEccentricity: 0,
                },
            });
        }
    }
    return { gridPoints, issues };
}
function createNodeCandidates(gridPoints, sourceRevision, alignmentId) {
    return gridPoints.map((point) => ({
        id: frameNodeIdFromGridPoint(point.id),
        gridPointId: point.id,
        x: point.x,
        y: point.y,
        z: point.z,
        provenance: {
            alignmentId,
            elementId: point.source.elementId,
            sourceRevision,
        },
    }));
}
function frameNodeIdFromGridPoint(gridId) {
    const parts = gridId.split("-");
    return `N_LINER_${parts.slice(1).join("_")}`;
}
function createLongitudinalMemberCandidates(stations, nodes, sourceRevision, alignmentId) {
    const issues = [];
    const members = [];
    const nodesByStation = new Map();
    for (const node of nodes) {
        const parts = node.gridPointId.split("-");
        const longitudinalIndex = Number(parts.at(-2));
        const existing = nodesByStation.get(longitudinalIndex) ?? [];
        existing.push(node);
        nodesByStation.set(longitudinalIndex, existing);
    }
    for (let stationIndex = 0; stationIndex < stations.length - 1; stationIndex += 1) {
        const currentNodes = nodesByStation.get(stationIndex) ?? [];
        const nextNodes = nodesByStation.get(stationIndex + 1) ?? [];
        const pairCount = Math.min(currentNodes.length, nextNodes.length);
        for (let transverseIndex = 0; transverseIndex < pairCount; transverseIndex += 1) {
            const nodeI = currentNodes[transverseIndex];
            const nodeJ = nextNodes[transverseIndex];
            if (Math.hypot(nodeI.x - nodeJ.x, nodeI.y - nodeJ.y, nodeI.z - nodeJ.z) <=
                tolerances_1.DEFAULT_TOLERANCES.length) {
                issues.push((0, diagnostics_1.createIssue)("warning", diagnostics_1.LINER_DIAGNOSTIC_CODES.zeroLengthMember, {
                    entityType: "memberCandidate",
                    entityId: nodeI.id,
                }));
                continue;
            }
            members.push({
                id: `M_LINER_${alignmentId}_L_${padIndex(stationIndex)}_${padIndex(transverseIndex)}`,
                nodeIId: nodeI.id,
                nodeJId: nodeJ.id,
                stationIId: stations[stationIndex].id,
                stationJId: stations[stationIndex + 1].id,
                direction: "longitudinal",
                provenance: {
                    alignmentId,
                    sourceRevision,
                },
            });
        }
    }
    return { members, issues };
}
