/**
 * Road CIM surface builder (Phase 8-01 FROZEN / Phase 8-02 WP-C).
 *
 * Builds a proper road surface mesh from the canonical editor draft, honoring
 * horizontal/vertical alignment, width (incl. widthChangePoints widening) and
 * cross slope / superelevation (left/right slope percent). The surface uses a
 * left / center / right ribbon so it reads as a road in the integrated 3D.
 */

import type { BuildIntermediateInput } from "../../../liner/core/pipeline/pipeline";
import { buildRoadIntermediate } from "../road/intermediateResult";
import { verticalDraftAlignmentToElements } from "../road/verticalDraftBridge";

export interface RoadCimSurfaceVertex {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface RoadCimSurfaceMesh {
  readonly vertices: readonly RoadCimSurfaceVertex[];
  readonly triangles: readonly { readonly a: number; readonly b: number; readonly c: number }[];
  readonly stationCount: number;
  readonly width: number;
}

export interface BuildRoadCimSurfaceOptions {
  readonly sampleInterval?: number;
}

export function buildRoadCimSurface(
  draft: BuildIntermediateInput,
  options: BuildRoadCimSurfaceOptions = {},
): RoadCimSurfaceMesh {
  const intermediate = buildRoadIntermediate(
    {
      horizontal: draft.alignment,
      vertical: verticalDraftAlignmentToElements(draft.verticalAlignment),
      crossSections: draft.crossSections ?? [],
      widthChangePoints: draft.widthChangePoints ?? [],
      crossSlopeIntervals: draft.crossSlopeIntervals ?? [],
      stationDefinition: draft.stationDefinition,
    },
    { sampleInterval: options.sampleInterval ?? 5 },
  );

  if (!intermediate.ok || intermediate.samplePoints.length < 2) {
    return { vertices: [], triangles: [], stationCount: 0, width: 0 };
  }

  const vertices: RoadCimSurfaceVertex[] = [];
  let maxWidth = 0;

  // Full pavement extent from the cross-section template (incl. shoulders),
  // widened by widthChangePoints through the intermediate left/right widths.
  const template = draft.crossSections?.[0];
  const negativeOffsets = (template?.offsetLines ?? [])
    .map((line) => Math.abs(line.offset))
    .filter((o) => o > 0);
  const templateExtent = negativeOffsets.length > 0 ? Math.max(...negativeOffsets) : 0;

  // 3 columns per station: left edge, centerline, right edge.
  for (const point of intermediate.samplePoints) {
    const normalX = -Math.sin(point.azimuth);
    const normalY = Math.cos(point.azimuth);
    const leftWidth = Math.max(templateExtent, Math.max(point.leftWidth, 0));
    const rightWidth = Math.max(templateExtent, Math.max(point.rightWidth, 0));
    maxWidth = Math.max(maxWidth, leftWidth + rightWidth);

    // right-down positive: a positive slope percent lowers that side.
    const leftDelta = -(point.leftSlopePercent / 100) * leftWidth;
    const rightDelta = -(point.rightSlopePercent / 100) * rightWidth;

    vertices.push(
      { x: point.x + normalX * leftWidth, y: point.y + normalY * leftWidth, z: point.z + leftDelta },
      { x: point.x, y: point.y, z: point.z },
      { x: point.x - normalX * rightWidth, y: point.y - normalY * rightWidth, z: point.z + rightDelta },
    );
  }

  const triangles: { a: number; b: number; c: number }[] = [];
  const stationCount = intermediate.samplePoints.length;
  const columns = 3;
  for (let s = 0; s < stationCount - 1; s += 1) {
    for (let col = 0; col < columns - 1; col += 1) {
      const a = s * columns + col;
      const b = s * columns + col + 1;
      const c2 = (s + 1) * columns + col;
      const d = (s + 1) * columns + col + 1;
      triangles.push({ a, b, c: c2 }, { a: b, b: c2, c: d });
    }
  }

  return { vertices, triangles, stationCount, width: maxWidth };
}
