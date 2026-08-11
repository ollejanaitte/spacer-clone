import { describe, expect, it } from "vitest";
import { createTerrainGrid, getGridElevation } from "../terrainSurface";
import { buildTerrainTiles, selectLodLevel, buildTileLodMesh, terrainBoundsFromPoints } from "../terrainTiles";

function makeLargeGrid() {
  // 65x65 grid over 1600m x 1600m (large terrain)
  return createTerrainGrid(65, 65, 25, 0, 0, (x, y) => {
    const dx = x - 800;
    const dy = y - 800;
    return 400 - Math.hypot(dx, dy) * 0.3;
  });
}

describe("Phase 3-06 Large Terrain / Tile / LOD", () => {
  it("splits a large terrain grid into tiles", () => {
    const grid = makeLargeGrid();
    const tiles = buildTerrainTiles(grid, { tileSize: 32 });
    expect(tiles.tiles.length).toBe(4); // 65x65 with 32 tile -> 2x2
    expect(tiles.columns).toBe(2);
    expect(tiles.rows).toBe(2);
    for (const tile of tiles.tiles) {
      expect(tile.mesh.vertexCount).toBeGreaterThan(0);
      expect(tile.mesh.triangleCount).toBeGreaterThan(0);
      expect(tile.bounds.maxX).toBeGreaterThan(tile.bounds.minX);
    }
  });

  it("tile bounds are contiguous (cover the full domain)", () => {
    const grid = makeLargeGrid();
    const tiles = buildTerrainTiles(grid, { tileSize: 32 });
    const allMinX = Math.min(...tiles.tiles.map((t) => t.bounds.minX));
    const allMaxX = Math.max(...tiles.tiles.map((t) => t.bounds.maxX));
    expect(allMinX).toBeCloseTo(0, 6);
    expect(allMaxX).toBeCloseTo(1600, 6);
  });

  it("selects LOD level based on camera distance", () => {
    const grid = makeLargeGrid();
    const tiles = buildTerrainTiles(grid, { tileSize: 32 });
    const nearTile = tiles.tiles[0];
    // camera at tile center -> level 0
    expect(selectLodLevel(nearTile, { x: (nearTile.bounds.minX + nearTile.bounds.maxX) / 2, y: 0 })).toBe(0);
    // camera far away -> coarser level
    const farLevel = selectLodLevel(nearTile, { x: 100000, y: 100000 });
    expect(farLevel).toBeGreaterThan(0);
  });

  it("builds a reduced-resolution LOD mesh with fewer vertices", () => {
    const grid = makeLargeGrid();
    const tiles = buildTerrainTiles(grid, { tileSize: 32 });
    const tile = tiles.tiles[0];
    const full = tile.mesh.vertexCount;
    const lod = buildTileLodMesh(grid, tile, 2);
    expect(lod.vertexCount).toBeLessThan(full);
    expect(lod.triangleCount).toBeGreaterThan(0);
  });

  it("LOD mesh retains elevation sampling from source grid", () => {
    const grid = makeLargeGrid();
    const tiles = buildTerrainTiles(grid, { tileSize: 32 });
    const tile = tiles.tiles[0];
    const lod = buildTileLodMesh(grid, tile, 0);
    // both meshes sample elevation near the source grid
    const zFull = getGridElevation(grid, 0, 0);
    expect(zFull).not.toBeNull();
    const zLod = lod.vertices[2];
    expect(Math.abs(zLod - (zFull ?? 0))).toBeLessThan(40);
  });

  it("derives bounds from points", () => {
    const bounds = terrainBoundsFromPoints([
      { x: 0, y: 0, z: 100 },
      { x: 100, y: 50, z: 200 },
    ]);
    expect(bounds?.minX).toBe(0);
    expect(bounds?.maxX).toBe(100);
    expect(bounds?.maxY).toBe(50);
    expect(terrainBoundsFromPoints([])).toBeNull();
  });
});
