// Phase C1 (I03B) 橋脚 3D ソリッドジオメトリ生成
// UI非依存（純粋なソリッドパラメータ記述）。R3F/THREE 生成は Milestone 2 で実施。
// P02 配置（SupportPlacementSnapshot）は I03A の transform 基盤を共用。
// 対象: 単柱矩形 (single_column_rect) / 壁式 (wall) / 門型 (portal_frame)。

import type { Support, PierData, PierColumn, PierCap, PortalPierBeam } from "./model";
import {
  type SolidNode,
  type SolidGroup,
  type SolidTransform,
  type GeometryDiagnostic,
  partId,
  GeometryError,
} from "./geometryBase";

/** 柱ソリッド。x=橋軸方向(depth), y=橋軸直角(width), z=高。中心 z=height/2。 */
function columnSolid(
  supportId: string,
  column: PierColumn,
  index?: number,
): SolidNode {
  return {
    id:
      index === undefined
        ? partId(supportId, "COLUMN")
        : partId(supportId, "COLUMN", index),
    kind: "box",
    localCenter: { x: 0, y: column.transverseOffset ?? 0, z: column.height / 2 },
    localSize: { x: column.depth, y: column.width, z: column.height },
    entity: "pier",
    material: "pier.column.concrete",
  };
}

/** 単柱/壁式の梁。柱上端に載る。 */
function capSolid(
  supportId: string,
  cap: PierCap,
  columnHeight: number,
): SolidNode {
  return {
    id: partId(supportId, "CAP"),
    kind: "box",
    localCenter: { x: 0, y: 0, z: columnHeight + cap.height / 2 },
    localSize: { x: cap.width, y: cap.depth, z: cap.height },
    entity: "pier",
    material: "pier.cap.concrete",
  };
}

/** 門型横梁。2本柱の間を架ける。 */
function portalBeamSolid(
  supportId: string,
  beam: PortalPierBeam,
  columnHeight: number,
): SolidNode {
  return {
    id: partId(supportId, "BEAM"),
    kind: "box",
    localCenter: { x: 0, y: 0, z: columnHeight + beam.height / 2 },
    localSize: { x: beam.width, y: beam.depth, z: beam.height },
    entity: "pier",
    material: "pier.beam.concrete",
  };
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

/**
 * 1本の橋脚のソリッドを生成（単柱矩形 / 壁式 / 門型）。
 * フーチング・杭は I03C（基礎）で生成するため、ここでは柱・梁のみ。
 */
export function buildPierSolids(
  support: Support,
  pier: PierData,
  transform: SolidTransform,
): SolidGroup {
  const diagnostics: GeometryDiagnostic[] = [];
  const solids: SolidNode[] = [];
  const supportId = support.supportId;

  const colHeight =
    pier.formType === "portal_frame"
      ? Math.max(0, ...(pier.columns ?? []).map((c) => c.height))
      : (pier.column?.height ?? 0);

  if (pier.formType === "portal_frame") {
    const columns = pier.columns ?? [];
    if (columns.length < 2) {
      diagnostics.push({
        code: "MISSING_PORTAL_COLUMNS",
        supportId,
        message: `門型橋脚 ${supportId} には2本以上の柱が必要 (got ${columns.length})`,
      });
    }
    columns.forEach((c, i) => {
      validateDim(`column[${i}].width`, c.width, diagnostics, supportId);
      validateDim(`column[${i}].depth`, c.depth, diagnostics, supportId);
      validateDim(`column[${i}].height`, c.height, diagnostics, supportId);
      solids.push(columnSolid(supportId, c, i + 1));
    });
    if (pier.beam) {
      validateDim("beam.width", pier.beam.width, diagnostics, supportId);
      validateDim("beam.depth", pier.beam.depth, diagnostics, supportId);
      validateDim("beam.height", pier.beam.height, diagnostics, supportId);
      solids.push(portalBeamSolid(supportId, pier.beam, colHeight));
    }
  } else {
    if (pier.column) {
      validateDim("column.width", pier.column.width, diagnostics, supportId);
      validateDim("column.depth", pier.column.depth, diagnostics, supportId);
      validateDim("column.height", pier.column.height, diagnostics, supportId);
      solids.push(columnSolid(supportId, pier.column));
    }
    if (pier.cap) {
      validateDim("cap.width", pier.cap.width, diagnostics, supportId);
      validateDim("cap.depth", pier.cap.depth, diagnostics, supportId);
      validateDim("cap.height", pier.cap.height, diagnostics, supportId);
      solids.push(capSolid(supportId, pier.cap, colHeight));
    }
  }

  if (diagnostics.length > 0) {
    throw new GeometryError(diagnostics);
  }

  return { supportId, solids, transform };
}