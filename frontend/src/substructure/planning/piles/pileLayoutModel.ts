// Phase C1 (M2-04) 杭基礎UI 純粋ロジック
// M1 の buildPileGrid / derivePileLayout を正本として使用し、UI 固有の重複実装を持たない。

import {
  buildPileGrid,
  derivePileLayout,
  type PileLayout,
  type PilePosition,
} from "../../FoundationSolidGenerator";

export interface PileUiState {
  footingLength: number;
  footingWidth: number;
  footingThickness: number;
  pileType: "bored_pile" | "steel_pipe";
  pileDiameter: number;
  pileLength: number;
  rows: number;
  cols: number;
  spacingX: number;
  spacingY: number;
  edgeX: number | null; // null = 自動（derivePileLayout から導出）
  edgeY: number | null;
}

export const DEFAULT_PILE_UI_STATE: PileUiState = {
  footingLength: 12,
  footingWidth: 8,
  footingThickness: 1.5,
  pileType: "bored_pile",
  pileDiameter: 1.2,
  pileLength: 18,
  rows: 3,
  cols: 2,
  spacingX: 3.6,
  spacingY: 3.6,
  edgeX: null,
  edgeY: null,
};

export interface PilePlan {
  layout: PileLayout;
  positions: PilePosition[];
  /** 縁端距離（自動導出値を確定したもの） */
  edgeX: number;
  edgeY: number;
}

export interface PilePlanIssue {
  severity: "fatal" | "warning";
  message: string;
}

/** フーチング寸法内に杭グリッドが収まるか検証（fail-closed）。 */
export function validatePileLayout(state: PileUiState): PilePlanIssue[] {
  const issues: PilePlanIssue[] = [];
  if (state.footingLength <= 0 || state.footingWidth <= 0) {
    return [{ severity: "fatal", message: "フーチング寸法は正の値が必要です" }];
  }
  if (state.rows < 1 || state.cols < 1) {
    issues.push({ severity: "fatal", message: "杭本数（X/Y方向）は1以上が必要です" });
  }
  if (state.spacingX <= 0 || state.spacingY <= 0) {
    issues.push({ severity: "fatal", message: "杭間隔は正の値が必要です" });
  }
  if (state.pileDiameter <= 0 || state.pileLength <= 0) {
    issues.push({ severity: "fatal", message: "杭径・杭長は正の値が必要です" });
  }
  // グリッド全幅がフーチングに収まるか（縁端が負ならオーバーフロー）
  const spanX = (state.rows - 1) * state.spacingX;
  const spanY = (state.cols - 1) * state.spacingY;
  const autoEdgeX = (state.footingLength - spanX) / 2;
  const autoEdgeY = (state.footingWidth - spanY) / 2;
  const effectiveEdgeX = state.edgeX ?? autoEdgeX;
  const effectiveEdgeY = state.edgeY ?? autoEdgeY;
  if (effectiveEdgeX < 0 || effectiveEdgeY < 0 || autoEdgeX < 0 || autoEdgeY < 0) {
    issues.push({ severity: "fatal", message: "杭グリッドがフーチング幅を超えています" });
  }
  if (issues.length === 0 && (effectiveEdgeX < 0.15 || effectiveEdgeY < 0.15)) {
    issues.push({ severity: "warning", message: "縁端距離が 0.15m 未満です（要確認）" });
  }
  return issues;
}

/** 杭平面計画を計算する（validatePileLayout が fatal を返す場合は null）。 */
export function computePilePlan(state: PileUiState, supportId: string): PilePlan | null {
  const issues = validatePileLayout(state);
  if (issues.some((i) => i.severity === "fatal")) return null;

  const spanX = (state.rows - 1) * state.spacingX;
  const spanY = (state.cols - 1) * state.spacingY;
  const edgeX = state.edgeX ?? Math.max(0, (state.footingLength - spanX) / 2);
  const edgeY = state.edgeY ?? Math.max(0, (state.footingWidth - spanY) / 2);

  const layout: PileLayout = {
    rows: state.rows,
    cols: state.cols,
    spacingX: state.spacingX,
    spacingY: state.spacingY,
    edgeX,
    edgeY,
  };
  const positions = buildPileGrid(layout, state.footingLength, state.footingWidth, supportId);
  return { layout, positions, edgeX, edgeY };
}

/** 自動配置（derivePileLayout で rows/cols/edge を導出）。 */
export function autoArrange(
  state: PileUiState,
  footingX: number,
  footingY: number,
): PileUiState {
  const derived = derivePileLayout(footingX, footingY, {
    pileCount: state.rows * state.cols,
    spacing: { x: state.spacingX, y: state.spacingY },
  });
  return {
    ...state,
    rows: derived.rows,
    cols: derived.cols,
    spacingX: derived.spacingX,
    spacingY: derived.spacingY,
    edgeX: derived.edgeX,
    edgeY: derived.edgeY,
  };
}

export interface CoordinateRow {
  no: number;
  id: string;
  x: number;
  y: number;
}

/** 杭座標表（buildPileGrid の結果と完全一致）。 */
export function pileCoordinates(plan: PilePlan): CoordinateRow[] {
  return plan.positions.map((p, i) => ({
    no: i + 1,
    id: p.id,
    x: p.x,
    y: p.y,
  }));
}
