// F-2: workflow project persistence — Save/Close/Reopen 経路のテスト。
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../next/project/projectDataCore";
import { writeRoadWorkflowState } from "../workflowState";
import { buildRb001RoadWorkflowState } from "../roadBridgeSamples";
import {
  workflowProjectIdFor,
  persistWorkflowProject,
  restoreWorkflowProject,
  deleteWorkflowProject,
  hasWorkflowProject,
} from "../workflowProjectPersistence";
import { getProjectManager, resetProjectManagerForTest, setPersistenceForTest } from "../../next/project/projectManagerInstance";
import { FilesystemProjectPersistence } from "../../next/persistence/filesystemProjectPersistence";
import { NodeFileSystemGateway } from "../../next/persistence/nodeFileSystemGateway";

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "f2-workflow-"));
  resetProjectManagerForTest();
});

afterEach(async () => {
  resetProjectManagerForTest();
  await fs.rm(tempDir, { recursive: true, force: true });
});

function createPersistence() {
  return new FilesystemProjectPersistence(new NodeFileSystemGateway(), {
    rootDir: path.join(tempDir, "projects"),
  });
}

describe("workflowProjectIdFor", () => {
  it("produces a deterministic valid UUID per legacy business id", () => {
    const a = workflowProjectIdFor("business-001");
    const b = workflowProjectIdFor("business-001");
    const c = workflowProjectIdFor("business-002");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe("workflow project Save / Close / Reopen", () => {
  it("persist → restore reproduces the workflow project (road state preserved)", async () => {
    const legacyId = "business-001";
    const id = workflowProjectIdFor(legacyId);
    let project = { ...createEmptyProject("workflow"), projectId: id };
    project = writeRoadWorkflowState(project, buildRb001RoadWorkflowState("2026-08-16T00:00:00.000Z"));

    setPersistenceForTest(createPersistence());
    expect(await persistWorkflowProject(project)).toBe(true);
    expect(hasWorkflowProject(id)).toBe(true);

    // Close → Reopen (App 完全終了相当: 新 manager が同じ filesystem を読む)
    resetProjectManagerForTest();
    setPersistenceForTest(createPersistence());
    const restored = await restoreWorkflowProject(id);
    expect(restored).toBeDefined();
    if (!restored) return;
    expect(restored.projectId).toBe(id);
    expect(restored.name).toBe("workflow");
    const road = restored.modules.road as { workflowState?: { roadId?: string } };
    expect(road?.workflowState?.roadId).toBe("RB001-ROAD-1");
  });

  it("restore of non-existent project returns undefined", async () => {
    setPersistenceForTest(createPersistence());
    expect(await restoreWorkflowProject("nope-001")).toBeUndefined();
  });

  it("delete removes the persisted workflow project", async () => {
    const id = workflowProjectIdFor("business-003");
    const project = { ...createEmptyProject("workflow"), projectId: id };
    setPersistenceForTest(createPersistence());
    expect(await persistWorkflowProject(project)).toBe(true);
    expect(hasWorkflowProject(id)).toBe(true);
    expect(await deleteWorkflowProject(id)).toBe(true);
    expect(hasWorkflowProject(id)).toBe(false);
  });

  it("persist uses the canonical save path (roundtrips through getProjectManager)", async () => {
    setPersistenceForTest(createPersistence());
    const manager = getProjectManager();
    await manager.initializePersistence();
    const id = workflowProjectIdFor("business-004");
    const project = { ...createEmptyProject("workflow"), projectId: id };
    expect(await persistWorkflowProject(project)).toBe(true);
    await manager.flushPendingSaves();
    expect(manager.getProject(id)).toBeDefined();
  });
});
