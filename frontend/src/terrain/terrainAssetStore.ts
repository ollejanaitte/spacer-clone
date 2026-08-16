// T-5: Terrain 標高保存・再読込 store（site-context-prototype 既存実装の PORT）
//
// 移植元: site-context-prototype app/src/store/terrainAsset.ts
// （Phase 3・Step 3-07 で完成した、SCT1 バイナリ標高を IndexedDB に保存・復元する
//   既存の Terrain 管理機構。SPACER 専用の新 Terrain 管理システムは作らない。）
//
// 接続方針（再実装回避）:
// - DB 名 / store 名 / keyPath / DB_VERSION は移植元と同一（scp-terrain / elevations /
//   projectId / 2）。既存実装のセマンティクスをそのまま引き継ぐ。
// - Heightfield / SCT1 / checksum は frontend/src/terrain の PORT 済み primitive を使用。
// - IndexedDB はブラウザ専用のため、テスト（node env）ではメモリ実装
//   （createMemoryTerrainElevationStore）を注入して検証する。

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

/** Terrain 標高 store の共通 I/F（IndexedDB 実装 + テスト用メモリ実装）。 */
export interface TerrainElevationStore {
  save(projectId: string, terrainId: string, asset: TerrainBinaryAsset): Promise<void>;
  load(projectId: string): Promise<TerrainElevationRecord | null>;
  delete(projectId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// IndexedDB 実装（移植元 terrainAsset.ts の openDb / save / load / delete を PORT）
// ---------------------------------------------------------------------------

const DB_NAME = "scp-terrain";
const STORE = "elevations";
const DB_VERSION = 2;

/** テスト注入用: 実ブラウザの IDBFactory（node env では undefined）。 */
export type IndexedDbLike = Pick<IDBFactory, "open">;

function openDb(indexedDb: IndexedDbLike | undefined): Promise<IDBDatabase> {
  if (!indexedDb) {
    throw new Error("IDB-UNAVAILABLE: IndexedDB is not available in this environment");
  }
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("IDB-OPEN-TIMEOUT"));
    }, 5000);
    const req = indexedDb.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "projectId" });
      }
    };
    req.onsuccess = () => {
      clearTimeout(timer);
      resolvePromise(req.result);
    };
    req.onerror = () => {
      clearTimeout(timer);
      reject(req.error);
    };
  });
}

/** IndexedDB ベースの Terrain 標高 store（移植元 terrainAsset.ts の挙動を維持）。 */
export function createIndexedDbTerrainElevationStore(
  indexedDb?: IndexedDbLike,
): TerrainElevationStore {
  const idb: IndexedDbLike | undefined = indexedDb ?? globalThis.indexedDB;
  return {
    async save(projectId, terrainId, asset) {
      const db = await openDb(idb);
      await new Promise<void>((resolvePromise, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put({ projectId, terrainId, ...asset });
        tx.oncomplete = () => resolvePromise();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error("IDB-SAVE-ABORT"));
      });
    },
    async load(projectId) {
      const db = await openDb(idb);
      if (!db.objectStoreNames.contains(STORE)) {
        throw new Error("IDB-STORE-MISSING");
      }
      return new Promise((resolvePromise, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("IDB-LOAD-TIMEOUT"));
        }, 5000);
        try {
          const tx = db.transaction(STORE, "readonly");
          const req = tx.objectStore(STORE).get(projectId);
          req.onsuccess = () => {
            clearTimeout(timer);
            resolvePromise(
              (req.result as TerrainElevationRecord | undefined) ?? null,
            );
          };
          req.onerror = () => {
            clearTimeout(timer);
            reject(req.error);
          };
          tx.onabort = () => {
            clearTimeout(timer);
            reject(tx.error ?? new Error("IDB-ABORT"));
          };
          tx.onerror = () => {
            clearTimeout(timer);
            reject(tx.error ?? new Error("IDB-TX-ERR"));
          };
        } catch (e) {
          clearTimeout(timer);
          reject(e);
        }
      });
    },
    async delete(projectId) {
      const db = await openDb(idb);
      await new Promise<void>((resolvePromise, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(projectId);
        tx.oncomplete = () => resolvePromise();
        tx.onerror = () => reject(tx.error);
      });
    },
  };
}

// ---------------------------------------------------------------------------
// テスト用メモリ実装（node env 検証用。IndexedDB 実装と同一 I/F）
// ---------------------------------------------------------------------------

/** メモリベースの Terrain 標高 store（テスト用・動作は IndexedDB 実装と同等）。 */
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