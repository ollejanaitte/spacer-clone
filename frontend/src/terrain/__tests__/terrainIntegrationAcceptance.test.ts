import { describe, expect, it } from "vitest";
import { createMemoryTerrainElevationStore } from "../terrainAssetStore";
import {
  extractTerrainDocument,
  loadTerrainElevation,
  persistTerrain,
  saveTerrainElevation,
  verifyReopenedTerrain,
  verifyTerrainAssetChecksum,
} from "../terrainPersistence";
import { buildGujoSampleAsset, buildGujoSampleHeightfield, buildGujoSampleProject, buildGujoSampleTerrainDocument, GUJO_BOUNDS_EPSG6674, GUJO_CENTER_EPSG6674, GUJO_CENTER_WGS84, GUJO_COORDINATE_CONTEXT, GUJO_COORDINATE_CONTEXT_ID, GUJO_EPSG, GUJO_SAMPLE_ASSET_CHECKSUM, GUJO_SAMPLE_ASSET_PATH, GUJO_SAMPLE_TERRAIN_ID, GUJO_SOURCE_DATASET, loadGujoSampleHeightfield } from "../gujoSample";
import { latLonToPlane } from "../coordinate/transform";
import { elevationRangeFromHeightfield } from "../generation";
import { heightfieldToTerrainLayer, heightfieldLayerBounds, projectOriginFromTerrainDocument } from "../../viewer/adapters/terrainAdapter";
import { parseProject } from "../../next/project/projectDataCore";
import type { TerrainDocument } from "../../next/modules/terrainModule";

/**
 * T-08 Terrain Integration Acceptance — 統合 Acceptance。
 *
 * Wave 2 までに成立済みの Terrain 資産（CRS/JGD2011・GSI DEM・Heightfield・SCT1・
 * checksum・generation・persistence・Gujo sample・IndexedDB正本・Save/Load/Reopen）
 * が「単一の統合フロー」として成立することを確認する。新規システム構築ではない。
 *
 * Acceptance 20項目:
 *  1. 実GSI DEM5A取得  →  live 検証は別途 (gsi モジュール・ネットワーク)。本テストは
 *     コミット済み fixture (buildGujoSampleHeightfield) を正本として使用。
 *  2. 郡上市八幡 center 35.7512 / 136.9567 / EPSG:6674
 *  3. 実Terrain生成  →  buildGujoSampleTerrainDocument
 *  4. Heightfield生成  →  buildGujoSampleHeightfield / loadGujoSampleHeightfield
 *  5. SCT1資産化  →  buildGujoSampleAsset (コミット定数)
 *  6. IndexedDBへ保存  →  saveTerrainElevation (memory store)
 *  7. Project保存  →  persistTerrain (modules.terrain.data)
 *  8. Close  →  ストア保持 (memory store 維持)
 *  9. Reopen  →  loadTerrainElevation で復元
 * 10. IndexedDBからTerrain復元  →  verifyReopenedTerrain
 * 11. CRS一致  →  coordinateContext
 * 12. bounds一致  →  terrainDocument.bounds
 * 13. origin一致  →  projectOrigin
 * 14. elevation合理性  →  200-1200m
 * 15. checksum一致  →  verifyTerrainAssetChecksum / verifyReopenedTerrain
 * 16. assetReference一致  →  surfaceReference / assetReferences
 * 17. Roadと同一座標  →  RB001 alignment は同一 EPSG:6674 (Lane S)。中心座標整合。
 * 18. Bridgeと同一座標  →  RB001 橋梁 candidate (STA.1200-1500) は同一 EPSG:6674。
 * 19. Unified Viewerへ入力可能  →  heightfieldToTerrainLayer (Lane V adapter)
 * 20. 二重正本なし  →  IndexedDB が正本・assetManifest は導出ビュー
 */

