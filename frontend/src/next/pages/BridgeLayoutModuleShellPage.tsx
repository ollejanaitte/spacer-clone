import { useMemo, useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { getModuleDefinition } from "../modules/registry";
import { readModuleFromManager } from "../modules/adapter";
import { MODULE_STATUS_LABELS } from "../modules/contract";
import {
  readBridgeLayoutDocument,
  writeBridgeLayoutDocument,
} from "../modules/bridgeLayoutModuleAdapter";
import {
  buildBridgeLayoutFromRange,
  applyBridgeRangeToDocument,
  computeBridgeLength,
  validateBridgeRangeInput,
  buildRoadAlignmentContextFromInputs,
} from "../modules/bridgeLayoutModule";
import {
  assembleBridgeLayoutView,
  computeAbutmentPlacementCandidate,
  lookupTerrainElevation,
  getProjectTerrainGrid,
} from "../modules/bridgeLayoutModule";
import { createValidationState } from "../modules/bridgeLayoutModule";
import { createReferenceMountain } from "../modules/terrain/referenceMountain";
import { gridToMesh } from "../modules/terrain/terrainSurface";
import { buildRoadMesh } from "../modules/road/roadMesh";
import { readExistingConditions } from "../modules/existingConditionsAdapter";
import { BridgeLayoutSceneViewer } from "../components/BridgeLayoutSceneViewer";
import { navigateTo, NEXT_PROJECT_HOME_PATH } from "../routes";
import type { ProjectModuleKey } from "../project/schema";
import { createEmptyBridgeLayoutDocument } from "../modules/bridgeLayout/bridgeLayoutTypes";
import type { BridgeLayoutDocument } from "../modules/bridgeLayout/bridgeLayoutTypes";
import type { RoadAlignmentContext } from "../modules/bridgeLayout/bridgeLayoutDomain";
import type { AbutmentPlacementCandidate } from "../modules/bridgeLayout/bridgeLayoutTypes";

function fmt(v: number | null | undefined, digits = 3): string {
  return v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toFixed(digits);
}

export function BridgeLayoutModuleShellPage({ projectId, moduleId }: { projectId: string; moduleId: string }) {
  const [project] = useState(() => getProjectManager().getProject(projectId));
  const definition = getModuleDefinition(moduleId as ProjectModuleKey);

  const [bridgeName, setBridgeName] = useState(() => {
    return readBridgeLayoutDocument(getProjectManager(), projectId)?.name ?? "";
  });
  const [startStation, setStartStation] = useState(() => {
    const doc = readBridgeLayoutDocument(getProjectManager(), projectId);
    return doc ? String(doc.bridgeRange.startStation) : "";
  });
  const [endStation, setEndStation] = useState(() => {
    const doc = readBridgeLayoutDocument(getProjectManager(), projectId);
    return doc ? String(doc.bridgeRange.endStation) : "";
  });
  const [message, setMessage] = useState<string | null>(null);
  const [show3d, setShow3d] = useState(false);

  const mountain = useMemo(() => createReferenceMountain(), []);
  const terrainMesh = useMemo(() => gridToMesh(mountain.terrainGrid), [mountain]);
  const mountainRoadContext = useMemo<RoadAlignmentContext>(() => {
    return buildRoadAlignmentContextFromInputs({
      horizontal: mountain.roadHorizontal,
      vertical: mountain.roadVertical,
      crossSections: [mountain.roadCrossSection],
    });
  }, [mountain]);

  const manager = getProjectManager();
  const existingEntities = useMemo(() => readExistingConditions(manager, projectId)?.entities ?? null, [manager, projectId]);

  const savedDoc = readBridgeLayoutDocument(manager, projectId);
  const startNum = Number(startStation);
  const endNum = Number(endStation);
  const stationsTyped = Number.isFinite(startNum) && Number.isFinite(endNum) && startStation.trim() !== "" && endStation.trim() !== "";

  const pendingDoc = useMemo<BridgeLayoutDocument | undefined>(() => {
    if (!stationsTyped) return savedDoc;
    const base = savedDoc ?? createEmptyBridgeLayoutDocument();
    return {
      ...base,
      name: bridgeName,
      bridgeRange: { startStation: startNum, endStation: endNum, bridgeLength: computeBridgeLength({ startStation: startNum, endStation: endNum }) },
      abutments: {
        A1: { ...base.abutments.A1, station: startNum },
        A2: { ...base.abutments.A2, station: endNum },
      },
    };
  }, [savedDoc, stationsTyped, startNum, endNum, bridgeName]);

  const view = useMemo(() => assembleBridgeLayoutView(manager, projectId, pendingDoc), [manager, projectId, pendingDoc]);

  // プレビュー用：Road Module 未設定時は Reference Mountain の道路で3D確認可能
  const previewView = useMemo(() => {
    if (view.road.ok) return view;
    return assembleBridgeLayoutView(manager, projectId, pendingDoc, { roadOverride: mountainRoadContext });
  }, [view, manager, projectId, pendingDoc, mountainRoadContext]);

  const previewRoadMesh = useMemo(() => {
    const ctx = view.road.ok ? view.road : mountainRoadContext;
    if (!ctx.ok || !ctx.horizontal || ctx.crossSections.length === 0) return null;
    return buildRoadMesh({
      horizontal: ctx.horizontal,
      vertical: ctx.vertical,
      crossSection: ctx.crossSections[0],
      stationInterval: 20,
    });
  }, [view.road, mountainRoadContext]);

  const bridgeLength = stationsTyped ? computeBridgeLength({ startStation: startNum, endStation: endNum }) : (savedDoc ? savedDoc.bridgeRange.endStation - savedDoc.bridgeRange.startStation : null);

  if (!project) {
    return (
      <section className="next-page" data-testid="bridge-layout-module-page">
        <h1 className="next-page-title">橋梁配置</h1>
        <div className="next-error" data-testid="bridge-layout-not-found">
          Projectが見つかりません。
        </div>
        <button type="button" className="next-link-button" onClick={() => navigateTo(NEXT_PROJECT_HOME_PATH)}>
          ← 戻る
        </button>
      </section>
    );
  }

  const moduleData = readModuleFromManager(manager, projectId, "bridgeLayout");
  const status = moduleData?.state.status ?? "notStarted";
  const hasDoc = savedDoc !== undefined;
  const saveDisabled = !view.road.ok || view.validation.length > 0;

  function handleSave() {
    if (!stationsTyped) {
      setMessage("開始測点と終了測点を入力してください。");
      return;
    }
    if (!view.road.ok) {
      setMessage("Road Module に有効な Alignment がありません（Road Moduleを先に設定してください）。");
      return;
    }
    const validationIssues = validateBridgeRangeInput({
      startStation: startNum,
      endStation: endNum,
      alignmentTotalLength: view.road.ok ? view.road.totalLength : null,
      roadReferenceValid: view.road.ok,
      alignmentReferenceValid: view.road.ok && view.road.alignmentId !== null,
    });
    if (validationIssues.length > 0) {
      setMessage("入力が有効ではありません。");
      return;
    }

    let document: BridgeLayoutDocument;
    if (savedDoc) {
      document = applyBridgeRangeToDocument(savedDoc, startNum, endNum);
      document = { ...document, name: bridgeName };
    } else {
      const built = buildBridgeLayoutFromRange(manager, projectId, {
        bridgeId: `BR-${Date.now().toString(36).toUpperCase()}`,
        name: bridgeName || "未命名橋梁",
        startStation: startNum,
        endStation: endNum,
      });
      if (!built.ok || !built.document) {
        setMessage(`保存できませんでした: ${built.issues[0]?.message ?? "validation NG"}`);
        return;
      }
      document = built.document;
    }

    // A1/A2 配置候補スナップショットを算出して格納（Road Module正本は複製しない）
    const grid = getProjectTerrainGrid(manager, projectId);
    const candidateFor = (station: number): AbutmentPlacementCandidate | undefined => {
      if (!view.road.horizontal) return undefined;
      const result = computeAbutmentPlacementCandidate({
        horizontal: view.road.horizontal,
        vertical: view.road.vertical,
        crossSections: view.road.crossSections,
        station,
      });
      if (!result.ok) return undefined;
      const terrainElevation = lookupTerrainElevation(grid, result.candidate.domainX, result.candidate.domainY);
      return { ...result.candidate, terrainElevation };
    };
    const a1 = candidateFor(startNum);
    const a2 = candidateFor(endNum);
    const now = new Date().toISOString();
    document = {
      ...document,
      name: bridgeName || document.name,
      abutments: {
        A1: { ...document.abutments.A1, station: startNum, placement: a1 },
        A2: { ...document.abutments.A2, station: endNum, placement: a2 },
      },
      validation: createValidationState(true, [], now),
    };

    const result = writeBridgeLayoutDocument(manager, projectId, document);
    if (!result.ok) {
      setMessage("保存できませんでした（validation NG）。");
      return;
    }
    setMessage("保存しました（Auto Save）。");
    void manager.flushPendingSaves();
  }

  return (
    <section className="next-page next-page-wide" data-testid="bridge-layout-module-page">
      <h1 className="next-page-title" data-testid="bridge-layout-module-title">橋梁配置（Bridge Layout Module）</h1>
      <button
        type="button"
        className="next-link-button"
        data-testid="bridge-layout-module-back"
        onClick={() => navigateTo(`${NEXT_PROJECT_HOME_PATH}/${projectId}`)}
      >
        ← Projectトップへ
      </button>

      <dl className="next-integrity-meta" data-testid="bridge-layout-module-meta">
        <div><dt>moduleId</dt><dd>{moduleId}</dd></div>
        <div><dt>displayName</dt><dd>{definition?.displayName}</dd></div>
        <div><dt>moduleVersion</dt><dd>{definition?.moduleVersion}</dd></div>
        <div>
          <dt>status</dt>
          <dd data-testid="bridge-layout-module-status">{MODULE_STATUS_LABELS[status]}</dd>
        </div>
        <div>
          <dt>Bridge Layout正本</dt>
          <dd data-testid="bridge-layout-doc">{hasDoc ? "あり" : "なし"}</dd>
        </div>
      </dl>

      <div className="next-form">
        <label className="next-field">
          <span>橋梁名</span>
          <input
            type="text"
            data-testid="bridge-name-input"
            value={bridgeName}
            onChange={(e) => setBridgeName(e.target.value)}
            placeholder="例: 旭高架橋"
          />
        </label>
        <label className="next-field">
          <span>対象Road / Alignment</span>
          <input
            type="text"
            data-testid="bridge-road-alignment"
            readOnly
            value={view.road.ok && view.road.alignmentId ? `${view.road.alignmentId}（延長 ${view.road.totalLength.toFixed(1)} m）` : "Road Module 未設定"}
          />
        </label>
        <label className="next-field">
          <span>開始測点 startStation [m]</span>
          <input
            type="number"
            data-testid="bridge-start-station"
            value={startStation}
            onChange={(e) => setStartStation(e.target.value)}
            placeholder="例: 100"
          />
        </label>
        <label className="next-field">
          <span>終了測点 endStation [m]</span>
          <input
            type="number"
            data-testid="bridge-end-station"
            value={endStation}
            onChange={(e) => setEndStation(e.target.value)}
            placeholder="例: 450"
          />
        </label>
        <label className="next-field">
          <span>橋長 bridgeLength [m]（自動算出 = end - start）</span>
          <input type="text" data-testid="bridge-length" readOnly value={bridgeLength === null ? "—" : bridgeLength.toFixed(3)} />
        </label>
        <div className="next-form-actions">
          <button
            type="button"
            className="next-primary"
            data-testid="bridge-layout-save-button"
            onClick={handleSave}
            disabled={saveDisabled}
          >
            保存（Auto Save）
          </button>
        </div>
      </div>

      {message !== null && <div className="next-hint" data-testid="bridge-layout-message">{message}</div>}

      {!view.road.ok && (
        <div className="next-error" data-testid="bridge-layout-road-warning">
          Road Module に有効な Alignment がありません。3DはReference Mountainのプレビュー表示です（保存はRoad Module設定後に有効）。
        </div>
      )}

      {view.validation.length > 0 && (
        <ul className="next-integrity-reasons" data-testid="bridge-layout-issues">
          {view.validation.map((issue) => (
            <li key={`${issue.path}:${issue.message}`} data-testid="bridge-layout-issue">{issue.path}: {issue.message}</li>
          ))}
        </ul>
      )}

      <h2 className="next-home-section-title">A1 / A2 配置候補</h2>
      <div className="next-preview-grid">
        {(["A1", "A2"] as const).map((role) => {
          const c = previewView.candidates[role];
          return (
            <div key={role} className="next-road-summary" data-testid={`bridge-${role}-candidate`}>
              <p><strong>{role}</strong>（{role === "A1" ? "開始測点" : "終了測点"}）</p>
              <p>station: {c ? fmt(c.station) : "—"} m</p>
              <p>domain X / Y: {c ? `${fmt(c.candidate.domainX)} / ${fmt(c.candidate.domainY)}` : "—"}</p>
              <p>道路標高: {c ? fmt(c.candidate.elevation) : "—"} m</p>
              <p>接線方向 azimuth: {c ? fmt(c.candidate.tangentAzimuthRad, 4) : "—"} rad</p>
              <p>Terrain標高: {c && c.candidate.terrainElevation !== null ? `${fmt(c.candidate.terrainElevation)} m` : "—"}</p>
              <p>道路標高-地盤高: {c && c.candidate.terrainElevation !== null ? fmt((c.candidate.elevation ?? 0) - (c.candidate.terrainElevation ?? 0)) : "—"} m</p>
              <p>coordinate context: {c?.candidate.coordinateContextId ?? "—"}</p>
            </div>
          );
        })}
      </div>

      <h2 className="next-home-section-title">参照状態</h2>
      <div className="next-preview-grid">
        <div className="next-road-summary" data-testid="bridge-terrain-status">
          <p><strong>Terrain</strong></p>
          <p>参照: {previewView.terrain.available ? "有効" : "未設定（warning）"}</p>
          <p>surfaceReference: {previewView.terrain.surfaceReference ?? "—"}</p>
          <p>A1地盤標高: {fmt(previewView.terrain.elevationA1)} m / A2地盤標高: {fmt(previewView.terrain.elevationA2)} m</p>
        </div>
        <div className="next-road-summary" data-testid="bridge-existing-status">
          <p><strong>Existing Conditions</strong></p>
          <p>参照: {previewView.existing.available ? "有効" : "未設定（warning）"}</p>
          <p>橋梁区間周辺 entity: {previewView.existing.entityCount} 件</p>
          <p>{previewView.existing.entities.map((e) => `${e.label}(${e.type})`).join(" / ") || "—"}</p>
        </div>
      </div>

      <div className="next-actions">
        <button
          type="button"
          className="next-action-secondary"
          data-testid="bridge-layout-show-3d"
          onClick={() => setShow3d((v) => !v)}
        >
          {show3d ? "3Dを隠す" : "3D表示（Terrain + Road + Existing + Bridge Range + A1/A2）"}
        </button>
      </div>

      {show3d && (
        <div className="next-viewer-block" data-testid="bridge-layout-viewer-block">
          <h2 className="next-home-section-title">Bridge Layout（3D）</h2>
          <BridgeLayoutSceneViewer
            terrain={terrainMesh}
            road={previewRoadMesh}
            existing={existingEntities ?? mountain.existing}
            roadContext={previewView.road}
            bridgeRange={previewView.bridgeLength !== null ? { startStation: previewView.candidates.A1?.station ?? startNum, endStation: previewView.candidates.A2?.station ?? endNum } : null}
            candidateA1={previewView.candidates.A1?.candidate}
            candidateA2={previewView.candidates.A2?.candidate}
            showTerrainWireframe
          />
          <p className="next-hint" data-testid="bridge-layout-viewer-mode">
            {view.road.ok ? "表示モード: Road Module データ（正本参照）" : "表示モード: Reference Mountain プレビュー"}
          </p>
        </div>
      )}

      <div className="next-empty" data-testid="bridge-layout-placeholder">
        <p>Phase 4-02: Road Alignment上で橋梁開始・終了測点を設定すると、橋長とA1/A2配置候補が生成され、Terrain + Road + Existing上で3D確認・保存・再起動復元できます。</p>
        <p className="next-hint">A1/A2は配置候補（配置点/配置線）であり、橋台詳細（躯体・翼壁・基礎・杭）はPhase 4-03以降の対象です。</p>
      </div>
    </section>
  );
}
