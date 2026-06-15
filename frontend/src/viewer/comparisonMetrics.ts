import type { AnalysisResult, EigenModeResult, ProjectModel } from "../types";

/**
 * Pure helpers for building the Phase-2 comparison panel shown when
 * Compare View is on. UI rendering is intentionally kept out of this
 * module so the metrics can be reused and unit-tested in isolation.
 *
 * Conventions used in this project (see `defaultProject.ts`):
 *   - X = bridge axis
 *   - Y = vertical / height
 *   - Z = transverse
 *
 * Therefore "horizontal" displacement = sqrt(ux^2 + uz^2). The vertical
 * Y component is intentionally excluded.
 */

export type ComparisonPeriodSlot = {
  left: number | null;
  right: number | null;
};

export type ComparisonPeriods = {
  mode1: ComparisonPeriodSlot;
  mode2: ComparisonPeriodSlot;
  mode3: ComparisonPeriodSlot;
};

export type ComparisonDirectionalMetric = {
  left: number | null;
  right: number | null;
  reductionPercent: number | null;
};

export type ComparisonMetricRow = {
  key: string;
  label: string;
  left: number | null;
  right: number | null;
  unit: string;
  leftDisplay: string;
  rightDisplay: string;
  reductionDisplay: string;
};

export type ComparisonMetrics = {
  periods: ComparisonPeriods;
  maxHorizontalModeComponent: ComparisonDirectionalMetric;
  maxReaction: ComparisonDirectionalMetric;
  rows: ComparisonMetricRow[];
  comment: string;
};

export type BuildComparisonMetricsInput = {
  leftProject: ProjectModel;
  rightProject: ProjectModel;
  leftResult: AnalysisResult | null;
  rightResult: AnalysisResult | null;
  /** Selected mode number used to evaluate the horizontal mode component. */
  selectedModeNo?: number;
};

const PERIOD_KEYS = ["mode1", "mode2", "mode3"] as const;
const DISPLAY_PERIOD_PRECISION = 2;
const DISPLAY_DISPLACEMENT_PRECISION = 1;
const DISPLAY_REACTION_PRECISION = 0;
const REDUCTION_PERCENT_PRECISION = 0;

const NUMERIC_NULL_LABEL = "-";
const REACTION_NOT_COMPUTED_LABEL = "未計算";

/**
 * Compute the percent change of `right` relative to `left`:
 *   reductionPercent = (left - right) / left * 100
 *
 * When `left` is zero, missing, or non-finite, returns null. The sign
 * matches the spec: positive when right is smaller (reduction), negative
 * when right is larger (increase).
 */
export function computeReductionPercent(
  left: number | null | undefined,
  right: number | null | undefined,
): number | null {
  if (left == null || right == null) return null;
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  if (left === 0) return null;
  return ((left - right) / left) * 100;
}

/**
 * Horizontal magnitude of a single displacement sample.
 *   horizontal = sqrt(ux^2 + uz^2)
 *
 * Y (vertical) is intentionally excluded.
 */
export function horizontalMagnitude(
  ux: number,
  uz: number,
  uy: number,
): number {
  // uy is accepted for forward compatibility with displacement samples
  // that may carry a vertical component; the spec excludes it from the
  // horizontal metric, so we simply ignore it.
  void uy;
  return Math.hypot(ux, uz);
}

/**
 * Pick the largest horizontal component across an array of shape samples.
 * Returns null when no sample is provided.
 */
export function maxHorizontalModeComponent(
  shape: EigenModeResult["shape"],
): number | null {
  if (!shape || shape.length === 0) return null;
  let max = 0;
  let found = false;
  for (const sample of shape) {
    const value = horizontalMagnitude(sample.ux, sample.uz, sample.uy);
    if (!Number.isFinite(value)) continue;
    if (!found || value > max) {
      max = value;
      found = true;
    }
  }
  return found ? max : null;
}

/**
 * Pick the largest reaction magnitude in a result. The reaction array
 * uses a 3-component force vector per constrained node; the magnitude is
 * sqrt(fx^2 + fy^2 + fz^2). Returns null when no reaction is available.
 *
 * The spec notes that the table focuses on "橋脚反力" (pier reaction)
 * which is dominantly vertical. We therefore report the vertical
 * (Y-direction) component when present, falling back to the 3D magnitude
 * so any direction is still surfaced.
 */
