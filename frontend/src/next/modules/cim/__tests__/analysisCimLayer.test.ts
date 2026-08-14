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

  it("renders an authoritative IF3 result (SUCCEEDED fixture) as overlay", () => {
    const project = makeProject();
    const doc = makeAnalysisDocument();
    const serialized = serializeAnalysisModuleDataForPersistence({ analysisDocument: doc });
    const record = createInitialModuleData();
    getProjectManager().updateProjectModule(project.projectId, "analysis", {
      ...record,
      data: serialized,
    } as never);

    const node1Id = deriveAnalysisEntityId("node", "super:N1");
    const node2Id = deriveAnalysisEntityId("node", "super:N2");
    const memberId = deriveAnalysisEntityId("member", "super:M1");
    const if3 = {
      schemaId: "frame-analysis-result/1",
      schemaVersion: "1.0.0",
      resultId: "RES-1",
      analysisRunId: "RUN-1",
      sourceDocumentId: "DOC-1",
      sourceDocumentVersion: "REV-1",
      status: "SUCCEEDED",
      generatedAt: new Date().toISOString(),
      solverName: "scipy_sparse",
      solverVersion: "0.3.0",
      resultKinds: ["nodeDisplacement", "supportReaction", "memberForce"],
      payload: {
        nodeDisplacement: [
          { loadCaseId: "LC1", entityId: node1Id, values: { ux: 0, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 } },
          { loadCaseId: "LC1", entityId: node2Id, values: { ux: 0, uy: 0, uz: -0.5, rx: 0, ry: 0, rz: 0 } },
        ],
        supportReaction: [
          { loadCaseId: "LC1", nodeId: node1Id, supportId: "A1", values: { fx: 0, fy: 0, fz: 125, mx: 0, my: 0, mz: 0 } },
        ],
        memberForce: [
          { loadCaseId: "LC1", entityId: memberId, values: { i: { fx: -125, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 }, j: { fx: 125, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 } } },
        ],
      },
      resultChecksum: "abc123",
    } as never;

    const result = buildAnalysisCimLayer(getProjectManager(), project.projectId, {
      if3Result: if3,
      resultComponent: "N",
    });
    expect(result.ok).toBe(true);
    expect(result.resultStatus).toBe("authoritative");
    expect(result.reactionGroup.children.length).toBe(1);
    expect(result.deformedGroup.children.length).toBe(1);
    expect(result.resultGroup.children.length).toBe(1);
    expect(result.metadata.some((m) => m.sourceModule === "reaction")).toBe(true);
    expect(result.metadata.some((m) => m.sourceModule === "deformed")).toBe(true);
    expect(result.metadata.some((m) => m.sourceModule === "result")).toBe(true);
  });

  it("does NOT render result overlay when the IF3 status is FAILED (fail-closed)", () => {
    const project = makeProject();
    const doc = makeAnalysisDocument();
    const serialized = serializeAnalysisModuleDataForPersistence({ analysisDocument: doc });
    const record = createInitialModuleData();
    getProjectManager().updateProjectModule(project.projectId, "analysis", {
      ...record,
      data: serialized,
    } as never);
    const failed = { status: "FAILED", payload: {} } as never;
    const result = buildAnalysisCimLayer(getProjectManager(), project.projectId, { if3Result: failed });
    expect(result.resultStatus).toBe("invalid");
    expect(result.reactionGroup.children.length).toBe(0);
    expect(result.deformedGroup.children.length).toBe(0);
    expect(result.resultGroup.children.length).toBe(0);
  });

  it("treats an undefined/unknown IF3 status as INVALID (fail-closed, Sol #9)", () => {
    const project = makeProject();
    const doc = makeAnalysisDocument();
    const serialized = serializeAnalysisModuleDataForPersistence({ analysisDocument: doc });
    const record = createInitialModuleData();
    getProjectManager().updateProjectModule(project.projectId, "analysis", {
      ...record,
      data: serialized,
    } as never);
    // no status field / unknown status must NOT be promoted to authoritative
    const noStatus = { payload: {} } as never;
    const unknownStatus = { status: "PARTIAL", payload: {} } as never;
    const r1 = buildAnalysisCimLayer(getProjectManager(), project.projectId, { if3Result: noStatus });
    expect(r1.resultStatus).toBe("invalid");
    expect(r1.reactionGroup.children.length).toBe(0);
    const r2 = buildAnalysisCimLayer(getProjectManager(), project.projectId, { if3Result: unknownStatus });
    expect(r2.resultStatus).toBe("invalid");
    expect(r2.deformedGroup.children.length).toBe(0);
    expect(r2.resultGroup.children.length).toBe(0);
  });
});
