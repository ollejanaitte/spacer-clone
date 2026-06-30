import type {
  VerticalAlignmentDraft,
  VerticalElementDraft,
} from "../schema/types";
import {
  SAMPLING_INTERVAL_DISPLAY,
  SAMPLING_INTERVAL_DXF,
  SAMPLING_INTERVAL_FRAME,
} from "./sampling";

const STATION_EPSILON = 1e-9;

export type VerticalSamplePoint = {
  station: number;
  elevation: number;
  grade: number;
  sourceElementId: string;
};

function displayStartElevation(value: number | undefined): number {
  return value ?? 0;
}

function evaluateVerticalElementAtStation(
  element: VerticalElementDraft,
  station: number,
): { elevation: number; grade: number } {
  const u = Math.min(
    Math.max(station - element.startStation, 0),
    element.length,
  );

  if (element.type === "grade") {
    return {
      elevation: element.startElevation + element.grade * u,
      grade: element.grade,
    };
  }

  const startElevation = displayStartElevation(element.startElevation);
  const length = element.length;
  const rate = length === 0 ? 0 : (element.endGrade - element.startGrade) / length;

  return {
    elevation: startElevation + element.startGrade * u + 0.5 * rate * u * u,
    grade: element.startGrade + rate * u,
  };
}

function toSamplePoint(
  element: VerticalElementDraft,
  station: number,
): VerticalSamplePoint {
  const { elevation, grade } = evaluateVerticalElementAtStation(element, station);
  return {
    station,
    elevation,
    grade,
    sourceElementId: element.id,
  };
}

function sameStation(left: number, right: number): boolean {
  return Math.abs(left - right) <= STATION_EPSILON;
}

function sampleElementAtInterval(
  element: VerticalElementDraft,
  interval: number,
  points: VerticalSamplePoint[],
): void {
  const { startStation, endStation } = element;

  if (sameStation(startStation, endStation)) {
    if (points.length === 0 || !sameStation(points[points.length - 1]!.station, startStation)) {
      points.push(toSamplePoint(element, startStation));
    }
    return;
  }

  let station = startStation;
  if (points.length > 0 && sameStation(points[points.length - 1]!.station, station)) {
    station += interval;
  }

  for (; station < endStation - STATION_EPSILON; station += interval) {
    points.push(toSamplePoint(element, station));
  }

  if (points.length === 0 || !sameStation(points[points.length - 1]!.station, endStation)) {
    points.push(toSamplePoint(element, endStation));
  }
}

export function sampleVerticalAlignmentAtInterval(
  verticalAlignment: VerticalAlignmentDraft,
  interval: number,
): VerticalSamplePoint[] {
  if (!Number.isFinite(interval) || interval <= 0) {
    return [];
  }

  const points: VerticalSamplePoint[] = [];

  for (const element of verticalAlignment.elements) {
    sampleElementAtInterval(element, interval, points);
  }

  return points;
}

export function sampleVerticalDisplay(
  verticalAlignment: VerticalAlignmentDraft,
): VerticalSamplePoint[] {
  return sampleVerticalAlignmentAtInterval(verticalAlignment, SAMPLING_INTERVAL_DISPLAY);
}

export function sampleVerticalDxf(
  verticalAlignment: VerticalAlignmentDraft,
): VerticalSamplePoint[] {
  return sampleVerticalAlignmentAtInterval(verticalAlignment, SAMPLING_INTERVAL_DXF);
}

export function sampleVerticalFrame(
  verticalAlignment: VerticalAlignmentDraft,
): VerticalSamplePoint[] {
  return sampleVerticalAlignmentAtInterval(verticalAlignment, SAMPLING_INTERVAL_FRAME);
}
