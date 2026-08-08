/**
 * Mountain Viaduct 500 — deterministic terrain (MOUNTAIN-SAMPLE P05).
 *
 * A fixed, reproducible heightfield for the 3D showcase. This is a
 * DISPLAY_LAYER only: it never feeds road geometry calculation (X/Y/Z of the
 * road come from the existing solvers). The shape is fully deterministic from
 * `seed` so reloads and re-renders never change the terrain.
 *
 * Shape: mountains at both ends, a deep valley near the bridge centre
 * (around station 250), and slopes at the approaches so pier heights vary
 * clearly.
 */
import type { MountainTerrainSettings } from "./schema";

export const MOUNTAIN_TERRAIN_SETTINGS: MountainTerrainSettings = {
  seed: 20260808,
  role: "DISPLAY_LAYER",
  cellSizeM: 10,
  extentM: 500,
};

/** Deterministic hash of a grid coordinate (fixed seed). */
export function terrainHash(xIndex: number, yIndex: number, seed: number): number {
  let h = seed ^ (xIndex * 374761393) ^ (yIndex * 668265263);
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 0xffffffff;
}

/** Smoothstep between a and b. */
function smoothstep(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
}

/**
 * Terrain elevation at world (x, y). All values are in meters.
 * deterministic from seed.
 */
export function terrainElevation(
  x: number,
  y: number,
  settings: MountainTerrainSettings = MOUNTAIN_TERRAIN_SETTINGS,
): number {
  const { seed, cellSizeM, extentM } = settings;
  const xIndex = Math.floor(x / cellSizeM);
  const yIndex = Math.floor(y / cellSizeM);
  const fx = (x / cellSizeM) - xIndex;
  const fy = (y / cellSizeM) - yIndex;

  // base mountain: high at the ends (start/end), valley in the middle.
  const normalized = x / extentM;
  const distanceFromCentre = Math.abs(normalized - 0.5) * 2; // 0 at centre, 1 at ends
  const base = 77 - (1 - distanceFromCentre) * 30;

  // deterministic noise for mountain texture
  const n00 = terrainHash(xIndex, yIndex, seed);
  const n10 = terrainHash(xIndex + 1, yIndex, seed);
  const n01 = terrainHash(xIndex, yIndex + 1, seed);
  const n11 = terrainHash(xIndex + 1, yIndex + 1, seed);
  const sx = smoothstep(fx);
  const sy = smoothstep(fy);
  const noise =
    n00 * (1 - sx) * (1 - sy) +
    n10 * sx * (1 - sy) +
    n01 * (1 - sx) * sy +
    n11 * sx * sy;
  const detail = (noise - 0.5) * 8;

  // lateral hills so the valley is deep at the centre and rises at the sides
  const lateral = Math.abs(y) / 200;
  return base + detail + lateral * 10;
}

/** Build a heightfield grid (positions + heights) for the 3D terrain mesh. */
export function buildTerrainHeightfield(
  settings: MountainTerrainSettings = MOUNTAIN_TERRAIN_SETTINGS,
): { positions: Float32Array; widths: number; depths: number } {
  const { extentM, cellSizeM } = settings;
  const widths = Math.floor(extentM / cellSizeM) + 1;
  const depths = Math.floor((extentM / 2) / cellSizeM) * 2 + 1;
  const positions = new Float32Array(widths * depths * 3);
  let i = 0;
  for (let yIdx = 0; yIdx < depths; yIdx += 1) {
    const y = (yIdx - Math.floor(depths / 2)) * cellSizeM;
    for (let xIdx = 0; xIdx < widths; xIdx += 1) {
      const x = xIdx * cellSizeM;
      const z = terrainElevation(x, y, settings);
      positions[i++] = x;
      positions[i++] = z;
      positions[i++] = y;
    }
  }
  return { positions, widths, depths };
}

/** Terrain grid indices (triangle strip for the 3D mesh). */
export function buildTerrainIndices(widths: number, depths: number): Uint32Array {
  const indices: number[] = [];
  for (let yIdx = 0; yIdx < depths - 1; yIdx += 1) {
    for (let xIdx = 0; xIdx < widths - 1; xIdx += 1) {
      const a = yIdx * widths + xIdx;
      const b = a + 1;
      const c = a + widths;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  return new Uint32Array(indices);
}
