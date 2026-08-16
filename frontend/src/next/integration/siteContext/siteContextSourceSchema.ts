import { z } from "zod";
import { canonicalHash } from "./siteContextHash";

/**
 * Faithful port of the site-context-prototype source schemas (ProjectV1 /
 * ProjectV2), V1→V2 migration, and ProjectV2 invariant validation.
 *
 * Source of truth (READ-ONLY reference): site-context-prototype
 *   - packages/core/src/schema/project.ts      (V1)
 *   - packages/core/src/schema/projectV2.ts    (V2 + migration + invariants)
 *   - packages/core/src/schema/selection.ts    (SelectionArea)
 *   - packages/core/src/coordinate/epsgClassifier.ts
 *
 * Wave 1 contract: `.sitecontext` schemaVersion ∈ {1,2} is accepted; V1 is
 * normalized to V2 with the site-context canonical migration before import.
 */

// ---------------------------------------------------------------------------
// EPSG classification (ported from epsgClassifier.ts) + Tokyo datum range
// ---------------------------------------------------------------------------

export const EPSG_CLASSIFIER_VERSION = "1";

export type CrsProjection = "projected" | "geographic";

const GEOGRAPHIC_EPSG = new Set<number>([4326, 6668, 4269, 4612]);

/** JGD2000 平面直角 (6669-6687) は連番 */
export function isPlaneRectangular(epsg: number): boolean {
  return epsg >= 6669 && epsg <= 6687;
}

/** 東京測地系 平面直角 (30161-30179) — unsupported（data-contract §3.2） */
export function isTokyoDatumEpsg(epsg: number): boolean {
  return epsg >= 30161 && epsg <= 30179;
}

export function classifyCrs(epsg: number): CrsProjection {
  if (GEOGRAPHIC_EPSG.has(epsg)) return "geographic";
  if (isPlaneRectangular(epsg)) return "projected";
  throw new Error(`CRS-UNKNOWN-EPSG: ${epsg}`);
}

export interface ClassifiedCrs {
  epsg: number;
  projection: CrsProjection;
  horizontalUnits: "m" | "degree";
}

export function classifyEpsg(epsg: number): ClassifiedCrs {
  const projection = classifyCrs(epsg);
  return {
    epsg,
    projection,
    horizontalUnits: projection === "geographic" ? "degree" : "m",
  };
}

// ---------------------------------------------------------------------------
// Shared V1 shape (project.ts)
// ---------------------------------------------------------------------------

export const point3Schema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite().nullable(),
});
export type SourcePoint3 = z.infer<typeof point3Schema>;

export const boundsSchema = z.object({
  minX: z.number().finite(),
  minY: z.number().finite(),
  maxX: z.number().finite(),
  maxY: z.number().finite(),
});
export type SourceBounds = z.infer<typeof boundsSchema>;

export const crsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("known"), epsg: z.number().int().positive(), name: z.string() }),
  z.object({ kind: z.literal("local"), description: z.string() }),
  z.object({ kind: z.literal("unknown"), description: z.string().optional() }),
]);
export type SourceCrsV1 = z.infer<typeof crsSchema>;

export const coordinateContextV1Schema = z.object({
  id: z.string().min(1),
  crs: crsSchema,
  verticalDatum: z.enum(["tp", "ellipsoid", "local", "unknown"]),
  units: z.literal("m"),
  origin: z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() }),
  epoch: z.string().optional(),
  heightEpoch: z.string().optional(),
  geoidModel: z.string().optional(),
  transformResidualM: z.number().nonnegative().optional(),
});
export type SourceCoordinateContextV1 = z.infer<typeof coordinateContextV1Schema>;

export const assetReferenceSchema = z.object({
  path: z.string().min(1),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  size: z.number().int().nonnegative(),
});
export type SourceAssetReference = z.infer<typeof assetReferenceSchema>;

export const gridSpecSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  cellSize: z.number().positive(),
  originX: z.number().finite(),
  originY: z.number().finite(),
  rowMajor: z.literal(true).default(true),
});
export type SourceGridSpec = z.infer<typeof gridSpecSchema>;

