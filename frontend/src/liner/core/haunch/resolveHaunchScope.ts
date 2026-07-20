import type { HaunchDefinitionDraft } from "../../schema/types";
import type { ComputationDiagnostic, StationTableEntry } from "../types";
import { DEFAULT_TOLERANCES } from "../tolerances";
import {
  createHaunchDiagnostic,
  LINER_HAUNCH_DIAGNOSTIC_CODES,
} from "./diagnostics";

export interface HaunchScopeInterval {
  fromM: number;
  toM: number;
}

export interface HaunchScopeState {
  /** null = unrestricted (full alignment extent). */
  activeInterval: HaunchScopeInterval | null;
}

export interface ResolvedHaunchScope {
  /** Whether a station is within the active scope at a given definition index. */
  isStationInScope(station: number, definitionIndex: number): boolean;
  scopeDiagnostics: ComputationDiagnostic[];
}

function stationWithinInterval(station: number, interval: HaunchScopeInterval): boolean {
  return (
    station >= interval.fromM - DEFAULT_TOLERANCES.station
    && station <= interval.toM + DEFAULT_TOLERANCES.station
  );
}

function intervalsOverlap(left: HaunchScopeInterval, right: HaunchScopeInterval): boolean {
  return left.fromM <= right.toM + DEFAULT_TOLERANCES.station
    && right.fromM <= left.toM + DEFAULT_TOLERANCES.station;
}

function resolveRangeBounds(definition: HaunchDefinitionDraft): HaunchScopeInterval {
  return {
    fromM: definition.stationRange.fromM,
    toM: definition.stationRange.toM,
  };
}

export function buildHaunchScopeResolver(
  definitions: readonly HaunchDefinitionDraft[],
  stationEntries: readonly StationTableEntry[],
): ResolvedHaunchScope {
  const scopeDiagnostics: ComputationDiagnostic[] = [];
  const scopeHistory: (HaunchScopeInterval | null)[] = [];
  let activeInterval: HaunchScopeInterval | null = null;
  let previousRangeInterval: HaunchScopeInterval | null = null;

  for (const definition of definitions) {
    if (definition.family === "range" && definition.variant === "section_range_modifier") {
      const bounds = resolveRangeBounds(definition);
      if (bounds.fromM > bounds.toM) {
        scopeDiagnostics.push(
          createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.rangeInvalid, {
            entityId: definition.id,
            entityPath: "stationRange",
          }),
        );
      } else if (
        previousRangeInterval
        && intervalsOverlap(previousRangeInterval, bounds)
        && (
          Math.abs(previousRangeInterval.fromM - bounds.fromM) > DEFAULT_TOLERANCES.station
          || Math.abs(previousRangeInterval.toM - bounds.toM) > DEFAULT_TOLERANCES.station
        )
      ) {
        scopeDiagnostics.push(
          createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.overlappingRange, {
            entityId: definition.id,
          }),
        );
      }
      activeInterval = bounds;
      previousRangeInterval = bounds;
    }
    scopeHistory.push(activeInterval);
  }

  const alignmentMin = stationEntries.length > 0
    ? Math.min(...stationEntries.map((entry) => entry.physicalDistance))
    : 0;
  const alignmentMax = stationEntries.length > 0
    ? Math.max(...stationEntries.map((entry) => entry.physicalDistance))
    : 0;

  return {
    scopeDiagnostics,
    isStationInScope(station: number, definitionIndex: number): boolean {
      const interval = scopeHistory[definitionIndex] ?? null;
      if (!interval) {
        return (
          station >= alignmentMin - DEFAULT_TOLERANCES.station
          && station <= alignmentMax + DEFAULT_TOLERANCES.station
        );
      }
      return stationWithinInterval(station, interval);
    },
  };
}

export function filterStationsForDefinition(
  definition: HaunchDefinitionDraft,
  stationEntries: readonly StationTableEntry[],
  isStationInScope: (station: number) => boolean,
): StationTableEntry[] {
  return stationEntries.filter((entry) => {
    if (!isStationInScope(entry.physicalDistance)) {
      return false;
    }
    return (
      entry.physicalDistance >= definition.stationRange.fromM - DEFAULT_TOLERANCES.station
      && entry.physicalDistance <= definition.stationRange.toM + DEFAULT_TOLERANCES.station
    );
  });
}
