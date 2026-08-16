// T-7: Terrain Save / Load / Reopen roundtrip 保証
//
// PDC（Project Data Core）レベルの roundtrip:
//   buildTerrainProject → serializeProject（JSON）→ deserializeProject → extract
//
// 注: Lane A の canonicalRoundtrip（canonicalRoundtrip.ts）は旧 ProjectModel
// （frontend/src/types.ts）を対象としており、新 PDC（frontend/src/next/project）とは
// 別モデルのため変更しない。本モジュールは PDC レベルの
// serializeProject / deserializeProject（JSON.stringify + parseProject）で roundtrip する。

import type { Project } from "../next/project/schema";
import type { TerrainDocument } from "../next/modules/terrainModule";
import { deserializeProject, serializeProject } from "../next/project/projectDataCore";
import type { TerrainAsset } from "./generation";
import {
  extractTerrainDocument as extractTerrainDocumentFromPersistence,
  persistTerrain,
  verifyTerrainAssetChecksum,
  saveTerrainElevation,
  loadTerrainElevation,
  verifyReopenedTerrain,
} from "./terrainPersistence";
import type { TerrainElevationStore } from "./terrainAssetStore";

export interface TerrainRoundtripResult {
  readonly ok: boolean;
  readonly project: Project;
  readonly terrainDocument: TerrainDocument | undefined;
  readonly documentEqual: boolean;
  readonly differences: readonly string[];
  readonly assetChecksumVerified: boolean;
  readonly issues: readonly string[];
}

export function buildTerrainProject(project: Project, terrainDocument: TerrainDocument, asset: TerrainAsset): Project {
  return persistTerrain(project, terrainDocument, asset);
}

export function extractTerrainDocument(project: Project): TerrainDocument | undefined {
  return extractTerrainDocumentFromPersistence(project);
}

export function terrainDocumentsEqual(
  expected: TerrainDocument,
  actual: TerrainDocument | undefined,
): { equal: boolean; differences: string[] } {
  const diffs: string[] = [];
  if (!actual) return { equal: false, differences: ["terrainDocument missing"] };
  if (expected.terrainId !== actual.terrainId) diffs.push("terrainId");
  if (expected.schemaVersion !== actual.schemaVersion) diffs.push("schemaVersion");
  if (expected.source.sourceType !== actual.source.sourceType) diffs.push("source.sourceType");
  if (expected.source.sourceName !== actual.source.sourceName) diffs.push("source.sourceName");
  if (expected.source.importedAt !== actual.source.importedAt) diffs.push("source.importedAt");
  if (expected.coordinateContext.coordinateSystem !== actual.coordinateContext.coordinateSystem) {
    diffs.push("coordinateContext.coordinateSystem");
  }
  if (
    expected.coordinateContext.projectOrigin.x !== actual.coordinateContext.projectOrigin.x ||
    expected.coordinateContext.projectOrigin.y !== actual.coordinateContext.projectOrigin.y ||
    expected.coordinateContext.projectOrigin.z !== actual.coordinateContext.projectOrigin.z
  ) {
    diffs.push("coordinateContext.projectOrigin");
  }
  if (expected.coordinateContext.unitSystem !== actual.coordinateContext.unitSystem) diffs.push("coordinateContext.unitSystem");
  if (expected.coordinateContext.axisConvention !== actual.coordinateContext.axisConvention) {
    diffs.push("coordinateContext.axisConvention");
  }
  const eb = expected.bounds;
  const ab = actual.bounds;
  if (eb === null || ab === null) {
    if (eb !== ab) diffs.push("bounds.null");
  } else {
    if (eb.minX !== ab.minX || eb.minY !== ab.minY || eb.maxX !== ab.maxX || eb.maxY !== ab.maxY) {
      diffs.push("bounds.xy");
    }
    if (eb.minElevation !== ab.minElevation) diffs.push("bounds.minElevation");
    if (eb.maxElevation !== ab.maxElevation) diffs.push("bounds.maxElevation");
  }
  if (expected.surfaceReference !== actual.surfaceReference) diffs.push("surfaceReference");
  if (JSON.stringify(expected.assetReferences) !== JSON.stringify(actual.assetReferences)) {
    diffs.push("assetReferences");
  }
  return { equal: diffs.length === 0, differences: diffs };
}

/**
 * save → serialize（JSON）→ deserialize → extract の全経路 roundtrip。
 * terrainDocument の全フィールド同値 + asset checksum 整合を検証する。
 */
export async function roundtrip(
  project: Project,
  terrainDocument: TerrainDocument,
  asset: TerrainAsset,
): Promise<TerrainRoundtripResult> {
  let embedded: Project;
  try {
    embedded = buildTerrainProject(project, terrainDocument, asset);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      project,
      terrainDocument: undefined,
      documentEqual: false,
      differences: [],
      assetChecksumVerified: false,
      issues: [`build failed: ${message}`],
    };
  }

  const serialized = serializeProject(embedded);
  const restored = deserializeProject(serialized);
  if (!restored.ok) {
    return {
      ok: false,
      project: embedded,
      terrainDocument: undefined,
      documentEqual: false,
      differences: [],
      assetChecksumVerified: false,
      issues: restored.issues,
    };
  }

  const extracted = extractTerrainDocument(restored.project);
  const cmp = terrainDocumentsEqual(terrainDocument, extracted);
  const verify = await verifyTerrainAssetChecksum(restored.project);

  return {
    ok: cmp.equal && verify.ok,
    project: restored.project,
    terrainDocument: extracted,
    documentEqual: cmp.equal,
    differences: cmp.differences,
    assetChecksumVerified: verify.ok,
    issues: verify.ok ? [] : [verify.reason],
  };
}

export interface StoreRoundtripResult {
  readonly ok: boolean;
  readonly project: Project;
  readonly restoredAsset: TerrainAsset | null;
  readonly checksumVerified: boolean;
  readonly issues: readonly string[];
}

/**
 * Save → Close → Reopen の実行時 roundtrip（IndexedDB store が正本）。
 *   Save:    saveTerrainElevation で標高バイナリを store へ保存
 *   Reopen:  loadTerrainElevation で store から復元 → verifyReopenedTerrain で
 *            project 内 terrainDocument の assetReference / checksum と照合
 * assetManifest（.spacerproj 同梱用直列化ビュー）は実行時正本ではないため使わない。
 */
export async function storeRoundtrip(
  store: TerrainElevationStore,
  project: Project,
  terrainDocument: TerrainDocument,
  asset: TerrainAsset,
): Promise<StoreRoundtripResult> {
  let embedded: Project;
  try {
    embedded = buildTerrainProject(project, terrainDocument, asset);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, project, restoredAsset: null, checksumVerified: false, issues: [`build failed: ${message}`] };
  }

  // Save（実行時正本 = store）
  const terrainId = terrainDocument.terrainId;
  try {
    await saveTerrainElevation(store, project.projectId, terrainId, asset);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, project: embedded, restoredAsset: null, checksumVerified: false, issues: [`save failed: ${message}`] };
  }

  // Reopen
  const restored = await loadTerrainElevation(store, project.projectId, asset.path);
  const verify = await verifyReopenedTerrain(embedded, restored);
  return {
    ok: verify.ok,
    project: embedded,
    restoredAsset: restored,
    checksumVerified: verify.ok,
    issues: verify.ok ? [] : [verify.reason],
  };
}