import { describe, expect, it } from "vitest";
import {
  domainToThree,
  threeToDomain,
  domainVerticesToThree,
} from "../renderCoordinate";

describe("Render Coordinate Adapter (Phase 3-Fix)", () => {
  it("domainToThree maps x->x, y->z(height), z->-y", () => {
    const [tx, ty, tz] = domainToThree({ x: 10, y: 20, z: 30 });
    expect(tx).toBe(10);
    expect(ty).toBe(30);
    expect(tz).toBe(-20);
  });

  it("elevation (domain z) is preserved as three y-up", () => {
    const low = domainToThree({ x: 0, y: 0, z: 40 });
    const high = domainToThree({ x: 0, y: 0, z: 320 });
    expect(high[1]).toBeGreaterThan(low[1]);
    expect(high[1] - low[1]).toBe(280);
  });

  it("axis direction: +y (left) -> -z, -y (right) -> +z", () => {
    const right = domainToThree({ x: 0, y: -3, z: 10 });
    const left = domainToThree({ x: 0, y: 3, z: 10 });
    expect(left[2]).toBeLessThan(0);
    expect(right[2]).toBeGreaterThan(0);
  });

  it("threeToDomain round-trips domainToThree", () => {
    const p = { x: 100, y: 20, z: 40 };
    const back = threeToDomain(domainToThree(p));
    expect(back.x).toBeCloseTo(p.x, 9);
    expect(back.y).toBeCloseTo(p.y, 9);
    expect(back.z).toBeCloseTo(p.z, 9);
  });

  it("domainVerticesToThree maps interleaved triples with local origin shift", () => {
    const vertices = new Float32Array([100, 200, 300, 400, 500, 600]);
    const mapped = domainVerticesToThree(vertices, { x: 100, y: 200, z: 300 });
    expect(mapped[0]).toBeCloseTo(0, 6); // x - ox
    expect(mapped[1]).toBeCloseTo(0, 6); // z - oz (height)
    expect(mapped[2]).toBeCloseTo(0, 6); // -(y - oy)
    // second vertex: (400,500,600) - (100,200,300) = (300,300,300) -> (300,300,-300)
    expect(mapped[3]).toBeCloseTo(300, 6);
    expect(mapped[4]).toBeCloseTo(300, 6);
    expect(mapped[5]).toBeCloseTo(-300, 6);
  });

  it("domainVerticesToThree never mutates input", () => {
    const vertices = new Float32Array([1, 2, 3]);
    domainVerticesToThree(vertices, null);
    expect(Array.from(vertices)).toEqual([1, 2, 3]);
  });

  it("matches the existing threeCoords convention (single source of truth)", () => {
    const t = domainToThree({ x: 100, y: 20, z: 40 });
    expect([t[0], t[1], t[2]]).toEqual([100, 40, -20]);
  });
});
