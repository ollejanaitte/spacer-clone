import { useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { readModuleFromManager } from "../modules/adapter";
import { navigateTo, NEXT_PROJECT_HOME_PATH } from "../routes";
import { readSubstructureDocument } from "../modules/substructureModuleAdapter";
import { regenerateSubstructureDerived } from "../modules/substructure/substructurePersistence";
import { generateSubstructureFromLayout } from "../modules/substructure/substructureGenerator";
import { validateSubstructureShapes } from "../modules/substructure/substructureGeometry";
import { computeSubstructureQuantity } from "../modules/substructure/substructureDesign";
import type { ProjectModuleKey } from "../project/schema";

export function SubstructureModuleShellPage({ projectId, moduleId }: { projectId: string; moduleId: string }) {
  const [reload, setReload] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const project = getProjectManager().getProject(projectId);
  void reload;
  const moduleData = project ? readModuleFromManager(getProjectManager(), projectId, moduleId as ProjectModuleKey) : undefined;
  const rawDocument = readSubstructureDocument(getProjectManager(), projectId);
  const document = rawDocument ? regenerateSubstructureDerived(getProjectManager(), projectId, rawDocument) : undefined;
  const shapeIssues = document ? validateSubstructureShapes(document) : [];
  const quantity = document ? computeSubstructureQuantity(document) : null;

  function handleGenerate() {
    const result = generateSubstructureFromLayout(getProjectManager(), projectId);
    setMessage(result.ok
      ? "下部工を生成・保存しました（Auto Save）。"
      : result.issues.map((i) => i.message).join(" / "));
    setReload((n) => n + 1);
  }

  if (!project) {
    return (
      <section className="next-page" data-testid="module-shell-page">
        <h1 className="next-page-title">下部工</h1>
        <div className="next-error">Projectが見つかりません。</div>
        <button type="button" className="next-link-button" onClick={() => navigateTo(NEXT_PROJECT_HOME_PATH)}>← 戻る</button>
      </section>
    );
  }

  const status = moduleData?.state.status ?? "notStarted";

  return (
    <section className="next-page" data-testid="module-shell-page">
      <h1 className="next-page-title" data-testid="module-shell-title">下部工（Substructure Module）</h1>
      <button type="button" className="next-link-button" data-testid="module-shell-back" onClick={() => navigateTo(`${NEXT_PROJECT_HOME_PATH}/${projectId}`)}>
        ← Projectトップへ
      </button>

      <div className="next-integrity-actions">
        <button type="button" className="next-primary" data-testid="sub-generate-button" onClick={handleGenerate}>
          下部工を生成（Bridge Layout + Superstructure Handoffから）
        </button>
        {message && <p className="next-hint" data-testid="sub-message">{message}</p>}
      </div>

      <dl className="next-integrity-meta" data-testid="module-shell-meta">
        <div><dt>moduleId</dt><dd>{moduleId}</dd></div>
        <div><dt>status</dt><dd data-testid="sub-status">{status}</dd></div>
        <div><dt>document</dt><dd data-testid="sub-document">{document ? "あり" : "なし"}</dd></div>
        {document && (
          <div><dt>documentId</dt><dd data-testid="sub-document-id">{document.documentId}</dd></div>
        )}
        {document && (
          <div><dt>bridge</dt><dd data-testid="sub-bridge">{document.bridgeLayoutReference?.bridgeId ?? "—"}</dd></div>
        )}
      </dl>

      {document && (
        <>
          <h2 className="next-home-section-title">下部工概要</h2>
          <div className="next-road-summary" data-testid="sub-summary">
            <p>supports: {document.supports.length} 基（{document.supports.map((s) => s.supportId).join(" / ")}）</p>
            <p>footings: {document.footingConfigurations.length} / foundations: {document.foundationConfigurations.length} / piles: {document.pileConfigurations.length}</p>
            <p>shape validation: {shapeIssues.length === 0 ? <span className="next-ok-text">OK</span> : <span className="next-ng-text">NG</span>}</p>
            {quantity && (
              <p>quantity: concrete {quantity.totalConcreteVolumeM3?.toFixed(2) ?? "—"} m³ / pile {quantity.totalPileLengthM?.toFixed(0) ?? "—"} m（{quantity.quantityStatus}）</p>
            )}
            <p>design status: <span data-testid="sub-design-status">{document.designResults.designStatus}</span> / reactions: {document.designResults.reactionStatus}</p>
          </div>
        </>
      )}

      <h2 className="next-home-section-title">Completion Gate</h2>
      <div className="next-road-summary" data-testid="sub-completion-gate">
        <p data-testid="sub-gate">{document && shapeIssues.length === 0 ? "READY（SubstructureDocument有効）" : "NOT_READY（下部工生成・形状設定が必要）"}</p>
      </div>
    </section>
  );
}
