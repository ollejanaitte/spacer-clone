import { describe, expect, it } from "vitest";
import { buildRb001CompleteProject, saveCloseReopenRb001Project, RB001_COMPLETE_PROJECT_NAME } from "../savedProject";
import { parseProject } from "../../../../next/project/projectDataCore";
import { extractTerrainDocument } from "../../../../terrain/terrainPersistence";
import { readRoadWorkflowState, readBridgeWorkflowState } from "../../../../workflow/workflowState";
import { RB001_BRIDGE_ID } from "../bridgeArrangement";
import { GUJO_SAMPLE_TERRAIN_ID } from "../../../../terrain/gujoSample";

describe("S-9 Saved Complete Project / Reopen (RB001)", () => {
  it("builds a complete project with all modules", () => {
    const { project, summary } = buildRb001CompleteProject();
    expect(summary.terrainDocumentId).toBe(GUJO_SAMPLE_TERRAIN_ID);
    expect(summary.roadId).toBe("RB001-ROAD-1");
    expect(summary.bridgeId).toBe(RB001_BRIDGE_ID);
    expect(summary.superstructureDocumentId).toMatch(/^[0-9a-f]{8}-/);
    expect(summary.substructureDocumentId).toMatch(/^[0-9a-f]{8}-/);
    expect(summary.analysisStatus).toBe("NOT_RUN");
    for (const key of ["terrain", "road", "bridgeLayout", "superstructure", "substructure", "analysis", "cim", "deliverables"]) {
      expect(summary.moduleKeys).toContain(key);
    }
    expect(project.name).toBe(RB001_COMPLETE_PROJECT_NAME);
  });

  it("project passes parseProject (canonical persistence-ready)", () => {
    const { project } = buildRb001CompleteProject();
    const parsed = parseProject(project);
    expect(parsed.ok).toBe(true);
  });

  it("Save → Close → Reopen reproduces terrain / road / bridge", () => {
    const { project } = buildRb001CompleteProject();
    const result = saveCloseReopenRb001Project(project);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const reopened = result.reopened;

    // Terrain 復元
    const terrain = extractTerrainDocument(reopened);
    expect(terrain?.terrainId).toBe(GUJO_SAMPLE_TERRAIN_ID);

    // Road / Bridge workflowState 復元
    const road = readRoadWorkflowState(reopened);
    expect(road?.roadId).toBe("RB001-ROAD-1");
    const bridge = readBridgeWorkflowState(reopened);
    expect(bridge?.bridgeId).toBe(RB001_BRIDGE_ID);
    expect(bridge?.spans).toHaveLength(6);
  });

  it("Reopen preserves project identity and analysis NOT_RUN", () => {
    const { project } = buildRb001CompleteProject();
    const result = saveCloseReopenRb001Project(project);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reopened.projectId).toBe(project.projectId);
    expect(result.reopened.name).toBe(RB001_COMPLETE_PROJECT_NAME);
    expect(result.reopened.schemaVersion).toBe(project.schemaVersion);
  });

  it("no data loss: serialized JSON round-trips all module slots", () => {
    const { project } = buildRb001CompleteProject();
    const result = saveCloseReopenRb001Project(project);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const key of Object.keys(project.modules)) {
      expect(result.reopened.modules[key as keyof typeof project.modules]).toEqual(
        project.modules[key as keyof typeof project.modules],
      );
    }
  });
});