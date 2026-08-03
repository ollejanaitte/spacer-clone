/**
 * Step 2-D / Step 3-E output integration panel — final development deliverables workflow.
 */
import { useState } from "react";
import type { ProjectModel } from "../../types";
import { assertIntegratedExportAllowed, buildIntegratedOutputs } from "../output/outputIntegration";
import { downloadQuantityCsv, downloadQuantityJson } from "../quantity/quantityExport";
import {
  downloadAuditManifest,
  downloadCalculationResultsCsv,
  downloadDevelopmentReportHtml,
  downloadDevelopmentReportJson,
  openDevelopmentReportPreview,
} from "../report/reportExport";
import {
  downloadDrawingDxf,
  downloadDrawingPdfHtml,
  downloadDrawingSvg,
  openDrawingPreview,
} from "../drawing/drawingExport";
import {
  downloadDrawingSetSheetDxf,
  downloadDrawingSetSheetPdfHtml,
  downloadDrawingSetSheetSvg,
  downloadMemberScheduleCsv,
  downloadMemberScheduleJson,
} from "../drawing/drawingSetExport";
import {
  downloadArtifactBundleZip,
  downloadMultiSheetDrawingSetHtml,
} from "../drawing/artifactBundle";

type Props = { readonly project: ProjectModel };

