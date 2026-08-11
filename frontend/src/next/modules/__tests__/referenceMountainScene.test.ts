import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createReferenceMountain } from "../terrain/referenceMountain";
import { gridToMesh } from "../terrain/terrainSurface";
import { buildRoadMesh } from "../road/roadMesh";
import { buildIntegratedThreeScene } from "../integratedSceneBuilder";

/**
 * Phase 3-Fix verification: the Reference Mountain integrated scene must put
 * terrain / road / existing in ONE render coordinate space with the ground
 * horizontal (elevation on the Three.js y-up axis). This is the same data the
 * UI renders in TerrainViewer / IntegratedSceneViewer.
 */
describe("Phase 3-Fix Reference Mountain render geometry", () => {
  function buildReferenceScene() {
    const mountain = createReferenceMountain();
    const terrain = gridToMesh(mountain.terrainGrid);
    const road = buildRoadMesh({
      horizontal: mountain.roadHorizontal,
      vertical: mountain.roadVertical,
      crossSection: mountain.roadCrossSection,
      stationInterval: 20,
    });
    return { mountain, terrain, road, integrated: buildIntegratedThreeScene({ terrain, road, existing: mountain.existing }) };
  }

  it("terrain is a horizontal surface (not standing vertically)", () => {
    const { terrain, integrated } = buildReferenceScene();
    const pos = integrated.terrainMesh!.geometry.getAttribute("position") as THREE.BufferAttribute;
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    for (let i = 0; i < pos.count; i += 1) {
      xs.push(pos.getX(i));
      ys.push(pos.getY(i));
      zs.push(pos.getZ(i));
    }
    const xSpan = Math.max(...xs) - Math.min(...xs);
    const ySpan = Math.max(...ys) - Math.min(...ys);
    const zSpan = Math.max(...zs) - Math.min(...zs);
    // Ground extent lives in the x (axis) and z (transverse) plane...
    expect(xSpan).toBeGreaterThan(800);
    expect(zSpan).toBeGreaterThan(800);
    // ...while the vertical spread is the elevation range only (~0..420).
    expect(ySpan).toBeGreaterThan(100);
    expect(ySpan).toBeLessThan(500);
    // If the terrain were standing vertically, elevation would spread along z.
    expect(ySpan).toBeLessThan(zSpan);
  });

  it("road sits on the terrain elevation band in the same coordinate space", () => {
    const { integrated } = buildReferenceScene();
    const roadPos = integrated.roadMesh!.geometry.getAttribute("position") as THREE.BufferAttribute;
    const terrainPos = integrated.terrainMesh!.geometry.getAttribute("position") as THREE.BufferAttribute;
    const roadYs: number[] = [];
    for (let i = 0; i < roadPos.count; i += 1) roadYs.push(roadPos.getY(i));
    const terrainYs: number[] = [];
    for (let i = 0; i < terrainPos.count; i += 1) terrainYs.push(terrainPos.getY(i));
    const roadMin = Math.min(...roadYs);
    const terrainMin = Math.min(...terrainYs);
    const terrainMax = Math.max(...terrainYs);
    // road elevation (~100-108) must be inside the terrain elevation band
    expect(roadMin).toBeGreaterThanOrEqual(terrainMin - 0.001);
    expect(roadMin).toBeLessThanOrEqual(terrainMax + 0.001);
  });

  it("existing conditions are placed in the same render space as terrain", () => {
    const { mountain, integrated } = buildReferenceScene();
    const box = new THREE.Box3().setFromObject(integrated.existingGroup);
    const center = box.getCenter(new THREE.Vector3());
    // river at domain (400..600, 0..1000, 40) -> three x in [400,600], z in [-1000,0]
    expect(center.x).toBeGreaterThan(400);
    expect(center.x).toBeLessThan(600);
    expect(center.z).toBeLessThan(0);
    expect(mountain.existing.length).toBe(4);
    expect(integrated.existingGroup.children.length).toBe(4);
  });
});
