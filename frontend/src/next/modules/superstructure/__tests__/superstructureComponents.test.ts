import { describe, expect, it } from "vitest";
import {
  buildCrossBeamConfiguration,
  buildCrossFrameConfiguration,
  buildBearingConfiguration,
  computeSuperstructureSectionProperties,
} from "../superstructureComponents";

describe("Superstructure components (WP-D)", () => {
  it("computes section properties from declared I-beam section", () => {
    const props = computeSuperstructureSectionProperties(
      {
        depthM: 2.0,
        webThicknessM: 0.012,
        topFlange: { widthM: 0.5, thicknessM: 0.03 },
        bottomFlange: { widthM: 0.6, thicknessM: 0.04 },
        areaM2: null,
        unitWeightPerM: null,
      },
      40,
    );
    expect(props).not.toBeNull();
    expect(props!.webHeight).toBeCloseTo(1.93, 6);
    expect(props!.totalArea).toBeGreaterThan(0);
    expect(props!.secondMomentOfArea).toBeGreaterThan(0);
    expect(props!.sectionModulusTop).toBeGreaterThan(0);
  });

  it("returns null when section is MISSING (never invents)", () => {
    expect(computeSuperstructureSectionProperties(
      { depthM: null, webThicknessM: null, topFlange: null, bottomFlange: null, areaM2: null, unitWeightPerM: null },
      40,
    )).toBeNull();
    expect(computeSuperstructureSectionProperties(
      { depthM: 2.0, webThicknessM: 0.012, topFlange: null, bottomFlange: { widthM: 0.6, thicknessM: 0.04 }, areaM2: null, unitWeightPerM: null },
      40,
    )).toBeNull();
  });

  it("builds cross beams: end/support at all supports + intermediates by spacing", () => {
    const supports = [
      { supportId: "A1", station: 0, supportType: "abutment" as const },
      { supportId: "P1", station: 40, supportType: "pier" as const },
      { supportId: "P2", station: 90, supportType: "pier" as const },
      { supportId: "A2", station: 130, supportType: "abutment" as const },
    ];
    const config = buildCrossBeamConfiguration(supports, 20);
    // 4 support + 5 intermediate (20,60,80,100,120)
    expect(config.crossBeams).toHaveLength(9);
    // all support positions have a cross beam
    for (const s of supports) {
      expect(config.crossBeams.some((b) => b.crossBeamId === `XB-${s.supportId}`)).toBe(true);
    }
    // no duplicate stations
    const stations = config.crossBeams.map((b) => b.stationM);
    expect(new Set(stations).size).toBe(stations.length);
    // intermediate cross beams do not coincide with supports
    for (const b of config.crossBeams.filter((b) => b.kind === "intermediate")) {
      expect(supports.some((s) => s.station === b.stationM)).toBe(false);
    }
    // dimensions are null (DEFER)
    expect(config.crossBeams.every((b) => b.depthM === null && b.widthM === null)).toBe(true);
  });

  it("builds cross beams for a single span (end/support only)", () => {
    const config = buildCrossBeamConfiguration(
      [
        { supportId: "A1", station: 0, supportType: "abutment" as const },
        { supportId: "A2", station: 40, supportType: "abutment" as const },
      ],
      20,
    );
    // end/support cross beams + 1 intermediate at station 20
    expect(config.crossBeams).toHaveLength(3);
    expect(config.crossBeams.map((b) => b.crossBeamId).sort()).toEqual(["XB-A1", "XB-A2", "XB-i-1"]);
  });

  it("builds cross frame configuration", () => {
    const cf = buildCrossFrameConfiguration(10, 5, 5);
    expect(cf.crossFrameSpacingM).toBe(10);
    expect(cf.swayBracing.intervalM).toBe(5);
    expect(cf.lateralBracing.intervalM).toBe(5);
  });

  it("builds bearing seats: support × girder incidence with unique IDs", () => {
    const supports = [
      { supportId: "A1", station: 0, supportType: "abutment" as const },
      { supportId: "P1", station: 40, supportType: "pier" as const },
    ];
    const config = buildBearingConfiguration(supports, ["G1", "G2"]);
    expect(config.bearingSupportRelation).toHaveLength(4);
    expect(config.bearingSeats).toHaveLength(4);
    expect(config.bearingSeats.map((s) => s.seatId).sort()).toEqual([
      "BRG-A1-G1",
      "BRG-A1-G2",
      "BRG-P1-G1",
      "BRG-P1-G2",
    ]);
    for (const seat of config.bearingSeats) {
      expect(seat.fixedOrMovable).toBe("UNDECIDED");
      expect(seat.bearingType).toBeNull();
    }
  });
});
