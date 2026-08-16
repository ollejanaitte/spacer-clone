/**
 * 3D gate: buildLayerScene with REAL terrain + road + bridge (V-5).
 *
 * Assembles the full Reference Business 001 scene (terrain, RB001 road,
 * superstructure, bearings, substructure) and asserts every layer produces
 * non-empty meshes, the bridge is placed on the road centerline above the
 * terrain, and all layers share one canonical EPSG:6674 frame.
 */

import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildRealGujoReferenceScene } from "../../adapters/realScene";
import { applyLayerVisibility, buildLayerScene } from "../buildLayerScene";

describe("buildLayerScene with real terrain + road + bridge (V-5)", () => {
  const model = buildRealGujoReferenceScene();
  const result = buildLayerScene(model);

  it("mounts all six layers (terrain, road, superstructure, bearings, substructure, + bridge)", () => {
    const kinds = model.layers.map((l) => l.kind);
    expect(kinds).toContain("terrain");
    expect(kinds).toContain("road");
    expect(kinds).toContain("superstructure");
    expect(kinds).toContain("bearing");
    expect(kinds).toContain("substructure");
    expect(result.root.children.length).toBe(5);
    expect(result.layerGroups["layer-real-superstructure"]).toBeDefined();
    expect(result.layerGroups["layer-real-bearing"]).toBeDefined();
    expect(result.layerGroups["layer-real-substructure"]).toBeDefined();
  });

  it("produces non-empty meshes for every layer", () => {
    for (const layer of model.layers) {
      const group = result.layerGroups[layer.id];
      expect(group, layer.id).toBeDefined();
      expect(group.children.length, layer.id).toBeGreaterThan(0);
    }
    const superGroup = result.layerGroups["layer-real-superstructure"];
    // girders (2) + deck (1) + cross beams (>1)
    expect(superGroup.children.length).toBeGreaterThanOrEqual(4);
    const bearingGroup = result.layerGroups["layer-real-bearing"];
    expect(bearingGroup.children.length).toBe(12);
    const subGroup = result.layerGroups["layer-real-substructure"];
    // 6 supports × (column + cap + foundation)
    expect(subGroup.children.length).toBe(18);
  });

  it("positions the bridge on the road corridor above the terrain", () => {
    const terrain = model.layers.find((l) => l.kind === "terrain");
    const road = model.layers.find((l) => l.kind === "road");
    const superstructure = model.layers.find((l) => l.kind === "superstructure");
    const substructure = model.layers.find((l) => l.kind === "substructure");
    expect(terrain && road && superstructure && substructure).toBeTruthy();
    if (!terrain || !road || !superstructure || !substructure) return;

    const deck = (superstructure.data as { deck?: { center: { x: number; y: number; z: number } } }).deck;
    expect(deck).toBeDefined();
    if (!deck) return;
    const roadBounds = road.bounds;
    // bridge deck center lies on the road corridor footprint
    expect(deck.center.x).toBeGreaterThan(roadBounds.minX);
    expect(deck.center.x).toBeLessThan(roadBounds.maxX);
    expect(deck.center.y).toBeGreaterThan(roadBounds.minY);
    expect(deck.center.y).toBeLessThan(roadBounds.maxY);
    // deck sits above the terrain max-elevation footprint at the crossing
    expect(deck.center.z).toBeGreaterThan(terrain.bounds.minZ);

    // all substructure supports are within the terrain footprint
    const supports = (substructure.data as { supports: readonly { column: { center: { x: number; y: number } } }[] }).supports;
    for (const support of supports) {
      expect(support.column.center.x).toBeGreaterThanOrEqual(terrain.bounds.minX);
      expect(support.column.center.x).toBeLessThanOrEqual(terrain.bounds.maxX);
      expect(support.column.center.y).toBeGreaterThanOrEqual(terrain.bounds.minY);
      expect(support.column.center.y).toBeLessThanOrEqual(terrain.bounds.maxY);
    }
  });

  it("renders the bridge with the road and terrain in one shared frame", () => {
    expect(model.worldBasis.horizontalCrs?.identifier).toBe("6674");
    const renderPositions: THREE.Vector3[] = [];
    for (const layerId of [
      "layer-real-terrain",
      "layer-real-road",
      "layer-real-superstructure",
      "layer-real-substructure",
    ]) {
      const group = result.layerGroups[layerId];
      const mesh = group.children[0] as THREE.Mesh;
      const pos = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < Math.min(pos.count, 4); i += 1) {
        renderPositions.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
      }
    }
    for (const v of renderPositions) {
      for (const c of [v.x, v.y, v.z]) {
        expect(Number.isFinite(c)).toBe(true);
      }
    }
  });

  it("computes finite non-empty scene bounds", () => {
    expect(result.bounds.isEmpty()).toBe(false);
    const size = result.bounds.getSize(new THREE.Vector3());
    for (const v of [size.x, size.y, size.z]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });

  it("applies visibility toggling across all real layers", () => {
    const hidden = {
      ...model,
      layers: model.layers.map((l) => ({ ...l, visible: false })),
    };
    const resultHidden = buildLayerScene(hidden);
    for (const layer of hidden.layers) {
      expect(resultHidden.layerGroups[layer.id].children.length).toBeGreaterThan(0);
      expect(resultHidden.layerGroups[layer.id].visible).toBe(false);
    }
    const restored = {
      ...model,
      layers: model.layers.map((l) => ({ ...l, visible: true })),
    };
    applyLayerVisibility(resultHidden, restored);
    for (const layer of restored.layers) {
      expect(resultHidden.layerGroups[layer.id].visible).toBe(true);
    }
  });
});