/**
 * Development report export helpers.
 * PDF is produced from dedicated ReportModel HTML (not app-shell print).
 */
import {
  assertDevelopmentReportExportable,
  assertFormalReportRejected,
  buildAuditManifest,
  buildReportModel,
  renderReportModelHtml,
  reportModelToCalculationCsv,
  reportModelToJson,
  type ReportModel,
} from "./reportModel";
import { buildQuantityModel } from "../quantity/quantityModel";
import { downloadTextFile } from "../quantity/quantityExport";
import type { ProjectModel } from "../../types";

export function downloadDevelopmentReportJson(model: ReportModel): void {
  assertDevelopmentReportExportable(model);
  downloadTextFile(
    `apollo-development-report_${model.projectId}_r${model.inputChecksum.slice(0, 8)}.json`,
    reportModelToJson(model),
    "application/json;charset=utf-8",
  );
}

export function downloadCalculationResultsCsv(model: ReportModel): void {
  assertDevelopmentReportExportable(model);
  downloadTextFile(
    `apollo-calculation-results_${model.projectId}_r${model.inputChecksum.slice(0, 8)}.csv`,
    reportModelToCalculationCsv(model),
    "text/csv;charset=utf-8",
  );
}

export function downloadAuditManifest(model: ReportModel, project: ProjectModel): void {
  assertDevelopmentReportExportable(model);
  const quantity = buildQuantityModel(project);
  downloadTextFile(
    `apollo-audit-manifest_${model.projectId}_r${model.inputChecksum.slice(0, 8)}.json`,
    buildAuditManifest(model, quantity),
    "application/json;charset=utf-8",
  );
}

/** Opens dedicated ReportModel HTML document for print-to-PDF (A4). */
export function openDevelopmentReportPreview(model: ReportModel): void {
  assertDevelopmentReportExportable(model);
  const html = renderReportModelHtml(model);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadDevelopmentReportHtml(model: ReportModel): void {
  assertDevelopmentReportExportable(model);
  downloadTextFile(
    `apollo-development-report_${model.projectId}_r${model.inputChecksum.slice(0, 8)}.html`,
    renderReportModelHtml(model),
    "text/html;charset=utf-8",
  );
}

export function tryBuildFormalReport(project: ProjectModel): never {
  return assertFormalReportRejected(project);
}

export function createDevelopmentReport(project: ProjectModel): ReportModel {
  return buildReportModel(project);
}
