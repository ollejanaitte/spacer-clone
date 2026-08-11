/**
 * Domain <-> Three.js coordinate mapping (TERRAIN-FIX).
 *
 * All road / bridge / substructure / terrain / frame / camera share ONE
 * mapping so the scene never splits:
 *   three.x = domain.x
 *   three.y = domain.z   (height)
 *   three.z = -domain.y  (transverse, mirrored so +right stays +right)
 *
 * Historically the terrain and camera used different mappings which caused the
 * terrain to appear mirrored / misplaced and the camera to miss the scene.
 *
 * The mapping itself now delegates to the shared Render Coordinate Adapter
 * (frontend/src/next/modules/renderCoordinate.ts) so every consumer keeps one
 * single source of truth.
 */

import { domainToThree as mapDomainToThree } from "../../../next/modules/renderCoordinate";

export type DomainVec = { x: number; y: number; z: number };

/** Domain (x, y, z) -> Three.js (x, yHeight, z). */
export function domainToThree(p: DomainVec): [number, number, number] {
  return mapDomainToThree(p);
}

/** Build a flat Float32Array of Three.js positions from domain points. */
export function domainPointsToThree(points: readonly DomainVec[]): Float32Array {
  const out = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i += 1) {
    const [tx, ty, tz] = domainToThree(points[i]);
    out[i * 3] = tx;
    out[i * 3 + 1] = ty;
    out[i * 3 + 2] = tz;
  }
  return out;
}

/**
 * Re-map a terrain heightfield's positions (stored as x, height, y) into
 * Three.js positions (x, height, -y) so terrain matches road/sub/camera.
 * Reconstructed domain triple -> shared adapter keeps the axis convention in
 * one place.
 */
export function terrainPositionsToThree(
  positions: Float32Array,
): Float32Array {
  const out = new Float32Array(positions.length);
  for (let i = 0; i + 2 < positions.length; i += 3) {
    const domain = { x: positions[i], y: positions[i + 2], z: positions[i + 1] };
    const t = mapDomainToThree(domain);
    out[i] = t[0];
    out[i + 1] = t[1];
    out[i + 2] = t[2];
  }
  return out;
}
