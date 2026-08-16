import { describe, expect, it } from "vitest";
import {
  RB001_BRIDGE_CANDIDATE,
} from "../roadAlignment";
import {
  RB001_BRIDGE_ID,
  RB001_BRIDGE_LENGTH,
  RB001_SUPPORT_STATIONS,
  buildRb001BridgeLayout,
  describeRb001BridgeLayout,
} from "../bridgeArrangement";
import { validateBridgeLayoutDocument } from "../../../../next/modules/bridgeLayout/bridgeLayoutValidation";
import { validateSpanConfiguration } from "../../../../next/modules/bridgeLayout/bridgeLayoutSpans";

describe("S-4 Bridge Placement / Span Arrangement (RB001-BRIDGE-1)", () => {
  it("covers the bridge candidate section of RB001-ROAD-1 (STA.1200-1500)", () => {
    const doc = buildRb001BridgeLayout();
    expect(doc.bridgeId).toBe(RB001_BRIDGE_ID);
    expect(doc.bridgeRange.startStation).toBe(RB001_BRIDGE_CANDIDATE.startStation);
    expect(doc.bridgeRange.endStation).toBe(RB001_BRIDGE_CANDIDATE.endStation);
    expect(RB001_BRIDGE_LENGTH).toBe(300);
    expect(doc.bridgeRange.bridgeLength).toBe(300);
  });

  it("arranges 6 equal spans of 50m with A1 + P1..P5 + A2", () => {
    const summary = describeRb001BridgeLayout();
    expect(summary.spanCount).toBe(6);
    expect(summary.supportCount).toBe(7);
    expect(summary.spans).toHaveLength(6);
    for (const span of summary.spans) {
      expect(span.length).toBeCloseTo(50, 6);
    }
    expect(summary.spans[0].startStation).toBe(1200);
    expect(summary.spans[5].endStation).toBe(1500);
  });

  it("keeps pier stations at 50m intervals from the bridge candidate", () => {
    const doc = buildRb001BridgeLayout();
    const pierStations = doc.piers.map((p) => p.station).sort((a, b) => a - b);
    expect(pierStations).toEqual([1250, 1300, 1350, 1400, 1450]);
    expect(RB001_SUPPORT_STATIONS).toHaveLength(7);
  });

  it("passes bridge layout validation and span configuration validation", () => {
    const doc = buildRb001BridgeLayout();
    const spanIssues = validateSpanConfiguration({ document: doc });
    const docIssues = validateBridgeLayoutDocument(doc);
    expect([...spanIssues, ...docIssues]).toEqual([]);
    expect(doc.validation.ok).toBe(true);
    expect(doc.validation.issues).toEqual([]);
  });

  it("computes A1/A2 placement candidates from the road module (station→XYZ)", () => {
    const doc = buildRb001BridgeLayout();
    const a1 = doc.abutments.A1.placement;
    const a2 = doc.abutments.A2.placement;
    expect(a1).toBeDefined();
    expect(a2).toBeDefined();
    expect(a1?.domainX).toBeGreaterThan(84000);
    expect(a1?.domainX).toBeLessThan(89050);
    expect(a2?.domainX).toBeGreaterThan(a1!.domainX);
    expect(typeof a1?.tangentAzimuthRad).toBe("number");
    expect(a1?.roadReferenceId).toBe("RB001-ROAD-1");
  });
});