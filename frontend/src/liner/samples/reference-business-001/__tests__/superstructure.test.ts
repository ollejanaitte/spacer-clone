import { describe, expect, it } from "vitest";
import {
  buildRb001Superstructure,
  describeRb001Superstructure,
  validateRb001Superstructure,
} from "../superstructure";
import { superstructureDocumentIdFor } from "../../../../next/modules/superstructure/superstructureDocumentDomain";
import { RB001_BRIDGE_ID } from "../bridgeArrangement";

describe("S-5 Superstructure Sample (RB001-SUPER-1)", () => {
  it("builds a continuous plate-girder superstructure for the RB001 bridge", () => {
    const summary = describeRb001Superstructure();
    expect(summary.documentId).toBe(superstructureDocumentIdFor(RB001_BRIDGE_ID));
    expect(summary.structuralSystem).toBe("CONTINUOUS");
    expect(summary.girderCount).toBe(2);
    expect(summary.superstructureType).toContain("plate_girder");
  });

  it("references the RB001 bridge layout and RB001 road", () => {
    const doc = buildRb001Superstructure();
    expect(doc.bridgeLayoutReference?.bridgeId).toBe(RB001_BRIDGE_ID);
    expect(doc.roadReference?.alignmentId).toBe("RB001-ROAD-1");
    expect(doc.spanReferences).toBeDefined();
    expect(doc.supportReferences).toBeDefined();
  });

  it("derives 6 spans (continuous) with spanReferences", () => {
    const doc = buildRb001Superstructure();
    expect(doc.spanReferences?.spans).toHaveLength(6);
    expect(doc.spanReferences?.spans[0].startSupportId).toBe("A1");
    expect(doc.spanReferences?.spans[0].spanLength).toBeCloseTo(50, 6);
  });

  it("passes superstructure validation with no issues", () => {
    const doc = buildRb001Superstructure();
    const issues = validateRb001Superstructure(doc);
    expect(issues).toEqual([]);
  });

  it("uses the existing superstructure model (declared section, no re-implementation)", () => {
    const doc = buildRb001Superstructure();
    // existing model: 2 girders spacing 8m + RC deck 0.24m (existing generator defaults)
    expect(doc.girderConfiguration.girderCount).toBe(2);
    expect(doc.girderConfiguration.girderSpacingM).toBe(8);
    expect(doc.deckConfiguration.thicknessM).toBe(0.24);
  });
});