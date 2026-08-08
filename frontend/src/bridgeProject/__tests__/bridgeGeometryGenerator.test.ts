import { describe, expect, it } from "vitest";
import { buildBridgeProjectGeometry, BridgeGeometryGeneratorOptions } from "../bridgeGeometryGenerator";
import { buildBridgeProjectAlignment } from "../alignmentAdapter";
import { buildMountainDraft } from "../../liner/samples/mountain-viaduct-500/fixture";
import { BRIDGE_SPAN_PIER_PAIRS } from "../../liner/samples/mountain-viaduct-500/bridgeStations";
import { BridgeProjectAdapterError } from "../validation";

function mountainGeometry(options: BridgeGeometryGeneratorOptions = {}) {
  const draft = buildMountainDraft();
  const alignment = buildBridgeProjectAlignment(draft);
  return buildBridgeProjectGeometry(alignment, draft.piers, draft.spans, options);
}

describe("buildBridgeProjectGeometry", () => {
  it("derives bridge length from the support stations (mountain 400m)", () => {
    const geometry = mountainGeometry();
    expect(geometry.bridgeStartStationM.value).toBe(50);
    expect(geometry.bridgeEndStationM.value).toBe(450);
    expect(geometry.bridgeLengthM.value).toBe(400);
    expect(geometry.bridgeLengthM.status).toBe("DERIVED");
    expect(geometry.bridgeStartStationM.status).toBe("CONFIRMED");
  });

  it("produces 9 supports (A1 + P1..P7 + A2) with ascending stations", () => {
    const geometry = mountainGeometry();
    expect(geometry.supports.length).toBe(9);
    const stations = geometry.supports.map((support) => support.stationM.value);
    expect(stations).toEqual([50, 100, 150, 200, 250, 300, 350, 400, 450]);
    expect(geometry.supports[0]!.supportId).toBe("A1");
    expect(geometry.supports[8]!.supportId).toBe("A2");
  });

  it("derives 8 spans matching the mountain span pairs, sum = bridge length", () => {
    const geometry = mountainGeometry();
    expect(geometry.spans.length).toBe(8);
    geometry.spans.forEach((span, index) => {
      expect(span.startSupportId).toBe(BRIDGE_SPAN_PIER_PAIRS[index]![0]);
      expect(span.endSupportId).toBe(BRIDGE_SPAN_PIER_PAIRS[index]![1]);
      expect(span.lengthM.value).toBe(50);
      expect(span.lengthM.status).toBe("DERIVED");
    });
    const sum = geometry.spans.reduce((acc, span) => acc + span.lengthM.value!, 0);
    expect(sum).toBe(400);
  });

  it("holds skew from the pier drafts as CONFIRMED rad (pi/2 for the sample)", () => {
    const geometry = mountainGeometry();
    for (const support of geometry.supports) {
      expect(support.skewRad.status).toBe("CONFIRMED");
      expect(support.skewRad.unit).toBe("rad");
      expect(support.skewRad.value).toBeCloseTo(Math.PI / 2, 9);
    }
  });

  it("derives support position/tangent/transverse from the shared alignment", () => {
    const geometry = mountainGeometry();
    const p4 = geometry.supports.find((support) => support.supportId === "P4")!;
    expect(p4.position.x.status).toBe("DERIVED");
    expect(p4.position.x.unit).toBe("m");
    expect(p4.tangent.z.status).toBe("DERIVED");
    expect(p4.transverse.x.status).toBe("DERIVED");
    expect(Number.isFinite(p4.position.x.value)).toBe(true);
    expect(Number.isFinite(p4.position.y.value)).toBe(true);
  });

  it("derives deck width from the cross-section width (12m for the sample)", () => {
    const geometry = mountainGeometry();
    expect(geometry.deckWidthM).toBeDefined();
    expect(geometry.deckWidthM!.status).toBe("DERIVED");
    expect(geometry.deckWidthM!.unit).toBe("m");
    expect(geometry.deckWidthM!.value).toBeCloseTo(12, 6);
  });

  it("uses a user-confirmed deck width when provided", () => {
    const geometry = mountainGeometry({ deckWidthM: 10.5, deckWidthSourceReference: "designer-input" });
    expect(geometry.deckWidthM!.status).toBe("CONFIRMED");
    expect(geometry.deckWidthM!.value).toBe(10.5);
    expect(geometry.deckWidthM!.sourceReference).toBe("designer-input");
  });

  it("fails closed when support placement disagrees with the alignment bridge length", () => {
    const draft = buildMountainDraft();
    const alignment = buildBridgeProjectAlignment(draft);
    const movedPiers = draft.piers!.map((pier) =>
      pier.id === "A2" ? { ...pier, physicalDistance: 460 } : pier,
    );
    expect(() => buildBridgeProjectGeometry(alignment, movedPiers)).toThrowError(
      BridgeProjectAdapterError,
    );
  });

  it("fails closed on non-ascending support stations", () => {
    const draft = buildMountainDraft();
    const alignment = buildBridgeProjectAlignment(draft, { bridgeStartStationM: 50, bridgeEndStationM: 450 });
    const reversedPiers = [...draft.piers!].reverse();
    expect(() => buildBridgeProjectGeometry(alignment, reversedPiers)).toThrowError(
      BridgeProjectAdapterError,
    );
  });

  it("derives spans from consecutive supports when no span drafts are given", () => {
    const draft = buildMountainDraft();
    const alignment = buildBridgeProjectAlignment(draft);
    const geometry = buildBridgeProjectGeometry(alignment, draft.piers);
    expect(geometry.spans.length).toBe(8);
    const sum = geometry.spans.reduce((acc, span) => acc + span.lengthM.value!, 0);
    expect(sum).toBe(400);
  });

  it("is deterministic for identical inputs", () => {
    const a = mountainGeometry();
    const b = mountainGeometry();
    expect(a).toEqual(b);
  });
});
