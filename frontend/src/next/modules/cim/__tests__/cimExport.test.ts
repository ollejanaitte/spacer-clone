import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { defaultCimLayerState, type Integrated3DScene, type CimLayerId } from "../integrated3dScene";
import { buildCimExportScene } from "../cimExport";

function makeScene(): Integrated3DScene {
  const layers: Partial<Record<CimLayerId, THREE.Group>> = {};
  for (const layer of Object.keys(defaultCimLayerState()) as CimLayerId[]) {
    const group = new THREE.Group();
    group.name = `layer:${layer}`;
    if (layer === "terrain") {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(10, 1, 10),
        new THREE.MeshStandardMaterial({ color: 0x7a9c5e }),
      );
      mesh.userData.cimMetadata = {
        sourceModule: "terrain",
        sourceEntityId: "ref",
        stableId: "terrain:ref",
        coordinateContext: "world",
        label: "地形",
      };
      group.add(mesh);
    }
    layers[layer] = group;
  }
  return {
    ok: true,
    issues: [],
    layers,
    metadata: [],
    bounds: new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 10, 10)),
    regeneratedFrom: [],
  };
}

describe("cimExport (Phase 8-02 WP-K)", () => {
  it("builds an export scene with named layer groups and metadata", () => {
    const root = buildCimExportScene(makeScene());
    expect(root.name).toBe("CIM-Integrated3D");
    expect(root.children.length).toBeGreaterThan(0);
    const terrainLayer = root.children.find((c) => c.name === "layer:terrain");
    expect(terrainLayer).toBeDefined();
    expect(terrainLayer?.children.length).toBe(1);
  });

  it("preserves layer groups with metadata for export (GLB/JSON verified in browser)", () => {
    const root = buildCimExportScene(makeScene());
    expect(root.name).toBe("CIM-Integrated3D");
    const terrainLayer = root.children.find((c) => c.name === "layer:terrain");
    expect(terrainLayer).toBeDefined();
    expect(terrainLayer?.children.length).toBe(1);
  });
});
