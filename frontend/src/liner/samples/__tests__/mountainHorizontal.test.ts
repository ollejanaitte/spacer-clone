import { describe, expect, it } from "vitest";
import {
  MOUNTAIN_HORIZONTAL_SPECS,
  buildMountainHorizontalAlignment,
  mountainHorizontalLength,
} from "../mountain-viaduct-500/horizontalFixture";
import { buildChainedAlignment } from "../mountain-viaduct-500/horizontal";
import { evaluateAlignmentAtDistance } from "../../core/geometry/horizontal";
import { validateAlignment } from "../../core/geometry/horizontal";

describe("mountain horizontal alignment", () => {
  it("total length is 500m", () => {
    expect(mountainHorizontalLength()).toBeCloseTo(500, 3);
  });

  it("alignment length is 500m", () => {
    const alignment = buildMountainHorizontalAlignment();
    const length = alignment.elements.reduce((sum, e) => sum + e.length, 0);
    expect(length).toBeCloseTo(500, 3);
  });

  it("has LINE/ARC/CLOTHOID elements", () => {
    const alignment = buildMountainHorizontalAlignment();
    const types = alignment.elements.map((e) => e.type);
    expect(types).toContain("straight");
    expect(types).toContain("arc");
    expect(types).toContain("clothoid");
  });

  it("solves at key stations (0/50/250/450/500)", () => {
    const alignment = buildMountainHorizontalAlignment();
    for (const station of [0, 50, 100, 250, 400, 450, 500]) {
      const ev = evaluateAlignmentAtDistance(alignment, station);
      expect(Number.isFinite(ev.point.x)).toBe(true);
      expect(Number.isFinite(ev.point.y)).toBe(true);
    }
  });

  it("is valid (no discontinuity issues)", () => {
    const alignment = buildMountainHorizontalAlignment();
    const issues = validateAlignment(alignment);
    const discontinuity = issues.filter(
      (issue) =>
        issue.code === "LINER_GEOM_POSITION_DISCONTINUITY" ||
        issue.code === "LINER_GEOM_AZIMUTH_DISCONTINUITY",
    );
    expect(discontinuity).toEqual([]);
  });

  it("contains curvature changes within bridge section", () => {
    const alignment = buildMountainHorizontalAlignment();
    const curvatures = new Set<number>();
    for (const station of [60, 120, 180, 240, 300, 360, 420]) {
      const ev = evaluateAlignmentAtDistance(alignment, station);
      if (Math.abs(ev.curvature) > 1e-9) {
        curvatures.add(Math.sign(ev.curvature));
      }
    }
    // both left and right curvature signs appear in the bridge section
    expect(curvatures.has(1)).toBe(true);
    expect(curvatures.has(-1)).toBe(true);
  });

  it("chained alignment keeps end state continuity", () => {
    const alignment = buildMountainHorizontalAlignment();
    for (let i = 0; i < alignment.elements.length - 1; i += 1) {
      const prev = alignment.elements[i];
      const next = alignment.elements[i + 1];
      const prevEnd = evaluateAlignmentAtDistance(alignment, i === 0 ? prev.length : (() => {
        let acc = 0;
        for (let k = 0; k <= i; k += 1) acc += alignment.elements[k].length;
        return acc;
      })());
      expect(Math.abs(prevEnd.azimuth - next.azimuth) % (2 * Math.PI)).toBeLessThan(1e-3);
    }
  });
});
