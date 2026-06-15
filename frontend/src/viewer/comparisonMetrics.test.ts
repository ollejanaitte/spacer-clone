import { describe, expect, it } from "vitest";
import {
  createDefaultProject,
  createSuspendedDeckProject,
} from "../data/defaultProject";
import type { AnalysisResult, EigenModeResult, NodeReactionResult } from "../types";
import {
  buildComparisonMetrics,
  COMPARISON_NULL_LABEL,
  COMPARISON_REACTION_NOT_COMPUTED_LABEL,
  computeReductionPercent,
  findMode,
  horizontalMagnitude,
  maxHorizontalModeComponent,
  maxReactionMagnitude,
  collectPeriods,
} from "./comparisonMetrics";

function makeEigenResult(
  modes: Array<Pick<EigenModeResult, "modeNo" | "period" | "shape">>,
): AnalysisResult {
  return {
    projectId: "test",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "eigen",
      status: "success",
      startedAt: "2026-06-15T00:00:00Z",
      finishedAt: "2026-06-15T00:00:00Z",
      durationMs: 0,
      nodeCount: 1,
      memberCount: 0,
      loadCaseCount: 0,
      totalDof: 6,
      freeDof: 6,
      constrainedDof: 0,
      solver: "scipy_eigh",
    },
    displacements: [],
    reactions: [],
    memberEndForces: [],
    eigenResult: {
      massCaseId: "MASS_BRIDGE",
      normalization: "mass",
      modes: modes.map((mode) => ({
        eigenvalue: 1,
        circularFrequency: 1,
        frequency: 1,
        modeNo: mode.modeNo,
        period: mode.period,
        modalMass: 1,
        participationFactors: [],
        effectiveMassRatios: [],
        shape: mode.shape,
      })),
    },
    warnings: [],
    errors: [],
  };
}

function makeReactions(items: AnalysisResult["reactions"]): AnalysisResult {
  return {
    projectId: "test",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "linear_static",
      status: "success",
      startedAt: "2026-06-15T00:00:00Z",
      finishedAt: "2026-06-15T00:00:00Z",
      durationMs: 0,
      nodeCount: 1,
      memberCount: 0,
      loadCaseCount: 1,
      totalDof: 6,
      freeDof: 1,
      constrainedDof: 5,
      solver: "scipy_sparse",
    },
    displacements: [],
    reactions: items.map((it) => ({ ...it, loadCaseId: "LC1", constrainedDofs: [] })),
    memberEndForces: [],
    warnings: [],
    errors: [],
  };
}