export const existingConditionRefSchema = z.object({
  id: z.string().min(1),
  assetRef: assetReferenceSchema,
});
export type SourceExistingConditionRef = z.infer<typeof existingConditionRefSchema>;

export const sourceRecordSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["gsi-dem", "gsi-basemap", "gsi-photo", "xyz", "csv", "geotiff", "dxf2d", "dxf3d", "other"]),
  location: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("copied"), assetRef: assetReferenceSchema }),
    z.object({ mode: z.literal("copiedMulti"), sourceRefs: z.array(assetReferenceSchema).min(1) }),
    z.object({
      mode: z.literal("external"),
      externalRef: z.object({ path: z.string(), size: z.number().nonnegative(), mtime: z.string(), fingerprint: z.string() }),
    }),
    z.object({ mode: z.literal("transient"), reason: z.string() }),
  ]),
  acquiredAt: z.string(),
  provider: z.string().optional(),
  url: z.string().optional(),
  license: z.object({
    attribution: z.string(),
    conditions: z.string(),
    offlineOk: z.enum(["allowed", "prohibited", "unknown"]),
    redistributeOk: z.enum(["allowed", "prohibited", "unknown"]),
  }),
  cachePolicy: z.enum(["cache-allowed", "no-cache"]).default("no-cache"),
  coordinateContextId: z.string().optional(),
  quality: z
    .object({
      verticalM: z.number().nonnegative().optional(),
      horizontalM: z.number().nonnegative().optional(),
      method: z.string(),
      interpolation: z.string().optional(),
    })
    .optional(),
  rawMetadata: z.record(z.string(), z.unknown()).optional(),
  gsiMeta: z.record(z.string(), z.unknown()).optional(),
});
export type SourceRecordV1 = z.infer<typeof sourceRecordSchema>;

export const terrainDocumentV1Schema = z.object({
  id: z.string().min(1),
  name: z.string(),
  grid: gridSpecSchema,
  bounds: boundsSchema,
  noDataValue: z.number().finite(),
  coordinateContextId: z.string().min(1),
  sourceIds: z.array(z.string()).default([]),
  inputHashes: z.array(z.string()).default([]),
  quality: z.object({
    verticalM: z.number().nonnegative().optional(),
    horizontalM: z.number().nonnegative().optional(),
    method: z.string(),
    interpolation: z.string().optional(),
  }),
  generationRecipe: z.object({
    algorithm: z.string(),
    algorithmVersion: z.string(),
    options: z.record(z.string(), z.unknown()),
  }),
  stale: z
    .object({
      isStale: z.boolean().default(false),
      reason: z.string().optional(),
      regeneratedAgainst: z.string().optional(),
    })
    .default({ isStale: false }),
  createdAt: z.string(),
  updatedAt: z.string(),
  assetRef: assetReferenceSchema,
});
export type SourceTerrainDocumentV1 = z.infer<typeof terrainDocumentV1Schema>;

