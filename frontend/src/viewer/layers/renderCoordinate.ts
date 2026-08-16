/**
 * Canonical world -> Three.js render transform for the unified viewer.
 *
 * Lane V owns the display transform. The default transform follows the single
 * shared source of truth `domainToThree` (frontend/src/next/modules/renderCoordinate.ts):
 *   canonical (x=along, y=transverse, z=elevation) -> three (x, elevation, -y)
 *
 * CRS conversion is explicitly OUT of scope here (Lane T territory); the world
 * basis may carry a CRS identifier as metadata only.
 */

import {
  domainToThree,
  domainVerticesToThree,
  threeToDomain,
} from "../../next/modules/renderCoordinate";
import type { Point3D, RenderCoordinateTransform } from "./layerContract";

export const CANONICAL_TO_RENDER_TRANSFORM_NAME =
  "canonical-project-x-righty-left-z-up->three-x-z--y";

/** Canonical point -> three render coordinates, optionally subtracting a render origin. */
export function canonicalToRender(
  point: Point3D,
  origin?: { readonly x: number; readonly y: number; readonly z: number } | null,
): [number, number, number] {
  const ox = origin?.x ?? 0;
  const oy = origin?.y ?? 0;
  const oz = origin?.z ?? 0;
  return domainToThree({ x: point.x - ox, y: point.y - oy, z: point.z - oz });
}

/** Three render coordinates -> canonical point (inverse of canonicalToRender). */
export function renderToCanonical(
  render: readonly [number, number, number],
  origin?: { readonly x: number; readonly y: number; readonly z: number } | null,
): Point3D {
  const domain = threeToDomain([render[0], render[1], render[2]]);
  return {
    x: domain.x + (origin?.x ?? 0),
    y: domain.y + (origin?.y ?? 0),
    z: domain.z + (origin?.z ?? 0),
  };
}

/** Interleaved canonical (x,y,z) triples -> three render triples with origin shift. */
export function canonicalVerticesToRender(
  vertices: Float32Array | readonly number[],
  origin?: { readonly x: number; readonly y: number; readonly z: number } | null,
): Float32Array {
  return domainVerticesToThree(vertices, origin ?? null);
}

/** The default render transform used by the unified viewer (V-2 contract). */
export const DEFAULT_RENDER_COORDINATE_TRANSFORM: RenderCoordinateTransform = {
  name: CANONICAL_TO_RENDER_TRANSFORM_NAME,
  apply: (point, origin) => canonicalToRender(point, origin),
  applyVertices: (vertices, origin) => canonicalVerticesToRender(vertices, origin),
};