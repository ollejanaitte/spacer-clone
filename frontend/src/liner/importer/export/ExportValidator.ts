import type { JipLinerImporterProject } from "../types";
import { validateProject, summarizeDiagnostics, filterAcknowledgedDiagnostics } from "../diagnostics/validateImporter";
import { evaluateProjectRenderability } from "../renderability";

export type ValidationSummary = {
  diagnostics: ReturnType<typeof validateProject>;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  renderability: ReturnType<typeof evaluateProjectRenderability>;
  exportBlocked: boolean;
};

export function runExportValidation(project: JipLinerImporterProject): ValidationSummary {
  const diagnostics = validateProject(project);
  const counts = summarizeDiagnostics(diagnostics);
  const renderability = evaluateProjectRenderability(
    project,
    diagnostics.filter((item) => item.level === "error"),
  );

  return {
    diagnostics,
    ...counts,
    renderability,
    exportBlocked:
      renderability.export === "blocked" || counts.errorCount > 0,
  };
}

export function ExportValidator(project: JipLinerImporterProject): ValidationSummary {
  return runExportValidation(project);
}

export type ValidationPanelProps = {
  project: JipLinerImporterProject;
  showAcknowledged?: boolean;
};

export function buildValidationViewModel(
  project: JipLinerImporterProject,
  showAcknowledged = false,
) {
  const summary = runExportValidation(project);
  const visible = filterAcknowledgedDiagnostics(summary.diagnostics, showAcknowledged);
  return { summary, visible };
}
