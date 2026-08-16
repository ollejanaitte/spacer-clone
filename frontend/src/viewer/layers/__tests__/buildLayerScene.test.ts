import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createMockUnifiedScene } from "../mock/mockScene";
import { applyLayerVisibility, buildLayerScene, LAYER_GROUP_NAMES } from "../buildLayerScene";

describe("buildLayerScene (V-2 skeleton)", () => {
  const model = createMockUnifiedScene();
  const result = buildLayerScene(model);

  it("creates one named group per layer", () => {
    expect(result.layerGroups["layer-terrain"]).toBeDefined();
    expect(result.layerGroups["layer-road"]).toBeDefined();
    expect(result.layerGroups["layer-superstructure"]).toBeDefined();
    expect(result.layerGroups["layer-bearing"]).toBeDefined();
    expect(result.layerGroups["layer-substructure"]).toBeDefined();
    expect(result.layerGroups["layer-existing-conditions"]).toBeDefined();
    expect(result.root.children.length).toBe(6);
    expect(LAYER_GROUP_NAMES["terrain"]).toBe("Terrain");
  });

  it("produces a terrain mesh with the expected vertex count", () => {
    const group = result.layerGroups["layer-terrain"];
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    const pos = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    const terrain = model.layers.find((l) => l.kind === "terrain");
    expect(terrain).toBeDefined();
    if (!terrain) return;
    const grid = terrain.data as { width: number; height: number };
    expect(pos.count).toBe(grid.width * grid.height);
  });

  it("renders road, superstructure, bearings, substructure and existing meshes", () => {
    expect(result.layerGroups["layer-road"].children.length).toBeGreaterThan(0);
    const superGroup = result.layerGroups["layer-superstructure"];
    // girders + deck + cross beams
    expect(superGroup.children.length).toBeGreaterThanOrEqual(3);
    expect(result.layerGroups["layer-bearing"].children.length).toBe(10);
    const subGroup = result.layerGroups["layer-substructure"];
    // 5 supports × (column + cap + foundation)
    expect(subGroup.children.length).toBe(15);
    expect(result.layerGroups["layer-existing-conditions"].children.length).toBeGreaterThanOrEqual(3);
  });

  it("positions meshes in render space using the domainToThree convention", () => {
    const bearingGroup = result.layerGroups["layer-bearing"];
    const first = bearingGroup.children[0] as THREE.Mesh;
    const bearing = model.layers.find((l) => l.kind === "bearing");
    expect(bearing).toBeDefined();
    if (!bearing) return;
    const firstData = (bearing.data as { bearings: readonly { center: { z: number } }[] }).bearings[0];
    // render y = elevation, so first bearing render y must equal deck-1.6
    expect(first.position.y).toBeCloseTo(firstData.center.z, 6);
  });

  it("computes finite scene bounds covering all layers", () => {
    expect(result.bounds.isEmpty()).toBe(false);
    const size = result.bounds.getSize(new THREE.Vector3());
    for (const v of [size.x, size.y, size.z]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });

  it("marks meshes as selectable with layer + entity metadata", () => {
    const roadGroup = result.layerGroups["layer-road"];
    const mesh = roadGroup.children[0] as THREE.Mesh;
    expect(mesh.userData.selectable).toBe(true);
    expect(mesh.userData.layerId).toBe("layer-road");
    expect(mesh.userData.kind).toBe("road");
    expect(mesh.userData.entityId).toBe("layer-road");
  });

  it("applyLayerVisibility hides and restores groups without rebuilding", () => {
    const hidden = { ...model, layers: model.layers.map((l) => ({ ...l, visible: false })) };
    applyLayerVisibility(result, hidden);
    for (const layer of hidden.layers) {
      expect(result.layerGroups[layer.id].visible).toBe(false);
    }
    const restored = { ...model, layers: model.layers.map((l) => ({ ...l, visible: true })) };
    applyLayerVisibility(result, restored);
    for (const layer of restored.layers) {
      expect(result.layerGroups[layer.id].visible).toBe(true);
    }
  });

  it("skips layers that are not ready or not visible", () => {
    const modelWithHidden = {
      ...model,
      layers: model.layers.map((l) => ({ ...l, visible: false })),
    };
    const partial = buildLayerScene(modelWithHidden);
    for (const layer of modelWithHidden.layers) {
      expect(partial.layerGroups[layer.id].children.length).toBe(0);
    }
  });

  it("buildLayerScene is idempotent over a fresh model", () => {
    const again = buildLayerScene(createMockUnifiedScene());
    expect(again.root.children.length).toBe(6);
    expect(again.layerGroups["layer-terrain"].children.length).toBe(1);
  });
});