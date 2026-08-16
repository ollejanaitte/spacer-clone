// T-6: 郡上市八幡 (Gujo Hachiman) Sample PORT — Reference Business 001 fixture
//
// 正本: docs/development/reference-business-001-gujo-baseline.md
// - 中心 WGS84: 35.7512N / 136.9567E
// - CRS: EPSG:6674（JGD2011 平面直角。transform テーブルは zone:6/lon0:136.0 と
//   表記するが変換値は pyproj 実測（X=86,522.4 / Y=-27,181.2）と一致。正規表記は
//   第7系・中央経線 137°E（gujo-baseline §2 の記録どおり））
// - DEM: GSI DEM5A（dem5a_png）ZL15・36タイル（x 28847-28852 / y 12892-12897）・cellSize 5m
// - source: 出典:国土地理院 / offlineOk・redistributeOk = unknown（fail-closed）
//
// 本モジュールの fixture は **REPRESENTATIVE FIXTURE**（32×32・標高 200-1200m の
// 決定性グリッド）であり、実地形の 1000×1000 グリッドではない。
// SCT1 base64 はコミット定数として保持し、テスト時にネットワーク不要で復元できる。

import { createEmptyProject } from "../next/project/projectDataCore";
import type { Project } from "../next/project/schema";
import {
  TERRAIN_SCHEMA_VERSION,
  type TerrainDocument,
  type TerrainSourceMetadata,
} from "../next/modules/terrainModule";
import { Heightfield } from "./heightfield";
import { base64ToHeightfield } from "./sct1";
import type { TerrainAsset } from "./generation";
import { buildTerrainDocument } from "./generation";
import { persistTerrain } from "./terrainPersistence";

// ---------------------------------------------------------------------------
// Gujo baseline constants
// ---------------------------------------------------------------------------

export const GUJO_CENTER_WGS84 = { lat: 35.7512, lon: 136.9567 } as const;
export const GUJO_EPSG = 6674;
export const GUJO_CENTER_EPSG6674 = { x: 86522.4, y: -27181.2 } as const;

export const GUJO_BOUNDS_WGS84 = {
  lonMin: 136.929,
  lonMax: 136.9844,
  latMin: 35.7287,
  latMax: 35.7737,
} as const;

export const GUJO_BOUNDS_EPSG6674 = {
  minX: 83996,
  minY: -29697,
  maxX: 89050,
  maxY: -24665,
} as const;

export const GUJO_DEM5A = {
  datasetId: "dem5a_png",
  zoom: 15,
  tileXMin: 28847,
  tileXMax: 28852,
  tileYMin: 12892,
  tileYMax: 12897,
  tileCount: 36,
  cellSize: 5,
} as const;

export const GUJO_FIXTURE_TIMESTAMP = "2026-08-16T00:00:00.000Z" as const;

export const GUJO_COORDINATE_CONTEXT_ID = "ctx-gujo-jgd2011-6674" as const;

/** siteContext sourceDataset（sourceDatasetSchema 準拠・metadata.siteContextSourceDatasets 用） */
export const GUJO_SOURCE_DATASET = {
  sourceDatasetId: "gsi-dem-gujo-hachiman-5km",
  sourceType: "dem",
  sourceName: "国土地理院 標高タイル",
  originalSource: "gsi",
  coordinateContextId: GUJO_COORDINATE_CONTEXT_ID,
  bounds: GUJO_BOUNDS_EPSG6674,
  acquiredAt: GUJO_FIXTURE_TIMESTAMP,
  provider: "国土地理院",
  url: "https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/15/{x}/{y}.png",
  license: {
    attribution: "国土地理院",
    conditions: "GSI tile PDL1.0（出典明示必須。offlineOk/redistributeOk は未確認 → fail-closed）",
    offlineOk: "unknown",
    redistributeOk: "unknown",
  },
  cachePolicy: "cache-allowed",
  location: { mode: "transient", reason: "GSI tile requires live network; sample fixture is a representative substitute" },
  resolution: { cellSize: 5, units: "m" },
  quality: { method: "bilinear", verticalM: 5, horizontalM: 5 },
  datasetContentHash: "5f7bbe228ec7cef26aef499e1dfbb88e3c6db2f072f4cc90162dc7771f0107bc",
  // NOTE (S-11): datasetContentHash は「実 GSI DEM の内容 hash」ではなく、
  // 本 sample の代表 fixture (GUJO_SAMPLE_SCT1_BASE64) の SCT1 checksum と同値。
  // これは意図的な substitute 契約である (GSI 実タイルはライセンス上 bundle 不可。
  // representative fixture を正本として network 不要で検証可能にする)。
  // fixture checksum 変更時は本 hash も同じ変更単位で更新する (site-context
  // data-contract: datasetContentHash は checksum 照合に使用)。
  gsiMeta: {
    datasetId: "dem5a_png",
    zoom: 15,
    tiles: { xMin: 28847, xMax: 28852, yMin: 12892, yMax: 12897 },
    tileCount: 36,
    cellSize: 5,
  },
  provenance: {
    provider: "gsi",
    method: "gsi-dem-tile",
    tileCount: 36,
    zoom: 15,
    geoBounds: GUJO_BOUNDS_WGS84,
    rawMetadata: {},
  },
} as const;

