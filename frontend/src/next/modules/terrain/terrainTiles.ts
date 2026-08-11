import type { TerrainMesh, TerrainGrid } from "./terrainSurface";
import { gridToMesh, createTerrainGrid } from "./terrainSurface";
import type { TerrainPoint } from "./terrainImport";

export interface TerrainTile {
  readonly tileId: string;
  readonly bounds: { minX: number; minY: number; maxX: number; maxY: number };
  readonly mesh: TerrainMesh;
}

export interface TileGrid {
  readonly tiles: readonly TerrainTile[];
  readonly columns: number;
  readonly rows: number;
}

export interface LODLevel {
  readonly level: number;
  readonly maxDistance: number;
  readonly cellSize: number;
}

export interface LodSelection {
  readonly tileId: string;
  readonly level: number;
}

/**
 * Split a terrain grid into a grid of tiles. Each tile is a sub-grid rendered
 * as its own mesh, enabling large-terrain culling and per-tile LOD.
 */
export function buildTerrainTiles(
  grid: TerrainGrid,
  options: { tileSize?: number } = {},
): TileGrid {
  const tileSize = options.tileSize ?? 32;
  const columns = Math.max(1, Math.ceil((grid.width - 1) / tileSize));
  const rows = Math.max(1, Math.ceil((grid.height - 1) / tileSize));
  const tiles: TerrainTile[] = [];

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < columns; c += 1) {
      const startCol = c * tileSize;
      const startRow = r * tileSize;
      const endCol = Math.min(grid.width - 1, startCol + tileSize);
      const endRow = Math.min(grid.height - 1, startRow + tileSize);
      const tileWidth = endCol - startCol + 1;
      const tileHeight = endRow - startRow + 1;

      const heights = new Float32Array(tileWidth * tileHeight);
      for (let row = startRow; row <= endRow; row += 1) {
        for (let col = startCol; col <= endCol; col += 1) {
          heights[(row - startRow) * tileWidth + (col - startCol)] =
            grid.heights[row * grid.width + col];
        }
      }

      const tileGrid: TerrainGrid = {
        width: tileWidth,
        height: tileHeight,
        cellSize: grid.cellSize,
        originX: grid.originX + startCol * grid.cellSize,
        originY: grid.originY + startRow * grid.cellSize,
        heights,
      };

      const mesh = gridToMesh(tileGrid);
      tiles.push({
        tileId: `tile-${r}-${c}`,
        bounds: {
          minX: tileGrid.originX,
          minY: tileGrid.originY,
          maxX: tileGrid.originX + (tileWidth - 1) * grid.cellSize,
          maxY: tileGrid.originY + (tileHeight - 1) * grid.cellSize,
        },
        mesh,
      });
    }
  }

  return { tiles, columns, rows };
}

export const DEFAULT_LOD_LEVELS: readonly LODLevel[] = [
  { level: 0, maxDistance: 600, cellSize: 25 },
  { level: 1, maxDistance: 1200, cellSize: 50 },
  { level: 2, maxDistance: 2500, cellSize: 100 },
  { level: 3, maxDistance: Infinity, cellSize: 200 },
];

/**
 * Choose an LOD level for a tile based on the distance from a camera center.
 */
export function selectLodLevel(
  tile: TerrainTile,
  cameraCenter: { x: number; y: number },
  levels: readonly LODLevel[] = DEFAULT_LOD_LEVELS,
): number {
  const cx = (tile.bounds.minX + tile.bounds.maxX) / 2;
  const cy = (tile.bounds.minY + tile.bounds.maxY) / 2;
  const distance = Math.hypot(cx - cameraCenter.x, cy - cameraCenter.y);
  for (const level of levels) {
    if (distance <= level.maxDistance) {
      return level.level;
    }
  }
  return levels.length - 1;
}

/**
 * Build a reduced-resolution mesh for a tile at the given LOD level.
 * Coarser cell size -> fewer vertices (mesh reduction for far tiles).
 */
export function buildTileLodMesh(
  grid: TerrainGrid,
  tile: TerrainTile,
  level: number,
  levels: readonly LODLevel[] = DEFAULT_LOD_LEVELS,
): TerrainMesh {
  const cellSize = levels[level]?.cellSize ?? levels[levels.length - 1].cellSize;
  const ratio = Math.max(1, Math.round(cellSize / grid.cellSize));
  const width = Math.max(2, Math.ceil((tile.bounds.maxX - tile.bounds.minX) / cellSize) + 1);
  const height = Math.max(2, Math.ceil((tile.bounds.maxY - tile.bounds.minY) / cellSize) + 1);
  const heights = new Float32Array(width * height);
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const x = tile.bounds.minX + col * cellSize;
      const y = tile.bounds.minY + row * cellSize;
      // sample from source grid cell (binned)
      const srcCol = Math.min(grid.width - 1, Math.max(0, Math.floor((x - grid.originX) / grid.cellSize)));
      const srcRow = Math.min(grid.height - 1, Math.max(0, Math.floor((y - grid.originY) / grid.cellSize)));
      heights[row * width + col] = grid.heights[srcRow * grid.width + srcCol];
    }
  }
  const lodGrid: TerrainGrid = {
    width,
    height,
    cellSize,
    originX: tile.bounds.minX,
    originY: tile.bounds.minY,
    heights,
  };
  void ratio;
  return gridToMesh(lodGrid);
}

/**
 * Given a full-resolution mesh and a set of points, derive bounds used by the
 * terrain tile system (helper).
 */
export function terrainBoundsFromPoints(points: readonly TerrainPoint[]) {
  if (points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}
