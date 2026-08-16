// EPSG分類器（site-context-prototype docs/design/03 §4-1・Freeze・EPSGClassifierVersion=1）
// 移植元: site-context-prototype packages/core/src/coordinate/epsgClassifier.ts
// known EPSG → projected/geographic を判定する。判定不能は error。

export const EPSG_CLASSIFIER_VERSION = '1';

export type CrsProjection = 'projected' | 'geographic';

// 経緯度系（geographic）
const GEOGRAPHIC_EPSG = new Set<number>([4326, 6668, 4269, 4612]);
// 平面直角系（projected）: 6669-6687 は連番
export function isPlaneRectangular(epsg: number): boolean {
  return epsg >= 6669 && epsg <= 6687;
}

export function classifyCrs(epsg: number): CrsProjection {
  if (GEOGRAPHIC_EPSG.has(epsg)) return 'geographic';
  if (isPlaneRectangular(epsg)) return 'projected';
  throw new Error(`CRS-UNKNOWN-EPSG: ${epsg}`);
}

export interface ClassifiedCrs {
  epsg: number;
  projection: CrsProjection;
  horizontalUnits: 'm' | 'degree';
}

export function classifyEpsg(epsg: number): ClassifiedCrs {
  const projection = classifyCrs(epsg);
  return {
    epsg,
    projection,
    horizontalUnits: projection === 'geographic' ? 'degree' : 'm',
  };
}