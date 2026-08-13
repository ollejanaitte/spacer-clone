import { describe, expect, it } from "vitest";
import { createEmptyAnalysisDocument } from "../analysisDocument";
import type { AnalysisDocument } from "../analysisDocumentTypes";
import type { UuidString } from "../analysisDocumentTypes";
import { validateAnalysisDocument } from "../analysisValidation";

function makeDoc(): AnalysisDocument {
  return createEmptyAnalysisDocument({
    projectId: "p-1",
    createdBy: "test",
    sourceReferences: {
      bridgeLayout: { bridgeId: "B-1", documentVersion: "1", layoutFingerprint: "f" },
      superstructure: null,
      substructure: null,
      loadFingerprint: null,
      solverSettingsFingerprint: null,
    },
  });
}

describe("analysisValidation (Phase 7-01 A §5 FROZEN)", () => {
  it("accepts a valid empty document", () => {
    expect(validateAnalysisDocument(makeDoc())).toHaveLength(0);
  });

  it("rejects schemaId mismatch", () => {
    const doc = { ...makeDoc(), schemaId: "wrong.schema" } as unknown as AnalysisDocument;
    expect(validateAnalysisDocument(doc as unknown as AnalysisDocument).some((i) => i.path === "schemaId")).toBe(true);
  });

  it("rejects unsupported schemaVersion", () => {
    const doc = { ...makeDoc(), schemaVersion: "0.9.0" } as unknown as AnalysisDocument;
    expect(validateAnalysisDocument(doc as unknown as AnalysisDocument).some((i) => i.path === "schemaVersion")).toBe(true);
  });

  it("rejects non-finite node coordinates (INVALID_NUMERIC_VALUE)", () => {
    const doc = {
      ...makeDoc(),
      nodes: [
        {
          entityId: "33333333-3333-4333-8333-333333333333" as UuidString,
          sourceEntityId: "supportPoint:AR2:AG1",
          sourceKind: "supportPoint" as const,
          x: 0,
          y: Number.NaN,
          z: 0,
          stationM: null,
          offsetM: null,
        },
      ],
    };
    const issues = validateAnalysisDocument(doc as unknown as AnalysisDocument);
    expect(issues.some((i) => i.path.includes("position"))).toBe(true);
  });

  it("rejects duplicate node entityId", () => {
    const node = {
      entityId: "33333333-3333-4333-8333-333333333333" as UuidString,
      sourceEntityId: "supportPoint:AR2:AG1",
      sourceKind: "supportPoint" as const,
      x: 0,
      y: 0,
      z: 0,
      stationM: null,
      offsetM: null,
    };
    const doc = { ...makeDoc(), nodes: [node, node] };
    expect(validateAnalysisDocument(doc as unknown as AnalysisDocument).some((i) => i.message.includes("duplicate"))).toBe(true);
  });

  it("rejects zero-length member and dangling references", () => {
    const nodeId = "33333333-3333-4333-8333-333333333333";
    const matId = "44444444-4444-4444-8444-444444444444";
    const secId = "55555555-5555-4555-8555-555555555555";
    const doc = {
      ...makeDoc(),
      nodes: [
        {
          entityId: nodeId,
          sourceEntityId: "n",
          sourceKind: "supportPoint" as const,
          x: 0,
          y: 0,
          z: 0,
          stationM: null,
          offsetM: null,
        },
      ],
      materials: [
        {
          entityId: matId,
          sourceEntityId: "steel",
          sourceKind: "structuralSteel",
          name: null,
          elasticModulus: 205000000,
          shearModulus: 78846153.8,
          poissonRatio: 0.3,
          density: 78.5,
          source: "DERIVED",
        },
      ],
      sections: [
        {
          entityId: secId,
          sourceEntityId: "sec",
          sourceKind: "girderSectionModel",
          name: null,
          area: 0.02,
          iy: 0.0001,
          iz: 0.0001,
          j: 0.00005,
          depthM: null,
          webThicknessM: null,
          topFlangeWidthM: null,
          topFlangeThicknessM: null,
          bottomFlangeWidthM: null,
          bottomFlangeThicknessM: null,
          derivation: "COMPUTED",
          unitWeightPerM: null,
        },
      ],
      members: [
        {
          entityId: "66666666-6666-4666-8666-666666666666" as UuidString,
          sourceEntityId: "m",
          sourceKind: "mainGirder",
          elementType: "frame",
          nodeIId: nodeId,
          nodeJId: nodeId,
          materialId: matId,
          sectionId: secId,
          memberKind: "mainGirder",
          orientationVector: { x: 0, y: 1, z: 0 },
          localAxis: null,
          release: null,
          eccentricity: null,
        },
      ],
    };
    const issues = validateAnalysisDocument(doc as unknown as AnalysisDocument);
    expect(issues.some((i) => i.message.includes("ZERO_LENGTH_MEMBER"))).toBe(true);
  });

  it("rejects NOT_AVAILABLE section (fail-closed)", () => {
    const doc = {
      ...makeDoc(),
      sections: [
        {
          entityId: "55555555-5555-4555-8555-555555555555" as UuidString,
          sourceEntityId: "sec",
          sourceKind: "NOT_AVAILABLE",
          name: null,
          area: 0,
          iy: 0,
          iz: 0,
          j: 0,
          depthM: null,
          webThicknessM: null,
          topFlangeWidthM: null,
          topFlangeThicknessM: null,
          bottomFlangeWidthM: null,
          bottomFlangeThicknessM: null,
          derivation: "NOT_AVAILABLE",
          unitWeightPerM: null,
        },
      ],
    };
    expect(validateAnalysisDocument(doc as unknown as AnalysisDocument).some((i) => i.message.includes("NOT_AVAILABLE"))).toBe(true);
  });

  it("rejects pot bearings (UNSUPPORTED in Phase 7-02)", () => {
    const doc = {
      ...makeDoc(),
      bearings: [
        {
          entityId: "77777777-7777-4777-8777-777777777777" as UuidString,
          sourceEntityId: "BRG-AR2-AG1",
          sourceKind: "bearingSeat",
          seatId: "BRG-AR2-AG1",
          supportId: "AR2",
          girderId: "AG1",
          bearingType: "pot",
          fixedOrMovable: "FIXED",
          position: { x: 0, y: 0, z: 0 },
          localFrame: {
            tangent: { x: 1, y: 0, z: 0 },
            transverse: { x: 0, y: 1, z: 0 },
            vertical: { x: 0, y: 0, z: 1 },
          },
          dofConstraint: { ux: true, uy: true, uz: true, rx: false, ry: false, rz: false },
          constraintApproximation: null,
          springIds: [],
        },
      ],
    };
    expect(validateAnalysisDocument(doc as unknown as AnalysisDocument).some((i) => i.message.includes("UNSUPPORTED"))).toBe(true);
  });

  it("rejects non-linear-static analysis", () => {
    const doc = {
      ...makeDoc(),
      analysisSettings: {
        ...makeDoc().analysisSettings,
        analysisType: "nonlinear",
      },
    };
    expect(validateAnalysisDocument(doc as unknown as AnalysisDocument).some((i) => i.path === "analysisSettings.analysisType")).toBe(true);
  });
});
