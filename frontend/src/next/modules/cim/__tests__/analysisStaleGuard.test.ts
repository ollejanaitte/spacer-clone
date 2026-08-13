import { describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { buildAnalysisCimLayer } from "../analysisCimLayer";
import { createEmptyAnalysisDocument, finalizeAnalysisDocument } from "../../analysis/analysisDocument";
import { serializeAnalysisModuleDataForPersistence } from "../../analysis/analysisModuleData";
import { deriveAnalysisEntityId } from "../../analysis/analysisId";
import { createInitialModuleData } from "../../contract";
import type { FrameAnalysisResultResource } from "../../../../contracts/frameAnalysisResultResource";

function makeProject() {
  resetProjectManagerForTest();
  const project = applyBusinessMetadata(createEmptyProject("Stale"), { businessNumber: "S-1", designStage: "bridge-detailed" });
  getProjectManager().importProject(project);
  return getProjectManager().listProjects()[0]!;
}

function seedAnalysisDocument(projectId: string) {
  const manager = getProjectManager();
  const base = createEmptyAnalysisDocument({
    projectId,
    createdBy: "stale-test",
    sourceReferences: { bridgeLayout: null, superstructure: null, substructure: null, loadFingerprint: null, solverSettingsFingerprint: null },
  });
  const n1 = deriveAnalysisEntityId("node", "super:N1");
  const n2 = deriveAnalysisEntityId("node", "super:N2");
  const matId = deriveAnalysisEntityId("material", "MAT-1");
  const secId = deriveAnalysisEntityId("section", "SEC-1");
  const nodes = [
    { entityId: n1, sourceEntityId: "super:N1", sourceKind: "mainGirder", x: 0, y: 0, z: 100, stationM: 0, offsetM: 0 },
    { entityId: n2, sourceEntityId: "super:N2", sourceKind: "mainGirder", x: 10, y: 0, z: 100, stationM: 10, offsetM: 0 },
  ];
  const members = [
    { entityId: deriveAnalysisEntityId("member", "super:M1"), sourceEntityId: "super:M1", sourceKind: "mainGirder", elementType: "frame", nodeIId: n1, nodeJId: n2, materialId: matId, sectionId: secId, endReleases: [], endOffset: null, startDirection: null, orientationVector: { x: 0, y: 0, z: 1 }, metadata: {} },
  ];
  const supports = [
    { entityId: deriveAnalysisEntityId("support", "sub:A1"), sourceEntityId: "sub:A1", sourceKind: "support", nodeId: n1, seatId: null, constraint: { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true }, constraintApproximation: null, springIds: [], localFrame: null, source: "substructure" },
  ];
  const materials = [{ entityId: matId, sourceEntityId: "MAT-1", sourceKind: "girder", name: "SS400", elasticModulus: 2e8, shearModulus: 7.7e7, unitWeight: 77 }];
  const sections = [{ entityId: secId, sourceEntityId: "SEC-1", sourceKind: "mainGirder", name: "I-800", area: 0.1, iy: 0.01, iz: 0.02, j: 0.005 }];
  const doc = finalizeAnalysisDocument({
    ...base,
    nodes: nodes as never,
    members: members as never,
    supports: supports as never,
    materials: materials as never,
    sections: sections as never,
    springs: [], foundationSprings: [], bearings: [], nodalLoads: [], memberLoads: [], loadCases: [], loadCombinations: [],
  } as never);
  const serialized = serializeAnalysisModuleDataForPersistence({ analysisDocument: doc });
  const record = createInitialModuleData();
  manager.updateProjectModule(projectId, "analysis", { ...record, data: serialized } as never);
}

function staleIf3Result(): FrameAnalysisResultResource {
  return {
    kind: "frame-analysis-result",
    schemaVersion: "1.0.0",
    caseId: "COMBO-1",
    status: "stale",
    payload: {
      nodeDisplacement: [],
      supportReaction: [],
      memberForce: [],
    },
  } as unknown as FrameAnalysisResultResource;
}

describe("CIM analysis stale guard (Phase 8.1)", () => {
  it("reports stale and does NOT render result layers for a stale IF3 result", () => {
    const project = makeProject();
    seedAnalysisDocument(project.projectId);
    const result = buildAnalysisCimLayer(getProjectManager(), project.projectId, {
      if3Result: staleIf3Result(),
    });
    expect(result.resultStatus).toBe("stale");
    // stale results are never rendered as authoritative
    expect(result.resultGroup.children.length).toBe(0);
    expect(result.deformedGroup.children.length).toBe(0);
    expect(result.reactionGroup.children.length).toBe(0);
  });

  it("reports none when no analysis document and no result exist", () => {
    const project = makeProject();
    const result = buildAnalysisCimLayer(getProjectManager(), project.projectId);
    expect(result.resultStatus).toBe("none");
  });
});
