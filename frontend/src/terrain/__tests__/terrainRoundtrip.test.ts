import { describe, expect, it, vi } from "vitest";
import { NO_DATA, Heightfield } from "../heightfield";
import { createEmptyProject } from "../../next/project/projectDataCore";
import { buildTerrainDocument, buildTerrainAsset } from "../generation";
import type { TerrainDocument, TerrainSourceMetadata } from "../../next/modules/terrainModule";
import { base64ToHeightfield } from "../sct1";
import {
  buildTerrainProject,
  extractTerrainDocument,
  roundtrip,
  storeRoundtrip,
  terrainDocumentsEqual,
} from "../terrainRoundtrip";
import { extractTerrainAsset } from "../terrainPersistence";
import { loadTerrainElevation } from "../terrainPersistence";
import { createMemoryTerrainElevationStore } from "../terrainAssetStore";
import {
  buildGujoSampleAsset,
  buildGujoSampleTerrainDocument,
} from "../gujoSample";

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

const SOURCE: TerrainSourceMetadata = {
  sourceType: "dem",
  sourceName: "roundtrip-source",
  importedAt: "2026-08-16T00:00:00.000Z",
};

describe("T-7 Terrain Save / Load / Reopen roundtrip", () => {
  it("synthetic terrain survives build → serialize(JSON) → parse → extract with identical fields", async () => {
    const hf = makeHf();
    const projectOrigin = { x: 123, y: -456, z: 7 };
    const assetPath = "assets/terrain/roundtrip.sct1";
    const doc: TerrainDocument = buildTerrainDocument({
      terrainId: "terrain-roundtrip",
      heightfield: hf,
      source: SOURCE,
      projectOrigin,
      assetPath,
    });
    const asset = await buildTerrainAsset(hf, assetPath);

    const project = createEmptyProject("roundtrip");
    const embedded = buildTerrainProject(project, doc, asset);
    const result = await roundtrip(project, doc, asset);
    expect(result.ok).toBe(true);
    expect(result.documentEqual).toBe(true);
    expect(result.assetChecksumVerified).toBe(true);
    expect(result.differences).toEqual([]);
    expect(result.issues).toEqual([]);
    expect(result.terrainDocument).toEqual(doc);

    // field-group assertions（CRS/bounds/origin/elevation/asset reference の同一性）
    const restored = result.terrainDocument!;
    expect(restored.terrainId).toBe(doc.terrainId);
    expect(restored.schemaVersion).toBe(doc.schemaVersion);
    expect(restored.source).toEqual(doc.source);
    expect(restored.coordinateContext).toEqual(doc.coordinateContext);
    expect(restored.bounds).toEqual(doc.bounds);
    expect(restored.bounds?.minElevation).toBe(110);
    expect(restored.bounds?.maxElevation).toBe(170);
    expect(restored.surfaceReference).toBe(assetPath);
    expect(restored.assetReferences).toEqual([assetPath]);

    // asset manifest から SCT1 を復元 → 元 Heightfield と一致
    const manifestAsset = extractTerrainAsset(embedded);
    expect(manifestAsset?.checksum).toBe(asset.checksum);
    const hf2 = base64ToHeightfield(manifestAsset!.base64);
    expect(hf2.data).toEqual(hf.data);
    expect(hf2.originX).toBe(hf.originX);
    expect(hf2.originY).toBe(hf.originY);
    expect(hf2.cellSize).toBe(hf.cellSize);
    expect(embedded.modules.terrain).toBeDefined();
  });

  it("roundtrip is deterministic and pure (node env, no network / browser APIs)", async () => {
    const hf = makeHf();
    const doc = buildTerrainDocument({
      terrainId: "terrain-pure",
      heightfield: hf,
      source: SOURCE,
      projectOrigin: { x: 0, y: 0, z: 0 },
      assetPath: "assets/terrain/pure.sct1",
    });
    const asset = await buildTerrainAsset(hf, "assets/terrain/pure.sct1");

    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn();
    (globalThis as { fetch: unknown }).fetch = mockFetch;
    try {
      const a = await roundtrip(createEmptyProject("p1"), doc, asset);
      const b = await roundtrip(createEmptyProject("p2"), doc, asset);
      expect(a.ok).toBe(true);
      expect(b.ok).toBe(true);
      expect(a.terrainDocument).toEqual(b.terrainDocument);
      expect(mockFetch).not.toHaveBeenCalled();
    } finally {
      (globalThis as { fetch: unknown }).fetch = originalFetch;
    }
    expect(typeof globalThis.indexedDB).toBe("undefined");
  });

  it("Gujo Hachiman fixture terrain survives the full roundtrip", async () => {
    const project = createEmptyProject("gujo");
    const result = await roundtrip(project, buildGujoSampleTerrainDocument(), buildGujoSampleAsset());
    expect(result.ok).toBe(true);
    expect(result.documentEqual).toBe(true);
    expect(result.assetChecksumVerified).toBe(true);
    expect(result.terrainDocument?.bounds?.minElevation).toBe(200);
    expect(result.terrainDocument?.bounds?.maxElevation).toBe(1200);
    expect(result.terrainDocument?.coordinateContext.projectOrigin).toEqual({ x: 0, y: 0, z: 0 });

    const restored = extractTerrainDocument(result.project);
    const cmp = terrainDocumentsEqual(buildGujoSampleTerrainDocument(), restored);
    expect(cmp.equal).toBe(true);
    expect(cmp.differences).toEqual([]);
  });

  it("terrainDocumentsEqual detects differences (fail-closed comparison)", async () => {
    const hf = makeHf();
    const doc = buildTerrainDocument({
      terrainId: "terrain-a",
      heightfield: hf,
      source: SOURCE,
      projectOrigin: { x: 0, y: 0, z: 0 },
      assetPath: "assets/terrain/a.sct1",
    });
    const other: TerrainDocument = { ...doc, terrainId: "terrain-b" };
    const cmp = terrainDocumentsEqual(doc, other);
    expect(cmp.equal).toBe(false);
    expect(cmp.differences).toContain("terrainId");
  });

  it("Save → Close → Reopen restores terrain from the IndexedDB (memory) store as the runtime source of truth", async () => {
    const store = createMemoryTerrainElevationStore();
    const hf = makeHf();
    const doc = buildTerrainDocument({
      terrainId: "terrain-store",
      heightfield: hf,
      source: SOURCE,
      projectOrigin: { x: 123, y: -456, z: 7 },
      assetPath: "assets/terrain/store.sct1",
    });
    const asset = await buildTerrainAsset(hf, "assets/terrain/store.sct1");
    const project = createEmptyProject("store-roundtrip");

    // Save → Reopen: storeRoundtrip が store を正本として保存し復元・検証する
    const result = await storeRoundtrip(store, project, doc, asset);
    expect(result.ok).toBe(true);
    expect(result.checksumVerified).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.restoredAsset?.path).toBe("assets/terrain/store.sct1");
    expect(result.restoredAsset?.checksum).toBe(asset.checksum);

    // store が正本であること: 別インスタンス経由でも同じ標高データを復元できる
    const restored = await loadTerrainElevation(store, project.projectId, asset.path);
    expect(restored?.base64).toBe(asset.base64);
    expect(restored?.checksum).toBe(asset.checksum);
    expect(restored?.size).toBe(asset.size);
  });
});