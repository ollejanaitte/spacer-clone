import { describe, expect, it } from "vitest";
import {
  MOUNTAIN_TERRAIN_SETTINGS,
  buildTerrainHeightfield,
  buildTerrainIndices,
  terrainElevation,
  terrainHash,
} from "../mountain-viaduct-500/terrain";

describe("mountain terrain", () => {
  it("is deterministic (same value for same input)", () => {
    const a = terrainElevation(123, 45);
    const b = terrainElevation(123, 45);
    expect(a).toBe(b);
  });

  it("valley is deeper near the bridge centre than at the ends", () => {
    const centre = terrainElevation(250, 0);
    const start = terrainElevation(0, 0);
    const end = terrainElevation(500, 0);
    expect(centre).toBeLessThan(start - 5);
    expect(centre).toBeLessThan(end - 5);
  });

  it("lateral slopes rise away from the centreline", () => {
    const centre = terrainElevation(250, 0);
    const side = terrainElevation(250, 150);
    expect(side).toBeGreaterThan(centre);
  });

  it("hash is stable and in [0,1)", () => {
    const h = terrainHash(3, 4, MOUNTAIN_TERRAIN_SETTINGS.seed);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(1);
    expect(terrainHash(3, 4, MOUNTAIN_TERRAIN_SETTINGS.seed)).toBe(h);
  });

  it("heightfield has expected grid size", () => {
    const { positions, widths, depths } = buildTerrainHeightfield();
    expect(widths).toBe(Math.floor(500 / 10) + 1);
    expect(positions.length).toBe(widths * depths * 3);
  });

  it("indices form triangles", () => {
    const { widths, depths } = buildTerrainHeightfield();
    const indices = buildTerrainIndices(widths, depths);
    // 2 triangles per grid cell
    expect(indices.length).toBe((widths - 1) * (depths - 1) * 6);
  });
});
