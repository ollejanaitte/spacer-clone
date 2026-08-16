import { describe, expect, it } from "vitest";
import { Heightfield, NO_DATA } from "../heightfield";
import type { GridSpec } from "../types";

function grid(w: number, h: number, cell: number, ox: number, oy: number, fill: (i: number, j: number) => number): Heightfield {
  const spec: GridSpec = { width: w, height: h, cellSize: cell, originX: ox, originY: oy, rowMajor: true };
  const data = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) data[j * w + i] = fill(i, j);
  return new Heightfield(spec, data);
}

// 平面 z = 10 + x*0.5 - y*0.25
const plane = (x: number, y: number) => 10 + x * 0.5 - y * 0.25;

describe("T-TER-01 interpolation golden (bilinear)", () => {
  it("interior bilinear matches plane", () => {
    const h = grid(20, 20, 1, 0, 0, (_i, _j) => plane(0, 0));
    for (let j = 0; j < 20; j++) for (let i = 0; i < 20; i++) h.data[j * 20 + i] = plane(i, j);
    for (const [x, y] of [[5.3, 7.2], [12.7, 3.9], [0.5, 0.5], [19.0, 19.0]]) {
      const r = h.getElevation(x, y);
      expect(r.z).not.toBeNull();
      expect(r.z!).toBeCloseTo(plane(x, y), 6);
    }
  });

  it("last row/column degrade without error (FN-F04)", () => {
    const h = grid(5, 5, 1, 0, 0, (i, j) => plane(i, j));
    const r = h.getElevation(4.0, 2.0);
    expect(r.z).not.toBeNull();
    const corner = h.getElevation(4.0, 4.0);
    expect(corner.z).not.toBeNull();
  });

  it("rejects grid size mismatch", () => {
    const spec: GridSpec = { width: 2, height: 2, cellSize: 1, originX: 0, originY: 0, rowMajor: true };
    expect(() => new Heightfield(spec, new Float32Array(5))).toThrow(/TER-GRID-SIZE/);
  });
});

describe("T-TER-02 no-data and bounds", () => {
  it("outside returns null with outside reason", () => {
    const h = grid(5, 5, 1, 0, 0, (i, j) => plane(i, j));
    const r = h.getElevation(5.5, 2);
    expect(r.z).toBeNull();
    expect(r.noDataReason).toBe("outside");
  });

  it("hole (no-data neighbor) returns null with hole reason", () => {
    const h = grid(5, 5, 1, 0, 0, (i, j) => plane(i, j));
    h.data[2 * 5 + 2] = NO_DATA; // セル(2,2)
    const r = h.getElevation(2.5, 2.5);
    expect(r.z).toBeNull();
    expect(r.noDataReason).toBe("hole");
  });

  it("sentinel collision: input z === -9999 treated as no-data", () => {
    const h = grid(3, 3, 1, 0, 0, (_i, _j) => 1);
    h.data[1] = NO_DATA;
    expect(h.isNoData(1, 0)).toBe(true);
  });

  it("bounds follows cell-center rule", () => {
    const h = grid(7, 5, 2.5, 100, -50, (_i, _j) => 1);
    expect(h.bounds()).toEqual({ minX: 100, maxX: 100 + 6 * 2.5, minY: -50, maxY: -50 + 4 * 2.5 });
    expect(h.contains(100, -50)).toBe(true);
    expect(h.contains(114.9, -40)).toBe(true);
    expect(h.contains(115.1, -50)).toBe(false);
  });
});