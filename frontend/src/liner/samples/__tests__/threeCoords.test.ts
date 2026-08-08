import { describe, expect, it } from "vitest";
import {
  domainPointsToThree,
  domainToThree,
  terrainPositionsToThree,
} from "../mountain-viaduct-500/threeCoords";

describe("domain -> three coordinate mapping", () => {
  it("maps (x, y, z) to (x, z, -y)", () => {
    expect(domainToThree({ x: 100, y: 20, z: 40 })).toEqual([100, 40, -20]);
  });

  it("keeps +right as +z (mirror once)", () => {
    const right = domainToThree({ x: 0, y: -3, z: 10 }); // right = negative y
    const left = domainToThree({ x: 0, y: 3, z: 10 }); // left = positive y
    // right (domain -y) -> +z in three; left -> -z
    expect(right[2]).toBeGreaterThan(left[2]);
  });

  it("terrain positions remap y -> -y", () => {
    const raw = new Float32Array([10, 20, 30, 40, 50, 60]);
    const mapped = terrainPositionsToThree(raw);
    expect(Array.from(mapped)).toEqual([10, 20, -30, 40, 50, -60]);
  });

  it("domain points to three positions", () => {
    const pts = [
      { x: 0, y: 0, z: 0 },
      { x: 100, y: -50, z: 25 },
    ];
    const arr = Array.from(domainPointsToThree(pts)).map((v) => (Object.is(v, -0) ? 0 : v));
    expect(arr).toEqual([0, 0, 0, 100, 25, 50]);
  });
});