export function maxReactionMagnitude(
  reactions: AnalysisResult["reactions"] | null | undefined,
): { magnitude: number; verticalOnly: boolean } | null {
  if (!reactions || reactions.length === 0) return null;
  let vertical = 0;
  let magnitude = 0;
  let hasVertical = false;
  let hasMagnitude = false;
  for (const reaction of reactions) {
    // A truly non-zero vertical component indicates a real pier reaction.
    // We deliberately ignore fy === 0 (no reaction) so that horizontal-only
    // reactions fall through to the 3D magnitude path.
    if (Number.isFinite(reaction.fy) && Math.abs(reaction.fy) > 0) {
      if (!hasVertical || Math.abs(reaction.fy) > vertical) {
        vertical = Math.abs(reaction.fy);
        hasVertical = true;
      }
    }
    const total = Math.hypot(reaction.fx, reaction.fy, reaction.fz);
    if (Number.isFinite(total) && total > 0) {
      if (!hasMagnitude || total > magnitude) {
        magnitude = total;
        hasMagnitude = true;
      }
    }
  }
  if (hasVertical) {
    return { magnitude: vertical, verticalOnly: true };
  }
  if (hasMagnitude) {
    return { magnitude, verticalOnly: false };
  }
  return null;
}

/**
 * Collect the first three eigen periods, sorted by modeNo. Returns an
 * array of length 3 with nulls for missing modes.
 */
export function collectPeriods(
  result: AnalysisResult | null,
): Array<number | null> {
  if (!result || result.errors.length > 0 || !result.eigenResult) {
    return [null, null, null];
  }
  const sorted = [...result.eigenResult.modes].sort(
    (a, b) => a.modeNo - b.modeNo,
  );
  return [0, 1, 2].map((index) => {
    const mode = sorted[index];
    if (!mode) return null;
    if (!Number.isFinite(mode.period)) return null;
    return mode.period;
  });
}

/**
 * Resolve the eigen mode used for the horizontal mode component. The
 * caller may pass a `selectedModeNo`; we fall back to mode 1.
 */
export function findMode(
  result: AnalysisResult | null,
  selectedModeNo: number | undefined,
): EigenModeResult | null {
  if (!result || result.errors.length > 0 || !result.eigenResult) return null;
  const modes = result.eigenResult.modes;
  if (modes.length === 0) return null;
  const targetNo = selectedModeNo ?? 1;
  return (
    modes.find((mode) => mode.modeNo === targetNo) ??
    [...modes].sort((a, b) => a.modeNo - b.modeNo)[0] ??
    null
  );
}

function formatPeriod(period: number | null): string {
  if (period == null) return NUMERIC_NULL_LABEL;
  if (!Number.isFinite(period)) return NUMERIC_NULL_LABEL;
  if (period < 0.001) return "< 0.001 s";
  return `${period.toFixed(DISPLAY_PERIOD_PRECISION)} s`;
}

function formatHorizontal(value: number | null): string {
  if (value == null) return NUMERIC_NULL_LABEL;
  if (!Number.isFinite(value)) return NUMERIC_NULL_LABEL;
  // Eigen mode shapes are unitless / not physical displacements. We
  // therefore label the row as "指標" (indicator) and display the raw
  // value to 4 decimals. A future response-spectrum pipeline can rescale
  // the same metric into millimetres and switch the label.
  return value.toFixed(4);
}

function formatReaction(value: number | null, unit: "kN" | "-"): string {
  if (value == null) return REACTION_NOT_COMPUTED_LABEL;
  if (!Number.isFinite(value)) return REACTION_NOT_COMPUTED_LABEL;
  if (unit === "-") return value.toFixed(DISPLAY_REACTION_PRECISION);
  return `${value.toFixed(DISPLAY_REACTION_PRECISION)} ${unit}`;
}

