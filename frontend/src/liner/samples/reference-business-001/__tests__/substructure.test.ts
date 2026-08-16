import { describe, expect, it } from "vitest";
import {
  buildRb001Substructure,
  describeRb001Substructure,
  validateRb001Substructure,
} from "../substructure";
import { substructureDocumentIdFor } from "../../../../next/modules/substructure/substructureDocumentDomain";
import { RB001_BRIDGE_ID } from "../bridgeArrangement";

describe("S-6 Substructure Sample (RB001-SUB-1)", () => {
  it("builds abutments A1/A2 and piers P1..P5 matching the bridge layout", () => {
    const summary = describeRb001Substructure();
    expect(summary.documentId).toBe(substructureDocumentIdFor(RB001_BRIDGE_ID));
    expect(summary.supportCount).toBe(7);
    const ids = summary.supports.map((s) => s.supportId);
    expect(ids).toEqual(["A1", "P1", "P2", "P3", "P4", "P5", "A2"]);
  });

  it("aligns support stations with the S-4 span arrangement", () => {
    const summary = describeRb001Substructure();
    const stations = summary.supports.map((s) => s.station);
    expect(stations).toEqual([1200, 1250, 1300, 1350, 1400, 1450, 1500]);
    for (const s of summary.supports) {
      expect(s.supportType).toBe(s.supportId.startsWith("A") ? "abutment" : "pier");
    }
  });

  it("references the RB001 bridge layout, superstructure, road, and Gujo terrain", () => {
    const doc = buildRb001Substructure();
    expect(doc.bridgeLayoutReference?.bridgeId).toBe(RB001_BRIDGE_ID);
    expect(doc.superstructureReference?.superstructureDocumentId).toBe("RB001-SUPER-1");
    expect(doc.roadReference?.alignmentId).toBe("RB001-ROAD-1");
    expect(doc.terrainReferences?.surfaceReference).toBe("assets/terrain/gujo-hachiman-sample.sct1");
    expect(doc.terrainReferences?.coordinateContextId).toBe("ctx-gujo-jgd2011-6674");
  });

  it("passes substructure validation with no issues", () => {
    const doc = buildRb001Substructure();
    const issues = validateRb001Substructure(doc);
    expect(issues).toEqual([]);
  });

  it("uses the existing substructure model (LINER placement, no re-implementation)", () => {
    const doc = buildRb001Substructure();
    for (const support of doc.supports) {
      expect(support.placement.source).toBe("liner");
      expect(support.placement.alignmentId).toBe("RB001-ROAD-1");
      expect(support.placement.station).toBeGreaterThanOrEqual(1200);
      expect(support.placement.station).toBeLessThanOrEqual(1500);
    }
    expect(doc.supportReferences?.supports).toHaveLength(7);
  });
});