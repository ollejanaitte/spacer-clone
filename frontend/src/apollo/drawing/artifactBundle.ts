/**
 * Step 3-D drawing sheet set + development deliverable ZIP bundle.
 * UNVERIFIED DEVELOPMENT OUTPUT — NOT FOR DESIGN/FABRICATION/CONSTRUCTION
 */

import { createHash } from "node:crypto";
import type { ProjectModel } from "../../types";
import { computeContentChecksum } from "../../contracts/legacy/checksum";

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
import { buildQuantityModel, quantityModelToCsv, quantityModelToJson } from "../quantity/quantityModel";
import {
  buildReportModel,
  reportModelToCalculationCsv,
  reportModelToJson,
  renderReportModelHtml,
} from "../report/reportModel";
import { buildStandardSectionDrawingModel } from "./drawingModel";
import { renderDrawingDxf, renderDrawingSvg } from "./drawingExport";
import {
  assertDrawingSetExportable,
  buildGeneralArrangementDrawingSet,
  drawingSetChecksum,
  type DrawingSetModel,
  type SheetModel,
} from "./drawingSetModel";
import { renderSheetDxf, renderSheetPdfHtml, renderSheetSvg } from "./drawingSetExport";
import {
  buildMemberScheduleModel,
  memberScheduleToCsv,
  memberScheduleToJson,
} from "./memberScheduleModel";
import { buildStoreZip, textToBytes } from "./storeZip";
import { isBridgeStructureGenerationCurrent } from "../bridgeStructure/generateBsdd";

export type BundleFile = {
  readonly path: string;
  readonly content: string | Uint8Array;
  readonly sha256: string;
  readonly size: number;
};

export type ArtifactBundle = {
  readonly bundleId: string;
  readonly projectId: string;
  readonly inputRevision: string;
  readonly inputChecksum: string;
  readonly resultChecksum: string;
  readonly quantityChecksum: string;
  readonly reportChecksum: string;
  readonly drawingSetChecksum: string;
  readonly memberScheduleChecksum: string;
  readonly generatedAt: string;
  readonly developmentStatus: "UNVERIFIED_DEVELOPMENT_ONLY";
  readonly authorizationStatus: "NOT_GRANTED";
  readonly files: readonly BundleFile[];
  readonly zipBytes: Uint8Array;
  readonly zipSha256: string;
  readonly filename: string;
  readonly warnings: readonly string[];
};

const SHEET_STEM: Record<string, string> = {
  "G-01": "general_arrangement",
  "G-02": "girder_crossbeam",
  "G-03": "bracing",
  "G-04": "stiffener",
  "G-05": "support_bearing",
  "G-06": "girder_elevation",
  "G-07": "member_schedule",
};

function fileFromText(path: string, text: string): BundleFile {
  const bytes = textToBytes(text);
  return { path, content: text, sha256: sha256Text(text), size: bytes.length };
}

