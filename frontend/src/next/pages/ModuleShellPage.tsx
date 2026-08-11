import { useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { getModuleDefinition } from "../modules/registry";
import { readModuleFromManager } from "../modules/adapter";
import { MODULE_STATUS_LABELS } from "../modules/contract";
import { navigateTo, NEXT_PROJECT_HOME_PATH } from "../routes";
import type { ProjectModuleKey } from "../project/schema";

export function ModuleShellPage({ projectId, moduleId }: { projectId: string; moduleId: string }) {
  const [project] = useState(() => getProjectManager().getProject(projectId));
  const definition = getModuleDefinition(moduleId as ProjectModuleKey);
  const moduleData = project ? readModuleFromManager(getProjectManager(), projectId, moduleId as ProjectModuleKey) : undefined;

  if (!project) {
    return (
      <section className="next-page" data-testid="module-shell-page">
        <h1 className="next-page-title">Module</h1>
        <div className="next-error" data-testid="module-not-found">
          Projectが見つかりません。
        </div>
        <button type="button" className="next-link-button" onClick={() => navigateTo(NEXT_PROJECT_HOME_PATH)}>
          ← 戻る
        </button>
      </section>
    );
  }

  if (!definition) {
    return (
      <section className="next-page" data-testid="module-shell-page">
        <h1 className="next-page-title">Module</h1>
        <div className="next-error" data-testid="module-unknown">
          不明なModuleです: {moduleId}
        </div>
        <button type="button" className="next-link-button" onClick={() => navigateTo(`${NEXT_PROJECT_HOME_PATH}/${projectId}`)}>
          ← Projectトップへ
        </button>
      </section>
    );
  }

  const status = moduleData?.state.status ?? definition.defaultStatus;

  return (
    <section className="next-page" data-testid="module-shell-page">
      <h1 className="next-page-title" data-testid="module-shell-title">{definition.displayName}</h1>
      <button
        type="button"
        className="next-link-button"
        data-testid="module-shell-back"
        onClick={() => navigateTo(`${NEXT_PROJECT_HOME_PATH}/${projectId}`)}
      >
        ← Projectトップへ
      </button>

      <dl className="next-integrity-meta" data-testid="module-shell-meta">
        <div><dt>moduleId</dt><dd>{definition.moduleId}</dd></div>
        <div><dt>moduleVersion</dt><dd>{definition.moduleVersion}</dd></div>
        <div><dt>dataVersion</dt><dd>{definition.dataVersion}</dd></div>
        <div>
          <dt>status</dt>
          <dd data-testid="module-shell-status">{MODULE_STATUS_LABELS[status]}</dd>
        </div>
      </dl>

      <div className="next-empty" data-testid="module-shell-placeholder">
        <p>{definition.displayName} モジュールの本体は Phase 2 以降で実装します。</p>
        <p className="next-hint">Phase 1ではModule Coreへの共通接続（Shell）のみを提供します。</p>
      </div>
    </section>
  );
}
