/**
 * F-2: Unified Save / Load / Migration — 正規 Project lifecycle 経路。
 *
 * 正規経路 (canonical):
 *   Project data
 *     → serializeProject (official zod Schema validation, fail-closed)
 *     → JSON (package/write)
 *     → close
 *     → reopen/read
 *     → migrateProject (schemaVersion detection + future fail-closed)
 *     → official Schema validation (parseProject)
 *     → hydrate → modules 復元
 *
 * This module is the single canonical entry for PDC Save/Load/Migration and is
 * wired into the filesystem persistence load path. Legacy ProjectModel
 * (frontend/src/types.ts) stays on the legacy canonical path (compatibility /
 * migration); this module handles the PDC `Project` model.
 */

import {
  deserializeProject,
  migrateProject,
  parseProject,
  serializeProject,
  getCurrentProjectSchemaVersion,
} from "../project/projectDataCore";
import type { Project } from "../project/schema";
import {
  extractTerrainAsset,
  extractTerrainDocument,
  loadTerrainElevation,
  verifyTerrainAssetChecksum,
  verifyReopenedTerrain,
} from "../../terrain/terrainPersistence";
import type { TerrainElevationStore } from "../../terrain/terrainAssetStore";

export type UnifiedSaveResult =
  | { ok: true; json: string; project: Project }
  | { ok: false; issues: string[] };

export type UnifiedLoadResult =
  | { ok: true; project: Project }
  | { ok: false; issues: string[] };

export type UnifiedReopenResult =
  | { ok: true; project: Project; terrainVerified: boolean }
  | { ok: false; issues: string[] };

/**
 * Detect the persisted schemaVersion from a parsed JSON object.
 * Missing / non-string → treated as unsupported (fail-closed).
 */
function detectSchemaVersion(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const version = (raw as Record<string, unknown>).schemaVersion;
  return typeof version === "string" ? version : undefined;
}

/**
 * G-3: Legacy ProjectModel format detection.
 *
 * The legacy ProjectModel (`frontend/src/types.ts`) uses a *numeric*
 * `schemaVersion` (v1) and carries the FEM bridge shape (`project`,
 * `nodes`, `materials`, ...). The PDC `Project` uses a string semver and
 * module slots. When a legacy JSON reaches the PDC canonical load path we do
 * not silently fail with a generic message: we return an explicit diagnostic
 * pointing to the legacy/compatibility path so migration is unambiguous.
 */
export function isLegacyProjectModelJson(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const record = raw as Record<string, unknown>;
  const version = record.schemaVersion;
  if (typeof version === "number") {
    return true;
  }
  // schemaVersion 欠落 + legacy 特有のトップレベルキー (project/nodes/members 等) を
  // 持つ入力は legacy 形式の可能性が高い。PDC 形式は schemaVersion を必須とするため、
  // ここでは「legacy 候補」として診断を返す (fail-closed は維持)。
  return (
    version === undefined &&
    isRecordLike(record.project) &&
    Array.isArray(record.nodes) &&
    Array.isArray(record.members)
  );
}

function isRecordLike(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Save: serialize → official Schema validation (parseProject) → JSON.
 * Invalid projects are rejected (fail-closed); nothing is written.
 */
export function saveUnifiedProject(project: Project): UnifiedSaveResult {
  const parsed = parseProject(project);
  if (!parsed.ok) {
    return { ok: false, issues: parsed.issues };
  }
  try {
    const json = serializeProject(parsed.project);
    return { ok: true, json, project: parsed.project };
  } catch (error) {
    return { ok: false, issues: [error instanceof Error ? error.message : String(error)] };
  }
}

/**
 * Load (reopen/read): JSON.parse → schemaVersion detection → migrateProject
 * (future fail-closed) → official Schema validation → hydrate.
 */
export function loadUnifiedProject(json: string): UnifiedLoadResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, issues: ["input is not valid JSON"] };
  }
  const version = detectSchemaVersion(raw);
  if (version === undefined) {
    if (isLegacyProjectModelJson(raw)) {
      return {
        ok: false,
        issues: [
          "legacy ProjectModel format detected — load via the legacy /pro compatibility path " +
            "(validateLoadedProjectJsonBeforeHydrate). PDC unified load requires the current " +
            "canonical Project format (string semver schemaVersion).",
        ],
      };
    }
    return { ok: false, issues: ["schemaVersion missing or invalid"] };
  }
  const migrated = migrateProject(raw, version);
  if (!migrated.ok) {
    return { ok: false, issues: migrated.issues };
  }
  return { ok: true, project: migrated.project };
}

/**
 * Load + migrate + validate + hydrate, then verify terrain integrity when the
 * project carries a terrain document.
 *
 * - No terrain document → terrainVerified = true (nothing to verify).
 * - Terrain present + assetManifest → checksum/surfaceReference/assetReferences
 *   verification via verifyTerrainAssetChecksum (fail-closed).
 * - When a runtime elevation store is provided (test-only seam; G-2 retired
 *   IndexedDB as runtime source of truth), the reopened terrain is additionally
 *   cross-checked against the store. Production never passes a store — the
 *   project assetManifest is the single source of truth.
 */
export async function reopenUnifiedProject(
  json: string,
  store?: TerrainElevationStore,
): Promise<UnifiedReopenResult> {
  const loaded = loadUnifiedProject(json);
  if (!loaded.ok) {
    return { ok: false, issues: loaded.issues };
  }
  const project = loaded.project;

  const terrainDocument = extractTerrainDocument(project);
  if (terrainDocument === undefined) {
    // No terrain → nothing to verify.
    return { ok: true, project, terrainVerified: true };
  }
  const manifestAsset = extractTerrainAsset(project);
  if (manifestAsset === undefined) {
    // terrainDocument は存在するが asset manifest が欠落 → fail-closed。
    return { ok: false, issues: ["terrain-verification: asset manifest missing"] };
  }

  const checksum = await verifyTerrainAssetChecksum(project);
  if (!checksum.ok) {
    return { ok: false, issues: [`terrain-verification: ${checksum.reason}`] };
  }

  if (store !== undefined) {
    const restored = await loadTerrainElevation(store, project.projectId, checksum.asset.path);
    const verified = await verifyReopenedTerrain(project, restored);
    if (!verified.ok) {
      return { ok: false, issues: [`terrain-reopen: ${verified.reason}`] };
    }
  }

  return { ok: true, project, terrainVerified: true };
}

/**
 * Roundtrip helper: save (serialize → validate → JSON) then immediately
 * load/migrate/validate/hydrate. Used to assert that the canonical path is
 * lossless for the complete project.
 */
export function roundtripUnifiedProject(project: Project): UnifiedLoadResult {
  const saved = saveUnifiedProject(project);
  if (!saved.ok) {
    return { ok: false, issues: saved.issues };
  }
  return loadUnifiedProject(saved.json);
}
