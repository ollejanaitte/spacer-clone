import { describe, expect, it } from "vitest";
import {
  buildBridgePayload,
  pierError,
  pierWarning,
} from "../visual/bridge";
import type { PierDraft, SpanDraft } from "../../schema/types";

const piers: PierDraft[] = [
  { id: "K1", physicalDistance: 0, kind: "abutment", skewAngleRad: Math.PI / 2 },
  { id: "K2", physicalDistance: 50, kind: "pier", skewAngleRad: Math.PI / 2 },
];

const spans: SpanDraft[] = [
  { id: "S1", startPhysicalDistance: 0, endPhysicalDistance: 50, pierIdStart: "K1", pierIdEnd: "K2" },
];

describe("bridge visual", () => {
  it("builds pier/span objects", () => {
    const payload = buildBridgePayload({ piers, spans });
    expect(payload.plane).toBe("MIXED");
    expect(payload.objects.map((o) => o.objectId)).toEqual([
      "pier-K1", "pier-K2", "span-S1",
    ]);
  });

  it("maps station/skew/bearingOffset to piers", () => {
    const payload = buildBridgePayload({ piers });
    expect(payload.mappings).toContainEqual(
      expect.objectContaining({ fieldName: "skew", objectId: "pier-K2" }),
    );
  });

  it("adds girder objects and transverseOffset mapping", () => {
    const payload = buildBridgePayload({
      piers,
      girderLines: [{ girderId: "G1", transverseOffset: 6.0 }],
    });
    expect(payload.objects).toContainEqual(
      expect.objectContaining({ objectId: "girder-G1", kind: "girder" }),
    );
    expect(payload.mappings).toContainEqual(
      expect.objectContaining({ fieldName: "transverseOffset", objectId: "girder-G1" }),
    );
  });

  it("selects pier or span", () => {
    expect(buildBridgePayload({ piers, selectedPierId: "K2" }).selectedObjectId).toBe("pier-K2");
    expect(buildBridgePayload({ piers, spans, selectedSpanId: "S1" }).selectedObjectId).toBe("span-S1");
  });

  it("carries pier warnings and errors", () => {
    const payload = buildBridgePayload({
      piers,
      warnings: [pierWarning("K2", "X2-R-023", "clearance")],
      errors: [pierError("K1", "skew out of range")],
    });
    expect(payload.warnings[0].objectId).toBe("pier-K2");
    expect(payload.errors[0].objectId).toBe("pier-K1");
    expect(payload.errors[0].errorType).toBe("GEOMETRY_ERROR");
  });
});
