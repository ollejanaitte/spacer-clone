import { useMemo } from "react";
import { ja } from "../../i18n/ja";
import {
  createDefaultVerticalAlignment,
  summarizeLinerDraft,
  type LinerDraft,
} from "../adapters/linerUiAdapter";
import { elevationAt } from "../core/elevationAt";
import { totalAlignmentLength } from "../core/geometry/horizontal";
import { generateStations } from "../core/station/stationRules";
import { gradeRatioToPercent, roundGradePercent } from "../core/gradeConversion";
import { formatStationDisplay } from "../core/station/stationFormat";

export type PlanElevationTableProps = {
  draft: LinerDraft;
};

export type PlanElevationRow = {
  physicalDistance: number;
  displayedStation: number;
  plannedElevation: number | null;
  gradePercent: number | null;
};

export function buildPlanElevationRows(draft: LinerDraft): PlanElevationRow[] {
  const totalLength = totalAlignmentLength(draft.alignment);
  const summary = summarizeLinerDraft(draft);
  const verticalAlignment =
    draft.verticalAlignment ?? createDefaultVerticalAlignment(summary.totalDeclaredLength, draft.z ?? 0);
  const { stations } = generateStations(draft.stationDefinition, totalLength);

  return stations.map((station) => {
    const plannedElevation = elevationAt(station.physicalDistance, verticalAlignment);
    const gradeRatio =
      plannedElevation === null
        ? null
        : (() => {
            const containingElement = verticalAlignment.elements.find(
              (element) =>
                element.startStation <= station.physicalDistance &&
                station.physicalDistance <= element.endStation,
            );
            if (containingElement?.type === "grade") {
              return containingElement.grade;
            }
            if (containingElement?.type === "parabolic") {
              const length = containingElement.length;
              const rate =
                length === 0
                  ? 0
                  : (containingElement.endGrade - containingElement.startGrade) / length;
              const u = station.physicalDistance - containingElement.startStation;
              return containingElement.startGrade + rate * u;
            }
            return null;
          })();

    return {
      physicalDistance: station.physicalDistance,
      displayedStation: station.displayedStation,
      plannedElevation,
      gradePercent:
        gradeRatio === null ? null : roundGradePercent(gradeRatioToPercent(gradeRatio)),
    };
  });
}

function formatElevation(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return ja.liner.planElevation.unavailable;
  }
  return value.toFixed(3);
}

function formatGradePercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return ja.liner.planElevation.unavailable;
  }
  return value.toFixed(3);
}

export function PlanElevationTable({ draft }: PlanElevationTableProps) {
  const rows = useMemo(() => buildPlanElevationRows(draft), [draft]);
  const hasMissingElevation = rows.some((row) => row.plannedElevation === null);

  return (
    <section
      className="liner-edit-panel liner-plan-elevation-table"
      aria-labelledby="liner-plan-elevation-title"
      data-testid="plan-elevation-table"
    >
      <h2 id="liner-plan-elevation-title">{ja.liner.planElevation.sectionTitle}</h2>
      <p className="liner-edit-help" data-testid="plan-elevation-table-lead">
        {ja.liner.planElevation.lead}
      </p>
      {hasMissingElevation && (
        <p className="liner-edit-help" role="status" data-testid="plan-elevation-table-coverage-warning">
          {ja.liner.planElevation.coverageWarning}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="liner-edit-help" data-testid="plan-elevation-table-empty">
          {ja.liner.planElevation.empty}
        </p>
      ) : (
        <div className="liner-edit-table-wrap">
          <table className="liner-edit-table liner-plan-elevation-table-grid">
            <caption>{ja.liner.planElevation.tableCaption}</caption>
            <thead>
              <tr>
                <th>{ja.liner.fields.physicalDistance}</th>
                <th>{ja.liner.fields.originDisplayedStation}</th>
                <th>{ja.liner.planElevation.plannedElevation}</th>
                <th>{ja.liner.fields.gradePercent}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`plan-elevation-${row.physicalDistance.toFixed(9)}`}
                  data-testid={`plan-elevation-row-${row.physicalDistance}`}
                >
                  <td>{row.physicalDistance.toFixed(3)}</td>
                  <td>{formatStationDisplay(row.displayedStation)}</td>
                  <td>{formatElevation(row.plannedElevation)}</td>
                  <td>{formatGradePercent(row.gradePercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
