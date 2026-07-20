import { downloadTextFile } from "./downloadTextFile";
import { buildRoadCsvExports, buildRoadCsvFileName } from "./roadCsvExport";
import { buildRoadHtmlReport } from "./roadReport";
import {
  assessRoadExportReadiness,
  buildRoadReportContext,
  type RoadExportBlockReason,
  type RoadReportContext,
} from "./roadReportContext";
import type { LinerDraft } from "../adapters/linerUiAdapter";

export type RoadExportResult =
  | { ok: true }
  | { ok: false; reason: RoadExportBlockReason };

export { assessRoadExportReadiness, buildRoadReportContext };
export type { RoadExportBlockReason, RoadReportContext };

export function exportRoadHtmlReport(context: RoadReportContext): RoadExportResult {
  const readiness = assessRoadExportReadiness(context);
  if (!readiness.canExport) {
    return { ok: false, reason: readiness.reason! };
  }

  const report = buildRoadHtmlReport(context);
  if (!report) {
    return { ok: false, reason: "error_diagnostics" };
  }

  downloadTextFile(report.fileName, report.html, "text/html;charset=utf-8");
  return { ok: true };
}

export function exportRoadCsvBundle(context: RoadReportContext): RoadExportResult {
  const readiness = assessRoadExportReadiness(context);
  if (!readiness.canExport) {
    return { ok: false, reason: readiness.reason! };
  }

  const exports = buildRoadCsvExports(context);
  if (!exports) {
    return { ok: false, reason: "error_diagnostics" };
  }

  for (const [fileName, content] of Object.entries(exports)) {
    downloadTextFile(
      buildRoadCsvFileName(context.projectName, fileName),
      content,
      "text/csv;charset=utf-8",
    );
  }

  return { ok: true };
}

export function exportRoadReportsFromDraft(
  draft: LinerDraft,
  projectName: string,
  mode: "html" | "csv" | "all",
): RoadExportResult {
  const context = buildRoadReportContext(draft, projectName);
  if (mode === "html") {
    return exportRoadHtmlReport(context);
  }
  if (mode === "csv") {
    return exportRoadCsvBundle(context);
  }

  const htmlResult = exportRoadHtmlReport(context);
  if (!htmlResult.ok) {
    return htmlResult;
  }
  return exportRoadCsvBundle(context);
}