/** siteContext coordinateContext（v2CoordinateContextSchema 準拠・metadata.siteContextCoordinateContexts 用） */
export const GUJO_COORDINATE_CONTEXT = {
  id: GUJO_COORDINATE_CONTEXT_ID,
  crs: {
    kind: "known",
    projection: "projected",
    epsg: GUJO_EPSG,
    name: "JGD2011 / Japan Plane Rectangular CS VII",
    horizontalUnits: "m",
  },
  verticalDatum: "tp",
  verticalUnits: "m",
  origin: { x: 0, y: 0, z: 0 },
} as const;

// ---------------------------------------------------------------------------
// Representative fixture（32×32・標高 200→1200m の決定性勾配）
// ---------------------------------------------------------------------------

export const GUJO_SAMPLE_TERRAIN_ID = "terrain-gujo-hachiman-sample" as const;
export const GUJO_SAMPLE_ASSET_PATH = "assets/terrain/gujo-hachiman-sample.sct1" as const;
export const GUJO_FIXTURE_GRID = {
  width: 32,
  height: 32,
  cellSize: 5,
  originX: GUJO_BOUNDS_EPSG6674.minX,
  originY: GUJO_BOUNDS_EPSG6674.minY,
  rowMajor: true,
} as const;
export const GUJO_SAMPLE_ASSET_SIZE = 4138;
export const GUJO_SAMPLE_ASSET_CHECKSUM =
  "5f7bbe228ec7cef26aef499e1dfbb88e3c6db2f072f4cc90162dc7771f0107bc" as const;
export const GUJO_SAMPLE_SCT1_BASE64 = "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";

/** 決定性の代表 fixture Heightfield を構築（ネットワーク不要）。 */
export function buildGujoSampleHeightfield(): Heightfield {
  const { width, height, cellSize, originX, originY } = GUJO_FIXTURE_GRID;
  const data = new Float32Array(width * height);
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      data[j * width + i] = 200 + (1000 * (i / (width - 1) + j / (height - 1))) / 2;
    }
  }
  return new Heightfield({ ...GUJO_FIXTURE_GRID, rowMajor: true }, data);
}

/** コミット済み SCT1 base64 から Heightfield を復元（コミット定数が正本）。 */
export function loadGujoSampleHeightfield(): Heightfield {
  return base64ToHeightfield(GUJO_SAMPLE_SCT1_BASE64);
}

function gujoSourceMetadata(): TerrainSourceMetadata {
  return {
    sourceType: "dem",
    sourceName: GUJO_SOURCE_DATASET.sourceName,
    importedAt: GUJO_FIXTURE_TIMESTAMP,
  };
}

/** 郡上 sample の TerrainDocument（fixture 標高帯 200-1200m）。 */
export function buildGujoSampleTerrainDocument(): TerrainDocument {
  return buildTerrainDocument({
    terrainId: GUJO_SAMPLE_TERRAIN_ID,
    heightfield: buildGujoSampleHeightfield(),
    source: gujoSourceMetadata(),
    projectOrigin: { x: 0, y: 0, z: 0 },
    assetPath: GUJO_SAMPLE_ASSET_PATH,
  });
}

/** 郡上 sample のアセット参照（コミット済み base64 + checksum）。 */
export function buildGujoSampleAsset(): TerrainAsset {
  return {
    path: GUJO_SAMPLE_ASSET_PATH,
    checksum: GUJO_SAMPLE_ASSET_CHECKSUM,
    size: GUJO_SAMPLE_ASSET_SIZE,
    base64: GUJO_SAMPLE_SCT1_BASE64,
  };
}

/**
 * 郡上 sample Project を構築（parseProject 合格を保証）。
 * B-4 adapter 契約スロットへ格納:
 *   modules.terrain.data.terrainDocument
 *   modules.terrain.data.assetManifest
 *   metadata.siteContextCoordinateContexts
 *   metadata.siteContextProjectCoordinateContextId
 *   metadata.siteContextSourceDatasets
 */
export function buildGujoSampleProject(): Project {
  const project = createEmptyProject("郡上市八幡 (Gujo Hachiman) Sample");
  const withTerrain = persistTerrain(
    project,
    buildGujoSampleTerrainDocument(),
    buildGujoSampleAsset(),
  );
  const withMetadata: Project = {
    ...withTerrain,
    metadata: {
      ...withTerrain.metadata,
      siteContextCoordinateContexts: [GUJO_COORDINATE_CONTEXT],
      siteContextProjectCoordinateContextId: GUJO_COORDINATE_CONTEXT_ID,
      siteContextSourceDatasets: [GUJO_SOURCE_DATASET],
    },
  };
  return withMetadata;
}

export { TERRAIN_SCHEMA_VERSION };