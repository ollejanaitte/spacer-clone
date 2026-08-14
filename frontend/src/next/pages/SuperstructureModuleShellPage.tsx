import { useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { readModuleFromManager } from "../modules/adapter";
import { navigateTo, NEXT_PROJECT_HOME_PATH } from "../routes";
import { readSuperstructureDocument } from "../modules/superstructureModuleAdapter";
import { regenerateSuperstructureDerived } from "../modules/superstructure/superstructurePersistence";
import { runSuperstructureIntegrityGate } from "../modules/superstructure/superstructureIntegrityGate";
import { generateSuperstructureFromLayout } from "../modules/superstructure/superstructureGenerator";
import { SuperstructureRescuePanel, isSuperstructureRescueEnabled } from "../components/SuperstructureRescuePanel";
import type { ProjectModuleKey } from "../project/schema";

export function SuperstructureModuleShellPage({ projectId, moduleId }: { projectId: string; moduleId: string }) {
  const [reload, setReload] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const project = getProjectManager().getProject(projectId);
  void reload;
  const moduleData = project ? readModuleFromManager(getProjectManager(), projectId, moduleId as ProjectModuleKey) : undefined;
  const rawDocument = readSuperstructureDocument(getProjectManager(), projectId);
  // Derived arrays are transient in persistence; regenerate before gating.
  const document = rawDocument ? regenerateSuperstructureDerived(getProjectManager(), projectId, rawDocument) : undefined;
  const integrity = project && document
    ? runSuperstructureIntegrityGate(getProjectManager(), projectId, document)
    : null;

  function handleGenerate() {
    const result = generateSuperstructureFromLayout(getProjectManager(), projectId);
    setMessage(result.ok
      ? "上部工を生成・保存しました（Auto Save）。"
      : result.issues.map((i) => i.message).join(" / "));
    setReload((n) => n + 1);
  }

  if (!project) {
    return (
      <section className="next-page" data-testid="module-shell-page">
        <h1 className="next-page-title">上部工</h1>
        <div className="next-error">Projectが見つかりません。</div>
        <button type="button" className="next-link-button" onClick={() => navigateTo(NEXT_PROJECT_HOME_PATH)}>← 戻る</button>
      </section>
    );
  }

  const status = moduleData?.state.status ?? "notStarted";

  return (
    <section className="next-page" data-testid="module-shell-page">
      <h1 className="next-page-title" data-testid="module-shell-title">上部工（Superstructure Module）</h1>
      <button type="button" className="next-link-button" data-testid="module-shell-back" onClick={() => navigateTo(`${NEXT_PROJECT_HOME_PATH}/${projectId}`)}>
        ← Projectトップへ
      </button>

      <div className="next-integrity-actions">
        <button type="button" className="next-primary" data-testid="super-generate-button" onClick={handleGenerate}>
          上部工を生成（Bridge Layoutから）
        </button>
        {message && <p className="next-hint" data-testid="super-message">{message}</p>}
      </div>

      <dl className="next-integrity-meta" data-testid="module-shell-meta">
        <div><dt>moduleId</dt><dd>{moduleId}</dd></div>
        <div><dt>status</dt><dd data-testid="super-status">{status}</dd></div>
        <div><dt>document</dt><dd data-testid="super-document">{document ? "あり" : "なし"}</dd></div>
        {document && (
          <div><dt>documentId</dt><dd data-testid="super-document-id">{document.documentId}</dd></div>
        )}
        {document && (
          <div><dt>bridge</dt><dd data-testid="super-bridge">{document.bridgeLayoutReference?.bridgeId ?? "—"}</dd></div>
        )}
      </dl>

      <h2 className="next-home-section-title">Completion Gate（Phase 5）</h2>
      <div className="next-road-summary" data-testid="super-completion-gate">
        {integrity && integrity.ok ? (
          <p data-testid="super-gate-ok"><strong>Gate status: READY</strong></p>
        ) : (
          <p data-testid="super-gate-ng"><strong>Gate status: NOT_READY（Bridge Layout設定・上部工生成が必要）</strong></p>
        )}
        <p data-testid="super-phase6-ready">Phase 6 readiness（Bearing/Reaction Handoff）: {integrity?.phase6Ready ? "READY" : "NOT_READY"}</p>
        {integrity && integrity.checks.handoffReady && (
          <p className="next-ok-text" data-testid="super-handoff-ready">Handoff READY（A1 / P1..Pn / A2 の支承・反力情報をPhase 6へ受け渡し可）</p>
        )}
        {integrity && integrity.issues.length > 0 && (
          <ul className="next-integrity-reasons">
            {integrity.issues.map((i) => <li key={`${i.path}:${i.message}`}>{i.message}</li>)}
          </ul>
        )}
      </div>

      {document && (
        <>
          <h2 className="next-home-section-title">上部工概要</h2>
          <div className="next-road-summary" data-testid="super-summary">
            <p>type: {document.superstructureType}</p>
            <p>span system: {document.structuralSystem.spanSystem} / {document.structuralSystem.bridgeSystem}</p>
            <p>girders: {document.girderConfiguration.girderCount} 本（spacing {document.girderConfiguration.girderSpacingM ?? "—"} m）</p>
            <p>deck: {document.deckConfiguration.deckKind} / thickness {document.deckConfiguration.thicknessM ?? "—"} m</p>
            <p>bearings: {document.bearingConfiguration.bearingSeats.length} 箇所</p>
          </div>
        </>
      )}

      {isSuperstructureRescueEnabled() && document && (
        <SuperstructureRescuePanel projectId={projectId} />
      )}
    </section>
  );
}
