// T-5: Terrain Persistence 配線
//
// site-context-prototype の既存 Terrain 保存・再読込機構（app/src/store/terrainAsset.ts:
// IndexedDB「scp-terrain / elevations / projectId」）を PORT し、SPACER の
// canonical slot へ接続する。
//
// 【正本関係（二重正本にしない）】
//   - 実行時・再読込の正本は **IndexedDB store（terrainAssetStore.ts・PORT 済み）**。
//     Save → saveTerrainElevation で標高バイナリを保存 / Close → 何もしない /
//     Reopen → loadTerrainElevation で IndexedDB から復元（site-context と同一フロー）。
//   - modules.terrain.data.assetManifest は **.spacerproj パッケージ自己完結用の
//     導出ビュー（直列化）** であり、実行時正本ではない。外部へ .spacerproj を渡す際の
//     同梱表現であり、import 時はこの manifest から IndexedDB へ seed する
//     （二重保存にはしない）。
//
//   modules.terrain.data.terrainDocument … TerrainDocument（terrainModule 契約・B-4 接続点）
//   modules.terrain.data.assetManifest    … パッケージ同梱用の直列化ビュー（正本ではない）
//   terrainAssetStore（IndexedDB）        … 実行時正本（Save→保存 / Reopen→復元）
//
// 再実装回避方針: 新規の Terrain 管理システムは作らず、既存 IndexedDB store を
// PORT して接続する。検証は fail-closed。

import { createTerrainModuleRecord, validateTerrainData } from "../next/modules/terrainModule";
import type { TerrainDocument } from "../next/modules/terrainModule";
import { parseProject } from "../next/project/projectDataCore";
import type { Project } from "../next/project/schema";
import type { TerrainAsset, TerrainAssetManifest, TerrainAssetManifestEntry } from "./generation";
import { base64ToBytes, base64ToHeightfield } from "./sct1";
import { sha256BytesHex } from "./canonicalize";
import {
  heightfieldToAsset,
  type TerrainBinaryAsset,
  type TerrainElevationStore,
} from "./terrainAssetStore";

export const TERRAIN_ASSET_MANIFEST_KEY = "assetManifest";

export type TerrainPersistenceError =
  | "terrain-document-invalid"
  | "project-invalid";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTerrainModuleData(project: Project): Record<string, unknown> | undefined {
  const mod = project.modules.terrain;
  if (!isRecord(mod)) return undefined;
  const data = mod.data;
  return isRecord(data) ? data : undefined;
}

/**
 * TerrainDocument + asset を Project へ埋め込む。
 * 既存の modules.terrain.data（siteContext / selectionArea 等・Lane B 保持分）は保持する。
 * 検証失敗時は throw（fail-closed）。
 */
export function persistTerrain(
  project: Project,
  terrainDocument: TerrainDocument,
  asset: TerrainAsset,
): Project {
  const existingModule = project.modules.terrain;
  const moduleRecord: Record<string, unknown> = {
    ...createTerrainModuleRecord(),
    ...(isRecord(existingModule) ? existingModule : {}),
  };
  const existingData = isRecord(moduleRecord.data) ? moduleRecord.data : {};
  const existingManifest = extractTerrainAssetManifest(project) ?? {};

  const data: Record<string, unknown> = {
    ...existingData,
    terrainDocument: structuredClone(terrainDocument),
  };
  data[TERRAIN_ASSET_MANIFEST_KEY] = {
    ...existingManifest,
    [asset.path]: { path: asset.path, checksum: asset.checksum, size: asset.size, base64: asset.base64 },
  };
  moduleRecord.data = data;

  const next: Project = {
    ...project,
    modules: {
      ...project.modules,
      terrain: moduleRecord as Project["modules"]["terrain"],
    },
  };

  const issues = validateTerrainData(next.modules.terrain.data as Record<string, unknown>);
  if (issues.length > 0) {
    throw new Error(
      `TER-PERSIST-INVALID-DATA: ${issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`,
    );
  }
  const parsed = parseProject(next);
  if (!parsed.ok) {
    throw new Error(`TER-PERSIST-INVALID-PROJECT: ${parsed.issues.join("; ")}`);
  }
  return parsed.project;
}

export function extractTerrainDocument(project: Project): TerrainDocument | undefined {
  const data = readTerrainModuleData(project);
  const doc = data?.terrainDocument;
  return doc && typeof doc === "object" && !Array.isArray(doc) ? (doc as TerrainDocument) : undefined;
}

export function extractTerrainAssetManifest(project: Project): TerrainAssetManifest | undefined {
  const data = readTerrainModuleData(project);
  const manifest = data?.[TERRAIN_ASSET_MANIFEST_KEY];
  if (!isRecord(manifest)) return undefined;
  const out: Record<string, TerrainAssetManifestEntry> = {};
  for (const [path, raw] of Object.entries(manifest)) {
    if (!isRecord(raw)) continue;
    const { checksum, size, base64 } = raw as Record<string, unknown>;
    if (typeof checksum !== "string" || typeof size !== "number" || typeof base64 !== "string") continue;
    out[path] = { path, checksum, size, base64 };
  }
  return out;
}

