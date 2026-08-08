// Phase C1 (M2-09A) 下部工計画 ホスト統合コンポーネント
// App から /pro/liner/substructure ルートで表示される。P03 Freeze の3ペインUIを
// データ状態（supports/coordinates/selection/undo）と接続し、M2-08 サンプル生成を
// toolbar から起動できるようにする。
// 空/不正状態でもクラッシュせず、back navigation の受け口を備える。
// M2-09C: LINER 支点 handoff（自動生成・skew/alignmentId 継承）。

import { useCallback, useMemo, useState } from "react";
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

  const coordinates = useMemo(() => buildHostCoordinates(supports), [supports]);
  const validation = useMemo(() => buildValidationSummary(supports), [supports]);

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
        toolbarExtra={
          <button
            type="button"
            data-testid="open-sample-dialog"
            onClick={() => setDialogOpen(true)}
          >
            {t.sampleDialogTitle ?? "サンプル新規作成"}
          </button>
        }
      />
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
