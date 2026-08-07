// Phase C1 (I02) 支点配置エンジン（Placement Connector）
// P02 Freeze: PRIMARY=LINER線形+測点+Offset、EXCEPTION=XYZ直接指定。
// LINER coordinate3d.ts を正本として X/Y/Z/tangent/transverse を算出（読取専用）。
import { pointAtStationOffset, type PointAtStationOffsetValue } from "../liner/core/coordinate3d";
import type { Coordinate3dInput } from "../liner/core/coordinate3d";
import {
  pierLineDirectionFromSkew,
  normalizeSkewAngleRad,
} from "../liner/core/bridge/pierLineGeometry";
import type { Vec2, Vec3 } from "../liner/core/types";
import { localFrameFromAzimuth } from "../liner/core/vector";
import type { Support, SupportPlacementSnapshot } from "./model";

export type PlacementSeverity = "fatal" | "warning" | "info";

export interface PlacementDiagnostic {
  severity: PlacementSeverity;
  code: string;
  message: string;
  supportId?: string;
}

export interface SupportPlacementResult {
  snapshot: SupportPlacementSnapshot;
  diagnostics: PlacementDiagnostic[];
}

export interface SupportPlacementEngineInput {
  support: Support;
  coordinateInput: Coordinate3dInput | null;
}

export interface SupportPlacementEngineOutput {
  results: SupportPlacementResult[];
  fatalCount: number;
}

/** FATAL（fail-closed）: 配置計算を成立させられない。 */
export function isFatal(d: PlacementDiagnostic): boolean {
  return d.severity === "fatal";
}

/**
 * P02 4.2: 局部基底（skew適用後）。
 * longitudinal=tangent、transverse=rotate(normal, α)。
 */
export function supportLocalFrame(
  azimuthRad: number,
  skewRad: number,
): { longitudinal: Vec3; transverse: Vec3; vertical: Vec3 } {
  const frame = localFrameFromAzimuth(azimuthRad);
  const pierLineDir = pierLineDirectionFromSkew(azimuthRad, skewRad);
  const transverse = { x: pierLineDir.x, y: pierLineDir.y, z: 0 };
  const longitudinal = frame.tangent;
  return {
    longitudinal,
    transverse,
    vertical: frame.binormal,
  };
}

/** Z フォールバック: LINER縦断が取れない場合は 0（P02 5.3）。 */
function resolveZ(
  value: PointAtStationOffsetValue | undefined,
  zOverride: number | undefined,
  diagnostics: PlacementDiagnostic[],
  supportId: string,
): number {
  if (zOverride !== undefined) {
    return zOverride;
  }
  if (value === undefined) {
    diagnostics.push({
      severity: "warning",
      code: "PLACEMENT_Z_FALLBACK",
      message: "縦断未設定のため Z=0 を使用",
      supportId,
    });
    return 0;
  }
  return value.z;
}

/**
 * PRIMARY: LINER 線形 + station + offset から配置を計算する。
 */
export function computeLinerPlacement(
  support: Support,
  coordinateInput: Coordinate3dInput,
): SupportPlacementResult {
  const diagnostics: PlacementDiagnostic[] = [];
  const placement = support.placement;
  const supportId = support.supportId;

  if (placement.source !== "liner") {
    diagnostics.push({
      severity: "fatal",
      code: "PLACEMENT_SOURCE_MISMATCH",
      message: "computeLinerPlacement は liner 方式のみ対応",
      supportId,
    });
    return {
      snapshot: emptySnapshot(support),
      diagnostics,
    };
  }
  if (placement.alignmentId === undefined || placement.alignmentId.trim().length === 0) {
    diagnostics.push({
      severity: "fatal",
      code: "PLACEMENT_ALIGNMENT_MISSING",
      message: "PRIMARY方式では alignmentId が必須",
      supportId,
    });
    return { snapshot: emptySnapshot(support), diagnostics };
  }
  const station = placement.station ?? 0;
  const offset = placement.offset ?? 0;

  const result = pointAtStationOffset(coordinateInput, station, offset);
  if (!result.ok) {
    diagnostics.push({
      severity: "fatal",
      code: "PLACEMENT_COORDINATE_FAILED",
      message: `pointAtStationOffset(${station}, ${offset}) 失敗: ${result.error.code}`,
      supportId,
    });
    return { snapshot: emptySnapshot(support), diagnostics };
  }

  const value = result.value;
  const skewRad = normalizeSkewAngleRad(support.skewRad);
  const frame = supportLocalFrame(value.azimuth, skewRad);
  const z = resolveZ(value, support.zOverride, diagnostics, supportId);

  return {
    snapshot: {
      source: "liner",
      position: { x: value.x, y: value.y, z },
      tangent: frame.longitudinal,
      transverse: frame.transverse,
      vertical: frame.vertical,
      azimuthRad: value.azimuth,
      skewRad,
    },
    diagnostics,
  };
}

