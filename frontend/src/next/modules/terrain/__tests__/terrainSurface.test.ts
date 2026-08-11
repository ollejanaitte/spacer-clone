import { describe, expect, it } from "vitest";
import {
  createTerrainGrid,
  gridToMesh,
  getGridElevation,
  buildTerrainSurfaceFromPoints,
} from "../terrainSurface";
import type { TerrainPoint } from "../terrainImport";

describe("Phase 3-04 Terrain Core / TIN / Surface", () => {
  it("builds a heightfield grid deterministically", () => {
    const grid = createTerrainGrid(3, 3, 10, 0, 0, (x, y) => x + y);
    expect(grid.heights.length).toBe(9);
    expect(grid.heights[0]).toBeCloseTo(0, 9);
    expect(grid.heights[4]).toBeCloseTo(20, 9);
    expect(grid.heights[8]).toBeCloseTo(40, 9);
  });

  it("converts grid to a TIN mesh (2 triangles per cell)", () => {
    const grid = createTerrainGrid(3, 3, 10, 0, 0, (x, y) => x + y);
    const mesh = gridToMesh(grid);
    expect(mesh.vertexCount).toBe(9);
    expect(mesh.triangleCount).toBe((3 - 1) * (3 - 1) * 2);
    expect(mesh.indices.length).toBe(mesh.triangleCount * 3);
    expect(mesh.bounds.maxZ).toBeCloseTo(40, 9);
  });

  it("getElevation interpolates bilinearly inside the grid", () => {
    const grid = createTerrainGrid(3, 3, 10, 0, 0, (x, y) => x + y);
    // at (5,5) bilinear: h00=0,h10=10,h01=10,h11=20 -> 10
    expect(getGridElevation(grid, 5, 5)).toBeCloseTo(10, 6);
    // exact vertex
    expect(getGridElevation(grid, 10, 10)).toBeCloseTo(20, 6);
  });

  it("getElevation returns null outside the grid (no-data)", () => {
    const grid = createTerrainGrid(3, 3, 10, 0, 0, (x, y) => x + y);
    expect(getGridElevation(grid, -1, 5)).toBeNull();
    expect(getGridElevation(grid, 25, 5)).toBeNull();
  });

  it("builds a surface from imported points (binned heightfield)", () => {
    const points: TerrainPoint[] = [
      { x: 0, y: 0, z: 100 },
      { x: 10, y: 0, z: 110 },
      { x: 0, y: 10, z: 120 },
      { x: 10, y: 10, z: 130 },
    ];
    const mesh = buildTerrainSurfaceFromPoints(points, { cellSize: 10 });
    expect(mesh).not.toBeNull();
    if (!mesh) return;
    expect(mesh.vertexCount).toBeGreaterThan(0);
    expect(mesh.triangleCount).toBeGreaterThan(0);
    expect(mesh.bounds.minZ).toBeGreaterThanOrEqual(100);
    expect(mesh.bounds.maxZ).toBeLessThanOrEqual(130);
  });

  it("returns null for empty points", () => {
    expect(buildTerrainSurfaceFromPoints([])).toBeNull();
  });

  it("degenerate/duplicate handling: single point creates a valid 2x2 grid", () => {
    const points: TerrainPoint[] = [{ x: 5, y: 5, z: 50 }];
    const mesh = buildTerrainSurfaceFromPoints(points, { cellSize: 10 });
    expect(mesh).not.toBeNull();
    if (!mesh) return;
    expect(mesh.vertexCount).toBe(4);
    expect(mesh.triangleCount).toBe(2);
  });
});