function firstAssetReferencePath(project: Project): string | undefined {
  const doc = extractTerrainDocument(project);
  if (!doc) return undefined;
  return doc.assetReferences.length > 0 ? doc.assetReferences[0] : doc.surfaceReference ?? undefined;
}

export function extractTerrainAsset(project: Project, path?: string): TerrainAsset | undefined {
  const manifest = extractTerrainAssetManifest(project);
  if (!manifest) return undefined;
  const target = path ?? firstAssetReferencePath(project);
  if (!target) return undefined;
  return manifest[target];
}

/**
 * terrainDocument の assetReference と manifest の整合を検証（checksum / size /
 * surfaceReference / assetReferences の一致）。fail-closed。
 */
export async function verifyTerrainAssetChecksum(
  project: Project,
): Promise<{ ok: true; asset: TerrainAsset } | { ok: false; reason: string }> {
  const doc = extractTerrainDocument(project);
  const asset = extractTerrainAsset(project);
  if (!doc || !asset) {
    return { ok: false, reason: "terrain document or asset manifest missing" };
  }
  if (doc.surfaceReference !== asset.path) {
    return { ok: false, reason: `surfaceReference ${doc.surfaceReference} != asset ${asset.path}` };
  }
  if (!doc.assetReferences.includes(asset.path)) {
    return { ok: false, reason: `assetReferences ${JSON.stringify(doc.assetReferences)} missing ${asset.path}` };
  }
  const bytes = base64ToBytes(asset.base64);
  if (bytes.length !== asset.size) {
    return { ok: false, reason: `size mismatch: manifest ${asset.size} != decoded ${bytes.length}` };
  }
  const actual = await sha256BytesHex(bytes);
  if (actual !== asset.checksum) {
    return { ok: false, reason: `checksum mismatch: manifest ${asset.checksum} != actual ${actual}` };
  }
  return { ok: true, asset };
}

// ---------------------------------------------------------------------------
// 実行時正本（IndexedDB store・PORT 済み terrainAssetStore へ接続）
// ---------------------------------------------------------------------------

/**
 * Save: TerrainAsset を TerrainBinaryAsset へ変換し、IndexedDB store へ保存する
 * （site-context terrainAsset.ts の saveTerrainElevation と同一セマンティクス）。
 * 実行時正本はこの store。
 */
export async function saveTerrainElevation(
  store: TerrainElevationStore,
  projectId: string,
  terrainId: string,
  asset: TerrainAsset,
): Promise<void> {
  const hf = base64ToHeightfield(asset.base64);
  const binary = heightfieldToAsset(hf, asset.checksum);
  await store.save(projectId, terrainId, binary);
}

/**
 * Reopen: IndexedDB store から標高バイナリを復元し TerrainAsset へ変換する
 * （site-context terrainAsset.ts の loadTerrainElevation と同一セマンティクス）。
 * 実行時正本はこの store。assetPath は terrainDocument の assetReferences から解決する。
 */
export async function loadTerrainElevation(
  store: TerrainElevationStore,
  projectId: string,
  assetPath: string,
): Promise<TerrainAsset | null> {
  const record = await store.load(projectId);
  if (!record) return null;
  return {
    path: assetPath,
    checksum: record.checksum,
    size: record.size,
    base64: record.dataBase64,
  };
}

/** TerrainBinaryAsset を直接 store へ保存する（PORT 元と同一形状の低レベル I/F）。 */
export async function saveTerrainBinary(
  store: TerrainElevationStore,
  projectId: string,
  terrainId: string,
  binary: TerrainBinaryAsset,
): Promise<void> {
  await store.save(projectId, terrainId, binary);
}

/** TerrainBinaryAsset を直接 store から読み出す（PORT 元と同一形状の低レベル I/F）。 */
export async function loadTerrainBinary(
  store: TerrainElevationStore,
  projectId: string,
): Promise<TerrainBinaryAsset | null> {
  return store.load(projectId);
}

/**
 * Reopen 時の整合検証: IndexedDB store から復元した標高と project 内
 * terrainDocument の assetReference / checksum を照合する。fail-closed。
 */
export async function verifyReopenedTerrain(
  project: Project,
  restored: TerrainAsset | null,
): Promise<{ ok: true; asset: TerrainAsset } | { ok: false; reason: string }> {
  const doc = extractTerrainDocument(project);
  if (!doc) {
    return { ok: false, reason: "terrain document missing" };
  }
  if (!restored) {
    return { ok: false, reason: "elevation not restored from store" };
  }
  if (doc.surfaceReference !== restored.path) {
    return { ok: false, reason: `surfaceReference ${doc.surfaceReference} != restored ${restored.path}` };
  }
  if (!doc.assetReferences.includes(restored.path)) {
    return { ok: false, reason: `assetReferences missing ${restored.path}` };
  }
  const bytes = base64ToBytes(restored.base64);
  if (bytes.length !== restored.size) {
    return { ok: false, reason: `size mismatch: restored ${restored.size} != decoded ${bytes.length}` };
  }
  const actual = await sha256BytesHex(bytes);
  if (actual !== restored.checksum) {
    return { ok: false, reason: `checksum mismatch: restored ${restored.checksum} != actual ${actual}` };
  }
  return { ok: true, asset: restored };
}