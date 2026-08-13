import { describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { buildSuperstructureCimLayer } from "../superstructureCimLayer";
import { buildSubstructureDocument } from "../../substructure/substructureDocumentDomain";
import { buildSubstructureCimLayer } from "../substructureCimLayer";
import { writeSubstructureDocument } from "../../substructureModuleAdapter";
import { writeRoadData } from "../../roadModuleAdapter";
import { commitRoadEditorDraft } from "../../road/roadEditorDraft";
import { createDefaultLinerDraft } from "../../../../liner/adapters/linerUiAdapter";
import { verticalElementsToDraft } from "../../road/verticalDraftBridge";
import type { SubstructureDocument } from "../../substructure/substructureTypes";

function makeProject() {
  resetProjectManagerForTest();
  const project = applyBusinessMetadata(createEmptyProject("CIM Super/Sub"), {
    businessNumber: "CIM-SS-1",
    designStage: "bridge-detailed",
  });
  expect(getProjectManager().importProject(project)).toBe(true);
  return getProjectManager().listProjects()[0]!;
}

function seedRoad(projectId: string) {
  const manager = getProjectManager();
  const draft = createDefaultLinerDraft();
  const committed = commitRoadEditorDraft(draft, { source: "new", migratedAt: new Date().toISOString() });
  if (committed.ok && committed.canonical) {
    writeRoadData(manager, projectId, committed.canonical);
  }
}

function makeSubstructureDocument(): SubstructureDocument {
  const built = buildSubstructureDocument({
    projectId: "PROJ-1",
    bridgeLayoutReference: { bridgeId: "BR-900", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" },
    superstructureReference: { bridgeId: "BR-900", moduleId: "superstructure", documentVersion: "0.1.0", superstructureDocumentId: "SS-1", handoffSchemaVersion: "1.0.0" },
    roadReference: { moduleId: "road", alignmentId: "alignment-1", stationReferenceId: null, coordinatePolicyId: null },
    supports: [
      {
        supportId: "P1",
        supportType: "pier",
        placement: { source: "liner", alignmentId: "alignment-1", station: 300, offset: 0 },
        skewRad: 0,
        placementSnapshot: { source: "liner", position: { x: 300, y: 0, z: 100 }, tangent: { x: 1, y: 0, z: 0 }, transverse: { x: 0, y: 1, z: 0 }, vertical: { x: 0, y: 0, z: 1 }, azimuthRad: 0, skewRad: 0 },
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
  if (!built.ok) throw new Error("sub build failed");
  return built.document;
}

describe("Superstructure CIM layer (Phase 8-02 WP-E/G)", () => {
  it("returns empty groups when no superstructure document exists", () => {
    const project = makeProject();
    seedRoad(project.projectId);
    const result = buildSuperstructureCimLayer(getProjectManager(), project.projectId);
    expect(result.ok).toBe(true);
    expect(result.superstructureGroup.children.length).toBe(0);
    expect(result.bearingGroup.children.length).toBe(0);
  });
});

describe("Substructure CIM layer (Phase 8-02 WP-F)", () => {
  it("builds substructure + foundation groups with stable IDs", () => {
    const project = makeProject();
    seedRoad(project.projectId);
    const doc = makeSubstructureDocument();
    expect(writeSubstructureDocument(getProjectManager(), project.projectId, doc).ok).toBe(true);
    const result = buildSubstructureCimLayer(getProjectManager(), project.projectId);
    expect(result.ok).toBe(true);
    expect(result.substructureGroup.children.length).toBeGreaterThan(0);
    expect(result.foundationGroup.children.length).toBeGreaterThan(0);
    const metaSources = result.metadata.map((m) => m.sourceModule);
    expect(metaSources).toContain("substructure");
    expect(metaSources).toContain("foundation");
  });

  it("returns empty groups when no substructure document exists", () => {
    const project = makeProject();
    seedRoad(project.projectId);
    const result = buildSubstructureCimLayer(getProjectManager(), project.projectId);
    expect(result.ok).toBe(true);
    expect(result.substructureGroup.children.length).toBe(0);
    expect(result.foundationGroup.children.length).toBe(0);
  });
});
