import { describe, expect, it } from "vitest";
import {
  BRIDGE_ABUTMENT_STATIONS,
  BRIDGE_PIER_STATIONS,
  BRIDGE_SPAN_PIER_PAIRS,
  BRIDGE_STATION_LAYOUT,
} from "../mountain-viaduct-500/bridgeStations";
import {
  MOUNTAIN_VIADUCT_500_EXPECTED,
  MOUNTAIN_VIADUCT_500_METADATA,
} from "../mountain-viaduct-500/schema";

describe("mountain viaduct 500 metadata", () => {
  it("metadata declares showcase/demo disclaimer", () => {
    expect(MOUNTAIN_VIADUCT_500_METADATA.sampleId).toBe("mountain-viaduct-500");
    expect(MOUNTAIN_VIADUCT_500_METADATA.title).toContain("山岳連続高架橋");
    expect(MOUNTAIN_VIADUCT_500_METADATA.category).toBe("showcase");
    expect(MOUNTAIN_VIADUCT_500_METADATA.disclaimer).toContain("SHOWCASE / DEMO");
  });

  it("expected metrics", () => {
    expect(MOUNTAIN_VIADUCT_500_EXPECTED.totalRouteLengthM).toBe(500);
    expect(MOUNTAIN_VIADUCT_500_EXPECTED.bridgeLengthM).toBe(400);
    expect(MOUNTAIN_VIADUCT_500_EXPECTED.bridgeStartM).toBe(50);
    expect(MOUNTAIN_VIADUCT_500_EXPECTED.bridgeEndM).toBe(450);
    expect(MOUNTAIN_VIADUCT_500_EXPECTED.spanCount).toBe(8);
    expect(MOUNTAIN_VIADUCT_500_EXPECTED.nominalSpanM).toBe(50);
    expect(MOUNTAIN_VIADUCT_500_EXPECTED.pierCount).toBe(7);
    expect(MOUNTAIN_VIADUCT_500_EXPECTED.abutmentCount).toBe(2);
  });
});

describe("bridge station layout", () => {
  it("stations follow the frozen spec", () => {
    expect(BRIDGE_STATION_LAYOUT.A1).toBe(50);
    expect(BRIDGE_STATION_LAYOUT.P1).toBe(100);
    expect(BRIDGE_STATION_LAYOUT.P2).toBe(150);
    expect(BRIDGE_STATION_LAYOUT.P3).toBe(200);
    expect(BRIDGE_STATION_LAYOUT.P4).toBe(250);
    expect(BRIDGE_STATION_LAYOUT.P5).toBe(300);
    expect(BRIDGE_STATION_LAYOUT.P6).toBe(350);
    expect(BRIDGE_STATION_LAYOUT.P7).toBe(400);
    expect(BRIDGE_STATION_LAYOUT.A2).toBe(450);
  });

  it("pier/abutment counts", () => {
    expect(BRIDGE_PIER_STATIONS).toHaveLength(7);
    expect(BRIDGE_ABUTMENT_STATIONS).toEqual([50, 450]);
  });

  it("8 equal spans of 50m", () => {
    expect(BRIDGE_SPAN_PIER_PAIRS).toHaveLength(8);
    const stations = [
      ...BRIDGE_ABUTMENT_STATIONS,
      ...BRIDGE_PIER_STATIONS,
    ].sort((a, b) => a - b);
    for (let i = 1; i < stations.length; i += 1) {
      expect(stations[i] - stations[i - 1]).toBe(50);
    }
  });
});
