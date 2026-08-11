import { describe, expect, it } from "vitest";
import {
  createEmptyBridgeLayoutDocument,
} from "../bridgeLayoutTypes";
import {
  validateBridgeLayoutDocument,
  parseBridgeLayoutDocument,
  validateBridgeLayoutData,
} from "../bridgeLayoutValidation";
import type { BridgeLayoutDocument } from "../bridgeLayoutTypes";

function makeValidDocument(): BridgeLayoutDocument {
  const doc = createEmptyBridgeLayoutDocument();
  return {
    ...doc,
    bridgeId: "BR-001",
    name: "旭高架橋",
    roadReference: { moduleId: "road", alignmentId: "ALIGN-MTN-1", stationReferenceId: null, coordinatePolicyId: null } as const,
    bridgeRange: { startStation: 50, endStation: 450 },
    abutments: {
      A1: { supportId: "A1", station: 50, skewAngleRad: Math.PI / 2 },
      A2: { supportId: "A2", station: 450, skewAngleRad: Math.PI / 2 },
    },
    piers: [
      { supportId: "P1", station: 150, skewAngleRad: null },
      { supportId: "P2", station: 250, skewAngleRad: null },
      { supportId: "P3", station: 350, skewAngleRad: null },
    ],
    spans: [
      { spanId: "S1", index: 1, startSupportId: "A1", endSupportId: "P1", startStation: 50, endStation: 150, length: 100 },
      { spanId: "S2", index: 2, startSupportId: "P1", endSupportId: "P2", startStation: 150, endStation: 250, length: 100 },
      { spanId: "S3", index: 3, startSupportId: "P2", endSupportId: "P3", startStation: 250, endStation: 350, length: 100 },
      { spanId: "S4", index: 4, startSupportId: "P3", endSupportId: "A2", startStation: 350, endStation: 450, length: 100 },
    ],
    skew: { signConvention: "counterclockwise-positive", angleRad: Math.PI / 2 },
    terrainReference: { moduleId: "terrain", surfaceReference: "assets/terrain/reference.bin", coordinateContextId: "COORD-1" },
    existingConditionsReference: { moduleId: "terrain", documentReferenceId: "0.1.0" },
  };
}