function formatReduction(percent: number | null): string {
  if (percent == null) return NUMERIC_NULL_LABEL;
  if (!Number.isFinite(percent)) return NUMERIC_NULL_LABEL;
  const abs = Math.abs(percent);
  const rounded = abs.toFixed(REDUCTION_PERCENT_PRECISION);
  if (percent > 0) return `${rounded}%低減`;
  if (percent < 0) return `${rounded}%増加`;
  return "0%";
}

/**
 * Build the comparison metrics used by the Phase-2 panel. Pure
 * function: no I/O, no React, deterministic output. UI formatting is
 * included because both sides of the comparison (left/right cells and
 * the reduction column) need the same string rendering rules, and we
 * want to unit-test them together.
 */
export function buildComparisonMetrics(
  input: BuildComparisonMetricsInput,
): ComparisonMetrics {
  const leftPeriods = collectPeriods(input.leftResult);
  const rightPeriods = collectPeriods(input.rightResult);
  const periods: ComparisonPeriods = {
    mode1: { left: leftPeriods[0], right: rightPeriods[0] },
    mode2: { left: leftPeriods[1], right: rightPeriods[1] },
    mode3: { left: leftPeriods[2], right: rightPeriods[2] },
  };

  const leftMode = findMode(input.leftResult, input.selectedModeNo);
  const rightMode = findMode(input.rightResult, input.selectedModeNo);
  const leftHorizontal = leftMode
    ? maxHorizontalModeComponent(leftMode.shape)
    : null;
  const rightHorizontal = rightMode
    ? maxHorizontalModeComponent(rightMode.shape)
    : null;
  const maxHorizontalModeComponentMetric: ComparisonDirectionalMetric = {
    left: leftHorizontal,
    right: rightHorizontal,
    reductionPercent: computeReductionPercent(leftHorizontal, rightHorizontal),
  };

  const leftReaction = maxReactionMagnitude(
    input.leftResult && input.leftResult.errors.length === 0
      ? input.leftResult.reactions
      : null,
  );
  const rightReaction = maxReactionMagnitude(
    input.rightResult && input.rightResult.errors.length === 0
      ? input.rightResult.reactions
      : null,
  );
  const maxReactionMetric: ComparisonDirectionalMetric = {
    left: leftReaction ? leftReaction.magnitude : null,
    right: rightReaction ? rightReaction.magnitude : null,
    reductionPercent: computeReductionPercent(
      leftReaction ? leftReaction.magnitude : null,
      rightReaction ? rightReaction.magnitude : null,
    ),
  };

  const rows: ComparisonMetricRow[] = [
    {
      key: "period-1",
      label: "1次周期",
      left: periods.mode1.left,
      right: periods.mode1.right,
      unit: "s",
      leftDisplay: formatPeriod(periods.mode1.left),
      rightDisplay: formatPeriod(periods.mode1.right),
      reductionDisplay: formatReduction(
        computeReductionPercent(periods.mode1.left, periods.mode1.right),
      ),
    },
    {
      key: "period-2",
      label: "2次周期",
      left: periods.mode2.left,
      right: periods.mode2.right,
      unit: "s",
      leftDisplay: formatPeriod(periods.mode2.left),
      rightDisplay: formatPeriod(periods.mode2.right),
      reductionDisplay: formatReduction(
        computeReductionPercent(periods.mode2.left, periods.mode2.right),
      ),
    },
    {
      key: "period-3",
      label: "3次周期",
      left: periods.mode3.left,
      right: periods.mode3.right,
      unit: "s",
      leftDisplay: formatPeriod(periods.mode3.left),
      rightDisplay: formatPeriod(periods.mode3.right),
      reductionDisplay: formatReduction(
        computeReductionPercent(periods.mode3.left, periods.mode3.right),
      ),
    },
    {
      key: "horizontal-mode",
      label: "最大水平モード成分 (指標)",
      left: maxHorizontalModeComponentMetric.left,
      right: maxHorizontalModeComponentMetric.right,
      unit: "-",
      leftDisplay: formatHorizontal(maxHorizontalModeComponentMetric.left),
      rightDisplay: formatHorizontal(maxHorizontalModeComponentMetric.right),
      reductionDisplay: formatReduction(
        maxHorizontalModeComponentMetric.reductionPercent,
      ),
    },
    {
      key: "max-reaction",
      label: "最大橋脚反力",
      left: maxReactionMetric.left,
      right: maxReactionMetric.right,
      unit: "kN",
      leftDisplay: formatReaction(maxReactionMetric.left, "kN"),
      rightDisplay: formatReaction(maxReactionMetric.right, "kN"),
      reductionDisplay: formatReduction(maxReactionMetric.reductionPercent),
    },
  ];

  return {
    periods,
    maxHorizontalModeComponent: maxHorizontalModeComponentMetric,
    maxReaction: maxReactionMetric,
    rows,
    comment: buildAutoComment({
      leftProjectName: input.leftProject.project.name,
      rightProjectName: input.rightProject.project.name,
      periods,
      horizontal: maxHorizontalModeComponentMetric,
      reaction: maxReactionMetric,
    }),
  };
}

