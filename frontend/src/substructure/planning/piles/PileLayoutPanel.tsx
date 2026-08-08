// Phase C1 (M2-04) FOOTING 思想 杭基礎UI
// 入力 → 平面図即時反映 → 杭位置確認 → 寸法確認 → 座標表確認 を一体化。
import { useMemo, useState } from "react";
import { ja } from "../../../i18n/ja";
import {
  autoArrange,
  computePilePlan,
  DEFAULT_PILE_UI_STATE,
  pileCoordinates,
  validatePileLayout,
  type PileUiState,
} from "./pileLayoutModel";
import { PilePlanPreview } from "./PilePlanPreview";
import { PileCoordinateTable } from "./PileCoordinateTable";
import styles from "./piles.module.css";

export interface PileLayoutPanelProps {
  supportId: string;
  /** 初期状態（既存 pileGroup があれば seed） */
  initial?: Partial<PileUiState>;
  onLayoutChange?: (state: PileUiState, edgeX: number, edgeY: number) => void;
  height?: number;
}

const num = (v: number): string => String(v);

export function PileLayoutPanel(props: PileLayoutPanelProps) {
  const t = ja.substructure?.planning ?? ({} as Record<string, string>);
  const [state, setState] = useState<PileUiState>({
    ...DEFAULT_PILE_UI_STATE,
    ...props.initial,
  });

  const plan = useMemo(
    () => computePilePlan(state, props.supportId),
    [state, props.supportId],
  );
  const issues = useMemo(() => validatePileLayout(state), [state]);
  const hasFatal = issues.some((i) => i.severity === "fatal");

  const set = (patch: Partial<PileUiState>) => {
    const next = { ...state, ...patch };
    setState(next);
    const nextPlan = computePilePlan(next, props.supportId);
    if (nextPlan) props.onLayoutChange?.(next, nextPlan.edgeX, nextPlan.edgeY);
  };

  const onAutoArrange = () => {
    const next = autoArrange(state, state.footingLength, state.footingWidth);
    setState(next);
    const nextPlan = computePilePlan(next, props.supportId);
    if (nextPlan) props.onLayoutChange?.(next, nextPlan.edgeX, nextPlan.edgeY);
  };

  const rows = plan ? pileCoordinates(plan) : [];

  return (
    <div className={styles.panel} data-testid="pile-layout-panel">
      <div className={styles.inputs}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t.footingDims ?? "フーチング寸法"}</div>
          <Field label={t.footingLengthLabel ?? "橋軸方向長 (m)"} value={num(state.footingLength)} onChange={(v) => set({ footingLength: v })} testId="pile-footing-length" />
          <Field label={t.footingWidthLabel ?? "橋軸直角幅 (m)"} value={num(state.footingWidth)} onChange={(v) => set({ footingWidth: v })} testId="pile-footing-width" />
          <Field label={t.footingThicknessLabel ?? "厚 (m)"} value={num(state.footingThickness)} onChange={(v) => set({ footingThickness: v })} testId="pile-footing-thickness" />
        </div>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t.pileDims ?? "杭"}</div>
          <div className={styles.typeRow}>
            <button type="button" className={`${styles.typeBtn} ${state.pileType === "bored_pile" ? styles.active : ""}`} data-testid="pile-type-bored" onClick={() => set({ pileType: "bored_pile" })}>
              場所打ち杭
            </button>
            <button type="button" className={`${styles.typeBtn} ${state.pileType === "steel_pipe" ? styles.active : ""}`} data-testid="pile-type-steel" onClick={() => set({ pileType: "steel_pipe" })}>
              鋼管杭
            </button>
          </div>
          <Field label={t.pileDiameterLabel ?? "杭径 (m)"} value={num(state.pileDiameter)} onChange={(v) => set({ pileDiameter: v })} testId="pile-diameter" />
          <Field label={t.pileLengthLabel ?? "杭長 (m)"} value={num(state.pileLength)} onChange={(v) => set({ pileLength: v })} testId="pile-length" />
        </div>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t.layoutDims ?? "配置"}</div>
          <Field label={t.rowsLabel ?? "X方向本数"} value={num(state.rows)} onChange={(v) => set({ rows: Math.max(1, Math.round(v)) })} testId="pile-rows" />
          <Field label={t.colsLabel ?? "Y方向本数"} value={num(state.cols)} onChange={(v) => set({ cols: Math.max(1, Math.round(v)) })} testId="pile-cols" />
          <Field label={t.spacingXLabel ?? "X間隔 (m)"} value={num(state.spacingX)} onChange={(v) => set({ spacingX: v })} testId="pile-spacing-x" />
          <Field label={t.spacingYLabel ?? "Y間隔 (m)"} value={num(state.spacingY)} onChange={(v) => set({ spacingY: v })} testId="pile-spacing-y" />
          <Field label={t.edgeXLabel ?? "X縁端 (m, 空=自動)"} value={state.edgeX === null ? "" : num(state.edgeX)} onChange={(v) => set({ edgeX: v === 0 && isNaN(v) ? null : v })} testId="pile-edge-x" allowEmpty />
          <Field label={t.edgeYLabel ?? "Y縁端 (m, 空=自動)"} value={state.edgeY === null ? "" : num(state.edgeY)} onChange={(v) => set({ edgeY: v === 0 && isNaN(v) ? null : v })} testId="pile-edge-y" allowEmpty />
          <button type="button" className={styles.autoBtn} data-testid="pile-auto" onClick={onAutoArrange}>
            {t.autoArrange ?? "自動配置"}
          </button>
        </div>
      </div>
      <div className={styles.preview}>
        <div className={styles.previewHeader}>
          <span>{t.planPreview ?? "平面プレビュー"}</span>
          {issues.map((iss, i) => (
            <span key={i} className={iss.severity === "fatal" ? styles.issueFatal : styles.issueWarn} data-testid={`pile-issue-${iss.severity}`}>
              {iss.message}
            </span>
          ))}
        </div>
        {hasFatal ? (
          <div className={styles.emptyPreview} data-testid="pile-preview-invalid">
            {t.invalidLayout ?? "配置を修正してください"}
          </div>
        ) : plan ? (
          <PilePlanPreview
            plan={plan}
            footingLength={state.footingLength}
            footingWidth={state.footingWidth}
            pileDiameter={state.pileDiameter}
          />
        ) : null}
        <div className={styles.coordTableWrap}>
          <div className={styles.sectionTitle}>{t.coordinateTableTitle ?? "杭座標表"}</div>
          {rows.length > 0 ? (
            <PileCoordinateTable rows={rows} />
          ) : (
            <div className={styles.emptyPreview}>{t.noPiles ?? "杭がありません"}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: number) => void;
  testId: string;
  allowEmpty?: boolean;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{props.label}</span>
      <input
        type="number"
        className={styles.fieldInput}
        value={props.value}
        data-testid={props.testId}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "" && props.allowEmpty) {
            props.onChange(NaN);
            return;
          }
          props.onChange(Number(raw));
        }}
      />
    </label>
  );
}
