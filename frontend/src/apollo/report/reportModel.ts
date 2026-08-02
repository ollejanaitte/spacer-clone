/**
 * Development ReportModel (Step 2-B).
 * Structured report — NOT app-shell print-as-report.
 * UNVERIFIED DEVELOPMENT OUTPUT — NOT FOR DESIGN OR CONSTRUCTION
 * NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
 */

import type { ProjectModel } from "../../types";
import { computeContentChecksum } from "../../contracts/legacy/checksum";
import {
  buildInputChecksum,
  buildQuantityModel,
  type QuantityModel,
} from "../quantity/quantityModel";
import { getBridgeStructureInputDraft, isBridgeStructureGenerationCurrent } from "../bridgeStructure/generateBsdd";
import { computeGirderSectionProperties } from "../bridgeStructure/sectionProperties";

export const REPORT_MODEL_SCHEMA_VERSION = "1.0.0-development";
export const REPORT_MODE_DEVELOPMENT = "DEVELOPMENT" as const;
export const REPORT_MODE_FORMAL = "FORMAL" as const;

export type ReportMode = typeof REPORT_MODE_DEVELOPMENT | typeof REPORT_MODE_FORMAL;

/** Fixed chapter registry order (development). */
export const REPORT_CHAPTER_REGISTRY = [
  { id: "CH-COVER", title: "表紙・メタデータ" },
  { id: "CH-DESIGN-COND", title: "設計条件" },
  { id: "CH-STRUCTURE", title: "構造概要" },
  { id: "CH-INPUTS", title: "入力値" },
  { id: "CH-SECTION", title: "主桁断面諸量" },
  { id: "CH-LOADS", title: "荷重条件" },
  { id: "CH-ANALYSIS-SETTINGS", title: "解析条件" },
  { id: "CH-REACTIONS", title: "支点反力" },
  { id: "CH-SHEAR", title: "せん断力" },
  { id: "CH-MOMENT", title: "曲げモーメント" },
  { id: "CH-DEFLECTION", title: "たわみ" },
  { id: "CH-DEMAND", title: "demand candidate" },
  { id: "CH-QUANTITY", title: "数量" },
  { id: "CH-DRAWING-REF", title: "標準断面図参照" },
  { id: "CH-WARNINGS", title: "警告・未許可項目" },
  { id: "CH-AUDIT", title: "監査記録" },
] as const;

export type ReportChapterId = (typeof REPORT_CHAPTER_REGISTRY)[number]["id"];

export type ReportRow = {
  readonly label: string;
  readonly value: string;
  readonly unit: string;
  readonly status: string;
  readonly note?: string;
};

export type ReportChapter = {
  readonly id: ReportChapterId;
  readonly title: string;
  readonly rows: readonly ReportRow[];
};

export type ReportModel = {
  readonly schemaVersion: typeof REPORT_MODEL_SCHEMA_VERSION;
  readonly reportId: string;
  readonly projectId: string;
  readonly inputRevision: string;
  readonly inputChecksum: string;
  readonly resultRevision: string;
  readonly resultChecksum: string;
  readonly quantityChecksum: string;
  readonly generatedAt: string;
  readonly mode: typeof REPORT_MODE_DEVELOPMENT;
  readonly authorizationStatus: "NOT_GRANTED";
  readonly designOrConstructionUse: "PROHIBITED";
  readonly developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY";
  readonly stale: boolean;
  readonly warnings: readonly string[];
  readonly chapters: readonly ReportChapter[];
  readonly audit: {
    readonly appCommitSha: string | null;
    readonly schemaVersions: readonly string[];
    readonly calculationReferenceIds: readonly string[];
    readonly formalOkNgEmitted: false;
  };
};

function row(label: string, value: string | number | null | undefined, unit = "", status = "UNVERIFIED", note?: string): ReportRow {
  const display =
    value === null || value === undefined || value === ""
      ? "NOT_AVAILABLE"
      : typeof value === "number"
        ? String(value)
        : value;
  return { label, value: display, unit, status, ...(note ? { note } : {}) };
}

export function assertDevelopmentReportExportable(model: ReportModel): void {
  if (model.stale) throw new Error("STALE report export rejected");
  if (model.mode !== REPORT_MODE_DEVELOPMENT) throw new Error("Only DEVELOPMENT reports are exportable");
  if (model.authorizationStatus !== "NOT_GRANTED") {
    throw new Error("Unexpected authorizationStatus");
  }
}

export function assertFormalReportRejected(_project: ProjectModel): never {
  throw new Error(
    "FORMAL report export rejected: NUMERIC_DESIGN_AUTHORIZATION=NOT_GRANTED (fail-closed)",
  );
}

