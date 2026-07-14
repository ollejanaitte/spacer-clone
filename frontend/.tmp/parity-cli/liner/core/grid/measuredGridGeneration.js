"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMeasuredGridPoints = generateMeasuredGridPoints;
exports.normalizeLocalFrame = normalizeLocalFrame;
const gridGeneration_1 = require("./gridGeneration");
const vector_1 = require("../vector");
const DEFAULT_LOCAL_FRAME = {
    tangent: { x: 1, y: 0, z: 0 },
    normal: { x: 0, y: 1, z: 0 },
    binormal: { x: 0, y: 0, z: 1 },
};
function rotate90Normal(tangent) {
    return { x: -tangent.y, y: tangent.x };
}
function inferLocalFrameFromHclNeighbors(measuredGrid, sectionId) {
    const hclLine = [...measuredGrid.lines]
        .sort((a, b) => a.sortIndex - b.sortIndex)
        .find((line) => line.label === "HCL");
    if (!hclLine) {
        return DEFAULT_LOCAL_FRAME;
    }
    const hclBySection = new Map();
    for (const point of measuredGrid.points) {
        if (point.lineId !== hclLine.id) {
            continue;
        }
        hclBySection.set(point.sectionId, {
            x: point.x,
            y: point.y,
            z: point.z,
            station: point.station,
        });
    }
    const current = hclBySection.get(sectionId);
    if (!current) {
        return DEFAULT_LOCAL_FRAME;
    }
    const orderedSections = [...measuredGrid.sections].sort((a, b) => a.sortIndex - b.sortIndex);
    const sectionIndex = orderedSections.findIndex((section) => section.id === sectionId);
    const prev = orderedSections[sectionIndex - 1];
    const next = orderedSections[sectionIndex + 1];
    const prevPoint = prev ? hclBySection.get(prev.id) : undefined;
    const nextPoint = next ? hclBySection.get(next.id) : undefined;
    let dx = 0;
    let dy = 0;
    if (prevPoint && nextPoint) {
        dx = nextPoint.x - prevPoint.x;
        dy = nextPoint.y - prevPoint.y;
    }
    else if (nextPoint) {
        dx = nextPoint.x - current.x;
        dy = nextPoint.y - current.y;
    }
    else if (prevPoint) {
        dx = current.x - prevPoint.x;
        dy = current.y - prevPoint.y;
    }
    const length = Math.hypot(dx, dy);
    if (length <= 1e-9) {
        return DEFAULT_LOCAL_FRAME;
    }
    const tangent2 = { x: dx / length, y: dy / length };
    const normal2 = rotate90Normal(tangent2);
    return {
        tangent: (0, vector_1.vec3)(tangent2.x, tangent2.y, 0),
        normal: (0, vector_1.vec3)(normal2.x, normal2.y, 0),
        binormal: (0, vector_1.vec3)(0, 0, 1),
    };
}
function resolvePointRole(label, role) {
    if (label === "HCL" || role === "center") {
        return ["edge"];
    }
    if (role === "edge") {
        return ["edge"];
    }
    if (role === "girder") {
        return ["main_girder"];
    }
    return ["main_girder"];
}
function generateMeasuredGridPoints(input) {
    const { measuredGrid, alignment } = input;
    const issues = [];
    const sectionById = new Map(measuredGrid.sections.map((section) => [section.id, section]));
    const lineById = new Map(measuredGrid.lines.map((line) => [line.id, line]));
    const localFrameBySection = new Map();
    for (const section of measuredGrid.sections) {
        localFrameBySection.set(section.id, inferLocalFrameFromHclNeighbors(measuredGrid, section.id));
    }
    const gridPoints = [];
    for (const point of measuredGrid.points) {
        const section = sectionById.get(point.sectionId);
        const line = lineById.get(point.lineId);
        if (!section || !line) {
            continue;
        }
        const localFrame = localFrameBySection.get(section.id) ?? DEFAULT_LOCAL_FRAME;
        gridPoints.push({
            id: (0, gridGeneration_1.gridPointId)(alignment.linerModelId, section.sortIndex, line.sortIndex),
            physicalDistance: point.station,
            displayedStation: point.station,
            offset: point.cumulativeWidth,
            x: point.x,
            y: point.y,
            z: point.z,
            localFrame,
            labels: {
                longitudinalIndex: section.sortIndex,
                transverseIndex: line.sortIndex,
            },
            source: {
                alignmentId: alignment.id,
                stationId: section.id,
                sectionId: section.id,
                longitudinalLineId: line.id,
                transverseLineId: section.id,
            },
            roles: resolvePointRole(line.label, line.role),
            zProvenance: {
                profileElevation: point.z,
                crossfallOffset: 0,
                structuralReferenceOffset: 0,
                sectionDepthOffset: 0,
                girderEccentricity: 0,
            },
        });
    }
    gridPoints.sort((a, b) => {
        if (a.labels.longitudinalIndex !== b.labels.longitudinalIndex) {
            return a.labels.longitudinalIndex - b.labels.longitudinalIndex;
        }
        return a.labels.transverseIndex - b.labels.transverseIndex;
    });
    return { gridPoints, issues };
}
/** Normalize a local frame tangent for orientation vectors (exported for tests). */
function normalizeLocalFrame(frame) {
    const tangent = (0, vector_1.normalize3)(frame.tangent);
    const normal = (0, vector_1.normalize3)(frame.normal);
    const binormal = (0, vector_1.normalize3)(frame.binormal);
    return { tangent, normal, binormal };
}
