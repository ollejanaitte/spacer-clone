import { describe, expect, it, vi } from "vitest";
import { NO_DATA, Heightfield } from "../heightfield";
import { TERRAIN_SCHEMA_VERSION, validateTerrainData, type TerrainDocument } from "../../next/modules/terrainModule";
import { createEmptyProject, parseProject } from "../../next/project/projectDataCore";
import {
  buildTerrainAsset,
  buildTerrainAssetManifest,
  buildTerrainDocument,
  elevationRangeFromHeightfield,
  generateTerrain,
} from "../generation";
import type { TerrainGenerationInput } from "../generation";
import { base64ToBytes, base64ToHeightfield, serializeHeightfieldBinary } from "../sct1";
import { sha256BytesHex } from "../canonicalize";
import {
  extractTerrainAssetManifest,
  extractTerrainDocument,
  persistTerrain,
  verifyTerrainAssetChecksum,
} from "../terrainPersistence";

function makeHf(): Heightfield {
  const spec = { width: 4, height: 3, cellSize: 5, originX: 84000, originY: -29600, rowMajor: true as const };
  const data = new Float32Array(12);
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 4; i++) {
      data[j * 4 + i] = 100 + i * 10 + j * 20;
    }
  }
  data[0] = NO_DATA;
  return new Heightfield(spec, data);
}

function makeInput(overrides?: Partial<TerrainGenerationInput>): TerrainGenerationInput {
  return {
    terrainId: "terrain-test",
    heightfield: makeHf(),
    source: { sourceType: "dem", sourceName: "test-dem", importedAt: null },
    projectOrigin: { x: 0, y: 0, z: 0 },
    assetPath: "assets/terrain/test.sct1",
    ...overrides,
  };
}

