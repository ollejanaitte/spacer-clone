import { describe, expect, it } from "vitest";
import { buildRealGujoReferenceScene, buildRealGujoRoadScene, buildRealGujoTerrainScene } from "../../../../viewer/adapters/realScene";
import { buildRb001Analysis } from "../analysis";
import { RB001_BRIDGE_ID } from "../bridgeArrangement";
import { buildRb001Superstructure } from "../superstructure";
import { buildRb001Substructure } from "../substructure";

/**
 * S-08 CIM / Integrated 3D — Reference Business 001 の統合3D化。
 *
 * RB001 を Gujo Terrain + Road + Bridge + Superstructure + Bearings +
 * Substructure で統合3D化する。Lane V の public contract
 * (UnifiedViewerModel / realScene) に従い、既存シーン構築を再実装しない。
 * 解析 (S-7) の出力は NOT_RUN (架空結果なし) であり、3D は表示モデルとして
 * 統合可能なことのみを検証する。
 */
describe("S-8 Integrated 3D (RB001, Lane V public contract)", () => {
  it("full Reference Business 001 scene contains all six layers", () => {
    const model = buildRealGujoReferenceScene();
    const kinds = model.layers.map((l) => l.kind);
    expect(kinds).toEqual(
      expect.arrayContaining(["terrain", "road", "superstructure", "bearing", "substructure"]),
    );
    expect(model.worldBasis.horizontalCrs?.identifier).toBe("6674");
  });

  it("layers are positioned in one canonical EPSG:6674 frame", () => {
    const model = buildRealGujoReferenceScene();
    for (const layer of model.layers) {
      expect(Number.isFinite(layer.bounds.minX) && Number.isFinite(layer.bounds.minY)).toBe(true);
      expect(layer.bounds.maxX).toBeGreaterThan(layer.bounds.minX);
      expect(layer.bounds.maxY).toBeGreaterThan(layer.bounds.minY);
    }
    const terrain = model.layers.find((l) => l.kind === "terrain");
    const road = model.layers.find((l) => l.kind === "road");
    const superstructure = model.layers.find((l) => l.kind === "superstructure");
    expect(terrain && road && superstructure).toBeTruthy();
    if (!terrain || !road || !superstructure) return;
    // 地形・道路・上部工の bounds が重なる (同一座標系)
    expect(superstructure.bounds.minX).toBeGreaterThanOrEqual(terrain.bounds.minX - 500);
    expect(superstructure.bounds.maxX).toBeLessThanOrEqual(terrain.bounds.maxX + 500);
  });

  it("road scene (terrain + road) and terrain-only scene are independently buildable", () => {
    const roadScene = buildRealGujoRoadScene();
    expect(roadScene.layers.map((l) => l.kind)).toEqual(
      expect.arrayContaining(["terrain", "road"]),
    );
    const terrainScene = buildRealGujoTerrainScene();
    expect(terrainScene.layers.map((l) => l.kind)).toEqual(["terrain"]);
  });

  it("RB001 structural documents are mutually consistent (S-8 inputs)", () => {
    const superDoc = buildRb001Superstructure();
    const subDoc = buildRb001Substructure();
    const analysis = buildRb001Analysis();
    expect(superDoc.bridgeLayoutReference?.bridgeId).toBe(RB001_BRIDGE_ID);
    expect(subDoc.bridgeLayoutReference?.bridgeId).toBe(RB001_BRIDGE_ID);
    // S-7 解析は NOT_RUN (架空結果なし) を維持
    expect(analysis.document.analysisStatus).toBe("NOT_RUN");
  });
});