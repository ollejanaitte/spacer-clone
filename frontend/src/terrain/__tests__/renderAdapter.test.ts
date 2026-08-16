import { describe, expect, it } from "vitest";
import { RenderCoordinateAdapter, azimuthToDir, rightNormal } from "../coordinate/renderAdapter";

describe("T-COORD-02 RenderCoordinateAdapter", () => {
  const adapter = new RenderCoordinateAdapter({ x: 100000, y: 50000, z: 0 });

  it("canonical → render formula", () => {
    const r = adapter.canonicalToRender({ x: 100100, y: 50100, z: 12.5 });
    expect(r.x).toBeCloseTo(100, 9);
    expect(r.y).toBeCloseTo(12.5, 9);
    expect(r.z).toBeCloseTo(-100, 9);
  });

  it("render → canonical round-trip", () => {
    const c = { x: 123456.789, y: 654321.123, z: 45.5 };
    const r = adapter.canonicalToRender(c);
    const back = adapter.renderToCanonical(r);
    expect(back.x).toBeCloseTo(c.x, 6);
    expect(back.y).toBeCloseTo(c.y, 6);
    expect(back.z).toBeCloseTo(c.z, 6);
  });

  it("setLocalOrigin shifts render output and round-trips", () => {
    adapter.setLocalOrigin({ x: 1, y: 2, z: 3 });
    const c = { x: 100, y: 200, z: 300 };
    const r = adapter.canonicalToRender(c);
    expect(r.x).toBeCloseTo(99, 9);
    expect(r.y).toBeCloseTo(297, 9);
    expect(r.z).toBeCloseTo(-198, 9);
    const back = adapter.renderToCanonical(r);
    expect(back.x).toBeCloseTo(c.x, 9);
    expect(back.y).toBeCloseTo(c.y, 9);
    expect(back.z).toBeCloseTo(c.z, 9);
  });
});

describe("T-COORD-03 azimuth / right normal (RJ-F01)", () => {
  it("azimuth 0 (east): right = south (0,-1)", () => {
    const nr = rightNormal(0);
    expect(nr.x).toBeCloseTo(0, 9);
    expect(nr.y).toBeCloseTo(-1, 9);
  });
  it("azimuth 90 (north): right = east (1,0)", () => {
    const nr = rightNormal(90);
    expect(nr.x).toBeCloseTo(1, 9);
    expect(nr.y).toBeCloseTo(0, 9);
  });
  it("azimuth 180 (west): right = north (0,1)", () => {
    const nr = rightNormal(180);
    expect(nr.x).toBeCloseTo(0, 9);
    expect(nr.y).toBeCloseTo(1, 9);
  });
  it("azimuth 270 (south): right = west (-1,0)", () => {
    const nr = rightNormal(270);
    expect(nr.x).toBeCloseTo(-1, 9);
    expect(nr.y).toBeCloseTo(0, 9);
  });
  it("azimuthToDir consistent", () => {
    const d = azimuthToDir(0);
    expect(d.x).toBeCloseTo(1, 9);
    expect(d.y).toBeCloseTo(0, 9);
  });
});