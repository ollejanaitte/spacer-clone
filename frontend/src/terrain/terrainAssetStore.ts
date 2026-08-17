// T-5: Terrain 標高保存・再読込 store（site-context-prototype 既存実装の PORT）
//
// 移植元: site-context-prototype app/src/store/terrainAsset.ts
// （Phase 3・Step 3-07 で完成した、SCT1 バイナリ標高を IndexedDB に保存・復元する
//   既存の Terrain 管理機構。SPACER 専用の新 Terrain 管理システムは作らない。）
//
// 【G-2 / G-4: runtime ownership 最終確定】
//   - production の実行時正本は project JSON 内 assetManifest (base64 SCT1) と
//     し、IndexedDB を実行時正本とする主張は正式に retire した。
//   - 実 IndexedDB 実装 (createIndexedDbTerrainElevationStore / openDb /
//     IndexedDbLike) は production / test 双方で呼び出し実績が 0 のため
//     G-4 で削除した (dead code)。
//   - TerrainElevationStore インターフェースとメモリ実装
//     (createMemoryTerrainElevationStore) はテスト専用シームとして維持する。
//   - Heightfield / SCT1 / checksum は frontend/src/terrain の PORT 済み primitive
//     を使用。

import { Heightfield, NO_DATA } from "./heightfield";
import type { GridSpec } from "./types";
import { heightfieldToBase64, base64ToHeightfield, serializeHeightfieldBinary } from "./sct1";

/** 移植元 TerrainBinaryAsset と同一形状。 */
export interface TerrainBinaryAsset {
  dataBase64: string;
  checksum: string;
  size: number;
  width: number;
  height: number;
  cellSize: number;
  originX: number;
  originY: number;
  noDataValue: number;
}

/** IndexedDB 保存レコード（keyPath=projectId）。 */
export interface TerrainElevationRecord extends TerrainBinaryAsset {
  projectId: string;
  terrainId: string;
}

/** Terrain 標高 store の共通 I/F（テスト用メモリ実装）。 */
export interface TerrainElevationStore {
  save(projectId: string, terrainId: string, asset: TerrainBinaryAsset): Promise<void>;
  load(projectId: string): Promise<TerrainElevationRecord | null>;
  delete(projectId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// テスト用メモリ実装（node env 検証用。テスト専用シーム）
// ---------------------------------------------------------------------------

/** メモリベースの Terrain 標高 store（テスト専用・動作は旧 IndexedDB 実装と同等）。 */
export function createMemoryTerrainElevationStore(): TerrainElevationStore {
  const records = new Map<string, TerrainElevationRecord>();
  return {
    async save(projectId, terrainId, asset) {
      records.set(projectId, { projectId, terrainId, ...asset });
    },
    async load(projectId) {
      return records.get(projectId) ?? null;
    },
    async delete(projectId) {
      records.delete(projectId);
    },
  };
}

// ---------------------------------------------------------------------------
// 変換ヘルパー（移植元 heightfieldToAsset / makeHeightfield を PORT）
// ---------------------------------------------------------------------------

/** Heightfield → TerrainBinaryAsset（checksum は呼び出し側で sha256 等を指定）。 */
export function heightfieldToAsset(hf: Heightfield, checksum: string): TerrainBinaryAsset {
  const bytes = serializeHeightfieldBinary(hf);
  return {
    dataBase64: heightfieldToBase64(hf),
    checksum,
    size: bytes.length,
    width: hf.width,
    height: hf.height,
    cellSize: hf.cellSize,
    originX: hf.originX,
    originY: hf.originY,
    noDataValue: hf.noDataValue,
  };
}

/** Float32Array 標高データから Heightfield へ（GridSpec 使用）。 */
export function makeHeightfield(spec: GridSpec, data: Float32Array): Heightfield {
  if (data.length !== spec.width * spec.height) throw new Error("TER-GRID-SIZE");
  return new Heightfield(spec, data);
}

export { base64ToHeightfield };
export { NO_DATA };