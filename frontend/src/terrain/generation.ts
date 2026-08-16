// T-5: Terrain Generation（純関数・ブラウザ/ネットワーク非依存）
//
// Heightfield（または GsiDemResult 由来グリッド）→ TerrainDocument
//（frontend/src/next/modules/terrainModule.ts 契約）+ SCT1 asset + checksum を生成する。
// fetchDemTiles（ネットワーク）とは分離し、入力は Heightfield のみで完結する。
//
// checksum 規約（T-5 §3）:
//   asset.checksum = デコード後 SCT1 バイト列の plain sha256（sha256BytesHex）。
//   B-4 の resolveAssetBytes（siteContextPackage.ts）は base64 デコード後の
//   バイト列を plain sha256 で検証する（データ契約 §3.16）。本モジュールは
//   これと同一の「バイト列 plain sha256」を採用する（canonicalHash は使わない）。

import {
  TERRAIN_SCHEMA_VERSION,
  type TerrainBounds,
  type TerrainDocument,
  type TerrainSourceMetadata,
} from "../next/modules/terrainModule";
import { NO_DATA, type Heightfield } from "./heightfield";
import { heightfieldToBase64, serializeHeightfieldBinary } from "./sct1";
import { sha256BytesHex } from "./canonicalize";

/** SCT1 アセット参照（manifest entry と同一形状） */
export interface TerrainAsset {
  readonly path: string;
  readonly checksum: string;
  readonly size: number;
  readonly base64: string;
}

/** プロジェクト内アセット manifest（canonical slot）。path → asset entry。 */
export type TerrainAssetManifestEntry = TerrainAsset;
export type TerrainAssetManifest = Readonly<Record<string, TerrainAssetManifestEntry>>;

export interface TerrainGenerationInput {
  readonly terrainId: string;
  readonly heightfield: Heightfield;
  readonly source: TerrainSourceMetadata;
  readonly projectOrigin: { readonly x: number; readonly y: number; readonly z: number };
  readonly assetPath: string;
}

export interface TerrainGenerationResult {
  readonly terrainDocument: TerrainDocument;
  readonly asset: TerrainAsset;
  readonly elevationRange: { readonly minElevation: number; readonly maxElevation: number };
}

/** グリッド bounds（半セル拡張）。B-4 deriveGridBounds と同一公式。 */
export function gridBoundsFromHeightfield(hf: Heightfield): {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
} {
  return {
    minX: hf.originX - hf.cellSize / 2,
    minY: hf.originY - hf.cellSize / 2,
    maxX: hf.originX + (hf.width - 1) * hf.cellSize + hf.cellSize / 2,
    maxY: hf.originY + (hf.height - 1) * hf.cellSize + hf.cellSize / 2,
  };
}

/** 標高 min/max（NO_DATA 除外）。全セル no-data なら TER-EMPTY-ELEVATION。 */
export function elevationRangeFromHeightfield(hf: Heightfield): {
  readonly minElevation: number;
  readonly maxElevation: number;
} {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let k = 0; k < hf.data.length; k++) {
    const v = hf.data[k];
    if (v === NO_DATA) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error('TER-EMPTY-ELEVATION');
  }
  return { minElevation: min, maxElevation: max };
}

/** SCT1 バイト列の sha256 をアセット参照へ（async: sha256BytesHex が node:crypto/crypto.subtle を使うため） */
export async function buildTerrainAsset(heightfield: Heightfield, assetPath: string): Promise<TerrainAsset> {
  const bytes = serializeHeightfieldBinary(heightfield);
  const checksum = await sha256BytesHex(bytes);
  return {
    path: assetPath,
    checksum,
    size: bytes.length,
    base64: heightfieldToBase64(heightfield),
  };
}

/** TerrainDocument 生成（純同期） */
export function buildTerrainDocument(input: TerrainGenerationInput): TerrainDocument {
  const { terrainId, heightfield, source, projectOrigin, assetPath } = input;
  const b = gridBoundsFromHeightfield(heightfield);
  const range = elevationRangeFromHeightfield(heightfield);
  const bounds: TerrainBounds = {
    minX: b.minX,
    minY: b.minY,
    maxX: b.maxX,
    maxY: b.maxY,
    minElevation: range.minElevation,
    maxElevation: range.maxElevation,
  };
  return {
    terrainId,
    schemaVersion: TERRAIN_SCHEMA_VERSION,
    source,
    coordinateContext: {
      coordinateSystem: "project",
      projectOrigin,
      localOrigin: null,
      unitSystem: "metric",
      axisConvention: "x-along/y-transverse/z-up",
    },
    bounds,
    surfaceReference: assetPath,
    assetReferences: [assetPath],
  };
}

/** manifest（path → entry）を構築 */
export function buildTerrainAssetManifest(asset: TerrainAsset): TerrainAssetManifest {
  return { [asset.path]: { ...asset } };
}

/** 生成パイプライン: Heightfield → TerrainDocument + asset（純粋・ネットワークなし） */
export async function generateTerrain(input: TerrainGenerationInput): Promise<TerrainGenerationResult> {
  const terrainDocument = buildTerrainDocument(input);
  const asset = await buildTerrainAsset(input.heightfield, input.assetPath);
  return {
    terrainDocument,
    asset,
    elevationRange: terrainDocument.bounds
      ? { minElevation: terrainDocument.bounds.minElevation, maxElevation: terrainDocument.bounds.maxElevation }
      : elevationRangeFromHeightfield(input.heightfield),
  };
}