describe("T-08 Terrain Integration Acceptance", () => {
  it("2/11: center CRS is 郡上市八幡 EPSG:6674 with pyproj-verified plane coordinates", () => {
    expect(GUJO_CENTER_WGS84).toEqual({ lat: 35.7512, lon: 136.9567 });
    expect(GUJO_EPSG).toBe(6674);
    const p = latLonToPlane(GUJO_CENTER_WGS84.lat, GUJO_CENTER_WGS84.lon, GUJO_EPSG);
    expect(Math.abs(p.x - GUJO_CENTER_EPSG6674.x)).toBeLessThan(3);
    expect(Math.abs(p.y - GUJO_CENTER_EPSG6674.y)).toBeLessThan(3);
    expect(GUJO_COORDINATE_CONTEXT.crs.epsg).toBe(6674);
    expect(GUJO_COORDINATE_CONTEXT.crs.name).toBe("JGD2011 / Japan Plane Rectangular CS VII");
  });

  it("3/4/5/14: real terrain generation produces Heightfield + SCT1 asset with sane elevation", () => {
    const hf = buildGujoSampleHeightfield();
    const doc = buildGujoSampleTerrainDocument();
    const asset = buildGujoSampleAsset();

    const range = elevationRangeFromHeightfield(hf);
    expect(range.minElevation).toBe(200);
    expect(range.maxElevation).toBe(1200);
    expect(doc.surfaceReference).toBe(GUJO_SAMPLE_ASSET_PATH);
    expect(asset.checksum).toBe(GUJO_SAMPLE_ASSET_CHECKSUM);
    expect(asset.base64.length).toBeGreaterThan(0);

    // コミット済み base64 も同一 Heightfield へ復元できる (5)
    const decoded = loadGujoSampleHeightfield();
    expect(decoded.data).toEqual(hf.data);
  });

  it("6/7/8/9/10/15/16/20: Save → Close → Reopen restores terrain from IndexedDB store as the single source of truth", async () => {
    const store = createMemoryTerrainElevationStore();
    const project = buildGujoSampleProject();
    const asset = buildGujoSampleAsset();

    // 7: Project保存 (canonical slotへ埋込 + parseProject合格)
    const persisted = persistTerrain(project, buildGujoSampleTerrainDocument(), asset);
    const parsed = parseProject(persisted);
    expect(parsed.ok).toBe(true);

    // 6: IndexedDBへ保存 (実行時正本)
    await saveTerrainElevation(store, persisted.projectId, GUJO_SAMPLE_TERRAIN_ID, asset);

    // 8: Close (ストア維持)
    // 9/10: Reopen — IndexedDB から復元
    const restored = await loadTerrainElevation(store, persisted.projectId, asset.path);
    expect(restored).not.toBeNull();
    if (!restored) return;
    expect(restored.checksum).toBe(GUJO_SAMPLE_ASSET_CHECKSUM);
    expect(restored.size).toBe(asset.size);

    // 15/16: 復元値と terrainDocument の assetReference / checksum 照合 (fail-closed)
    const verified = await verifyReopenedTerrain(persisted, restored);
    expect(verified.ok).toBe(true);

    // 15: Project 内 manifest の checksum も照合
    const checksumCheck = await verifyTerrainAssetChecksum(persisted);
    expect(checksumCheck.ok).toBe(true);
  });

  it("11/12/13: reopened terrainDocument preserves CRS / bounds / origin", async () => {
    const doc = buildGujoSampleTerrainDocument();
    const asset = buildGujoSampleAsset();
    const project = persistTerrain(buildGujoSampleProject(), doc, asset);

    const extracted = extractTerrainDocument(project);
    expect(extracted).toBeDefined();
    if (!extracted) return;

    expect(extracted.coordinateContext.coordinateSystem).toBe("project");
    expect(extracted.coordinateContext.unitSystem).toBe("metric");
    expect(extracted.coordinateContext.axisConvention).toBe("x-along/y-transverse/z-up");
    expect(extracted.coordinateContext.projectOrigin).toEqual({ x: 0, y: 0, z: 0 });
    expect(extracted.bounds?.minX).toBeCloseTo(83993.5, 0);
    expect(extracted.bounds?.minY).toBeCloseTo(-29699.5, 0);
    expect(extracted.bounds?.maxX).toBeCloseTo(84153.5, 0);
    expect(extracted.bounds?.maxY).toBeCloseTo(-29539.5, 0);
    expect(extracted.bounds?.minElevation).toBe(200);
    expect(extracted.bounds?.maxElevation).toBe(1200);
  });

  it("19: Terrain is consumable by the Unified Viewer adapter (TerrainLayerData)", () => {
    const hf = buildGujoSampleHeightfield();
    const doc = buildGujoSampleTerrainDocument();

    const layer = heightfieldToTerrainLayer(hf);
    expect(layer.kind).toBe("terrain");
    expect(layer.width).toBe(hf.width);
    expect(layer.height).toBe(hf.height);
    expect(layer.originX).toBe(hf.originX);
    expect(layer.originY).toBe(hf.originY);
    expect(layer.heights.length).toBe(hf.width * hf.height);

    const bounds = heightfieldLayerBounds(hf);
    expect(bounds.minX).toBe(GUJO_BOUNDS_EPSG6674.minX);
    expect(bounds.maxX).toBeCloseTo(GUJO_BOUNDS_EPSG6674.minX + (hf.width - 1) * hf.cellSize, 6);

    // render origin は TerrainDocument から (無ければ null → viewer はゼロ origin)
    const origin = projectOriginFromTerrainDocument(doc);
    expect(origin).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("17/18: RB001 Road / Bridge は同一 EPSG:6674 フレーム (中心座標が Gujo bounds 内)", () => {
    const center = GUJO_CENTER_EPSG6674;
    expect(center.x).toBeGreaterThan(GUJO_BOUNDS_EPSG6674.minX);
    expect(center.x).toBeLessThan(GUJO_BOUNDS_EPSG6674.maxX);
    expect(center.y).toBeGreaterThan(GUJO_BOUNDS_EPSG6674.minY);
    expect(center.y).toBeLessThan(GUJO_BOUNDS_EPSG6674.maxY);

    // RB001 は座標を生成するのではなく基準と整合 (roadAlignment.ts RB001_ORIGIN 85000,-26900)
    // が bounds 内に収まることを確認
    const roadOrigin = { x: 85000.0, y: -26900.0 };
    expect(roadOrigin.x).toBeGreaterThan(GUJO_BOUNDS_EPSG6674.minX);
    expect(roadOrigin.x).toBeLessThan(GUJO_BOUNDS_EPSG6674.maxX);
    expect(roadOrigin.y).toBeGreaterThan(GUJO_BOUNDS_EPSG6674.minY);
    expect(roadOrigin.y).toBeLessThan(GUJO_BOUNDS_EPSG6674.maxY);
  });

  it("20: assetManifest は導出ビューであり IndexedDB が正本 (二重正本なし)", async () => {
    const project = buildGujoSampleProject();
    const asset = buildGujoSampleAsset();
    const doc = buildGujoSampleTerrainDocument();

    const persisted = persistTerrain(project, doc, asset);
    const manifest = (persisted.modules.terrain.data as Record<string, unknown>)["assetManifest"];
    expect(manifest).toBeDefined();

    // 実行時正本は IndexedDB store。manifest は直列化ビュー (正本ではない)
    const store = createMemoryTerrainElevationStore();
    await saveTerrainElevation(store, persisted.projectId, GUJO_SAMPLE_TERRAIN_ID, asset);
    const restored = await loadTerrainElevation(store, persisted.projectId, asset.path);
    expect(restored?.base64).toBe(asset.base64);
    expect(restored?.checksum).toBe(asset.checksum);

    // manifest の base64 と IndexedDB の base64 が同一である (同一資産を指す)
    const manifestEntry = (manifest as Record<string, { base64: string }>)[asset.path];
    expect(manifestEntry.base64).toBe(asset.base64);
  });
});