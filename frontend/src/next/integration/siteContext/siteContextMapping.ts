import {
  SITE_CONTEXT_WARNING_CODE_PREFIX,
  SUPPORTED_SITE_CONTEXT_EXPORT_PROFILE,
  SUPPORTED_SITE_CONTEXT_PACKAGE_FORMAT,
  SUPPORTED_SITE_CONTEXT_PACKAGE_VERSION,
  TARGET_PACKAGE_FORMAT_VERSION,
  TARGET_PDC_SCHEMA_VERSION,
  type SiteContextConversionDiagnostics,
  type SiteContextCrsImportResult,
  type SiteContextImportOptions,
  type SiteContextImportReport,
  type SiteContextTerrainImportResult,
  type SiteContextUnsupportedField,
  type SiteContextVersionInfo,
  type SiteContextWarning,
} from "./adapterContract";
import { isProjectDesignStage, type ProjectDesignStage } from "../../project/businessMetadata";
import { createEmptyProject, generateProjectId } from "../../project/projectDataCore";
import type { Project } from "../../project/schema";
import { EXISTING_CONDITIONS_SCHEMA_VERSION, isExistingConditionType, type ExistingConditionEntity, type ExistingConditionsDocument } from "../../modules/existingConditions";
import { TERRAIN_SCHEMA_VERSION, createTerrainModuleRecord, type TerrainDocument, type TerrainSourceMetadata } from "../../modules/terrainModule";
import { SiteContextPackageError, isRecord, parseJsonFileContent, resolveAssetBytes } from "./siteContextPackage";
import type { SiteContextPackageFile } from "./adapterContract";
import { isSct1Bytes, parseSct1Header, sct1ElevationRange } from "./siteContextHash";
import { classifyEpsg, isTokyoDatumEpsg, type NormalizedProjectSource, type ProjectV2Source, type SourceCoordinateContextV2, type SourceSiteTerrain } from "./siteContextSourceSchema";
import type { TerrainAssetManifestEntry } from "../../../terrain/generation";

/**
 * `.sitecontext` → SPACER Project Data Core mapping (B-4).
 *
 * Maps a normalized ProjectV2 source into the existing PDC loose slots per the
 * frozen mapping manifest (mappingManifest.ts) and field-mapping doc:
 *
 *   coordinateContexts          → metadata.siteContextCoordinateContexts
 *   projectCoordinateContextId  → metadata.siteContextProjectCoordinateContextId
 *   sourceDatasets              → metadata.siteContextSourceDatasets
 *   existingConditions          → metadata.existingConditions  (converted doc)
 *   siteContext (full payload)  → modules.terrain.data.siteContext
 *   selectionArea               → modules.terrain.data.selectionArea
 *   terrain (active)            → modules.terrain.data.terrainDocument
 *   elevationResource           → terrainDocument.surfaceReference / assetReferences
 *
 * This module is a pure mapper + validator: it never writes to any store.
 */

// ---------------------------------------------------------------------------
// Warning codes
// ---------------------------------------------------------------------------

const warn = (code: string, message: string, path?: string): SiteContextWarning => ({
  code: `${SITE_CONTEXT_WARNING_CODE_PREFIX}${code}`,
  message,
  ...(path !== undefined ? { path } : {}),
});

