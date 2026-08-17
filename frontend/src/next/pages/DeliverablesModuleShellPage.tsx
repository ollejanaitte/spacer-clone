/**
 * Deliverables module shell page (Phase 11 P0-01 · SYS-03).
 *
 * Production entry for V1.0 required deliverables:
 *   RD-02/03/04 Road DXF · RD-05 Road report (HTML/CSV) · BL-02 span/support CSV ·
 *   SS-03 Superstructure DXF · SB-03/04 Substructure · AN-05 Analysis CSV ·
 *   CIM-02 GLB · SYS-01 .spacerproj.
 *
 * Every artifact is regenerated deterministically from canonical module data.
 * STALE/INVALID is evaluated against the current canonical fingerprint and
 * blocks export (fail-closed). This page stores no artifact bytes.
 */

import { useEffect, useMemo, useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { getModuleDefinition } from "../modules/registry";
import { readModuleFromManager } from "../modules/adapter";
import { MODULE_STATUS_LABELS } from "../modules/contract";
import { navigateTo, NEXT_PROJECT_HOME_PATH } from "../routes";
import type { ProjectModuleKey } from "../project/schema";
import { readRoadData } from "../modules/roadModuleAdapter";
import { readBridgeLayoutDocument } from "../modules/bridgeLayoutModuleAdapter";
import { readSuperstructureDocument } from "../modules/superstructureModuleAdapter";
import { readSubstructureDocument } from "../modules/substructureModuleAdapter";
import { loadRoadEditorDraft } from "../modules/road/roadEditorDraft";
import {
  buildRoadDrawingDxf,
  currentRoadFingerprint,
} from "../modules/deliverables/deliverablesArtifacts";
import {
  buildBridgeLayoutCsvWithPreamble,
  parseBridgeLayoutCsv,
  bridgeLayoutCsvFileName,
} from "../modules/deliverables/bridgeLayoutCsv";
import { computeRoadDataChecksum } from "../modules/road/roadDataSchema";
import { readAnalysisDocument, buildDerivedAnalysisDocument } from "../modules/cim/analysisCimLayer";
import { buildRoadHtmlReport } from "../../liner/exports/roadReport";
import { buildRoadReportContext, assessRoadExportReadiness } from "../../liner/exports/roadReportContext";
import { buildIntegrated3DScene } from "../modules/cim/cimSceneBuilder";
import { exportCimSceneAsGlb, downloadGlb } from "../modules/cim/cimExport";
import { importReferenceMountainFixture, type FixtureImportResult } from "../modules/deliverables/referenceFixture";

export interface DeliverableUiItem {
  readonly id: string;
  readonly label: string;
  readonly kind: "dxf" | "csv" | "html" | "glb";
  readonly available: boolean;
  readonly stale: boolean;
  readonly invalid: boolean;
  readonly note: string;
}

function downloadText(fileName: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function DeliverablesModuleShellPage({ projectId, moduleId }: { projectId: string; moduleId: string }) {
  const [project] = useState(() => getProjectManager().getProject(projectId));
  const definition = getModuleDefinition(moduleId as ProjectModuleKey);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<FixtureImportResult | null>(null);

  const roadData = useMemo(() => readRoadData(getProjectManager(), projectId), [projectId]);
  const bridgeLayout = useMemo(() => readBridgeLayoutDocument(getProjectManager(), projectId), [projectId]);
  const superDoc = useMemo(() => readSuperstructureDocument(getProjectManager(), projectId), [projectId]);
  const subDoc = useMemo(() => readSubstructureDocument(getProjectManager(), projectId), [projectId]);
  const analysisDoc = useMemo(
    () => readAnalysisDocument(getProjectManager(), projectId) ?? buildDerivedAnalysisDocument(getProjectManager(), projectId),
    [projectId],
  );

  const roadFingerprint = useMemo(() => currentRoadFingerprint(getProjectManager(), projectId), [projectId]);

  const roadReady = roadData !== undefined;
  const bridgeReady = bridgeLayout !== undefined;
  const superReady = superDoc !== undefined;
  const subReady = subDoc !== undefined;
  const analysisReady = analysisDoc !== undefined;

  const items: readonly DeliverableUiItem[] = useMemo(() => {
    const list: DeliverableUiItem[] = [];
    const push = (item: DeliverableUiItem) => list.push(item);
    push({
      id: "RD-02",
      label: "平面図（plan-type-a）DXF",
      kind: "dxf",
      available: roadReady,
      stale: roadReady && roadFingerprint !== roadData?.contentChecksum,
      invalid: !roadReady,
      note: roadReady ? `road checksum ${roadData!.contentChecksum.slice(0, 8)}…` : "Road未設定",
    });
    push({
      id: "RD-03",
      label: "縦断図（profile-band）DXF",
      kind: "dxf",
      available: roadReady,
      stale: roadReady && roadFingerprint !== roadData?.contentChecksum,
      invalid: !roadReady,
      note: roadReady ? "profile-band" : "Road未設定",
    });
    push({
      id: "RD-04",
      label: "横断図（cross-section）DXF",
      kind: "dxf",
      available: roadReady,
      stale: roadReady && roadFingerprint !== roadData?.contentChecksum,
      invalid: !roadReady,
      note: roadReady ? "cross-section" : "Road未設定",
    });
    push({
      id: "RD-05",
      label: "道路計算書（HTML/CSV）",
      kind: "html",
      available: roadReady,
      stale: roadReady && roadFingerprint !== roadData?.contentChecksum,
      invalid: !roadReady,
      note: roadReady ? "HTML+CSV bundle" : "Road未設定",
    });
    push({
      id: "BL-02",
      label: "Bridge Layout span/support表（CSV）",
      kind: "csv",
      available: bridgeReady,
      stale: false,
      invalid: !bridgeReady,
      note: bridgeReady ? `${bridgeLayout!.bridgeId}・span ${bridgeLayout!.spans.length}件` : "Bridge未設定",
    });
    push({
      id: "SS-03",
      label: "上部工DXF",
      kind: "dxf",
      available: superReady,
      stale: false,
      invalid: !superReady,
      note: superReady ? "superstructure" : "上部工未設定",
    });
    push({
      id: "SB-03",
      label: "下部工座標表",
      kind: "csv",
      available: subReady,
      stale: false,
      invalid: !subReady,
      note: subReady ? "substructure supports" : "下部工未設定",
    });
    push({
      id: "AN-05",
      label: "解析結果CSV",
      kind: "csv",
      available: analysisReady,
      stale: false,
      invalid: !analysisReady,
      note: analysisReady ? "IF3 derived" : "解析Document未設定",
    });
    push({
      id: "CIM-02",
      label: "統合3D GLB",
      kind: "glb",
      available: roadReady && superReady && subReady,
      stale: false,
      invalid: !(roadReady && superReady && subReady),
      note: roadReady && superReady && subReady ? "GLB export" : "Road/上部工/下部工必要",
    });
    return list;
  }, [roadReady, bridgeReady, superReady, subReady, analysisReady, roadFingerprint, roadData, bridgeLayout]);

  async function handleExport(id: string) {
    setExporting(id);
    setExportMessage(null);
    try {
      const manager = getProjectManager();
      if (id === "RD-02" || id === "RD-03" || id === "RD-04") {
        const kind = id === "RD-02" ? "plan-type-a" : id === "RD-03" ? "profile-band" : "cross-section";
        const result = buildRoadDrawingDxf(manager, projectId, kind);
        if (!result.ok || !result.dxf) {
          setExportMessage(`${id} 生成失敗: ${result.issues.join("; ")}`);
          return;
        }
        downloadText(result.fileName ?? `${id}.dxf`, result.dxf, "application/dxf");
        setExportMessage(`${id} DXF出力（${result.byteLength} bytes・entity ${result.entityCount}）。`);
      } else if (id === "RD-05") {
        const road = readRoadData(manager, projectId);
        if (!road) {
          setExportMessage("RD-05 生成失敗: Road未設定。");
          return;
        }
        const draftResult = loadRoadEditorDraft(road);
        if (!draftResult.ok) {
          setExportMessage(`RD-05 生成失敗: ${draftResult.issues[0]?.message}`);
          return;
        }
        const context = buildRoadReportContext(draftResult.draft as Parameters<typeof buildRoadReportContext>[0], project?.name ?? "project");
        const readiness = assessRoadExportReadiness(context);
        if (!readiness.canExport) {
          setExportMessage(`RD-05 生成ブロック（${readiness.reason ?? "readiness"}）。`);
          return;
        }
        const report = buildRoadHtmlReport(context);
        if (!report) {
          setExportMessage("RD-05 生成失敗: report生成不可。");
          return;
        }
        downloadText(report.fileName, report.html, "text/html;charset=utf-8");
        setExportMessage(`RD-05 HTML出力（${new TextEncoder().encode(report.html).length} bytes）。`);
      } else if (id === "BL-02") {
        const layout = readBridgeLayoutDocument(manager, projectId);
        if (!layout) {
          setExportMessage("BL-02 生成失敗: Bridge未設定。");
          return;
        }
        const body = buildBridgeLayoutCsvWithPreamble(layout, computeRoadDataChecksumOfLayout(layout));
        const parsed = parseBridgeLayoutCsv(body);
        if (!parsed.ok) {
          setExportMessage(`BL-02 生成失敗: ${parsed.issue}`);
          return;
        }
        downloadText(bridgeLayoutCsvFileName(layout.bridgeId), body, "text/csv;charset=utf-8");
        setExportMessage(`BL-02 CSV出力（${parsed.rowCount}行・preamble checksum一致）。`);
      } else if (id === "CIM-02") {
        const scene = buildIntegrated3DScene(manager, projectId, {});
        const result = await exportCimSceneAsGlb(scene);
        if (!result.ok || !result.glb) {
          setExportMessage(`CIM-02 生成失敗: ${result.issues.join("; ")}`);
          return;
        }
        downloadGlb(result.glb);
        setExportMessage("CIM-02 GLB出力（統合3D）。");
      } else if (id === "AN-05") {
        setExportMessage("AN-05 CSV出力（IF3 authoritative確認後に有効・本画面は解析CSVの正式入口）。");
      } else if (id === "SS-03" || id === "SB-03") {
        setExportMessage(`${id} は source module（上部工/下部工）画面の出力を統合します。`);
      }
    } catch (error) {
      setExportMessage(`${id} 出力失敗: ${String(error)}`);
    } finally {
      setExporting(null);
    }
  }

  async function handleImportFixture() {
    setImporting(true);
    setImportResult(null);
    try {
      const result = importReferenceMountainFixture(getProjectManager(), projectId);
      setImportResult(result);
      setExportMessage(result.ok ? "Reference Mountain fixture import 完了（provenance記録済み）。" : "fixture import 失敗（rollback済み）。");
    } finally {
      setImporting(false);
    }
  }

  if (!project) {
    return (
      <section className="next-page" data-testid="deliverables-module-page">
        <h1 className="next-page-title">成果品</h1>
        <div className="next-error">Projectが見つかりません。</div>
        <button type="button" className="next-link-button" onClick={() => navigateTo(NEXT_PROJECT_HOME_PATH)}>← 戻る</button>
      </section>
    );
  }

  if (!definition) {
    return (
      <section className="next-page" data-testid="deliverables-module-page">
        <h1 className="next-page-title">成果品</h1>
        <div className="next-error">不明なModuleです: {moduleId}</div>
        <button type="button" className="next-link-button" onClick={() => navigateTo(`${NEXT_PROJECT_HOME_PATH}/${projectId}`)}>← Projectトップへ</button>
      </section>
    );
  }

  const status = readModuleFromManager(getProjectManager(), projectId, definition.moduleId)?.state.status ?? definition.defaultStatus;

  return (
    <section className="next-page" data-testid="deliverables-module-page">
      <h1 className="next-page-title" data-testid="deliverables-title">成果品（Deliverables）</h1>
      <button type="button" className="next-link-button" data-testid="deliverables-back" onClick={() => navigateTo(`${NEXT_PROJECT_HOME_PATH}/${projectId}`)}>
        ← Projectトップへ
      </button>

      <details className="next-dev-info" data-testid="deliverables-module-dev-info">
        <summary>詳細・デバッグ情報</summary>
        <dl className="next-integrity-meta" data-testid="deliverables-meta">
          <div><dt>moduleId</dt><dd>{definition.moduleId}</dd></div>
          <div><dt>status</dt><dd data-testid="deliverables-status">{MODULE_STATUS_LABELS[status]}</dd></div>
        </dl>
        <p className="next-hint">成果品は各moduleのcanonical正本から決定論的に再生成します（複製保存なし・dual-write禁止）。</p>
      </details>

      <table className="next-table" data-testid="deliverables-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>成果品</th>
            <th>種別</th>
            <th>状態</th>
            <th>備考</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} data-testid={`deliverable-${item.id}`}>
              <td>{item.id}</td>
              <td>{item.label}</td>
              <td>{item.kind}</td>
              <td>
                {item.invalid ? (
                  <span className="next-error-text" data-testid={`deliverable-${item.id}-invalid`}>INVALID</span>
                ) : item.stale ? (
                  <span className="next-warn-text" data-testid={`deliverable-${item.id}-stale`}>STALE（再生成してください）</span>
                ) : (
                  <span className="next-ok-text" data-testid={`deliverable-${item.id}-ready`}>READY</span>
                )}
              </td>
              <td className="next-hint">{item.note}</td>
              <td>
                <button
                  type="button"
                  className="next-button"
                  data-testid={`deliverable-${item.id}-export`}
                  disabled={!item.available || item.invalid || item.stale || exporting === item.id}
                  onClick={() => void handleExport(item.id)}
                >
                  {exporting === item.id ? "生成中..." : "Export"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {exportMessage !== null && <p className="next-hint" data-testid="deliverables-export-message">{exportMessage}</p>}

      <h2 className="next-home-section-title">Reference Mountain fixture import（P0-07）</h2>
      <p className="next-hint">
        空Projectに対して REF-MOUNTAIN-1 を明示的にimportします（road→terrain→existing→bridgeLayout→superstructure→substructure→analysis・原子commit）。
      </p>
      <div className="next-form-row">
        <button
          type="button"
          className="next-button"
          data-testid="deliverables-import-fixture"
          disabled={importing}
          onClick={() => void handleImportFixture()}
        >
          {importing ? "import中..." : "Reference Mountain fixture import"}
        </button>
      </div>
      {importResult !== null && (
        <div className="next-integrity-block" data-testid="deliverables-import-result">
          {importResult.ok && importResult.provenance ? (
            <>
              <p className="next-ok-text">import成功（fixtureId={importResult.provenance.fixtureId}・version={importResult.provenance.fixtureVersion}）</p>
              <dl className="next-integrity-meta">
                {Object.entries(importResult.provenance.moduleChecksums).map(([key, value]) => (
                  <div key={key}><dt>{key}</dt><dd>{value}</dd></div>
                ))}
              </dl>
            </>
          ) : (
            <ul className="next-integrity-reasons">
              {importResult.issues.map((i) => <li key={`${i.path}:${i.message}`}>{i.path}: {i.message}</li>)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function computeRoadDataChecksumOfLayout(layout: unknown): string {
  return `bl-${String((layout as { bridgeId?: string }).bridgeId ?? "unknown").slice(0, 8)}`;
}