describe("T-5 Terrain Generation / Persistence", () => {
  it("generates a terrainDocument per the terrain module contract", async () => {
    const result = await generateTerrain(makeInput());
    const doc = result.terrainDocument;

    expect(doc.terrainId).toBe("terrain-test");
    expect(doc.schemaVersion).toBe(TERRAIN_SCHEMA_VERSION);
    expect(doc.source).toEqual({ sourceType: "dem", sourceName: "test-dem", importedAt: null });
    expect(doc.coordinateContext).toEqual({
      coordinateSystem: "project",
      projectOrigin: { x: 0, y: 0, z: 0 },
      localOrigin: null,
      unitSystem: "metric",
      axisConvention: "x-along/y-transverse/z-up",
    });
    // half-cell expansion (gridBoundsFromHeightfield) + min/max elevation (NO_DATA除外)
    expect(doc.bounds).toEqual({
      minX: 84000 - 2.5,
      minY: -29600 - 2.5,
      maxX: 84000 + 3 * 5 + 2.5,
      maxY: -29600 + 2 * 5 + 2.5,
      minElevation: 110,
      maxElevation: 170,
    });
    expect(doc.surfaceReference).toBe("assets/terrain/test.sct1");
    expect(doc.assetReferences).toEqual(["assets/terrain/test.sct1"]);
    expect(result.elevationRange).toEqual({ minElevation: 110, maxElevation: 170 });
  });

  it("elevation range excludes the NO_DATA sentinel", () => {
    const hf = makeHf();
    expect(elevationRangeFromHeightfield(hf)).toEqual({ minElevation: 110, maxElevation: 170 });
    const empty = new Heightfield(
      { width: 4, height: 3, cellSize: 5, originX: 0, originY: 0, rowMajor: true },
      new Float32Array(12).fill(NO_DATA),
    );
    expect(() => elevationRangeFromHeightfield(empty)).toThrow("TER-EMPTY-ELEVATION");
    expect(() => buildTerrainDocument(makeInput({ heightfield: empty }))).toThrow("TER-EMPTY-ELEVATION");
  });

  it("SCT1 base64 asset decodes back to an equal Heightfield (roundtrip)", async () => {
    const result = await generateTerrain(makeInput());
    const restored = base64ToHeightfield(result.asset.base64);
    expect(restored.width).toBe(4);
    expect(restored.height).toBe(3);
    expect(restored.cellSize).toBe(5);
    expect(restored.originX).toBe(84000);
    expect(restored.originY).toBe(-29600);
    expect(restored.data[0]).toBe(NO_DATA);
    const source = makeHf();
    for (let k = 1; k < 12; k++) {
      expect(restored.data[k]).toBe(source.data[k]);
    }
  });

  it("checksum = plain sha256 over decoded SCT1 bytes (B-4 resolveAssetBytes と同一規約)", async () => {
    const result = await generateTerrain(makeInput());
    const bytes = base64ToBytes(result.asset.base64);
    expect(result.asset.size).toBe(bytes.length);
    expect(result.asset.size).toBe(serializeHeightfieldBinary(makeHf()).length);
    expect(result.asset.checksum).toBe(await sha256BytesHex(bytes));
    // B-4 の resolveAssetBytes は base64 デコード後のバイト列を plain sha256 で検証する
    const { sha256HexBytes } = await import("../../next/integration/siteContext/siteContextHash");
    expect(result.asset.checksum).toBe(sha256HexBytes(bytes));
  });

  it("pure generation has no network / browser dependency", async () => {
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn();
    (globalThis as { fetch: unknown }).fetch = mockFetch;
    try {
      const result = await generateTerrain(makeInput());
      expect(result.terrainDocument.bounds?.minElevation).toBe(110);
      expect(mockFetch).not.toHaveBeenCalled();
    } finally {
      (globalThis as { fetch: unknown }).fetch = originalFetch;
    }
    expect(typeof globalThis.indexedDB).toBe("undefined");
  });

  it("persists into a Project and survives parseProject validation", async () => {
    const result = await generateTerrain(makeInput());
    const project = createEmptyProject("terrain-test");
    const embedded = persistTerrain(project, result.terrainDocument, result.asset);

    const parsed = parseProject(embedded);
    expect(parsed.ok).toBe(true);

    const terrainData = embedded.modules.terrain.data as Record<string, unknown>;
    const issues = validateTerrainData(terrainData);
    expect(issues).toEqual([]);

    const extracted = extractTerrainDocument(embedded);
    expect(extracted).toEqual(result.terrainDocument);

    const manifest = extractTerrainAssetManifest(embedded);
    expect(manifest?.["assets/terrain/test.sct1"]).toMatchObject({
      path: "assets/terrain/test.sct1",
      checksum: result.asset.checksum,
      size: result.asset.size,
    });
    expect(manifest?.["assets/terrain/test.sct1"]?.base64).toBe(result.asset.base64);

    const verify = await verifyTerrainAssetChecksum(embedded);
    expect(verify.ok).toBe(true);
  });

  it("buildTerrainAsset / buildTerrainAssetManifest produce the manifest shape", async () => {
    const asset = await buildTerrainAsset(makeHf(), "assets/terrain/a.sct1");
    const manifest = buildTerrainAssetManifest(asset);
    expect(manifest).toEqual({ "assets/terrain/a.sct1": { ...asset } });
    expect(asset.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("persistTerrain fails closed on an invalid terrainDocument", () => {
    const project = createEmptyProject("invalid");
    const bad: TerrainDocument = {
      terrainId: "x",
      schemaVersion: "",
      source: { sourceType: "dem", sourceName: "x", importedAt: null },
      coordinateContext: {
        coordinateSystem: "project",
        projectOrigin: { x: 0, y: 0, z: 0 },
        localOrigin: null,
        unitSystem: "metric" as const,
        axisConvention: "x-along/y-transverse/z-up" as const,
      },
      bounds: null,
      surfaceReference: null,
      assetReferences: [],
    };
    expect(() => persistTerrain(project, bad, { path: "a", checksum: "0".repeat(64), size: 0, base64: "" })).toThrow(
      "TER-PERSIST-INVALID-DATA",
    );
  });
});