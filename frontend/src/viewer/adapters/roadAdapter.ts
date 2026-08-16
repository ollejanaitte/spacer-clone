/**
 * Lane V-4 — Real Road Adapter (Alignment + vertical profile -> RoadLayerData).
 *
 * Maps Lane S's real road alignment (RB001-ROAD-1, EPSG:6674) into the
 * viewer's RoadLayerData in the shared canonical frame. Centerline points are
 * sampled from the horizontal alignment via the Liner core geometry engine
 * (evaluateAlignmentAtDistance), elevations come from the vertical profile
 * (evaluateVerticalElement), and the carriageway width is taken from the
 * cross-section offsets. No CRS conversion is re-implemented here: the
 * alignment is already in canonical EPSG:6674 survey coordinates
 * (x=easting/along, y=northing/transverse, z=elevation).
 */

import type { VerticalElement } from "../../liner/core/geometry/vertical";
import { evaluateVerticalElement } from "../../liner/core/geometry/vertical";
import { evaluateAlignmentAtDistance } from "../../liner/core/geometry/horizontal";
import type { Rb001RoadSample } from "../../liner/samples/reference-business-001/roadAlignment";
import type { Point3D, RoadLayerData } from "../layers/layerContract";

export interface RoadAlignmentToLayerOptions {
  /** Centerline sampling interval (m). Defaults to 10. */
  readonly stepM?: number;
  /** Carriageway full width (m). Defaults to 9.0 (RB001 cross-section). */
  readonly width?: number;
  readonly halfWidth?: { readonly left: number; readonly right: number };
  readonly surfaceColor?: string;
  /** Align sampling station range to the bridge candidate when provided. */
  readonly bridgeCandidate?: { readonly startStation: number; readonly endStation: number } | null;
}

/** RB001 full carriageway width from the cross-section (L-shoulder -4.5 .. R-shoulder +4.5). */
export const RB001_ROAD_WIDTH = 9.0;

/** Elevation at a physical distance along a vertical profile (RB001 vertical elements). */
export function elevationAt(
  physicalDistance: number,
  vertical: readonly VerticalElement[],
): number {
  for (const element of vertical) {
    const end = element.startPhysicalDistance + element.length;
    if (physicalDistance >= element.startPhysicalDistance && physicalDistance <= end) {
      return evaluateVerticalElement(element, physicalDistance).elevation;
    }
  }
  // Outside profile coverage: extrapolate from the first/last element.
  if (vertical.length === 0) return 0;
  const first = vertical[0];
  const last = vertical[vertical.length - 1];
  if (physicalDistance < first.startPhysicalDistance) {
    return evaluateVerticalElement(first, first.startPhysicalDistance).elevation;
  }
  return evaluateVerticalElement(last, last.startPhysicalDistance + last.length).elevation;
}

export interface SampledAlignment {
  readonly points: readonly Point3D[];
  readonly length: number;
}

/**
 * Sample a real alignment into canonical centerline points. Each point carries
 * x/y from the horizontal engine and z from the vertical profile.
 */
export function sampleAlignment(
  horizontal: Rb001RoadSample["horizontal"],
  vertical: readonly VerticalElement[],
  options?: { readonly stepM?: number },
): SampledAlignment {
  const stepM = options?.stepM ?? 10;
  const totalLength = horizontal.elements.reduce((sum, e) => sum + e.length, 0);
  const points: Point3D[] = [];
  for (let s = 0; s <= totalLength + 1e-6; s += stepM) {
    const distance = Math.min(s, totalLength);
    const evaluation = evaluateAlignmentAtDistance(horizontal, distance);
    points.push({
      x: evaluation.point.x,
      y: evaluation.point.y,
      z: elevationAt(distance, vertical),
    });
  }
  return { points, length: totalLength };
}

/**
 * Map a real RoadSample into a viewer RoadLayerData in the canonical frame.
 * The sample set is the sampled centerline; elevations come from the vertical
 * profile so the strip matches the terrain under the bridge candidate.
 */
export function roadAlignmentToLayer(
  road: Rb001RoadSample,
  options?: RoadAlignmentToLayerOptions,
): RoadLayerData {
  const { points } = sampleAlignment(road.horizontal, road.vertical, {
    stepM: options?.stepM,
  });
  const alignment: Point3D[] = [...points];
  return {
    kind: "road",
    alignment,
    width: options?.width ?? RB001_ROAD_WIDTH,
    halfWidth: options?.halfWidth,
    surfaceColor: options?.surfaceColor ?? "#3b3b3b",
  };
}

/** Extract the station range that the road sample covers. */
export function roadStationRange(road: Rb001RoadSample): { readonly start: number; readonly end: number } {
  return { start: 0, end: roadStationEnd(road) };
}

function roadStationEnd(road: Rb001RoadSample): number {
  return road.horizontal.elements.reduce((sum, e) => sum + e.length, 0);
}