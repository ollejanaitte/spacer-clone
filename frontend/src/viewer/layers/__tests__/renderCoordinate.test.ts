import { describe, expect, it } from "vitest";
import {
  CANONICAL_TO_RENDER_TRANSFORM_NAME,
  DEFAULT_RENDER_COORDINATE_TRANSFORM,
  canonicalToRender,
  canonicalVerticesToRender,
  renderToCanonical,
} from "../renderCoordinate";

describe("Layer render coordinate transform (V-2)", () => {
  it("canonical (x, y, z) maps to three (x, elevation, -y)", () => {
    const t = canonicalToRender({ x: 10, y: 20, z: 30 });
    expect(t).toEqual([10, 30, -20]);
  });

  it("elevation (canonical z) is preserved as three y-up", () => {
    const low = canonicalToRender({ x: 0, y: 0, z: 40 });
    const high = canonicalToRender({ x: 0, y: 0, z: 320 });
    expect(high[1]).toBeGreaterThan(low[1]);
  });

  it("subtracts a render origin before mapping", () => {
    const t = canonicalToRender({ x: 130, y: 120, z: 110 }, { x: 100, y: 100, z: 100 });
    expect(t).toEqual([30, 10, -20]);
  });

  it("renderToCanonical round-trips canonicalToRender", () => {
    const p = { x: 100, y: -35, z: 42.5 };
    const origin = { x: 10, y: 20, z: 30 };
    const back = renderToCanonical(canonicalToRender(p, origin), origin);
    expect(back.x).toBeCloseTo(p.x, 9);
    expect(back.y).toBeCloseTo(p.y, 9);
    expect(back.z).toBeCloseTo(p.z, 9);
  });

  it("canonicalVerticesToRender maps interleaved triples with origin shift", () => {
    const vertices = new Float32Array([100, 200, 300, 400, 500, 600]);
    const mapped = canonicalVerticesToRender(vertices, { x: 100, y: 200, z: 300 });
    expect(mapped[0]).toBeCloseTo(0, 6);
    expect(mapped[1]).toBeCloseTo(0, 6);
    expect(mapped[2]).toBeCloseTo(0, 6);
    expect(mapped[3]).toBeCloseTo(300, 6);
    expect(mapped[4]).toBeCloseTo(300, 6);
    expect(mapped[5]).toBeCloseTo(-300, 6);
  });

  it("does not mutate the input vertices", () => {
    const vertices = new Float32Array([1, 2, 3]);
    canonicalVerticesToRender(vertices, null);
    expect(Array.from(vertices)).toEqual([1, 2, 3]);
  });

  it("exposes the default transform with the frozen convention name", () => {
    expect(DEFAULT_RENDER_COORDINATE_TRANSFORM.name).toBe(CANONICAL_TO_RENDER_TRANSFORM_NAME);
    const [x, y, z] = DEFAULT_RENDER_COORDINATE_TRANSFORM.apply({ x: 5, y: 7, z: 9 });
    expect([x, y, z]).toEqual([5, 9, -7]);
    const verts = DEFAULT_RENDER_COORDINATE_TRANSFORM.applyVertices(
      new Float32Array([1, 2, 3]),
      null,
    );
    expect(Array.from(verts)).toEqual([1, 3, -2]);
  });
});