describe("Phase 4-01 Bridge Layout Contract validation", () => {
  it("valid document has no issues", () => {
    const issues = validateBridgeLayoutDocument(makeValidDocument());
    expect(issues).toEqual([]);
  });

  it("bridgeId is required", () => {
    const doc = { ...makeValidDocument(), bridgeId: " " };
    const issues = validateBridgeLayoutDocument(doc);
    expect(issues.some((i) => i.path === "bridgeLayoutDocument.bridgeId")).toBe(true);
  });

  it("roadReference is required (moduleId road)", () => {
    // runtime data may violate the type (comes from JSON); validator must reject
    const doc = { ...makeValidDocument(), roadReference: { moduleId: "terrain", alignmentId: "X", stationReferenceId: null, coordinatePolicyId: null } } as unknown as BridgeLayoutDocument;
    const issues = validateBridgeLayoutDocument(doc);
    expect(issues.some((i) => i.path === "bridgeLayoutDocument.roadReference")).toBe(true);
  });

  it("empty roadReference.alignmentId is rejected", () => {
    const doc = { ...makeValidDocument(), roadReference: { moduleId: "road", alignmentId: null, stationReferenceId: null, coordinatePolicyId: null } } as unknown as BridgeLayoutDocument;
    const issues = validateBridgeLayoutDocument(doc);
    expect(issues.some((i) => i.path === "bridgeLayoutDocument.roadReference.alignmentId")).toBe(true);
  });

  it("startStation must be less than endStation", () => {
    const doc = { ...makeValidDocument(), bridgeRange: { startStation: 450, endStation: 50 } };
    const issues = validateBridgeLayoutDocument(doc);
    expect(issues.some((i) => i.message.includes("startStation must be less than endStation"))).toBe(true);
  });

  it("A1/A2 supportId identification is enforced", () => {
    const doc = { ...makeValidDocument(), abutments: { A1: { ...makeValidDocument().abutments.A1, supportId: "P9" }, A2: makeValidDocument().abutments.A2 } };
    const issues = validateBridgeLayoutDocument(doc);
    expect(issues.some((i) => i.path === "bridgeLayoutDocument.abutments.A1.supportId")).toBe(true);
  });

  it("duplicate pier ids are rejected", () => {
    const doc = { ...makeValidDocument(), piers: [makeValidDocument().piers[0], { ...makeValidDocument().piers[0], station: 200 }] };
    const issues = validateBridgeLayoutDocument(doc);
    expect(issues.some((i) => i.message.includes("duplicate pier supportId"))).toBe(true);
  });

  it("station order across A1/piers/A2 is enforced", () => {
    const doc = { ...makeValidDocument(), piers: [makeValidDocument().piers[1], makeValidDocument().piers[0], makeValidDocument().piers[2]] };
    const issues = validateBridgeLayoutDocument(doc);
    expect(issues.some((i) => i.message.includes("station order violation"))).toBe(true);
  });

  it("span length must be greater than 0", () => {
    const doc = { ...makeValidDocument(), spans: [{ ...makeValidDocument().spans[0], length: 0 }] };
    const issues = validateBridgeLayoutDocument(doc);
    expect(issues.some((i) => i.path.includes("length") && i.message.includes("greater than 0"))).toBe(true);
  });

  it("broken span reference (unknown support id) is rejected", () => {
    const doc = { ...makeValidDocument(), spans: [{ ...makeValidDocument().spans[0], endSupportId: "P99" }] };
    const issues = validateBridgeLayoutDocument(doc);
    expect(issues.some((i) => i.message.includes("broken span reference"))).toBe(true);
  });

  it("NaN / Infinity are rejected", () => {
    const doc = { ...makeValidDocument(), bridgeRange: { startStation: Number.NaN, endStation: Infinity } };
    const issues = validateBridgeLayoutDocument(doc);
    expect(issues.some((i) => i.message.includes("finite numbers"))).toBe(true);
    const doc2 = { ...makeValidDocument(), skew: { ...makeValidDocument().skew, angleRad: Number.NaN } };
    const issues2 = validateBridgeLayoutDocument(doc2);
    expect(issues2.some((i) => i.path === "bridgeLayoutDocument.skew.angleRad")).toBe(true);
  });

  it("schemaVersion mismatch is rejected", () => {
    const doc = { ...makeValidDocument(), schemaVersion: "9.9.9" };
    const issues = validateBridgeLayoutDocument(doc);
    expect(issues.some((i) => i.path === "bridgeLayoutDocument.schemaVersion")).toBe(true);
  });

  it("module data validation: empty data valid, malformed doc rejected", () => {
    expect(validateBridgeLayoutData({})).toEqual([]);
    expect(validateBridgeLayoutData({ bridgeLayoutDocument: "nope" }).length).toBeGreaterThan(0);
  });
});

describe("Phase 4-01 Bridge Layout parser (fail-closed)", () => {
  it("round-trips a serialized document", () => {
    const doc = makeValidDocument();
    const roundTripped = JSON.parse(JSON.stringify(doc));
    const parsed = parseBridgeLayoutDocument(roundTripped);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.document.bridgeId).toBe("BR-001");
      expect(parsed.document.spans).toHaveLength(4);
      expect(parsed.document.bridgeRange.startStation).toBe(50);
    }
  });

  it("rejects non-object input", () => {
    expect(parseBridgeLayoutDocument(null).ok).toBe(false);
    expect(parseBridgeLayoutDocument([1, 2]).ok).toBe(false);
    expect(parseBridgeLayoutDocument("x").ok).toBe(false);
  });

  it("rejects invalid numbers (NaN/Infinity)", () => {
    const raw = JSON.parse(JSON.stringify(makeValidDocument()));
    raw.bridgeRange.startStation = "not-a-number";
    const parsed = parseBridgeLayoutDocument(raw);
    expect(parsed.ok).toBe(false);
  });

  it("rejects missing bridgeId", () => {
    const raw = JSON.parse(JSON.stringify(makeValidDocument()));
    delete raw.bridgeId;
    const parsed = parseBridgeLayoutDocument(raw);
    expect(parsed.ok).toBe(false);
  });

  it("rejects invalid schema version", () => {
    const raw = JSON.parse(JSON.stringify(makeValidDocument()));
    raw.schemaVersion = "0.0.0";
    const parsed = parseBridgeLayoutDocument(raw);
    expect(parsed.ok).toBe(false);
  });
});
