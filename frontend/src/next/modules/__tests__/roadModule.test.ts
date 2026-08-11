import { afterEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../project/projectDataCore";
import { applyBusinessMetadata } from "../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../project/projectManagerInstance";
import { getModuleDefinition } from "../registry";
import { createRoadModuleRecord, isRoadData, validateRoadData, ROAD_MODULE_ID } from "../roadModule";
import { readRoadDesignDocument, writeRoadDesignDocument, hasRoadDesignDocument } from "../roadModuleAdapter";

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

  it("validates road data: empty data valid; malformed doc rejected", () => {
    expect(validateRoadData({})).toEqual([]);
    // a doc must be an object
    const notObject = validateRoadData({ roadDesignDocument: "not-an-object" });
    expect(notObject.length).toBeGreaterThan(0);
    // a doc with non-string label is invalid
    const badLabel = validateRoadData({ roadDesignDocument: { label: 42 } });
    expect(badLabel.length).toBeGreaterThan(0);
    // a doc with string label is valid
    expect(validateRoadData({ roadDesignDocument: { label: "国道〇〇号" } })).toEqual([]);
  });
});

describe("Road Module adapter (Phase 2-01)", () => {
  it("reads/writes RoadDesignDocument through the Module Data Core", async () => {
    const manager = getProjectManager();
    const project = makeProject();
    expect(manager.importProject(project)).toBe(true);

    expect(hasRoadDesignDocument(manager, project.projectId)).toBe(false);
    expect(readRoadDesignDocument(manager, project.projectId)).toBeUndefined();

    const doc = {
      label: "国道〇〇号 道路設計",
    } as never;
    const result = writeRoadDesignDocument(manager, project.projectId, doc);
    expect(result.ok).toBe(true);
    await manager.flushPendingSaves();

    expect(hasRoadDesignDocument(manager, project.projectId)).toBe(true);
    expect(readRoadDesignDocument(manager, project.projectId)).toBeDefined();
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
});
