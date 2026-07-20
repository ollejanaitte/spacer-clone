import type {
  CanonicalLinerIntermediateResult,
  ComputationDiagnostic,
  HorizontalSegmentResult,
  ProfileSamplePoint,
  StationTableEntry,
} from "../core/types";
import type { HaunchResultRow } from "../core/haunch/types";
import type { HosoResultRow } from "../core/hoso/types";
import type { LdistResultRow } from "../core/ldist/types";
import { buildHaunchReportSection } from "./haunchReportExport";
import { buildHosoReportSection } from "./hosoReportExport";
import { buildLdistReportSection } from "./ldistReportExport";
import { formatRoadExportDate, sanitizeRoadExportFileToken } from "./roadCsvExport";
import type { RoadReportContext } from "./roadReportContext";
import { assessRoadExportReadiness } from "./roadReportContext";

export type RoadHtmlReport = {
  fileName: string;
  html: string;
};

type ReportCell = string | number;

function formatNumber(value: number | undefined | null, digits = 3): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "";
  }
  return value.toFixed(digits);
}

function curvatureToRadius(curvature: number): number | null {
  if (!Number.isFinite(curvature) || Math.abs(curvature) < 1e-12) {
    return null;
  }
  return 1 / Math.abs(curvature);
}

function renderTable(columns: string[], rows: ReportCell[][]): string {
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findNearestProfileSample(
  samples: readonly ProfileSamplePoint[],
  physicalDistance: number,
): ProfileSamplePoint | null {
  if (samples.length === 0) {
    return null;
  }
  return samples.reduce((nearest, candidate) => {
    const nearestDistance = Math.abs(nearest.physicalDistance - physicalDistance);
    const candidateDistance = Math.abs(candidate.physicalDistance - physicalDistance);
    return candidateDistance < nearestDistance ? candidate : nearest;
  });
}

function buildStationCoordinateRows(
  intermediate: CanonicalLinerIntermediateResult,
): ReportCell[][] {
  const sampleByDistance = new Map(
    intermediate.horizontal.sampledPoints.map((point) => [point.physicalDistance, point] as const),
  );

  return intermediate.stations.entries.map((entry: StationTableEntry) => {
    const sample =
      sampleByDistance.get(entry.physicalDistance) ??
      intermediate.horizontal.sampledPoints.find(
        (point) => Math.abs(point.physicalDistance - entry.physicalDistance) < 1e-6,
      );
    const profile = findNearestProfileSample(
      intermediate.vertical.sampledPoints,
      entry.physicalDistance,
    );
    return [
      entry.entryId,
      formatNumber(entry.displayedStation),
      formatNumber(entry.physicalDistance),
      sample ? formatNumber(sample.x) : "",
      sample ? formatNumber(sample.y) : "",
      profile ? formatNumber(profile.profileElevation) : "",
      entry.equationId ?? "",
    ];
  });
}

function buildAlignmentSegmentRows(segments: readonly HorizontalSegmentResult[]): ReportCell[][] {
  return segments.map((segment) => [
    segment.id,
    segment.type,
    formatNumber(segment.startPhysicalDistance),
    formatNumber(segment.endPhysicalDistance),
    formatNumber(segment.startDisplayedStation),
    formatNumber(segment.endDisplayedStation),
    formatNumber(segment.endPhysicalDistance - segment.startPhysicalDistance),
    formatNumber(curvatureToRadius(segment.startCurvature)),
    formatNumber(curvatureToRadius(segment.endCurvature)),
  ]);
}

function buildProfileElevationRows(samples: readonly ProfileSamplePoint[]): ReportCell[][] {
  return samples.map((sample) => [
    formatNumber(sample.physicalDistance),
    formatNumber(sample.displayedStation),
    formatNumber(sample.profileElevation),
    formatNumber(sample.grade, 6),
  ]);
}

function buildGridPointRows(intermediate: CanonicalLinerIntermediateResult): ReportCell[][] {
  return intermediate.grid.points.map((point) => [
    point.id,
    point.labels.longitudinalIndex,
    point.labels.transverseIndex,
    formatNumber(point.displayedStation),
    formatNumber(point.offset),
    formatNumber(point.x),
    formatNumber(point.y),
    formatNumber(point.z),
    point.roles.join("|"),
    point.source.spanId ?? "",
  ]);
}

function buildLdistRows(rows: readonly LdistResultRow[]): ReportCell[][] {
  return rows.map((row) => [
    row.jobId,
    row.fromLineId ?? "",
    row.toLineId ?? "",
    formatNumber(row.stationPhysicalDistance),
    formatNumber(row.displayedStation),
    formatNumber(row.distanceM),
    formatNumber(row.overhangM),
    row.side ?? "",
    row.signConvention ?? "",
  ]);
}

function buildHaunchRows(rows: readonly HaunchResultRow[]): ReportCell[][] {
  return rows.map((row) => [
    row.definitionId,
    row.type,
    formatNumber(row.stationPhysicalDistance),
    formatNumber(row.haunchTopElevationM),
    formatNumber(row.haunchThicknessM),
    row.side ?? "",
  ]);
}

function buildHosoRows(rows: readonly HosoResultRow[]): ReportCell[][] {
  return rows.map((row) => [
    row.definitionId,
    row.type,
    formatNumber(row.stationPhysicalDistance),
    formatNumber(row.offsetM),
    formatNumber(row.pavementThicknessM),
    formatNumber(row.pavementElevationM),
  ]);
}

function buildDiagnosticRows(diagnostics: readonly ComputationDiagnostic[]): ReportCell[][] {
  return diagnostics.map((diagnostic) => [
    diagnostic.level,
    diagnostic.code,
    diagnostic.messageKey ?? diagnostic.detail ?? "",
    diagnostic.entityPath ?? "",
    diagnostic.station !== undefined ? formatNumber(diagnostic.station) : "",
  ]);
}

function renderSection(sectionKey: string, title: string, tableHtml: string): string {
  return `<section data-section-key="${sectionKey}"><h2>${escapeHtml(title)}</h2>${tableHtml}</section>`;
}

export function buildRoadHtmlReport(
  context: RoadReportContext,
  generatedAt = new Date(),
): RoadHtmlReport | null {
  if (!assessRoadExportReadiness(context).canExport) {
    return null;
  }

  const { intermediate, diagnostics } = context;
  const ldistSection = buildLdistReportSection(context.ldistRows, diagnostics);
  const haunchSection = buildHaunchReportSection(context.haunchRows, diagnostics);
  const hosoSection = buildHosoReportSection(context.hosoRows, diagnostics);

  const sections: string[] = [
    renderSection(
      "projectInfo",
      "Project Info",
      renderTable(
        ["Item", "Value"],
        [
          ["Project", context.projectName],
          ["Computed at", intermediate.computedAt],
          ["Source revision", intermediate.sourceRevision],
          ["Generated at", generatedAt.toISOString()],
        ],
      ),
    ),
    renderSection(
      "alignmentSegments",
      "Alignment Segments",
      renderTable(
        [
          "segmentId",
          "segmentType",
          "startPhysicalDistance",
          "endPhysicalDistance",
          "startDisplayedStation",
          "endDisplayedStation",
          "length",
          "startRadius",
          "endRadius",
        ],
        buildAlignmentSegmentRows(intermediate.horizontal.segments),
      ),
    ),
    renderSection(
      "stationCoordinates",
      "Station Coordinates",
      renderTable(
        ["entryId", "displayedStation", "physicalDistance", "x", "y", "elevation", "equationId"],
        buildStationCoordinateRows(intermediate),
      ),
    ),
    renderSection(
      "profileElevations",
      "Profile Elevations",
      renderTable(
        ["physicalDistance", "displayedStation", "profileElevation", "grade"],
        buildProfileElevationRows(intermediate.vertical.sampledPoints),
      ),
    ),
    renderSection(
      "gridPoints",
      "Grid Points",
      renderTable(
        [
          "gridPointId",
          "longitudinalIndex",
          "transverseIndex",
          "displayedStation",
          "offset",
          "x",
          "y",
          "z",
          "role",
          "spanId",
        ],
        buildGridPointRows(intermediate),
      ),
    ),
  ];

  if (ldistSection) {
    sections.push(
      renderSection(
        "ldistResults",
        "LDIST Results",
        renderTable(
          [
            "jobId",
            "fromLineId",
            "toLineId",
            "stationPhysicalDistance",
            "displayedStation",
            "distanceM",
            "overhangM",
            "side",
            "signConvention",
          ],
          buildLdistRows(ldistSection.rows),
        ),
      ),
    );
  }

  if (haunchSection) {
    sections.push(
      renderSection(
        "haunchResults",
        "Haunch Results",
        renderTable(
          [
            "definitionId",
            "type",
            "stationPhysicalDistance",
            "haunchTopElevationM",
            "haunchThicknessM",
            "side",
          ],
          buildHaunchRows(haunchSection.rows),
        ),
      ),
    );
  }

  if (hosoSection) {
    sections.push(
      renderSection(
        "hosoResults",
        "HOSO Results",
        renderTable(
          [
            "definitionId",
            "type",
            "stationPhysicalDistance",
            "offsetM",
            "pavementThicknessM",
            "pavementElevationM",
          ],
          buildHosoRows(hosoSection.rows),
        ),
      ),
    );
  }

  if (diagnostics.length > 0) {
    sections.push(
      renderSection(
        "diagnostics",
        "Diagnostics",
        renderTable(["level", "code", "messageKey", "entityPath", "station"], buildDiagnosticRows(diagnostics)),
      ),
    );
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(context.projectName)} Liner Report</title>
  <style>
    body { font-family: sans-serif; margin: 24px; color: #111; }
    h1 { margin-bottom: 8px; }
    h2 { margin-top: 24px; font-size: 1.1rem; }
    table { border-collapse: collapse; width: 100%; margin-top: 8px; font-size: 0.9rem; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
    th { background: #f4f4f4; }
    section { margin-bottom: 24px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(context.projectName)} Road Calculation Report</h1>
  ${sections.join("\n")}
</body>
</html>`;

  const token = sanitizeRoadExportFileToken(context.projectName);
  const dateToken = formatRoadExportDate(generatedAt);
  return {
    fileName: `${token}_liner_report_${dateToken}.html`,
    html,
  };
}
