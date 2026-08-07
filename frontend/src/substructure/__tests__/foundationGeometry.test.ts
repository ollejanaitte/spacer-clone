// Phase C1 (I03C) 基礎・杭ジオメトリ生成 テスト
import { describe, it, expect } from "vitest";
import {
  buildFoundationSolids,
  buildPileGrid,
  derivePileLayout,
  type PileLayout,
} from "../FoundationSolidGenerator";
import { buildSupportSolids } from "../SubstructureSolidGenerator";
import { transformFromSnapshot, localToWorld } from "../geometryBase";
import type { SupportPlacementSnapshot, Footing, PileGroup, Support } from "../model";

const snapshot: SupportPlacementSnapshot = {
  source: "liner",
  position: { x: 300, y: 150, z: 6 },
  tangent: { x: 1, y: 0, z: 0 },
  transverse: { x: 0, y: 1, z: 0 },
  vertical: { x: 0, y: 0, z: 1 },
  azimuthRad: 0,
  skewRad: 0,
};
const tf = () => transformFromSnapshot(snapshot);

const footing: Footing = {
  id: "A1-FOOTING",
  length: 12,
  width: 8,
  thickness: 1.5,
  topElevation: 0,
};

const bored: PileGroup = {
  id: "A1-PILES",
  pileType: "bored_pile",
  diameter: 1.2,
  length: 18,
  pileCount: 6,
  spacing: { x: 3.6, y: 3.6 },
};

const steel: PileGroup = {
  id: "A1-PILES",
  pileType: "steel_pipe",
  diameter: 0.8,
  length: 22,
  pileCount: 9,
  spacing: { x: 2.8, y: 2.8 },
};

describe("footing geometry", () => {
  it("generates footing box at bottom center", () => {
    const g = buildFoundationSolids("A1", footing, null, tf());
    expect(g.solids).toHaveLength(1);
    const f = g.solids[0];
    expect(f.id).toBe("A1-FOOTING");
    expect(f.kind).toBe("box");
    expect(f.localSize).toEqual({ x: 12, y: 8, z: 1.5 });
    expect(f.localCenter.z).toBeCloseTo(-1.5 / 2, 6);
  });
});

describe("pile grid layout", () => {
  it("generates NX series and symmetric centers", () => {
    const layout: PileLayout = { rows: 3, cols: 2, spacingX: 3.6, spacingY: 3.6, edgeX: 0, edgeY: 0 };
    const grid = buildPileGrid(layout, 12, 8, "A1");
    expect(grid).toHaveLength(6);
    expect(grid.map((p) => p.id)).toEqual([
      "A1-PILE-01",
      "A1-PILE-02",
      "A1-PILE-03",
      "A1-PILE-04",
      "A1-PILE-05",
      "A1-PILE-06",
    ]);
    expect(grid[0].x).toBeCloseTo(-3.6, 6);
    expect(grid[0].y).toBeCloseTo(-1.8, 6);
    expect(grid[5].x).toBeCloseTo(3.6, 6);
    expect(grid[5].y).toBeCloseTo(1.8, 6);
  });

  it("derivePileLayout yields rows/cols and non-negative edge distance", () => {
    const l = derivePileLayout(12, 8, { pileCount: 6, spacing: { x: 3.6, y: 3.6 } });
    expect(l.rows * l.cols).toBeGreaterThanOrEqual(6);
    expect(l.edgeX).toBeGreaterThanOrEqual(0);
    expect(l.edgeY).toBeGreaterThanOrEqual(0);
  });
});

describe("piled foundation", () => {
  it("bored pile: footing + piles, cylinder kind, bottom-anchored", () => {
    const g = buildFoundationSolids("A1", footing, bored, tf());
    const piles = g.solids.filter((s) => s.entity === "pile");
    expect(g.solids[0].entity).toBe("footing");
    expect(piles.length).toBeGreaterThanOrEqual(6);
    expect(piles.every((p) => p.kind === "cylinder")).toBe(true);
    expect(piles.every((p) => p.material === "foundation.boredPile")).toBe(true);
    expect(piles[0].localSize.x).toBeCloseTo(1.2, 6);
    // 杭中心 = フーチング底面 - length/2
    expect(piles[0].localCenter.z).toBeCloseTo(-1.5 - 18 / 2, 6);
  });

  it("steel pipe pile material and diameter", () => {
    const g = buildFoundationSolids("A1", footing, steel, tf());
    const piles = g.solids.filter((s) => s.entity === "pile");
    expect(piles.every((p) => p.material === "foundation.steelPile")).toBe(true);
    expect(piles.every((p) => p.localSize.x === 0.8)).toBe(true);
  });
});

describe("local/world placement", () => {
  it("maps pile world via snapshot origin", () => {
    const g = buildFoundationSolids("A1", footing, bored, tf());
    const pile = g.solids.find((s) => s.entity === "pile")!;
    const world = localToWorld(pile.localCenter, g.transform);
    // ワールド = origin + ローカルオフセット（杭は中心基準に対称配置）
    const localX = pile.localCenter.x;
    expect(world.x).toBeCloseTo(300 + localX, 6);
    expect(world.y).toBeCloseTo(150 + pile.localCenter.y, 6);
    expect(world.z).toBeCloseTo(6 + pile.localCenter.z, 6);
    expect(world.z).toBeLessThan(6);
  });
});

describe("dispatcher wiring (I03C)", () => {
  function sup(): Support {
    return {
      supportId: "A1",
      supportType: "abutment",
      skewRad: 0,
      placement: { source: "liner", alignmentId: "aln", station: 0, offset: 0 },
      bearingSeats: [],
      abutment: {
        id: "A1",
        formType: "inverted_t",
        backwall: { id: "A1-BW", height: 5, thickness: 0.8, width: 11, seatElevation: 8 },
        wingWallL: { id: "A1-WL", length: 4, height: 5, thickness: 0.5 },
        wingWallR: { id: "A1-WR", length: 4, height: 5, thickness: 0.5 },
        footing,
        pileGroup: bored,
      },
    };
  }

  it("buildSupportSolids includes footing + piles", () => {
    const map = new Map<string, SupportPlacementSnapshot>([["A1", snapshot]]);
    const g = buildSupportSolids(sup(), map);
    expect(g.solids.some((s) => s.id === "A1-FOOTING")).toBe(true);
    expect(g.solids.some((s) => s.entity === "pile")).toBe(true);
    expect(g.solids.some((s) => s.id === "A1-BACKWALL")).toBe(true);
  });

  it("throws when snapshot missing (fail-closed)", () => {
    expect(() => buildSupportSolids(sup(), new Map())).toThrow();
  });
});

describe("invalid input fail-closed", () => {
  it("throws on non-positive footing thickness", () => {
    expect(() =>
      buildFoundationSolids("A1", { ...footing, thickness: 0 }, null, tf()),
    ).toThrow();
  });

  it("throws on non-positive pile diameter", () => {
    expect(() =>
      buildFoundationSolids("A1", footing, { ...bored, diameter: 0 }, tf()),
    ).toThrow();
  });
});

describe("deterministic regeneration", () => {
  it("same input produces identical solids", () => {
    const a = buildFoundationSolids("A1", footing, bored, tf());
    const b = buildFoundationSolids("A1", footing, bored, tf());
    expect(a).toEqual(b);
  });
});