export const SC_WARN_STALE_TERRAIN = warn("STALE-TERRAIN", "terrain is stale");
export const SC_WARN_SOURCE_CRS_UNKNOWN = warn("SOURCE-CRS-UNKNOWN", "source dataset references an unknown CRS context");
export const SC_WARN_SOURCE_TRANSIENT = warn("SOURCE-TRANSIENT", "source dataset is transient and not carried in the package");
export const SC_WARN_SOURCE_LICENSE_PROHIBITED = warn("SOURCE-LICENSE-PROHIBITED", "source dataset license prohibits redistribution");
export const SC_WARN_SOURCE_LICENSE_UNKNOWN = warn("SOURCE-LICENSE-UNKNOWN", "source dataset redistribution license is unknown");
export const SC_WARN_SOURCE_EXCLUDED = warn("SOURCE-EXCLUDED", "source dataset was excluded from the package");
export const SC_WARN_SELECTION_MIGRATED_UNBOUND = warn("SELECTION-MIGRATED-UNBOUND", "terrain has no bound selection area (migrated-unbound)");
export const SC_WARN_AXIS_MIRROR_DEFERRED = warn("AXIS-MIRROR-DEFERRED", "terrainDocument coordinateContext declares SPACER axis convention; actual axis conversion is deferred to Lane T");
export const SC_WARN_BOUNDS_RECOMPUTED = warn("BOUNDS-RECOMPUTED", "terrainDocument bounds recomputed from grid (half-cell expansion, fixed single system)");
export const SC_WARN_NULL_Z_COERCED = warn("NULL-Z-COERCED", "existing condition point z=null coerced to 0");
export const SC_WARN_SCT1_UNREADABLE = warn("SCT1-UNREADABLE", "elevation asset is not a readable SCT1 heightfield; elevation range unavailable");
export const SC_WARN_UNKNOWN_EXISTING_TYPE = warn("UNKNOWN-EXISTING-TYPE", "existing condition has an unknown type and was skipped");

export interface MappingInput {
  readonly normalized: ProjectV2Source;
  readonly sourceSchemaVersion: string;
  readonly migratedV1ToV2: boolean;
  readonly selectionAreaMigrated: boolean;
  readonly options: SiteContextImportOptions;
  readonly packageFiles: readonly SiteContextPackageFile[];
  readonly excludedSources: readonly { readonly sourceId: string; readonly reason: string }[];
}

export interface MappingOutcome {
  readonly report: SiteContextImportReport;
  readonly project: Project;
}

// ---------------------------------------------------------------------------
// CRS
// ---------------------------------------------------------------------------

export function analyzePrimaryCrs(
  normalized: ProjectV2Source,
): { readonly crsImport: SiteContextCrsImportResult; readonly unsupported?: string } {
  const ctx = normalized.coordinateContexts.find((c) => c.id === normalized.projectCoordinateContextId);
  if (!ctx) {
    return {
      unsupported: `primary coordinate context ${normalized.projectCoordinateContextId} missing`,
      crsImport: {
        projectCoordinateContextId: normalized.projectCoordinateContextId,
        epsg: null,
        crsKind: "unknown",
        horizontalUnits: "m",
        supported: false,
      },
    };
  }
  const crs = ctx.crs;
  if (crs.kind === "known") {
    if (isTokyoDatumEpsg(crs.epsg)) {
      return {
        unsupported: `Tokyo datum EPSG:${crs.epsg} (30161-30179) is not supported`,
        crsImport: {
          projectCoordinateContextId: ctx.id,
          epsg: crs.epsg,
          crsKind: "known",
          horizontalUnits: crs.horizontalUnits,
          supported: false,
        },
      };
    }
    let cls;
    try {
      cls = classifyEpsg(crs.epsg);
    } catch {
      return {
        unsupported: `CRS-UNKNOWN-EPSG: ${crs.epsg}`,
        crsImport: {
          projectCoordinateContextId: ctx.id,
          epsg: crs.epsg,
          crsKind: "known",
          horizontalUnits: crs.horizontalUnits,
          supported: false,
        },
      };
    }
    if (cls.projection === "geographic") {
      return {
        unsupported: `project CRS EPSG:${crs.epsg} is geographic; a projected CRS is required`,
        crsImport: {
          projectCoordinateContextId: ctx.id,
          epsg: crs.epsg,
          crsKind: "known",
          horizontalUnits: crs.horizontalUnits,
          supported: false,
        },
      };
    }
    return {
      crsImport: {
        projectCoordinateContextId: ctx.id,
        epsg: crs.epsg,
        crsKind: "known",
        horizontalUnits: "m",
        supported: true,
      },
    };
  }
  if (crs.kind === "local") {
    return {
      crsImport: {
        projectCoordinateContextId: ctx.id,
        epsg: null,
        crsKind: "local",
        horizontalUnits: "m",
        supported: true,
      },
    };
  }
  return {
    unsupported: "project CRS kind is unknown (I-03: canonical CRS must be projected|local)",
    crsImport: {
      projectCoordinateContextId: ctx.id,
      epsg: null,
      crsKind: "unknown",
      horizontalUnits: "m",
      supported: false,
    },
  };
}

