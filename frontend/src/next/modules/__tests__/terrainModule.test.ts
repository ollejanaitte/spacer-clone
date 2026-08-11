import { afterEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../project/projectDataCore";
import { applyBusinessMetadata } from "../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../project/projectManagerInstance";
import { getModuleDefinition } from "../registry";
import {
  createEmptyTerrainDocument,
  createTerrainModuleRecord,
  isTerrainData,
  validateTerrainData,
  TERRAIN_MODULE_ID,
} from "../terrainModule";
import { readTerrainDocument, writeTerrainDocument, hasTerrainDocument } from "../terrainModuleAdapter";

function makeProject() {
  return applyBusinessMetadata(createEmptyProject("地形接続業務"), {
    businessNumber: "TRN-001",
    designStage: "road-preliminary",
  });
}

afterEach(() => {
  resetProjectManagerForTest();
});

describe("Terrain Module registration (Phase 3-01)", () => {
  it("terrain module is registered", () => {
    const terrain = getModuleDefinition("terrain");
    expect(terrain?.moduleId).toBe("terrain");
    expect(terrain?.displayName).toBe("地形・現況");
  });

  it("creates an initial terrain module record with empty data", () => {
    const record = createTerrainModuleRecord();
    expect(record.state.status).toBe("notStarted");
    expect(record.data).toEqual({});
    expect(isTerrainData(record.data)).toBe(true);
  });

  it("validates terrain data: empty valid; malformed doc rejected", () => {
    expect(validateTerrainData({})).toEqual([]);
    const bad = validateTerrainData({ terrainDocument: "not-an-object" });
    expect(bad.length).toBeGreaterThan(0);
    // a doc without terrainId is invalid
    const noId = validateTerrainData({ terrainDocument: { schemaVersion: "0.1.0" } });
    expect(noId.some((i) => i.path.includes("terrainId"))).toBe(true);
  });
});

describe("Terrain Module adapter (Phase 3-01)", () => {
  it("rejects partial terrain doc via validation", async () => {
    const manager = getProjectManager();
    const project = makeProject();
    expect(manager.importProject(project)).toBe(true);
    expect(hasTerrainDocument(manager, project.projectId)).toBe(false);
    const result = writeTerrainDocument(manager, project.projectId, { terrainId: 42 } as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid-terrain-data");
  });

  it("writes and reads a valid empty terrain document", async () => {
    const manager = getProjectManager();
    const project = makeProject();
    manager.importProject(project);
    const doc = createEmptyTerrainDocument();
    const result = writeTerrainDocument(manager, project.projectId, doc);
    expect(result.ok).toBe(true);
    await manager.flushPendingSaves();
    expect(hasTerrainDocument(manager, project.projectId)).toBe(true);
    const read = readTerrainDocument(manager, project.projectId);
    expect(read?.schemaVersion).toBe("0.1.0");
  });

  it("returns project-not-found for missing project", () => {
    const manager = getProjectManager();
    const result = writeTerrainDocument(manager, "missing", undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("project-not-found");
  });
});
