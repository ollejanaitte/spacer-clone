import { useEffect, useMemo, useState } from "react";
import { designStageDisplayName, getBusinessNumber } from "../project/businessMetadata";
import { getProjectManager } from "../project/projectManagerInstance";
import { navigateTo, NEXT_BUSINESS_LIST_PATH, NEXT_HOME_PATH, editProjectPath, modulePath } from "../routes";
import { readModuleFromProject, moduleHasData } from "../modules/adapter";
import { MODULE_STATUS_LABELS } from "../modules/contract";
import { buildIntegrated3DScene } from "../modules/cim/cimSceneBuilder";
import { defaultCimLayerState, type CimLayerId } from "../modules/cim/integrated3dScene";
import { Cim3DViewer } from "../components/Cim3DViewer";

const PROJECT_TOP_MODULES: readonly { moduleId: string; label: string }[] = [
  { moduleId: "terrain", label: "①現況・地理情報 (Site Context)" },
  { moduleId: "road", label: "②線形座標計算" },
  { moduleId: "bridgeLayout", label: "③橋梁計画（支間割検討）" },
  { moduleId: "superstructure", label: "④上部工設計" },
  { moduleId: "substructure", label: "⑤下部工設計" },
  { moduleId: "analysis", label: "⑥構造解析" },
  { moduleId: "cim", label: "⑦統合3D / CIM" },
];

export function ProjectTopPage({ projectId }: { projectId: string }) {
  const [project] = useState(() => getProjectManager().getProject(projectId));
  const [backups, setBackups] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getProjectManager().listBackups(projectId).then((files) => {
      if (!cancelled) setBackups(files);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const scene = useMemo(
    () =>
      project !== undefined
        ? buildIntegrated3DScene(getProjectManager(), projectId, { if3Result: null })
        : null,
    [project, projectId],
  );
  const layerState = useMemo(() => defaultCimLayerState(), []);
  const [transparency, setTransparency] = useState(1);

  if (!project) {
    return (
      <section className="next-page" data-testid="project-top-page">
        <h1 className="next-page-title">業務プロジェクト トップ</h1>
        <div className="next-error" data-testid="project-top-not-found">
          Projectが見つかりません。
        </div>
        <button
          type="button"
          className="next-link-button"
          onClick={() => navigateTo(NEXT_BUSINESS_LIST_PATH)}
        >
          ☚ 業務一覧へ戻る
        </button>
      </section>
    );
  }

  return (
    <section className="next-page next-page-wide" data-testid="project-top-page">
      <h1 className="next-page-title" data-testid="project-top-title">業務プロジェクト トップ</h1>
      <button
        type="button"
        className="next-link-button"
        data-testid="project-top-back"
        onClick={() => navigateTo(NEXT_BUSINESS_LIST_PATH)}
      >
        ☚ 業務一覧へ戻る
      </button>

      <div className="next-project-head" data-testid="project-top-head">
        <div className="next-project-head-row">
          <h2 className="next-project-head-name" data-testid="project-top-name">
            {project.name}
          </h2>
          <button
            type="button"
            className="next-primary"
            data-testid="project-top-edit"
            onClick={() => navigateTo(editProjectPath(projectId))}
          >
            業務情報編集
          </button>
        </div>
        <dl className="next-project-head-meta">
          <div>
            <dt>業務件番</dt>
            <dd data-testid="project-top-number">{getBusinessNumber(project)}</dd>
          </div>
          <div>
            <dt>業務段階</dt>
            <dd data-testid="project-top-stage">{designStageDisplayName(project)}</dd>
          </div>
          <div>
            <dt>更新日時</dt>
            <dd data-testid="project-top-updated">{project.updatedAt}</dd>
          </div>
          <div>
            <dt>システム内部Project ID</dt>
            <dd className="next-project-id" data-testid="project-top-internal-id">
              {project.projectId}
            </dd>
          </div>
        </dl>
      </div>

      <div className="next-project-top-layout" data-testid="project-top-layout">
        <section className="next-project-modules-panel" aria-label="設計モジュール">
          <h2 className="next-home-section-title">設計機能</h2>
          <ul className="next-section-list" data-testid="project-modules">
            {PROJECT_TOP_MODULES.map((entry) => {
              const moduleData = readModuleFromProject(project, entry.moduleId as import("../project/schema").ProjectModuleKey);
              const status = moduleData.state.status;
              const statusLabel = status === "notStarted" && moduleHasData(moduleData)
                ? "データあり"
                : MODULE_STATUS_LABELS[status];
              return (
                <li key={entry.moduleId} className="next-section-item" data-testid={`module-entry-${entry.moduleId}`}>
                  <button
                    type="button"
                    className="next-section-link"
                    data-testid={`module-open-${entry.moduleId}`}
                    onClick={() => navigateTo(modulePath(projectId, entry.moduleId))}
                  >
                    {entry.label}
                  </button>
                  <div className="next-section-status">
                    <span className="next-badge next-badge-module" data-testid={`module-status-${entry.moduleId}`}>
                      {statusLabel}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="next-project-3d-panel" aria-label="統合3Dビュー" data-testid="project-top-3d-panel">
          <div className="next-project-3d-head">
            <h2 className="next-home-section-title">統合3Dビュー</h2>
            <button
              type="button"
              className="next-link-button"
              data-testid="project-top-open-cim"
              onClick={() => navigateTo(modulePath(projectId, "cim"))}
            >
              ⑦統合3D/CIMで開く ➥
            </button>
          </div>
          {scene !== null && scene.metadata.length > 0 ? (
            <div className="next-scene-viewer next-project-3d-viewer" data-testid="project-top-3d-viewer">
              <Cim3DViewer
                scene={scene}
                layerState={layerState}
                viewPreset="perspective"
                transparency={transparency}
                onTransparencyChange={(t) => setTransparency(1 - t)}
              />
            </div>
          ) : (
            <div className="next-empty" data-testid="project-top-3d-empty">
              <p>3D表示するモデルがまだありません。</p>
              <p className="next-hint">①〜⑦の設計機能でデータを作成すると、ここに統合3Dが表示されます。</p>
            </div>
          )}
        </section>
      </div>

      <details className="next-dev-info" data-testid="project-top-dev-info">
        <summary>開発者向け情報</summary>
        <div className="next-backup-section" data-testid="project-top-backups">
          <h2 className="next-home-section-title">自動バックアップ</h2>
          {backups.length === 0 ? (
            <p className="next-hint" data-testid="backup-empty">
              バックアップはまだありません。
            </p>
          ) : (
            <ul className="next-backup-list" data-testid="backup-list">
              {backups.map((fileName) => (
                <li key={fileName} className="next-backup-item" data-testid="backup-item">
                  {fileName}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="next-hint" data-testid="project-top-scene-info">
          統合3D: エンティティ {scene?.metadata.length ?? 0} / 正本整合 {scene?.ok ? "OK" : "NG"}
        </p>
        <button type="button" className="next-link-button" onClick={() => navigateTo(NEXT_HOME_PATH)}>
          ホームへ
        </button>
      </details>
    </section>
  );
}