export function buildReportModel(
  project: ProjectModel,
  options?: { readonly generatedAt?: string; readonly appCommitSha?: string | null },
): ReportModel {
  const draft = getBridgeStructureInputDraft(project);
  const stale = !isBridgeStructureGenerationCurrent(project);
  const inputChecksum = buildInputChecksum(draft);
  const inputRevision = draft.generatedAt ?? "STALE_OR_UNGENERATED";
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const quantity = buildQuantityModel(project, { generatedAt });
  const section =
    draft.spanLength !== null &&
    draft.bridgeLength !== null &&
    draft.width !== null &&
    draft.girderCount !== null &&
    draft.girderSpacing !== null &&
    draft.girderDepth !== null &&
    draft.topFlangeWidth !== null &&
    draft.topFlangeThickness !== null &&
    draft.bottomFlangeWidth !== null &&
    draft.bottomFlangeThickness !== null &&
    draft.webThickness !== null &&
    draft.deckThickness !== null &&
    draft.crossBeamSpacing !== null
      ? computeGirderSectionProperties({
          spanLength: draft.spanLength,
          bridgeLength: draft.bridgeLength,
          width: draft.width,
          girderCount: draft.girderCount,
          girderSpacing: draft.girderSpacing,
          girderDepth: draft.girderDepth,
          topFlangeWidth: draft.topFlangeWidth,
          topFlangeThickness: draft.topFlangeThickness,
          bottomFlangeWidth: draft.bottomFlangeWidth,
          bottomFlangeThickness: draft.bottomFlangeThickness,
          webThickness: draft.webThickness,
          deckThickness: draft.deckThickness,
          crossBeamSpacing: draft.crossBeamSpacing,
        })
      : null;

  const warnings = [
    "UNVERIFIED DEVELOPMENT OUTPUT",
    "NOT FOR DESIGN OR CONSTRUCTION",
    "USER REVIEW REQUIRED",
    "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED",
    ...(stale ? ["STALE: regenerate before export"] : []),
  ];

  const chapters: ReportChapter[] = [
    {
      id: "CH-COVER",
      title: "表紙・メタデータ",
      rows: [
        row("projectId", project.project.id),
        row("projectName", project.project.name),
        row("mode", "DEVELOPMENT"),
        row("authorizationStatus", "NOT_GRANTED"),
        row("generatedAt", generatedAt),
        row("watermark", "UNVERIFIED DEVELOPMENT OUTPUT"),
      ],
    },
    {
      id: "CH-DESIGN-COND",
      title: "設計条件",
      rows: [
        row("bridgeSystem", draft.bridgeSystem),
        row("formalStandards", "NOT_ADOPTED", "", "NOT_AUTHORIZED"),
        row("numericAuthorization", "NOT_GRANTED", "", "NOT_AUTHORIZED"),
      ],
    },
    {
      id: "CH-STRUCTURE",
      title: "構造概要",
      rows: [
        row("bridgeLength", draft.bridgeLength, "m"),
        row("width", draft.width, "m"),
        row("girderCount", draft.girderCount, "本"),
        row("girderSpacing", draft.girderSpacing, "m"),
        row("girderDepth", draft.girderDepth, "m"),
      ],
    },
    {
      id: "CH-INPUTS",
      title: "入力値",
      rows: [
        row("topFlange", `${draft.topFlangeWidth} x ${draft.topFlangeThickness}`, "m"),
        row("bottomFlange", `${draft.bottomFlangeWidth} x ${draft.bottomFlangeThickness}`, "m"),
        row("webThickness", draft.webThickness, "m"),
        row("deckThickness", draft.deckThickness, "m"),
        row("steelUnitWeight", draft.steelUnitWeight, "kN/m3", draft.steelUnitWeight == null ? "NOT_AVAILABLE" : "USER_PROVIDED_UNVERIFIED"),
        row("rcUnitWeight", draft.rcUnitWeight, "kN/m3", draft.rcUnitWeight == null ? "NOT_AVAILABLE" : "USER_PROVIDED_UNVERIFIED"),
      ],
    },
    {
      id: "CH-SECTION",
      title: "主桁断面諸量",
      rows: section
        ? [
            row("webHeight", section.webHeight, "m", "UNVERIFIED"),
            row("totalArea", section.totalArea, "m2", "UNVERIFIED"),
            row("centroidFromBottom", section.centroidFromBottom, "m", "UNVERIFIED"),
            row("secondMomentOfArea", section.secondMomentOfArea, "m4", "UNVERIFIED"),
            row("sectionModulusTop", section.sectionModulusTop, "m3", "UNVERIFIED"),
            row("sectionModulusBottom", section.sectionModulusBottom, "m3", "UNVERIFIED"),
            row("steelVolumePerGirder", section.steelVolumePerGirder, "m3", "UNVERIFIED"),
          ]
        : [row("sectionProperties", null, "", "NOT_AVAILABLE", "断面入力不完全")],
    },
    {
      id: "CH-LOADS",
      title: "荷重条件",
      rows: [
        row("developmentFixtures", "GOLD-AN-001/002 available via analysis probe", "", "UNVERIFIED"),
        row("projectLoadCases", String(project.loadCases?.length ?? 0), "count", "UNVERIFIED"),
      ],
    },
    {
      id: "CH-ANALYSIS-SETTINGS",
      title: "解析条件",
      rows: [
        row("solver", "scipy_sparse (development probe)", "", "UNVERIFIED"),
        row("analysisType", "linear_static", "", "UNVERIFIED"),
        row("formalAuthorization", "NOT_GRANTED", "", "NOT_AUTHORIZED"),
      ],
    },
    {
      id: "CH-REACTIONS",
      title: "支点反力",
      rows: [row("reactions", null, "kN", "NOT_AVAILABLE", "プロジェクト解析結果未添付時は空欄（0埋めしない）")],
    },
    {
      id: "CH-SHEAR",
      title: "せん断力",
      rows: [row("shear", null, "kN", "NOT_AVAILABLE")],
    },
    {
      id: "CH-MOMENT",
      title: "曲げモーメント",
      rows: [row("moment", null, "kN·m", "NOT_AVAILABLE")],
    },
    {
      id: "CH-DEFLECTION",
      title: "たわみ",
      rows: [row("deflection", null, "m", "NOT_AVAILABLE")],
    },
    {
      id: "CH-DEMAND",
      title: "demand candidate",
      rows: [
        row("status", "CANDIDATE / UNVERIFIED / USER REVIEW REQUIRED"),
        row("formalOkNg", "NOT_EMITTED", "", "NOT_AUTHORIZED"),
        row("basis", "GOLD-AN-001 × GOLD-SP-001 development references"),
      ],
    },
    {
      id: "CH-QUANTITY",
      title: "数量",
      rows: quantity.items
        .filter((item) =>
          ["QTY-MG-VALL", "QTY-DK-VOL", "QTY-MG-W", "QTY-DK-W", "QTY-PAINT-GEOM", "QTY-PV-VOL"].includes(
            item.quantityId,
          ),
        )
        .map((item) =>
          row(
            item.label,
            item.value,
            item.unit,
            item.status,
            item.calculationBasis,
          ),
        ),
    },
    {
      id: "CH-DRAWING-REF",
      title: "標準断面図参照",
      rows: [
        row("drawingType", "STANDARD_SECTION"),
        row("status", "DEVELOPMENT_PREVIEW_PENDING_OR_LINKED"),
        row("fabricationDrawing", "NO — NOT A FABRICATION DRAWING"),
      ],
    },
    {
      id: "CH-WARNINGS",
      title: "警告・未許可項目",
      rows: warnings.map((w, index) => row(`warning_${index + 1}`, w, "", "WARNING")),
    },
    {
      id: "CH-AUDIT",
      title: "監査記録",
      rows: [
        row("inputRevision", inputRevision),
        row("inputChecksum", inputChecksum),
        row("quantityChecksum", computeContentChecksum(quantity).hexDigest),
        row("stale", String(stale)),
        row("formalOkNgEmitted", "false"),
        row("appCommitSha", options?.appCommitSha ?? "NOT_CAPTURED_IN_BROWSER"),
      ],
    },
  ];

  // Validate registry completeness / order
  if (chapters.length !== REPORT_CHAPTER_REGISTRY.length) {
    throw new Error("Report chapter count mismatch");
  }
  for (let i = 0; i < REPORT_CHAPTER_REGISTRY.length; i += 1) {
    if (chapters[i]!.id !== REPORT_CHAPTER_REGISTRY[i]!.id) {
      throw new Error(`Report chapter order mismatch at ${i}`);
    }
  }

  const resultPayload = { chapters, inputChecksum, quantityChecksum: computeContentChecksum(quantity).hexDigest };
  const resultChecksum = computeContentChecksum(resultPayload).hexDigest;

  return {
    schemaVersion: REPORT_MODEL_SCHEMA_VERSION,
    reportId: `rpt-${project.project.id}-${inputChecksum.slice(0, 12)}`,
    projectId: project.project.id,
    inputRevision,
    inputChecksum,
    resultRevision: generatedAt,
    resultChecksum,
    quantityChecksum: computeContentChecksum(quantity).hexDigest,
    generatedAt,
    mode: REPORT_MODE_DEVELOPMENT,
    authorizationStatus: "NOT_GRANTED",
    designOrConstructionUse: "PROHIBITED",
    developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY",
    stale,
    warnings,
    chapters,
    audit: {
      appCommitSha: options?.appCommitSha ?? null,
      schemaVersions: [REPORT_MODEL_SCHEMA_VERSION, quantity.schemaVersion],
      calculationReferenceIds: ["GOLD-SP-001", "GOLD-AN-001", "GOLD-QTY-001"],
      formalOkNgEmitted: false,
    },
  };
}

