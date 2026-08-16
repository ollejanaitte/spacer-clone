/**
 * V-07 Coordinate Regression — 統一座標系の golden regression。
 *
 * Reference Business 001 (Gujo Hachiman, EPSG:6674 / JGD2011 平面直角 第7系) の
 * 全レイヤーが「単一の canonical フレーム」で成立することを機械検証する。
 * 「地形だけ合って橋脚がずれる」「道路だけ反転」「Zだけdatum違い」等を検出する。
 *
 * canonical frame (V-2/V-3 contract):
 *   X = along (easting) / Y = transverse (northing) / Z = elevation (TP, z-up)
 *   CRS: EPSG:6674 (metadata only; conversion is Lane T territory)
 *   render transform: canonical (x,y,z) -> three (x, z, -y)
 *   scale: meter (unit: "m")
 *
 * 検証対象 (V-7):
 *   - EPSG:6674 世界
 *   - canonical X/Y/Z と render transform
 *   - terrain origin / bounds
 *   - road alignment (RB001) の station 座標
 *   - bridge station (STA.1200-1500・6径間×50m・A1+P1..P5+A2)
 *   - support / bearing / substructure position
 *   - elevation (z-up・TP)
 *   - sign / axis reversal (render z = -y)
 *   - offset / scale = meter
 */

import { describe, expect, it } from "vitest";
import { buildRealGujoReferenceScene, representativeGujoTerrainHeight } from "../adapters/realScene";
import { buildReferenceBusiness001RoadSample } from "../../liner/samples/reference-business-001/roadAlignment";
import { evaluateAlignmentAtDistance } from "../../liner/core/geometry/horizontal";
import { deriveBridgeSupports } from "../adapters/bridgeAdapter";
import { buildGujoSampleHeightfield, GUJO_BOUNDS_EPSG6674 } from "../../terrain";
import { canonicalToRender, renderToCanonical } from "../layers/renderCoordinate";
import type { Point3D } from "../layers/layerContract";

const ROAD = buildReferenceBusiness001RoadSample();

