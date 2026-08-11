import {
  displayedStationAtPhysicalDistance,
  generateStations,
} from "../../../liner/core/station/stationRules";
import {
  formatStationDisplay,
  formatStationNoPlus,
  parseStationInput,
} from "../../../liner/core/station/stationFormat";
import { stationAtPoint } from "../../../liner/core/stationAtPoint";
import { evaluateAlignmentAtDistance } from "../../../liner/core/geometry/horizontal";
import type {
  GeneratedStation,
  LinearAlignment,
  StationDefinition,
  StationEquation,
  StationTableResult,
  ValidationIssue,
  Vec2,
} from "../../../liner/core/types";

/**
 * Phase 2-03: Stationing and coordinate evaluation.
 * Reuses the proven LINER station/format/at-point logic (KEEP/ADAPT).
 */
export {
  displayedStationAtPhysicalDistance,
  generateStations,
  formatStationDisplay,
  formatStationNoPlus,
  parseStationInput,
  stationAtPoint,
};

export type {
  GeneratedStation,
  StationDefinition,
  StationEquation,
  StationTableResult,
  ValidationIssue,
};

export interface RoadStationing {
  readonly ok: boolean;
  readonly issues: readonly ValidationIssue[];
  readonly stations: readonly GeneratedStation[];
}

export function createRoadStationing(
  definition: StationDefinition,
  totalLength: number,
): RoadStationing {
  const { stations, issues } = generateStations(definition, totalLength);
  return { ok: issues.length === 0, issues, stations };
}

export interface RoadPointAtStation {
  readonly physicalDistance: number;
  readonly displayedStation: number;
  readonly display: string;
  readonly point: Vec2;
  readonly azimuth: number;
  readonly curvature: number;
}

export function evaluatePointAtStation(
  alignment: LinearAlignment,
  stationDefinition: StationDefinition | undefined,
  physicalDistance: number,
): RoadPointAtStation {
  const evaluation = evaluateAlignmentAtDistance(alignment, physicalDistance);
  const displayed = displayedStationAtPhysicalDistance(physicalDistance, stationDefinition ?? DEFAULT_DEFINITION);
  return {
    physicalDistance: evaluation.physicalDistance,
    displayedStation: displayed,
    display: formatStationDisplay(displayed),
    point: evaluation.point,
    azimuth: evaluation.azimuth,
    curvature: evaluation.curvature,
  };
}

const DEFAULT_DEFINITION: StationDefinition = {
  originDisplayedStation: 0,
  equations: [],
};

export function createDefaultStationDefinition(): StationDefinition {
  return { originDisplayedStation: 0, equations: [] };
}
