import type { TerrainPoint } from "./terrainImport";

export interface Origin3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface TerrainCoordinateTransformer {
  readonly projectOrigin: Origin3;
  readonly localOrigin: Origin3 | null;
  readonly unitSystem: "metric";
  readonly axisConvention: "x-along/y-transverse/z-up";

  /** global/source coordinate -> project coordinate (subtract project origin). */
  globalToProject(p: TerrainPoint): TerrainPoint;

  /** project coordinate -> local rendering coordinate (subtract local origin). */
  projectToLocal(p: TerrainPoint): TerrainPoint;

  /** global/source coordinate -> local rendering coordinate. */
  globalToLocal(p: TerrainPoint): TerrainPoint;

  /** Round-trip: local -> project (add local origin). */
  localToProject(p: TerrainPoint): TerrainPoint;

  /** Round-trip: project -> global (add project origin). */
  projectToGlobal(p: TerrainPoint): TerrainPoint;
}

export function createTerrainCoordinateTransformer(
  projectOrigin: Origin3,
  localOrigin: Origin3 | null,
): TerrainCoordinateTransformer {
  const origin = { x: 0, y: 0, z: 0 };
  const lo = localOrigin ?? origin;
  return {
    projectOrigin: { ...projectOrigin },
    localOrigin: lo,
    unitSystem: "metric",
    axisConvention: "x-along/y-transverse/z-up",
    globalToProject: (p) => ({
      x: p.x - projectOrigin.x,
      y: p.y - projectOrigin.y,
      z: p.z - projectOrigin.z,
    }),
    projectToLocal: (p) => ({ x: p.x - lo.x, y: p.y - lo.y, z: p.z - lo.z }),
    globalToLocal: (p) => ({
      x: p.x - projectOrigin.x - lo.x,
      y: p.y - projectOrigin.y - lo.y,
      z: p.z - projectOrigin.z - lo.z,
    }),
    localToProject: (p) => ({ x: p.x + lo.x, y: p.y + lo.y, z: p.z + lo.z }),
    projectToGlobal: (p) => ({
      x: p.x + projectOrigin.x,
      y: p.y + projectOrigin.y,
      z: p.z + projectOrigin.z,
    }),
  };
}

/**
 * Three.js render transform (display responsibility only).
 * domain (x, y, z) -> three (x, height=z, -y) per the Phase 3-A freeze.
 * Never mutates the terrain source of truth.
 */
export function domainToThree(p: TerrainPoint): [number, number, number] {
  return [p.x, p.z, -p.y];
}

export function threeToDomain(t: [number, number, number]): TerrainPoint {
  return { x: t[0], y: -t[2], z: t[1] };
}

export function applyTransformToPoints(
  points: readonly TerrainPoint[],
  transform: (p: TerrainPoint) => TerrainPoint,
): TerrainPoint[] {
  return points.map(transform);
}