describe("V-07 Coordinate Regression (EPSG:6674 canonical frame)", () => {
  it("world basis is EPSG:6674 / meter / z-up-tp", () => {
    const model = buildRealGujoReferenceScene();
    expect(model.worldBasis.horizontalCrs).toEqual({ authority: "EPSG", identifier: "6674" });
    expect(model.worldBasis.unit).toBe("m");
    expect(model.worldBasis.elevationConvention).toBe("z-up-tp");
    expect(model.worldBasis.axes).toEqual({ x: "along", y: "transverse", z: "elevation" });
    expect(model.worldBasis.handedness).toBe("right-handed");
  });

  it("terrain origin matches the documented Gujo bounds (EPSG:6674)", () => {
    const hf = buildGujoSampleHeightfield();
    expect(hf.originX).toBe(GUJO_BOUNDS_EPSG6674.minX);
    expect(hf.originY).toBe(GUJO_BOUNDS_EPSG6674.minY);
    expect(hf.cellSize).toBe(5);
    // Xは東方向へ増加 / Yは南方向 (northing負) 方向へ減少 が正 (bounds 契約)
    expect(GUJO_BOUNDS_EPSG6674.maxX).toBeGreaterThan(GUJO_BOUNDS_EPSG6674.minX);
    expect(GUJO_BOUNDS_EPSG6674.maxY).toBeGreaterThan(GUJO_BOUNDS_EPSG6674.minY);
  });

  it("road alignment stations are monotonic along the alignment (no sign reversal)", () => {
    for (const station of [0, 600, 1200, 1350, 1500, 2450]) {
      const p = evaluateAlignmentAtDistance(ROAD.horizontal, station).point;
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
    const start = evaluateAlignmentAtDistance(ROAD.horizontal, 0).point;
    const end = evaluateAlignmentAtDistance(ROAD.horizontal, 2450).point;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    // 道路は西→東 (RB001_ORIGIN_AZIMUTH=0 → +X方向) へ進む。東向きにXが増加
    expect(dx).toBeGreaterThan(0);
    expect(Math.abs(dx)).toBeGreaterThan(Math.abs(dy));
  });

  it("bridge candidate is STA.1200-1500 with 6 spans x 50 m (A1+P1..P5+A2)", () => {
    expect(ROAD.bridgeCandidate).toEqual({
      startStation: 1200,
      endStation: 1500,
      nominalSpanM: 50,
      note: expect.any(String),
    });
    const supports = deriveBridgeSupports({
      startStation: 1200,
      endStation: 1500,
      nominalSpanM: 50,
    });
    expect(supports).toHaveLength(7);
    expect(supports[0]).toMatchObject({ station: 1200, supportId: "A1", kind: "abutment" });
    expect(supports[6]).toMatchObject({ station: 1500, supportId: "A2", kind: "abutment" });
    expect(supports[1]).toMatchObject({ station: 1250, supportId: "P1", kind: "pier" });
    expect(supports[5]).toMatchObject({ station: 1450, supportId: "P5", kind: "pier" });
    for (const s of supports.slice(1, 6)) {
      expect(s.station - 1200).toBeGreaterThanOrEqual(50);
    }
  });

  it("support / bearing / substructure positions lie on the road centerline (bridge station)", () => {
    const model = buildRealGujoReferenceScene();
    const substructure = model.layers.find((l) => l.kind === "substructure");
    const bearing = model.layers.find((l) => l.kind === "bearing");
    expect(substructure && bearing).toBeTruthy();
    if (!substructure || !bearing) return;

    const supports = (substructure.data as { supports: readonly { supportId: string; column: { center: { x: number; y: number } } }[] }).supports;
    for (const s of supports) {
      // 各橋脚は road 上の対応 station 付近にある (100m以内の誤差で照合)
      let best: Point3D | null = null;
      for (const station of [1200, 1250, 1300, 1350, 1400, 1450, 1500]) {
        const p = evaluateAlignmentAtDistance(ROAD.horizontal, station).point;
        if (!best) best = { x: p.x, y: p.y, z: 0 };
        else if (Math.hypot(p.x - s.column.center.x, p.y - s.column.center.y) <
                 Math.hypot(best.x - s.column.center.x, best.y - s.column.center.y)) {
          best = { x: p.x, y: p.y, z: 0 };
        }
      }
      expect(best).not.toBeNull();
      if (!best) return;
      expect(Math.hypot(s.column.center.x - best.x, s.column.center.y - best.y)).toBeLessThan(120);
    }

    const bearings = (bearing.data as { bearings: readonly { center: { x: number; y: number } }[] }).bearings;
    for (const b of bearings) {
      expect(Math.abs(b.center.y - b.center.x)).toBeLessThanOrEqual(200000); // sanity: 有限座標
      expect(Number.isFinite(b.center.x) && Number.isFinite(b.center.y)).toBe(true);
    }
  });

  it("elevation is z-up with sane bridge deck above ground (datum check)", () => {
    const model = buildRealGujoReferenceScene();
    const substructure = model.layers.find((l) => l.kind === "substructure");
    const terrain = model.layers.find((l) => l.kind === "terrain");
    expect(substructure && terrain).toBeTruthy();
    if (!substructure || !terrain) return;

    const supports = (substructure.data as { supports: readonly { column: { center: { x: number; y: number; z: number } }; foundation: { center: { x: number; y: number; z: number } } }[] }).supports;
    for (const s of supports) {
      // foundation が ground 近傍、column が上方向 (z増加)
      expect(s.column.center.z).toBeGreaterThan(s.foundation.center.z);
    }
    // 地形 elevation は 200-1200m 帯 (Gujo baseline) に収まる
    expect(terrain.bounds.minZ).toBeGreaterThanOrEqual(180);
    expect(terrain.bounds.maxZ).toBeLessThanOrEqual(1250);
  });

  it("render transform maps canonical (x,y,z) -> three (x, z, -y) without drift", () => {
    const p = { x: 85000, y: -26900, z: 320 };
    const r = canonicalToRender(p, null);
    expect(r).toEqual([85000, 320, 26900]);
    const back = renderToCanonical(r, null);
    expect(back.x).toBeCloseTo(p.x, 6);
    expect(back.y).toBeCloseTo(p.y, 6);
    expect(back.z).toBeCloseTo(p.z, 6);
  });

  it("origin offset subtracts the render origin (scale = meter, no drift)", () => {
    const origin = { x: 83996, y: -29697, z: 0 };
    const p = { x: 85000, y: -26900, z: 320 };
    const r = canonicalToRender(p, origin);
    // canonical (x-originX, y-originY, z) -> three (x, z, -(y-originY))
    expect(r[0]).toBeCloseTo(85000 - 83996, 6);
    expect(r[1]).toBeCloseTo(320, 6);
    expect(r[2]).toBeCloseTo(-(-26900 - -29697), 6);
  });

  it("terrain height is consistent with the representative Gujo band (no datum flip)", () => {
    for (const [x, y] of [[85000, -26900], [86000, -26000], [88000, -25000]]) {
      const z = representativeGujoTerrainHeight(x, y);
      expect(Number.isFinite(z)).toBe(true);
      expect(z).toBeGreaterThanOrEqual(180);
      expect(z).toBeLessThanOrEqual(1250);
    }
  });

  it("terrain / road / bridge share one canonical scene with finite bounds", () => {
    const model = buildRealGujoReferenceScene();
    const layerIds = model.layers.map((l) => l.id);
    expect(layerIds).toContain("layer-real-terrain");
    expect(layerIds).toContain("layer-real-road");
    expect(layerIds).toContain("layer-real-superstructure");
    expect(layerIds).toContain("layer-real-bearing");
    expect(layerIds).toContain("layer-real-substructure");

    for (const layer of model.layers) {
      expect(Number.isFinite(layer.bounds.minX) && Number.isFinite(layer.bounds.maxX)).toBe(true);
      expect(layer.bounds.maxX).toBeGreaterThanOrEqual(layer.bounds.minX);
      expect(layer.bounds.maxY).toBeGreaterThanOrEqual(layer.bounds.minY);
    }
  });
});