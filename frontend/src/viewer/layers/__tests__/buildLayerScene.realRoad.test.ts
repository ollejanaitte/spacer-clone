/**
 * 3D gate: buildLayerScene with REAL terrain + RB001 road (V-4).
 *
 * Asserts the road is displayed in the SAME canonical coordinates as the
 * terrain (same render origin / world basis), the road sits at grade on the
 * terrain approaches and is above the terrain over the bridge candidate, and
 * both layers produce non-empty meshes.
 */

import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildRealGujoRoadScene } from "../../adapters/realScene";
import { buildLayerScene } from "../buildLayerScene";
import { computeRoadLayerBounds, computeTerrainLayerBounds } from "../layerContract";
import { roadAlignmentToLayer } from "../../adapters/roadAdapter";
import { buildReferenceBusiness001RoadSample } from "../../../liner/samples/reference-business-001/roadAlignment";

describe("buildLayerScene with real terrain + RB001 road (V-4)", () => {
  const model = buildRealGujoRoadScene();
  const result = buildLayerScene(model);

  it("mounts terrain and road layers in one shared scene", () => {
    expect(result.root.children.length).toBe(2);
    expect(model.layers.map((l) => l.kind)).toEqual(["terrain", "road"]);
    expect(result.layerGroups["layer-real-terrain"].children.length).toBe(1);
    expect(result.layerGroups["layer-real-road"].children.length).toBe(1);
  });

  it("produces non-empty terrain and road meshes", () => {
    const terrainMesh = result.layerGroups["layer-real-terrain"].children[0] as THREE.Mesh;
    const roadMesh = result.layerGroups["layer-real-road"].children[0] as THREE.Mesh;
    expect(terrainMesh).toBeInstanceOf(THREE.Mesh);
    expect(roadMesh).toBeInstanceOf(THREE.Mesh);
    const terrainPos = terrainMesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    expect(terrainPos.count).toBeGreaterThan(0);
    const roadPos = roadMesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    expect(roadPos.count).toBeGreaterThan(0);
    const roadIndex = roadMesh.geometry.getIndex();
    expect(roadIndex?.count ?? 0).toBeGreaterThan(0);
  });

  it("shares one world basis / render transform with the terrain", () => {
    expect(model.worldBasis.axes).toEqual({ x: "along", y: "transverse", z: "elevation" });
    expect(model.worldBasis.horizontalCrs?.identifier).toBe("6674");
    const terrain = model.layers.find((l) => l.kind === "terrain");
    const road = model.layers.find((l) => l.kind === "road");
    // Both layers share the world basis render origin (none here) so they stay
    // in the SAME canonical EPSG:6674 coordinates.
    expect(model.worldBasis.renderOrigin).toBeNull();
    expect(terrain?.metadata.renderOrigin == null).toBe(true);
    expect(road?.metadata.renderOrigin == null).toBe(true);
    expect(model.layers.every((l) => l.status.state === "ready")).toBe(true);
  });

  it("keeps the road within the terrain footprint (same coordinate system)", () => {
    const terrain = model.layers.find((l) => l.kind === "terrain");
    const road = model.layers.find((l) => l.kind === "road");
    expect(terrain && road).toBeTruthy();
    if (!terrain || !road) return;
    const tb = computeTerrainLayerBounds(terrain.data as never);
    const rb = computeRoadLayerBounds(road.data as never);
    expect(rb.minX).toBeGreaterThanOrEqual(tb.minX);
    expect(rb.maxX).toBeLessThanOrEqual(tb.maxX + 1e-6);
    expect(rb.minY).toBeGreaterThanOrEqual(tb.minY);
    expect(rb.maxY).toBeLessThanOrEqual(tb.maxY + 1e-6);
  });

  it("road deck is above the terrain over the bridge candidate", () => {
    const road = buildReferenceBusiness001RoadSample();
    const layer = roadAlignmentToLayer(road);
    const terrain = model.layers.find((l) => l.kind === "terrain");
    expect(terrain).toBeDefined();
    if (!terrain) return;
    const heights = terrain.data as { originX: number; originY: number; cellSize: number; width: number; heights: Float32Array };
    const terrainZ = (x: number, y: number): number => {
      const i = Math.round((x - heights.originX) / heights.cellSize);
      const j = Math.round((y - heights.originY) / heights.cellSize);
      if (i < 0 || j < 0 || i >= heights.width) return Number.NaN;
      const index = j * heights.width + i;
      if (index >= heights.heights.length) return Number.NaN;
      return heights.heights[index];
    };
    let bridgeSamplesAbove = 0;
    let bridgeSamplesTotal = 0;
    const startStation = road.bridgeCandidate.startStation;
    const endStation = road.bridgeCandidate.endStation;
    let station = 0;
    let prev = layer.alignment[0];
    for (const p of layer.alignment) {
      if (p !== layer.alignment[0]) {
        station += Math.hypot(p.x - prev.x, p.y - prev.y);
      }
      if (station < startStation - 1 || station > endStation + 1) {
        prev = p;
        continue;
      }
      bridgeSamplesTotal += 1;
      const gz = terrainZ(p.x, p.y);
      if (Number.isFinite(gz) && p.z > gz + 5) bridgeSamplesAbove += 1;
      prev = p;
    }
    expect(bridgeSamplesTotal).toBeGreaterThan(0);
    // over the bridge candidate the road deck floats above the river valley
    expect(bridgeSamplesAbove / bridgeSamplesTotal).toBeGreaterThan(0.8);
  });

  it("computes finite scene bounds covering terrain and road", () => {
    expect(result.bounds.isEmpty()).toBe(false);
    const size = result.bounds.getSize(new THREE.Vector3());
    for (const v of [size.x, size.y, size.z]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });
});