export function countUnknownSourceCrs(normalized: ProjectV2Source): number {
  const ctxById = new Map(normalized.coordinateContexts.map((c) => [c.id, c]));
  return normalized.siteContext.sourceDatasets.filter((s) => {
    const ctx = ctxById.get(s.coordinateContextId);
    return ctx ? ctx.crs.kind === "unknown" : false;
  }).length;
}

// ---------------------------------------------------------------------------
// Terrain
// ---------------------------------------------------------------------------

/** Fixed single bounds system (B-4): grid half-cell expansion, same formula as the source V1→V2 migration. */
export function deriveGridBounds(grid: { readonly originX: number; readonly originY: number; readonly cellSize: number; readonly width: number; readonly height: number }): {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
} {
  return {
    minX: grid.originX - grid.cellSize / 2,
    minY: grid.originY - grid.cellSize / 2,
    maxX: grid.originX + (grid.width - 1) * grid.cellSize + grid.cellSize / 2,
    maxY: grid.originY + (grid.height - 1) * grid.cellSize + grid.cellSize / 2,
  };
}

function deriveSourceType(terrain: SourceSiteTerrain, normalized: ProjectV2Source): TerrainSourceMetadata["sourceType"] {
  if (terrain.sourceDatasetIds.length === 0) return "none";
  const srcs = normalized.siteContext.sourceDatasets.filter((s) => terrain.sourceDatasetIds.includes(s.sourceDatasetId));
  const rank: Record<string, number> = { dem: 4, geotiff: 3, xyz: 2, csv: 1 };
  const sourceTypes = srcs.map((s) => {
    if (s.sourceType === "dem") return "dem";
    const legacy = s.legacyKind ?? "";
    if (legacy.includes("xyz")) return "xyz";
    if (legacy.includes("csv")) return "csv";
    if (legacy.includes("geotiff")) return "geotiff";
    if (s.sourceType === "survey") return "xyz";
    return "dem";
  });
  if (sourceTypes.length === 0) return "none";
  sourceTypes.sort((a, b) => (rank[a] ?? 0) - (rank[b] ?? 0));
  const best = sourceTypes[sourceTypes.length - 1] as TerrainSourceMetadata["sourceType"];
  return best;
}

export interface TerrainMappingResult {
  readonly terrainDocument: TerrainDocument | undefined;
  /** 実行時正本 seed（G-2）: active terrain の elevation base64 を assetManifest へ埋め込む。 */
  readonly terrainAsset: TerrainAssetManifestEntry | undefined;
  readonly terrainImport: SiteContextTerrainImportResult;
  readonly warnings: readonly SiteContextWarning[];
  readonly unsupportedFields: readonly SiteContextUnsupportedField[];
}

/**
 * Build the TerrainDocument for the active terrain and verify its elevation
 * asset (missing → INVALID-TERRAIN-REF, checksum → CORRUPT-SOURCE via
 * resolveAssetBytes). sct1Count / checksumVerifiedCount / missingAssetCount
 * are reported per the adapter contract.
 */