export const projectV1Schema = z.object({
  schemaVersion: z.literal("1"),
  dataVersion: z.literal("1"),
  fileFormatVersion: z.literal("1"),
  project: z.object({
    projectId: z.string().min(1),
    name: z.string(),
    businessNumber: z.string().optional(),
    designStage: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  coordinateContexts: z.array(coordinateContextV1Schema).min(1),
  projectCoordinateContextId: z.string().min(1),
  terrain: z.array(terrainDocumentV1Schema).default([]),
  activeTerrainId: z.string().nullable().default(null),
  existingConditions: z.array(existingConditionRefSchema).default([]),
  sources: z.array(sourceRecordSchema).default([]),
  extent: z.object({ bounds: boundsSchema, coordinateContextId: z.string().min(1) }).optional(),
  layerMappings: z.array(z.record(z.string(), z.unknown())).default([]),
  settings: z.record(z.string(), z.unknown()).default({}),
});
export type ProjectV1Source = z.infer<typeof projectV1Schema>;

// ---------------------------------------------------------------------------
// V2 shape (projectV2.ts / selection.ts)
// ---------------------------------------------------------------------------

export const v2CrsSchema = z
  .discriminatedUnion("projection", [
    z.object({
      kind: z.literal("known"),
      projection: z.literal("projected"),
      epsg: z.number().int().positive(),
      name: z.string(),
      horizontalUnits: z.literal("m"),
    }),
    z.object({
      kind: z.literal("known"),
      projection: z.literal("geographic"),
      epsg: z.number().int().positive(),
      name: z.string(),
      horizontalUnits: z.literal("degree"),
    }),
    z.object({ kind: z.literal("local"), projection: z.literal("local"), description: z.string(), horizontalUnits: z.literal("m") }),
    z.object({ kind: z.literal("unknown"), projection: z.literal("unknown"), description: z.string().optional(), horizontalUnits: z.literal("m") }),
  ])
  .superRefine((val, ctx) => {
    if (val.kind === "known") {
      try {
        const cls = classifyEpsg(val.epsg);
        if (cls.projection !== val.projection) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `EPSG:${val.epsg} is ${cls.projection}, not ${val.projection}` });
        }
        if (cls.horizontalUnits !== val.horizontalUnits) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `EPSG:${val.epsg} horizontalUnits should be ${cls.horizontalUnits}` });
        }
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `CRS-UNKNOWN-EPSG: ${val.epsg}` });
      }
    }
  });
export type SourceV2Crs = z.infer<typeof v2CrsSchema>;

export const v2CoordinateContextSchema = z.object({
  id: z.string().min(1),
  crs: v2CrsSchema,
  verticalDatum: z.enum(["tp", "ellipsoid", "local", "unknown"]),
  verticalUnits: z.literal("m"),
  origin: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  epoch: z.string().optional(),
  heightEpoch: z.string().optional(),
  geoidModel: z.string().optional(),
  transformResidualM: z.number().nonnegative().optional(),
});
export type SourceCoordinateContextV2 = z.infer<typeof v2CoordinateContextSchema>;

