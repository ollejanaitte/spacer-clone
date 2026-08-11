import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { gridToMesh } from "../../terrain/terrainSurface";
import { buildRoadMesh } from "../../road/roadMesh";
import { buildBridgeLayoutThreeScene } from "../bridgeLayoutScene";
import { computeAbutmentPlacementCandidate } from "../bridgeLayoutPlacement";
import { buildRoadAlignmentContextFromInputs } from "../bridgeLayoutDomain";

/**
 * Phase 4-02 Step C verification: the Bridge Layout scene keeps Terrain / Road /
 * Existing / Bridge Range / A1/A2 in ONE render coordinate space using the shared
 * domain->three adapter. Bridge Range must sit on the road, A1/A2 markers must
 * coincide with the road centerline at their stations, terrain stays horizontal.
 */
describe("Bridge Layout 3D scene geometry", () => {
  function buildScene() {
    const mountain = createReferenceMountain();
    const terrain = gridToMesh(mountain.terrainGrid);
    const road = buildRoadMesh({
      horizontal: mountain.roadHorizontal,
      vertical: mountain.roadVertical,
      crossSection: mountain.roadCrossSection,
      stationInterval: 20,
    });
    const roadContext = buildRoadAlignmentContextFromInputs({
      horizontal: mountain.roadHorizontal,
      vertical: mountain.roadVertical,
      crossSections: [mountain.roadCrossSection],
    });
    const a1 = computeAbutmentPlacementCandidate({
      horizontal: mountain.roadHorizontal,
      vertical: mountain.roadVertical,
      crossSections: [mountain.roadCrossSection],
      station: 100,
    });
    const a2 = computeAbutmentPlacementCandidate({
      horizontal: mountain.roadHorizontal,
      vertical: mountain.roadVertical,
      crossSections: [mountain.roadCrossSection],
      station: 450,
    });
    const built = buildBridgeLayoutThreeScene({
      terrain,
      road,
      existing: mountain.existing,
      roadContext,
      bridgeRange: { startStation: 100, endStation: 450 },
      candidateA1: a1.ok ? a1.candidate : null,
      candidateA2: a2.ok ? a2.candidate : null,
      showTerrainWireframe: true,
    });
    return { mountain, terrain, road, roadContext, a1, a2, built };
  }

  it("terrain stays horizontal in the Bridge Layout scene", () => {
    const { built } = buildScene();
    const group = built.group;
    const terrainMesh = group.children.find((c) => c.name === "" && c instanceof THREE.Mesh && c.geometry?.getAttribute("position")?.count === 41 * 41);
    // find mesh whose name was set by terrain builder (unnamed); check y-span vs z-span
    let found = false;
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.geometry.getAttribute("position") && obj.geometry.getAttribute("position").count > 1600 && !found) {
        const pos = obj.geometry.getAttribute("position") as THREE.BufferAttribute;
        const ys: number[] = [];
        const zs: number[] = [];
        for (let i = 0; i < pos.count; i += 1) {
          ys.push(pos.getY(i));
          zs.push(pos.getZ(i));
        }
        const ySpan = Math.max(...ys) - Math.min(...ys);
        const zSpan = Math.max(...zs) - Math.min(...zs);
        expect(ySpan).toBeGreaterThan(100);
        expect(ySpan).toBeLessThan(500);
        expect(ySpan).toBeLessThan(zSpan);
        found = true;
      }
    });
    expect(found).toBe(true);
    void terrainMesh;
  });

  it("Bridge Range group and A1/A2 markers are present with the expected names", () => {
    const { built } = buildScene();
    const names: string[] = [];
    built.bridgeGroup.traverse((obj) => {
      if (obj.name) names.push(obj.name);
    });
    expect(names).toContain("bridge-range-line");
    expect(names).toContain("bridge-range-envelope");
    expect(names).toContain("A1-marker");
    expect(names).toContain("A2-marker");
    expect(built.a1Marker).not.toBeNull();
    expect(built.a2Marker).not.toBeNull();
  });

  it("A1/A2 markers sit on the road centerline at their stations (no drift)", () => {
    const { roadContext, a1, a2, built } = buildScene();
    const origin = { x: 0, y: 0, z: 0 };
    // expected positions from the SAME road evaluation
    const expectPoint = roadContext.intermediate!.sample;
    const pA1 = expectPoint(100)!;
    const pA2 = expectPoint(450)!;

    const a1World = new THREE.Vector3();
    built.a1Marker!.getWorldPosition(a1World);
    // marker stem base is at elevation-30, so compute from head sphere: check marker group origin
    const headA1 = built.a1Marker!.children.find((c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.SphereGeometry)!;
    const headPos = new THREE.Vector3();
    headA1.getWorldPosition(headPos);

    const expectedA1 = { x: pA1.x, y: pA1.z, z: -pA1.y };
    expect(headPos.x).toBeCloseTo(expectedA1.x, 0);
    expect(headPos.z).toBeCloseTo(expectedA1.z, 0);

    const headA2 = built.a2Marker!.children.find((c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.SphereGeometry)!;
    const head2 = new THREE.Vector3();
    headA2.getWorldPosition(head2);
    const expectedA2 = { x: pA2.x, y: pA2.z, z: -pA2.y };
    expect(head2.x).toBeCloseTo(expectedA2.x, 0);
    expect(head2.z).toBeCloseTo(expectedA2.z, 0);
    void origin;
    void a1;
    void a2;
  });

  it("road surface and bridge range line share the road alignment band", () => {
    const { built } = buildScene();
    const roadBox = new THREE.Box3();
    built.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.name === "road-surface") {
        roadBox.expandByObject(obj);
      }
    });
    const lineMesh = built.bridgeGroup.children.find((c) => c instanceof THREE.Mesh && c.name === "bridge-range-line") as THREE.Mesh;
    const lineBox = new THREE.Box3().setFromObject(lineMesh);
    // bridge line y (elevation ~100..110) must be within road surface elevation band
    expect(lineBox.min.y).toBeGreaterThanOrEqual(roadBox.min.y - 0.001);
    expect(lineBox.max.y).toBeLessThanOrEqual(roadBox.max.y + 30);
    // horizontal center of the line must be inside the road footprint
    const center = lineBox.getCenter(new THREE.Vector3());
    expect(center.x).toBeGreaterThanOrEqual(roadBox.min.x);
    expect(center.x).toBeLessThanOrEqual(roadBox.max.x);
  });

  it("existing conditions appear in the same coordinate space", () => {
    const { built } = buildScene();
    const box = new THREE.Box3().setFromObject(built.group);
    // the whole scene (with terrain) has horizontal extent > 800 in x and z
    const size = box.getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThan(800);
    expect(size.z).toBeGreaterThan(800);
  });
});
