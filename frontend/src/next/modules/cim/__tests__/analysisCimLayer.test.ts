import { describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { createEmptyAnalysisDocument, finalizeAnalysisDocument } from "../../analysis/analysisDocument";
import { serializeAnalysisModuleDataForPersistence } from "../../analysis/analysisModuleData";
import { createInitialModuleData } from "../../contract";
import { buildAnalysisCimLayer } from "../analysisCimLayer";
import type { AnalysisDocument } from "../../analysis/analysisDocumentTypes";
import { deriveAnalysisEntityId } from "../../analysis/analysisId";

function makeProject() {
  resetProjectManagerForTest();
  const project = applyBusinessMetadata(createEmptyProject("CIM Analysis"), {
    businessNumber: "CIM-AN-1",
    designStage: "bridge-detailed",
  });
  expect(getProjectManager().importProject(project)).toBe(true);
  return getProjectManager().listProjects()[0]!;
}

function makeAnalysisDocument() {
  const base = createEmptyAnalysisDocument({
    projectId: "PROJ-1",
    createdBy: "test",
    sourceReferences: { bridgeLayout: null, superstructure: null, substructure: null, loadFingerprint: null, solverSettingsFingerprint: null },
  });
  const nodes = [
    { entityId: deriveAnalysisEntityId("node", "super:N1"), sourceEntityId: "super:N1", sourceKind: "mainGirder", x: 0, y: 0, z: 100, stationM: 0, offsetM: 0 },
    { entityId: deriveAnalysisEntityId("node", "super:N2"), sourceEntityId: "super:N2", sourceKind: "mainGirder", x: 10, y: 0, z: 100, stationM: 10, offsetM: 0 },
  ];
  const node1Id = deriveAnalysisEntityId("node", "super:N1");
  const node2Id = deriveAnalysisEntityId("node", "super:N2");
  const members = [
    {
      entityId: deriveAnalysisEntityId("member", "super:M1"), sourceEntityId: "super:M1", sourceKind: "mainGirder",
      elementType: "frame", nodeIId: node1Id, nodeJId: node2Id,
      materialId: deriveAnalysisEntityId("material", "MAT-1"),
      sectionId: deriveAnalysisEntityId("section", "SEC-1"),
      endReleases: [], endOffset: null, startDirection: null, orientationVector: { x: 0, y: 0, z: 1 }, metadata: {},
    },
  ];
  const supports = [
    {
      entityId: deriveAnalysisEntityId("support", "sub:A1"), sourceEntityId: "sub:A1", sourceKind: "support", nodeId: node1Id, seatId: null,
      constraint: { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true },
      constraintApproximation: null, springIds: [], localFrame: null, source: "substructure",
    },
  ];
  const materials = [
    {
      entityId: deriveAnalysisEntityId("material", "MAT-1"), sourceEntityId: "MAT-1", sourceKind: "girder",
      name: "SS400", elasticModulus: 2e8, shearModulus: 7.7e7, unitWeight: 77,
    },
  ];
  const sections = [
    {
      entityId: deriveAnalysisEntityId("section", "SEC-1"), sourceEntityId: "SEC-1", sourceKind: "mainGirder",
      name: "I-800", area: 0.1, iy: 0.01, iz: 0.02, j: 0.005,
    },
  ];
  const withData: AnalysisDocument = {
    ...base,
    nodes: nodes as unknown as AnalysisDocument["nodes"],
    members: members as unknown as AnalysisDocument["members"],
    supports: supports as unknown as AnalysisDocument["supports"],
    materials: materials as unknown as AnalysisDocument["materials"],
    sections: sections as unknown as AnalysisDocument["sections"],
    springs: [], foundationSprings: [], bearings: [], nodalLoads: [],
    memberLoads: [], loadCases: [], loadCombinations: [],
  };
  return finalizeAnalysisDocument(withData as never);
}

describe("Analysis CIM layer (Phase 8-02 WP-H)", () => {
  it("builds FEM node/member/support groups with metadata", () => {
    const project = makeProject();
    const doc = makeAnalysisDocument();
    const serialized = serializeAnalysisModuleDataForPersistence({ analysisDocument: doc });
    const record = createInitialModuleData();
    const writeResult = getProjectManager().updateProjectModule(project.projectId, "analysis", {
      ...record,
      data: serialized,
    } as never);
    expect(writeResult.ok).toBe(true);

    const result = buildAnalysisCimLayer(getProjectManager(), project.projectId);
    expect(result.ok).toBe(true);
    expect(result.femNodesGroup.children.length).toBe(2);
    expect(result.femMembersGroup.children.length).toBe(1);
    expect(result.supportsGroup.children.length).toBe(1);
    const metaSources = result.metadata.map((m) => m.sourceModule);
    expect(metaSources).toContain("femNodes");
    expect(metaSources).toContain("femMembers");
    expect(metaSources).toContain("supports");
  });

  it("returns empty groups + none status when no analysis document exists", () => {
    const project = makeProject();
    const result = buildAnalysisCimLayer(getProjectManager(), project.projectId);
    expect(result.ok).toBe(true);
    expect(result.resultStatus).toBe("none");
    expect(result.femNodesGroup.children.length).toBe(0);
  });
});
