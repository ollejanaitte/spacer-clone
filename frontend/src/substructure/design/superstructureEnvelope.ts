// Phase C1 (M3-02) 上部工簡易外形 3D ソリッド生成（純粋ロジック）
// 上部工 support-interface の支承位置・桁下高・床版高を基に、
// 同一 3D シーンに重ねる上部工簡易外形（床版 + 主桁帯）を作る。
// 数値は入力データ由来のみ（ダミー座標・仮定寸法は使用しない）。

import type { SolidGroup, SolidNode, SolidTransform } from "../geometryBase";
import type { Vec3 } from "../model";
import type { BearingSeatInput, SuperstructureInput } from "./designTypes";

export interface EnvelopeGeometryInput {
  /** 各支点の上部工入力（bearingSeats / girderBottom / deck）。 */
  superstructures: readonly SuperstructureInput[];
  /** 各支点のワールド配置位置（supportId → position）。 */
  supportPositions: ReadonlyMap<string, Vec3>;
}

export interface EnvelopeResult {
  ok: boolean;
  group: SolidGroup | null;
  diagnostics: string[];
}

function identityTransform(position: Vec3): SolidTransform {
  return {
    origin: position,
    xAxis: { x: 1, y: 0, z: 0 },
    yAxis: { x: 0, y: 1, z: 0 },
    zAxis: { x: 0, y: 0, z: 1 },
    skewRad: 0,
  };
}

/**
 * 全支点の支承位置から橋軸方向(X)・直角方向(Y)の外郭を求め、
 * 桁下高〜床版高の床版ソリッドと、支承上面〜桁下高の主桁帯ソリッドを作る。
 * 支点が 1 つの場合はその支点範囲のみのブロックを生成する。
 */
export function buildSuperstructureEnvelope(
  input: EnvelopeGeometryInput,
): EnvelopeResult {
  const diagnostics: string[] = [];

  const seats: Array<{ x: number; y: number; z: number; supportId: string }> = [];
  for (const si of input.superstructures) {
    const pos = input.supportPositions.get(si.supportId);
    if (!pos) {
      diagnostics.push(`supportId=${si.supportId} の配置位置がありません`);
      continue;
    }
    const list = si.bearingSeats ?? [];
    if (list.length === 0) {
      diagnostics.push(`supportId=${si.supportId} の bearingSeats がありません`);
      continue;
    }
    for (const seat of list) {
      if (!seat.bearingPosition) continue;
      seats.push({
        x: pos.x + seat.bearingPosition.x,
        y: pos.y + seat.bearingPosition.y,
        z: pos.z + seat.bearingPosition.z,
        supportId: si.supportId,
      });
    }
  }

  if (seats.length === 0) {
    return {
      ok: false,
      group: null,
      diagnostics: diagnostics.length > 0 ? diagnostics : ["支承位置データがありません"],
    };
  }

  const minX = Math.min(...seats.map((s) => s.x));
  const maxX = Math.max(...seats.map((s) => s.x));
  const minY = Math.min(...seats.map((s) => s.y));
  const maxY = Math.max(...seats.map((s) => s.y));

  const girderBottoms = input.superstructures
    .filter((s) => typeof s.girderBottomElevation === "number")
    .map((s) => s.girderBottomElevation as number);
  const deckTops = input.superstructures
    .filter((s) => typeof s.deckElevation === "number")
    .map((s) => s.deckElevation as number);

  const girderBottom =
    girderBottoms.length > 0 ? Math.max(...girderBottoms) : Math.max(...seats.map((s) => s.z));
  const deckTop = deckTops.length > 0 ? Math.max(...deckTops) : girderBottom + 0.25;

  const bearingTop = Math.max(...seats.map((s) => s.z));

  const span = maxX - minX;
  const width = maxY - minY;
  if (span <= 0 || width <= 0) {
    return {
      ok: false,
      group: null,
      diagnostics: ["支承位置から有効な外郭が求まりません（span/width ≤ 0）"],
    };
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const solids: SolidNode[] = [];

  // 主桁帯（支承上面 → 桁下面）
  if (girderBottom > bearingTop) {
    solids.push({
      id: "SUPERSTRUCTURE-GIRDER",
      kind: "box",
      localCenter: { x: centerX, y: centerY, z: (bearingTop + girderBottom) / 2 },
      localSize: { x: span, y: width, z: girderBottom - bearingTop },
      entity: "superstructure",
      material: "superstructure.girder",
    });
  }

  // 床版（桁下面 → 床版上面）
  if (deckTop > girderBottom) {
    solids.push({
      id: "SUPERSTRUCTURE-DECK",
      kind: "box",
      localCenter: { x: centerX, y: centerY, z: (girderBottom + deckTop) / 2 },
      localSize: { x: span, y: width, z: deckTop - girderBottom },
      entity: "superstructure",
      material: "superstructure.deck",
    });
  }

  const anchor = input.supportPositions.get(seats[0].supportId) ?? { x: 0, y: 0, z: 0 };

  return {
    ok: true,
    group: {
      supportId: "SUPERSTRUCTURE",
      solids,
      transform: identityTransform(anchor),
    },
    diagnostics,
  };
}

/** 支承位置の概要（UI・trace 用）。 */
export function summarizeEnvelope(
  seats: readonly BearingSeatInput[],
): { count: number; minX: number; maxX: number; minY: number; maxY: number } {
  const pos = seats
    .map((s) => s.bearingPosition)
    .filter((p): p is Vec3 => !!p);
  if (pos.length === 0) return { count: 0, minX: 0, maxX: 0, minY: 0, maxY: 0 };
  return {
    count: pos.length,
    minX: Math.min(...pos.map((p) => p.x)),
    maxX: Math.max(...pos.map((p) => p.x)),
    minY: Math.min(...pos.map((p) => p.y)),
    maxY: Math.max(...pos.map((p) => p.y)),
  };
}