describe("computeReductionPercent", () => {
  it("computes a 60% reduction for A=100, B=40", () => {
    expect(computeReductionPercent(100, 40)).toBeCloseTo(60, 6);
  });

  it("computes a -25% change (i.e. 25% increase) for A=100, B=125", () => {
    expect(computeReductionPercent(100, 125)).toBeCloseTo(-25, 6);
  });

  it("returns null when A is 0 (avoid division by zero)", () => {
    expect(computeReductionPercent(0, 5)).toBeNull();
  });

  it("returns null when A or B is missing", () => {
    expect(computeReductionPercent(null, 5)).toBeNull();
    expect(computeReductionPercent(5, undefined)).toBeNull();
  });

  it("returns null when either value is non-finite", () => {
    expect(computeReductionPercent(Number.NaN, 5)).toBeNull();
    expect(computeReductionPercent(5, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("returns 0 when A and B are equal", () => {
    expect(computeReductionPercent(10, 10)).toBe(0);
  });
});

describe("horizontalMagnitude", () => {
  it("returns sqrt(ux^2 + uz^2) and ignores the Y component", () => {
    expect(horizontalMagnitude(3, 4, 100)).toBeCloseTo(5, 6);
  });

  it("returns 0 for a stationary node", () => {
    expect(horizontalMagnitude(0, 0, 0)).toBe(0);
  });

  it("does not include the Y component in the magnitude", () => {
    const onlyY = horizontalMagnitude(0, 0, 9999);
    expect(onlyY).toBe(0);
  });

  it("matches the Pythagorean length of the X/Z projection", () => {
    expect(horizontalMagnitude(0.6, 0.8, 5)).toBeCloseTo(1, 6);
  });
});

describe("maxHorizontalModeComponent", () => {
  it("returns the largest sqrt(ux^2 + uz^2) across the shape", () => {
    const shape = [
      { nodeId: "A", ux: 0, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 },
      { nodeId: "B", ux: 0.3, uy: 1, uz: 0.4, rx: 0, ry: 0, rz: 0 },
      { nodeId: "C", ux: 0.6, uy: 0, uz: 0.8, rx: 0, ry: 0, rz: 0 },
    ];
    expect(maxHorizontalModeComponent(shape)).toBeCloseTo(1, 6);
  });

  it("ignores Y components even when they are large", () => {
    const shape = [
      { nodeId: "A", ux: 0, uy: 100, uz: 0, rx: 0, ry: 0, rz: 0 },
      { nodeId: "B", ux: 0, uy: 1000, uz: 0, rx: 0, ry: 0, rz: 0 },
    ];
    expect(maxHorizontalModeComponent(shape)).toBe(0);
  });

  it("returns null for an empty shape", () => {
    expect(maxHorizontalModeComponent([])).toBeNull();
  });
});

describe("maxReactionMagnitude", () => {
  it("prefers the Y (vertical) component for pier reactions", () => {
    const r = maxReactionMagnitude([
      { nodeId: "B1", fx: 1, fy: -200, fz: 0, mx: 0, my: 0, mz: 0 , loadCaseId: "LC1", constrainedDofs: [] },
      { nodeId: "B2", fx: 2, fy: -150, fz: 0, mx: 0, my: 0, mz: 0 , loadCaseId: "LC1", constrainedDofs: [] },
    ]);
    expect(r?.magnitude).toBeCloseTo(200, 6);
    expect(r?.verticalOnly).toBe(true);
  });

  it("falls back to 3D magnitude when no vertical reaction exists", () => {
    const r = maxReactionMagnitude([
      { nodeId: "B1", fx: 3, fy: 0, fz: 4, mx: 0, my: 0, mz: 0 , loadCaseId: "LC1", constrainedDofs: [] },
    ]);
    expect(r?.magnitude).toBeCloseTo(5, 6);
    expect(r?.verticalOnly).toBe(false);
  });

  it("returns null when no reaction is available", () => {
    expect(maxReactionMagnitude(null)).toBeNull();
    expect(maxReactionMagnitude([])).toBeNull();
  });
});

describe("collectPeriods", () => {
  it("returns the first three sorted periods", () => {
    const result = makeEigenResult([
      { modeNo: 2, period: 0.5, shape: [] },
      { modeNo: 1, period: 1.2, shape: [] },
      { modeNo: 3, period: 0.25, shape: [] },
      { modeNo: 5, period: 0.1, shape: [] },
    ]);
    expect(collectPeriods(result)).toEqual([1.2, 0.5, 0.25]);
  });

  it("pads with nulls when fewer than three modes are available", () => {
    const result = makeEigenResult([{ modeNo: 1, period: 2.0, shape: [] }]);
    expect(collectPeriods(result)).toEqual([2.0, null, null]);
  });

  it("returns three nulls when eigenResult is missing", () => {
    expect(collectPeriods(null)).toEqual([null, null, null]);
  });

  it("returns three nulls when the result has errors", () => {
    const result = makeEigenResult([{ modeNo: 1, period: 1, shape: [] }]);
    const errored: AnalysisResult = { ...result, errors: [{ code: "X", message: "x", path: null, entityType: null, entityId: null }] };
    expect(collectPeriods(errored)).toEqual([null, null, null]);
  });
});

describe("findMode", () => {
  it("returns the selected mode when present", () => {
    const result = makeEigenResult([
      { modeNo: 1, period: 1, shape: [] },
      { modeNo: 2, period: 0.5, shape: [] },
    ]);
    const mode = findMode(result, 2);
    expect(mode?.modeNo).toBe(2);
  });

  it("falls back to the first sorted mode when the selected one is missing", () => {
    const result = makeEigenResult([{ modeNo: 5, period: 0.5, shape: [] }]);
    expect(findMode(result, 1)?.modeNo).toBe(5);
  });

  it("returns null when there is no eigen result", () => {
    expect(findMode(null, 1)).toBeNull();
  });
});

describe("buildComparisonMetrics", () => {
  it("reports periods 1-3 from eigen results in sorted order", () => {
    const left = makeEigenResult([
      { modeNo: 1, period: 2.8, shape: [] },
      { modeNo: 2, period: 1.4, shape: [] },
      { modeNo: 3, period: 0.9, shape: [] },
    ]);
    const right = makeEigenResult([
      { modeNo: 1, period: 1.45, shape: [] },
      { modeNo: 2, period: 0.8, shape: [] },
      { modeNo: 3, period: 0.6, shape: [] },
    ]);
    const metrics = buildComparisonMetrics({
      leftProject: createDefaultProject(),
      rightProject: createSuspendedDeckProject(),
      leftResult: left,
      rightResult: right,
    });
    expect(metrics.periods.mode1.left).toBe(2.8);
    expect(metrics.periods.mode1.right).toBe(1.45);
    expect(metrics.periods.mode2.right).toBe(0.8);
    expect(metrics.periods.mode3.right).toBe(0.6);
  });

  it("uses a dash placeholder for missing periods", () => {
    const metrics = buildComparisonMetrics({
      leftProject: createDefaultProject(),
      rightProject: createSuspendedDeckProject(),
      leftResult: null,
      rightResult: null,
    });
    const periodRow = metrics.rows.find((row) => row.key === "period-1");
    expect(periodRow?.leftDisplay).toBe(COMPARISON_NULL_LABEL);
    expect(periodRow?.rightDisplay).toBe(COMPARISON_NULL_LABEL);
  });

  it("reports a percentage reduction for the horizontal mode component", () => {
    const shape = (ux: number, uz: number) => [
      { nodeId: "A", ux, uy: 0, uz, rx: 0, ry: 0, rz: 0 },
    ];
    const left = makeEigenResult([{ modeNo: 1, period: 2, shape: shape(0.1, 0) }]);
    const right = makeEigenResult([{ modeNo: 1, period: 1, shape: shape(0.04, 0) }]);
    const metrics = buildComparisonMetrics({
      leftProject: createDefaultProject(),
      rightProject: createSuspendedDeckProject(),
      leftResult: left,
      rightResult: right,
    });
    expect(metrics.maxHorizontalModeComponent.left).toBeCloseTo(0.1, 6);
    expect(metrics.maxHorizontalModeComponent.right).toBeCloseTo(0.04, 6);
    expect(metrics.maxHorizontalModeComponent.reductionPercent).toBeCloseTo(60, 6);
  });

  it("uses the Y component for the max-reaction row when present", () => {
    const left = makeReactions([
      { nodeId: "B1", fx: 0, fy: -6500, fz: 0, mx: 0, my: 0, mz: 0 , loadCaseId: "LC1", constrainedDofs: [] },
    ]);
    const right = makeReactions([
      { nodeId: "B1", fx: 0, fy: -2800, fz: 0, mx: 0, my: 0, mz: 0 , loadCaseId: "LC1", constrainedDofs: [] },
    ]);
    const metrics = buildComparisonMetrics({
      leftProject: createDefaultProject(),
      rightProject: createSuspendedDeckProject(),
      leftResult: left,
      rightResult: right,
    });
    expect(metrics.maxReaction.left).toBeCloseTo(6500, 6);
    expect(metrics.maxReaction.right).toBeCloseTo(2800, 6);
    expect(metrics.maxReaction.reductionPercent).toBeCloseTo(56.923, 2);
  });

  it("marks missing reactions as 未計算", () => {
    const metrics = buildComparisonMetrics({
      leftProject: createDefaultProject(),
      rightProject: createSuspendedDeckProject(),
      leftResult: null,
      rightResult: null,
    });
    const reactionRow = metrics.rows.find((row) => row.key === "max-reaction");
    expect(reactionRow?.leftDisplay).toBe(COMPARISON_REACTION_NOT_COMPUTED_LABEL);
    expect(reactionRow?.rightDisplay).toBe(COMPARISON_REACTION_NOT_COMPUTED_LABEL);
    expect(metrics.maxReaction.reductionPercent).toBeNull();
  });

  it("renders a Japanese reduction comment when the right side is smaller", () => {
    const left = makeEigenResult([
      { modeNo: 1, period: 2, shape: [{ nodeId: "A", ux: 0.1, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 }] },
    ]);
    const right = makeEigenResult([
      { modeNo: 1, period: 1, shape: [{ nodeId: "A", ux: 0.03, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 }] },
    ]);
    const metrics = buildComparisonMetrics({
      leftProject: createDefaultProject(),
      rightProject: createSuspendedDeckProject(),
      leftResult: left,
      rightResult: right,
    });
    expect(metrics.comment).toMatch(/B案/);
  });

  it("falls back to a placeholder comment when nothing is computed", () => {
    const metrics = buildComparisonMetrics({
      leftProject: createDefaultProject(),
      rightProject: createSuspendedDeckProject(),
      leftResult: null,
      rightResult: null,
    });
    expect(metrics.comment).toMatch(/固有値解析/);
  });

  it("row reductionDisplay reflects the (A-B)/A formula", () => {
    const left = makeEigenResult([{ modeNo: 1, period: 2, shape: [] }]);
    const right = makeEigenResult([{ modeNo: 1, period: 1, shape: [] }]);
    const metrics = buildComparisonMetrics({
      leftProject: createDefaultProject(),
      rightProject: createSuspendedDeckProject(),
      leftResult: left,
      rightResult: right,
    });
    const periodRow = metrics.rows.find((row) => row.key === "period-1");
    expect(periodRow?.reductionDisplay).toBe("50%低減");
  });
});



describe("A/B plan identity", () => {
  it("uses different project names and ids for A and B", () => {
    const a = createDefaultProject();
    const b = createSuspendedDeckProject();
    expect(a.project.id).not.toBe(b.project.id);
    expect(a.project.name).not.toBe(b.project.name);
  });

  it("produces different node / member counts for the suspended variant", () => {
    const a = createDefaultProject();
    const b = createSuspendedDeckProject();
    expect(b.nodes.length).toBeGreaterThan(a.nodes.length);
    expect(b.members.length).toBeGreaterThan(a.members.length);
  });

  it("includes the G3L and G3R nodes in the suspended variant", () => {
    const b = createSuspendedDeckProject();
    const ids = new Set(b.nodes.map((n) => n.id));
    expect(ids.has("G3L")).toBe(true);
    expect(ids.has("G3R")).toBe(true);
  });

  it("does not merge G3L and G3R into a single shared node", () => {
    const b = createSuspendedDeckProject();
    const g3l = b.nodes.find((n) => n.id === "G3L");
    const g3r = b.nodes.find((n) => n.id === "G3R");
    expect(g3l).toBeDefined();
    expect(g3r).toBeDefined();
    expect(g3l?.id).not.toBe(g3r?.id);
    // The two nodes must have distinct coordinates as well, otherwise the
    // model degenerates to the continuous variant.
    expect(g3l?.z).not.toBe(g3r?.z);
  });
});

describe("buildComparisonMetrics: null fallback and independence", () => {
  it("does not silently substitute leftResult for rightResult", () => {
    const aResult = makeEigenResult([{ modeNo: 1, period: 0.05, shape: [] }]);
    const bResult = makeEigenResult([{ modeNo: 1, period: 0.02, shape: [] }]);
    const metrics = buildComparisonMetrics({
      leftProject: createDefaultProject(),
      rightProject: createSuspendedDeckProject(),
      leftResult: aResult,
      rightResult: bResult,
    });
    // If rightResult were silently replaced by leftResult, both periods
    // would be 0.05. Verify the right value is preserved.
    expect(metrics.periods.mode1.left).toBe(0.05);
    expect(metrics.periods.mode1.right).toBe(0.02);
  });

  it("renders the right plan as a dash when rightResult is null", () => {
    const aResult = makeEigenResult([{ modeNo: 1, period: 0.1, shape: [] }]);
    const metrics = buildComparisonMetrics({
      leftProject: createDefaultProject(),
      rightProject: createSuspendedDeckProject(),
      leftResult: aResult,
      rightResult: null,
    });
    expect(metrics.periods.mode1.left).toBe(0.1);
    expect(metrics.periods.mode1.right).toBeNull();
    const periodRow = metrics.rows.find((row) => row.key === "period-1");
    expect(periodRow?.rightDisplay).toBe(COMPARISON_NULL_LABEL);
  });

  it("reflects the right plan's mode shape in the max horizontal component", () => {
    const shape = (ux: number, uz: number) => [
      { nodeId: "G3L", ux, uy: 0, uz, rx: 0, ry: 0, rz: 0 },
      { nodeId: "G3R", ux: -ux, uy: 0, uz: -uz, rx: 0, ry: 0, rz: 0 },
    ];
    const a = makeEigenResult([{ modeNo: 1, period: 0.1, shape: shape(0.2, 0) }]);
    const b = makeEigenResult([{ modeNo: 1, period: 0.1, shape: shape(0.05, 0) }]);
    const metrics = buildComparisonMetrics({
      leftProject: createDefaultProject(),
      rightProject: createSuspendedDeckProject(),
      leftResult: a,
      rightResult: b,
    });
    expect(metrics.maxHorizontalModeComponent.left).toBeCloseTo(0.2, 6);
    expect(metrics.maxHorizontalModeComponent.right).toBeCloseTo(0.05, 6);
  });

  it("treats left and right as independent when calling the comparison twice with swapped results", () => {
    const a = makeEigenResult([{ modeNo: 1, period: 0.5, shape: [] }]);
    const b = makeEigenResult([{ modeNo: 1, period: 0.25, shape: [] }]);
    const m1 = buildComparisonMetrics({
      leftProject: createDefaultProject(),
      rightProject: createSuspendedDeckProject(),
      leftResult: a,
      rightResult: b,
    });
    const m2 = buildComparisonMetrics({
      leftProject: createDefaultProject(),
      rightProject: createSuspendedDeckProject(),
      leftResult: b,
      rightResult: a,
    });
    // The metrics must follow the slot, not the previously computed value.
    expect(m1.periods.mode1.left).toBe(0.5);
    expect(m1.periods.mode1.right).toBe(0.25);
    expect(m2.periods.mode1.left).toBe(0.25);
    expect(m2.periods.mode1.right).toBe(0.5);
  });
});