export function OutputIntegrationPanel({ project }: Props) {
  const [outputs, setOutputs] = useState(() => buildIntegratedOutputs(project));
  const [error, setError] = useState<string | null>(null);
  const [validationNote, setValidationNote] = useState<string | null>(null);

  const regenerate = () => {
    setError(null);
    setValidationNote(null);
    setOutputs(buildIntegratedOutputs(project));
  };

  const validateAll = () => {
    try {
      const next = buildIntegratedOutputs(project);
      setOutputs(next);
      if (next.consistency.overall !== "PASS") {
        throw new Error(`Consistency ${next.consistency.overall}`);
      }
      if (next.stale) throw new Error("STALE");
      setValidationNote(`VALIDATE PASS / sheets=${next.drawingSet.sheets.length} / ck=${next.inputChecksum.slice(0, 12)}`);
      setError(null);
    } catch (err) {
      setValidationNote(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const wrap = (fn: () => void) => {
    try {
      assertIntegratedExportAllowed(outputs);
      fn();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <article className="apollo-editor-card" data-testid="apollo-output-integration-panel">
      <div className="apollo-editor-card-header">
        <div>
          <h2>成果物統合（開発専用・最終）</h2>
          <p>数量・計算書・図面一式・ZIP の revision/checksum 整合と一括操作。</p>
        </div>
      </div>
      <p className="apollo-input-error" role="status" data-testid="apollo-output-integration-warning">
        UNVERIFIED DEVELOPMENT OUTPUT — NOT FOR DESIGN OR CONSTRUCTION — USER REVIEW REQUIRED
      </p>
      <p className="apollo-inline-hint" data-testid="apollo-output-integration-status">
        stale: {String(outputs.stale)} / consistency: {outputs.consistency.overall} / checksum:{" "}
        {outputs.inputChecksum.slice(0, 16)}… / qty:{outputs.statuses.quantity} / report:
        {outputs.statuses.report} / drawing:{outputs.statuses.drawing} / drawingSet:
        {outputs.statuses.drawingSet} / schedule:{outputs.statuses.memberSchedule} / bundle:
        {outputs.statuses.bundle} / formal:{outputs.statuses.formalReport}
      </p>
      <p data-testid="apollo-output-sheet-register">
        sheets: {outputs.drawingSet.sheets.map((s) => s.drawingNumber).join(", ") || "none"}
      </p>
      <div className="apollo-workspace-actions">
        <button type="button" className="apollo-button-secondary" data-testid="apollo-output-regenerate-all" onClick={regenerate}>
          全成果物を生成/再生成
        </button>
        <button type="button" className="apollo-button-secondary" data-testid="apollo-output-validate-all" onClick={validateAll}>
          全成果物を検証
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-zip"
          disabled={outputs.stale || outputs.statuses.bundle !== "READY"}
          onClick={() => wrap(() => downloadArtifactBundleZip(project))}
        >
          ZIPを作成
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-qty-csv"
          disabled={outputs.stale}
          onClick={() => wrap(() => downloadQuantityCsv(outputs.quantity))}
        >
          数量CSV
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-qty-json"
          disabled={outputs.stale}
          onClick={() => wrap(() => downloadQuantityJson(outputs.quantity))}
        >
          数量JSON
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-report"
          disabled={outputs.stale}
          onClick={() => wrap(() => openDevelopmentReportPreview(outputs.report))}
        >
          計算書preview
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-report-html"
          disabled={outputs.stale}
          onClick={() => wrap(() => downloadDevelopmentReportHtml(outputs.report))}
        >
          計算書HTML/PDF
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-report-json"
          disabled={outputs.stale}
          onClick={() => wrap(() => downloadDevelopmentReportJson(outputs.report))}
        >
          Report JSON
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-calc-csv"
          disabled={outputs.stale}
          onClick={() => wrap(() => downloadCalculationResultsCsv(outputs.report))}
        >
          計算結果CSV
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-audit"
          disabled={outputs.stale}
          onClick={() => wrap(() => downloadAuditManifest(outputs.report, project))}
        >
          audit
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-drawing-preview"
          disabled={outputs.stale || outputs.drawing.entities.length === 0}
          onClick={() => wrap(() => openDrawingPreview(outputs.drawing))}
        >
          断面preview
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-svg"
          disabled={outputs.stale || outputs.drawing.entities.length === 0}
          onClick={() => wrap(() => downloadDrawingSvg(outputs.drawing))}
        >
          断面SVG
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-dxf"
          disabled={outputs.stale || outputs.drawing.entities.length === 0}
          onClick={() => wrap(() => downloadDrawingDxf(outputs.drawing))}
        >
          断面DXF
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-drawing-pdf"
          disabled={outputs.stale || outputs.drawing.entities.length === 0}
          onClick={() => wrap(() => downloadDrawingPdfHtml(outputs.drawing))}
        >
          断面PDF用HTML
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-ga-svg"
          disabled={outputs.stale || outputs.drawingSet.sheets.length === 0}
          onClick={() => wrap(() => downloadDrawingSetSheetSvg(outputs.drawingSet, "G-01"))}
        >
          G-01 SVG
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-ga-dxf"
          disabled={outputs.stale || outputs.drawingSet.sheets.length === 0}
          onClick={() => wrap(() => downloadDrawingSetSheetDxf(outputs.drawingSet, "G-01"))}
        >
          G-01 DXF
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-ga-html"
          disabled={outputs.stale || outputs.drawingSet.sheets.length === 0}
          onClick={() => wrap(() => downloadDrawingSetSheetPdfHtml(outputs.drawingSet, "G-01"))}
        >
          G-01 HTML
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-multisheet"
          disabled={outputs.stale || outputs.drawingSet.sheets.length === 0}
          onClick={() => wrap(() => downloadMultiSheetDrawingSetHtml(project))}
        >
          図面一式HTML
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-schedule-csv"
          disabled={outputs.stale}
          onClick={() => wrap(() => downloadMemberScheduleCsv(project))}
        >
          部材表CSV
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-schedule-json"
          disabled={outputs.stale}
          onClick={() => wrap(() => downloadMemberScheduleJson(project))}
        >
          部材表JSON
        </button>
      </div>
      <p className="apollo-inline-hint" data-testid="apollo-output-bundle-status">
        BUNDLE_EXPORT: {outputs.statuses.bundle} (STORE ZIP development-only)
      </p>
      <div data-testid="apollo-output-user-checklist">
        <strong>User review checklist</strong>
        <ul>
          {outputs.userReviewChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      {validationNote ? (
        <p className="apollo-inline-hint" data-testid="apollo-output-validation-note">
          {validationNote}
        </p>
      ) : null}
      {error ? (
        <p className="apollo-input-error" role="alert" data-testid="apollo-output-export-error">
          {error}
        </p>
      ) : null}
    </article>
  );
}
