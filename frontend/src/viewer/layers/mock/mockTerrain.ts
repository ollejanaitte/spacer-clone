/**
 * Wave 1 mock terrain fixture (Lane V).
 *
 * Deterministic heightfield in the canonical world frame
 * (x=along, y=transverse, z=elevation, unit=m). Replaced by Lane T terrain
 * output in V-3 via the TerrainLayerData shape.
 */

import type { TerrainLayerData } from "../layerContract";

export const MOCK_TERRAIN_CELL_SIZE = 5;
export const MOCK_TERRAIN_ORIGIN_X = -10;
export const MOCK_TERRAIN_ORIGIN_Y = -45;
export const MOCK_TERRAIN_WIDTH = 48;
export const MOCK_TERRAIN_HEIGHT = 20;

/** Deterministic valley + river-channel height function used by all fixtures. */
export function mockTerrainHeight(x: number, y: number): number {
  const base = 18 + 5 * Math.sin(x * 0.02) + 3 * Math.cos(y * 0.035);
  const valley = -14 * Math.exp(-((x - 100) * (x - 100)) / (35 * 35));
  const riverChannel =
    -4 * Math.exp(-(y * y) / (14 * 14)) * Math.exp(-((x - 130) * (x - 130)) / (25 * 25));
  return base + valley + riverChannel;
}

export function createMockTerrainLayerData(): TerrainLayerData {
  const heights = new Float32Array(MOCK_TERRAIN_WIDTH * MOCK_TERRAIN_HEIGHT);
  for (let row = 0; row < MOCK_TERRAIN_HEIGHT; row += 1) {
    for (let col = 0; col < MOCK_TERRAIN_WIDTH; col += 1) {
      const x = MOCK_TERRAIN_ORIGIN_X + col * MOCK_TERRAIN_CELL_SIZE;
      const y = MOCK_TERRAIN_ORIGIN_Y + row * MOCK_TERRAIN_CELL_SIZE;
      heights[row * MOCK_TERRAIN_WIDTH + col] = mockTerrainHeight(x, y);
    }
  }
  return {
    kind: "terrain",
    width: MOCK_TERRAIN_WIDTH,
    height: MOCK_TERRAIN_HEIGHT,
    cellSize: MOCK_TERRAIN_CELL_SIZE,
    originX: MOCK_TERRAIN_ORIGIN_X,
    originY: MOCK_TERRAIN_ORIGIN_Y,
    heights,
  };
}