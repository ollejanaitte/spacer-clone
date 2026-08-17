/**
 * CIM / 統合3D module shell page (Phase 8-02 WP-A).
 *
 * Displays the derived integrated 3D scene from all module canonical sources
 * with per-layer visibility, object selection (source module / sourceEntityId
 * / stableId / coordinate context), and camera fit/reset + view presets.
 */

import { useEffect, useMemo, useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { getModuleDefinition } from "../modules/registry";
import { readModuleFromManager } from "../modules/adapter";
import { MODULE_STATUS_LABELS } from "../modules/contract";
import { navigateTo, NEXT_PROJECT_HOME_PATH } from "../routes";
import { buildIntegrated3DScene } from "../modules/cim/cimSceneBuilder";
import { readAnalysisDocument, buildDerivedAnalysisDocument } from "../modules/cim/analysisCimLayer";
import { readSuperstructureDocument } from "../modules/superstructureModuleAdapter";
import { readRoadData } from "../modules/roadModuleAdapter";
import {
  CIM_LAYER_IDS,
  CIM_LAYER_LABELS,
  defaultCimLayerState,
  type CimEntityMetadata,
  type CimLayerId,
} from "../modules/cim/integrated3dScene";
import { Cim3DViewer, type CimViewPreset } from "../components/Cim3DViewer";
import { AuthoritativeResultPanel } from "../components/AuthoritativeResultPanel";
import { exportCimSceneAsGlb, downloadGlb } from "../modules/cim/cimExport";
import { isAuthoritativeIf3For, type If3SourceDocumentRef } from "../modules/analysis/resultAdapter";
import type { ProjectModuleKey } from "../project/schema";

const CIM_UI_STATE_KEY = "spacer.cim.uiState.v1";

interface CimUiState {
  readonly layerState?: Partial<Record<CimLayerId, boolean>>;
  readonly viewPreset?: CimViewPreset;
  readonly transparency?: number;
}

function loadCimUiState(projectId: string): CimUiState | null {
  try {
    const raw = window.localStorage.getItem(`${CIM_UI_STATE_KEY}.${projectId}`);
    return raw ? (JSON.parse(raw) as CimUiState) : null;
  } catch {
    return null;
  }
}

export function CimModuleShellPage({ projectId, moduleId }: { projectId: string; moduleId: string }) {
  const [project] = useState(() => getProjectManager().getProject(projectId));
  const definition = getModuleDefinition(moduleId as ProjectModuleKey);
  const [uiState] = useState<CimUiState>(() => loadCimUiState(projectId) ?? {});
  const [layerState, setLayerState] = useState<Record<CimLayerId, boolean>>(() => ({
    ...defaultCimLayerState(),
    ...(uiState?.layerState ?? {}),
  }));
  const [viewPreset, setViewPreset] = useState<CimViewPreset>(uiState?.viewPreset ?? "perspective");
  const [transparency, setTransparency] = useState<number>(uiState?.transparency ?? 1);
  const [selected, setSelected] = useState<CimEntityMetadata | null>(null);
  const [exportingGlb, setExportingGlb] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  async function handleExportGlb() {
    setExportingGlb(true);
    setExportMessage(null);
    try {
      const result = await exportCimSceneAsGlb(scene);
      if (result.ok && result.glb) {
        downloadGlb(result.glb);
        setExportMessage("glTF（.glb）を書き出しました。");
      } else {
        setExportMessage(`書き出し失敗: ${result.issues.join("; ")}`);
      }
    } catch (error) {
      setExportMessage(`書き出し失敗: ${String(error)}`);
    } finally {
      setExportingGlb(false);
    }
  }

  const [resultComponent, setResultComponent] = useState<"N" | "Q" | "M" | "T">("N");
  const [if3Result, setIf3Result] = useState<unknown>(null);
  const [analysisSourceDoc, setAnalysisSourceDoc] = useState<If3SourceDocumentRef | null>(null);
  const [analysisMsg, setAnalysisMsg] = useState<string | null>(null);
  const [runningAnalysis, setRunningAnalysis] = useState(false);

  const scene = useMemo(() => {
    return buildIntegrated3DScene(getProjectManager(), projectId, {
      if3Result: if3Result as import("../../contracts/frameAnalysisResultResource").FrameAnalysisResultResource | null,
      resultComponent,
    });
  }, [projectId, if3Result, resultComponent]);

  async function handleRunAnalysis() {
    setRunningAnalysis(true);
    setAnalysisMsg(null);
    try {
      const superDoc = readSuperstructureDocument(getProjectManager(), projectId);
      const roadData = readRoadData(getProjectManager(), projectId);
      const doc = readAnalysisDocument(getProjectManager(), projectId) ?? buildDerivedAnalysisDocument(getProjectManager(), projectId);
      if (!doc) {
        setAnalysisMsg(`解析Documentを生成できませんでした（上部工/Bridge Layoutの構成を確認してください）。`);
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
      const status = (data.if3Result as { status?: string })?.status ?? "";
      // Runtime schema + source binding validation (Sol review #2): malformed
      // SUCCEEDED results or results not bound to the current AnalysisDocument
      // are NOT authoritative.
      const sourceDoc: If3SourceDocumentRef = {
        documentId: doc.documentId,
        revisionId: doc.revisionId,
        modelChecksum: doc.modelChecksum,
        nodeIds: doc.nodes.map((n) => n.entityId),
        memberIds: doc.members.map((m) => m.entityId),
      };
      const authoritative = isAuthoritativeIf3For(
        data.if3Result as import("../../contracts/frameAnalysisResultResource").FrameAnalysisResultResource,
        sourceDoc,
      );
      setIf3Result(data.if3Result);
      setAnalysisSourceDoc(sourceDoc);
      if (status === "SUCCEEDED" && authoritative) {
        setAnalysisMsg("解析実行完了・authoritative IF3 Resultをoverlayしました。");
      } else {
        setAnalysisMsg(`解析は実行されましたがIF3 Resultはauthoritativeではありません（status=${status}${authoritative ? "" : "・schema/source違反"}）。上部工断面/荷重の入力を確認してください。`);
      }
    } catch (error) {
      setAnalysisMsg(`解析実行エラー: ${String(error)}`);
    } finally {
      setRunningAnalysis(false);
    }
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `${CIM_UI_STATE_KEY}.${projectId}`,
        JSON.stringify({ layerState, viewPreset, transparency }),
      );
    } catch {
      // ignore persistence failures
    }
  }, [projectId, layerState, viewPreset, transparency]);

  if (!project) {
    return (
      <section className="next-page next-page-wide" data-testid="module-shell-page">
        <h1 className="next-page-title">CIM / 統合3D</h1>
        <div className="next-error" data-testid="cim-module-not-found">
          Projectが見つかりません。
        </div>
        <button type="button" className="next-link-button" onClick={() => navigateTo(NEXT_PROJECT_HOME_PATH)}>
          ← 戻る
        </button>
      </section>
    );
  }

  const moduleData = readModuleFromManager(getProjectManager(), projectId, "cim");
  const status = moduleData?.state.status ?? "notStarted";

  const toggleLayer = (layer: CimLayerId) => {
    setLayerState((current) => ({ ...current, [layer]: !current[layer] }));
  };

  const metaCount = scene.metadata.length;
  const analysisResultEntry = scene.regeneratedFrom.find((r) => r.module === "analysisResult");
  const analysisResultStatus = analysisResultEntry
    ? analysisResultEntry.checksum === "stale" ? "STALE（警告）"
      : analysisResultEntry.checksum === "invalid" ? "INVALID"
      : "authoritative"
    : "none";

  return (
    <section className="next-page next-page-wide" data-testid="module-shell-page">
      <h1 className="next-page-title" data-testid="module-shell-title">CIM / 統合3D</h1>
      <button
        type="button"
        className="next-link-button"
        data-testid="cim-module-back"
        onClick={() => navigateTo(`${NEXT_PROJECT_HOME_PATH}/${projectId}`)}
      >
        ← Projectトップへ
      </button>

      <details className="next-dev-info" data-testid="cim-module-dev-info">
        <summary>詳細・デバッグ情報</summary>
        <dl className="next-integrity-meta" data-testid="cim-module-meta">
          <div><dt>moduleId</dt><dd>{moduleId}</dd></div>
          <div><dt>displayName</dt><dd>{definition?.displayName}</dd></div>
          <div><dt>moduleVersion</dt><dd>{definition?.moduleVersion}</dd></div>
          <div>
            <dt>status</dt>
            <dd data-testid="module-shell-status">{MODULE_STATUS_LABELS[status]}</dd>
          </div>
          <div>
            <dt>Validation</dt>
            <dd data-testid="cim-module-validation">{scene.ok ? "OK" : "NG"}</dd>
          </div>
          <div>
            <dt>Entity数</dt>
            <dd data-testid="cim-module-entities">{metaCount}</dd>
          </div>
          <div>
            <dt>解析結果</dt>
            <dd data-testid="cim-result-status">{analysisResultStatus}</dd>
          </div>
        </dl>
      </details>

      {scene.issues.length > 0 && (
        <ul className="next-integrity-reasons" data-testid="cim-issues">
          {scene.issues.map((issue) => (
            <li key={`${issue.path}:${issue.message}`}>{issue.path}: {issue.message}</li>
          ))}
        </ul>
      )}

      <div className="cim-layout" data-testid="cim-layout">
        <aside className="cim-layer-panel" data-testid="cim-layer-panel">
          <h2 className="next-home-section-title">レイヤー</h2>
          <ul className="cim-layer-list">
            {CIM_LAYER_IDS.map((layer) => (
              <li key={layer}>
                <label className="cim-layer-toggle">
                  <input
                    type="checkbox"
                    data-testid={`cim-layer-${layer}`}
                    checked={layerState[layer]}
                    onChange={() => toggleLayer(layer)}
                  />
                  <span>{CIM_LAYER_LABELS[layer]}</span>
                </label>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="cim-selected-info" data-testid="cim-selected-info">
              <h3 className="next-home-section-title">選択エンティティ</h3>
              <dl>
                <div><dt>ソース</dt><dd>{CIM_LAYER_LABELS[selected.sourceModule]}</dd></div>
                <div><dt>sourceEntityId</dt><dd>{selected.sourceEntityId}</dd></div>
                <div><dt>stableId</dt><dd>{selected.stableId}</dd></div>
                <div><dt>座標系</dt><dd>{selected.coordinateContext}</dd></div>
                {selected.label && <div><dt>ラベル</dt><dd>{selected.label}</dd></div>}
              </dl>
            </div>
          )}
        </aside>

        <div className="cim-viewer" data-testid="cim-viewer">
          <Cim3DViewer
            scene={scene}
            layerState={layerState}
            onSelect={setSelected}
            viewPreset={viewPreset}
            transparency={transparency}
            onTransparencyChange={(t) => setTransparency(1 - t)}
          />
        </div>
      </div>
      <div className="cim-viewer-actions" data-testid="cim-viewer-actions">
        <button
          type="button"
          className="next-secondary"
          data-testid="cim-export-glb"
          disabled={exportingGlb}
          onClick={() => void handleExportGlb()}
        >
          {exportingGlb ? "書き出し中..." : "glTF（.glb）書き出し"}
        </button>
        <button
          type="button"
          className="next-secondary"
          data-testid="cim-run-analysis"
          disabled={runningAnalysis}
          onClick={() => void handleRunAnalysis()}
        >
          {runningAnalysis ? "解析実行中..." : "解析実行（IF3 Result overlay）"}
        </button>
        <label className="next-field">
          <span>結果成分</span>
          <select
            data-testid="cim-result-component"
            value={resultComponent}
            onChange={(e) => setResultComponent(e.target.value as "N" | "Q" | "M" | "T")}
          >
            <option value="N">N</option>
            <option value="Q">Q</option>
            <option value="M">M</option>
            <option value="T">T</option>
          </select>
        </label>
        {analysisMsg !== null && <span className="next-hint" data-testid="cim-analysis-message">{analysisMsg}</span>}
        <span className="next-hint" data-testid="cim-export-message">{exportMessage}</span>
      </div>

      <AuthoritativeResultPanel
        if3Result={if3Result as import("../../contracts/frameAnalysisResultResource").FrameAnalysisResultResource | null}
        sourceDocument={analysisSourceDoc}
      />
    </section>
  );
}