export function reportModelToJson(model: ReportModel): string {
  return `${JSON.stringify(model, null, 2)}\n`;
}

export function reportModelToCalculationCsv(model: ReportModel): string {
  const header =
    "loadCaseId,station,reaction,shear,moment,deflection,demandCandidate,unit,status,inputRevision,inputChecksum";
  // No zero-fill: emit NOT_AVAILABLE placeholders for missing analysis series.
  const row = [
    "NOT_AVAILABLE",
    "NOT_AVAILABLE",
    "",
    "",
    "",
    "",
    "CANDIDATE",
    "",
    "NOT_AVAILABLE",
    model.inputRevision,
    model.inputChecksum,
  ].join(",");
  return `\uFEFF${header}\n${row}\n`;
}

export function reportModelToQuantityCsv(quantity: QuantityModel): string {
  const header = "quantityId,label,value,unit,status,basis,inputRevision,inputChecksum";
  const rows = quantity.items.map((item) =>
    [
      item.quantityId,
      item.label.replaceAll(",", ";"),
      item.value ?? "",
      item.unit,
      item.status,
      item.calculationBasis,
      quantity.inputRevision,
      quantity.inputChecksum,
    ].join(","),
  );
  return `\uFEFF${[header, ...rows].join("\n")}\n`;
}

