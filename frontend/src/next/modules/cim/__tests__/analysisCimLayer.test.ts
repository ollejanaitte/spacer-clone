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
import { REAL_IF3_RESULT_RAW } from "../../analysis/__tests__/realIf3Fixture";

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

  it("renders an authoritative IF3 result (SUCCEEDED canonical fixture) as overlay", () => {
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
    const loadContextId = "79a0e842-7de4-5bfd-999f-1fe8038084e3";
    const if3 = {
      ...REAL_IF3_RESULT_RAW,
      status: "SUCCEEDED",
      payload: {
        nodeDisplacement: {
          schemaVersion: "0.1.0",
          rows: [
            { rowId: "11111111-1111-4111-8111-111111111111", entityKind: "node", entityId: node1Id, quantity: "displacement", unit: "m/rad", values: { ux: 0, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 }, loadContextId },
            { rowId: "22222222-2222-4222-8222-222222222222", entityKind: "node", entityId: node2Id, quantity: "displacement", unit: "m/rad", values: { ux: 0, uy: 0, uz: -0.5, rx: 0, ry: 0, rz: 0 }, loadContextId },
          ],
        },
        supportReaction: {
          schemaVersion: "0.1.0",
          rows: [
            { rowId: "33333333-3333-4333-8333-333333333333", entityKind: "support", entityId: node1Id, quantity: "reaction", unit: "kN/kN_m", values: { fx: 0, fy: 0, fz: 125, mx: 0, my: 0, mz: 0 }, loadContextId },
          ],
        },
        memberForce: {
          schemaVersion: "0.1.0",
          rows: [
            { rowId: "44444444-4444-4444-8444-444444444444", entityKind: "member", entityId: memberId, quantity: "memberEndForce", unit: "kN/kN_m", values: { "i.fx": -125, "i.fy": 0, "i.fz": 0, "i.mx": 0, "i.my": 0, "i.mz": 0, "j.fx": 125, "j.fy": 0, "j.fz": 0, "j.mx": 0, "j.my": 0, "j.mz": 0 }, loadContextId },
          ],
        },
      },
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
