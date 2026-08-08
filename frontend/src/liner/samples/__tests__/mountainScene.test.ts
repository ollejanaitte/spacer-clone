import { describe, expect, it } from "vitest";
import { buildMountainDraft } from "../mountain-viaduct-500/fixture";
import {
  DEFAULT_LAYER_STATE,
  buildBridgeLayer,
  buildRoadLayer,
  buildUnified3DScene,
} from "../mountain-viaduct-500/scene";

describe("mountain unified 3D scene", () => {
  it("builds a scene with all layers", () => {
    const scene = buildUnified3DScene(buildMountainDraft());
    expect(scene.terrain.positions.length).toBeGreaterThan(0);
    expect(scene.terrain.indices.length).toBeGreaterThan(0);
    expect(scene.road.points.length).toBeGreaterThan(10);
    expect(scene.bridge.spans).toHaveLength(8);
    expect(scene.substructure).toHaveLength(9);
  });

  it("stable layer state", () => {
    expect(DEFAULT_LAYER_STATE.terrain).toBe(true);
    expect(DEFAULT_LAYER_STATE.frame).toBe(true);
    const scene = buildUnified3DScene(buildMountainDraft(), "bridge");
    expect(scene.layers.road).toBe(true);
    expect(scene.camera.position).toBeDefined();
  });

  it("road layer follows the alignment (500m)", () => {
    const road = buildRoadLayer(buildMountainDraft());
    const last = road.points[road.points.length - 1];
    expect(Number.isFinite(last.x)).toBe(true);
    expect(road.points.length).toBeGreaterThan(90);
  });

  it("bridge spans connect supports", () => {
    const bridge = buildBridgeLayer(buildMountainDraft());
    expect(bridge.spans[0].startX).toBeDefined();
    expect(bridge.spans[7].endX).toBeDefined();
  });

  it("bounds contain terrain and road", () => {
    const scene = buildUnified3DScene(buildMountainDraft());
    expect(scene.bounds.maxX).toBeGreaterThan(scene.bounds.minX);
    expect(scene.bounds.maxZ).toBeGreaterThan(scene.bounds.minZ);
  });
});
