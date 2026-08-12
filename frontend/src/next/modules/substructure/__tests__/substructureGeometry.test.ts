import { describe, expect, it } from "vitest";
import { buildSubstructureDocument, attachSubstructureHandoffs } from "../substructureDocumentDomain";
import { validateSubstructureShapes, buildSubstructureSolids } from "../substructureGeometry";
import type { SubstructureDocument } from "../substructureTypes";

function makeDocument(): SubstructureDocument {
  const built = buildSubstructureDocument({
    projectId: "PROJ-1",
    bridgeLayoutReference: { bridgeId: "BR-900", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" },
    superstructureReference: { bridgeId: "BR-900", moduleId: "superstructure", documentVersion: "0.1.0", superstructureDocumentId: "SS-1", handoffSchemaVersion: "1.0.0" },
    roadReference: { moduleId: "road", alignmentId: "ALN-1", stationReferenceId: null, coordinatePolicyId: null },
    supports: [
      {
        supportId: "A1",
        supportType: "abutment",
        placement: { source: "liner", alignmentId: "ALN-1", station: 100, offset: 0 },
        skewRad: 0,
        placementSnapshot: {
          source: "liner",
          position: { x: 100, y: 0, z: 100 },
          tangent: { x: 1, y: 0, z: 0 },
          transverse: { x: 0, y: 1, z: 0 },
          vertical: { x: 0, y: 0, z: 1 },
          azimuthRad: 0,
          skewRad: 0,
        },
        bearingSeats: [],
        abutment: {
          id: "ab-A1",
          formType: "inverted_t",
          backwall: { id: "bw", height: 2.0, thickness: 0.5, width: 12.0, seatElevation: 103.0 },
          wingWallL: { id: "wl", length: 3.0, height: 2.0, thickness: 0.4 },
          wingWallR: { id: "wr", length: 3.0, height: 2.0, thickness: 0.4 },
          footing: { id: "ft", length: 14.0, width: 5.0, thickness: 1.5, topElevation: 101.0 },
          pileGroup: null,
        },
      },
      {
        supportId: "P1",
        supportType: "pier",
        placement: { source: "liner", alignmentId: "ALN-1", station: 300, offset: 0 },
        skewRad: 0,
        placementSnapshot: {
          source: "liner",
          position: { x: 300, y: 0, z: 100 },
          tangent: { x: 1, y: 0, z: 0 },
          transverse: { x: 0, y: 1, z: 0 },
          vertical: { x: 0, y: 0, z: 1 },
          azimuthRad: 0,
          skewRad: 0,
        },
        bearingSeats: [],
        pier: {
          id: "p1",
          formType: "single_column_rect",
          column: { id: "c1", width: 2.0, depth: 2.0, height: 8.0 },
          footing: { id: "ft-p1", length: 6.0, width: 6.0, thickness: 2.0, topElevation: 99.0 },
          pileGroup: null,
        },
      },
    ],
  });
  if (!built.ok) throw new Error("build failed");
  return built.document;
}

describe("Substructure geometry (WP-E)", () => {
  it("validates valid pier/abutment shapes (T6-GEO-003/004/006)", () => {
    const issues = validateSubstructureShapes(makeDocument());
    expect(issues).toEqual([]);
  });

  it("rejects non-positive dimensions (T6-GEO-006)", () => {
    const doc = makeDocument();
    const bad = {
      ...doc,
      supports: [
        { ...doc.supports[1], pier: { ...doc.supports[1].pier!, column: { ...doc.supports[1].pier!.column!, height: 0 } } },
      ],
    };
    const issues = validateSubstructureShapes(bad);
    expect(issues.some((i) => i.path.includes("pier.column.height"))).toBe(true);
  });

  it("builds solids for a document with shapes (no snapshot -> fallback grouping)", () => {
    const doc = makeDocument();
    const solids = buildSubstructureSolids(doc);
    expect(solids).toHaveLength(2);
  });

  it("portal pier form is accepted by validation", () => {
    const doc = makeDocument();
    const portal = {
      ...doc,
      supports: [
        {
          ...doc.supports[1],
          pier: {
            id: "p1",
            formType: "portal_frame" as const,
            columns: [
              { id: "c1", width: 2.0, depth: 2.0, height: 8.0, transverseOffset: -4 },
              { id: "c2", width: 2.0, depth: 2.0, height: 8.0, transverseOffset: 4 },
            ],
            beam: { id: "b1", width: 1.5, depth: 1.0, height: 1.5 },
            footing: { id: "ft-p1", length: 10.0, width: 6.0, thickness: 2.0, topElevation: 99.0 },
            pileGroup: null,
          },
        },
      ],
    };
    const issues = validateSubstructureShapes(portal);
    expect(issues).toEqual([]);
  });
});
