// Phase C1 (M2-09A) 下部工計画 ホスト統合コンポーネント
// App から /pro/liner/substructure ルートで表示される。P03 Freeze の3ペインUIを
// データ状態（supports/coordinates/selection/undo）と接続し、M2-08 サンプル生成を
// toolbar から起動できるようにする。
// 空/不正状態でもクラッシュせず、back navigation の受け口を備える。
// M2-09C: LINER 支点 handoff（自動生成・skew/alignmentId 継承）。

import { useCallback, useMemo, useRef, useState } from "react";
import { ja } from "../../i18n/ja";
import { SubstructurePlanningPage, type ValidationSummary } from "./SubstructurePlanningPage";
import { SampleCreationDialog } from "./samples/SampleCreationDialog";
import {
  generateCombo,
  generateFromLinerSupports,
  generateSample,
  type SampleKind,
} from "./samples/sampleGenerator";
import { applyFormPatchToSupport } from "./formToSupport";
import { supportToForm } from "./formModel";
import type { FormDataBundle } from "./SubstructureFormPanel";
import { useUndoRedo } from "./useUndoRedo";
import { validateSubstructureProject } from "../validation";
import type { Support } from "../model";
import type { LinerSupportHandoff } from "./linerHandoff";
import type { SuperstructureInput, SupportReactions } from "../design/designTypes";
import { buildSuperstructureEnvelope } from "../design/superstructureEnvelope";
import { parseSupportInterface, validateSuperstructureInput } from "../design/superstructureInterface";
import type { SolidGroup } from "../geometryBase";
import { runDesign, type DesignResult } from "../design/designEngine";
import { buildCalculationCsv, buildCalculationJson } from "../design/calculationOutput";
import { DesignResultPanel } from "./DesignResultPanel";
import { mapSupportToAdapterInput } from "../design/adapterMapper";
import { calculateTest } from "../design/testCalculationEngine";
import {
  ADAPTER_SCHEMA_VERSION,
  type CalculationAdapterInput,
  type CalculationAdapterResult,
} from "../design/calculationAdapter";
import { AdapterResultPanel } from "./AdapterResultPanel";
import { serializeAdapterEnvelope, deserializeAdapterEnvelope } from "../design/adapterPersistence";

export type { LinerSupportHandoff };

export interface SubstructurePlanningHostProps {
  /** 初期支点（手動指定時）。空なら空状態。 */
  initialSupports?: readonly Support[];
  /** LINER 支点 handoff（id + station + 任意 skew）。 */
  linerSupports?: readonly LinerSupportHandoff[];
  /** LINER alignment id（生成支点の placement.alignmentId に反映）。 */
  alignmentId?: string;
  /** マウント時に LINER 支点から自動生成するか（LINER review からの遷移時）。 */
  autoGenerateFromLiner?: boolean;
  /** 保存時のプロジェクトID。 */
  projectId?: string;
  /** 保存時の bridgeId。 */
  bridgeId?: string;
  /** M3-02: 上部工 support-interface 入力（同一3D表示・接続）。 */
  superstructures?: readonly SuperstructureInput[];
  /** back navigation 受け口（LINER / /pro へ戻る）。 */
  onBack?: () => void;
}

/** 座標スナップショット（station/offset/z を反映）。 */
export function buildHostCoordinates(
  supports: readonly Support[],
): ReadonlyMap<string, { x: number; y: number; z: number }> {
  const map = new Map<string, { x: number; y: number; z: number }>();
  for (const s of supports) {
    if (s.placement.source === "direct_xyz" && s.placement.position) {
      map.set(s.supportId, s.placement.position);
    } else {
      map.set(s.supportId, {
        x: s.placement.station ?? 0,
        y: s.placement.offset ?? 0,
        z: s.zOverride ?? 0,
      });
    }
  }
  return map;
}

export function buildValidationSummary(
  supports: readonly Support[],
): ValidationSummary {
  const issues = validateSubstructureProject({
    schemaVersion: "0.2.0",
    projectId: "host",
    source: "c1",
    coordinateSystem: "x-longitudinal-y-transverse-z-up",
    unitSystem: "si",
    alignmentRefs: [],
    metadata: { sourceApplication: "x", sourceVersion: "1", sourceRevision: "1", createdAt: "", updatedAt: "" },
    supports: supports,
  });
  return {
    fatalCount: issues.filter((i) => i.severity === "error").length,
    warningCount: issues.filter((i) => i.severity === "warning").length,
    infoCount: issues.filter((i) => i.severity === "info").length,
    messages: issues.map((i) => i.message),
  };
}