export function mapTerrain(
  normalized: ProjectV2Source,
  packageFiles: readonly SiteContextPackageFile[],
): TerrainMappingResult {
  const warnings: SiteContextWarning[] = [];
  const unsupportedFields: SiteContextUnsupportedField[] = [];
  const terrains = normalized.siteContext.terrain;
  const activeId = normalized.siteContext.activeTerrainId;
  const active = activeId != null ? terrains.find((t) => t.terrainId === activeId) : undefined;

  let sct1Count = 0;
  let missingAssetCount = 0;
  let checksumVerifiedCount = 0;

  for (const [i, t] of terrains.entries()) {
    if (t.status === "stale") {
      warnings.push({
        ...SC_WARN_STALE_TERRAIN,
        message: `terrain ${t.terrainId} is stale`,
        path: `siteContext.terrain[${i}].status`,
      });
    }
    if (t.selectionAreaId === "migrated-unbound") {
      warnings.push({
        ...SC_WARN_SELECTION_MIGRATED_UNBOUND,
        path: `siteContext.terrain[${i}].selectionAreaId`,
      });
    }
    if (t.meshResource) {
      unsupportedFields.push({
        path: `siteContext.terrain[${i}].meshResource`,
        reason: "deferred",
        notes: "SPACER terrain module has no meshResource slot; deferred until Lane T adds a mesh asset slot",
      });
    }
    try {
      resolveAssetBytes(packageFiles, t.elevationResource, { encoding: "base64" });
      checksumVerifiedCount += 1;
      const bytes = resolveAssetBytes(packageFiles, t.elevationResource, { encoding: "base64" }).bytes;
      if (isSct1Bytes(bytes)) sct1Count += 1;
    } catch (err) {
      if (err instanceof SiteContextPackageError && err.errorCode === "SC-ERR-INVALID-TERRAIN-REF") {
        missingAssetCount += 1;
      }
      throw err;
    }
  }

  let terrainDocument: TerrainDocument | undefined;
  let terrainAsset: TerrainAssetManifestEntry | undefined;
  if (active) {
    const resolved = resolveAssetBytes(packageFiles, active.elevationResource, { encoding: "base64" });
    const bytes = resolved.bytes;
    // G-2: active elevation の base64 を manifest entry として返す。package 内
    // elevation は base64 文字列で同梱される（field-mapping §3.9）。binary 形式の
    // package では base64 へ再エンコードして正本 seed を成立させる。
    const base64 =
      typeof resolved.file.content === "string"
        ? resolved.file.content
        : bytesToBase64(bytes);
    terrainAsset = {
      path: active.elevationResource.path,
      checksum: active.elevationResource.checksum,
      size: active.elevationResource.size,
      base64,
    };
    const gridBounds = deriveGridBounds(active.grid);
    const sourceBounds = active.bounds;
    if (
      sourceBounds.minX !== gridBounds.minX ||
      sourceBounds.minY !== gridBounds.minY ||
      sourceBounds.maxX !== gridBounds.maxX ||
      sourceBounds.maxY !== gridBounds.maxY
    ) {
      warnings.push({
        ...SC_WARN_BOUNDS_RECOMPUTED,
        message: `terrain ${active.terrainId} bounds recomputed from grid (half-cell expansion)`,
        path: `siteContext.terrain[].bounds`,
      });
    }
    let minElevation: number | null = null;
    let maxElevation: number | null = null;
    if (isSct1Bytes(bytes)) {
      try {
        const header = parseSct1Header(bytes);
        const range = sct1ElevationRange(bytes, header);
        if (range) {
          minElevation = range.minElevation;
          maxElevation = range.maxElevation;
        }
      } catch {
        warnings.push({
          ...SC_WARN_SCT1_UNREADABLE,
          path: `terrainDocument.surfaceReference`,
        });
      }
    }
    const primary = normalized.coordinateContexts.find((c) => c.id === normalized.projectCoordinateContextId);
    terrainDocument = {
      terrainId: active.terrainId,
      schemaVersion: TERRAIN_SCHEMA_VERSION,
      source: {
        sourceType: deriveSourceType(active, normalized),
        sourceName: active.name,
        importedAt: active.updatedAt,
      },
      coordinateContext: {
        coordinateSystem: "project",
        projectOrigin: primary ? { ...primary.origin } : { x: 0, y: 0, z: 0 },
        localOrigin: null,
        unitSystem: "metric",
        axisConvention: "x-along/y-transverse/z-up",
      },
      bounds:
        minElevation !== null && maxElevation !== null
          ? { ...gridBounds, minElevation, maxElevation }
          : null,
      surfaceReference: active.elevationResource.path,
      assetReferences: [active.elevationResource.path],
    };
    warnings.push({
      ...SC_WARN_AXIS_MIRROR_DEFERRED,
      message: `terrain ${active.terrainId} mirror declares SPACER axis convention; coordinates are not rewritten`,
      path: "modules.terrain.data.terrainDocument.coordinateContext.axisConvention",
    });
  }

  return {
    terrainDocument,
    terrainAsset,
    terrainImport: {
      terrainCount: terrains.length,
      importedTerrainIds: terrainDocument ? [terrainDocument.terrainId] : [],
      sct1Count,
      missingAssetCount,
      checksumVerifiedCount,
    },
    warnings,
    unsupportedFields,
  };
}

