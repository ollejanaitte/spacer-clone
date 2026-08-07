// Phase C1 (I03C) 基礎・杭 3D ソリッドジオメトリ生成
// UI非依存（純粋なソリッドパラメータ記述）。R3F/THREE 生成は Milestone 2 で実施。
// 将来の FOOTING 風 UI から再利用できるよう純粋関数で構成する。
//
// 軸系: x=橋軸方向 (longitudinal), y=橋軸直角 (transverse), z=上 (up)。
// フーチング上面 = ローカル z=0 基準。杭はフーチング底面から下方向 (z 負) に伸びる。

import type { Footing, PileGroup } from "./model";
import {
  type SolidNode,
  type SolidGroup,
  type SolidTransform,
  type GeometryDiagnostic,
  partId,
  GeometryError,
} from "./geometryBase";

/** 杭配置レイアウト（グリッド）。FOOTING 風 UI が直接この形式を渡せるように純粋化。 */
export interface PileLayout {
  /** 橋軸方向の杭列数 */
  rows: number;
  /** 橋軸直角方向の杭数 */
  cols: number;
  /** 橋軸方向杭間隔 (m) */
  spacingX: number;
  /** 橋軸直角方向杭間隔 (m) */
  spacingY: number;
  /** 橋軸方向縁端距離 (m) — フーチング端〜端杭間 */
  edgeX: number;
  /** 橋軸直角方向縁端距離 (m) — フーチング端〜端杭間 */
  edgeY: number;
}

/** 個々の杭中央のローカル座標（フーチング上面 z=0 基準）。 */
export interface PilePosition {
  id: string;
  x: number;
  y: number;
}

/**
 * グリッド配置API。
 * フーチング上面中心 (0,0,0) 基準で、rows×cols の杭中心を生成。
 * x: edgeX 〜 (footingX - edgeX), y: edgeY 〜 (footingY - edgeY)。
 * @param layout  杭レイアウト仕様
 * @param footingX フーチング橋軸方向長 (m)
 * @param footingY フーチング橋軸直角幅 (m)
 * @param supportId 部材ID接頭辞
 * @returns 杭中心ローカル座標一覧（安定ID順）
 */
export function buildPileGrid(
  layout: PileLayout,
  footingX: number,
  footingY: number,
  supportId: string,
): PilePosition[] {
  void footingX;
  void footingY;
  const { rows, cols, spacingX, spacingY } = layout;
  const spanX = rows === 1 ? 0 : (rows - 1) * spacingX;
  const spanY = cols === 1 ? 0 : (cols - 1) * spacingY;

  const positions: PilePosition[] = [];
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = rows === 1 ? 0 : -spanX / 2 + r * spacingX;
      const y = cols === 1 ? 0 : -spanY / 2 + c * spacingY;
      k += 1;
      positions.push({
        id: partId(supportId, "PILE", k),
        x,
        y,
      });
    }
  }
  return positions;
}

/**
 * PileLayout を既定計算（杭本数・間隔から縁端を導出）。
 * フーチング寸法・杭本数・杭間隔から edgeX/edgeY を自動決定。
 */
export function derivePileLayout(
  footingX: number,
  footingY: number,
  pileGroup: Pick<PileGroup, "pileCount" | "spacing">,
): PileLayout {
  const rows = Math.max(1, Math.round(Math.sqrt(pileGroup.pileCount)));
  const cols = Math.max(1, Math.round(pileGroup.pileCount / rows));
  const spacingX = pileGroup.spacing.x > 0 ? pileGroup.spacing.x : footingX / rows;
  const spacingY = pileGroup.spacing.y > 0 ? pileGroup.spacing.y : footingY / cols;
  const spanX = (rows - 1) * spacingX;
  const spanY = (cols - 1) * spacingY;
  const edgeX = Math.max(0, (footingX - spanX) / 2);
  const edgeY = Math.max(0, (footingY - spanY) / 2);
  return { rows, cols, spacingX, spacingY, edgeX, edgeY };
}

/** 杭ソリッド（bored_pile / steel_pipe とも円柱）。 */
function pileSolid(
  supportId: string,
  kind: "bored_pile" | "steel_pipe",
  diameter: number,
  length: number,
  position: PilePosition,
  footingBottomZ: number,
): SolidNode {
  return {
    id: position.id,
    kind: "cylinder",
    localCenter: { x: position.x, y: position.y, z: footingBottomZ - length / 2 },
    localSize: { x: diameter, y: diameter, z: length },
    entity: "pile",
    material: kind === "bored_pile" ? "foundation.boredPile" : "foundation.steelPile",
  };
}

/**
 * 基礎全体（フーチング + 杭）のソリッドを生成。
 * 直接基礎 (spread) はフーチングのみ。杭基礎 (piled) はフーチング + 杭。
 */
export function buildFoundationSolids(
  supportId: string,
  footing: Footing,
  pileGroup: PileGroup | null | undefined,
  transform: SolidTransform,
  layout?: PileLayout,
): SolidGroup {
  const diagnostics: GeometryDiagnostic[] = [];
  const solids: SolidNode[] = [];

  validateDim("footing.length", footing.length, diagnostics, supportId);
  validateDim("footing.width", footing.width, diagnostics, supportId);
  validateDim("footing.thickness", footing.thickness, diagnostics, supportId);

  // フーチング（box）。上面をローカル z=0、中心 z = -thickness/2。 x=橋軸方向周。
  solids.push({
    id: partId(supportId, "FOOTING"),
    kind: "box",
    localCenter: { x: 0, y: 0, z: -footing.thickness / 2 },
    localSize: { x: footing.length, y: footing.width, z: footing.thickness },
    entity: "footing",
    material: "foundation.footing.concrete",
  });
  const footingBottomZ = -footing.thickness;

  if (pileGroup && pileGroup.pileType) {
    validateDim("pileGroup.diameter", pileGroup.diameter, diagnostics, supportId);
    validateDim("pileGroup.length", pileGroup.length, diagnostics, supportId);
    if (pileGroup.diameter <= 0 || pileGroup.length <= 0) {
      // handled above
    }
    const pileLayout =
      layout ?? derivePileLayout(footing.length, footing.width, pileGroup);
    const grid = buildPileGrid(
      pileLayout,
      footing.length,
      footing.width,
      supportId,
    );
    grid.forEach((pos) => {
      solids.push(
        pileSolid(
          supportId,
          pileGroup.pileType,
          pileGroup.diameter,
          pileGroup.length,
          pos,
          footingBottomZ,
        ),
      );
    });
  }

  if (diagnostics.length > 0) {
    throw new GeometryError(diagnostics);
  }

  return { supportId, solids, transform };
}

function validateDim(
  name: string,
  value: number | undefined,
  diagnostics: GeometryDiagnostic[],
  supportId: string,
): void {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    diagnostics.push({
      code: "INVALID_DIMENSION",
      supportId,
      message: `${name} は 0 より大きい有限値が必要 (got ${String(value)})`,
    });
  }
}