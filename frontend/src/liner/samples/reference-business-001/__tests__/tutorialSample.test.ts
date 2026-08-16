import { describe, expect, it } from "vitest";
import { buildTutorialSampleProject, buildTutorialHeightfield, TUTORIAL_SAMPLE_PROJECT_NAME, TUTORIAL_ROAD_ID, TUTORIAL_BRIDGE_ID, TUTORIAL_TERRAIN_ID, validateTutorialProject } from "../tutorialSample";
import { extractTerrainDocument, verifyTerrainAssetChecksum } from "../../../../terrain/terrainPersistence";
import { readRoadWorkflowState, readBridgeWorkflowState } from "../../../../workflow/workflowState";
import { parseProject } from "../../../../next/project/projectDataCore";

describe("S-10 Tutorial Sample (軽量・学習用)", () => {
  it("builds a light synthetic terrain (16×16, fast to display)", () => {
    const hf = buildTutorialHeightfield();
    expect(hf.width).toBe(16);
    expect(hf.height).toBe(16);
    expect(hf.cellSize).toBe(20);
    // 緩やかな標高帯 (30-60m)
    const min = Math.min(...Array.from(hf.data));
    const max = Math.max(...Array.from(hf.data));
    expect(min).toBeGreaterThanOrEqual(30);
    expect(max).toBeLessThanOrEqual(60);
  });

  it("builds a complete tutorial project (terrain + road + bridge)", async () => {
    const project = await buildTutorialSampleProject();
    expect(project.name).toBe(TUTORIAL_SAMPLE_PROJECT_NAME);
    expect(parseProject(project).ok).toBe(true);
    expect(validateTutorialProject(project)).toBe(true);

    const terrain = extractTerrainDocument(project);
    expect(terrain?.terrainId).toBe(TUTORIAL_TERRAIN_ID);

    const road = readRoadWorkflowState(project);
    expect(road?.roadId).toBe(TUTORIAL_ROAD_ID);

    const bridge = readBridgeWorkflowState(project);
    expect(bridge?.bridgeId).toBe(TUTORIAL_BRIDGE_ID);
    expect(bridge?.spans).toHaveLength(1);
  });

  it("is separate from Reference Business 001 (no RB001 references)", async () => {
    const project = await buildTutorialSampleProject();
    const json = JSON.stringify(project);
    expect(json).not.toContain("RB001");
    expect(json).not.toContain("gujo");
    expect(json).not.toContain("Gujo");
  });

  it("terrain asset is persisted with a verifiable checksum (SCT1)", async () => {
    const project = await buildTutorialSampleProject();
    const verify = await verifyTerrainAssetChecksum(project);
    expect(verify.ok).toBe(true);
  });
});