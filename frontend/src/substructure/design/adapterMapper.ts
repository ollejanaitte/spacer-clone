// Phase C1 (A-02) 橋脚モデル → Adapter 入力マッパー（純粋ロジック）
// 実際の Support/Pier モデルを入力源とし、CalculationAdapterInput を生成する。
// Fixture 値のハードコード禁止・Adapter専用モデル新設禁止・UIフォーム迂回禁止。

import type { Support } from "../model";
import {
  ADAPTER_SCHEMA_VERSION,
  type AdapterGeometry,
  type CalculationAdapterInput,
} from "./calculationAdapter";

export interface MapperResult<T> {
  ok: boolean;
  value: T | null;
  diagnostics: string[];
}

/** FNV-1a ハッシュ（モデル revision 導出用・安定）。 */
export function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** モデルの revision を内容から導出（stale 検出用・deterministic）。 */
export function modelRevisionOf(support: Support): string {
  const stable = {
    supportId: support.supportId,
    supportType: support.supportType,
    skewRad: support.skewRad,
    zOverride: support.zOverride ?? null,
    placement: support.placement,
    pier: support.pier ?? null,
    abutment: support.abutment ?? null,
  };
  return `rev-${fnv1a(JSON.stringify(stable))}`;
}

function degFromRad(rad: number): number {
  return (rad * 180) / Math.PI;
}

function toDim(d: { width: number; depth: number; height: number }) {
  return { width: d.width, depth: d.depth, height: d.height };
}

/** Support モデルから geometry を抽出。 */
export function extractGeometry(support: Support): AdapterGeometry {
  const geometry: AdapterGeometry = {};
  if (support.pier) {
    const p = support.pier;
    geometry.pierFormType = p.formType;
    if (p.column) geometry.column = toDim(p.column);
    if (p.cap) geometry.cap = toDim(p.cap);
    if (p.columns) geometry.columns = p.columns.map((c) => ({ ...toDim(c), transverseOffset: c.transverseOffset }));
    if (p.beam) geometry.beam = toDim(p.beam);
    geometry.footing = {
      length: p.footing.length,
      width: p.footing.width,
      thickness: p.footing.thickness,
    };
    if (p.pileGroup) {
      geometry.pileGroup = {
        pileType: p.pileGroup.pileType,
        diameter: p.pileGroup.diameter,
        length: p.pileGroup.length,
        pileCount: p.pileGroup.pileCount,
        spacing: { ...p.pileGroup.spacing },
      };
    }
  }
  if (support.abutment) {
    const a = support.abutment;
    geometry.abutmentFormType = a.formType;
    geometry.backwall = { width: a.backwall.width, height: a.backwall.height, thickness: a.backwall.thickness };
    geometry.wingWallL = { length: a.wingWallL.length, height: a.wingWallL.height, thickness: a.wingWallL.thickness };
    geometry.wingWallR = { length: a.wingWallR.length, height: a.wingWallR.height, thickness: a.wingWallR.thickness };
    geometry.footing = {
      length: a.footing.length,
      width: a.footing.width,
      thickness: a.footing.thickness,
    };
    if (a.pileGroup) {
      geometry.pileGroup = {
        pileType: a.pileGroup.pileType,
        diameter: a.pileGroup.diameter,
        length: a.pileGroup.length,
        pileCount: a.pileGroup.pileCount,
        spacing: { ...a.pileGroup.spacing },
      };
    }
  }
  return geometry;
}

/** Support モデル → CalculationAdapterInput。 */
export function mapSupportToAdapterInput(
  support: Support,
  options?: { projectId?: string; bridgeId?: string; source?: string },
): MapperResult<CalculationAdapterInput> {
  const diagnostics: string[] = [];

  if (!support || typeof support !== "object") {
    return { ok: false, value: null, diagnostics: ["Support が無効"] };
  }
  if (!support.pier && !support.abutment) {
    return { ok: false, value: null, diagnostics: ["pier / abutment データがありません"] };
  }

  const geometry = extractGeometry(support);
  const input: CalculationAdapterInput = {
    schemaVersion: ADAPTER_SCHEMA_VERSION,
    projectId: options?.projectId,
    bridgeId: options?.bridgeId,
    supportId: support.supportId,
    structureType: support.supportType,
    geometry,
    placement: {
      station: support.placement.station ?? null,
      offset: support.placement.offset ?? null,
      skewDeg: Number.isFinite(support.skewRad) ? degFromRad(support.skewRad) : null,
      zOverride: support.zOverride ?? null,
    },
    modelRevision: modelRevisionOf(support),
    units: { length: "m", force: "kN", angle: "deg" },
    bearingSeatCount: Array.isArray(support.bearingSeats) ? support.bearingSeats.length : 0,
    reactionCaseKinds: [],
    source: options?.source,
  };

  const geometryHasPositiveDimensions =
    input.geometry.footing !== undefined &&
    input.geometry.footing.length > 0 &&
    input.geometry.footing.width > 0 &&
    input.geometry.footing.thickness > 0;
  if (!geometryHasPositiveDimensions) {
    diagnostics.push("footing 寸法が 0 以下です（incomplete model）");
  }

  if (support.pier) {
    const c = support.pier.column;
    if (c && (c.width <= 0 || c.depth <= 0 || c.height <= 0)) {
      diagnostics.push("column 寸法が 0 以下です（incomplete model）");
    }
  }

  return {
    ok: diagnostics.length === 0,
    value: input,
    diagnostics,
  };
}
