import {
  evaluateAlignmentAtDistance,
  totalAlignmentLength,
} from "./geometry/horizontal";
import { displayedStationAtPhysicalDistance } from "./station/stationRules";
import type {
  AlignmentEvaluation,
  AlignmentSamplePoint,
  LinearAlignment,
  StationDefinition,
} from "./types";

export const SAMPLING_INTERVAL_DISPLAY = 0.5;
export const SAMPLING_INTERVAL_DXF = 0.1;
export const SAMPLING_INTERVAL_FRAME = 0.25;

function toSamplePoint(evaluation: AlignmentEvaluation): AlignmentSamplePoint {
  return {
    physicalDistance: evaluation.physicalDistance,
    displayedStation: evaluation.displayedStation,
    x: evaluation.point.x,
    y: evaluation.point.y,
    azimuth: evaluation.azimuth,
    curvature: evaluation.curvature,
    segmentId: evaluation.elementId,
    localFrame: evaluation.localFrame,
  };
}

function sampleAlignmentAtInterval(
  alignment: LinearAlignment,
  stationDefinition: StationDefinition,
  interval: number,
): AlignmentSamplePoint[] {
  const totalLength = totalAlignmentLength(alignment);
  if (totalLength === 0) {
    return [];
  }

  const points: AlignmentSamplePoint[] = [];
  for (let distance = 0; distance < totalLength; distance += interval) {
    points.push(
      toSamplePoint(
        evaluateAlignmentAtDistance(
          alignment,
          distance,
          displayedStationAtPhysicalDistance(distance, stationDefinition, distance > 0),
        ),
      ),
    );
  }
  points.push(
    toSamplePoint(
      evaluateAlignmentAtDistance(
        alignment,
        totalLength,
        displayedStationAtPhysicalDistance(totalLength, stationDefinition),
      ),
    ),
  );
  return points;
}

export function sampleDisplay(
  alignment: LinearAlignment,
  stationDefinition: StationDefinition,
): AlignmentSamplePoint[] {
  return sampleAlignmentAtInterval(alignment, stationDefinition, SAMPLING_INTERVAL_DISPLAY);
}

export function sampleDxf(
  alignment: LinearAlignment,
  stationDefinition: StationDefinition,
): AlignmentSamplePoint[] {
  return sampleAlignmentAtInterval(alignment, stationDefinition, SAMPLING_INTERVAL_DXF);
}

export function sampleFrame(
  alignment: LinearAlignment,
  stationDefinition: StationDefinition,
): AlignmentSamplePoint[] {
  return sampleAlignmentAtInterval(alignment, stationDefinition, SAMPLING_INTERVAL_FRAME);
}
