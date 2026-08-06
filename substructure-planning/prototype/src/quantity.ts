// 概算数量（幾何学的概算値。実務数量ではない）
import type { Pier, Support, Vec3 } from "./model";

export interface QuantitySummary {
  columnVolume: number;
  capVolume: number;
  footingVolume: number;
  pileVolume: number;
  totalConcreteVolume: number;
totalPileLength: number;
  units: string;
  note: string;
}

export function vecVol(a: number, b: number, c: number): number {
  return a * b * c;
}

export function computePierQuantity(pier: Pier): {
  column: number;
  cap: number;
  footing: number;
  pilesVolume: number;
  pileLength: number;
} {
  const column = vecVol(pier.column.width, pier.column.depth, pier.column.height);
  const cap = vecVol(pier.cap.width, pier.cap.height, pier.cap.depth);
  const footing = vecVol(pier.footing.length, pier.footing.width, pier.footing.thickness);
  let pilesVolume = 0;
  let pileLength = 0;
  if (pier.piles) {
    const perPile = Math.PI * (pier.piles.diameter / 2) ** 2 * pier.piles.length;
    pilesVolume = perPile * pier.piles.pileCount;
    pileLength = pier.piles.length * pier.piles.pileCount;
  }
  return { column, cap, footing, pilesVolume, pileLength };
}

export function computeProjectQuantity(supports: Support[]): QuantitySummary {
  let column = 0,
    cap = 0,
    footing = 0,
    pv = 0,
    pl = 0;
  for (const s of supports) {
    if (s.pier) {
      const q = computePierQuantity(s.pier);
      column += q.column;
      cap += q.cap;
      footing += q.footing;
      pv += q.pilesVolume;
      pl += q.pileLength;
    }
  }
  const totalConcreteVolume = column + cap + footing + pv;
  return {
    columnVolume: column,
    capVolume: cap,
    footingVolume: footing,
    pileVolume: pv,
    totalConcreteVolume,
    totalPileLength: pl,
    units: "m / m³",
    note: "概算値・未検証・実務使用不可（幾何学的体積のみ）",
  };
}