// ---------------------------------------------------------------------------
// Existing conditions
// ---------------------------------------------------------------------------

export interface ExistingConditionsMappingResult {
  readonly document: ExistingConditionsDocument;
  readonly warnings: readonly SiteContextWarning[];
  readonly unsupportedFields: readonly SiteContextUnsupportedField[];
}

/**
 * Convert V2 existingConditions (inline entities or {id, assetRef} refs) into
 * the SPACER ExistingConditionsDocument. V1 refs are resolved through their
 * asset JSON after checksum verification (fail-closed); a missing ref asset
 * → SC-ERR-INVALID-TERRAIN-REF, a checksum mismatch → SC-ERR-CORRUPT-SOURCE.
 */
export function mapExistingConditions(
  normalized: ProjectV2Source,
  packageFiles: readonly SiteContextPackageFile[],
): ExistingConditionsMappingResult {
  const warnings: SiteContextWarning[] = [];
  const unsupportedFields: SiteContextUnsupportedField[] = [];
  const entities: ExistingConditionEntity[] = [];

  const conditions = normalized.existingConditions as readonly unknown[];

  for (const [i, rawCondition] of conditions.entries()) {
    if (!isRecord(rawCondition)) {
      warnings.push({
        ...SC_WARN_UNKNOWN_EXISTING_TYPE,
        message: `existingConditions[${i}] is not an object; skipped`,
        path: `existingConditions[${i}]`,
      });
      continue;
    }
    const rec = rawCondition as Record<string, unknown>;
    const isRef = isRecord(rec.assetRef) && typeof rec.id === "string" && rec.type === undefined && rec.geometry === undefined;
    let entityRaw: Record<string, unknown>;
    if (isRef) {
      const assetRef = rec.assetRef as { path: string; checksum: string; size: number };
      const resolved = resolveAssetBytes(packageFiles, assetRef, {
        errorCode: "SC-ERR-INVALID-TERRAIN-REF",
        encoding: "utf8",
      });
      const parsed = parseJsonFileContent(resolved.file);
      if (!isRecord(parsed)) {
        throw new SiteContextPackageError("SC-ERR-CORRUPT-SOURCE", `existing condition asset is not an object: ${assetRef.path}`);
      }
      entityRaw = parsed;
    } else {
      entityRaw = rec;
    }

    const geometry = entityRaw.geometry;
    if (isRecord(geometry) && geometry.kind === "meshRef") {
      unsupportedFields.push({
        path: `existingConditions[${i}].geometry.meshRef`,
        reason: "deferred",
        notes: "SPACER ExistingConditionGeometry has no meshRef kind; mesh asset reference is deferred",
      });
      continue;
    }

    const type = entityRaw.type;
    if (!isExistingConditionType(type)) {
      warnings.push({
        ...SC_WARN_UNKNOWN_EXISTING_TYPE,
        message: `existingConditions[${i}] has unknown type ${String(type)}; skipped`,
        path: `existingConditions[${i}].type`,
      });
      continue;
    }
    const entityId = typeof entityRaw.id === "string" && entityRaw.id.length > 0 ? entityRaw.id : String(entityRaw.entityId ?? `existing-${i}`);
    const label = typeof entityRaw.label === "string" ? entityRaw.label : String(entityRaw.label ?? "");
    const layer = entityRaw.layer === "underground" || entityRaw.layer === "water" ? entityRaw.layer : "surface";
    const coordinateContextId =
      typeof entityRaw.coordinateContextId === "string" && entityRaw.coordinateContextId.length > 0
        ? entityRaw.coordinateContextId
        : normalized.projectCoordinateContextId;

    const kind = isRecord(geometry) && typeof geometry.kind === "string" ? geometry.kind : "line";
    const pointsRaw = isRecord(geometry) && Array.isArray(geometry.points) ? geometry.points : [];
    const points = pointsRaw.map((p) => {
      const pt = isRecord(p) ? p : { x: 0, y: 0, z: 0 };
      const x = typeof pt.x === "number" ? pt.x : 0;
      const y = typeof pt.y === "number" ? pt.y : 0;
      if (typeof pt.z !== "number") {
        warnings.push({
          ...SC_WARN_NULL_Z_COERCED,
          path: `existingConditions[${i}].geometry.points`,
        });
      }
      const z = typeof pt.z === "number" ? pt.z : 0;
      return { x, y, z };
    });

    const metadata: Record<string, unknown> = {
      ...(isRecord(entityRaw.metadata) ? entityRaw.metadata : {}),
      ...(isRecord(entityRaw.quality) ? { quality: entityRaw.quality } : {}),
    };
    const diameter = isRecord(geometry) && typeof geometry.diameter === "number" ? geometry.diameter : undefined;

    entities.push({
      entityId,
      type,
      label,
      geometry: {
        kind: kind as ExistingConditionEntity["geometry"]["kind"],
        points,
        ...(diameter !== undefined ? { diameter } : {}),
      },
      coordinateContextId,
      metadata,
      visibility: true,
      layer,
      styleReference: typeof entityRaw.styleRef === "string" ? entityRaw.styleRef : null,
      sourceReference: typeof entityRaw.sourceId === "string" ? entityRaw.sourceId : null,
    });
  }

  return {
    document: { schemaVersion: EXISTING_CONDITIONS_SCHEMA_VERSION, entities },
    warnings,
    unsupportedFields,
  };
}

