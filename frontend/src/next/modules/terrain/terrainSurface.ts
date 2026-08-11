import type { TerrainPoint } from "./terrainImport";

export interface TerrainGrid {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  readonly originX: number;
  readonly originY: number;
  /** heights[row * width + col] */
  readonly heights: Float32Array;
}

export interface TerrainMesh {
  readonly vertices: Float32Array;
  readonly indices: Uint32Array;
  readonly width: number;
  readonly height: number;
  readonly vertexCount: number;
  readonly triangleCount: number;
  readonly bounds: { minX: number; minY: number; maxX: number; maxY: number; minZ: number; maxZ: number };
}

export function createTerrainGrid(
  width: number,
  height: number,
  cellSize: number,
  originX: number,
  originY: number,
  heightFn: (x: number, y: number) => number,
): TerrainGrid {
  const heights = new Float32Array(width * height);
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const x = originX + col * cellSize;
      const y = originY + row * cellSize;
      heights[row * width + col] = heightFn(x, y);
    }
  }
  return { width, height, cellSize, originX, originY, heights };
}

function gridX(grid: TerrainGrid, col: number): number {
  return grid.originX + col * grid.cellSize;
}

function gridY(grid: TerrainGrid, row: number): number {
  return grid.originY + row * grid.cellSize;
}

export function gridToMesh(grid: TerrainGrid): TerrainMesh {
  const vertices = new Float32Array(grid.width * grid.height * 3);
  let vi = 0;
  for (let row = 0; row < grid.height; row += 1) {
    for (let col = 0; col < grid.width; col += 1) {
      const x = gridX(grid, col);
      const y = gridY(grid, row);
      const z = grid.heights[row * grid.width + col];
      vertices[vi++] = x;
      vertices[vi++] = y;
      vertices[vi++] = z;
    }
  }
  // two triangles per cell
  const indices: number[] = [];
  for (let row = 0; row < grid.height - 1; row += 1) {
    for (let col = 0; col < grid.width - 1; col += 1) {
      const a = row * grid.width + col;
      const b = a + 1;
      const c = a + grid.width;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  let minZ = Infinity;
  let maxZ = -Infinity;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < grid.heights.length; i += 1) {
    const z = grid.heights[i];
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  minX = gridX(grid, 0);
  maxX = gridX(grid, grid.width - 1);
  minY = gridY(grid, 0);
  maxY = gridY(grid, grid.height - 1);
  return {
    vertices,
    indices: Uint32Array.from(indices),
    width: grid.width,
    height: grid.height,
    vertexCount: grid.width * grid.height,
    triangleCount: indices.length / 3,
    bounds: { minX, minY, maxX, maxY, minZ, maxZ },
  };
}

/**
 * Deterministic bilinear interpolation of elevation from a heightfield grid.
 * Returns null when the point is outside the grid (explicit no-data handling).
 */
export function getGridElevation(grid: TerrainGrid, x: number, y: number): number | null {
  const fx = (x - grid.originX) / grid.cellSize;
  const fy = (y - grid.originY) / grid.cellSize;
  const col = Math.floor(fx);
  const row = Math.floor(fy);
  if (col < 0 || row < 0 || col >= grid.width - 1 || row >= grid.height - 1) {
    return null;
  }
  const u = fx - col;
  const v = fy - row;
  const h00 = grid.heights[row * grid.width + col];
  const h10 = grid.heights[row * grid.width + col + 1];
  const h01 = grid.heights[(row + 1) * grid.width + col];
  const h11 = grid.heights[(row + 1) * grid.width + col + 1];
  const top = h00 * (1 - u) + h10 * u;
  const bottom = h01 * (1 - u) + h11 * u;
  return top * (1 - v) + bottom * v;
}

/**
 * Build a Terrain Surface from imported terrain points.
 * A grid-based heightfield is interpolated from the point cloud via binning;
 * deterministic and dependency-free.
 */
export function buildTerrainSurfaceFromPoints(
  points: readonly TerrainPoint[],
  options: { cellSize?: number } = {},
): TerrainMesh | null {
  if (points.length === 0) return null;
  const cellSize = options.cellSize ?? 10;
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
  const width = Math.max(2, Math.ceil((maxX - minX) / cellSize) + 1);
  const height = Math.max(2, Math.ceil((maxY - minY) / cellSize) + 1);
  const sum = new Float64Array(width * height);
  const count = new Uint32Array(width * height);

  for (const p of points) {
    const col = Math.min(width - 1, Math.max(0, Math.floor((p.x - minX) / cellSize)));
    const row = Math.min(height - 1, Math.max(0, Math.floor((p.y - minY) / cellSize)));
    const idx = row * width + col;
    sum[idx] += p.z;
    count[idx] += 1;
  }

  const heights = new Float32Array(width * height);
  for (let i = 0; i < heights.length; i += 1) {
    heights[i] = count[i] > 0 ? sum[i] / count[i] : 0;
  }

  const grid: TerrainGrid = { width, height, cellSize, originX: minX, originY: minY, heights };
  return gridToMesh(grid);
}
