import type { RoadAlignment, RoadAlignmentPoint } from "../../bridge/types";

export type AlignmentSummary = {
  pointCount: number;
  totalLength: number;
  startElev: number;
  endElev: number;
  maxSlope: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

const EMPTY: AlignmentSummary = {
  pointCount: 0,
  totalLength: 0,
  startElev: 0,
  endElev: 0,
  maxSlope: 0,
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
};

/**
 * 中心線形からサマリ (点数/中心線長/標高/勾配) を算出する。
 * 純粋関数なので UI からもテストからも呼べる。
 */
export function summarizeAlignment(alignment: RoadAlignment): AlignmentSummary {
  const pts: RoadAlignmentPoint[] = alignment.points;
  if (pts.length === 0) return { ...EMPTY };
  const start = pts[0];
  const end = pts[pts.length - 1];
  let totalLength = 0;
  let maxSlope = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const seg = Math.sqrt(dx * dx + dy * dy + dz * dz);
    totalLength += seg;
    if (seg > 1e-9) {
      const slope = Math.abs(dz) / seg;
      if (slope > maxSlope) maxSlope = slope;
    }
  }
  return {
    pointCount: pts.length,
    totalLength,
    startElev: start.z,
    endElev: end.z,
    maxSlope,
    startX: start.x,
    startY: start.y,
    endX: end.x,
    endY: end.y,
  };
}

export type AlignmentExtent = { span: number; centerX: number; centerY: number };

/**
 * XY 平面における中心線のバウンディング extent。
 * Z (標高) は含めない。
 */
export function computeAlignmentExtent(alignment: RoadAlignment): AlignmentExtent {
  if (alignment.points.length === 0) {
    return { span: 1, centerX: 0, centerY: 0 };
  }
  const xs = alignment.points.map((p) => p.x);
  const ys = alignment.points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    span: Math.max(maxX - minX, maxY - minY, 1),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}
