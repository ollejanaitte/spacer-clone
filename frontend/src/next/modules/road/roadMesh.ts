import { buildRoadIntermediate, type RoadSampledPoint } from "./intermediateResult";
import type { LinearAlignment } from "../../../liner/core/types";
import type { VerticalElement } from "../../../liner/core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../../liner/schema/types";

export interface RoadMeshVertex {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly normalX: number;
  readonly normalY: number;
  readonly normalZ: number;
}

export interface RoadMeshTriangle {
  readonly a: number;
  readonly b: number;
  readonly c: number;
}

export interface Road3DMesh {
  readonly vertices: readonly RoadMeshVertex[];
  readonly triangles: readonly RoadMeshTriangle[];
  readonly stationCount: number;
  readonly offsetCount: number;
}

export interface BuildRoadMeshInput {
  readonly horizontal: LinearAlignment;
  readonly vertical: readonly VerticalElement[];
  readonly crossSection: CrossSectionTemplateDraft;
  readonly widthChangePoints?: readonly { id: string; physicalDistance: number; leftOffset: number; rightOffset: number }[];
  readonly crossSlopeIntervals?: readonly unknown[];
  readonly stationInterval?: number;
}

function signedOffsets(crossSection: CrossSectionTemplateDraft): number[] {
  return crossSection.offsetLines.map((l) => l.offset).sort((a, b) => a - b);
}

export function buildRoadMesh(input: BuildRoadMeshInput): Road3DMesh {
  const offsets = signedOffsets(input.crossSection);
  if (offsets.length < 2) {
    return { vertices: [], triangles: [], stationCount: 0, offsetCount: 0 };
  }

  const intermediate = buildRoadIntermediate({
    horizontal: input.horizontal,
    vertical: input.vertical,
    crossSections: [input.crossSection],
    widthChangePoints: input.widthChangePoints ?? [],
    crossSlopeIntervals: input.crossSlopeIntervals ?? [],
    stationDefinition: { originDisplayedStation: 0, equations: [] },
  }, { sampleInterval: input.stationInterval ?? 10 });

  if (!intermediate.ok) {
    return { vertices: [], triangles: [], stationCount: 0, offsetCount: 0 };
  }

  const vertices: RoadMeshVertex[] = [];
  const triangles: RoadMeshTriangle[] = [];

  // For each station, place road-edge vertices at the signed offsets using
  // the cross-slope delta (LINER convention: applyCrossSlope = -(slope/100)*offset,
  // right-down positive slope lowers the right edge).
  const offsetsCount = offsets.length;
  for (const station of intermediate.samplePoints) {
    const base: RoadSampledPoint = station;
    for (const offset of offsets) {
      const slopeDelta = -(base.rightSlopePercent / 100) * offset;
      const normal = { x: -Math.sin(base.azimuth), y: Math.cos(base.azimuth), z: 0 };
      vertices.push({
        x: base.x + normal.x * offset,
        y: base.y + normal.y * offset,
        z: base.z + slopeDelta,
        normalX: normal.x,
        normalY: normal.y,
        normalZ: 1 / Math.sqrt(1 + (base.rightSlopePercent / 100) ** 2),
      });
    }
  }

  // Build triangles between consecutive stations and adjacent offsets.
  const stationCount = intermediate.samplePoints.length;
  for (let s = 0; s < stationCount - 1; s += 1) {
    for (let o = 0; o < offsetsCount - 1; o += 1) {
      const a = s * offsetsCount + o;
      const b = s * offsetsCount + o + 1;
      const c = (s + 1) * offsetsCount + o;
      const d = (s + 1) * offsetsCount + o + 1;
      triangles.push({ a, b, c }, { a: b, b: c, c: d });
    }
  }

  return { vertices, triangles, stationCount, offsetCount: offsetsCount };
}