// ---------------------------------------------------------------------------
// Metadata / project assembly
// ---------------------------------------------------------------------------

function mapDesignStage(value: string | undefined): { designStage: ProjectDesignStage; customLabel?: string } {
  if (value === undefined) return { designStage: "other" };
  if (isProjectDesignStage(value)) return { designStage: value };
  return { designStage: "other", customLabel: value };
}

function mapExcludedSources(normalized: ProjectV2Source): { sourceId: string; reason: string }[] {
  const excluded: { sourceId: string; reason: string }[] = [];
  for (const s of normalized.siteContext.sourceDatasets) {
    if (s.license.redistributeOk === "prohibited") {
      excluded.push({ sourceId: s.sourceDatasetId, reason: "license-prohibited" });
    } else if (s.license.redistributeOk === "unknown") {
      excluded.push({ sourceId: s.sourceDatasetId, reason: "license-unknown" });
    } else if (s.location.mode === "external") {
      excluded.push({ sourceId: s.sourceDatasetId, reason: "external" });
    }
  }
  return excluded;
}

function collectSourceWarnings(normalized: ProjectV2Source): SiteContextWarning[] {
  const warnings: SiteContextWarning[] = [];
  const ctxById = new Map(normalized.coordinateContexts.map((c) => [c.id, c]));
  normalized.siteContext.sourceDatasets.forEach((s, i) => {
    const ctx = ctxById.get(s.coordinateContextId);
    if (ctx && ctx.crs.kind === "unknown") {
      warnings.push({
        ...SC_WARN_SOURCE_CRS_UNKNOWN,
        message: `source dataset ${s.sourceDatasetId} references unknown CRS context ${s.coordinateContextId}`,
        path: `siteContext.sourceDatasets[${i}].coordinateContextId`,
      });
    }
    if (s.location.mode === "transient") {
      warnings.push({
        ...SC_WARN_SOURCE_TRANSIENT,
        message: `source dataset ${s.sourceDatasetId} is transient and not carried in the package`,
        path: `siteContext.sourceDatasets[${i}].location`,
      });
    }
    if (s.license.redistributeOk === "prohibited") {
      warnings.push({
        ...SC_WARN_SOURCE_LICENSE_PROHIBITED,
        message: `source dataset ${s.sourceDatasetId} license prohibits redistribution`,
        path: `siteContext.sourceDatasets[${i}].license`,
      });
    } else if (s.license.redistributeOk === "unknown") {
      warnings.push({
        ...SC_WARN_SOURCE_LICENSE_UNKNOWN,
        message: `source dataset ${s.sourceDatasetId} redistribution license is unknown`,
        path: `siteContext.sourceDatasets[${i}].license`,
      });
    } else if (s.location.mode === "external") {
      warnings.push({
        ...SC_WARN_SOURCE_EXCLUDED,
        message: `source dataset ${s.sourceDatasetId} is external and not carried in the package`,
        path: `siteContext.sourceDatasets[${i}].location`,
      });
    }
  });
  return warnings;
}

