// Phase C1 (M3-03) 概算数量（幾何学的計算・純粋ロジック）
// コンクリート体積・杭延長など。M1 ジオメトリ由来の幾何計算であり、
// 実務数量・設計照査値ではない（M3-00 Freeze: ADOPTED）。

import type { Support } from "../model";

export interface GeometricQuantity {
  columnVolume: number;
  capVolume: number;
  beamVolume: number;
  backwallVolume: number;
  wingVolume: number;
  footingVolume: number;
  pileVolume: number;
  totalConcreteVolume: number;
  totalPileLength: number;
  units: string;
  note: string;
}

const UNIT = "m³ / m";

function vol(a: number, b: number, c: number): number {
  return a * b * c;
}

/** 1 支点分の概算数量（NaN は 0 として扱わない: 欠損寸法は 0 のまま明示）。 */
export function computeSupportQuantity(support: Support): Omit<GeometricQuantity, "units" | "note"> {
  let column = 0;
  let cap = 0;
  let beam = 0;
  let backwall = 0;
  let wing = 0;
  let footing = 0;
  let pileVolume = 0;
  let pileLength = 0;

  if (support.pier) {
    const p = support.pier;
    if (p.column) column = vol(p.column.width, p.column.depth, p.column.height);
    if (p.cap) cap = vol(p.cap.width, p.cap.depth, p.cap.height);
    if (p.beam) beam = vol(p.beam.width, p.beam.depth, p.beam.height);
    if (p.columns) {
      for (const c of p.columns) {
        column += vol(c.width, c.depth, c.height);
      }
    }
    footing = vol(p.footing.length, p.footing.width, p.footing.thickness);
    if (p.pileGroup) {
      const r = p.pileGroup.diameter / 2;
      const perPile = Math.PI * r * r * p.pileGroup.length;
      pileVolume = perPile * p.pileGroup.pileCount;
      pileLength = p.pileGroup.length * p.pileGroup.pileCount;
    }
  }

  if (support.abutment) {
    const a = support.abutment;
    backwall = vol(a.backwall.width, a.backwall.thickness, a.backwall.height);
    wing = vol(a.wingWallL.length, a.wingWallL.thickness, a.wingWallL.height) +
      vol(a.wingWallR.length, a.wingWallR.thickness, a.wingWallR.height);
    footing = vol(a.footing.length, a.footing.width, a.footing.thickness);
    if (a.pileGroup) {
      const r = a.pileGroup.diameter / 2;
      const perPile = Math.PI * r * r * a.pileGroup.length;
      pileVolume = perPile * a.pileGroup.pileCount;
      pileLength = a.pileGroup.length * a.pileGroup.pileCount;
    }
  }

  const totalConcrete = column + cap + beam + backwall + wing + footing + pileVolume;

  return {
    columnVolume: column,
    capVolume: cap,
    beamVolume: beam,
    backwallVolume: backwall,
    wingVolume: wing,
    footingVolume: footing,
    pileVolume,
    totalConcreteVolume: totalConcrete,
    totalPileLength: pileLength,
  };
}

/** 全支点の概算数量集計。 */
export function computeProjectQuantity(supports: readonly Support[]): GeometricQuantity {
  const acc = {
    columnVolume: 0,
    capVolume: 0,
    beamVolume: 0,
    backwallVolume: 0,
    wingVolume: 0,
    footingVolume: 0,
    pileVolume: 0,
    totalConcreteVolume: 0,
    totalPileLength: 0,
  };
  for (const s of supports) {
    const q = computeSupportQuantity(s);
    acc.columnVolume += q.columnVolume;
    acc.capVolume += q.capVolume;
    acc.beamVolume += q.beamVolume;
    acc.backwallVolume += q.backwallVolume;
    acc.wingVolume += q.wingVolume;
    acc.footingVolume += q.footingVolume;
    acc.pileVolume += q.pileVolume;
    acc.totalConcreteVolume += q.totalConcreteVolume;
    acc.totalPileLength += q.totalPileLength;
  }
  return { ...acc, units: UNIT, note: "幾何学的概算値。実務数量・設計照査値ではない。" };
}
