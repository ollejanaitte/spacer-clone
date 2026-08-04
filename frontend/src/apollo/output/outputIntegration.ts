/**
 * Step 2-D / Step 3-E output integration — revision/checksum consistency + artifact status.
 * UNVERIFIED DEVELOPMENT ONLY — NOT FOR DESIGN OR CONSTRUCTION
 */

import type { ProjectModel } from "../../types";
import { buildQuantityModel, findQuantityValue, type QuantityModel } from "../quantity/quantityModel";
import { buildReportModel, type ReportModel } from "../report/reportModel";
import { buildStandardSectionDrawingModel, type DrawingModel } from "../drawing/drawingModel";
import {
  buildGeneralArrangementDrawingSet,
  type DrawingSetModel,
} from "../drawing/drawingSetModel";
import { buildMemberScheduleModel, type MemberScheduleModel } from "../drawing/memberScheduleModel";
import { isBridgeStructureGenerationCurrent } from "../bridgeStructure/generateBsdd";

export type ArtifactStatus =
  | "NOT_GENERATED"
  | "READY"
  | "STALE"
  | "BLOCKED"
  | "ERROR"
  | "NOT_AUTHORIZED";

export type IntegratedOutputs = {
  readonly stale: boolean;
  readonly inputRevision: string;
  readonly inputChecksum: string;
  readonly quantity: QuantityModel;
  readonly report: ReportModel;
  readonly drawing: DrawingModel;
  readonly drawingSet: DrawingSetModel;
  readonly memberSchedule: MemberScheduleModel;
  readonly statuses: {
    readonly quantity: ArtifactStatus;
    readonly report: ArtifactStatus;
    readonly drawing: ArtifactStatus;
    readonly drawingSet: ArtifactStatus;
    readonly memberSchedule: ArtifactStatus;
    readonly bundle: ArtifactStatus;
    readonly formalReport: "NOT_AUTHORIZED";
  };
  readonly consistency: {
    readonly inputChecksumAligned: boolean;
    readonly quantityMatchesReportChapter: boolean;
    readonly drawingMatchesInput: boolean;
    readonly quantityMatchesSchedule: boolean;
    readonly drawingSetSheetCountOk: boolean;
    readonly overall: "PASS" | "FAIL";
  };
  readonly warnings: readonly string[];
  readonly userReviewChecklist: readonly string[];
};

function statusFor(stale: boolean, blocked: boolean): ArtifactStatus {
  if (stale) return "STALE";
  if (blocked) return "BLOCKED";
  return "READY";
}

export function buildIntegratedOutputs(project: ProjectModel): IntegratedOutputs {
  const stale = !isBridgeStructureGenerationCurrent(project);
  const quantity = buildQuantityModel(project);
  const report = buildReportModel(project);
  const drawing = buildStandardSectionDrawingModel(project);
  const drawingSet = buildGeneralArrangementDrawingSet(project);
  const memberSchedule = buildMemberScheduleModel(project);

  const inputChecksumAligned =
    quantity.inputChecksum === report.inputChecksum &&
    report.inputChecksum === drawing.inputChecksum &&
    drawing.inputChecksum === drawingSet.inputChecksum &&
    drawingSet.inputChecksum === memberSchedule.inputChecksum;

  const qtyVol = quantity.items.find((i) => i.quantityId === "QTY-MG-VALL")?.value ?? null;
  const reportQty = report.chapters
    .find((c) => c.id === "CH-QUANTITY")
    ?.rows.find((r) => r.label.includes("全主桁の全鋼体積"));
  const quantityMatchesReportChapter =
    qtyVol === null || reportQty === undefined
      ? true
      : reportQty.value === "NOT_AVAILABLE" || reportQty.value === String(qtyVol);

  const drawingMatchesInput =
    drawing.entities.length === 0 ||
    (drawing.layout.width === (project.apolloBridgeStructureInput?.width ?? drawing.layout.width) &&
      drawing.layout.girderCount ===
        (project.apolloBridgeStructureInput?.girderCount ?? drawing.layout.girderCount));

  const xbQty = findQuantityValue(quantity, "QTY-XB-N");
  const xbSchedule = memberSchedule.rows.find((r) => r.category === "CROSS_BEAM")?.count ?? null;
  const quantityMatchesSchedule =
    xbQty === null || xbSchedule === "NOT_AVAILABLE" ? true : xbQty === xbSchedule;

  const drawingSetSheetCountOk = drawingSet.sheets.length === 0 || drawingSet.sheets.length >= 7;

  const overall: "PASS" | "FAIL" =
    inputChecksumAligned &&
    quantityMatchesReportChapter &&
    drawingMatchesInput &&
    quantityMatchesSchedule &&
    drawingSetSheetCountOk
      ? "PASS"
      : "FAIL";

  const bundleStatus: ArtifactStatus = stale
    ? "STALE"
    : drawingSet.sheets.length < 7
      ? "BLOCKED"
      : "READY";

  return {
    stale,
    inputRevision: quantity.inputRevision,
    inputChecksum: quantity.inputChecksum,
    quantity,
    report,
    drawing,
    drawingSet,
    memberSchedule,
    statuses: {
      quantity: statusFor(quantity.stale, quantity.items.some((i) => i.quantityId === "QTY-BLOCKED")),
      report: statusFor(report.stale, false),
      drawing: statusFor(drawing.stale, drawing.entities.length === 0),
      drawingSet: statusFor(drawingSet.stale, drawingSet.sheets.length === 0),
      memberSchedule: statusFor(memberSchedule.stale, memberSchedule.rows.length === 0),
      bundle: bundleStatus,
      formalReport: "NOT_AUTHORIZED",
    },
    consistency: {
      inputChecksumAligned,
      quantityMatchesReportChapter,
      drawingMatchesInput,
      quantityMatchesSchedule,
      drawingSetSheetCountOk,
      overall,
    },
    warnings: [
      "UNVERIFIED DEVELOPMENT OUTPUT",
      "NOT FOR DESIGN OR CONSTRUCTION",
      "USER REVIEW REQUIRED",
      "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED",
      ...(stale ? ["STALE artifacts — regenerate before export"] : []),
    ],
    userReviewChecklist: [
      "A. 入力",
      "B. 3D",
      "C. 断面諸量",
      "D. 解析結果",
      "E. 候補需要値",
      "F. 数量",
      "G. 計算書",
      "H. 標準断面",
      "I. 平面図",
      "J. 側面図",
      "K. 配置図",
      "L. 支承/補剛材",
      "M. 部材表",
      "N. SVG／DXF／PDF出力",
      "O. ZIP",
      "P. 保存/再読込",
      "Q. 要再計算",
      "R. 数値の外部照合（人間）",
      "S. 正式承認（人間）",
    ],
  };
}

export function assertIntegratedExportAllowed(outputs: IntegratedOutputs): void {
  if (outputs.stale) throw new Error("STALE integrated export rejected");
  if (!outputs.consistency.inputChecksumAligned) {
    throw new Error("Checksum mismatch across quantity/report/drawing — fail-closed");
  }
  if (outputs.consistency.overall === "FAIL") {
    throw new Error("Cross-artifact consistency FAIL — export rejected");
  }
}