export function buildMappingOutcome(input: MappingInput): MappingOutcome {
  const { normalized, sourceSchemaVersion, migratedV1ToV2, selectionAreaMigrated, options, packageFiles } = input;
  const warnings: SiteContextWarning[] = [];
  const unsupportedFields: SiteContextUnsupportedField[] = [];

  const crs = analyzePrimaryCrs(normalized);
  const terrain = mapTerrain(normalized, packageFiles);
  const existing = mapExistingConditions(normalized, packageFiles);
  warnings.push(...terrain.warnings, ...existing.warnings, ...collectSourceWarnings(normalized));
  unsupportedFields.push(...terrain.unsupportedFields, ...existing.unsupportedFields);

  const layerMappings = normalized.layerMappings;
  if (Array.isArray(layerMappings) && layerMappings.length > 0) {
    unsupportedFields.push({
      path: "layerMappings",
      reason: "deferred",
      notes: "ProjectV2 layer mapping concept has no SPACER module; stored at metadata.siteContextLayerMappings for future UI use",
    });
  }
  const settings = normalized.settings;
  if (isRecord(settings) && Object.keys(settings).length > 0) {
    unsupportedFields.push({
      path: "settings",
      reason: "deferred",
      notes: "ProjectV2 app settings are a different concept from SPACER UI state; stored at metadata.siteContextSettings",
    });
  }

  const projectName = options.targetProjectName ?? normalized.project.name;
  const base = createEmptyProject(projectName);
  const targetProjectId = options.asNew ? generateProjectId() : normalized.project.projectId;
  const now = new Date().toISOString();
  const createdAt = options.asNew ? now : normalized.project.createdAt;
  const updatedAt = options.asNew ? now : normalized.project.updatedAt;

  const metadata: Record<string, unknown> = {
    siteContextCoordinateContexts: structuredClone(normalized.coordinateContexts),
    siteContextProjectCoordinateContextId: normalized.projectCoordinateContextId,
    siteContextSourceDatasets: structuredClone(normalized.siteContext.sourceDatasets),
    existingConditions: existing.document,
  };
  if (normalized.project.businessNumber !== undefined) {
    metadata.businessNumber = normalized.project.businessNumber;
  }
  if (normalized.project.designStage !== undefined) {
    const ds = mapDesignStage(normalized.project.designStage);
    metadata.designStage = ds.designStage;
    if (ds.customLabel !== undefined) {
      metadata.designStageCustomLabel = ds.customLabel;
    }
  }
  if (normalized.project.externalIdentifiers !== undefined) {
    metadata.siteContextExternalIdentifiers = structuredClone(normalized.project.externalIdentifiers);
  }
  if (Array.isArray(layerMappings) && layerMappings.length > 0) {
    metadata.siteContextLayerMappings = structuredClone(layerMappings);
  }
  if (isRecord(settings) && Object.keys(settings).length > 0) {
    metadata.siteContextSettings = structuredClone(settings);
  }

  const terrainRecord = createTerrainModuleRecord();
  terrainRecord.data.siteContext = structuredClone(normalized.siteContext);
  if (normalized.siteContext.selectionArea !== null) {
    terrainRecord.data.selectionArea = structuredClone(normalized.siteContext.selectionArea);
  }
  if (terrain.terrainDocument !== undefined) {
    terrainRecord.data.terrainDocument = structuredClone(terrain.terrainDocument);
  }
  // G-2: elevation の実行時正本 seed。package 内 elevation バイナリを
  // assetManifest（base64 + checksum + size）として project へ埋め込み、
  // Save → Close → Reopen で地形が復元されることを保証する。
  if (terrain.terrainAsset !== undefined) {
    terrainRecord.data.assetManifest = {
      [terrain.terrainAsset.path]: structuredClone(terrain.terrainAsset),
    };
  }

  const project: Project = {
    ...base,
    projectId: targetProjectId,
    name: projectName,
    createdAt,
    updatedAt,
    metadata,
    modules: {
      ...base.modules,
      terrain: terrainRecord as unknown as Record<string, unknown>,
    },
  };

  const excludedSources = input.excludedSources.length > 0 ? input.excludedSources : mapExcludedSources(normalized);

  const diagnostics: SiteContextConversionDiagnostics = {
    migratedV1ToV2,
    selectionAreaMigrated,
    sourceCrsUnknownCount: countUnknownSourceCrs(normalized),
    staleTerrainCount: normalized.siteContext.terrain.filter((t) => t.status === "stale").length,
    excludedSources,
  };

  const version: SiteContextVersionInfo = {
    packageFormat: SUPPORTED_SITE_CONTEXT_PACKAGE_FORMAT,
    packageVersion: SUPPORTED_SITE_CONTEXT_PACKAGE_VERSION,
    exportProfile: SUPPORTED_SITE_CONTEXT_EXPORT_PROFILE,
    sourceSchemaVersion,
    targetSchemaVersion: TARGET_PDC_SCHEMA_VERSION,
    targetPackageFormatVersion: TARGET_PACKAGE_FORMAT_VERSION,
  };

  const report: SiteContextImportReport = {
    projectId: targetProjectId,
    projectName,
    schemaVersion: TARGET_PDC_SCHEMA_VERSION,
    sourceSchemaVersion,
    warnings,
    unsupportedFields,
    diagnostics,
    crsImport: crs.crsImport,
    terrainImport: terrain.terrainImport,
    version,
  };

  return { report, project };
}

