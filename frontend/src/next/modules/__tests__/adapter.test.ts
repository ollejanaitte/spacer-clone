import { afterEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../project/projectDataCore";
import { applyBusinessMetadata } from "../../project/businessMetadata";
import { createInitialModuleData } from "../contract";
import {
  readModuleFromManager,
  readModuleFromProject,
  writeModuleToManager,
  writeModuleToProject,
} from "../adapter";
import { getProjectManager, resetProjectManagerForTest } from "../../project/projectManagerInstance";

function makeProject() {
  return applyBusinessMetadata(createEmptyProject("アダプタテスト業務"), {
    businessNumber: "ADP-001",
    designStage: "road-detailed",
  });
}

afterEach(() => {
  resetProjectManagerForTest();
});

describe("Module Data Core Adapter (Phase 1-04)", () => {
  it("reads an empty initial module when the project has no module data", () => {
    const project = makeProject();
    const road = readModuleFromProject(project, "road");
    expect(road.state.status).toBe("notStarted");
    expect(road.data).toEqual({});
  });

  it("writes module data into a new project object without mutating the source", () => {
    const project = makeProject();
    const originalModules = project.modules;
    const moduleData = createInitialModuleData();
    const updated = writeModuleToProject(project, "road", moduleData);
    expect(updated).toBeDefined();
    expect(updated!.modules.road).toEqual(moduleData);
    // source project untouched
    expect(project.modules).toBe(originalModules);
  });

  it("rejects invalid module ids", () => {
    const project = makeProject();
    const result = writeModuleToProject(project, "bogus" as never, createInitialModuleData());
    expect(result).toBeUndefined();
    const managerResult = writeModuleToManager(
      getProjectManager(),
      "any",
      "bogus" as never,
      createInitialModuleData(),
    );
    expect(managerResult.ok).toBe(false);
    if (!managerResult.ok) expect(managerResult.reason).toBe("invalid-module");
  });

  it("writes module data to the manager (Project Data Core via repository)", async () => {
    const manager = getProjectManager();
    const project = makeProject();
    expect(manager.importProject(project)).toBe(true);

    const moduleData: import("../contract").ModuleDataRecord = {
      ...createInitialModuleData(),
      state: { status: "working", dirty: true, lastModified: "2026-08-11T00:00:00.000Z", lastValidated: null, validationErrors: [] },
      data: { dummyValue: 42 },
    };
    const result = writeModuleToManager(manager, project.projectId, "road", moduleData);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const readBack = readModuleFromManager(manager, project.projectId, "road");
    expect(readBack?.data.dummyValue).toBe(42);
    expect(readBack?.state.status).toBe("working");
    await manager.flushPendingSaves();
  });

  it("returns project-not-found for a missing project", () => {
    const manager = getProjectManager();
    const result = writeModuleToManager(manager, "missing-id", "road", createInitialModuleData());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("project-not-found");
  });
});
