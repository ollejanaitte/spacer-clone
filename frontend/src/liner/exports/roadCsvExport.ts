import type { GridPointResult } from "../core/types";
import type { ComputationDiagnostic } from "../core/types";
import { buildHaunchResultsCsv } from "./haunchReportExport";
import { buildHosoResultsCsv } from "./hosoReportExport";
import { buildLdistResultsCsv } from "./ldistReportExport";
import type { RoadReportContext } from "./roadReportContext";
import { assessRoadExportReadiness } from "./roadReportContext";

export const GRID_POINTS_CSV_COLUMNS = [
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
] as const;

export type GridPointsCsvColumn = (typeof GRID_POINTS_CSV_COLUMNS)[number];

export type RoadCsvExports = Record<string, string>;

function csvEscape(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return "";
  }
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function writeCsv(columns: readonly string[], rows: readonly Record<string, string | number | undefined>[]): string {
  const header = columns.join(",");
  const body = rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","));
  return [header, ...body].join("\n");
}

export function gridPointToCsvRow(point: GridPointResult): Record<GridPointsCsvColumn, string | number | undefined> {
  return {
    gridPointId: point.id,
    longitudinalIndex: point.labels.longitudinalIndex,
    transverseIndex: point.labels.transverseIndex,
    displayedStation: point.displayedStation,
    offset: point.offset,
    x: point.x,
    y: point.y,
    z: point.z,
    role: point.roles[0] ?? "",
    spanId: point.source.spanId,
  };
}

export function buildGridPointsCsv(points: readonly GridPointResult[]): string {
  return writeCsv(
    GRID_POINTS_CSV_COLUMNS,
    points.map((point) => gridPointToCsvRow(point)),
  );
}

export function buildRoadCsvExports(
  context: RoadReportContext,
  diagnostics: readonly ComputationDiagnostic[] = context.diagnostics,
): RoadCsvExports | null {
  if (!assessRoadExportReadiness(context).canExport) {
    return null;
  }

  const exports: RoadCsvExports = {
    "grid_points.csv": buildGridPointsCsv(context.intermediate.grid.points),
  };

  const ldistCsv = buildLdistResultsCsv(context.ldistRows, diagnostics);
  if (ldistCsv) {
    exports["ldist_results.csv"] = ldistCsv;
  }

  const haunchCsv = buildHaunchResultsCsv(context.haunchRows, diagnostics);
  if (haunchCsv) {
    exports["haunch_results.csv"] = haunchCsv;
  }

  const hosoCsv = buildHosoResultsCsv(context.hosoRows, diagnostics);
  if (hosoCsv) {
    exports["hoso_results.csv"] = hosoCsv;
  }

  return exports;
}

export function sanitizeRoadExportFileToken(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64) || "liner";
}

export function formatRoadExportDate(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("");
}

export function buildRoadCsvFileName(projectName: string, csvBaseName: string, date = new Date()): string {
  const token = sanitizeRoadExportFileToken(projectName);
  const dateToken = formatRoadExportDate(date);
  if (csvBaseName === "grid_points.csv") {
    return `${token}_liner_grid_${dateToken}.csv`;
  }
  return `${token}_${csvBaseName.replace(/\.csv$/, "")}_${dateToken}.csv`;
}
