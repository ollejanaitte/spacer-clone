import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createTerrainGrid, gridToMesh } from "../terrainSurface";
import { buildTerrainThreeScene, applyDomainToThreeTransform } from "../terrainViewerBuilder";

function makeMountainMesh() {
  const grid = createTerrainGrid(21, 21, 25, 0, 0, (x, y) => {
    const dx = x - 250;
    const dy = y - 250;
    const r = Math.sqrt(dx * dx + dy * dy);
    return 300 - r * 0.4;
  });
  return gridToMesh(grid);
}

describe("Phase 3-05 Terrain 3D Viewer builder", () => {
  it("builds a Three.js scene object from terrain mesh", () => {
    const meshData = makeMountainMesh();
    const built = buildTerrainThreeScene(meshData);
    expect(built.geometry.getAttribute("position").count).toBe(meshData.vertexCount);
    expect(built.mesh).toBeInstanceOf(THREE.Mesh);
    expect(built.wireframe.visible).toBe(false);
    expect(built.bounds).toBeInstanceOf(THREE.Box3);
  });

  it("mesh bounds are valid (non-zero size, finite)", () => {
    const meshData = makeMountainMesh();
    const built = buildTerrainThreeScene(meshData);
    const size = built.bounds.getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThan(0);
    expect(size.y).toBeGreaterThan(0);
    expect(size.z).toBeGreaterThan(0);
    for (const v of [size.x, size.y, size.z]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("applies domain->three transform (x->x, y->z, z->-y)", () => {
    const meshData = makeMountainMesh();
    const built = buildTerrainThreeScene(meshData);
    applyDomainToThreeTransform(built.mesh, null);
    const pos = built.mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    // first vertex at (0,0,z0): three should be (0, z0, 0)
    const x = pos.getX(0);
    const y = pos.getY(0);
    const z = pos.getZ(0);
    expect(x).toBeCloseTo(0, 6);
    expect(z).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(meshData.vertices[2], 6);
  });

  it("applies local origin shift", () => {
    const meshData = makeMountainMesh();
    const built = buildTerrainThreeScene(meshData);
    applyDomainToThreeTransform(built.mesh, { x: 250, y: 250, z: 300 });
    const pos = built.mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    // center vertex (250,250,300) -> three (0, 0, 0)
    const centerIdx = 10 * meshData.width + 10;
    const cx = pos.getX(centerIdx);
    const cy = pos.getY(centerIdx);
    const cz = pos.getZ(centerIdx);
    expect(Math.abs(cx)).toBeLessThan(0.001);
    expect(Math.abs(cy)).toBeLessThan(0.001);
    expect(Math.abs(cz)).toBeLessThan(0.001);
  });
});
