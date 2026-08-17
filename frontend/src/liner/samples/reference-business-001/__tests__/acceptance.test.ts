import { describe, expect, it } from "vitest";
import { buildRb001CompleteProject, saveCloseReopenRb001Project, RB001_COMPLETE_PROJECT_NAME } from "../savedProject";
import { buildRb001Analysis } from "../analysis";
import { buildRb001BridgeLayout, RB001_BRIDGE_ID } from "../bridgeArrangement";
import { buildRb001Superstructure } from "../superstructure";
import { buildRb001Substructure } from "../substructure";
import { extractTerrainDocument, verifyReopenedTerrain, loadTerrainElevation } from "../../../../terrain/terrainPersistence";
import { buildGujoSampleAsset, GUJO_COORDINATE_CONTEXT_ID, GUJO_EPSG, GUJO_SAMPLE_TERRAIN_ID } from "../../../../terrain/gujoSample";
import { createMemoryTerrainElevationStore } from "../../../../terrain/terrainAssetStore";
import { readRoadWorkflowState, readBridgeWorkflowState } from "../../../../workflow/workflowState";
import { buildRealGujoReferenceScene } from "../../../../viewer/adapters/realScene";
import { readModuleFromProject } from "../../../../next/modules/adapter";
import { finalizeCanonicalRoadData } from "../../../../next/modules/road/roadDataSchema";
import { loadRoadEditorDraft } from "../../../../next/modules/road/roadEditorDraft";

/**
 * S-12 Sample Acceptance — Reference Business 001 最終業務 Acceptance。
 *
 * 新規Project → Site Context → Gujo Terrain → Road → Bridge Layout →
 * Superstructure → Bearings → Substructure → Analysis → Integrated 3D →
 * Save → Close → Reopen → 同じProject状態 を確認する。
 * UI初期状態に依存せず、明示 fixture/sample から開始する。
 */
