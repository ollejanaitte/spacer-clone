import { useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { getModuleDefinition } from "../modules/registry";
import { readTerrainDocument, writeTerrainDocument, hasTerrainDocument } from "../modules/terrainModuleAdapter";
import { createEmptyTerrainDocument, TERRAIN_SCHEMA_VERSION, TERRAIN_DATA_VERSION } from "../modules/terrainModule";
import { MODULE_STATUS_LABELS } from "../modules/contract";
import { readModuleFromManager } from "../modules/adapter";
import { TerrainViewer } from "../components/TerrainViewer";
import { createReferenceMountain } from "../modules/terrain/referenceMountain";
import { gridToMesh } from "../modules/terrain/terrainSurface";
import { navigateTo, NEXT_PROJECT_HOME_PATH } from "../routes";
import type { ProjectModuleKey } from "../project/schema";
import type { TerrainMesh } from "../modules/terrain/terrainSurface";

export function TerrainModuleShellPage({ projectId, moduleId }: { projectId: string; moduleId: string }) {
  const [project] = useState(() => getProjectManager().getProject(projectId));
  const definition = getModuleDefinition(moduleId as ProjectModuleKey);
  const [terrainName, setTerrainName] = useState(() => {
    const doc = readTerrainDocument(getProjectManager(), projectId);
    return doc?.source.sourceName ?? "";
  });
  const [message, setMessage] = useState<string | null>(null);
  const [showSample, setShowSample] = useState(false);
  const [sampleMesh] = useState<TerrainMesh | null>(() => {
    const mountain = createReferenceMountain();
    return gridToMesh(mountain.terrainGrid);
  });

  if (!project) {
    return (
      <section className="next-page" data-testid="terrain-module-page">
        <h1 className="next-page-title">地形・現況</h1>
        <div className="next-error" data-testid="terrain-module-not-found">
          Projectが見つかりません。
        </div>
        <button type="button" className="next-link-button" onClick={() => navigateTo(NEXT_PROJECT_HOME_PATH)}>
          ← 戻る
        </button>
      </section>
    );
  }

  const moduleData = readModuleFromManager(getProjectManager(), projectId, "terrain");
  const status = moduleData?.state.status ?? "notStarted";
  const hasDoc = hasTerrainDocument(getProjectManager(), projectId);

  function handleSave() {
    const existing = readTerrainDocument(getProjectManager(), projectId);
    const doc = {
      ...(existing ?? createEmptyTerrainDocument()),
      source: {
        ...(existing?.source ?? { sourceType: "none", importedAt: null }),
        sourceName: terrainName,
      },
    };
    const result = writeTerrainDocument(getProjectManager(), projectId, doc);
    if (!result.ok) {
      setMessage("保存できませんでした（validation NG）。");
      return;
    }
    setMessage("保存しました。");
    void getProjectManager().flushPendingSaves();
  }

  return (
    <section className="next-page" data-testid="terrain-module-page">
      <h1 className="next-page-title" data-testid="terrain-module-title">地形・現況（Terrain Module）</h1>
      <button
        type="button"
        className="next-link-button"
        data-testid="terrain-module-back"
        onClick={() => navigateTo(`${NEXT_PROJECT_HOME_PATH}/${projectId}`)}
      >
        ← Projectトップへ
      </button>

      <dl className="next-integrity-meta" data-testid="terrain-module-meta">
        <div><dt>moduleId</dt><dd>{moduleId}</dd></div>
        <div><dt>displayName</dt><dd>{definition?.displayName}</dd></div>
        <div><dt>moduleVersion</dt><dd>{definition?.moduleVersion}</dd></div>
        <div><dt>schemaVersion</dt><dd>{TERRAIN_SCHEMA_VERSION}</dd></div>
        <div><dt>dataVersion</dt><dd>{TERRAIN_DATA_VERSION}</dd></div>
        <div>
          <dt>status</dt>
          <dd data-testid="terrain-module-status">{MODULE_STATUS_LABELS[status]}</dd>
        </div>
        <div>
          <dt>Terrain正本</dt>
          <dd data-testid="terrain-module-doc">{hasDoc ? "あり" : "なし"}</dd>
        </div>
      </dl>

      <div className="next-form">
        <label className="next-field">
          <span>地形データ名（source name）</span>
          <input
            type="text"
            data-testid="terrain-name-input"
            value={terrainName}
            onChange={(e) => setTerrainName(e.target.value)}
            placeholder="例: 山岳地形測量データ"
          />
        </label>
        <div className="next-form-actions">
          <button type="button" className="next-primary" data-testid="terrain-save-button" onClick={handleSave}>
            保存（Auto Save）
          </button>
        </div>
      </div>

      {message !== null && <div className="next-hint" data-testid="terrain-message">{message}</div>}

      <div className="next-actions">
        <button
          type="button"
          className="next-action-secondary"
          data-testid="terrain-show-sample"
          onClick={() => setShowSample((v) => !v)}
        >
          {showSample ? "Reference Mountain を隠す" : "Reference Mountain を3D表示"}
        </button>
      </div>

      {showSample && sampleMesh && (
        <TerrainViewer mesh={sampleMesh} />
      )}

      <div className="next-empty" data-testid="terrain-module-placeholder">
        <p>地形Import・TIN・Surface・3D Viewerを利用できます。</p>
        <p className="next-hint">Phase 3でReference Mountainを3D表示し、統合scene（Terrain+Road+Existing）を確認できます。</p>
      </div>
    </section>
  );
}