/** Returns a minimal report when import fails before the source is mapped. */
export function buildSkeletonReport(
  input: { readonly sourceSchemaVersion: string; readonly options?: SiteContextImportOptions },
  project: { readonly projectId: string; readonly name: string },
): SiteContextImportReport {
  const version: SiteContextVersionInfo = {
    packageFormat: SUPPORTED_SITE_CONTEXT_PACKAGE_FORMAT,
    packageVersion: SUPPORTED_SITE_CONTEXT_PACKAGE_VERSION,
    exportProfile: SUPPORTED_SITE_CONTEXT_EXPORT_PROFILE,
    sourceSchemaVersion: input.sourceSchemaVersion,
    targetSchemaVersion: TARGET_PDC_SCHEMA_VERSION,
    targetPackageFormatVersion: TARGET_PACKAGE_FORMAT_VERSION,
  };
  return {
    projectId: project.projectId,
    projectName: project.name,
    schemaVersion: TARGET_PDC_SCHEMA_VERSION,
    sourceSchemaVersion: input.sourceSchemaVersion,
    warnings: [],
    unsupportedFields: [],
    diagnostics: {
      migratedV1ToV2: false,
      selectionAreaMigrated: false,
      sourceCrsUnknownCount: 0,
      staleTerrainCount: 0,
      excludedSources: [],
    },
    crsImport: {
      projectCoordinateContextId: "",
      epsg: null,
      crsKind: "unknown",
      horizontalUnits: "m",
      supported: false,
    },
    terrainImport: {
      terrainCount: 0,
      importedTerrainIds: [],
      sct1Count: 0,
      missingAssetCount: 0,
      checksumVerifiedCount: 0,
    },
    version,
  };
}

export function derivePrimaryContextOrigin(normalized: NormalizedProjectSource): SourceCoordinateContextV2["origin"] | undefined {
  const ctx = normalized.coordinateContexts.find((c) => c.id === normalized.projectCoordinateContextId);
  return ctx ? { ...ctx.origin } : undefined;
}

/** bytes → base64（node / browser 共通・純実装）。 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
