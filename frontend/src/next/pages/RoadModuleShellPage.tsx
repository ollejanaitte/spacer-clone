import { useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { getModuleDefinition } from "../modules/registry";
import {
  readRoadInputs,
  writeRoadInputs,
  ensureRoadData,
  writeRoadData,
} from "../modules/roadModuleAdapter";
import {
  loadRoadEditorDraft,
  commitRoadEditorDraft,
} from "../modules/road/roadEditorDraft";
import { buildRoadIntermediate } from "../modules/road/intermediateResult";
import { MODULE_STATUS_LABELS } from "../modules/contract";
import { readModuleFromManager } from "../modules/adapter";
import { RoadPlanPreview, RoadProfilePreview, RoadCrossSectionPreview } from "../components/RoadPreviews";
import { RoadEditorPanel } from "../components/RoadEditorPanel";
import { navigateTo, NEXT_PROJECT_HOME_PATH } from "../routes";
import { createReferenceMountain } from "../modules/terrain/referenceMountain";
import { createDefaultLinerDraft } from "../../liner/adapters/linerUiAdapter";
import { verticalElementsToDraft, verticalDraftAlignmentToElements } from "../modules/road/verticalDraftBridge";
import type { BuildIntermediateInput } from "../../liner/core/pipeline/pipeline";
import type { ProjectModuleKey } from "../project/schema";

/** Feature flag for the Road/LINER Rescue editors (Phase 7.2 FROZEN D-13). */
export const ROAD_LINER_RESCUE_FLAG = "VITE_ROAD_LINER_RESCUE";
export function isRoadLinerRescueEnabled(): boolean {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env;
  return env?.[ROAD_LINER_RESCUE_FLAG] === "true";
}

// 新規Roadの既定データは Reference Mountain の計画道路（Terrain/Existingと同一座標系）。
// Canonical Road Data（modules.road.data.roadData）が Single Source of Truth。
const ROAD_DEFAULT = createReferenceMountain();

/** Assemble a LinerDraft editor draft from the Reference Mountain defaults. */
function buildReferenceMountainDraft(): BuildIntermediateInput {
  const base = createDefaultLinerDraft();
  return {
    ...base,
    alignment: ROAD_DEFAULT.roadHorizontal,
    verticalAlignment: {
      id: ROAD_DEFAULT.roadHorizontal.id,
      elements: verticalElementsToDraft(ROAD_DEFAULT.roadVertical),
    },
    crossSections: [ROAD_DEFAULT.roadCrossSection],
  };
}

export function RoadModuleShellPage({ projectId, moduleId }: { projectId: string; moduleId: string }) {
  const manager = getProjectManager();
  const [project] = useState(() => manager.getProject(projectId));
  const definition = getModuleDefinition(moduleId as ProjectModuleKey);
  const [roadLabel, setRoadLabel] = useState(() => {
    const inputs = readRoadInputs(manager, projectId);
    return inputs.label ?? "";
  });
  const [draft, setDraft] = useState<BuildIntermediateInput>(() => {
    const roadData = ensureRoadData(manager, projectId, {
      project: manager.getProject(projectId) as unknown as import("../../types").ProjectModel,
    });
    if (roadData.ok) {
      const loaded = loadRoadEditorDraft(roadData.roadData);
      if (loaded.ok && (loaded.draft.alignment.elements.length > 0 || (loaded.draft.linerAlignments?.length ?? 0) > 0)) {
        return loaded.draft;
      }
      // Empty default -> seed the Canonical SoT with the Reference Mountain road.
      const seeded = buildReferenceMountainDraft();
      const committed = commitRoadEditorDraft(seeded, {
        source: "new",
        migratedAt: new Date().toISOString(),
      });
      if (committed.ok && committed.canonical) {
        writeRoadData(manager, projectId, committed.canonical);
        void manager.flushPendingSaves();
      }
      return seeded;
    }
    return buildReferenceMountainDraft();
  });
  const [message, setMessage] = useState<string | null>(null);

  const horizontal = draft.alignment;
  const vertical = verticalDraftAlignmentToElements(draft.verticalAlignment);
  const crossSections = draft.crossSections ?? [];
  const widthChangePoints = draft.widthChangePoints ?? [];
  const crossSlopeIntervals = draft.crossSlopeIntervals ?? [];
  const stationDefinition = draft.stationDefinition;

  const intermediate = buildRoadIntermediate({
    horizontal,
    vertical,
    crossSections,
    widthChangePoints,
    crossSlopeIntervals,
    stationDefinition,
  }, { sampleInterval: 25 });

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

  const moduleData = readModuleFromManager(getProjectManager(), projectId, "road");
  const status = moduleData?.state.status ?? "notStarted";

  function handleSave() {
    const result = writeRoadInputs(manager, projectId, {
      label: roadLabel,
      horizontal,
      vertical,
      crossSections,
    });
    if (!result.ok) {
      setMessage("保存できませんでした（validation NG）。");
      return;
    }
    // Mirror the current editor draft into the Canonical SoT so the legacy
    // roadInput and the canonical roadData never diverge on explicit save.
    const committed = commitRoadEditorDraft(draft, {
      source: "new",
      migratedAt: new Date().toISOString(),
    });
    if (committed.ok && committed.canonical) {
      writeRoadData(manager, projectId, committed.canonical);
    }
    setMessage("保存しました。");
    void manager.flushPendingSaves();
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
          <dt>Validation</dt>
          <dd data-testid="road-module-validation">{intermediate.ok ? "OK" : "NG"}</dd>
        </div>
      </dl>

      <div className="next-form">
        <label className="next-field">
          <span>道路設計名（Road Input label）</span>
          <input
            type="text"
            data-testid="road-label-input"
            value={roadLabel}
            onChange={(e) => setRoadLabel(e.target.value)}
            placeholder="例: 国道〇〇号 道路設計"
          />
        </label>
        <div className="next-form-actions">
          <button type="button" className="next-primary" data-testid="road-save-button" onClick={handleSave}>
            保存（Auto Save）
          </button>
        </div>
      </div>

      {message !== null && <div className="next-hint" data-testid="road-message">{message}</div>}

      {intermediate.issues.length > 0 && (
        <ul className="next-integrity-reasons" data-testid="road-issues">
          {intermediate.issues.map((issue) => (
            <li key={`${issue.path}:${issue.message}`}>{issue.path}: {issue.message}</li>
          ))}
        </ul>
      )}

      <h2 className="next-home-section-title">2Dプレビュー</h2>
      <div className="next-preview-grid">
        <div>
          <h3 className="next-hint">平面線形（Plan）</h3>
          <RoadPlanPreview horizontal={horizontal} vertical={vertical} crossSections={crossSections} widthChangePoints={widthChangePoints} crossSlopeIntervals={crossSlopeIntervals} />
        </div>
        <div>
          <h3 className="next-hint">縦断（Profile）</h3>
          <RoadProfilePreview horizontal={horizontal} vertical={vertical} />
        </div>
        <div>
          <h3 className="next-hint">横断（Cross Section）</h3>
          <RoadCrossSectionPreview crossSection={crossSections[0]} />
        </div>
      </div>

      {isRoadLinerRescueEnabled() && (
        <RoadEditorPanel
          projectId={projectId}
          draft={draft}
          onDraftChange={setDraft}
        />
      )}

      <div className="next-road-summary" data-testid="road-summary">
        <p>延長: {intermediate.totalLength.toFixed(3)} m</p>
        <p>サンプル点: {intermediate.samplePoints.length} 点</p>
        {intermediate.samplePoints[0] && (
          <p>
            起点: No.{intermediate.samplePoints[0].display} / Z={intermediate.samplePoints[0].z.toFixed(3)}
          </p>
        )}
      </div>
    </section>
  );
}
