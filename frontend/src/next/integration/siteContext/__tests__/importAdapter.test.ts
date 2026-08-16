import { describe, expect, it } from "vitest";
import type {
  SiteContextImportInput,
  SiteContextPackage,
  SiteContextPackageFile,
} from "../adapterContract";
import { createSiteContextImportAdapter, mapSiteContextPackageToProject } from "../importAdapter";
import { base64ToBytes, canonicalHash, sha256HexBytes } from "../siteContextHash";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeSct1Bytes(
  width: number,
  height: number,
  cellSize: number,
  originX: number,
  originY: number,
  values: number[],
): Uint8Array {
  const header = new ArrayBuffer(42);
  const dv = new DataView(header);
  for (let i = 0; i < 4; i++) dv.setUint8(i, "SCT1".charCodeAt(i));
  dv.setUint16(4, 1, true); // formatVersion
  dv.setUint32(6, 0, true); // flags
  dv.setUint32(10, width, true);
  dv.setUint32(14, height, true);
  dv.setFloat32(18, cellSize, true);
  dv.setFloat64(22, originX, true);
  dv.setFloat64(30, originY, true);
  dv.setFloat32(38, -9999, true); // noDataValue
  const total = 42 + width * height * 4;
  const bytes = new Uint8Array(total);
  bytes.set(new Uint8Array(header), 0);
  const dv2 = new DataView(bytes.buffer);
  for (let i = 0; i < values.length; i++) {
    dv2.setFloat32(42 + i * 4, values[i], true);
  }
  return bytes;
}

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

const UUID = "123e4567-e89b-12d3-a456-426614174000";
const NOW = "2026-08-16T00:00:00.000Z";

const GRID = { width: 2, height: 2, cellSize: 10, originX: 0, originY: 0, rowMajor: true };
const GRID_BOUNDS = { minX: -5, minY: -5, maxX: 15, maxY: 15 };

function makeSourceDataset(opts?: {
  readonly sourceDatasetId?: string;
  readonly licenseRedistributeOk?: "allowed" | "prohibited" | "unknown";
}): Record<string, unknown> {
  return {
    sourceDatasetId: opts?.sourceDatasetId ?? "sd-1",
    sourceType: "dem",
    sourceName: "国土地理院 標高タイル",
    originalSource: "gsi",
    coordinateContextId: "ctx-primary",
    bounds: GRID_BOUNDS,
    acquiredAt: NOW,
    provider: "国土地理院",
    url: "https://maps.gsi.go.jp",
    license: {
      attribution: "国土地理院",
      conditions: "測量法",
      offlineOk: "allowed",
      redistributeOk: opts?.licenseRedistributeOk ?? "allowed",
    },
    cachePolicy: "cache-allowed",
    location: { mode: "transient", reason: "fixture" },
    resolution: { cellSize: 10, units: "m" },
    quality: { method: "bilinear", verticalM: 1, horizontalM: 1 },
    datasetContentHash: "0".repeat(64),
    provenance: { provider: "gsi", method: "tile", rawMetadata: {} },
  };
}

interface TerrainFixtureOpts {
  readonly terrainId: string;
  readonly name: string;
  readonly status?: "ready" | "stale";
  readonly meshResource?: { path: string; checksum: string; size: number };
}

