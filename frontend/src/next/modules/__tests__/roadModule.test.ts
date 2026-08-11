import { afterEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../project/projectDataCore";
import { applyBusinessMetadata } from "../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../project/projectManagerInstance";
import { getModuleDefinition } from "../registry";
import { createRoadModuleRecord, isRoadData, validateRoadData, ROAD_MODULE_ID } from "../roadModule";
import { readRoadDesignDocument, writeRoadDesignDocument, hasRoadDesignDocument, readRoadInputs, writeRoadInputs } from "../roadModuleAdapter";

function makeProject() {
  return applyBusinessMetadata(createEmptyProject("道路接続業務"), {
    businessNumber: "ROAD-001",
    designStage: "road-preliminary",
  });
}

afterEach(() => {
  resetProjectManagerForTest();
});

describe("Road Module registration (Phase 2-01)", () => {
  it("road module is registered with real module version 1.0.0", () => {
    const road = getModuleDefinition("road");
    expect(road?.moduleId).toBe("road");
    expect(road?.moduleType).toBe("road");
    expect(road?.displayName).toBe("道路");
    expect(road?.moduleVersion).toBe("1.0.0");
  });

  it("creates an initial road module record with empty data", () => {
    const record = createRoadModuleRecord();
    expect(record.state.status).toBe("notStarted");
    expect(record.data).toEqual({});
    expect(isRoadData(record.data)).toBe(true);
  });

  it("validates road data: empty data valid; malformed doc rejected (full schema validation)", () => {
    expect(validateRoadData({})).toEqual([]);
    // a doc must be an object
    const notObject = validateRoadData({ roadDesignDocument: "not-an-object" });
    expect(notObject.length).toBeGreaterThan(0);
    // a partial doc fails the full RoadDesignDocument schema validation
    const partialDoc = validateRoadData({ roadDesignDocument: { label: "国道〇〇号" } });
    expect(partialDoc.length).toBeGreaterThan(0);
    // the strict validator flags missing required fields
    const issuesText = partialDoc.map((i) => `${i.path}: ${i.message}`).join("; ");
    expect(issuesText).toContain("schemaId");
  });
});

describe("Road Module adapter (Phase 2-01)", () => {
  it("rejects a partial RoadDesignDocument via full schema validation", async () => {
    const manager = getProjectManager();
    const project = makeProject();
    expect(manager.importProject(project)).toBe(true);

    expect(hasRoadDesignDocument(manager, project.projectId)).toBe(false);
    expect(readRoadDesignDocument(manager, project.projectId)).toBeUndefined();

    // A partial document fails full RoadDesignDocument schema validation.
    const partial = { label: "国道〇〇号 道路設計" } as never;
    const result = writeRoadDesignDocument(manager, project.projectId, partial);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid-road-data");
    expect(hasRoadDesignDocument(manager, project.projectId)).toBe(false);
  });

  it("rejects invalid road data (broken document)", () => {
    const manager = getProjectManager();
    const project = makeProject();
    manager.importProject(project);
    const result = writeRoadDesignDocument(manager, project.projectId, { label: 42 } as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid-road-data");
  });

  it("returns project-not-found for a missing project", () => {
    const manager = getProjectManager();
    const result = writeRoadDesignDocument(manager, "missing", undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("project-not-found");
  });

  it("writes and reads road inputs through the Module Data Core", async () => {
    const manager = getProjectManager();
    const project = makeProject();
    expect(manager.importProject(project)).toBe(true);

    expect(readRoadInputs(manager, project.projectId)).toEqual({});
    const result = writeRoadInputs(manager, project.projectId, { label: "国道〇〇号 道路設計" });
    expect(result.ok).toBe(true);
    await manager.flushPendingSaves();
    expect(readRoadInputs(manager, project.projectId).label).toBe("国道〇〇号 道路設計");
  });
});
