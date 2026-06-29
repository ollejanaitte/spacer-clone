import { evaluateCircularArcElement } from "./geometry/arc";
import { evaluateClothoidElement } from "./geometry/clothoid";
import { evaluateElementAtDistance } from "./geometry/horizontal";
import { evaluateStraightElement } from "./geometry/line";
import { SAMPLING_INTERVAL_FRAME } from "./sampling";
import { displayedStationAtPhysicalDistance } from "./station/stationRules";
import type {
  AlignmentElement,
  CircularArcElement,
  ClothoidElement,
  LinearAlignment,
  LocalFrame,
  StationDefinition,
  StraightElement,
  Vec2,
} from "./types";
import { distance2, dot2, localFrameFromAzimuth } from "./vector";

export type StationProjection = {
  physicalDistance: number;
  displayedStation: number;
  offset: number;
  distance: number;
  elementId: string;
  localDistance: number;
  localFrame: LocalFrame;
};

const DEFAULT_STATION_DEFINITION: StationDefinition = {
  originDisplayedStation: 0,
};

const CLOTHOID_REFINE_ITERATIONS = 8;

function offsetFromPoint(
  point: Vec2,
  alignmentPoint: Vec2,
  localFrame: LocalFrame,
): number {
  return dot2(
    { x: point.x - alignmentPoint.x, y: point.y - alignmentPoint.y },
    { x: localFrame.normal.x, y: localFrame.normal.y },
  );
}

function buildProjection(
  point: Vec2,
  element: AlignmentElement,
  elementStartPhysicalDistance: number,
  localDistance: number,
  distance: number,
  stationDefinition: StationDefinition,
): StationProjection {
  const evaluation = evaluateElementAtDistance(element, localDistance);
  const localFrame = localFrameFromAzimuth(evaluation.azimuth);
  const physicalDistance = elementStartPhysicalDistance + evaluation.localDistance;

  return {
    physicalDistance,
    displayedStation: displayedStationAtPhysicalDistance(
      physicalDistance,
      stationDefinition,
      physicalDistance > 0,
    ),
    offset: offsetFromPoint(point, evaluation.point, localFrame),
    distance,
    elementId: element.id,
    localDistance: evaluation.localDistance,
    localFrame,
  };
}

function projectOntoStraight(
  element: StraightElement,
  point: Vec2,
): { localDistance: number; distance: number } {
  const tangentX = Math.cos(element.azimuth);
  const tangentY = Math.sin(element.azimuth);
  const projected =
    (point.x - element.start.x) * tangentX + (point.y - element.start.y) * tangentY;
  const localDistance = Math.min(Math.max(projected, 0), element.length);
  const evaluation = evaluateStraightElement(element, localDistance);

  return {
    localDistance,
    distance: distance2(point, evaluation.point),
  };
}

function clampAngleToArc(startAngle: number, sweep: number, angle: number): number {
  const endAngle = startAngle + sweep;

  if (sweep >= 0) {
    let relative = angle - startAngle;
    while (relative < 0) {
      relative += Math.PI * 2;
    }
    while (relative >= Math.PI * 2) {
      relative -= Math.PI * 2;
    }
    if (relative <= sweep) {
      return startAngle + relative;
    }
    const distanceToEnd = relative - sweep;
    const distanceToStart = relative > Math.PI ? Math.PI * 2 - relative : relative;
    return distanceToEnd <= distanceToStart ? endAngle : startAngle;
  }

  let relative = angle - startAngle;
  while (relative > 0) {
    relative -= Math.PI * 2;
  }
  while (relative <= -Math.PI * 2) {
    relative += Math.PI * 2;
  }
  if (relative >= sweep) {
    return startAngle + relative;
  }
  const distanceToEnd = sweep - relative;
  const distanceToStart = relative < -Math.PI ? Math.PI * 2 + relative : -relative;
  return distanceToEnd <= distanceToStart ? endAngle : startAngle;
}

