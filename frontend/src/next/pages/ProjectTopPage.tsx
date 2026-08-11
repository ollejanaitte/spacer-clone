import { useEffect, useState } from "react";
import { designStageDisplayName, getBusinessNumber } from "../project/businessMetadata";
import { getProjectManager } from "../project/projectManagerInstance";
import { navigateTo, NEXT_BUSINESS_LIST_PATH, modulePath } from "../routes";
import { getModuleDefinitions } from "../modules/registry";
import { readModuleFromProject } from "../modules/adapter";
import { MODULE_STATUS_LABELS } from "../modules/contract";

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

  if (!project) {
    return (
      <section className="next-page" data-testid="project-top-page">
        <h1 className="next-page-title">Projectトップ</h1>
        <div className="next-error" data-testid="project-top-not-found">
          Projectが見つかりません。
        </div>
        <button
          type="button"
          className="next-link-button"
          onClick={() => navigateTo(NEXT_BUSINESS_LIST_PATH)}
        >
          ← 業務一覧へ
        </button>
      </section>
    );
  }

  const modules = getModuleDefinitions();

  return (
    <section className="next-page" data-testid="project-top-page">
      <h1 className="next-page-title">Projectトップ</h1>
      <button
        type="button"
        className="next-link-button"
        data-testid="project-top-back"
        onClick={() => navigateTo(NEXT_BUSINESS_LIST_PATH)}
      >
        ← 業務一覧へ
      </button>

      <div className="next-project-head" data-testid="project-top-head">
        <h2 className="next-project-head-name" data-testid="project-top-name">
          {project.name}
        </h2>
        <dl className="next-project-head-meta">
          <div>
            <dt>業務件番</dt>
            <dd data-testid="project-top-number">{getBusinessNumber(project)}</dd>
          </div>
          <div>
            <dt>設計段階</dt>
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

      <h2 className="next-home-section-title">設計モジュール</h2>
      <ul className="next-section-list" data-testid="project-modules">
        {modules.map((definition) => {
          const moduleData = readModuleFromProject(project, definition.moduleId);
          const status = moduleData.state.status;
          return (
            <li key={definition.moduleId} className="next-section-item" data-testid={`module-entry-${definition.moduleId}`}>
              <button
                type="button"
                className="next-section-link"
                data-testid={`module-open-${definition.moduleId}`}
                onClick={() => navigateTo(modulePath(projectId, definition.moduleId))}
              >
                {definition.displayName}
              </button>
              <div className="next-section-status">
                <span className="next-badge next-badge-module" data-testid={`module-status-${definition.moduleId}`}>
                  {MODULE_STATUS_LABELS[status]}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