function makeV2Terrain(
  opts: TerrainFixtureOpts,
  asset: { path: string; checksum: string; size: number } | undefined,
): Record<string, unknown> {
  const elevationResource = asset ?? { path: "assets/terrain/sample.sct1", checksum: "0".repeat(64), size: 0 };
  return {
    terrainId: opts.terrainId,
    name: opts.name,
    sourceDatasetIds: ["sd-1"],
    selectionAreaId: "migrated-unbound",
    selectionRevisionHash: "",
    coordinateContextId: "ctx-primary",
    bounds: GRID_BOUNDS,
    grid: GRID,
    noDataValue: -9999,
    elevationResource,
    ...(opts.meshResource ? { meshResource: opts.meshResource } : {}),
    generatedAt: NOW,
    recipe: { payload: { algorithm: "gsi-dem" }, recipeHash: "r1" },
    transformRecords: [],
    status: opts.status ?? "ready",
    quality: { method: "bilinear", verticalM: 1, horizontalM: 1 },
    inputHashes: [],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeV2Project(opts?: {
  readonly projectId?: string;
  readonly terrain?: Record<string, unknown>[];
  readonly layerMappings?: readonly Record<string, unknown>[];
  readonly settings?: Record<string, unknown>;
  readonly sourceDatasets?: readonly Record<string, unknown>[];
  readonly existingConditions?: readonly Record<string, unknown>[];
  readonly crsEpsg?: number;
  readonly crsProjection?: "projected" | "geographic" | "local" | "unknown";
}): Record<string, unknown> {
  const terrain = opts?.terrain ?? [];
  return {
    schemaVersion: "2",
    dataVersion: "2",
    fileFormatVersion: "2",
    project: {
      projectId: opts?.projectId ?? UUID,
      businessNumber: "RB-001",
      name: "Gujo Test",
      designStage: "概念設計",
      createdAt: NOW,
      updatedAt: NOW,
    },
    coordinateContexts: [
      {
        id: "ctx-primary",
        crs: {
          kind: "known",
          projection: opts?.crsProjection ?? "projected",
          epsg: opts?.crsEpsg ?? 6677,
          name: "JGD2011 / Japan Plane Rectangular CS VII",
          horizontalUnits: opts?.crsProjection === "geographic" ? "degree" : "m",
        },
        verticalDatum: "tp",
        verticalUnits: "m",
        origin: { x: 0, y: 0, z: 0 },
      },
    ],
    projectCoordinateContextId: "ctx-primary",
    siteContext: {
      coordinateContextId: "ctx-primary",
      searchLocation: null,
      selectionArea: null,
      selectionTransformRecords: [],
      terrain,
      activeTerrainId: terrain.length > 0 ? terrain[0].terrainId : null,
      determinism: {},
      imagery: [],
      vectorLayers: [],
      sourceDatasets: opts?.sourceDatasets ?? [],
      presentation: {},
    },
    existingConditions: opts?.existingConditions ?? [],
    layerMappings: opts?.layerMappings ?? [],
    settings: opts?.settings ?? {},
  };
}

async function makeAssetEntry(): Promise<{
  path: string;
  entryChecksum: string;
  size: number;
  content: string;
  assetRef: { path: string; checksum: string; size: number };
}> {
  const sct1 = makeSct1Bytes(2, 2, 10, 0, 0, [10, 20, 30, 40]);
  const content = base64Encode(sct1);
  const entryChecksum = await canonicalHash(content);
  const path = "assets/terrain/sample.sct1";
  return {
    path,
    entryChecksum,
    size: sct1.length,
    content,
    assetRef: { path, checksum: sha256HexBytes(sct1), size: sct1.length },
  };
}

async function makeV2Package(opts?: {
  readonly projectId?: string;
  readonly terrain?: TerrainFixtureOpts[];
  readonly withAsset?: boolean;
  readonly tamperEnvelopeChecksum?: boolean;
  readonly layerMappings?: readonly Record<string, unknown>[];
  readonly settings?: Record<string, unknown>;
  readonly sourceDatasets?: readonly Record<string, unknown>[];
  readonly existingConditions?: readonly Record<string, unknown>[];
  readonly crsEpsg?: number;
  readonly crsProjection?: "projected" | "geographic" | "local" | "unknown";
}): Promise<SiteContextPackage> {
  const files: SiteContextPackageFile[] = [];
  const fileEntries: { path: string; checksum: string; size: number }[] = [];

  let asset: { path: string; entryChecksum: string; size: number; content: string; assetRef: { path: string; checksum: string; size: number } } | undefined;
  if (opts?.withAsset) {
    asset = await makeAssetEntry();
    fileEntries.push({ path: asset.path, checksum: asset.entryChecksum, size: asset.size });
    files.push({ path: asset.path, content: asset.content, size: asset.size, checksum: asset.entryChecksum });
  }

  const terrain = opts?.terrain?.map((t) => makeV2Terrain(t, asset?.assetRef)) ?? [];

  const sourceDatasets =
    opts?.sourceDatasets ?? (terrain.length > 0 ? [makeSourceDataset()] : undefined);

  const project = makeV2Project({
    projectId: opts?.projectId,
    terrain,
    layerMappings: opts?.layerMappings,
    settings: opts?.settings,
    sourceDatasets,
    existingConditions: opts?.existingConditions,
    crsEpsg: opts?.crsEpsg,
    crsProjection: opts?.crsProjection,
  });

  const envelope = {
    format: "sitecontext-package",
    version: "1",
    exportProfile: "sitecontext-v2",
    exportedAt: NOW,
    revision: 1,
    projectId: opts?.projectId ?? UUID,
    schemaVersion: "2",
    project,
    files: fileEntries,
  };

  if (opts?.tamperEnvelopeChecksum && fileEntries.length > 0) {
    envelope.files = [
      { path: fileEntries[0].path, checksum: "0".repeat(64), size: fileEntries[0].size },
    ];
  }

  return { envelope, files };
}

async function makeV1Package(opts?: {
  readonly projectId?: string;
  readonly withTerrain?: boolean;
}): Promise<SiteContextPackage> {
  const files: SiteContextPackageFile[] = [];
  const fileEntries: { path: string; checksum: string; size: number }[] = [];

  let terrain: Record<string, unknown>[] = [];
  if (opts?.withTerrain) {
    const asset = await makeAssetEntry();
    fileEntries.push({ path: asset.path, checksum: asset.entryChecksum, size: asset.size });
    files.push({ path: asset.path, content: asset.content, size: asset.size, checksum: asset.entryChecksum });
    terrain = [
      {
        id: "t-1",
        name: "Gujo DEM",
        grid: GRID,
        bounds: GRID_BOUNDS,
        noDataValue: -9999,
        coordinateContextId: "ctx-primary",
        sourceIds: ["sd-1"],
        inputHashes: ["abc"],
        quality: { method: "bilinear", verticalM: 1 },
        generationRecipe: { algorithm: "gsi-dem", algorithmVersion: "1", options: {} },
        stale: { isStale: false },
        createdAt: NOW,
        updatedAt: NOW,
        assetRef: asset.assetRef,
      },
    ];
  }

  const envelope = {
    format: "sitecontext-package",
    version: "1",
    exportProfile: "sitecontext-v2",
    exportedAt: NOW,
    revision: 1,
    projectId: opts?.projectId ?? UUID,
    schemaVersion: "1",
    project: {
      schemaVersion: "1",
      dataVersion: "1",
      fileFormatVersion: "1",
      project: {
        projectId: opts?.projectId ?? UUID,
        name: "Gujo V1",
        businessNumber: "RB-001",
        designStage: "概念設計",
        createdAt: NOW,
        updatedAt: NOW,
      },
      coordinateContexts: [
        {
          id: "ctx-primary",
          crs: { kind: "known", epsg: 6677, name: "JGD2011 / Japan Plane Rectangular CS VII" },
          verticalDatum: "tp",
          units: "m",
          origin: { x: 0, y: 0, z: 0 },
        },
      ],
      projectCoordinateContextId: "ctx-primary",
      terrain,
      activeTerrainId: terrain.length > 0 ? "t-1" : null,
      existingConditions: [],
      sources: opts?.withTerrain
        ? [
            {
              id: "sd-1",
              kind: "gsi-dem",
              location: { mode: "transient", reason: "migration-test" },
              acquiredAt: NOW,
              license: {
                attribution: "国土地理院",
                conditions: "測量法",
                offlineOk: "allowed",
                redistributeOk: "allowed",
              },
              cachePolicy: "cache-allowed",
              gsiMeta: {},
            },
          ]
        : [],
      extent: opts?.withTerrain
        ? { bounds: GRID_BOUNDS, coordinateContextId: "ctx-primary" }
        : undefined,
      layerMappings: [],
      settings: {},
    },
    files: fileEntries,
  };

  return { envelope, files };
}

function toInput(pkg: SiteContextPackage): SiteContextImportInput {
  return { package: pkg, options: {} };
}

// ---------------------------------------------------------------------------
// B-6 Adapter Contract Test
// ---------------------------------------------------------------------------

describe("siteContext import adapter contract (Wave 2 Lane B-6)", () => {
  it("accepts a valid V2 package and produces a success report", async () => {
    const pkg = await makeV2Package({ projectId: UUID });
    const adapter = createSiteContextImportAdapter();
    const result = await adapter.import(toInput(pkg));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.projectId).toBe(UUID);
    expect(result.report.projectId).toBe(UUID);
    expect(result.report.sourceSchemaVersion).toBe("2");
    expect(result.report.schemaVersion).toBe("1.0.0");
    expect(result.report.crsImport.supported).toBe(true);
    expect(result.report.crsImport.epsg).toBe(6677);
    expect(result.report.version.targetSchemaVersion).toBe("1.0.0");
  });

  it("produces a mapped target project with existing PDC slots (metadata + terrain module)", async () => {
    const pkg = await makeV2Package({ projectId: UUID });
    const project = await mapSiteContextPackageToProject(toInput(pkg));
    expect(project.projectId).toBe(UUID);
    expect(project.metadata.siteContextCoordinateContexts).toBeInstanceOf(Array);
    expect(project.metadata.siteContextProjectCoordinateContextId).toBe("ctx-primary");
    const terrainModule = project.modules.terrain as Record<string, unknown>;
    expect((terrainModule.data as Record<string, unknown>).siteContext).toBeTruthy();
  });

  it("maps terrain elevation resource (SCT1) with checksum verification", async () => {
    const pkg = await makeV2Package({
      projectId: UUID,
      withAsset: true,
      terrain: [{ terrainId: "t-1", name: "Gujo DEM", status: "ready" }],
    });
    const adapter = createSiteContextImportAdapter();
    const result = await adapter.import(toInput(pkg));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.terrainImport.terrainCount).toBe(1);
    expect(result.report.terrainImport.sct1Count).toBe(1);
    expect(result.report.terrainImport.checksumVerifiedCount).toBe(1);
    expect(result.report.terrainImport.missingAssetCount).toBe(0);
  });

  it("rejects a package missing required coordinateContexts (SC-ERR-MISSING-REQUIRED)", async () => {
    const pkg = await makeV2Package({ projectId: UUID });
    (pkg.envelope.project as Record<string, unknown>).coordinateContexts = [];
    const adapter = createSiteContextImportAdapter();
    const result = await adapter.import(toInput(pkg));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("SC-ERR-MISSING-REQUIRED");
  });

  it("reports unsupported / deferred fields instead of failing when mapping is otherwise valid", async () => {
    const pkg = await makeV2Package({
      projectId: UUID,
      layerMappings: [{ from: "site", to: "road" }],
      settings: { theme: "dark" },
    });
    const adapter = createSiteContextImportAdapter();
    const result = await adapter.import(toInput(pkg));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const paths = result.report.unsupportedFields.map((f) => f.path);
    expect(paths).toContain("layerMappings");
    expect(paths).toContain("settings");
    for (const field of result.report.unsupportedFields) {
      expect(["unsupported", "deferred"]).toContain(field.reason);
    }
  });

  it("rejects an incompatible source schemaVersion (SC-ERR-INCOMPATIBLE-VERSION)", async () => {
    const pkg = await makeV2Package({ projectId: UUID });
    (pkg.envelope as { schemaVersion: string }).schemaVersion = "3";
    const adapter = createSiteContextImportAdapter();
    const result = await adapter.import(toInput(pkg));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("SC-ERR-INCOMPATIBLE-VERSION");
  });

  it("rejects a corrupt source (envelope checksum mismatch → SC-ERR-CORRUPT-SOURCE)", async () => {
    const pkg = await makeV2Package({ projectId: UUID, withAsset: true, tamperEnvelopeChecksum: true });
    const adapter = createSiteContextImportAdapter();
    const result = await adapter.import(toInput(pkg));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("SC-ERR-CORRUPT-SOURCE");
  });

  it("rejects corrupt asset bytes (sha256 mismatch → SC-ERR-CORRUPT-SOURCE)", async () => {
    const pkg = await makeV2Package({ projectId: UUID, withAsset: true, terrain: [{ terrainId: "t-1", name: "Gujo DEM" }] });
    const tamperedFiles = (pkg.files as SiteContextPackageFile[]).map((f) => ({
      ...f,
      content: base64Encode(makeSct1Bytes(2, 2, 10, 0, 0, [99, 99, 99, 99])),
    }));
    const tamperedPkg: SiteContextPackage = { ...pkg, files: tamperedFiles };
    const adapter = createSiteContextImportAdapter();
    const result = await adapter.import(toInput(tamperedPkg));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("SC-ERR-CORRUPT-SOURCE");
  });

  it("rejects an unsupported CRS (Tokyo datum 30161-30179 → SC-ERR-UNSUPPORTED-CRS)", async () => {
    const pkg = await makeV2Package({ projectId: UUID, crsEpsg: 30163 });
    const adapter = createSiteContextImportAdapter();
    const result = await adapter.import(toInput(pkg));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("SC-ERR-UNSUPPORTED-CRS");
  });

  it("rejects a geographic project CRS (SC-ERR-UNSUPPORTED-CRS)", async () => {
    const pkg = await makeV2Package({ projectId: UUID, crsEpsg: 4326, crsProjection: "geographic" });
    const adapter = createSiteContextImportAdapter();
    const result = await adapter.import(toInput(pkg));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("SC-ERR-UNSUPPORTED-CRS");
  });

  it("rejects an invalid terrain reference (missing elevation asset → SC-ERR-INVALID-TERRAIN-REF)", async () => {
    const pkg = await makeV2Package({
      projectId: UUID,
      withAsset: false,
      terrain: [{ terrainId: "t-1", name: "Gujo DEM" }],
    });
    const adapter = createSiteContextImportAdapter();
    const result = await adapter.import(toInput(pkg));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("SC-ERR-INVALID-TERRAIN-REF");
  });

  it("reports warnings and diagnostics on successful import", async () => {
    const pkg = await makeV2Package({
      projectId: UUID,
      withAsset: true,
      terrain: [{ terrainId: "t-1", name: "Gujo DEM", status: "stale" }],
    });
    const adapter = createSiteContextImportAdapter();
    const result = await adapter.import(toInput(pkg));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.diagnostics.staleTerrainCount).toBe(1);
    const staleWarning = result.report.warnings.find((w) => w.code === "SC-WARN-STALE-TERRAIN");
    expect(staleWarning).toBeTruthy();
  });

  it("normalizes a V1 source to V2 (migratedV1ToV2), including selection area migration", async () => {
    const pkg = await makeV1Package({ projectId: UUID, withTerrain: true });
    const adapter = createSiteContextImportAdapter();
    const result = await adapter.import(toInput(pkg));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.sourceSchemaVersion).toBe("1");
    expect(result.report.diagnostics.migratedV1ToV2).toBe(true);
    expect(result.report.diagnostics.selectionAreaMigrated).toBe(true);
    expect(result.report.terrainImport.terrainCount).toBe(1);
    expect(result.report.terrainImport.sct1Count).toBe(1);
  });

  it("inspect() validates without mutating and fails closed on invalid input", async () => {
    const pkg = await makeV2Package({ projectId: UUID });
    const adapter = createSiteContextImportAdapter();
    const before = JSON.stringify(pkg);
    const ok = await adapter.inspect(toInput(pkg));
    expect(ok.ok).toBe(true);
    expect(JSON.stringify(pkg)).toBe(before);

    const bad = await makeV2Package({ projectId: UUID });
    (bad.envelope as { schemaVersion: string }).schemaVersion = "3";
    const failed = await adapter.inspect(toInput(bad));
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.errorCode).toBe("SC-ERR-INCOMPATIBLE-VERSION");
  });

  it("generates a new projectId when asNew is requested", async () => {
    const pkg = await makeV2Package({ projectId: UUID });
    const adapter = createSiteContextImportAdapter();
    const result = await adapter.import({ package: pkg, options: { asNew: true } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.projectId).not.toBe(UUID);
  });

  it("converts existing conditions into the SPACER existingConditionsDocument", async () => {
    const pkg = await makeV2Package({
      projectId: UUID,
      existingConditions: [
        {
          id: "ec-1",
          type: "river",
          label: "吉田川",
          geometry: {
            kind: "line",
            points: [
              { x: 0, y: 0, z: 10 },
              { x: 100, y: 0, z: 10 },
            ],
          },
          coordinateContextId: "ctx-primary",
          layer: "surface",
        },
      ],
    });
    const adapter = createSiteContextImportAdapter();
    const result = await adapter.import(toInput(pkg));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const project = await mapSiteContextPackageToProject(toInput(pkg));
    const doc = project.metadata.existingConditions as { entities?: readonly unknown[] };
    expect(doc.entities).toHaveLength(1);
  });
});