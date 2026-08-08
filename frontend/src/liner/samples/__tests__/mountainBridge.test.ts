import { describe, expect, it } from "vitest";
import {
  buildMountainPiers,
  buildMountainSpans,
  pierIdForStation,
} from "../mountain-viaduct-500/bridgeFixture";
import {
  BRIDGE_ABUTMENT_STATIONS,
  BRIDGE_PIER_STATIONS,
} from "../mountain-viaduct-500/bridgeStations";

describe("mountain bridge geometry", () => {
  it("9 supports: 2 abutments + 7 piers", () => {
    const piers = buildMountainPiers();
    expect(piers).toHaveLength(9);
    const abutments = piers.filter((p) => p.kind === "abutment");
    const pierList = piers.filter((p) => p.kind === "pier");
    expect(abutments).toHaveLength(2);
    expect(pierList).toHaveLength(7);
  });

  it("abutments at A1=50 and A2=450", () => {
    const piers = buildMountainPiers();
    const a1 = piers.find((p) => p.id === "A1");
    const a2 = piers.find((p) => p.id === "A2");
    expect(a1?.physicalDistance).toBe(50);
    expect(a2?.physicalDistance).toBe(450);
  });

  it("piers P1..P7 at 100..400 equal spacing", () => {
    const piers = buildMountainPiers();
    const pierStations = piers
      .filter((p) => p.kind === "pier")
      .map((p) => p.physicalDistance)
      .sort((a, b) => a - b);
    expect(pierStations).toEqual(BRIDGE_PIER_STATIONS);
    for (let i = 1; i < pierStations.length; i += 1) {
      expect(pierStations[i] - pierStations[i - 1]).toBe(50);
    }
  });

  it("8 spans, each 50m nominal", () => {
    const spans = buildMountainSpans();
    expect(spans).toHaveLength(8);
    for (const span of spans) {
      expect(span.endPhysicalDistance - span.startPhysicalDistance).toBe(50);
    }
  });

  it("spans connect the 9 supports in order", () => {
    const spans = buildMountainSpans();
    const allStations = [...BRIDGE_ABUTMENT_STATIONS, ...BRIDGE_PIER_STATIONS].sort(
      (a, b) => a - b,
    );
    for (let i = 0; i < spans.length; i += 1) {
      expect(spans[i].startPhysicalDistance).toBe(allStations[i]);
      expect(spans[i].endPhysicalDistance).toBe(allStations[i + 1]);
    }
  });

  it("pier id mapping", () => {
    expect(pierIdForStation(100)).toBe("P1");
    expect(pierIdForStation(400)).toBe("P7");
  });
});
