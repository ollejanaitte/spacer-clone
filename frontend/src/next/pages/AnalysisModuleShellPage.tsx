/**
 * Analysis module shell page (Phase 11 P0-05 · AN-06).
 *
 * Dedicated production page for the analysis module:
 *   /app/projects/{id}/modules/analysis
 *
 * - Runs the solver via POST /api/design/analyze
 * - Evaluates IF3 authoritative (schema + source binding)
 * - Displays Reaction / N-Q-M-T / Deformed via AuthoritativeResultPanel
 * - Exports AN-05 CSV (displacements / reactions / member forces) when
 *   authoritative (fail-closed: STALE/INVALID results are not exported)
 */

import { useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { getModuleDefinition } from "../modules/registry";
import { readModuleFromManager } from "../modules/adapter";
import { MODULE_STATUS_LABELS } from "../modules/contract";
import { navigateTo, NEXT_PROJECT_HOME_PATH } from "../routes";
import type { ProjectModuleKey } from "../project/schema";
import { readAnalysisDocument, buildDerivedAnalysisDocument } from "../modules/cim/analysisCimLayer";
import { readSuperstructureDocument } from "../modules/superstructureModuleAdapter";
import { AuthoritativeResultPanel } from "../components/AuthoritativeResultPanel";
import { extractLinearStaticResultFromIf3, isAuthoritativeIf3For, type If3SourceDocumentRef } from "../modules/analysis/resultAdapter";
import { buildAnalysisCsvExports } from "../modules/deliverables/analysisCsv";
import type { FrameAnalysisResultResource } from "../../contracts/frameAnalysisResultResource";

function downloadText(fileName: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function AnalysisModuleShellPage({ projectId, moduleId }: { projectId: string; moduleId: string }) {
  const [project] = useState(() => getProjectManager().getProject(projectId));
  const definition = getModuleDefinition(moduleId as ProjectModuleKey);
  const [if3Result, setIf3Result] = useState<FrameAnalysisResultResource | null>(null);
  const [sourceDoc, setSourceDoc] = useState<If3SourceDocumentRef | null>(null);
  const [analysisMsg, setAnalysisMsg] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  async function handleRunAnalysis() {
    setRunning(true);
    setAnalysisMsg(null);
    setExportMsg(null);
    try {
      const doc = readAnalysisDocument(getProjectManager(), projectId) ?? buildDerivedAnalysisDocument(getProjectManager(), projectId);
      if (!doc) {
        setAnalysisMsg("解析Documentを生成できませんでした（上部工/Bridge Layoutの構成を確認してください）。");
        return;
      }
      const res = await fetch("/api/design/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisDocument: doc }),
      });
      if (!res.ok) {
        setAnalysisMsg(`解析実行失敗（HTTP ${res.status}）。`);
        return;
      }
      const data = (await res.json()) as { if3Result?: unknown };
      if (!data.if3Result) {
        setAnalysisMsg("IF3 Resultが返りませんでした。");
        return;
      }
      const sourceDocRef: If3SourceDocumentRef = {
        documentId: doc.documentId,
        revisionId: doc.revisionId,
        modelChecksum: doc.modelChecksum,
        nodeIds: doc.nodes.map((n) => n.entityId),
        memberIds: doc.members.map((m) => m.entityId),
      };
      const authoritative = isAuthoritativeIf3For(data.if3Result as FrameAnalysisResultResource, sourceDocRef);
      setIf3Result(data.if3Result as FrameAnalysisResultResource);
      setSourceDoc(sourceDocRef);
      const status = (data.if3Result as { status?: string }).status ?? "";
      if (status === "SUCCEEDED" && authoritative) {
        setAnalysisMsg("解析実行完了・authoritative IF3 Resultです。");
      } else {
        setAnalysisMsg(`解析は実行されましたがIF3 Resultはauthoritativeではありません（status=${status}${authoritative ? "" : "・schema/source違反"}）。`);
      }
    } catch (error) {
      setAnalysisMsg(`解析実行エラー: ${String(error)}`);
    } finally {
      setRunning(false);
    }
  }

  function handleExportCsv() {
    setExportMsg(null);
    if (!if3Result || !sourceDoc) {
      setExportMsg("AN-05: 解析結果がありません。");
      return;
    }
    if (!isAuthoritativeIf3For(if3Result, sourceDoc)) {
      setExportMsg("AN-05: IF3 Resultがauthoritativeではありません（export禁止・fail-closed）。");
      return;
    }
    const files = buildAnalysisCsvExports(if3Result);
    let total = 0;
    for (const file of files) {
      downloadText(file.fileName, file.content, "text/csv;charset=utf-8");
      total += new TextEncoder().encode(file.content).length;
    }
    setExportMsg(`AN-05: CSV出力（${files.length}ファイル・${total} bytes・authoritative）。`);
  }

  if (!project) {
    return (
      <section className="next-page" data-testid="analysis-module-page">
        <h1 className="next-page-title">解析</h1>
        <div className="next-error">Projectが見つかりません。</div>
        <button type="button" className="next-link-button" onClick={() => navigateTo(NEXT_PROJECT_HOME_PATH)}>← 戻る</button>
      </section>
    );
  }

  const status = readModuleFromManager(getProjectManager(), projectId, "analysis")?.state.status ?? definition?.defaultStatus ?? "notStarted";

  return (
    <section className="next-page" data-testid="analysis-module-page">
      <h1 className="next-page-title" data-testid="analysis-title">FEM / 構造解析</h1>
      <button type="button" className="next-link-button" data-testid="analysis-back" onClick={() => navigateTo(`${NEXT_PROJECT_HOME_PATH}/${projectId}`)}>
        ← Projectトップへ
      </button>

      <dl className="next-integrity-meta" data-testid="analysis-meta">
        <div><dt>moduleId</dt><dd>{moduleId}</dd></div>
        <div><dt>status</dt><dd data-testid="analysis-status">{MODULE_STATUS_LABELS[status]}</dd></div>
      </dl>

      <div className="next-form-row">
        <button type="button" className="next-button" data-testid="analysis-run" disabled={running} onClick={() => void handleRunAnalysis()}>
          {running ? "解析実行中..." : "解析実行"}
        </button>
        <button type="button" className="next-button" data-testid="analysis-export-csv" disabled={running} onClick={handleExportCsv}>
          CSV export（AN-05）
        </button>
      </div>
      {analysisMsg !== null && <p className="next-hint" data-testid="analysis-message">{analysisMsg}</p>}
      {exportMsg !== null && <p className="next-hint" data-testid="analysis-export-message">{exportMsg}</p>}

      <AuthoritativeResultPanel if3Result={if3Result} sourceDocument={sourceDoc} />
    </section>
  );
}