export const selectionAreaSchema = z.discriminatedUnion("type", [
  z.object({
    areaId: z.string().min(1),
    type: z.literal("rect"),
    coordinateContextId: z.string().min(1),
    vertices: z.tuple([point3Schema, point3Schema, point3Schema, point3Schema]),
    revisionHash: z.string().min(1),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  z.object({
    areaId: z.string().min(1),
    type: z.literal("polygon"),
    coordinateContextId: z.string().min(1),
    vertices: z.array(point3Schema).min(3),
    revisionHash: z.string().min(1),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  z.object({
    areaId: z.string().min(1),
    type: z.literal("viewport"),
    coordinateContextId: z.string().min(1),
    vertices: z.tuple([point3Schema, point3Schema, point3Schema, point3Schema]),
    revisionHash: z.string().min(1),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
]);
export type SourceSelectionArea = z.infer<typeof selectionAreaSchema>;

export const searchLocationSchema = z.object({
  searchLocationId: z.string().min(1),
  query: z.string(),
  kind: z.enum(["name", "address", "coordinate"]),
  name: z.string().optional(),
  geometry: z.object({
    coordinateContextId: z.string().min(1),
    lon: z.number(),
    lat: z.number(),
    geoBounds: z
      .object({ lonMin: z.number(), latMin: z.number(), lonMax: z.number(), latMax: z.number() })
      .optional(),
  }),
  displayText: z.string(),
  matchedAt: z.string(),
  provider: z.string(),
  confidence: z.number().min(0).max(1).optional(),
});
export type SourceSearchLocation = z.infer<typeof searchLocationSchema>;

export const sourceDatasetSchema = z.object({
  sourceDatasetId: z.string().min(1),
  sourceType: z.enum(["dem", "basemap", "aerial", "survey", "cad", "other"]),
  legacyKind: z.string().optional(),
  sourceName: z.string(),
  originalSource: z.string(),
  coordinateContextId: z.string().min(1),
  bounds: boundsSchema.optional(),
  acquiredAt: z.string(),
  provider: z.string().optional(),
  url: z.string().optional(),
  license: z.object({
    attribution: z.string(),
    conditions: z.string(),
    offlineOk: z.enum(["allowed", "prohibited", "unknown"]),
    redistributeOk: z.enum(["allowed", "prohibited", "unknown"]),
  }),
  cachePolicy: z.enum(["cache-allowed", "no-cache"]).default("no-cache"),
  location: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("copied"), assetRef: assetReferenceSchema }),
    z.object({ mode: z.literal("copiedMulti"), sourceRefs: z.array(assetReferenceSchema).min(1) }),
    z.object({
      mode: z.literal("external"),
      externalRef: z.object({ path: z.string(), size: z.number().nonnegative(), mtime: z.string(), fingerprint: z.string() }),
    }),
    z.object({ mode: z.literal("transient"), reason: z.string() }),
  ]),
  resolution: z.object({ cellSize: z.number().positive(), units: z.literal("m") }).optional(),
  quality: z
    .object({
      verticalM: z.number().nonnegative().optional(),
      horizontalM: z.number().nonnegative().optional(),
      method: z.string(),
      interpolation: z.string().optional(),
    })
    .optional(),
  datasetContentHash: z.string().optional(),
  gsiMeta: z.record(z.string(), z.unknown()).optional(),
  provenance: z.object({
    provider: z.string(),
    method: z.string(),
    tileCount: z.number().int().optional(),
    zoom: z.number().int().optional(),
    geoBounds: z.object({ lonMin: z.number(), latMin: z.number(), lonMax: z.number(), latMax: z.number() }).optional(),
    rawMetadata: z.record(z.string(), z.unknown()).default({}),
  }),
});
export type SourceSourceDataset = z.infer<typeof sourceDatasetSchema>;

export const siteTerrainSchema = z.object({
  terrainId: z.string().min(1),
  name: z.string(),
  sourceDatasetIds: z.array(z.string()).min(1),
  selectionAreaId: z.string(),
  selectionRevisionHash: z.string(),
  coordinateContextId: z.string().min(1),
  bounds: boundsSchema,
  grid: gridSpecSchema,
  noDataValue: z.number().finite(),
  elevationResource: assetReferenceSchema,
  meshResource: assetReferenceSchema.optional(),
  generatedAt: z.string(),
  recipe: z.object({
    payload: z.record(z.string(), z.unknown()),
    recipeHash: z.string(),
  }),
  transformRecords: z.array(z.record(z.string(), z.unknown())).default([]),
  status: z.enum(["ready", "stale"]).default("ready"),
  staleReason: z.string().optional(),
  quality: z.object({
    verticalM: z.number().nonnegative().optional(),
    horizontalM: z.number().nonnegative().optional(),
    method: z.string(),
    interpolation: z.string().optional(),
  }),
  inputHashes: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SourceSiteTerrain = z.infer<typeof siteTerrainSchema>;

export const siteContextSchema = z.object({
  coordinateContextId: z.string().min(1),
  searchLocation: searchLocationSchema.nullable().default(null),
  selectionArea: selectionAreaSchema.nullable().default(null),
  selectionTransformRecords: z.array(z.record(z.string(), z.unknown())).default([]),
  terrain: z.array(siteTerrainSchema).default([]),
  activeTerrainId: z.string().nullable().default(null),
  determinism: z.record(z.string(), z.unknown()).default({}),
  imagery: z.array(z.record(z.string(), z.unknown())).default([]),
  vectorLayers: z.array(z.record(z.string(), z.unknown())).default([]),
  sourceDatasets: z.array(sourceDatasetSchema).default([]),
  presentation: z.record(z.string(), z.unknown()).default({}),
});
export type SourceSiteContext = z.infer<typeof siteContextSchema>;

export const projectV2Schema = z.object({
  schemaVersion: z.literal("2"),
  dataVersion: z.literal("2"),
  fileFormatVersion: z.literal("2"),
  project: z.object({
    projectId: z.string().min(1),
    businessNumber: z.string().optional(),
    name: z.string(),
    designStage: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    externalIdentifiers: z.record(z.string(), z.string()).optional(),
  }),
  coordinateContexts: z.array(v2CoordinateContextSchema).min(1),
  projectCoordinateContextId: z.string().min(1),
  siteContext: siteContextSchema,
  existingConditions: z.array(z.record(z.string(), z.unknown())).default([]),
  layerMappings: z.array(z.record(z.string(), z.unknown())).default([]),
  settings: z.record(z.string(), z.unknown()).default({}),
});
export type ProjectV2Source = z.infer<typeof projectV2Schema>;

export type NormalizedProjectSource = ProjectV2Source;

// ---------------------------------------------------------------------------
// V1 → V2 migration (ported from projectV2.ts migrateProjectV1ToV2)
// ---------------------------------------------------------------------------

export interface MigrationResult {
  project: ProjectV2Source;
  migrated: boolean;
  issues: string[];
  selectionAreaMigrated: boolean;
}

/** V1 → V2 deterministic migration (faithful port; site-context canonical functions). */
export async function migrateProjectV1ToV2(v1: ProjectV1Source): Promise<MigrationResult> {
  const issues: string[] = [];
  const v1Project = v1.project;
  const now = v1Project.updatedAt;

  const coordinateContexts: SourceCoordinateContextV2[] = v1.coordinateContexts.map((c) => {
    const crs = c.crs;
    let v2crs: SourceV2Crs;
    if (crs.kind === "known" && crs.epsg != null) {
      const cls = classifyEpsg(crs.epsg);
      v2crs =
        cls.projection === "geographic"
          ? { kind: "known", projection: "geographic", epsg: crs.epsg, name: crs.name ?? `EPSG:${crs.epsg}`, horizontalUnits: "degree" }
          : { kind: "known", projection: "projected", epsg: crs.epsg, name: crs.name ?? `EPSG:${crs.epsg}`, horizontalUnits: "m" };
    } else if (crs.kind === "local") {
      v2crs = { kind: "local", projection: "local", description: crs.description ?? "local", horizontalUnits: "m" };
    } else if (crs.kind === "unknown") {
      v2crs = { kind: "unknown", projection: "unknown", description: crs.description, horizontalUnits: "m" };
    } else {
      v2crs = { kind: "unknown", projection: "unknown", description: undefined, horizontalUnits: "m" };
    }
    return {
      id: c.id,
      crs: v2crs,
      verticalDatum: c.verticalDatum,
      verticalUnits: "m" as const,
      origin: c.origin,
      epoch: c.epoch,
      heightEpoch: c.heightEpoch,
      geoidModel: c.geoidModel,
      transformResidualM: c.transformResidualM,
    };
  });

  if (v1.extent && v1.extent.coordinateContextId !== v1.projectCoordinateContextId) {
    throw new Error("MIG-EXTENT-CRS-MISMATCH");
  }

  let selectionArea: SourceSiteContext["selectionArea"] = null;
  let selectionRevisionHash = "";
  let selectionAreaMigrated = false;
  if (v1.extent) {
    const b = v1.extent.bounds;
    const vertices = [
      { x: b.minX, y: b.minY, z: null },
      { x: b.maxX, y: b.minY, z: null },
      { x: b.maxX, y: b.maxY, z: null },
      { x: b.minX, y: b.maxY, z: null },
    ] as const;
    const hashInput = { type: "rect", coordinateContextId: v1.projectCoordinateContextId, vertices };
    const revisionHash = await canonicalHash(hashInput);
    selectionArea = {
      areaId: `sel-${v1Project.projectId}`,
      type: "rect",
      coordinateContextId: v1.projectCoordinateContextId,
      vertices: [vertices[0], vertices[1], vertices[2], vertices[3]],
      revisionHash,
      createdAt: v1Project.createdAt,
      updatedAt: now,
    } as SourceSiteContext["selectionArea"];
    selectionRevisionHash = selectionArea!.revisionHash;
    selectionAreaMigrated = true;
  }

  let unknownCtxCounter = 0;
  const sourceDatasets: SourceSourceDataset[] = await Promise.all(
    v1.sources.map(async (s) => {
      const typeMap: Record<string, string> = {
        "gsi-dem": "dem",
        "gsi-basemap": "basemap",
        "gsi-photo": "aerial",
        xyz: "survey",
        csv: "survey",
        geotiff: "survey",
        dxf2d: "cad",
        dxf3d: "cad",
        other: "other",
      };
      const displayNameMap: Record<string, string> = {
        "gsi-dem": "国土地理院 標高タイル",
        "gsi-basemap": "国土地理院 標準地図",
        "gsi-photo": "国土地理院 航空写真",
        xyz: "XYZ点群",
        csv: "CSV測量データ",
        geotiff: "GeoTIFF標高",
        dxf2d: "DXF 2D図面",
        dxf3d: "DXF 3D図面",
        other: "その他",
      };
      let coordCtxId = s.coordinateContextId;
      if (!coordCtxId) {
        const existingUnknown = coordinateContexts.find((c) => c.crs.kind === "unknown");
        if (existingUnknown) {
          coordCtxId = existingUnknown.id;
        } else {
          unknownCtxCounter += 1;
          coordCtxId = `ctx-unknown-${unknownCtxCounter}`;
          coordinateContexts.push({
            id: coordCtxId,
            crs: { kind: "unknown", projection: "unknown", description: "source-crs-unknown", horizontalUnits: "m" },
            verticalDatum: "unknown",
            verticalUnits: "m",
            origin: { x: 0, y: 0, z: 0 },
          } as SourceCoordinateContextV2);
        }
      }
      let datasetContentHash: string | undefined;
      const loc = s.location;
      if (loc.mode === "copied" && loc.assetRef?.checksum) {
        datasetContentHash = loc.assetRef.checksum;
      } else if (loc.mode === "copiedMulti" && loc.sourceRefs) {
        datasetContentHash = await canonicalHash(loc.sourceRefs);
      }
      return {
        sourceDatasetId: s.id,
        sourceType: (typeMap[s.kind] ?? "other") as SourceSourceDataset["sourceType"],
        legacyKind: s.kind,
        sourceName: displayNameMap[s.kind] ?? s.kind,
        originalSource: s.url ?? s.provider ?? s.kind,
        coordinateContextId: coordCtxId,
        acquiredAt: s.acquiredAt,
        provider: s.provider,
        url: s.url,
        license: s.license as SourceSourceDataset["license"],
        cachePolicy: (s.cachePolicy ?? "no-cache") as "cache-allowed" | "no-cache",
        location: s.location as SourceSourceDataset["location"],
        quality: s.quality as SourceSourceDataset["quality"],
        datasetContentHash,
        gsiMeta: s.gsiMeta as SourceSourceDataset["gsiMeta"],
        provenance: {
          provider: s.provider ?? s.kind,
          method: "migration",
          rawMetadata: (s.rawMetadata as Record<string, unknown>) ?? {},
        },
      };
    }),
  );
  const sourceIdSet = new Set(sourceDatasets.map((s) => s.sourceDatasetId));

  const terrain: SourceSiteTerrain[] = await Promise.all(
    v1.terrain.map(async (t) => {
      if (t.coordinateContextId !== v1.projectCoordinateContextId) {
        throw new Error("MIG-TERRAIN-CRS-MISMATCH");
      }
      if (t.inputHashes.length !== t.sourceIds.length) {
        throw new Error("MIG-INPUTHASH-MISMATCH");
      }
      for (const sid of t.sourceIds) {
        if (!sourceIdSet.has(sid)) {
          throw new Error(`MIG-SOURCE-MISSING: ${sid}`);
        }
      }
      const grid = t.grid as SourceSiteTerrain["grid"];
      const gridBounds = {
        minX: grid.originX - grid.cellSize / 2,
        maxY: grid.originY + (grid.height - 1) * grid.cellSize + grid.cellSize / 2,
        maxX: grid.originX + (grid.width - 1) * grid.cellSize + grid.cellSize / 2,
        minY: grid.originY - grid.cellSize / 2,
      };
      const recipe = t.generationRecipe;
      const hasSelection = selectionArea != null;
      const sourceUnknownCrs = t.sourceIds.some((sid) => {
        const src = sourceDatasets.find((s) => s.sourceDatasetId === sid);
        if (!src) return false;
        const ctx = coordinateContexts.find((c) => c.id === src.coordinateContextId);
        return ctx ? ctx.crs.kind === "unknown" : false;
      });
      const staleReasons: string[] = [];
      if (!hasSelection) staleReasons.push("migrated-without-selection");
      if (t.stale.reason) staleReasons.push(t.stale.reason);
      if (sourceUnknownCrs) staleReasons.push("source-crs-unknown");
      if (t.stale.regeneratedAgainst) staleReasons.push(`regenerated-against:${t.stale.regeneratedAgainst}`);
      const isStale = t.stale.isStale || !hasSelection || sourceUnknownCrs;
      const recipeOptions = { ...(recipe.options as Record<string, unknown>) };
      if (sourceUnknownCrs) recipeOptions.provenance = "migrated-unknown-crs";
      const sourcePriority = {
        order: t.sourceIds,
        tieBreak: "highest-precision",
        boundary: "first-valid-wins",
        noDataBehavior: "propagate",
        priorityRule: "laser>photogrammetry>contour",
      };
      const recipePayload = {
        algorithm: recipe.algorithm,
        algorithmVersion: recipe.algorithmVersion,
        sourcePriority,
        options: recipeOptions,
      };
      const recipeHash = await canonicalHash(recipePayload);
      return {
        terrainId: t.id,
        name: t.name,
        sourceDatasetIds: t.sourceIds,
        coordinateContextId: t.coordinateContextId,
        bounds: gridBounds,
        grid,
        noDataValue: t.noDataValue,
        elevationResource: t.assetRef as SourceAssetReference,
        generatedAt: t.updatedAt,
        selectionAreaId: hasSelection ? selectionArea!.areaId : "migrated-unbound",
        selectionRevisionHash: hasSelection ? selectionRevisionHash : "",
        recipe: { payload: recipePayload, recipeHash },
        transformRecords: [],
        status: (isStale ? "stale" : "ready") as "ready" | "stale",
        staleReason: staleReasons.length > 0 ? staleReasons.join(",") : undefined,
        quality: t.quality as SourceSiteTerrain["quality"],
        inputHashes: t.inputHashes,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    }),
  );

  const project: ProjectV2Source = {
    schemaVersion: "2",
    dataVersion: "2",
    fileFormatVersion: "2",
    project: {
      projectId: v1Project.projectId,
      businessNumber: v1Project.businessNumber,
      name: v1Project.name,
      designStage: v1Project.designStage,
      createdAt: v1Project.createdAt,
      updatedAt: v1Project.updatedAt,
    },
    coordinateContexts: coordinateContexts as unknown as ProjectV2Source["coordinateContexts"],
    projectCoordinateContextId: v1.projectCoordinateContextId,
    siteContext: {
      coordinateContextId: v1.projectCoordinateContextId,
      searchLocation: null,
      selectionArea,
      selectionTransformRecords: [],
      terrain,
      activeTerrainId: v1.activeTerrainId,
      determinism: {},
      imagery: [],
      vectorLayers: [],
      sourceDatasets,
      presentation: {},
    },
    existingConditions: (v1.existingConditions as unknown as Record<string, unknown>[]) ?? [],
    layerMappings: (v1.layerMappings as unknown as Record<string, unknown>[]) ?? [],
    settings: (v1.settings as Record<string, unknown>) ?? {},
  };

  const parsed = projectV2Schema.safeParse(project);
  if (!parsed.success) {
    throw new Error(
      `MIG-SCHEMA-FAILED: ${parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}:${i.message}`)
        .join(";")}`,
    );
  }
  const invErrors = validateProjectV2Invariants(project);
  if (invErrors.length > 0) {
    throw new Error(`MIG-INVARIANT-FAILED: ${invErrors.join(";")}`);
  }
  return { project, migrated: true, issues, selectionAreaMigrated };
}

/** ProjectV2 invariant validation (03章§14・I-01〜I-04). */
export function validateProjectV2Invariants(p: ProjectV2Source): string[] {
  const errors: string[] = [];
  const ctxIds = new Set<string>();
  for (const c of p.coordinateContexts) {
    if (ctxIds.has(c.id)) errors.push(`I-01: duplicate coordinateContextId ${c.id}`);
    ctxIds.add(c.id);
  }
  const terrainIds = new Set<string>();
  for (const t of p.siteContext.terrain) {
    if (terrainIds.has(t.terrainId)) errors.push(`I-01: duplicate terrainId ${t.terrainId}`);
    terrainIds.add(t.terrainId);
  }
  const srcIds = new Set<string>();
  for (const s of p.siteContext.sourceDatasets) {
    if (srcIds.has(s.sourceDatasetId)) errors.push(`I-01: duplicate sourceDatasetId ${s.sourceDatasetId}`);
    srcIds.add(s.sourceDatasetId);
  }
  const layerIds = new Set<string>();
  for (const img of p.siteContext.imagery) {
    if (typeof img === "object" && img !== null && typeof (img as Record<string, unknown>).layerId === "string") {
      const id = (img as Record<string, unknown>).layerId as string;
      if (layerIds.has(id)) errors.push(`I-01: duplicate imagery layerId ${id}`);
      layerIds.add(id);
    }
  }
  for (const v of p.siteContext.vectorLayers) {
    if (typeof v === "object" && v !== null && typeof (v as Record<string, unknown>).layerId === "string") {
      const id = (v as Record<string, unknown>).layerId as string;
      if (layerIds.has(id)) errors.push(`I-01: duplicate vector layerId ${id}`);
      layerIds.add(id);
    }
  }
  if (!ctxIds.has(p.projectCoordinateContextId)) errors.push(`I-02: projectCoordinateContextId ${p.projectCoordinateContextId} missing`);
  if (!ctxIds.has(p.siteContext.coordinateContextId)) errors.push("I-02: siteContext.coordinateContextId missing");
  if (p.siteContext.selectionArea && !ctxIds.has(p.siteContext.selectionArea.coordinateContextId)) {
    errors.push("I-02: selectionArea coordinateContextId missing");
  }
  for (const t of p.siteContext.terrain) {
    if (!ctxIds.has(t.coordinateContextId)) errors.push(`I-02: terrain ${t.terrainId} coordinateContextId missing`);
    if (t.selectionAreaId === "migrated-unbound") {
      // unbound allowed (migration / no selection)
    } else if (!p.siteContext.selectionArea) {
      errors.push(`I-02: terrain ${t.terrainId} selectionAreaId ${t.selectionAreaId} but no selectionArea`);
    } else if (t.selectionAreaId !== p.siteContext.selectionArea.areaId) {
      errors.push(`I-02: terrain ${t.terrainId} selectionAreaId ${t.selectionAreaId} not found`);
    }
    for (const sid of t.sourceDatasetIds) {
      if (!srcIds.has(sid)) errors.push(`I-02: terrain ${t.terrainId} source ${sid} missing`);
    }
  }
  if (p.siteContext.activeTerrainId != null && !terrainIds.has(p.siteContext.activeTerrainId)) {
    errors.push(`I-02: activeTerrainId ${p.siteContext.activeTerrainId} missing`);
  }
  for (const img of p.siteContext.imagery) {
    const rec = img as Record<string, unknown>;
    if (typeof rec.sourceDatasetId === "string" && !srcIds.has(rec.sourceDatasetId)) {
      errors.push(`I-02: imagery ${String(rec.layerId)} source ${rec.sourceDatasetId} missing`);
    }
  }
  const siteCtx = p.coordinateContexts.find((c) => c.id === p.siteContext.coordinateContextId);
  if (siteCtx) {
    const crs = siteCtx.crs;
    if (crs.kind === "known" && crs.projection === "geographic") {
      errors.push("I-03: siteContext canonical CRS must be projected");
    }
    if (crs.kind === "unknown") errors.push("I-03: siteContext canonical CRS must be projected|local");
  }
  if (p.projectCoordinateContextId !== p.siteContext.coordinateContextId) {
    errors.push("I-04: projectCoordinateContextId !== siteContext.coordinateContextId");
  }
  return errors;
}
