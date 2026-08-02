import { describe, expect, it } from "vitest";
import { computeGirderSectionProperties } from "../bridgeStructure/sectionProperties";

function buildInput(overrides: Partial<Record<string, number>> = {}) {
  return {
    spanLength: 40,
    bridgeLength: 200,
    width: 12,
    girderCount: 4,
    girderSpacing: 3,
    girderDepth: 2.5,
    topFlangeWidth: 0.5,
    topFlangeThickness: 0.02,
    bottomFlangeWidth: 0.6,
    bottomFlangeThickness: 0.025,
    webThickness: 0.012,
    deckThickness: 0.25,
    crossBeamSpacing: 5,
    ...overrides,
  };
}

describe("computeGirderSectionProperties (pure geometry)", () => {
  it("computes web height, areas, centroid, second moment, and modulus", () => {
    const section = computeGirderSectionProperties(buildInput());
    expect(section).not.toBeNull();
    if (!section) return;

    expect(section.webHeight).toBeCloseTo(2.5 - 0.02 - 0.025, 9);
    expect(section.topFlangeArea).toBeCloseTo(0.5 * 0.02, 9);
    expect(section.bottomFlangeArea).toBeCloseTo(0.6 * 0.025, 9);
    expect(section.webArea).toBeCloseTo(0.012 * (2.5 - 0.02 - 0.025), 9);
    expect(section.totalArea).toBeCloseTo(
      section.topFlangeArea + section.bottomFlangeArea + section.webArea,
      9,
    );

    expect(section.centroidFromBottom).toBeGreaterThan(0);
    expect(section.centroidFromBottom).toBeLessThan(2.5);
    expect(section.secondMomentOfArea).toBeGreaterThan(0);
    expect(section.sectionModulusTop).toBeGreaterThan(0);
    expect(section.sectionModulusBottom).toBeGreaterThan(0);
    expect(section.steelVolumePerGirder).toBeCloseTo(section.totalArea * 200, 6);
  });

  it("returns null when web height is non-positive", () => {
    expect(computeGirderSectionProperties(buildInput({ girderDepth: 0.02 }))).toBeNull();
    expect(
      computeGirderSectionProperties(buildInput({ topFlangeThickness: 1.5, bottomFlangeThickness: 1.5 })),
    ).toBeNull();
  });

  it("returns null when any required dimension is non-finite", () => {
    expect(computeGirderSectionProperties(buildInput({ girderDepth: Number.NaN }))).toBeNull();
    expect(computeGirderSectionProperties(buildInput({ topFlangeWidth: 0 }))).toBeNull();
    expect(computeGirderSectionProperties(buildInput({ webThickness: -0.1 }))).toBeNull();
  });

  it("produces symmetric properties for symmetric flanges", () => {
    const section = computeGirderSectionProperties(
      buildInput({
        topFlangeWidth: 0.5,
        bottomFlangeWidth: 0.5,
        topFlangeThickness: 0.03,
        bottomFlangeThickness: 0.03,
      }),
    );
    expect(section).not.toBeNull();
    if (!section) return;

    expect(section.centroidFromBottom).toBeCloseTo(2.5 / 2, 6);
    expect(section.sectionModulusTop).toBeCloseTo(section.sectionModulusBottom, 6);
    expect(section.topFlangeArea).toBeCloseTo(section.bottomFlangeArea, 9);
  });
});
