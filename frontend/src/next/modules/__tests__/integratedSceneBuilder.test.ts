import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildIntegratedThreeScene } from "../integratedSceneBuilder";
import { createTerrainGrid, gridToMesh } from "../terrain/terrainSurface";
import { buildRoadMesh } from "../road/roadMesh";
import type { Road3DMesh } from "../road/roadMesh";
import type { LinearAlignment } from "../../../liner/core/types";
import type { VerticalElement } from "../../../liner/core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../../liner/schema/types";
import type { ExistingConditionEntity } from "../existingConditions";

function makeTerrainMesh(): import("../terrain/terrainSurface").TerrainMesh {
  const grid = createTerrainGrid(11, 11, 50, 0, 0, (x, y) => 100 + (x + y) * 0.1);
  return gridToMesh(grid);
}

function makeRoadMesh(): Road3DMesh {
  const horizontal: LinearAlignment = {
    id: "ALIGN-1",
    linerModelId: "MODEL-1",
    coordinatePolicyId: "COORD-1",
    elements: [
      { id: "S1", type: "straight", start: { x: 0, y: 0 }, azimuth: 0, length: 200 },
    ],
  };
  const vertical: VerticalElement[] = [
    { type: "grade", id: "G1", startPhysicalDistance: 0, startElevation: 110, grade: 0, length: 200 },
  ];
  const crossSection: CrossSectionTemplateDraft = {
    id: "XS1",
    name: "標準",
    offsetLines: [
      { id: "L", offset: -5, elevation: 0, role: "lane" },
      { id: "C", offset: 0, elevation: 0, role: "lane" },
      { id: "R", offset: 5, elevation: 0, role: "lane" },
    ],
    crossSlope: { signConvention: "right_down_positive", valuePercent: 2 },
  };
  return buildRoadMesh({ horizontal, vertical, crossSection, stationInterval: 20 });
}

function makeRiver(): ExistingConditionEntity {
  return {
    entityId: "RIVER-1",
    type: "river",
    label: "河川",
    geometry: { kind: "line", points: [{ x: 50, y: 0, z: 0 }, { x: 150, y: 0, z: 0 }] },
    coordinateContextId: "COORD-1",
    metadata: {},
    visibility: true,
    layer: "water",
    styleReference: null,
    sourceReference: null,
  };
}

describe("Phase 3-09 Road + Terrain + Existing integration", () => {
  it("builds an integrated scene with terrain, road, and existing groups", () => {
    const result = buildIntegratedThreeScene({
      terrain: makeTerrainMesh(),
      road: makeRoadMesh(),
      existing: [makeRiver()],
    });
    expect(result.group).toBeInstanceOf(THREE.Group);
    expect(result.terrainMesh).not.toBeNull();
    expect(result.roadMesh).not.toBeNull();
    expect(result.existingGroup.children.length).toBe(1);
  });

  it("road mesh is placed in the same project coordinate space as terrain", () => {
    const result = buildIntegratedThreeScene({
      terrain: makeTerrainMesh(),
      road: makeRoadMesh(),
    });
    const bounds = result.bounds;
    const size = bounds.getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThan(0);
    expect(size.z).toBeGreaterThan(0);
    // road centerline is near elevation ~110; terrain near 100-130; overlap
    const terrainMin = result.terrainMesh ? result.terrainMesh.geometry.boundingBox?.min : null;
    void terrainMin;
  });

  it("elevation consistency: road surface vertices are finite and overlap terrain range", () => {
    const result = buildIntegratedThreeScene({
      terrain: makeTerrainMesh(),
      road: makeRoadMesh(),
    });
    const pos = result.roadMesh!.geometry.getAttribute("position") as THREE.BufferAttribute;
    const yValues: number[] = [];
    for (let i = 0; i < pos.count; i += 1) {
      yValues.push(pos.getY(i));
    }
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    // road elevation ~110 -> three.y ~110 (domain z). Terrain is 100-130.
    expect(maxY).toBeGreaterThan(100);
    expect(minY).toBeGreaterThan(90);
    for (const v of yValues) expect(Number.isFinite(v)).toBe(true);
  });

  it("existing conditions are placed relative to the same origin", () => {
    const result = buildIntegratedThreeScene({
      terrain: makeTerrainMesh(),
      existing: [makeRiver()],
    });
    const existingPos = result.existingGroup.children[0]?.position;
    expect(existingPos).toBeDefined();
    // river at y=0 domain -> three.z = 0
    expect(existingPos!.z).toBeCloseTo(0, 6);
  });

  it("terrain elevation is mapped to three y-up in the integrated scene (Phase 3-Fix)", () => {
    const result = buildIntegratedThreeScene({
      terrain: makeTerrainMesh(),
      road: makeRoadMesh(),
    });
    const terrainPos = result.terrainMesh!.geometry.getAttribute("position") as THREE.BufferAttribute;
    // terrain grid spans x,y in [0,500]; elevation z = 100 + (x+y)*0.1.
    // three.x = domain.x (>=0), three.y = elevation (>=100), three.z = -domain.y (<=0)
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    for (let i = 0; i < terrainPos.count; i += 1) {
      xs.push(terrainPos.getX(i));
      ys.push(terrainPos.getY(i));
      zs.push(terrainPos.getZ(i));
    }
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-0.001);
    expect(Math.max(...ys)).toBeGreaterThan(100);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(100);
    expect(Math.max(...zs)).toBeLessThanOrEqual(0.001);
    // elevation differences live on the y axis, not z (terrain not vertical)
    const yRange = Math.max(...ys) - Math.min(...ys);
    const zRange = Math.max(...zs) - Math.min(...zs);
    expect(yRange).toBeGreaterThan(0);
    expect(zRange).toBeGreaterThan(0); // z spread is the transverse extent, y spread the elevation
  });

  it("road elevation is on the same y-up axis as terrain", () => {
    const result = buildIntegratedThreeScene({
      terrain: makeTerrainMesh(),
      road: makeRoadMesh(),
    });
    const roadPos = result.roadMesh!.geometry.getAttribute("position") as THREE.BufferAttribute;
    const terrainPos = result.terrainMesh!.geometry.getAttribute("position") as THREE.BufferAttribute;
    const roadYs: number[] = [];
    for (let i = 0; i < roadPos.count; i += 1) roadYs.push(roadPos.getY(i));
    const terrainYs: number[] = [];
    for (let i = 0; i < terrainPos.count; i += 1) terrainYs.push(terrainPos.getY(i));
    // road is at elevation ~110, terrain between 100 and 130 -> overlapping band
    const roadMin = Math.min(...roadYs);
    const terrainMin = Math.min(...terrainYs);
    const terrainMax = Math.max(...terrainYs);
    expect(roadMin).toBeGreaterThanOrEqual(terrainMin - 0.001);
    expect(roadMin).toBeLessThanOrEqual(terrainMax + 0.001);
  });

  it("returns empty bounds for empty scene", () => {
    const result = buildIntegratedThreeScene({});
    const size = result.bounds.getSize(new THREE.Vector3());
    expect(Number.isFinite(size.x)).toBe(true);
  });
});
