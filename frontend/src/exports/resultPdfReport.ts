import { buildResultViewModel } from "../results/resultViewModel";
import type { AnalysisResult, ProjectModel } from "../types";

type ReportCell = string | number;

export type ReportTable = {
  title: string;
  columns: string[];
  rows: ReportCell[][];
};

export type ReportSection = {
  title: string;
  blocks: ReportTable[];
};

export type ResultPdfReport = {
  title: string;
  fileName: string;
  generatedAt: string;
  sections: ReportSection[];
};

export function buildResultPdfReport(
  project: ProjectModel,
  result: AnalysisResult,
  activeLoadCase: string,
  generatedAt = new Date().toISOString(),
): ResultPdfReport {
  const viewModel = buildResultViewModel(result, activeLoadCase);
  const selectedLoadCase = project.loadCases.find((item) => item.id === activeLoadCase);
  const summary = result.analysisSummary;

  return {
    title: `${project.project.name} Analysis Report`,
    fileName: `${safeFileName(project.project.id || "analysis-result")}-report.pdf`,
    generatedAt,
    sections: [
      {
        title: "Project Overview",
        blocks: [
          {
            title: "Project",
            columns: ["Item", "Value"],
            rows: [
              ["Project ID", project.project.id],
              ["Project name", project.project.name],
              ["Description", project.project.description],
              ["Project schema", project.project.schemaVersion],
              ["Result schema", result.schemaVersion],
              ["Generated at", generatedAt],
            ],
          },
          {
            title: "Model Size",
            columns: ["Item", "Value"],
            rows: [
              ["Nodes", summary.nodeCount],
              ["Members", summary.memberCount],
              ["Load cases", summary.loadCaseCount],
              ["Total DOF", summary.totalDof],
              ["Free DOF", summary.freeDof],
              ["Constrained DOF", summary.constrainedDof],
            ],
          },
        ],
      },
      {
        title: "Analysis Conditions",
        blocks: [
          {
            title: "Settings",
            columns: ["Item", "Value"],
            rows: [
              ["Analysis type", summary.analysisType],
              ["Status", summary.status],
              ["Solver", summary.solver],
              ["Started at", summary.startedAt],
              ["Finished at", summary.finishedAt],
              ["Duration ms", summary.durationMs],
              ["Selected load case", selectedLoadCase ? `${selectedLoadCase.id} ${selectedLoadCase.name}` : activeLoadCase || "All"],
              ["Tolerance", project.analysisSettings.tolerance],
              ["Include shear deformation", String(project.analysisSettings.includeShearDeformation)],
              ["Large displacement", String(project.analysisSettings.largeDisplacement)],
            ],
          },
          {
            title: "Units",
            columns: ["Quantity", "Unit"],
            rows: Object.entries(project.units ?? {}).map(([key, value]) => [key, String(value)]),
          },
        ],
      },
      {
        title: "Node Displacements",
        blocks: [
          {
            title: "Node Displacement Table",
            columns: ["Node", "UX", "UY", "UZ", "RX", "RY", "RZ", "Magnitude"],
            rows:
              viewModel?.displacements.items.map((item) => [
                item.nodeId,
                item.ux,
                item.uy,
                item.uz,
                item.rx,
                item.ry,
                item.rz,
                item.magnitude,
              ]) ?? [],
          },
        ],
      },
      {
        title: "Support Reactions",
        blocks: [
          {
            title: "Support Reaction Table",
            columns: ["Node", "Fx", "Fy", "Fz", "Mx", "My", "Mz"],
            rows:
              viewModel?.reactions.items.map((item) => [
                item.nodeId,
                item.fx,
                item.fy,
                item.fz,
                item.mx,
                item.my,
                item.mz,
              ]) ?? [],
          },
        ],
      },
      {
        title: "Member Forces",
        blocks: [
          {
            title: "Member Force Table",
            columns: ["Member", "Component", "I End", "J End"],
            rows:
              viewModel?.memberForces.items.map((item) => [
                item.memberId,
                item.component,
                item.i,
                item.j,
              ]) ?? [],
          },
        ],
      },
    ],
  };
}

export function buildResultPdfReportHtml(report: ResultPdfReport): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { color: #17202a; font-family: "Segoe UI", Arial, sans-serif; font-size: 10.5px; margin: 0; }
    header { border-bottom: 1px solid #8fa1b3; margin-bottom: 14px; padding-bottom: 10px; }
    h1 { font-size: 22px; font-weight: 650; letter-spacing: 0; margin: 0 0 5px; }
    h2 { break-after: avoid; border-bottom: 1px solid #cad4df; font-size: 15px; margin: 18px 0 8px; padding-bottom: 4px; }
    h3 { break-after: avoid; font-size: 12px; margin: 10px 0 5px; }
    .meta { color: #526273; display: flex; gap: 14px; }
    table { border-collapse: collapse; margin-bottom: 10px; width: 100%; }
    th, td { border: 1px solid #d4dde6; padding: 4px 5px; text-align: left; vertical-align: top; }
    th { background: #eef3f7; color: #273746; font-weight: 650; }
    td.number { font-variant-numeric: tabular-nums; text-align: right; }
    tr { break-inside: avoid; }
    section { break-inside: avoid; }
    .empty { border: 1px solid #d4dde6; color: #6b7785; margin-bottom: 10px; padding: 8px; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(report.title)}</h1>
    <div class="meta">
      <span>Generated: ${escapeHtml(report.generatedAt)}</span>
      <span>File: ${escapeHtml(report.fileName)}</span>
    </div>
  </header>
  ${report.sections.map(renderSection).join("")}
  <script>window.addEventListener("load", () => window.print());</script>
</body>
</html>`;
}

export function openResultPdfReport(project: ProjectModel, result: AnalysisResult, activeLoadCase: string): void {
  const report = buildResultPdfReport(project, result, activeLoadCase);
  const html = buildResultPdfReportHtml(report);
  const reportUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const printWindow = window.open(reportUrl, "_blank", "width=1024,height=768");
  if (!printWindow) {
    URL.revokeObjectURL(reportUrl);
    throw new Error("PDF report window could not be opened.");
  }
  setTimeout(() => URL.revokeObjectURL(reportUrl), 60000);
}

function renderSection(section: ReportSection): string {
  return `<section>
    <h2>${escapeHtml(section.title)}</h2>
    ${section.blocks.map(renderTable).join("")}
  </section>`;
}

function renderTable(table: ReportTable): string {
  const body =
    table.rows.length === 0
      ? `<div class="empty">No rows.</div>`
      : `<table>
        <thead><tr>${table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
        <tbody>
          ${table.rows
            .map(
              (row) =>
                `<tr>${row
                  .map((cell) => `<td class="${typeof cell === "number" ? "number" : ""}">${formatCell(cell)}</td>`)
                  .join("")}</tr>`,
            )
            .join("")}
        </tbody>
      </table>`;
  return `<h3>${escapeHtml(table.title)}</h3>${body}`;
}

function formatCell(value: ReportCell): string {
  if (typeof value === "number") return escapeHtml(formatNumber(value));
  return escapeHtml(value);
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  return Math.abs(value) > 10000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)
    ? value.toExponential(6)
    : value.toFixed(8).replace(/\.?0+$/, "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeFileName(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9._-]+/g, "_") || "analysis-result";
}
