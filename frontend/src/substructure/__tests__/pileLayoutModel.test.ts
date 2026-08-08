// Phase C1 (M2-04) pileLayoutModel 純粋ロジックテスト
import { describe, it, expect } from "vitest";
import {
  autoArrange,
  computePilePlan,
  DEFAULT_PILE_UI_STATE,
  pileCoordinates,
  validatePileLayout,
  type PileUiState,
} from "../planning/piles/pileLayoutModel";

function state(overrides: Partial<PileUiState> = {}): PileUiState {
  return { ...DEFAULT_PILE_UI_STATE, ...overrides };
}

describe("validatePileLayout", () => {
  it("default layout is valid", () => {
    expect(validatePileLayout(state()).some((i) => i.severity === "fatal")).toBe(false);
  });

  it("non-positive footing dims are fatal", () => {
    const s = state({ footingLength: 0 });
    const issues = validatePileLayout(s);
    expect(issues.some((i) => i.severity === "fatal")).toBe(true);
  });

  it("grid exceeding footing is fatal", () => {
    // 3x2 spacing 3.6 → span 7.2; footing 6 wide → はみ出す
    const s = state({ footingLength: 6, footingWidth: 6, spacingX: 3.6, spacingY: 3.6 });
    const issues = validatePileLayout(s);
    expect(issues.some((i) => i.severity === "fatal")).toBe(true);
  });

  it("zero pile diameter fatal", () => {
    const s = state({ pileDiameter: 0 });
    expect(validatePileLayout(s).some((i) => i.severity === "fatal")).toBe(true);
  });
});

describe("computePilePlan", () => {
  it("3x2 grid with stable IDs (reuses M1 buildPileGrid)", () => {
    const plan = computePilePlan(state(), "A1")!;
    expect(plan).not.toBeNull();
    expect(plan.positions).toHaveLength(6);
    expect(plan.positions[0].id).toBe("A1-PILE-01");
    expect(plan.positions[5].id).toBe("A1-PILE-06");
  });

  it("2D preview parity: positions match coordinates table", () => {
    const plan = computePilePlan(state(), "A1")!;
    const table = pileCoordinates(plan);
    expect(table).toHaveLength(plan.positions.length);
    table.forEach((row, i) => {
      expect(row.x).toBe(plan.positions[i].x);
      expect(row.y).toBe(plan.positions[i].y);
    });
  });

  it("edge distance derived when null", () => {
    const plan = computePilePlan(state(), "A1")!;
    expect(plan.edgeX).toBeGreaterThan(0);
    expect(plan.edgeY).toBeGreaterThan(0);
  });

  it("returns null on fatal layout", () => {
    const plan = computePilePlan(state({ footingLength: 0 }), "A1");
    expect(plan).toBeNull();
  });

  it("NxN layout", () => {
    const s = state({ rows: 3, cols: 3, spacingX: 2.5, spacingY: 2.5, footingLength: 8, footingWidth: 8 });
    const plan = computePilePlan(s, "P1")!;
    expect(plan.positions).toHaveLength(9);
  });

  it("spacing change updates positions", () => {
    const a = computePilePlan(state({ spacingX: 3.0 }), "A1")!;
    const b = computePilePlan(state({ spacingX: 4.0 }), "A1")!;
    // 端の杭は -spanX/2 → 3.0: -3, 4.0: -4
    expect(a.positions[0].x).toBeCloseTo(-3, 6);
    expect(b.positions[0].x).toBeCloseTo(-4, 6);
    expect(a.positions[0].x).toBeGreaterThan(b.positions[0].x);
  });

  it("pile diameter change does not change positions (layout only)", () => {
    const a = computePilePlan(state({ pileDiameter: 1.0 }), "A1")!;
    const b = computePilePlan(state({ pileDiameter: 1.6 }), "A1")!;
    expect(a.positions).toEqual(b.positions);
  });
});

describe("autoArrange", () => {
  it("derives rows/cols/edge from footprint", () => {
    const next = autoArrange(state({ rows: 6, cols: 6 }), 12, 8);
    expect(next.rows * next.cols).toBeGreaterThanOrEqual(6);
    expect(next.edgeX).toBeGreaterThanOrEqual(0);
    expect(next.edgeY).toBeGreaterThanOrEqual(0);
  });
});
