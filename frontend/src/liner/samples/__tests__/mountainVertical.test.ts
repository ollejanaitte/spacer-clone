import { describe, expect, it } from "vitest";
import {
  MOUNTAIN_CROSSFALL_ZONES,
  buildMountainCrossSlopeIntervals,
  buildMountainVerticalProfile,
} from "../mountain-viaduct-500/verticalFixture";
import { elevationAt } from "../../core/elevationAt";

describe("mountain vertical profile", () => {
  it("covers 0..500", () => {
    const profile = buildMountainVerticalProfile();
    expect(profile.elements[0].startStation).toBe(0);
    expect(profile.elements.at(-1)?.endStation).toBe(500);
  });

  it("has grade + parabolic (crest/sag)", () => {
    const profile = buildMountainVerticalProfile();
    const types = profile.elements.map((e) => e.type);
    expect(types).toContain("grade");
    expect(types).toContain("parabolic");
  });

  it("bridge section has clear elevation range (valley crossing)", () => {
    const profile = buildMountainVerticalProfile();
    // evaluate elevation along the profile over the bridge section
    const elevations: number[] = [];
    for (const station of [100, 200, 250, 300, 400]) {
      const ev = elevationAt(station, profile);
      if (ev !== null && Number.isFinite(ev)) elevations.push(ev);
    }
    expect(elevations.length).toBeGreaterThan(0);
    const min = Math.min(...elevations);
    const max = Math.max(...elevations);
    // mountain profile: at least ~5 m elevation difference across the bridge
    expect(max - min).toBeGreaterThan(5);
  });

  it("crossfall zones follow crown -> superelevation -> crown sequence", () => {
    const modes = MOUNTAIN_CROSSFALL_ZONES.map((z) => z.mode);
    expect(modes[0]).toBe("crown");
    expect(modes).toContain("one_way_right");
    expect(modes).toContain("one_way_left");
    // signs flip between right and left superelevation
    const rightZone = MOUNTAIN_CROSSFALL_ZONES.find((z) => z.mode === "one_way_right");
    const leftZone = MOUNTAIN_CROSSFALL_ZONES.find((z) => z.mode === "one_way_left");
    expect(Math.sign(rightZone!.leftSlopePercent)).toBe(-1);
    expect(Math.sign(leftZone!.leftSlopePercent)).toBe(1);
  });

  it("crossfall intervals are contiguous over 0..500", () => {
    const intervals = buildMountainCrossSlopeIntervals();
    expect(intervals[0].startPhysicalDistance).toBe(0);
    expect(intervals.at(-1)?.endPhysicalDistance).toBe(500);
    for (let i = 1; i < intervals.length; i += 1) {
      expect(intervals[i].startPhysicalDistance).toBe(intervals[i - 1].endPhysicalDistance);
    }
  });
});
