import { useMemo } from "react";
import { ja } from "../i18n/ja";
import type { AnalysisResult, ProjectModel } from "../types";
import {
  buildComparisonMetrics,
  type BuildComparisonMetricsInput,
  type ComparisonMetricRow,
  type ComparisonMetrics,
} from "./comparisonMetrics";
import { describeBridgeVariant, type BridgeVariantInfo } from "../data/defaultProject";

export type ComparisonPanelProps = {
  leftProject: ProjectModel;
  rightProject: ProjectModel;
  /** Analysis result for the left slot. May be null before RUN. */
  leftResult: AnalysisResult | null;
  /** Analysis result for the right slot. May be null before RUN. */
  rightResult: AnalysisResult | null;
  /** Selected mode number used to evaluate the horizontal mode component. */
  selectedModeNo?: number;
  /** Labels for the table header. Defaults to the project names. */
  leftLabel?: string;
  rightLabel?: string;
};

type Direction = "positive" | "negative" | "neutral";

function reductionDirection(percent: number | null): Direction {
  if (percent == null || !Number.isFinite(percent)) return "neutral";
  if (percent > 0.5) return "positive";
  if (percent < -0.5) return "negative";
  return "neutral";
}

/**
 * Comparison table shown beneath the two viewports in Compare mode.
 * Always renders; missing values fall back to "-" or ja.comparison.notComputed. The
 * component is display-only — all of the math lives in
 * `comparisonMetrics.ts` and is covered by unit tests.
 */
export function ComparisonPanel({
  leftProject,
  rightProject,
  leftResult,
  rightResult,
  selectedModeNo,
  leftLabel,
  rightLabel,
}: ComparisonPanelProps) {
  const metrics = useMemo<ComparisonMetrics>(() => {
    const input: BuildComparisonMetricsInput = {
      leftProject,
      rightProject,
      leftResult,
      rightResult,
      selectedModeNo,
    };
    return buildComparisonMetrics(input);
  }, [leftProject, rightProject, leftResult, rightResult, selectedModeNo]);

  const leftInfo = useMemo<BridgeVariantInfo>(
    () => describeBridgeVariant(leftProject),
    [leftProject],
  );
  const rightInfo = useMemo<BridgeVariantInfo>(
    () => describeBridgeVariant(rightProject),
    [rightProject],
  );
  const leftHeader = leftLabel ?? leftProject.project.name;
  const rightHeader = rightLabel ?? rightProject.project.name;

  return (
    <section
      className="comparison-panel"
      data-testid="comparison-panel"
      aria-label={ja.comparisonPanel.ariaLabel}
    >
      <header className="comparison-panel-header">
        <h3>{ja.comparisonPanel.heading}</h3>
        <p className="comparison-panel-hint">
          {ja.comparisonPanel.hint}
        </p>
      </header>
      <ModelSummary leftInfo={leftInfo} rightInfo={rightInfo} />
      <table className="comparison-table" data-testid="comparison-table">
        <thead>
          <tr>
            <th scope="col">{ja.comparisonPanel.columns.item}</th>
            <th scope="col" data-testid="comparison-table-left-header">{leftHeader}</th>
            <th scope="col" data-testid="comparison-table-right-header">{rightHeader}</th>
            <th scope="col">{ja.comparisonPanel.columns.evaluation}</th>
          </tr>
        </thead>
        <tbody>
          {metrics.rows.map((row) => (
            <ComparisonRow key={row.key} row={row} />
          ))}
        </tbody>
      </table>
      <p
        className="comparison-comment"
        data-testid="comparison-comment"
        role="note"
      >
        {metrics.comment}
      </p>
    </section>
  );
}

function ComparisonRow({ row }: { row: ComparisonMetricRow }) {
  const direction = reductionDirection(parseReductionPercent(row.reductionDisplay));
  return (
    <tr data-testid={`comparison-row-${row.key}`}>
      <th scope="row">{row.label}</th>
      <td>{row.leftDisplay}</td>
      <td>{row.rightDisplay}</td>
      <td>
        <span
          className={`comparison-reduction comparison-reduction-${direction}`}
          data-testid={`comparison-reduction-${row.key}`}
          data-direction={direction}
        >
          {row.reductionDisplay}
        </span>
      </td>
    </tr>
  );
}

function parseReductionPercent(display: string): number | null {
  if (!display || display === "-") return null;
  const match = display.match(/(-?\d+(?:\.\d+)?)%/);
  if (!match) return null;
  const value = Number(match[1]);
  if (display.endsWith(ja.comparison.increase("%"))) return -Math.abs(value);
  if (display.endsWith(ja.comparison.decrease("%"))) return Math.abs(value);
  return value;
}


function ModelSummary({
  leftInfo,
  rightInfo,
}: {
  leftInfo: BridgeVariantInfo;
  rightInfo: BridgeVariantInfo;
}) {
  return (
    <div className="comparison-model-summary" data-testid="comparison-model-summary">
      <table>
        <thead>
          <tr>
            <th scope="col">{ja.comparisonPanel.summary.model}</th>
            <th scope="col">{ja.comparisonPanel.summary.nodeCount}</th>
            <th scope="col">{ja.comparisonPanel.summary.memberCount}</th>
            <th scope="col">{ja.comparisonPanel.summary.suspendedJunction}</th>
            <th scope="col">{ja.comparisonPanel.summary.spanCount}</th>
          </tr>
        </thead>
        <tbody>
          <tr data-testid="comparison-model-summary-left">
            <th scope="row">Plan A</th>
            <td>{leftInfo.nodeCount}</td>
            <td>{leftInfo.memberCount}</td>
            <td>{leftInfo.suspendedJunctionCount}</td>
            <td>{leftInfo.spanCount}</td>
          </tr>
          <tr data-testid="comparison-model-summary-right">
            <th scope="row">Plan B</th>
            <td>{rightInfo.nodeCount}</td>
            <td>{rightInfo.memberCount}</td>
            <td>{rightInfo.suspendedJunctionCount}</td>
            <td>{rightInfo.spanCount}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
