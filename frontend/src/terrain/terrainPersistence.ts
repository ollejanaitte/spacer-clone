// T-5: Terrain Persistence 配線
//
// TerrainDocument + SCT1 asset を Project の既存 loose slot へ保存する:
//   modules.terrain.data.terrainDocument … TerrainDocument（terrainModule 契約）
//   modules.terrain.data.assetManifest    … プロジェクト内アセット manifest（path → {checksum,size,base64}）
//
// IndexedDB 等の外部 asset store は存在しないため、アセットは in-project の
// manifest（canonical slot）として SCT1 base64 + checksum を保持する
//（source 固有の store は作成しない）。検証は fail-closed。

import { createTerrainModuleRecord, validateTerrainData } from "../next/modules/terrainModule";
import type { TerrainDocument } from "../next/modules/terrainModule";
import { parseProject } from "../next/project/projectDataCore";
import type { Project } from "../next/project/schema";
import type { TerrainAsset, TerrainAssetManifest, TerrainAssetManifestEntry } from "./generation";
import { base64ToBytes } from "./sct1";
import { sha256BytesHex } from "./canonicalize";

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