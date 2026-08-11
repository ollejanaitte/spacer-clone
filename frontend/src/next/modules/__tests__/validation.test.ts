import { afterEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../project/projectDataCore";
import { applyBusinessMetadata } from "../../project/businessMetadata";
import { createInitialModuleData } from "../contract";
import { validateModuleData, registerModuleValidator, getModuleValidator, validateProjectBeforeSave } from "../validation";
import { updateModuleData, getModuleData } from "../moduleService";
import { getProjectManager, resetProjectManagerForTest, setPersistenceForTest } from "../../project/projectManagerInstance";
import { MemoryFileSystemGateway } from "../../persistence/memoryFileSystemGateway";
import { FilesystemProjectPersistence } from "../../persistence/filesystemProjectPersistence";

function makeProject() {
  return applyBusinessMetadata(createEmptyProject("バリデーション業務"), {
    businessNumber: "VAL-001",
    designStage: "road-detailed",
  });
}

afterEach(() => {
  resetProjectManagerForTest();
});

describe("Module Validation (Phase 1-05)", () => {
  it("validates with no validator -> completed", () => {
    const record = createInitialModuleData();
    const result = validateModuleData("road", record);
    expect(result.ok).toBe(true);
    expect(result.moduleData.state.status).toBe("completed");
    expect(result.moduleData.state.dirty).toBe(false);
  });

  it("registers and uses a custom validator", () => {
    registerModuleValidator("road", (data) =>
      typeof data.length !== "number" || data.length < 1
        ? [{ path: "road.data.length", message: "must be >= 1" }]
        : [],
    );
    expect(getModuleValidator("road")).toBeDefined();

    const record = { ...createInitialModuleData(), data: { length: 0 } };
    const invalid = validateModuleData("road", record);
    expect(invalid.ok).toBe(false);
    expect(invalid.moduleData.state.status).toBe("invalid");
    expect(invalid.issues).toHaveLength(1);

    const valid = validateModuleData("road", { ...record, data: { length: 5 } });
    expect(valid.ok).toBe(true);
    expect(valid.moduleData.state.status).toBe("completed");
  });

  it("validates the whole project before save", () => {
    const okProject = makeProject();
    expect(validateProjectBeforeSave(okProject).ok).toBe(true);

    const broken = { ...makeProject(), name: "" } as never;
    const result = validateProjectBeforeSave(broken);
    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("Module update -> validate -> Data Core -> auto-save (Phase 1-05)", () => {
  it("updates module data through the manager and persists", async () => {
    const persistence = new FilesystemProjectPersistence(new MemoryFileSystemGateway());
    setPersistenceForTest(persistence);
    const manager = getProjectManager();
    const project = makeProject();
    expect(manager.importProject(project)).toBe(true);

    const result = updateModuleData(manager, {
      projectId: project.projectId,
      moduleId: "road",
      patch: { length: 100 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const stored = getModuleData(manager, project.projectId, "road");
    expect(stored?.data.length).toBe(100);
    expect(stored?.state.status).toBe("completed");
    expect(stored?.state.dirty).toBe(false);

    await manager.flushPendingSaves();
    const loaded = await persistence.loadAllProjects();
    const restored = loaded.find((r) => r.ok && (r as { project: { projectId: string } }).project.projectId === project.projectId);
    const restoredModules = restored && restored.ok
      ? (restored as { project: { modules: Record<string, Record<string, unknown>> } }).project.modules
      : undefined;
    expect(restoredModules?.road).toBeDefined();
    const roadData = restoredModules?.road as { data?: { length?: number } };
    expect(roadData.data?.length).toBe(100);
  });

  it("refuses to write a broken module (validation failure)", () => {
    const manager = getProjectManager();
    const project = makeProject();
    manager.importProject(project);
    registerModuleValidator("road", (data) =>
      typeof data.length !== "number" || data.length < 1
        ? [{ path: "road.data.length", message: "must be >= 1" }]
        : [],
    );
    const result = updateModuleData(manager, {
      projectId: project.projectId,
      moduleId: "road",
      patch: { length: 0 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("validation-failed");
    // broken module must not be written into the source of truth
    const stored = getModuleData(manager, project.projectId, "road");
    expect(stored?.data.length).toBeUndefined();
  });

  it("reports project-not-found", () => {
    const manager = getProjectManager();
    const result = updateModuleData(manager, {
      projectId: "missing",
      moduleId: "road",
      patch: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("project-not-found");
  });
});