function buildAutoComment(params: {
  leftProjectName: string;
  rightProjectName: string;
  periods: ComparisonPeriods;
  horizontal: ComparisonDirectionalMetric;
  reaction: ComparisonDirectionalMetric;
}): string {
  const hasPeriods =
    params.periods.mode1.left != null && params.periods.mode1.right != null;
  const hasHorizontal =
    params.horizontal.left != null && params.horizontal.right != null;
  const hasReaction =
    params.reaction.left != null && params.reaction.right != null;

  if (!hasPeriods && !hasHorizontal && !hasReaction) {
    return "固有値解析を実行すると、周期およびモード変形指標を比較できます。";
  }

  const segments: string[] = [];
  if (hasPeriods) {
    const periodTrend = describeTrend(
      params.periods.mode1.left!,
      params.periods.mode1.right!,
    );
    if (periodTrend === "shorter") {
      segments.push(
        "B案は1次周期が短くなる傾向があり、軟弱地盤側への変形集中が相対的に緩和される可能性があります。",
      );
    } else if (periodTrend === "longer") {
      segments.push(
        "B案は1次周期が長くなる傾向があり、軟弱地盤側への変形集中が相対的に大きくなる可能性があります。",
      );
    } else {
      segments.push("B案は1次周期がA案と同程度です。");
    }
  }
  if (hasHorizontal) {
    const percent = params.horizontal.reductionPercent;
    if (percent != null && percent > 5) {
      segments.push(
        "B案ではA案に比べて最大水平モード成分が小さく、軟弱地盤側への変形集中が緩和される傾向があります。",
      );
    } else if (percent != null && percent < -5) {
      segments.push(
        "B案ではA案に比べて最大水平モード成分がやや大きく、軟弱地盤側への変形集中が増える可能性があります。",
      );
    } else {
      segments.push("B案の最大水平モード成分はA案とほぼ同程度です。");
    }
  }
  if (hasReaction) {
    const percent = params.reaction.reductionPercent;
    if (percent != null && percent > 5) {
      segments.push(
        "最大橋脚反力はB案で小さくなり、支点設計上有利となる傾向があります。",
      );
    } else if (percent != null && percent < -5) {
      segments.push(
        "最大橋脚反力はB案で大きくなるため、支点・基礎の照査が必要です。",
      );
    }
  }
  if (segments.length === 0) {
    return "固有値解析を実行すると、周期およびモード変形指標を比較できます。";
  }
  return segments.join(" ");
}

function describeTrend(
  left: number,
  right: number,
): "shorter" | "longer" | "equal" {
  if (left === 0) return "equal";
  const diff = (right - left) / left;
  if (diff < -0.02) return "shorter";
  if (diff > 0.02) return "longer";
  return "equal";
}

export const COMPARISON_DISPLAY_PRECISION = {
  period: DISPLAY_PERIOD_PRECISION,
  displacement: DISPLAY_DISPLACEMENT_PRECISION,
  reaction: DISPLAY_REACTION_PRECISION,
  reduction: REDUCTION_PERCENT_PRECISION,
};

export const COMPARISON_NULL_LABEL = NUMERIC_NULL_LABEL;
export const COMPARISON_REACTION_NOT_COMPUTED_LABEL = REACTION_NOT_COMPUTED_LABEL;

export type { AnalysisResult, EigenModeResult, ProjectModel };

