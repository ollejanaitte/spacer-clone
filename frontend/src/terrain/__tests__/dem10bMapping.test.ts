import { describe, expect, it } from "vitest";
import { DEM_TILE_SIZE, dem10bChildToParentPixel } from "../gsi/dem10bMapping";

describe("T-GSI-06 DEM10B Z14 → Z15 parent tile pixel mapping", () => {
  it("DEM_TILE_SIZE is 256", () => {
    expect(DEM_TILE_SIZE).toBe(256);
  });

  it("maps all four quadrants of a parent tile", () => {
    // parent (2,3) → children (4,6)=NW, (5,6)=NE, (4,7)=SW, (5,7)=SE
    expect(dem10bChildToParentPixel(4, 6, 10, 10)).toEqual({ parentX: 2, parentY: 3, sx: 0 + 5, sy: 0 + 5 });
    expect(dem10bChildToParentPixel(5, 6, 10, 10)).toEqual({ parentX: 2, parentY: 3, sx: 128 + 5, sy: 0 + 5 });
    expect(dem10bChildToParentPixel(4, 7, 10, 10)).toEqual({ parentX: 2, parentY: 3, sx: 0 + 5, sy: 128 + 5 });
    expect(dem10bChildToParentPixel(5, 7, 10, 10)).toEqual({ parentX: 2, parentY: 3, sx: 128 + 5, sy: 128 + 5 });
  });

  it("maps boundary pixel of a child tile", () => {
    // 子タイル右端 (255) → 親の128+floor(255/2)=128+127
    const r = dem10bChildToParentPixel(5, 7, 255, 255);
    expect(r.sx).toBe(128 + 127);
    expect(r.sy).toBe(128 + 127);
    expect(r.parentX).toBe(2);
    expect(r.parentY).toBe(3);
  });
});