describe("S-12 Reference Business 001 Wave 3 Acceptance", () => {
  it("[Site Context] Gujo terrain asset is present in the complete project", () => {
    const { project } = buildRb001CompleteProject();
    const doc = extractTerrainDocument(project);
    expect(doc?.terrainId).toBe(GUJO_SAMPLE_TERRAIN_ID);
    expect(doc?.coordinateContext.unitSystem).toBe("metric");
    expect(doc?.bounds?.minElevation).toBe(200);
    expect(doc?.bounds?.maxElevation).toBe(1200);
  });

  it("[EPSG:6674] coordinate context is the JGD2011 Plane Rectangular VII", () => {
    const { project } = buildRb001CompleteProject();
    expect(project.metadata.siteContextProjectCoordinateContextId).toBe(GUJO_COORDINATE_CONTEXT_ID);
    expect(GUJO_EPSG).toBe(6674);
  });

  it("[Road] alignment is placed on the complete project", () => {
    const { project } = buildRb001CompleteProject();
    const road = readRoadWorkflowState(project);
    expect(road?.roadId).toBe("RB001-ROAD-1");
    expect(road?.totalLengthM).toBeGreaterThan(2400);
    expect(road?.bridgeCandidate).toMatchObject({ startStation: 1200, endStation: 1500, nominalSpanM: 50 });
  });

  it("[Bridge] 6 spans x 50m with A1+P1..P5+A2", () => {
    const { project } = buildRb001CompleteProject();
    const bridge = readBridgeWorkflowState(project);
    expect(bridge?.bridgeId).toBe(RB001_BRIDGE_ID);
    expect(bridge?.spans).toHaveLength(6);
    expect(bridge?.bridgeRange).toEqual({ startStation: 1200, endStation: 1500, bridgeLength: 300 });
    const layout = buildRb001BridgeLayout();
    expect(layout.spans).toHaveLength(6);
    for (const span of layout.spans) expect(span.length).toBeCloseTo(50, 6);
  });

  it("[Superstructure] RB001-SUPER-1 is built and valid", () => {
    const doc = buildRb001Superstructure();
    expect(doc.bridgeLayoutReference?.bridgeId).toBe(RB001_BRIDGE_ID);
    expect(doc.structuralSystem.bridgeSystem).toBe("CONTINUOUS");
    expect(doc.girderConfiguration.girderCount).toBe(2);
  });

  it("[Bearings] bearing configuration exists for each support", () => {
    const doc = buildRb001Superstructure();
    expect(doc.bearingConfiguration).toBeDefined();
    expect(doc.bearingConfiguration.bearingSupportRelation.length).toBeGreaterThanOrEqual(7);
    const supportIds = new Set(doc.bearingConfiguration.bearingSupportRelation.map((b) => b.supportId));
    for (const id of ["A1", "P1", "P2", "P3", "P4", "P5", "A2"]) {
      expect(supportIds.has(id)).toBe(true);
    }
  });

  it("[Substructure] RB001-SUB-1 covers A1/A2 + P1..P5", () => {
    const doc = buildRb001Substructure();
    const ids = doc.supports.map((s) => s.supportId);
    expect(ids).toEqual(["A1", "P1", "P2", "P3", "P4", "P5", "A2"]);
    expect(doc.terrainReferences?.surfaceReference).toBe("assets/terrain/gujo-hachiman-sample.sct1");
  });

  it("[Analysis] analysis input is connected (NOT_RUN, no fabricated results)", () => {
    const { document, ok } = buildRb001Analysis();
    expect(document.analysisStatus).toBe("NOT_RUN");
    expect(document.nodes.length).toBeGreaterThan(0);
    expect(document.members.length).toBeGreaterThan(0);
    // girder section 未宣言は fail-closed (架空の解析結果を作らない)
    expect(ok).toBe(false);
    expect(document.validation.issues.some((i) => i.path === "sections[SECTION-GIRDER]")).toBe(true);
  });

  it("[G-6] canonical road module → analysis input adapter (roadData → editor draft)", () => {
    // RB001 完成 Project の modules.road.data.roadData (canonical) が
    // 分析ページが要求する roadEditorDraft 形式へ変換できることを確認する。
    // これは RB001 固有の trusted road fixture (S-3) に基づく正式 adapter であり、
    // 架空の道路値は使わない。
    const { project } = buildRb001CompleteProject();
    const raw = readModuleFromProject(project, "road")?.data?.roadData;
    const roadData = finalizeCanonicalRoadData(raw);
    expect(roadData).toBeDefined();
    if (!roadData) return;
    expect(roadData.schemaVersion).toBe("0.3.0");
    const loaded = loadRoadEditorDraft(roadData);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.draft.alignment.id).toBe("RB001-ROAD-1");
    expect(loaded.draft.alignment.elements.length).toBeGreaterThan(0);
    expect(loaded.draft.verticalAlignment.elements.length).toBeGreaterThan(0);
    expect(loaded.draft.crossSections.length).toBeGreaterThan(0);
  });

  it("[Integrated 3D] unified viewer scene assembles all layers in EPSG:6674", () => {
    const model = buildRealGujoReferenceScene();
    expect(model.layers.map((l) => l.kind)).toEqual(
      expect.arrayContaining(["terrain", "road", "superstructure", "bearing", "substructure"]),
    );
    expect(model.worldBasis.horizontalCrs?.identifier).toBe("6674");
  });

  it("[Save → Close → Reopen] terrain is restored from IndexedDB store as the source of truth", async () => {
    const { project } = buildRb001CompleteProject();
    const asset = buildGujoSampleAsset();
    const store = createMemoryTerrainElevationStore();
    const { saveTerrainElevation } = await import("../../../../terrain/terrainPersistence");

    // Save: IndexedDB store へ標高保存
    await saveTerrainElevation(store, project.projectId, GUJO_SAMPLE_TERRAIN_ID, asset);

    // Close → Reopen (application restart 相当)
    const reopened = saveCloseReopenRb001Project(project);
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;

    // IndexedDB から復元 + checksum 照合 (fail-closed)
    const restored = await loadTerrainElevation(store, reopened.reopened.projectId, asset.path);
    expect(restored).not.toBeNull();
    if (!restored) return;
    const verified = await verifyReopenedTerrain(reopened.reopened, restored);
    expect(verified.ok).toBe(true);
    expect(restored.checksum).toBe(asset.checksum);
  });

  it("[Project context] Reopen preserves road / bridge / analysis state (no data loss)", () => {
    const { project } = buildRb001CompleteProject();
    const reopened = saveCloseReopenRb001Project(project);
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;

    expect(reopened.reopened.projectId).toBe(project.projectId);
    expect(reopened.reopened.name).toBe(RB001_COMPLETE_PROJECT_NAME);
    expect(readRoadWorkflowState(reopened.reopened)?.roadId).toBe("RB001-ROAD-1");
    expect(readBridgeWorkflowState(reopened.reopened)?.spans).toHaveLength(6);
    expect(extractTerrainDocument(reopened.reopened)?.terrainId).toBe(GUJO_SAMPLE_TERRAIN_ID);
  });
});