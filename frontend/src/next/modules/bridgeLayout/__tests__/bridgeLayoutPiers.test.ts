import { describe, expect, it } from "vitest";
import {
  createEmptyBridgeLayoutDocument,
} from "../bridgeLayoutTypes";
import type { BridgeLayoutDocument } from "../bridgeLayoutTypes";
import {
  listOrderedSupports,
  nextPierId,
  addPier,
  removePier,
  updatePierStation,
  updatePierSkew,
  validatePierConfiguration,
} from "../bridgeLayoutPiers";
import { validateBridgeLayoutDocument } from "../bridgeLayoutValidation";
import type { PierPlacement } from "../bridgeLayoutTypes";

function makeRangeDoc(piers: readonly PierPlacement[] = []): BridgeLayoutDocument {
  const doc = createEmptyBridgeLayoutDocument();
  return {
    ...doc,
    bridgeId: "BR-400",
    name: "P1..Pn配置",
    roadReference: { moduleId: "road", alignmentId: "ROAD-MTN-1", stationReferenceId: null, coordinatePolicyId: null },
    bridgeRange: { startStation: 100, endStation: 700, bridgeLength: 600 },
    abutments: {
      A1: { supportId: "A1", station: 100, skewAngleRad: null },
      A2: { supportId: "A2", station: 700, skewAngleRad: null },
    },
    piers,
    spans: [],
    skew: { signConvention: "counterclockwise-positive", angleRad: null },
    terrainReference: { moduleId: "terrain", surfaceReference: null, coordinateContextId: null },
    existingConditionsReference: { moduleId: "terrain", documentReferenceId: null },
  };
}

describe("Phase 4-03 Pier domain", () => {
  it("handles zero piers", () => {
    const doc = makeRangeDoc();
    const supports = listOrderedSupports(doc);
    expect(supports).toHaveLength(2);
    expect(supports.map((s) => s.label)).toEqual(["A1", "A2"]);
    expect(validatePierConfiguration({ document: doc })).toHaveLength(0);
  });

  it("adds a pier with auto id / next id sequence", () => {
    let doc = makeRangeDoc();
    doc = addPier(doc, { station: 300 });
    expect(doc.piers).toHaveLength(1);
    expect(doc.piers[0].supportId).toBe("P1");
    expect(doc.piers[0].label).toBe("P1");
    expect(doc.piers[0].station).toBe(300);
    doc = addPier(doc, { station: 500 });
    expect(doc.piers[1].supportId).toBe("P2");
    expect(doc.piers[1].station).toBe(500);
  });

  it("supports one pier and multiple piers", () => {
    const one = addPier(makeRangeDoc(), { station: 400 });
    expect(one.piers).toHaveLength(1);
    const two = addPier(one, { station: 300 });
    expect(two.piers).toHaveLength(2);
    const three = addPier(two, { supportId: "P9", station: 550 });
    expect(three.piers).toHaveLength(3);
  });

  it("removes a pier by supportId", () => {
    let doc = makeRangeDoc();
    doc = addPier(doc, { station: 300 });
    doc = addPier(doc, { station: 500 });
    doc = removePier(doc, "P1");
    expect(doc.piers.map((p) => p.supportId)).toEqual(["P2"]);
  });

  it("updates pier station", () => {
    let doc = addPier(makeRangeDoc(), { station: 300 });
    doc = updatePierStation(doc, "P1", 350);
    expect(doc.piers[0].station).toBe(350);
  });

  it("updates pier skew (CCW-positive convention)", () => {
    let doc = addPier(makeRangeDoc(), { station: 300 });
    doc = updatePierSkew(doc, "P1", Math.PI / 2);
    expect(doc.piers[0].skewAngleRad).toBeCloseTo(Math.PI / 2, 6);
    expect(doc.piers[0].skewSource).toBe("user");
  });

  it("orders supports A1 < P1 < P2 < ... < A2", () => {
    let doc = makeRangeDoc();
    doc = addPier(doc, { supportId: "P2", station: 500 });
    doc = addPier(doc, { supportId: "P1", station: 300 });
    doc = addPier(doc, { supportId: "P3", station: 600 });
    const supports = listOrderedSupports(doc);
    expect(supports.map((s) => s.label)).toEqual(["A1", "P1", "P2", "P3", "A2"]);
    const stations = supports.map((s) => s.station);
    expect(stations).toEqual([...stations].sort((a, b) => a - b));
    expect(stations).toEqual([100, 300, 500, 600, 700]);
  });
});

