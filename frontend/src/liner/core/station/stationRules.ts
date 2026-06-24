import { createIssue, LINER_DIAGNOSTIC_CODES } from "../diagnostics";
import { DEFAULT_TOLERANCES, nearlyEqual } from "../tolerances";
import type {
  GeneratedStation,
  StationDefinition,
  StationEquation,
  ValidationIssue,
} from "../types";

function padIndex(index: number): string {
  return index.toString().padStart(3, "0");
}

function sortedEquations(equations: StationEquation[]): StationEquation[] {
  return [...equations].sort((a, b) => {
    if (!nearlyEqual(a.physicalDistance, b.physicalDistance, DEFAULT_TOLERANCES.station)) {
      return a.physicalDistance - b.physicalDistance;
    }
    return (a.sortIndex ?? 0) - (b.sortIndex ?? 0);
  });
}

export function displayedStationAtPhysicalDistance(
  physicalDistance: number,
  definition: StationDefinition,
  afterBoundary = true,
): number {
  let displayed = definition.originDisplayedStation + physicalDistance;
  for (const equation of sortedEquations(definition.equations ?? [])) {
    const applies =
      physicalDistance > equation.physicalDistance ||
      (afterBoundary &&
        nearlyEqual(
          physicalDistance,
          equation.physicalDistance,
          DEFAULT_TOLERANCES.station,
        ));
    if (!applies) {
      continue;
    }
    if (equation.type === "add_constant") {
      displayed += equation.value;
    } else {
      displayed = equation.value + (physicalDistance - equation.physicalDistance);
    }
  }
  return displayed;
}

export function generateStations(
  definition: StationDefinition,
  totalLength: number,
): { stations: GeneratedStation[]; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const stationMap = new Map<string, GeneratedStation>();
  let sortIndex = 0;

  const addStation = (
    physicalDistance: number,
    source: GeneratedStation["source"],
    sourceId?: string,
    afterBoundary = true,
  ) => {
    if (
      physicalDistance < -DEFAULT_TOLERANCES.station ||
      physicalDistance > totalLength + DEFAULT_TOLERANCES.station
    ) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.stationOutOfRange, {
          physicalDistance,
          entityType: "station",
          field: "physicalDistance",
        }),
      );
      return;
    }
    const clampedDistance = Math.min(Math.max(physicalDistance, 0), totalLength);
    const key = clampedDistance.toFixed(9);
    if (stationMap.has(key)) {
      if (source === "explicit") {
        issues.push(
          createIssue("warning", LINER_DIAGNOSTIC_CODES.duplicateStationEquation, {
            physicalDistance: clampedDistance,
            entityType: "station",
            field: "physicalDistance",
          }),
        );
      }
      return;
    }
    const station: GeneratedStation = {
      id: `ST-${padIndex(sortIndex)}`,
      physicalDistance: clampedDistance,
      displayedStation: displayedStationAtPhysicalDistance(
        clampedDistance,
        definition,
        afterBoundary,
      ),
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
    if (definition.interval <= DEFAULT_TOLERANCES.length) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.gridSpacingInvalid, {
          entityType: "stationDefinition",
          field: "interval",
        }),
      );
    } else {
      for (
        let distance = definition.interval;
        distance < totalLength - DEFAULT_TOLERANCES.station;
        distance += definition.interval
      ) {
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
    if (!nearlyEqual(a.physicalDistance, b.physicalDistance, DEFAULT_TOLERANCES.station)) {
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
