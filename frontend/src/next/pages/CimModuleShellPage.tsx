/**
 * CIM / 統合3D module shell page (Phase 8-02 WP-A).
 *
 * Displays the derived integrated 3D scene from all module canonical sources
 * with per-layer visibility, object selection (source module / sourceEntityId
 * / stableId / coordinate context), and camera fit/reset + view presets.
 */

import { useMemo, useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { getModuleDefinition } from "../modules/registry";
import { readModuleFromManager } from "../modules/adapter";
import { MODULE_STATUS_LABELS } from "../modules/contract";
import { navigateTo, NEXT_PROJECT_HOME_PATH } from "../routes";
import { buildIntegrated3DScene } from "../modules/cim/cimSceneBuilder";
import {
  CIM_LAYER_IDS,
  CIM_LAYER_LABELS,
  defaultCimLayerState,
  type CimEntityMetadata,
  type CimLayerId,
} from "../modules/cim/integrated3dScene";
import { Cim3DViewer } from "../components/Cim3DViewer";
import type { ProjectModuleKey } from "../project/schema";

export function CimModuleShellPage({ projectId, moduleId }: { projectId: string; moduleId: string }) {
  const [project] = useState(() => getProjectManager().getProject(projectId));
  const definition = getModuleDefinition(moduleId as ProjectModuleKey);
  const [layerState, setLayerState] = useState<Record<CimLayerId, boolean>>(() => defaultCimLayerState());
  const [selected, setSelected] = useState<CimEntityMetadata | null>(null);

  const scene = useMemo(() => {
    return buildIntegrated3DScene(getProjectManager(), projectId);
  }, [projectId]);

  if (!project) {
    return (
      <section className="next-page" data-testid="module-shell-page">
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

  return (
    <section className="next-page" data-testid="module-shell-page">
      <h1 className="next-page-title" data-testid="module-shell-title">CIM / 統合3D</h1>
      <button
        type="button"
        className="next-link-button"
        data-testid="cim-module-back"
        onClick={() => navigateTo(`${NEXT_PROJECT_HOME_PATH}/${projectId}`)}
      >
        ← Projectトップへ
      </button>

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
      </dl>

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
          />
        </div>
      </div>
    </section>
  );
}
