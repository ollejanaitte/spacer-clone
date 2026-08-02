/**
 * Development report panel (Step 2-B).
 */
import { useState } from "react";
import type { ProjectModel } from "../../types";
import { buildReportModel } from "../report/reportModel";
import {
  downloadAuditManifest,
  downloadCalculationResultsCsv,
  downloadDevelopmentReportHtml,
  downloadDevelopmentReportJson,
  openDevelopmentReportPreview,
  tryBuildFormalReport,
} from "../report/reportExport";

type Props = { readonly project: ProjectModel };

export function ReportModelDevelopmentPanel({ project }: Props) {
  const [model, setModel] = useState(() => buildReportModel(project));
  const [error, setError] = useState<string | null>(null);

  const regenerate = () => {
    setError(null);
    setModel(buildReportModel(project));
  };

  const wrap = (fn: () => void) => {
    try {
      fn();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <article className="apollo-editor-card" data-testid="apollo-report-model-panel">
      <div className="apollo-editor-card-header">
        <div>
          <h2>計算書（開発版）</h2>
          <p>ReportModelから生成。アプリ画面の印刷を計算書としません。</p>
        </div>
      </div>
      <p className="apollo-input-error" role="status" data-testid="apollo-report-development-warning">
        UNVERIFIED DEVELOPMENT OUTPUT — NOT FOR DESIGN OR CONSTRUCTION — USER REVIEW REQUIRED
      </p>
      <p className="apollo-inline-hint" data-testid="apollo-report-provenance">
        mode: {model.mode} / NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED / stale: {String(model.stale)} /
        chapters: {model.chapters.length} / checksum: {model.resultChecksum.slice(0, 16)}…
      </p>
      <div className="apollo-workspace-actions">
        <button type="button" className="apollo-button-secondary" data-testid="apollo-report-regenerate" onClick={regenerate}>
          計算書を生成/再生成
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-report-preview"
          disabled={model.stale}
          onClick={() => wrap(() => openDevelopmentReportPreview(model))}
        >
          開発版計算書プレビュー
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-report-download-html"
          disabled={model.stale}
          onClick={() => wrap(() => downloadDevelopmentReportHtml(model))}
        >
          HTML出力（PDF化用）
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-report-download-json"
          disabled={model.stale}
          onClick={() => wrap(() => downloadDevelopmentReportJson(model))}
        >
          Report JSON
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-report-download-calc-csv"
          disabled={model.stale}
          onClick={() => wrap(() => downloadCalculationResultsCsv(model))}
        >
          計算結果CSV
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-report-download-audit"
          disabled={model.stale}
          onClick={() => wrap(() => downloadAuditManifest(model, project))}
        >
          監査manifest
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-report-formal-disabled"
          disabled
          title="NUMERIC_DESIGN_AUTHORIZATION=NOT_GRANTED"
          onClick={() => wrap(() => tryBuildFormalReport(project))}
        >
          正式計算書（無効）
        </button>
      </div>
      {error ? (
        <p className="apollo-input-error" role="alert" data-testid="apollo-report-export-error">
          {error}
        </p>
      ) : null}
      <ul data-testid="apollo-report-chapter-list">
        {model.chapters.map((chapter) => (
          <li key={chapter.id}>
            {chapter.id}: {chapter.title} ({chapter.rows.length})
          </li>
        ))}
      </ul>
    </article>
  );
}
