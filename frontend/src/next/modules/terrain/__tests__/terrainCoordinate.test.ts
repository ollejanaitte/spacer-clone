import { describe, expect, it } from "vitest";
import {
  createTerrainCoordinateTransformer,
  domainToThree,
  threeToDomain,
  applyTransformToPoints,
} from "../terrainCoordinate";

describe("Phase 3-03 Coordinate / Unit / Origin", () => {
  it("transforms global to project coordinate (subtract project origin)", () => {
    const t = createTerrainCoordinateTransformer({ x: 100, y: 200, z: 50 }, null);
    const project = t.globalToProject({ x: 150, y: 250, z: 80 });
    expect(project.x).toBeCloseTo(50, 9);
    expect(project.y).toBeCloseTo(50, 9);
    expect(project.z).toBeCloseTo(30, 9);
  });

  it("transforms project to local rendering coordinate", () => {
    const t = createTerrainCoordinateTransformer({ x: 100, y: 200, z: 50 }, { x: 10, y: 20, z: 0 });
    const local = t.projectToLocal({ x: 50, y: 50, z: 30 });
    expect(local.x).toBeCloseTo(40, 9);
    expect(local.y).toBeCloseTo(30, 9);
    expect(local.z).toBeCloseTo(30, 9);
  });

  it("global -> project -> global round-trip preserves value", () => {
    const t = createTerrainCoordinateTransformer({ x: 1000, y: 2000, z: 300 }, { x: 5, y: 6, z: 1 });
    const original = { x: 1234, y: 5678, z: 90 };
    const project = t.globalToProject(original);
    const back = t.projectToGlobal(project);
    expect(back.x).toBeCloseTo(original.x, 9);
    expect(back.y).toBeCloseTo(original.y, 9);
    expect(back.z).toBeCloseTo(original.z, 9);
  });

  it("local -> project round-trip preserves value", () => {
    const t = createTerrainCoordinateTransformer({ x: 100, y: 200, z: 50 }, { x: 10, y: 20, z: 5 });
    const local = { x: 30, y: 40, z: 25 };
    const project = t.localToProject(local);
    expect(project.x).toBeCloseTo(40, 9);
    const back = t.projectToLocal(project);
    expect(back.x).toBeCloseTo(local.x, 9);
    expect(back.z).toBeCloseTo(local.z, 9);
  });

  it("origin shift shifts bounds accordingly", () => {
    const t = createTerrainCoordinateTransformer({ x: 500, y: 500, z: 0 }, null);
    const transformed = applyTransformToPoints(
      [{ x: 500, y: 500, z: 100 }, { x: 600, y: 700, z: 150 }],
      (p) => t.globalToProject(p),
    );
    expect(transformed[0].x).toBeCloseTo(0, 9);
    expect(transformed[1].x).toBeCloseTo(100, 9);
    expect(transformed[1].y).toBeCloseTo(200, 9);
    expect(transformed[1].z).toBeCloseTo(150, 9);
  });

  it("elevation is preserved across coordinate transforms", () => {
    const t = createTerrainCoordinateTransformer({ x: 100, y: 100, z: 30 }, null);
    const p = t.globalToProject({ x: 150, y: 150, z: 200 });
    // elevation axis (z) unchanged by horizontal origin shift
    expect(p.z).toBeCloseTo(170, 9);
  });

  it("domainToThree maps x->x, y->z(three height), z->-y (Phase 3-A freeze)", () => {
    const [tx, ty, tz] = domainToThree({ x: 10, y: 20, z: 30 });
    expect(tx).toBeCloseTo(10, 9);
    expect(ty).toBeCloseTo(30, 9);
    expect(tz).toBeCloseTo(-20, 9);
  });

  it("threeToDomain round-trips domainToThree", () => {
    const p = { x: 3, y: 4, z: 5 };
    const three = domainToThree(p);
    const back = threeToDomain(three);
    expect(back.x).toBeCloseTo(p.x, 9);
    expect(back.y).toBeCloseTo(p.y, 9);
    expect(back.z).toBeCloseTo(p.z, 9);
  });
});
