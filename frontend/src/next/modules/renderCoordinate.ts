/**
 * Common Render Coordinate Adapter (single source of truth for the
 * Domain -> Three.js render transform used across Terrain / Road / Existing /
 * Integrated scene builders and camera placement).
 *
 * Domain coordinate (土木/Project正本):
 *   X = road axis direction
 *   Y = transverse direction
 *   Z = elevation (標高)
 *
 * Three.js render coordinate:
 *   three.x = domain.x
 *   three.y = domain.z (elevation, Y-up)
 *   three.z = -domain.y (transverse, mirrored so +right stays +right)
 *
 * This mapping matches the Phase 3-A coordinate / origin freeze
 * (docs/rebuild/phase3/R3-00_coordinate_origin_freeze.md) and the existing
 * threeCoords.ts convention. Viewers must use THIS adapter instead of
 * re-implementing axis swaps so the scene never splits.
 *
 * Transform is display responsibility only: it never mutates the source of
 * truth (Terrain CIM / Road CIM / Existing Conditions document).
 */

export interface DomainPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface RenderOrigin {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Domain (x, y, z) -> Three.js (x, elevation, -y). */
export function domainToThree(p: DomainPoint): [number, number, number] {
  return [p.x, p.z, -p.y];
}

/** Three.js (x, elevation, -y) -> Domain (x, y, z). */
export function threeToDomain(t: readonly [number, number, number]): DomainPoint {
  return { x: t[0], y: -t[2], z: t[1] };
}

/**
 * Map an interleaved Float32Array of domain (x, y, z) triples into Three.js
 * (x, elevation, -y) triples, optionally subtracting a Local Origin first.
 * Returns a new array; never mutates the input.
 */
export function domainVerticesToThree(
  vertices: Float32Array | readonly number[],
  localOrigin?: RenderOrigin | null,
): Float32Array {
  const ox = localOrigin?.x ?? 0;
  const oy = localOrigin?.y ?? 0;
  const oz = localOrigin?.z ?? 0;
  const out = new Float32Array(vertices.length);
  for (let i = 0; i + 2 < vertices.length; i += 3) {
    const x = vertices[i] - ox;
    const y = vertices[i + 1] - oy;
    const z = vertices[i + 2] - oz;
    const t = domainToThree({ x, y, z });
    out[i] = t[0];
    out[i + 1] = t[1];
    out[i + 2] = t[2];
  }
  return out;
}
