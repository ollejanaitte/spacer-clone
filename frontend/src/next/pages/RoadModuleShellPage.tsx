import { useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { getModuleDefinition } from "../modules/registry";
import { readRoadInputs, writeRoadInputs } from "../modules/roadModuleAdapter";
import { buildRoadIntermediate } from "../modules/road/intermediateResult";
import { MODULE_STATUS_LABELS } from "../modules/contract";
import { readModuleFromManager } from "../modules/adapter";
import { RoadPlanPreview, RoadProfilePreview, RoadCrossSectionPreview } from "../components/RoadPreviews";
import { navigateTo, NEXT_PROJECT_HOME_PATH } from "../routes";
import { createReferenceMountain } from "../modules/terrain/referenceMountain";
import type { ProjectModuleKey } from "../project/schema";
import type { LinearAlignment } from "../../liner/core/types";
import type { VerticalElement } from "../../liner/core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../liner/schema/types";

// 新規Roadの既定データは Reference Mountain の計画道路（Terrain/Existingと同一座標系）。
// Road Moduleページで「保存」すると roadInput としてProjectへ保存される。
const ROAD_DEFAULT = createReferenceMountain();

const DEFAULT_HORIZONTAL: LinearAlignment = ROAD_DEFAULT.roadHorizontal;

const DEFAULT_VERTICAL: VerticalElement[] = [...ROAD_DEFAULT.roadVertical];

const DEFAULT_CROSS: CrossSectionTemplateDraft = ROAD_DEFAULT.roadCrossSection;

export function RoadModuleShellPage({ projectId, moduleId }: { projectId: string; moduleId: string }) {
  const [project] = useState(() => getProjectManager().getProject(projectId));
  const definition = getModuleDefinition(moduleId as ProjectModuleKey);
  const [roadLabel, setRoadLabel] = useState(() => {
    const inputs = readRoadInputs(getProjectManager(), projectId);
    return inputs.label ?? "";
  });
  const [horizontal, setHorizontal] = useState<LinearAlignment>(() => {
    const inputs = readRoadInputs(getProjectManager(), projectId);
    return (inputs.horizontal as LinearAlignment | undefined) ?? DEFAULT_HORIZONTAL;
  });
  const [vertical, setVertical] = useState<VerticalElement[]>(() => {
    const inputs = readRoadInputs(getProjectManager(), projectId);
    return (inputs.vertical as VerticalElement[] | undefined) ?? DEFAULT_VERTICAL;
  });
  const [crossSections, setCrossSections] = useState<CrossSectionTemplateDraft[]>(() => {
    const inputs = readRoadInputs(getProjectManager(), projectId);
    return (inputs.crossSections as CrossSectionTemplateDraft[] | undefined) ?? [DEFAULT_CROSS];
  });
  const [message, setMessage] = useState<string | null>(null);

  const intermediate = buildRoadIntermediate({
    horizontal,
    vertical,
    crossSections,
    widthChangePoints: [],
    crossSlopeIntervals: [],
    stationDefinition: { originDisplayedStation: 0, equations: [] },
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
    const result = writeRoadInputs(getProjectManager(), projectId, {
      label: roadLabel,
      horizontal,
      vertical,
      crossSections,
    });
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
          <RoadPlanPreview horizontal={horizontal} vertical={vertical} crossSections={crossSections} widthChangePoints={[]} crossSlopeIntervals={[]} />
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
