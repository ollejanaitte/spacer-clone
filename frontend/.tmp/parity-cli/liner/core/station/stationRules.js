"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.displayedStationAtPhysicalDistance = displayedStationAtPhysicalDistance;
exports.generateStations = generateStations;
const diagnostics_1 = require("../diagnostics");
const tolerances_1 = require("../tolerances");
function padIndex(index) {
    return index.toString().padStart(3, "0");
}
function sortedEquations(equations) {
    return [...equations].sort((a, b) => {
        if (!(0, tolerances_1.nearlyEqual)(a.physicalDistance, b.physicalDistance, tolerances_1.DEFAULT_TOLERANCES.station)) {
            return a.physicalDistance - b.physicalDistance;
        }
        return (a.sortIndex ?? 0) - (b.sortIndex ?? 0);
    });
}
function displayedStationAtPhysicalDistance(physicalDistance, definition, afterBoundary = true) {
    let displayed = definition.originDisplayedStation + physicalDistance;
    for (const equation of sortedEquations(definition.equations ?? [])) {
        const applies = physicalDistance > equation.physicalDistance ||
            (afterBoundary &&
                (0, tolerances_1.nearlyEqual)(physicalDistance, equation.physicalDistance, tolerances_1.DEFAULT_TOLERANCES.station));
        if (!applies) {
            continue;
        }
        if (equation.type === "add_constant") {
            displayed += equation.value;
        }
        else {
            displayed = equation.value + (physicalDistance - equation.physicalDistance);
        }
    }
    return displayed;
}
function generateStations(definition, totalLength) {
    const issues = [];
    const stationMap = new Map();
    let sortIndex = 0;
    const addStation = (physicalDistance, source, sourceId, afterBoundary = true) => {
        if (physicalDistance < -tolerances_1.DEFAULT_TOLERANCES.station ||
            physicalDistance > totalLength + tolerances_1.DEFAULT_TOLERANCES.station) {
            issues.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.stationOutOfRange, {
                physicalDistance,
                entityType: "station",
                field: "physicalDistance",
            }));
            return;
        }
        const clampedDistance = Math.min(Math.max(physicalDistance, 0), totalLength);
        const key = clampedDistance.toFixed(9);
        if (stationMap.has(key)) {
            if (source === "explicit") {
                const duplicatesAutomaticBoundary = (0, tolerances_1.nearlyEqual)(clampedDistance, 0, tolerances_1.DEFAULT_TOLERANCES.station) ||
                    (0, tolerances_1.nearlyEqual)(clampedDistance, totalLength, tolerances_1.DEFAULT_TOLERANCES.station);
                if (!duplicatesAutomaticBoundary) {
                    issues.push((0, diagnostics_1.createIssue)("warning", diagnostics_1.LINER_DIAGNOSTIC_CODES.duplicateStationEquation, {
                        physicalDistance: clampedDistance,
                        entityType: "station",
                        field: "physicalDistance",
                    }));
                }
            }
            return;
        }
        const station = {
            id: `ST-${padIndex(sortIndex)}`,
            physicalDistance: clampedDistance,
            displayedStation: displayedStationAtPhysicalDistance(clampedDistance, definition, afterBoundary),
            source,
            sourceId,
            sortIndex,
        };
        sortIndex += 1;
        stationMap.set(key, station);
    };
    addStation(0, "start", undefined, false);
    addStation(totalLength, "end");
    if (definition.interval != null) {
        if (definition.interval <= tolerances_1.DEFAULT_TOLERANCES.length) {
            issues.push((0, diagnostics_1.createIssue)("error", diagnostics_1.LINER_DIAGNOSTIC_CODES.gridSpacingInvalid, {
                entityType: "stationDefinition",
                field: "interval",
            }));
        }
        else {
            for (let distance = definition.interval; distance < totalLength - tolerances_1.DEFAULT_TOLERANCES.station; distance += definition.interval) {
                addStation(distance, "interval");
            }
        }
    }
    for (const explicitStation of definition.explicitStations ?? []) {
        addStation(explicitStation, "explicit");
    }
    for (const equation of definition.equations ?? []) {
        addStation(equation.physicalDistance, "equation", equation.id, true);
    }
    const stations = [...stationMap.values()].sort((a, b) => {
        if (!(0, tolerances_1.nearlyEqual)(a.physicalDistance, b.physicalDistance, tolerances_1.DEFAULT_TOLERANCES.station)) {
            return a.physicalDistance - b.physicalDistance;
        }
        return a.sortIndex - b.sortIndex;
    });
    return {
        stations: stations.map((station, index) => ({
            ...station,
            id: `ST-${padIndex(index)}`,
            sortIndex: index,
        })),
        issues,
    };
}