export function renderReportModelHtml(model: ReportModel): string {
  const chaptersHtml = model.chapters
    .map((chapter) => {
      const rows = chapter.rows
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.value)}</td><td>${escapeHtml(r.unit)}</td><td>${escapeHtml(r.status)}</td><td>${escapeHtml(r.note ?? "")}</td></tr>`,
        )
        .join("");
      return `<section id="${chapter.id}"><h2>${escapeHtml(chapter.title)}</h2><table><thead><tr><th>項目</th><th>値</th><th>単位</th><th>状態</th><th>注記</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8"/>
<title>Apollo Development Report ${escapeHtml(model.reportId)}</title>
<style>
  body { font-family: "Noto Sans JP", "Hiragino Sans", sans-serif; margin: 24px; color: #111; }
  .watermark { color: #b00020; font-weight: 700; border: 2px solid #b00020; padding: 8px; margin-bottom: 16px; }
  .meta { font-size: 12px; color: #333; margin-bottom: 16px; }
  h1 { font-size: 20px; }
  h2 { font-size: 16px; margin-top: 24px; border-bottom: 1px solid #ccc; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; vertical-align: top; }
  @page { size: A4 portrait; margin: 16mm; }
  @media print {
    .no-print { display: none; }
    section { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="watermark">UNVERIFIED DEVELOPMENT OUTPUT — NOT FOR DESIGN OR CONSTRUCTION — USER REVIEW REQUIRED — NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED</div>
  <h1>開発版計算書（ReportModel）</h1>
  <div class="meta">
    reportId: ${escapeHtml(model.reportId)}<br/>
    revision: ${escapeHtml(model.inputRevision)}<br/>
    checksum: ${escapeHtml(model.resultChecksum.slice(0, 16))}…<br/>
    generatedAt: ${escapeHtml(model.generatedAt)}
  </div>
  <p class="no-print"><button onclick="window.print()">Print / Save as PDF</button></p>
  ${chaptersHtml}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildAuditManifest(model: ReportModel, quantity: QuantityModel): string {
  return `${JSON.stringify(
    {
      reportId: model.reportId,
      inputChecksum: model.inputChecksum,
      resultChecksum: model.resultChecksum,
      quantityChecksum: model.quantityChecksum,
      drawingChecksum: "PENDING_STEP_2C",
      appCommitSha: model.audit.appCommitSha,
      schemaVersions: model.audit.schemaVersions,
      calculationReferenceIds: model.audit.calculationReferenceIds,
      authorizationStatus: model.authorizationStatus,
      stale: model.stale,
      formalOkNgEmitted: false,
      warnings: model.warnings,
      exportedAt: new Date().toISOString(),
      quantityModelId: quantity.quantityModelId,
    },
    null,
    2,
  )}\n`;
}
