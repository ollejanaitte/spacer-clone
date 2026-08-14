import { describe, expect, it } from "vitest";
import {
  computeFoundationElevations,
  computePileTip,
  buildPileArrangement,
  validateFoundationData,
} from "../substructureFoundation";
import type { FootingConfiguration, PileConfiguration } from "../substructureTypes";

const footing: FootingConfiguration = { id: "ft", length: 10.0, width: 6.0, thickness: 2.0, topElevation: 99.0 };
const pile: PileConfiguration = { id: "pg", pileType: "bored_pile", diameter: 1.2, length: 20.0, pileCount: 6, spacing: { x: 3.0, y: 2.5 }, rows: null, cols: null, edgeX: null, edgeY: null };

describe("Substructure foundation (WP-F)", () => {
  it("computes embedment (FROZEN: ground - footingBottom) (T6-GEO-005/T6-TER-002)", () => {
    const e = computeFoundationElevations(footing, 95.0);
    expect(e.footingBottomElevation).toBe(97.0); // 99 - 2
    expect(e.embedmentM).toBe(-2.0); // 95 - 97 (ground below footing bottom)
    expect(e.pileHeadElevation).toBe(97.0); // derived = footing bottom
  });

  it("returns NOT_AVAILABLE for embedment when terrain missing (T6-TER-003)", () => {
    const e = computeFoundationElevations(footing, null);
    expect(e.embedmentM).toBeNull();
    expect(e.pileHeadElevation).toBeNull();
  });

  it("computes pile tip = pile head - length (T6-GEO-005)", () => {
    const tip = computePileTip(97.0, pile);
    expect(tip).toBe(77.0);
  });

  it("builds pile arrangement via KEEP derivePileLayout/buildPileGrid (T6-GEO-005)", () => {
    const { layout, positions } = buildPileArrangement(pile, footing, "P1");
    expect(layout.rows * layout.cols).toBeGreaterThanOrEqual(6);
    expect(positions).toHaveLength(layout.rows * layout.cols);
    // deterministic IDs
    expect(positions[0].id).toContain("P1");
  });

  it("validates foundation data (positive/finite) (T6-GEO-006)", () => {
    expect(validateFoundationData({ footingConfigurations: [footing], pileConfigurations: [pile] })).toEqual([]);
    const badPile = { ...pile, diameter: -1 };
    const issues = validateFoundationData({ footingConfigurations: [footing], pileConfigurations: [badPile] });
    expect(issues.some((i) => i.path.includes("diameter"))).toBe(true);
    const badCount = { ...pile, pileCount: 0 };
    expect(validateFoundationData({ footingConfigurations: [footing], pileConfigurations: [badCount] }).some((i) => i.message.includes("pileCount"))).toBe(true);
  });

  it("uses the declared grid (rows/cols/edge) as canonical when present (B-06)", () => {
    const gridPile: PileConfiguration = { ...pile, pileCount: 6, rows: 3, cols: 2, spacing: { x: 3.0, y: 2.5 }, edgeX: 0.5, edgeY: 0.5 };
    const { layout, positions } = buildPileArrangement(gridPile, footing, "P1");
    expect(layout.rows).toBe(3);
    expect(layout.cols).toBe(2);
    expect(layout.edgeX).toBe(0.5);
    expect(layout.edgeY).toBe(0.5);
    expect(positions).toHaveLength(6);
  });

  it("rejects rows*cols != pileCount (fail-closed, B-06)", () => {
    const badGrid = { ...pile, pileCount: 6, rows: 2, cols: 2 };
    const issues = validateFoundationData({ footingConfigurations: [footing], pileConfigurations: [badGrid] });
    expect(issues.some((i) => i.message.includes("rows*cols"))).toBe(true);
  });
});
