import { describe, expect, it } from "vitest";
import { createEmptyAnalysisDocument } from "../analysisDocument";
import type { AnalysisDocument } from "../analysisDocumentTypes";
import { UuidString } from "../analysisDocumentTypes";
import { deriveAnalysisEntityId } from "../analysisId";
import { validateAnalysisDocument } from "../analysisValidation";

const NODE_ID = deriveAnalysisEntityId("node", "supportPoint:AR2:AG1");
const MAT_ID = deriveAnalysisEntityId("material", "MAT-STEEL");
const SEC_ID = deriveAnalysisEntityId("section", "SEC-AG1");
const MEMBER_ID = deriveAnalysisEntityId("member", "M-L-AG1-S1");
const BEARING_ID = deriveAnalysisEntityId("bearing", "BRG-AR2-AG1");

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
          entityId: NODE_ID,
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
      entityId: NODE_ID,
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
    const nodeId = NODE_ID;
    const matId = MAT_ID;
    const secId = SEC_ID;
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
          entityId: MEMBER_ID,
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
          entityId: SEC_ID,
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
          entityId: BEARING_ID,
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

  it("rejects entityId that does not match deterministic uuid5 derivation (D-11)", () => {
    const wrongId = deriveAnalysisEntityId("node", "supportPoint:OTHER:AG1");
    const doc = {
      ...makeDoc(),
      nodes: [
        {
          entityId: wrongId,
          sourceEntityId: "supportPoint:AR2:AG1",
          sourceKind: "supportPoint",
          x: 0,
          y: 0,
          z: 0,
          stationM: null,
          offsetM: null,
        },
      ],
    };
    expect(
      validateAnalysisDocument(doc as unknown as AnalysisDocument).some((i) =>
        i.message.includes("deterministic uuid5 derivation"),
      ),
    ).toBe(true);
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