describe("Phase 4-03 Pier validation", () => {
  it("rejects duplicate pier supportId", () => {
    let doc = makeRangeDoc();
    doc = addPier(doc, { supportId: "P1", station: 300 });
    doc = addPier(doc, { supportId: "P1", station: 400 });
    const issues = validateBridgeLayoutDocument(doc);
    expect(issues.some((i) => i.message.includes("duplicate pier supportId: P1"))).toBe(true);
    expect(validatePierConfiguration({ document: doc }).some((i) => i.message.includes("duplicate pier supportId: P1"))).toBe(true);
  });

  it("rejects duplicate pier station", () => {
    let doc = makeRangeDoc();
    doc = addPier(doc, { supportId: "P1", station: 300 });
    doc = addPier(doc, { supportId: "P2", station: 300 });
    expect(validatePierConfiguration({ document: doc }).some((i) => i.message.includes("duplicate pier station: 300"))).toBe(true);
    // document validation also rejects via ordering (P2 <= P1)
    expect(validateBridgeLayoutDocument(doc).some((i) => i.message.includes("station order violation"))).toBe(true);
  });

  it("rejects NaN / Infinity station", () => {
    const doc = makeRangeDoc([{ supportId: "P1", station: Number.NaN, skewAngleRad: null }]);
    expect(validatePierConfiguration({ document: doc }).some((i) => i.path.endsWith("station") && i.message.includes("finite"))).toBe(true);
    expect(validateBridgeLayoutDocument(doc).some((i) => i.message.includes("finite"))).toBe(true);
    const inf = makeRangeDoc([{ supportId: "P1", station: Infinity, skewAngleRad: null }]);
    expect(validatePierConfiguration({ document: inf }).some((i) => i.message.includes("finite"))).toBe(true);
  });

  it("rejects station outside the bridge range (A1..A2)", () => {
    const doc = makeRangeDoc([{ supportId: "P1", station: 50, skewAngleRad: null }]);
    expect(validatePierConfiguration({ document: doc }).some((i) => i.message.includes("outside the bridge range"))).toBe(true);
    const docHigh = makeRangeDoc([{ supportId: "P1", station: 900, skewAngleRad: null }]);
    expect(validatePierConfiguration({ document: docHigh }).some((i) => i.message.includes("outside the bridge range"))).toBe(true);
    // A1/A2 itself is not a pier so a pier at exactly A1 is rejected
    const docAtA1 = makeRangeDoc([{ supportId: "P1", station: 100, skewAngleRad: null }]);
    expect(validatePierConfiguration({ document: docAtA1 }).some((i) => i.message.includes("outside the bridge range"))).toBe(true);
  });

  it("rejects ordering violations (P2 before P1)", () => {
    let doc = makeRangeDoc();
    doc = addPier(doc, { supportId: "P1", station: 500 });
    doc = addPier(doc, { supportId: "P2", station: 300 });
    const issues = validatePierConfiguration({ document: doc });
    expect(issues.some((i) => i.message.includes("station order violation"))).toBe(true);
  });

  it("accepts a valid ordered configuration", () => {
    let doc = makeRangeDoc();
    doc = addPier(doc, { station: 300 });
    doc = addPier(doc, { station: 500 });
    expect(validatePierConfiguration({ document: doc })).toHaveLength(0);
    expect(validateBridgeLayoutDocument(doc).filter((i) => i.path.includes("piers"))).toHaveLength(0);
  });

  it("validates pier label / metadata / placement when present", () => {
    const ok = makeRangeDoc([{
      supportId: "P1",
      station: 300,
      skewAngleRad: null,
      label: "橋脚P1",
      metadata: { note: "test" },
      placement: {
        domainX: 200,
        domainY: 500,
        elevation: 103,
        tangentAzimuthRad: 0,
        terrainElevation: 90,
        roadReferenceId: "ROAD-MTN-1",
        coordinateContextId: "COORD-1",
        capturedAt: "2026-08-12T00:00:00.000Z",
      },
    }] as BridgeLayoutDocument["piers"]);
    expect(validateBridgeLayoutDocument(ok).filter((i) => i.path.includes("piers"))).toHaveLength(0);
    const bad = makeRangeDoc([{ supportId: "P1", station: 300, skewAngleRad: null, placement: { domainX: NaN, domainY: 0, elevation: 0, tangentAzimuthRad: 0, terrainElevation: null, roadReferenceId: "", coordinateContextId: null, capturedAt: "" } }] as BridgeLayoutDocument["piers"]);
    const pierIssues = validateBridgeLayoutDocument(bad).filter((i) => i.path.includes("piers"));
    expect(pierIssues.some((i) => i.message.includes("placement.domainX must be a finite number"))).toBe(true);
    expect(pierIssues.some((i) => i.message.includes("roadReferenceId is required"))).toBe(true);
  });
});
