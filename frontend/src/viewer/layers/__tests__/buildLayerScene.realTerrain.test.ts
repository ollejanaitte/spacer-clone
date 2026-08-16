/**
 * 3D gate: buildLayerScene with REAL Lane T Gujo terrain (V-3).
 *
 * Asserts the adapter output feeds the existing scene builder unchanged and
 * produces a non-empty terrain mesh in render space. The mesh count follows
 * the heightfield grid; bounds match the heightfield bounds + elevation range.
 */

import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildGujoSampleHeightfield, GUJO_FIXTURE_GRID } from "../../../terrain";
import { buildRealGujoTerrainScene } from "../../adapters/realScene";
import { heightfieldLayerBounds, heightfieldToTerrainLayer } from "../../adapters/terrainAdapter";
import { applyLayerVisibility, buildLayerScene } from "../buildLayerScene";

describe("buildLayerScene with real Gujo terrain (V-3)", () => {
  const model = buildRealGujoTerrainScene();
  const result = buildLayerScene(model);

  it("mounts the real terrain layer only (terrain scene)", () => {
    expect(result.root.children.length).toBe(1);
    expect(model.layers).toHaveLength(1);
    expect(model.layers[0].kind).toBe("terrain");
    expect(model.layers[0].id).toBe("layer-real-terrain");
  });

  it("produces a non-empty terrain mesh matching the heightfield grid", () => {
    const group = result.layerGroups["layer-real-terrain"];
    expect(group).toBeDefined();
    expect(group.children.length).toBe(1);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    const pos = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    expect(pos.count).toBe(GUJO_FIXTURE_GRID.width * GUJO_FIXTURE_GRID.height);
    const index = mesh.geometry.getIndex();
    expect(index).toBeDefined();
    expect(index?.count ?? 0).toBeGreaterThan(0);
  });

  it("carries the correct grid, origin and elevation bounds", () => {
    const layer = model.layers[0];
    const data = layer.data as { width: number; height: number; cellSize: number; originX: number; originY: number };
    expect(data.width).toBe(GUJO_FIXTURE_GRID.width);
    expect(data.height).toBe(GUJO_FIXTURE_GRID.height);
    expect(data.cellSize).toBe(GUJO_FIXTURE_GRID.cellSize);
    expect(data.originX).toBe(GUJO_FIXTURE_GRID.originX);
    expect(data.originY).toBe(GUJO_FIXTURE_GRID.originY);

    const hf = buildGujoSampleHeightfield();
    const expected = heightfieldLayerBounds(hf);
    expect(layer.bounds.minX).toBe(expected.minX);
    expect(layer.bounds.maxX).toBe(expected.maxX);
    expect(layer.bounds.minY).toBe(expected.minY);
    expect(layer.bounds.maxY).toBe(expected.maxY);
    expect(layer.bounds.minZ).toBeCloseTo(200, 6);
    expect(layer.bounds.maxZ).toBeCloseTo(1200, 6);
  });

  it("renders vertices through the domainToThree transform (z -> render y)", () => {
    const group = result.layerGroups["layer-real-terrain"];
    const mesh = group.children[0] as THREE.Mesh;
    const pos = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    const layer = model.layers[0];
    const data = layer.data as { heights: Float32Array; originX: number; originY: number; cellSize: number; width: number };
    const first = data.heights[0];
    const maxElevation = Math.max(...Array.from(data.heights));
    const yValues: number[] = [];
    for (let i = 1; i < pos.count; i += 1) yValues.push(pos.getY(i));
    expect(Math.max(...yValues)).toBeCloseTo(maxElevation, 3);
    expect(pos.getY(0)).toBeCloseTo(first, 3);
  });

  it("produces a TerrainLayerData through the adapter compatible with the contract", () => {
    const hf = buildGujoSampleHeightfield();
    const data = heightfieldToTerrainLayer(hf);
    expect(data.kind).toBe("terrain");
    expect(data.heights).toBeInstanceOf(Float32Array);
    expect(data.noDataValue).toBe(hf.noDataValue);
  });

  it("supports visibility toggling without rebuilding geometry", () => {
    const hidden = {
      ...model,
      layers: model.layers.map((l) => ({ ...l, visible: false })),
    };
    applyLayerVisibility(result, hidden);
    expect(result.layerGroups["layer-real-terrain"].visible).toBe(false);
    expect(result.layerGroups["layer-real-terrain"].children.length).toBe(1);
  });
});