/**
 * EXCEPTION: XYZ 直接指定から配置を計算する（P02 8章）。
 */
export function computeDirectXyzPlacement(support: Support): SupportPlacementResult {
  const diagnostics: PlacementDiagnostic[] = [];
  const placement = support.placement;
  const supportId = support.supportId;

  if (placement.source !== "direct_xyz") {
    diagnostics.push({
      severity: "fatal",
      code: "PLACEMENT_SOURCE_MISMATCH",
      message: "computeDirectXyzPlacement は direct_xyz 方式のみ対応",
      supportId,
    });
    return { snapshot: emptySnapshot(support), diagnostics };
  }
  const pos = placement.position;
  if (pos === undefined) {
    diagnostics.push({
      severity: "fatal",
      code: "PLACEMENT_POSITION_MISSING",
      message: "EXCEPTION方式では position が必要",
      supportId,
    });
    return { snapshot: emptySnapshot(support), diagnostics };
  }
  const azimuthRad = placement.azimuthRad ?? 0;
  const skewRad = normalizeSkewAngleRad(support.skewRad);
  const frame = supportLocalFrame(azimuthRad, skewRad);
  const z = resolveZ(undefined, support.zOverride ?? pos.z, diagnostics, supportId);

  diagnostics.push({
    severity: "info",
    code: "PLACEMENT_DIRECT_XYZ",
    message: "XYZ直接指定（LINER平面図Overlayは不可）",
    supportId,
  });

  return {
    snapshot: {
      source: "direct_xyz",
      position: { x: pos.x, y: pos.y, z },
      tangent: frame.longitudinal,
      transverse: frame.transverse,
      vertical: frame.vertical,
      azimuthRad,
      skewRad,
    },
    diagnostics,
  };
}

/**
 * 全 Support の配置を一括計算する。
 * LINER 未定義時に EXCEPTION（direct_xyz）の Support は計算可、liner は FATAL。
 */
export function computeAllPlacements(
  supports: readonly Support[],
  coordinateInput: Coordinate3dInput | null,
): SupportPlacementEngineOutput {
  const results: SupportPlacementResult[] = [];
  let fatalCount = 0;

  for (const support of supports) {
    let result: SupportPlacementResult;
    if (support.placement.source === "liner") {
      if (coordinateInput === null) {
        result = {
          snapshot: emptySnapshot(support),
          diagnostics: [
            {
              severity: "fatal",
              code: "PLACEMENT_LINER_DATA_MISSING",
              message: "LINERデータが無いため liner 方式を計算できません（EXCEPTION方式へ切替可）",
              supportId: support.supportId,
            },
          ],
        };
      } else {
        result = computeLinerPlacement(support, coordinateInput);
      }
    } else {
      result = computeDirectXyzPlacement(support);
    }

    results.push(result);
    if (result.diagnostics.some(isFatal)) {
      fatalCount += 1;
    }
  }

  return { results, fatalCount };
}

function emptySnapshot(support: Support): SupportPlacementSnapshot {
  return {
    source: support.placement.source,
    position: { x: 0, y: 0, z: 0 },
    tangent: { x: 1, y: 0, z: 0 },
    transverse: { x: 0, y: 1, z: 0 },
    vertical: { x: 0, y: 0, z: 1 },
    azimuthRad: 0,
    skewRad: support.skewRad,
  };
}

export { normalizeSkewAngleRad };
export type { Vec2 };
