/**
 * Step 2-D output integration panel.
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

type Props = { readonly project: ProjectModel };

export function OutputIntegrationPanel({ project }: Props) {
  const [outputs, setOutputs] = useState(() => buildIntegratedOutputs(project));
  const [error, setError] = useState<string | null>(null);

  const regenerate = () => {
    setError(null);
    setOutputs(buildIntegratedOutputs(project));
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
          <h2>成果物統合（開発専用）</h2>
          <p>数量・計算書・標準断面図の revision/checksum 整合と一括状態確認。</p>
        </div>
      </div>
      <p className="apollo-input-error" role="status" data-testid="apollo-output-integration-warning">
        UNVERIFIED DEVELOPMENT OUTPUT — NOT FOR DESIGN OR CONSTRUCTION — USER REVIEW REQUIRED
      </p>
      <p className="apollo-inline-hint" data-testid="apollo-output-integration-status">
        stale: {String(outputs.stale)} / consistency: {outputs.consistency.overall} / checksum:{" "}
        {outputs.inputChecksum.slice(0, 16)}… / qty:{outputs.statuses.quantity} / report:
        {outputs.statuses.report} / drawing:{outputs.statuses.drawing} / formal:
        {outputs.statuses.formalReport}
      </p>
      <div className="apollo-workspace-actions">
        <button type="button" className="apollo-button-secondary" data-testid="apollo-output-regenerate-all" onClick={regenerate}>
          全成果物を再生成
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
          SVG
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-dxf"
          disabled={outputs.stale || outputs.drawing.entities.length === 0}
          onClick={() => wrap(() => downloadDrawingDxf(outputs.drawing))}
        >
          DXF
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-output-export-drawing-pdf"
          disabled={outputs.stale || outputs.drawing.entities.length === 0}
          onClick={() => wrap(() => downloadDrawingPdfHtml(outputs.drawing))}
        >
          図面PDF用HTML
        </button>
      </div>
      <p className="apollo-inline-hint" data-testid="apollo-output-bundle-status">
        BUNDLE_EXPORT: BLOCKED_INDIVIDUAL_DOWNLOADS_ONLY (no new zip dependency added)
      </p>
      {error ? (
        <p className="apollo-input-error" role="alert" data-testid="apollo-output-export-error">
          {error}
        </p>
      ) : null}
    </article>
  );
}
