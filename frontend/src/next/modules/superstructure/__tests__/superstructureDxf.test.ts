import { describe, expect, it } from "vitest";
import { buildSuperstructureDocument } from "../superstructureDocumentDomain";
import { buildSuperstructureDxf } from "../superstructureDxf";

function makeDoc() {
  const built = buildSuperstructureDocument({
    projectId: "P",
    bridgeLayoutReference: { bridgeId: "BR-1", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" },
    roadReference: { moduleId: "road", alignmentId: "ROAD-1", stationReferenceId: null, coordinatePolicyId: null },
    structuralSystem: { spanSystem: "continuous", bridgeSystem: "CONTINUOUS" },
    girderConfiguration: { girderCount: 4, girderSpacingM: 3.0, girderLines: [], girderSectionModel: { depthM: 2.0, webThicknessM: 0.012, topFlange: { widthM: 0.45, thicknessM: 0.025 }, bottomFlange: { widthM: 0.55, thicknessM: 0.03 }, areaM2: null, unitWeightPerM: null } },
    deckConfiguration: { deckId: "DECK-1", deckKind: "rc_non_composite", thicknessM: 0.24, unitWeight: 24.5, overhangLeftM: 0.5, overhangRightM: 0.5, resolvedWidthM: 12 },
    crossBeamConfiguration: null, crossFrameConfiguration: null,
    bearingConfiguration: { bearingSupportRelation: [], bearingSeats: [] },
    superstructureType: "plate_girder_rc_slab_non_composite",
  });
  if (!built.ok) throw new Error("build failed");
  return built.document;
}

describe("superstructureDxf (Phase 9-04 S-05)", () => {
  it("produces a valid R12 DXF with LINE entities from the document", () => {
    const dxf = buildSuperstructureDxf(makeDoc(), { view: "plan" });
    expect(dxf).toContain("$ACADVER");
    expect(dxf).toContain("AC1009");
    expect(dxf).toContain("SECTION");
    expect(dxf).toContain("ENTITIES");
    expect(dxf).toContain("LINE");
    expect(dxf).toContain("EOF");
    // girder lines derived from count=4
    const lineCount = (dxf.match(/\nLINE\n/g) ?? []).length;
    expect(lineCount).toBeGreaterThan(0);
  });

  it("cross-section view includes girder depth entities", () => {
    const dxf = buildSuperstructureDxf(makeDoc(), { view: "crossSection" });
    expect(dxf).toContain("GIRDER DEPTH 2");
  });
});
