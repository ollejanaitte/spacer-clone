import { decodePng, decodeDemTile } from "./png";
import { NO_DATA } from "../heightfield";

// 13章2/2b節・RJ-F03: タイル範囲計算（half-open BBox・ceil/floor）
// 移植元: site-context-prototype packages/core/src/importer/gsi.ts

const WEB_MERC_LAT_LIMIT = 85.05112878;

export function tileXY(lon: number, lat: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const latRad = (lat * Math.PI) / 180;
  const x = ((lon + 180) / 360) * n;
  const y = ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

export interface TileRange {
  z: number;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

/** half-open BBox [lonMin,latMin,lonMax,latMax) と交わるタイルindex範囲（RJ-F03正式式） */
export function tileRangeForBBox(lonMin: number, latMin: number, lonMax: number, latMax: number, z: number): TileRange {
  const latN = Math.max(latMax, -WEB_MERC_LAT_LIMIT);
  const latS = Math.min(latMin, WEB_MERC_LAT_LIMIT);
  const lo = tileXY(lonMin, latS, z);
  const hi = tileXY(lonMax, latN, z);
  const xMin = Math.floor(Math.min(lo.x, hi.x));
  const xMax = Math.ceil(Math.max(lo.x, hi.x)) - 1;
  const yMin = Math.floor(Math.min(lo.y, hi.y));
  const yMax = Math.ceil(Math.max(lo.y, hi.y)) - 1;
  if (xMax < xMin || yMax < yMin) throw new Error('GSI-EMPTY-RANGE');
  return { z, xMin, yMin, xMax, yMax };
}

export type TileFetcher = (url: string, signal?: AbortSignal) => Promise<Uint8Array>;

export interface DemDataset {
  id: string; // "dem5a_png" | "dem5b_png" | "dem_png"
  minZoom: number;
  maxZoom: number;
}

export const GSI_DATASETS: Record<'dem5a' | 'dem5b' | 'dem10b', DemDataset> = {
  dem5a: { id: 'dem5a_png', minZoom: 1, maxZoom: 15 },
  dem5b: { id: 'dem5b_png', minZoom: 1, maxZoom: 15 },
  dem10b: { id: 'dem_png', minZoom: 1, maxZoom: 14 },
};

export const DEM_FALLBACK_CHAIN: ('dem5a' | 'dem5b' | 'dem10b')[] = ['dem5a', 'dem5b', 'dem10b'];

function tileUrl(datasetId: string, z: number, x: number, y: number): string {
  return `https://cyberjapandata.gsi.go.jp/xyz/${datasetId}/${z}/${x}/${y}.png`;
}

export interface GsiFetchOptions {
  bbox: { lonMin: number; latMin: number; lonMax: number; latMax: number };
  zoom: number;
  preferred: 'dem5a' | 'dem5b' | 'dem10b';
  fetcher: TileFetcher;
  maxTiles?: number;
  signal?: AbortSignal;
}

export interface GsiTileMeta {
  datasetId: string;
  z: number;
  x: number;
  y: number;
  url: string;
  fallbackFrom?: string;
}

export interface GsiDemResult {
  width: number;
  height: number;
  cellSize: number;
  originX: number;
  originY: number;
  data: Float32Array;
  tiles: GsiTileMeta[];
  fallbackHistory: string[];
}

/** タイルを取得し、Webメルカトルタイル座標でグリッドへ結合（x昇順・y昇順・先勝ちfallback） */
export async function fetchDemTiles(opts: GsiFetchOptions): Promise<GsiDemResult> {
  const range = tileRangeForBBox(opts.bbox.lonMin, opts.bbox.latMin, opts.bbox.lonMax, opts.bbox.latMax, opts.zoom);
  const maxTiles = opts.maxTiles ?? 2000;
  const total = (range.xMax - range.xMin + 1) * (range.yMax - range.yMin + 1);
  if (total > maxTiles) throw new Error(`GSI-TOO-MANY-TILES: ${total} > ${maxTiles}`);

  // fallback chain: preferredから低精度側へ（dem5a→dem5b→dem10b）。preferred以降すべて試す
  const preferredIdx = DEM_FALLBACK_CHAIN.indexOf(opts.preferred);
  const datasets = DEM_FALLBACK_CHAIN.slice(preferredIdx);

  const tileSize = 256;
  const width = (range.xMax - range.xMin + 1) * tileSize;
  const height = (range.yMax - range.yMin + 1) * tileSize;
  const data = new Float32Array(width * height);
  data.fill(NO_DATA);
  const tiles: GsiTileMeta[] = [];
  const fallbackHistory: string[] = [];

  for (let ty = range.yMin; ty <= range.yMax; ty++) {
    for (let tx = range.xMin; tx <= range.xMax; tx++) {
      let got = false;
      for (const d of datasets) {
        const ds = GSI_DATASETS[d];
        if (opts.zoom < ds.minZoom || opts.zoom > ds.maxZoom) continue;
        const url = tileUrl(ds.id, opts.zoom, tx, ty);
        try {
          const raw = await opts.fetcher(url, opts.signal);
          const png = decodePng(Buffer.from(raw));
          if (png.width !== 256 || png.height !== 256) throw new Error('GSI-BAD-TILE-SIZE');
          const dem = decodeDemTile(png);
          // タイル内のno-data率が100%なら無効タイル扱い（fallback）
          let nonZero = 0;
          for (let k = 0; k < dem.data.length; k++) if (dem.data[k] !== NO_DATA) nonZero++;
          if (nonZero === 0) {
            fallbackHistory.push(`${d}@${tx}/${ty}:empty`);
            continue;
          }
          const ox = (tx - range.xMin) * tileSize;
          const oy = (ty - range.yMin) * tileSize;
          for (let y = 0; y < 256; y++) {
            for (let x = 0; x < 256; x++) {
              const v = dem.data[y * 256 + x];
              if (v === NO_DATA) continue;
              data[(oy + y) * width + (ox + x)] = v; // 先勝ち（RJ-F03）
            }
          }
          tiles.push({ datasetId: ds.id, z: opts.zoom, x: tx, y: ty, url, fallbackFrom: d !== opts.preferred ? `${opts.preferred}→${d}` : undefined });
          if (d !== opts.preferred) fallbackHistory.push(`${opts.preferred}→${d}@${tx}/${ty}`);
          got = true;
          break;
        } catch {
          // 404等: 次データセットへfallback
          fallbackHistory.push(`${d}@${tx}/${ty}:unavailable`);
        }
      }
      if (!got) {
        fallbackHistory.push(`@${tx}/${ty}:no-data`);
      }
    }
  }

  // タイル画素→出力グリッド（13章2b: 出力cellSize既定 = 画素地上寸法相当。origin snapは呼び出し側）
  return { width, height, cellSize: tileResolutionMeters(opts.zoom), originX: 0, originY: 0, data, tiles, fallbackHistory };
}

/** タイル画素の地上寸法（Webメルカトル・赤道） */
export function tileResolutionMeters(z: number): number {
  return (40075016.686 / 2 ** z) / 256;
}