function projectOntoCircularArc(
  element: CircularArcElement,
  point: Vec2,
): { localDistance: number; distance: number } {
  const sign = element.turn === "left" ? 1 : -1;
  const radius = element.radius;
  const centerX = element.start.x - sign * radius * Math.sin(element.azimuth);
  const centerY = element.start.y + sign * radius * Math.cos(element.azimuth);

  const startEvaluation = evaluateCircularArcElement(element, 0);
  const startAngle = Math.atan2(
    startEvaluation.point.y - centerY,
    startEvaluation.point.x - centerX,
  );
  const sweep = (sign * element.length) / radius;
  const queryAngle = Math.atan2(point.y - centerY, point.x - centerX);
  const closestAngle = clampAngleToArc(startAngle, sweep, queryAngle);

  let angleDelta = closestAngle - startAngle;
  if (sign > 0) {
    while (angleDelta < 0) {
      angleDelta += Math.PI * 2;
    }
  } else {
    while (angleDelta > 0) {
      angleDelta -= Math.PI * 2;
    }
  }

  const localDistance = Math.min(
    Math.max(Math.abs(angleDelta) * radius, 0),
    element.length,
  );
  const evaluation = evaluateCircularArcElement(element, localDistance);

  return {
    localDistance,
    distance: distance2(point, evaluation.point),
  };
}

function distanceToClothoid(element: ClothoidElement, localDistance: number, point: Vec2): number {
  return distance2(point, evaluateClothoidElement(element, localDistance).point);
}

function projectOntoClothoid(
  element: ClothoidElement,
  point: Vec2,
): { localDistance: number; distance: number } {
  const step = SAMPLING_INTERVAL_FRAME;
  let bestLocalDistance = 0;
  let bestDistance = distanceToClothoid(element, 0, point);

  for (let localDistance = step; localDistance < element.length; localDistance += step) {
    const distance = distanceToClothoid(element, localDistance, point);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestLocalDistance = localDistance;
    }
  }

  const endDistance = distanceToClothoid(element, element.length, point);
  if (endDistance < bestDistance) {
    bestDistance = endDistance;
    bestLocalDistance = element.length;
  }

  let lower = Math.max(0, bestLocalDistance - step);
  let upper = Math.min(element.length, bestLocalDistance + step);

  for (let iteration = 0; iteration < CLOTHOID_REFINE_ITERATIONS; iteration += 1) {
    const midLower = lower + (upper - lower) / 3;
    const midUpper = upper - (upper - lower) / 3;
    const lowerDistance = distanceToClothoid(element, midLower, point);
    const upperDistance = distanceToClothoid(element, midUpper, point);

    if (lowerDistance < upperDistance) {
      upper = midUpper;
    } else {
      lower = midLower;
    }
  }

  const localDistance = (lower + upper) / 2;
  return {
    localDistance,
    distance: distanceToClothoid(element, localDistance, point),
  };
}

function projectElement(
  element: AlignmentElement,
  point: Vec2,
  elementStartPhysicalDistance: number,
  stationDefinition: StationDefinition,
): StationProjection {
  let projection: { localDistance: number; distance: number };

  if (element.type === "straight") {
    projection = projectOntoStraight(element, point);
  } else if (element.type === "arc") {
    projection = projectOntoCircularArc(element, point);
  } else {
    projection = projectOntoClothoid(element, point);
  }

  return buildProjection(
    point,
    element,
    elementStartPhysicalDistance,
    projection.localDistance,
    projection.distance,
    stationDefinition,
  );
}

export function stationAtPoint(
  point: Vec2,
  alignment: LinearAlignment,
  stationDefinition?: StationDefinition,
): StationProjection | null {
  if (alignment.elements.length === 0) {
    return null;
  }

  const definition = stationDefinition ?? DEFAULT_STATION_DEFINITION;
  let best: StationProjection | null = null;
  let elementStartPhysicalDistance = 0;

  for (const element of alignment.elements) {
    const candidate = projectElement(
      element,
      point,
      elementStartPhysicalDistance,
      definition,
    );
    if (best === null || candidate.distance < best.distance) {
      best = candidate;
    }
    elementStartPhysicalDistance += element.length;
  }

  return best;
}
