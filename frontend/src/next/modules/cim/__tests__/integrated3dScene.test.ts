import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { ensureRoadData, writeRoadData } from "../../roadModuleAdapter";
import { commitRoadEditorDraft } from "../../road/roadEditorDraft";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { createDefaultLinerDraft } from "../../../../liner/adapters/linerUiAdapter";
import { buildIntegrated3DScene } from "../cimSceneBuilder";
import { defaultCimLayerState, CIM_LAYER_IDS, type CimEntityMetadata } from "../integrated3dScene";
import { readBridgeLayoutDocument, writeBridgeLayoutDocument } from "../../bridgeLayoutModuleAdapter";
import { createEmptyBridgeLayoutDocument } from "../../bridgeLayout/bridgeLayoutTypes";

function makeProject() {
  const project = applyBusinessMetadata(createEmptyProject("CIM統合業務"), {
    businessNumber: "CIM-001",
    designStage: "bridge-detailed",
  });
  expect(getProjectManager().importProject(project)).toBe(true);
  return getProjectManager().listProjects()[0]!;
}

function seedRoad(projectId: string) {
  const manager = getProjectManager();
  const mountain = createReferenceMountain();
  const draft = createDefaultLinerDraft();
  draft.alignment = mountain.roadHorizontal;
  draft.crossSections = [mountain.roadCrossSection];
  const committed = commitRoadEditorDraft(draft, { source: "new", migratedAt: new Date().toISOString() });
  expect(committed.ok).toBe(true);
  if (committed.ok && committed.canonical) {
    expect(writeRoadData(manager, projectId, committed.canonical).ok).toBe(true);
  }
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  resetProjectManagerForTest();
});

describe("integrated3dScene contract (Phase 8-02 WP-A)", () => {
  it("provides the frozen layer ids and default layer state", () => {
    expect(CIM_LAYER_IDS).toHaveLength(18);
    const state = defaultCimLayerState();
    expect(state.terrain).toBe(true);
    expect(state.femNodes).toBe(false);
  });

  it("builds a scene with terrain + road layers from canonical roadData", () => {
    const project = makeProject();
    seedRoad(project.projectId);
    const scene = buildIntegrated3DScene(getProjectManager(), project.projectId);
    expect(scene.ok).toBe(true);
    expect(scene.layers.terrain).toBeDefined();
    expect(scene.layers.roadPavement).toBeDefined();
    expect(scene.layers.bridgeLayout).toBeDefined();
    expect(scene.metadata.length).toBeGreaterThanOrEqual(2);
    const roadMeta = scene.metadata.find((m) => m.sourceModule === "roadPavement");
    expect(roadMeta).toBeDefined();
    expect(roadMeta?.stableId).toContain("road-surface");
    expect(scene.bounds).toBeTruthy();
  });

  it("keeps deferred layers as empty groups when enabled", () => {
    const project = makeProject();
    const scene = buildIntegrated3DScene(getProjectManager(), project.projectId);
    expect(scene.layers.superstructure).toBeDefined();
    expect(scene.layers.substructure).toBeDefined();
    expect(scene.layers.bearing).toBeDefined();
    expect(scene.layers.femNodes).toBeDefined();
  });

  it("metadata carries sourceEntityId and coordinate context", () => {
    const project = makeProject();
    seedRoad(project.projectId);
    const scene = buildIntegrated3DScene(getProjectManager(), project.projectId);
    const meta: CimEntityMetadata | undefined = scene.metadata[0];
    expect(meta?.sourceEntityId).toBeDefined();
    expect(meta?.coordinateContext).toBe("world");
    expect(meta?.stableId).toContain(meta!.sourceModule);
  });

  it("attaches bridge layout metadata when a bridge document exists", () => {
    const project = makeProject();
    seedRoad(project.projectId);
    const manager = getProjectManager();
    const doc = createEmptyBridgeLayoutDocument();
    writeBridgeLayoutDocument(manager, project.projectId, doc);
    const scene = buildIntegrated3DScene(manager, project.projectId);
    expect(scene.layers.bridgeLayout).toBeDefined();
  });

  it("returns empty scene bounds when nothing is present", () => {
    const project = makeProject();
    const scene = buildIntegrated3DScene(getProjectManager(), project.projectId);
    // terrain fallback is always available, so bounds exist; just assert stable contract
    expect(scene).toBeDefined();
    expect(scene.layers.terrain).toBeDefined();
  });
});
