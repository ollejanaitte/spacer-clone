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
 */

export type DomainVec = { x: number; y: number; z: number };

/** Domain (x, y, z) -> Three.js (x, yHeight, z). */
export function domainToThree(p: DomainVec): [number, number, number] {
  return [p.x, p.z, -p.y];
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
 */
export function terrainPositionsToThree(
  positions: Float32Array,
): Float32Array {
  const out = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    out[i] = positions[i]; // x
    out[i + 1] = positions[i + 1]; // height (y up)
    out[i + 2] = -positions[i + 2]; // -y
  }
  return out;
}