export function renderMultiSheetDrawingSetHtml(model: DrawingSetModel): string {
  assertDrawingSetExportable(model);
  const pages = model.sheets
    .map((sheet, index) => {
      const svg = renderSheetSvg(model, sheet);
      return `<section class="sheet" data-sheet="${sheet.drawingNumber}" data-index="${index + 1}">
<div class="warning">UNVERIFIED DEVELOPMENT OUTPUT — NOT FOR DESIGN, FABRICATION OR CONSTRUCTION — USER REVIEW REQUIRED — NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED</div>
<div class="titleblock">${sheet.drawingNumber} ${sheet.title} | page ${sheet.sheetIndex}/${sheet.totalSheets} | rev=${model.inputRevision} | ck=${model.inputChecksum.slice(0, 12)}</div>
${svg}
</section>`;
    })
    .join("\n");
  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8"/>
<title>apollo-development-drawing-set_${model.projectId}</title>
<style>
@page { size: A3 landscape; margin: 8mm; }
body { font-family: "Noto Sans JP", sans-serif; margin: 0; }
.sheet { page-break-after: always; }
.warning { color:#b00020; font-weight:700; margin:8px 12px; }
.titleblock { padding:6px 12px; border-bottom:1px solid #333; font-size:12px; }
svg { width:100%; height:auto; }
</style></head>
<body>
${pages}
</body></html>`;
}

export function assertBundleExportAllowed(project: ProjectModel, drawingSet: DrawingSetModel): void {
  if (!isBridgeStructureGenerationCurrent(project)) {
    throw new Error("STALE bundle export rejected");
  }
  assertDrawingSetExportable(drawingSet);
  const quantity = buildQuantityModel(project);
  const report = buildReportModel(project);
  const schedule = buildMemberScheduleModel(project);
  if (
    quantity.inputChecksum !== drawingSet.inputChecksum ||
    report.inputChecksum !== drawingSet.inputChecksum ||
    schedule.inputChecksum !== drawingSet.inputChecksum
  ) {
    throw new Error("Checksum mismatch across artifacts — bundle refused");
  }
  if (quantity.stale || report.stale || schedule.stale || drawingSet.stale) {
    throw new Error("STALE artifact present — bundle refused");
  }
  if (drawingSet.sheets.length < 7) {
    throw new Error("Incomplete sheet set — bundle refused");
  }
  const nums = drawingSet.sheets.map((s) => s.drawingNumber);
  if (new Set(nums).size !== nums.length) {
    throw new Error("Duplicate drawing numbers — bundle refused");
  }
}

export function buildDevelopmentArtifactBundle(
  project: ProjectModel,
  options?: { readonly generatedAt?: string; readonly appCommitSha?: string | null },
): ArtifactBundle {
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const drawingSet = buildGeneralArrangementDrawingSet(project, { generatedAt });
  assertBundleExportAllowed(project, drawingSet);

  const quantity = buildQuantityModel(project, { generatedAt });
  const report = buildReportModel(project, { generatedAt, appCommitSha: options?.appCommitSha });
  const schedule = buildMemberScheduleModel(project, { generatedAt });
  const section = buildStandardSectionDrawingModel(project, { generatedAt });

  const files: BundleFile[] = [];
  const pushText = (path: string, text: string) => {
    files.push(fileFromText(path, text));
  };

  const readme = `APOLLO DEVELOPMENT DELIVERABLES
UNVERIFIED DEVELOPMENT OUTPUT
NOT FOR DESIGN, FABRICATION OR CONSTRUCTION
USER REVIEW REQUIRED
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
DESIGN_OR_CONSTRUCTION_USE: PROHIBITED

generatedAt: ${generatedAt}
projectId: ${project.project.id}
inputRevision: ${drawingSet.inputRevision}
inputChecksum: ${drawingSet.inputChecksum}
appCommit: ${options?.appCommitSha ?? "UNKNOWN"}
drawingSetSchema: ${drawingSet.schemaVersion}
quantitySchema: ${quantity.schemaVersion}
reportSchema: ${report.schemaVersion}

Known limitations:
- Development drawings only (not fabrication / construction)
- Straight simple-span equal-depth non-composite RC-deck steel plate girder
- Bundle uses STORE ZIP (no compression dependency)
- PDF path is HTML print/Playwright-compatible A3 landscape sheets
`;

  pushText("00_README.txt", readme);
  pushText("02_input/project.json", `${JSON.stringify(project, null, 2)}\n`);
  pushText("03_results/calculation_results.json", reportModelToJson(report));
  pushText("04_results/calculation_results.csv", reportModelToCalculationCsv(report));
  pushText("05_quantities/quantities.json", quantityModelToJson(quantity));
  pushText("06_quantities/quantities.csv", quantityModelToCsv(quantity));
  pushText("07_report/development_calculation_report.html", renderReportModelHtml(report));
  pushText(
    "08_drawings/drawing_set.html",
    renderMultiSheetDrawingSetHtml(drawingSet),
  );
  pushText(
    `08_drawings/apollo-development-drawing-set_${project.project.id}_r${drawingSet.inputChecksum.slice(0, 8)}.html`,
    renderMultiSheetDrawingSetHtml(drawingSet),
  );

  drawingSet.sheets.forEach((sheet: SheetModel) => {
    const stem = SHEET_STEM[sheet.drawingNumber] ?? sheet.drawingNumber.toLowerCase();
    pushText(`09_drawings/${sheet.drawingNumber}_${stem}.svg`, renderSheetSvg(drawingSet, sheet));
    pushText(`10_drawings/${sheet.drawingNumber}_${stem}.dxf`, renderSheetDxf(drawingSet, sheet));
    pushText(`11_drawings/${sheet.drawingNumber}_${stem}.html`, renderSheetPdfHtml(drawingSet, sheet));
  });

  // S-01 standard section standalone
  pushText("12_drawings/S-01_standard_section.svg", renderDrawingSvg(section));
  pushText("12_drawings/S-01_standard_section.dxf", renderDrawingDxf(section));

  pushText("drawing_set.json", `${JSON.stringify(drawingSet, null, 2)}\n`);
  pushText("member_schedule.csv", memberScheduleToCsv(schedule));
  pushText("member_schedule.json", memberScheduleToJson(schedule));

  const qtyChecksum = computeContentChecksum(quantity).hexDigest;
  const reportChecksum = computeContentChecksum(report).hexDigest;
  const dsetChecksum = drawingSetChecksum(drawingSet);
  const scheduleChecksum = computeContentChecksum(schedule).hexDigest;

  const manifest = {
    bundleSchemaVersion: "1.0.0-development",
    projectId: project.project.id,
    revision: drawingSet.inputRevision,
    inputChecksum: drawingSet.inputChecksum,
    resultChecksum: drawingSet.resultChecksum,
    quantityChecksum: qtyChecksum,
    reportChecksum,
    drawingSetChecksum: dsetChecksum,
    memberScheduleChecksum: scheduleChecksum,
    appCommitSha: options?.appCommitSha ?? null,
    generatedAt,
    developmentStatus: "UNVERIFIED_DEVELOPMENT_ONLY",
    authorizationStatus: "NOT_GRANTED",
    warnings: [
      "UNVERIFIED DEVELOPMENT OUTPUT",
      "NOT FOR DESIGN, FABRICATION OR CONSTRUCTION",
      "USER REVIEW REQUIRED",
    ],
    unsupportedScope: [
      "curve/skew/continuous design drawings",
      "fabrication drawings",
      "formal authorization",
    ],
    files: files.map((f) => ({ path: f.path, size: f.size, sha256: f.sha256 })),
  };
  pushText("01_manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);

  const audit = {
    ...manifest,
    auditNote: "SHA256 recomputed for all files before ZIP",
  };
  pushText("audit_manifest.json", `${JSON.stringify(audit, null, 2)}\n`);

  const shaLines = files
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((f) => `${f.sha256}  ${f.path}`)
    .join("\n");
  pushText("SHA256SUMS.txt", `${shaLines}\n`);

  const zipEntries = files.map((f) => ({
    name: f.path,
    data: typeof f.content === "string" ? textToBytes(f.content) : f.content,
  }));
  const zipBytes = buildStoreZip(zipEntries);
  const zipSha256 = sha256Bytes(zipBytes);

  const filename = `apollo-development-deliverables_${project.project.id}_r${drawingSet.inputChecksum.slice(0, 8)}.zip`;

  return {
    bundleId: `bundle-${project.project.id}-${drawingSet.inputChecksum.slice(0, 12)}`,
    projectId: project.project.id,
    inputRevision: drawingSet.inputRevision,
    inputChecksum: drawingSet.inputChecksum,
    resultChecksum: drawingSet.resultChecksum,
    quantityChecksum: qtyChecksum,
    reportChecksum,
    drawingSetChecksum: dsetChecksum,
    memberScheduleChecksum: scheduleChecksum,
    generatedAt,
    developmentStatus: "UNVERIFIED_DEVELOPMENT_ONLY",
    authorizationStatus: "NOT_GRANTED",
    files,
    zipBytes,
    zipSha256,
    filename,
    warnings: manifest.warnings,
  };
}

export function downloadArtifactBundleZip(project: ProjectModel): void {
  const bundle = buildDevelopmentArtifactBundle(project);
  const blob = new Blob([bundle.zipBytes.buffer.slice(
    bundle.zipBytes.byteOffset,
    bundle.zipBytes.byteOffset + bundle.zipBytes.byteLength,
  ) as ArrayBuffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = bundle.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadMultiSheetDrawingSetHtml(project: ProjectModel): void {
  const model = buildGeneralArrangementDrawingSet(project);
  assertDrawingSetExportable(model);
  const html = renderMultiSheetDrawingSetHtml(model);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `apollo-development-drawing-set_${model.projectId}_r${model.inputChecksum.slice(0, 8)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
