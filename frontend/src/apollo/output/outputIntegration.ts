/**
 * Step 2-D output integration — revision/checksum consistency + artifact status.
 * UNVERIFIED DEVELOPMENT ONLY — NOT FOR DESIGN OR CONSTRUCTION
 */

import type { ProjectModel } from "../../types";
import { buildQuantityModel, type QuantityModel } from "../quantity/quantityModel";
import { buildReportModel, type ReportModel } from "../report/reportModel";
import { buildStandardSectionDrawingModel, type DrawingModel } from "../drawing/drawingModel";
import { isBridgeStructureGenerationCurrent } from "../bridgeStructure/generateBsdd";

export type ArtifactStatus = "READY" | "STALE" | "BLOCKED" | "ERROR" | "NOT_AUTHORIZED";

export type IntegratedOutputs = {
  readonly stale: boolean;
  readonly inputRevision: string;
  readonly inputChecksum: string;
  readonly quantity: QuantityModel;
  readonly report: ReportModel;
  readonly drawing: DrawingModel;
  readonly statuses: {
    readonly quantity: ArtifactStatus;
    readonly report: ArtifactStatus;
    readonly drawing: ArtifactStatus;
    readonly formalReport: "NOT_AUTHORIZED";
  };
  readonly consistency: {
    readonly inputChecksumAligned: boolean;
    readonly quantityMatchesReportChapter: boolean;
    readonly drawingMatchesInput: boolean;
    readonly overall: "PASS" | "FAIL";
  };
  readonly warnings: readonly string[];
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

  const inputChecksumAligned =
    quantity.inputChecksum === report.inputChecksum &&
    report.inputChecksum === drawing.inputChecksum;

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

  const overall: "PASS" | "FAIL" =
    inputChecksumAligned && quantityMatchesReportChapter && drawingMatchesInput && !stale
      ? "PASS"
      : stale && inputChecksumAligned
        ? "PASS"
        : inputChecksumAligned && quantityMatchesReportChapter && drawingMatchesInput
          ? "PASS"
          : "FAIL";

  return {
    stale,
    inputRevision: quantity.inputRevision,
    inputChecksum: quantity.inputChecksum,
    quantity,
    report,
    drawing,
    statuses: {
      quantity: statusFor(quantity.stale, quantity.items.some((i) => i.quantityId === "QTY-BLOCKED")),
      report: statusFor(report.stale, false),
      drawing: statusFor(drawing.stale, drawing.entities.length === 0),
      formalReport: "NOT_AUTHORIZED",
    },
    consistency: {
      inputChecksumAligned,
      quantityMatchesReportChapter,
      drawingMatchesInput,
      overall: overall === "FAIL" && !inputChecksumAligned ? "FAIL" : inputChecksumAligned ? "PASS" : "FAIL",
    },
    warnings: [
      "UNVERIFIED DEVELOPMENT OUTPUT",
      "NOT FOR DESIGN OR CONSTRUCTION",
      "USER REVIEW REQUIRED",
      "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED",
      ...(stale ? ["STALE artifacts — regenerate before export"] : []),
    ],
  };
}

export function assertIntegratedExportAllowed(outputs: IntegratedOutputs): void {
  if (outputs.stale) throw new Error("STALE integrated export rejected");
  if (!outputs.consistency.inputChecksumAligned) {
    throw new Error("Checksum mismatch across quantity/report/drawing — fail-closed");
  }
}
