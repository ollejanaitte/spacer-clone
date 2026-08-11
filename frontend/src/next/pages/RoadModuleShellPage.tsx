import { useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { getModuleDefinition } from "../modules/registry";
import { readRoadDesignDocument, writeRoadDesignDocument } from "../modules/roadModuleAdapter";
import { MODULE_STATUS_LABELS } from "../modules/contract";
import { readModuleFromManager } from "../modules/adapter";
import { navigateTo, NEXT_PROJECT_HOME_PATH, modulePath } from "../routes";
import type { ProjectModuleKey } from "../project/schema";

export function RoadModuleShellPage({ projectId, moduleId }: { projectId: string; moduleId: string }) {
  const [project] = useState(() => getProjectManager().getProject(projectId));
  const definition = getModuleDefinition(moduleId as ProjectModuleKey);
  const [roadLabel, setRoadLabel] = useState(() => {
    const moduleData = readModuleFromManager(getProjectManager(), projectId, "road");
    const doc = moduleData?.data?.roadDesignDocument;
    const label = doc && typeof doc === "object"
      ? (doc as { label?: unknown }).label
      : undefined;
    return typeof label === "string" ? label : "";
  });
  const [message, setMessage] = useState<string | null>(null);

  if (!project) {
    return (
      <section className="next-page" data-testid="road-module-page">
        <h1 className="next-page-title">道路</h1>
        <div className="next-error" data-testid="road-module-not-found">
          Projectが見つかりません。
        </div>
        <button type="button" className="next-link-button" onClick={() => navigateTo(NEXT_PROJECT_HOME_PATH)}>
          ← 戻る
        </button>
      </section>
    );
  }

  const doc = readRoadDesignDocument(getProjectManager(), projectId);
  const moduleData = readModuleFromManager(getProjectManager(), projectId, "road");
  const status = moduleData?.state.status ?? "notStarted";

  function handleSaveMetadata() {
    const current = readRoadDesignDocument(getProjectManager(), projectId);
    const updated = {
      ...(current ?? {}),
      label: roadLabel,
    } as never;
    const result = writeRoadDesignDocument(getProjectManager(), projectId, updated as never);
    if (!result.ok) {
      setMessage("保存できませんでした（validation NG）。");
      return;
    }
    setMessage("保存しました。");
    void getProjectManager().flushPendingSaves();
  }

  return (
    <section className="next-page" data-testid="road-module-page">
      <h1 className="next-page-title" data-testid="road-module-title">道路（Road Module）</h1>
      <button
        type="button"
        className="next-link-button"
        data-testid="road-module-back"
        onClick={() => navigateTo(`${NEXT_PROJECT_HOME_PATH}/${projectId}`)}
      >
        ← Projectトップへ
      </button>

      <dl className="next-integrity-meta" data-testid="road-module-meta">
        <div><dt>moduleId</dt><dd>{moduleId}</dd></div>
        <div><dt>displayName</dt><dd>{definition?.displayName}</dd></div>
        <div><dt>moduleVersion</dt><dd>{definition?.moduleVersion}</dd></div>
        <div>
          <dt>status</dt>
          <dd data-testid="road-module-status">{MODULE_STATUS_LABELS[status]}</dd>
        </div>
        <div>
          <dt>RoadDesignDocument</dt>
          <dd data-testid="road-module-doc">{doc !== undefined ? "あり" : "なし"}</dd>
        </div>
      </dl>

      <div className="next-form">
        <label className="next-field">
          <span>RoadDesignDocument label（安全なテストデータ）</span>
          <input
            type="text"
            data-testid="road-label-input"
            value={roadLabel}
            onChange={(e) => setRoadLabel(e.target.value)}
            placeholder="例: 国道〇〇号 道路設計"
          />
        </label>
        <div className="next-form-actions">
          <button type="button" className="next-primary" data-testid="road-save-button" onClick={handleSaveMetadata}>
            保存（Auto Save）
          </button>
        </div>
      </div>

      {message !== null && <div className="next-hint" data-testid="road-message">{message}</div>}

      <div className="next-empty" data-testid="road-module-placeholder">
        <p>道路計算本体（平面線形・測点・縦断・横断）は Phase 2-02 以降で実装します。</p>
        <p className="next-hint">Phase 2-AではRoad Moduleの正式接続とRoadDesignDocument正本化のみを提供。</p>
      </div>
    </section>
  );
}

export { modulePath };
