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
  assembleBridgeLayoutView,
  computeAbutmentPlacementCandidate,
  computePierPlacementCandidate,
  lookupTerrainElevation,
  getProjectTerrainGrid,
  refreshPierPlacements,
  defaultAutomaticSkew,
  generateSpans,
  validatePierConfiguration,
  validateSpanConfiguration,
  nextPierId,
  createValidationState,
  runBridgeLayoutIntegrityGate,
} from "../modules/bridgeLayoutModule";
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
import type { AbutmentPlacementCandidate, PierPlacement } from "../modules/bridgeLayout/bridgeLayoutTypes";

function fmt(v: number | null | undefined, digits = 3): string {
  return v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toFixed(digits);
}

interface PierRow {
  readonly supportId: string;
  readonly station: string;
  readonly skew: string;
}

function pierRowsToPiers(rows: readonly PierRow[]): PierPlacement[] {
  return rows.map((r) => ({
    supportId: r.supportId,
    label: r.supportId,
    station: Number(r.station),
    skewAngleRad: r.skew.trim() === "" ? null : Number(r.skew),
    skewSource: r.skew.trim() === "" ? "automatic" : "user",
  }));
}

/** 新規Pierの初期station: 現supports間の最大ギャップ中点（A1..A2内） */
function suggestNewPierStation(piers: readonly PierPlacement[], start: number, end: number): number {
  const stations = [start, ...piers.map((p) => p.station).filter((s) => Number.isFinite(s)), end].sort((a, b) => a - b);
  let best = (start + end) / 2;
  let bestGap = -1;
  for (let i = 1; i < stations.length; i += 1) {
    const gap = stations[i] - stations[i - 1];
    if (gap > bestGap) {
      bestGap = gap;
      best = (stations[i] + stations[i - 1]) / 2;
    }
  }
  return Number.isFinite(best) ? best : (start + end) / 2;
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
  const [pierRows, setPierRows] = useState<PierRow[]>(() => {
    const doc = readBridgeLayoutDocument(getProjectManager(), projectId);
    return (doc?.piers ?? []).map((p) => ({
      supportId: p.supportId,
      station: String(p.station),
      skew: p.skewAngleRad === null ? "" : String(p.skewAngleRad),
    }));
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
    const base = savedDoc ?? createEmptyBridgeLayoutDocument();
    const rangeTyped = stationsTyped;
    const piers = pierRowsToPiers(pierRows);
    return {
      ...base,
      name: bridgeName,
      bridgeRange: rangeTyped
        ? { startStation: startNum, endStation: endNum, bridgeLength: computeBridgeLength({ startStation: startNum, endStation: endNum }) }
        : base.bridgeRange,
      abutments: rangeTyped
        ? { A1: { ...base.abutments.A1, station: startNum }, A2: { ...base.abutments.A2, station: endNum } }
        : base.abutments,
      piers,
    };
  }, [savedDoc, stationsTyped, startNum, endNum, bridgeName, pierRows]);

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

  const bridgeLength = stationsTyped
    ? computeBridgeLength({ startStation: startNum, endStation: endNum })
    : (savedDoc ? savedDoc.bridgeRange.endStation - savedDoc.bridgeRange.startStation : null);

  const pierIssues = useMemo(() => {
    if (!pendingDoc) return [];
    return validatePierConfiguration({ document: pendingDoc });
  }, [pendingDoc]);

  const spanIssues = useMemo(() => {
    if (!pendingDoc || pierIssues.length > 0) return [];
    return validateSpanConfiguration({ document: { ...pendingDoc, spans: generateSpans(pendingDoc) } });
  }, [pendingDoc, pierIssues]);

  // Phase 4-04 Completion Gate: 最終Integrity（document + references + handoff）
  const integrity = useMemo(() => {
    if (!pendingDoc) return null;
    // 未保存でも現在のRoadへ解決可能なら gate 用 doc として整合させる
    const gateDoc: BridgeLayoutDocument = {
      ...pendingDoc,
      roadReference: {
        moduleId: "road",
        alignmentId: pendingDoc.roadReference.alignmentId ?? view.road.alignmentId,
        stationReferenceId: pendingDoc.roadReference.stationReferenceId ?? null,
        coordinatePolicyId: pendingDoc.roadReference.coordinatePolicyId ?? view.road.coordinatePolicyId,
      },
    };
    const docWithSpans = { ...gateDoc, spans: generateSpans(gateDoc) };
    return runBridgeLayoutIntegrityGate(manager, projectId, docWithSpans);
  }, [pendingDoc, view.road.alignmentId, view.road.coordinatePolicyId, manager, projectId]);

  const supportHandoffIssues = integrity && !integrity.checks.supportHandoffReady
    ? integrity.issues.filter((i) => i.path.startsWith("supportHandoff"))
    : [];
  const spanHandoffIssues = integrity && !integrity.checks.spanHandoffReady
    ? integrity.issues.filter((i) => i.path.startsWith("spanHandoff"))
    : [];

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
  const saveDisabled = !view.road.ok || view.validation.length > 0 || pierIssues.length > 0;

  function handleAddPier() {
    if (!stationsTyped) {
      setMessage("橋脚追加前に開始測点と終了測点を設定してください。");
      return;
    }
    const piers = pierRowsToPiers(pierRows);
    const base = savedDoc ?? createEmptyBridgeLayoutDocument();
    const probe: BridgeLayoutDocument = {
      ...base,
      piers,
      abutments: { A1: { ...base.abutments.A1, station: startNum }, A2: { ...base.abutments.A2, station: endNum } },
    };
    const supportId = nextPierId(probe);
    const station = suggestNewPierStation(piers, startNum, endNum);
    setPierRows((rows) => [...rows, { supportId, station: String(station), skew: "" }]);
    setMessage(null);
  }

  function handleRemovePier(supportId: string) {
    setPierRows((rows) => rows.filter((r) => r.supportId !== supportId));
  }

  function updatePierRow(supportId: string, patch: Partial<PierRow>) {
    setPierRows((rows) => rows.map((r) => (r.supportId === supportId ? { ...r, ...patch } : r)));
  }

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

    // P1..Pn: placement + automatic/user skew を反映（Road正本は複製しない）
    document = { ...document, piers: pierRowsToPiers(pierRows) };
    document = refreshPierPlacements(document, view.road, getProjectTerrainGrid(manager, projectId));
    document = { ...document, spans: generateSpans(document) };

    const pierCheck = validatePierConfiguration({ document });
    const spanCheck = validateSpanConfiguration({ document });
    if (pierCheck.length > 0 || spanCheck.length > 0) {
      setMessage(`保存できませんでした: ${pierCheck[0]?.message ?? spanCheck[0]?.message}`);
      return;
    }

    // A1/A2 配置候補スナップショット（Phase 4-02維持）
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
    const now = new Date().toISOString();
    document = {
      ...document,
      name: bridgeName || document.name,
      abutments: {
        A1: { ...document.abutments.A1, station: startNum, placement: candidateFor(startNum) },
        A2: { ...document.abutments.A2, station: endNum, placement: candidateFor(endNum) },
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

  const spanTotal = previewView.spans.reduce((sum, s) => sum + s.length, 0);

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
        <div>
          <dt>橋脚本数</dt>
          <dd data-testid="bridge-pier-count">{pierRows.length}</dd>
        </div>
        <div>
          <dt>支間数</dt>
          <dd data-testid="bridge-span-count">{previewView.spans.length}</dd>
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

      {[...view.validation, ...pierIssues, ...spanIssues].length > 0 && (
        <ul className="next-integrity-reasons" data-testid="bridge-layout-issues">
          {[...view.validation, ...pierIssues, ...spanIssues].map((issue) => (
            <li key={`${issue.path}:${issue.message}`} data-testid="bridge-layout-issue">{issue.path}: {issue.message}</li>
          ))}
        </ul>
      )}

      <h2 className="next-home-section-title">Supports一覧（A1 / P1..Pn / A2）</h2>
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

      <h2 className="next-home-section-title">Pier編集（P1..Pn）</h2>
      <div className="next-road-summary" data-testid="bridge-pier-edit">
        <button
          type="button"
          className="next-action-secondary"
          data-testid="bridge-pier-add"
          onClick={handleAddPier}
        >
          橋脚を追加
        </button>
        {pierRows.length === 0 && (
          <p className="next-hint">橋脚なし（A1-A2の単一支間）</p>
        )}
        {pierRows.map((row) => {
          const info = previewView.pierCandidates.find((p) => p.supportId === row.supportId);
          const effectiveSkew = info
            ? (row.skew.trim() === "" ? defaultAutomaticSkew(info.candidate.tangentAzimuthRad) : Number(row.skew))
            : null;
          return (
            <div key={row.supportId} className="next-road-summary" data-testid={`bridge-pier-row-${row.supportId}`}>
              <p><strong>{row.supportId}</strong></p>
              <label className="next-field">
                <span>station [m]</span>
                <input
                  type="number"
                  data-testid={`bridge-pier-station-${row.supportId}`}
                  value={row.station}
                  onChange={(e) => updatePierRow(row.supportId, { station: e.target.value })}
                />
              </label>
              <label className="next-field">
                <span>skew [rad]（反時計回り正・空欄=自動: {effectiveSkew === null ? "—" : fmt(effectiveSkew, 4)}）</span>
                <input
                  type="number"
                  data-testid={`bridge-pier-skew-${row.supportId}`}
                  value={row.skew}
                  onChange={(e) => updatePierRow(row.supportId, { skew: e.target.value })}
                  placeholder="自動（道路直角）"
                />
              </label>
              <p>domain X / Y: {info ? `${fmt(info.candidate.domainX)} / ${fmt(info.candidate.domainY)}` : "—"}</p>
              <p>道路標高: {info ? fmt(info.candidate.elevation) : "—"} m</p>
              <p>Terrain標高: {info && info.terrain.elevation !== null ? `${fmt(info.terrain.elevation)} m` : "—"}</p>
              <p>周辺Existing: {info && info.nearbyExisting.length > 0 ? info.nearbyExisting.map((e) => e.label).join(" / ") : "—"}</p>
              <button
                type="button"
                className="next-danger"
                data-testid={`bridge-pier-remove-${row.supportId}`}
                onClick={() => handleRemovePier(row.supportId)}
              >
                削除
              </button>
            </div>
          );
        })}
      </div>

      <h2 className="next-home-section-title">Span一覧（自動生成・直接編集不可）</h2>
      <div className="next-road-summary" data-testid="bridge-span-list">
        {previewView.spans.map((s) => (
          <p key={s.spanId} data-testid={`bridge-span-${s.spanId}`}>
            {s.spanId}: {s.from} → {s.to} / {fmt(s.length)} m
          </p>
        ))}
        <p><strong>span length 合計: {fmt(spanTotal)} m（bridgeLength: {bridgeLength === null ? "—" : fmt(bridgeLength)} m）</strong></p>
      </div>

      <h2 className="next-home-section-title">Completion Gate（Handoff / Final Validation）</h2>
      <div className="next-preview-grid">
        <div className="next-road-summary" data-testid="bridge-support-handoff-status">
          <p><strong>Support Handoff（共通Support配置情報: Phase 5上部工参照 / Phase 6下部工向け）</strong></p>
          <p data-testid="bridge-support-handoff-ready">
            {integrity ? (integrity.checks.supportHandoffReady ? <span className="next-ok-text">READY</span> : <span className="next-ng-text">ERROR</span>) : <span>—</span>}
          </p>
          {supportHandoffIssues.length > 0 && (
            <ul className="next-integrity-reasons">
              {supportHandoffIssues.map((i) => <li key={`${i.path}:${i.message}`}>{i.message}</li>)}
            </ul>
          )}
          <p className="next-hint">A1 / P1..Pn / A2 の共通Support配置情報（XYZ・elevation・tangent・skew・references）をID/referenceで受け渡し（正本複製なし）。Phase 5上部工・Phase 6下部工の両方で参照</p>
        </div>
        <div className="next-road-summary" data-testid="bridge-span-handoff-status">
          <p><strong>Span Handoff（Phase 5上部工向け）</strong></p>
          <p data-testid="bridge-span-handoff-ready">
            {integrity ? (integrity.checks.spanHandoffReady ? <span className="next-ok-text">READY</span> : <span className="next-ng-text">ERROR</span>) : <span>—</span>}
          </p>
          {spanHandoffIssues.length > 0 && (
            <ul className="next-integrity-reasons">
              {spanHandoffIssues.map((i) => <li key={`${i.path}:${i.message}`}>{i.message}</li>)}
            </ul>
          )}
          <p className="next-hint">S1..Sn の支間情報（chain・spanLength・Σ=bridgeLength・skew）をderivedで受け渡し。Phase 5上部工の正式入口</p>
        </div>
      </div>
      <div className="next-road-summary" data-testid="bridge-final-validation">
        <p><strong>Final Validation</strong></p>
        <p data-testid="bridge-final-validation-ok">
          {integrity ? (integrity.ok ? <span className="next-ok-text">OK</span> : <span className="next-ng-text">NG</span>) : <span>—</span>}
        </p>
        <p>Phase 5上部工 readiness: {integrity ? (integrity.phase5Ready ? "READY" : "NOT_READY") : "—"} / Phase 6下部工 readiness: {integrity ? (integrity.phase6Ready ? "READY" : "NOT_READY") : "—"}</p>
        <p>document: {integrity ? (integrity.checks.documentValid ? "OK" : "NG") : "—"} / references: {integrity ? (integrity.checks.referencesValid ? "OK" : "NG") : "—"} / parser round-trip: {integrity ? (integrity.checks.parserRoundTrip ? "OK" : "NG") : "—"}</p>
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
          {show3d ? "3Dを隠す" : "3D表示（Terrain + Road + Existing + A1/P1..Pn/A2 + span）"}
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
            piers={previewView.pierCandidates.map((p) => ({
              supportId: p.supportId,
              label: p.label,
              station: p.station,
              candidate: p.candidate,
              skewAngleRad: p.skewAngleRad ?? defaultAutomaticSkew(p.candidate.tangentAzimuthRad),
            }))}
            spans={previewView.spans}
            showTerrainWireframe
          />
          <p className="next-hint" data-testid="bridge-layout-viewer-mode">
            {view.road.ok ? "表示モード: Road Module データ（正本参照）" : "表示モード: Reference Mountain プレビュー"}
          </p>
        </div>
      )}

      <div className="next-empty" data-testid="bridge-layout-placeholder">
        <p>Phase 4-03: Bridge Range内にP1..Pnを配置すると、A1-P1-…-Pn-A2の支間割を自動生成し、各PierのRoad XYZ・Terrain・Existing・skewを確認できます。</p>
        <p className="next-hint">P1..Pnは配置候補（配置点/配置線）であり、橋脚詳細（柱・梁・フーチング・杭・基礎設計）は後続Phaseの対象です。</p>
      </div>
    </section>
  );
}