/** LINER 支点 handoff から下部工を生成（skew と alignmentId を継承）。 */
export function buildLinerGeneratedSupports(
  linerSupports: readonly LinerSupportHandoff[],
  alignmentId: string,
): readonly Support[] {
  const generated = generateFromLinerSupports(linerSupports);
  return generated.map((s) => {
    const src = linerSupports.find((l) => l.id === s.supportId);
    const withAlignment: Support = {
      ...s,
      placement: { ...s.placement, alignmentId: alignmentId || s.placement.alignmentId },
    };
    if (src && typeof src.skewRad === "number" && src.skewRad !== 0) {
      return { ...withAlignment, skewRad: src.skewRad };
    }
    return withAlignment;
  });
}

export function SubstructurePlanningHost(props: SubstructurePlanningHostProps) {
  const t = ja.substructure?.planning ?? ({} as Record<string, string>);
  const alignmentId = props.alignmentId ?? "";

  const initialSupports = useMemo(() => {
    if (props.initialSupports && props.initialSupports.length > 0) {
      return props.initialSupports;
    }
    if (props.autoGenerateFromLiner && (props.linerSupports ?? []).length > 0) {
      return buildLinerGeneratedSupports(props.linerSupports ?? [], alignmentId);
    }
    return [];
  }, [props.initialSupports, props.autoGenerateFromLiner, props.linerSupports, alignmentId]);

  const history = useUndoRedo<readonly Support[]>(initialSupports);
  const supports = history.state.present;
  const [selectedSupportId, setSelectedSupportId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [superstructures, setSuperstructures] = useState<readonly SuperstructureInput[]>(
    () => props.superstructures ?? [],
  );
  const [superstructureMessage, setSuperstructureMessage] = useState<string | null>(null);
  const superstructureInputRef = useRef<HTMLInputElement | null>(null);
  const [designResults, setDesignResults] = useState<readonly DesignResult[] | null>(null);
  const [designSelectedSupportId, setDesignSelectedSupportId] = useState<string | null>(null);
  const [adapterResults, setAdapterResults] = useState<readonly CalculationAdapterResult[] | null>(null);
  const [adapterInputs, setAdapterInputs] = useState<ReadonlyMap<string, CalculationAdapterInput>>(
    () => new Map(),
  );
  const [adapterSelectedSupportId, setAdapterSelectedSupportId] = useState<string | null>(null);
  const [engineUnavailable, setEngineUnavailable] = useState(false);

  const coordinates = useMemo(() => buildHostCoordinates(supports), [supports]);
  const validation = useMemo(() => buildValidationSummary(supports), [supports]);

  const extraGroups: readonly SolidGroup[] = useMemo(() => {
    if (!superstructures || superstructures.length === 0) return [];
    const result = buildSuperstructureEnvelope({
      superstructures,
      supportPositions: coordinates,
    });
    return result.ok && result.group ? [result.group] : [];
  }, [superstructures, coordinates]);

  const handleImportSuperstructure = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = parseSupportInterface(text);
    if (!parsed.ok || !parsed.value) {
      setSuperstructureMessage(`上部工接続失敗: ${parsed.diagnostics.join(" / ")}`);
      return;
    }
    const doc = parsed.value;
    const issues = validateSuperstructureInput({
      supportId: doc.supportId,
      supportType: doc.supportType,
      bearingSeats: doc.bearingSeats,
      reactionCases: doc.reactionCases,
      girderBottomElevation: doc.girderBottomElevation,
      deckElevation: doc.deckElevation,
      sourceApplication: doc.sourceApplication,
      sourceVersion: doc.sourceVersion,
      sourceRevision: doc.sourceRevision,
    });
    if (issues.length > 0) {
      setSuperstructureMessage(`上部工接続失敗: ${issues.join(" / ")}`);
      return;
    }
    const entry: SuperstructureInput = {
      supportId: doc.supportId,
      supportType: doc.supportType,
      bearingSeats: doc.bearingSeats,
      reactionCases: doc.reactionCases,
      girderBottomElevation: doc.girderBottomElevation,
      deckElevation: doc.deckElevation,
      sourceApplication: doc.sourceApplication,
      sourceVersion: doc.sourceVersion,
      sourceRevision: doc.sourceRevision,
    };
    setSuperstructures((current) => {
      const next = current.filter((s) => s.supportId !== entry.supportId);
      return [...next, entry];
    });
    setSuperstructureMessage(
      `上部工接続: ${doc.supportId}（bearing ${(doc.bearingSeats ?? []).length} / reaction ${(doc.reactionCases ?? []).length}）`,
    );
  }, []);

  const selected = useMemo(
    () => supports.find((s) => s.supportId === selectedSupportId) ?? null,
    [supports, selectedSupportId],
  );
  const formBundle: FormDataBundle | null = useMemo(
    () => (selected ? (supportToForm(selected) as FormDataBundle) : null),
    [selected],
  );

  const commitSupports = useCallback(
    (next: readonly Support[], label?: string) => {
      history.commit(next, label);
      setSelectedSupportId((current) =>
        current && next.some((s) => s.supportId === current) ? current : null,
      );
    },
    [history],
  );

  const handleGenerateSingle = useCallback(
    (kind: SampleKind, supportId: string) => {
      const next = [generateSample(kind, supportId, 0)];
      setDialogOpen(false);
      commitSupports(next, `sample ${kind} (${supportId})`);
    },
    [commitSupports],
  );

  const handleGenerateCombo = useCallback(
    (comboId: string) => {
      setDialogOpen(false);
      commitSupports(generateCombo(comboId), `sample combo ${comboId}`);
    },
    [commitSupports],
  );

  const handleGenerateFromLiner = useCallback(() => {
    const liner = props.linerSupports ?? [];
    if (liner.length === 0) return;
    setDialogOpen(false);
    commitSupports(buildLinerGeneratedSupports(liner, alignmentId), "sample from LINER supports");
  }, [commitSupports, props.linerSupports, alignmentId]);

  const handleFormPatch = useCallback(
    (patch: Partial<FormDataBundle>) => {
      if (!selected) return;
      const nextSupport = applyFormPatchToSupport(selected, patch);
      commitSupports(
        supports.map((s) => (s.supportId === selected.supportId ? nextSupport : s)),
        "form edit",
      );
    },
    [selected, supports, commitSupports],
  );

  const handleFormTypeChange = useCallback(
    (_typeId: string, _status: string) => {
      /* StructureTypeSelector の supported 変更は onFormPatch 経由で反映 */
    },
    [],
  );

  const [persistMessage, setPersistMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSave = useCallback(() => {
    const calculation = adapterResults
      ? {
          inputs: Object.fromEntries(adapterInputs),
          results: Object.fromEntries(
            adapterResults.map((r) => [r.supportId, r]),
          ),
          engineType: "test-mock",
          engineVersion: "0.1.0",
        }
      : null;
    const result = serializeAdapterEnvelope({
      supports,
      projectId: props.projectId,
      bridgeId: props.bridgeId,
      calculation,
    });
    if (!result.ok || !result.value) {
      setPersistMessage(`保存失敗: ${result.diagnostics.join(" / ")}`);
      return;
    }
    const blob = new Blob([result.value.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "substructure-project.json";
    a.click();
    URL.revokeObjectURL(url);
    setPersistMessage("保存しました (substructure-project.json)");
  }, [supports, props.projectId, props.bridgeId, alignmentId, adapterResults, adapterInputs]);

  const handleLoadFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      const result = deserializeAdapterEnvelope(text);
      if (!result.ok || !result.value) {
        setPersistMessage(`読込失敗: ${result.diagnostics.join(" / ")}`);
        return;
      }
      const loaded = result.value.supports;
      history.reset(loaded);
      setSelectedSupportId(null);
      setDesignResults(null);
      if (result.value.calculation) {
        const calc = result.value.calculation;
        setAdapterInputs(new Map(Object.entries(calc.inputs ?? {})));
        setAdapterResults(Object.values(calc.results ?? {}));
        setAdapterSelectedSupportId(Object.keys(calc.results ?? {})[0] ?? null);
        if (result.value.staleSupportIds.length > 0) {
          setPersistMessage(
            `読込ました (${loaded.length} supports)。注意: 一部の Adapter 結果はモデルと不一致のため stale です (${result.value.staleSupportIds.join(", ")})`,
          );
          return;
        }
        setPersistMessage(`読込ました (${loaded.length} supports + Adapter結果復元)`);
      } else {
        setAdapterResults(null);
        setAdapterInputs(new Map());
        setPersistMessage(`読込ました (${loaded.length} supports, ${file.name})`);
      }
    },
    [history],
  );

  const handleRunDesign = useCallback(() => {
    const reactionsMap = new Map<string, SupportReactions>();
    for (const s of superstructures) {
      reactionsMap.set(s.supportId, {
        supportId: s.supportId,
        cases: s.reactionCases ?? [],
        source: s.sourceApplication,
        sourceRevision: s.sourceRevision,
      });
    }
    const results = supports.map((s) =>
      runDesign({
        projectId: props.projectId,
        support: s,
        reactions: reactionsMap.get(s.supportId) ?? null,
      }),
    );
    setDesignResults(results);
    setDesignSelectedSupportId(results[0]?.supportId ?? null);
    setPersistMessage(`設計計算を実行しました（${results.length} supports / 全数値照査は HOLD）`);
  }, [supports, superstructures, props.projectId]);

  const handleExportCsv = useCallback(() => {
    if (!designResults || designResults.length === 0) return;
    const blob = new Blob([buildCalculationCsv(designResults)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "substructure-design-sheet.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [designResults]);

  const handleExportJson = useCallback(() => {
    if (!designResults || designResults.length === 0) return;
    const blob = new Blob([buildCalculationJson(designResults)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "substructure-design-result.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [designResults]);

  const handleRunAdapter = useCallback(() => {
    const results: CalculationAdapterResult[] = [];
    const inputs = new Map<string, CalculationAdapterInput>();
    for (const support of supports) {
      const mapped = mapSupportToAdapterInput(support, {
        projectId: props.projectId,
        bridgeId: props.bridgeId,
        source: "spacer-clone",
      });
      if (!mapped.ok || !mapped.value) {
        // 不完全モデル → fail-closed: 計算を実行せず ERROR 結果
        results.push({
          schemaVersion: ADAPTER_SCHEMA_VERSION,
          calculationId: `calc-error-${support.supportId}`,
          supportId: support.supportId,
          engineType: "test-mock",
          engineVersion: "0.1.0",
          status: "ERROR",
          checks: [],
          summary: { pass: 0, fail: 0, hold: 0, total: 0 },
          errors: [`Adapter 入力生成に失敗しました（不完全モデル）: ${mapped.diagnostics.join(" / ")}`],
          warnings: ["計算は実行されていません（fail-closed）"],
          trace: [{ key: "supportId", value: support.supportId }],
          generatedAt: new Date().toISOString(),
          isFormalDesign: false,
          engineLabel: "TEST",
        });
        continue;
      }
      inputs.set(support.supportId, mapped.value);
      results.push(calculateTest(mapped.value, { simulateUnavailable: engineUnavailable }));
    }
    setAdapterInputs(inputs);
    setAdapterResults(results);
    setAdapterSelectedSupportId(results[0]?.supportId ?? null);
    setPersistMessage(
      engineUnavailable
        ? "Adapter 計算（TEST）: Engine 利用不可をシミュレート（ERROR）"
        : `Adapter 計算（TEST）を実行しました（${results.length} supports / TEST結果）`,
    );
  }, [supports, props.projectId, props.bridgeId, engineUnavailable]);

  return (
    <>
      <SubstructurePlanningPage
        supports={supports}
        coordinates={coordinates}
        selectedSupportId={selectedSupportId}
        onSelectSupport={setSelectedSupportId}
        onUndo={() => {
          const prev = history.undo();
          setSelectedSupportId((current) =>
            current && prev.some((s) => s.supportId === current) ? current : null,
          );
        }}
        onRedo={() => {
          const next = history.redo();
          setSelectedSupportId((current) =>
            current && next.some((s) => s.supportId === current) ? current : null,
          );
        }}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        validation={validation}
        formBundle={formBundle}
        onFormPatch={handleFormPatch}
        onFormTypeChange={handleFormTypeChange}
        extraGroups={extraGroups}
        toolbarExtra={
          <>
            <button
              type="button"
              data-testid="open-sample-dialog"
              onClick={() => setDialogOpen(true)}
            >
              {t.sampleDialogTitle ?? "サンプル新規作成"}
            </button>
            <button type="button" data-testid="substructure-save" onClick={handleSave}>
              {t.saveProject ?? "保存"}
            </button>
            <button
              type="button"
              data-testid="substructure-load"
              onClick={() => fileInputRef.current?.click()}
            >
              {t.loadProject ?? "読込"}
            </button>
            <button
              type="button"
              data-testid="import-support-interface"
              onClick={() => superstructureInputRef.current?.click()}
            >
              {t.importSuperstructure ?? "上部工接続"}
            </button>
            <button type="button" data-testid="run-design" onClick={handleRunDesign}>
              {t.runDesign ?? "設計計算"}
            </button>
            <button type="button" data-testid="run-adapter-test" onClick={handleRunAdapter}>
              {t.runAdapterTest ?? "Adapter計算(TEST)"}
            </button>
            <label
              data-testid="engine-unavailable-toggle"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }}
            >
              <input
                type="checkbox"
                checked={engineUnavailable}
                onChange={(e) => setEngineUnavailable(e.target.checked)}
              />
              {t.engineUnavailable ?? "Engine不可シミュレート"}
            </label>
            <button
              type="button"
              data-testid="export-design-csv"
              disabled={!designResults || designResults.length === 0}
              onClick={handleExportCsv}
            >
              {t.exportDesignCsv ?? "計算書CSV"}
            </button>
            <button
              type="button"
              data-testid="export-design-json"
              disabled={!designResults || designResults.length === 0}
              onClick={handleExportJson}
            >
              {t.exportDesignJson ?? "結果JSON"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              data-testid="substructure-load-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleLoadFile(file);
                e.target.value = "";
              }}
            />
            <input
              ref={superstructureInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              data-testid="support-interface-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportSuperstructure(file);
                e.target.value = "";
              }}
            />
          </>
        }
      />
      {persistMessage && (
        <div
          data-testid="substructure-persist-message"
          style={{
            position: "fixed",
            top: 64,
            right: 12,
            zIndex: 950,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "#1d2b45",
            color: "#f1f5f9",
            fontSize: 12,
            fontFamily: "Inter, 'Noto Sans JP', sans-serif",
          }}
        >
          {persistMessage}
        </div>
      )}
      {superstructureMessage && (
        <div
          data-testid="superstructure-message"
          style={{
            position: "fixed",
            top: 96,
            right: 12,
            zIndex: 950,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "#1d2b45",
            color: "#f1f5f9",
            fontSize: 12,
            fontFamily: "Inter, 'Noto Sans JP', sans-serif",
          }}
        >
          {superstructureMessage}
        </div>
      )}
      {designResults && designResults.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: 130,
            right: 12,
            zIndex: 940,
            width: 480,
            maxHeight: "60vh",
            overflow: "auto",
          }}
        >
          <DesignResultPanel
            results={designResults}
            selectedSupportId={designSelectedSupportId}
            onSelectSupport={setDesignSelectedSupportId}
          />
        </div>
      )}
      {adapterResults && adapterResults.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: 130,
            left: 12,
            zIndex: 940,
            width: 480,
            maxHeight: "60vh",
            overflow: "auto",
          }}
        >
          <AdapterResultPanel
            results={adapterResults}
            selectedSupportId={adapterSelectedSupportId}
            onSelectSupport={setAdapterSelectedSupportId}
          />
        </div>
      )}
      {dialogOpen && (
        <SampleCreationDialog
          hasLinerSupports={(props.linerSupports ?? []).length > 0}
          onGenerate={handleGenerateSingle}
          onGenerateCombo={handleGenerateCombo}
          onGenerateFromLiner={handleGenerateFromLiner}
          onClose={() => setDialogOpen(false)}
        />
      )}
      {props.onBack && (
        <button
          type="button"
          data-testid="substructure-back"
          onClick={props.onBack}
          style={{
            position: "fixed",
            bottom: 12,
            right: 12,
            zIndex: 900,
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "#1d2b45",
            color: "#f1f5f9",
            cursor: "pointer",
            fontFamily: "Inter, 'Noto Sans JP', sans-serif",
            fontSize: 13,
          }}
        >
          {t.backToLiner ?? "LINERへ戻る"}
        </button>
      )}
    </>
  );
}
