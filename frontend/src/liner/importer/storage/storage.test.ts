/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyImporterProject } from "../factory";
import {
  clearImporterStorageForTests,
  createProject,
  deleteProject,
  deleteSnapshot,
  listProjects,
  loadNamedSnapshot,
  loadProject,
  renameSnapshot,
  saveNamedSnapshot,
  updateProject,
} from "./importerStorage";
import { exportProjectJson, importProjectJson } from "./jsonImportExport";
import {
  clearRecoveryStateForTests,
  getRecoveryInfo,
  hasRecoveryState,
  saveRecoveryState,
} from "./recoveryManager";

describe("importerStorage", () => {
  beforeEach(() => {
    clearImporterStorageForTests();
    clearRecoveryStateForTests();
  });

  afterEach(() => {
    clearImporterStorageForTests();
    clearRecoveryStateForTests();
  });

  it("creates, saves, loads, and lists projects", () => {
    const created = createProject(createEmptyImporterProject("テストプロジェクト"));

    expect(created.name).toBe("テストプロジェクト");
    expect(listProjects()).toHaveLength(1);
    expect(loadProject(created.id)?.name).toBe("テストプロジェクト");

    const updated = updateProject({
      ...created,
      name: "更新後プロジェクト",
    });
    expect(updated.name).toBe("更新後プロジェクト");
    expect(listProjects()[0]?.name).toBe("更新後プロジェクト");
  });

  it("deletes projects and removes them from the index", () => {
    const created = createProject(createEmptyImporterProject());
    deleteProject(created.id);
    expect(loadProject(created.id)).toBeNull();
    expect(listProjects()).toHaveLength(0);
  });

  it("supports named snapshots and round-trip JSON export/import", () => {
    const created = createProject(createEmptyImporterProject("Snapshot Project"));
    const snapshot = saveNamedSnapshot(created.id, {
      name: "Draft Save",
      notes: "途中保存",
      isDraftSave: true,
      lastEditedStep: "bridge",
    });

    expect(snapshot.name).toBe("Draft Save");
    expect(loadProject(created.id)?.savedSnapshots).toHaveLength(1);

    const loadedSnapshot = loadNamedSnapshot(created.id, snapshot.id);
    expect(loadedSnapshot.name).toBe("Snapshot Project");

    const exported = exportProjectJson(loadProject(created.id)!);
    const imported = importProjectJson(exported);
    expect(imported.ok).toBe(true);
    expect(imported.project?.liner.importerSchemaVersion).toBe("0.1.0");
    expect(imported.project?.savedSnapshots?.[0]?.name).toBe("Draft Save");

    renameSnapshot(created.id, snapshot.id, "Renamed Draft");
    expect(loadProject(created.id)?.savedSnapshots?.[0]?.name).toBe("Renamed Draft");

    deleteSnapshot(created.id, snapshot.id);
    expect(loadProject(created.id)?.savedSnapshots).toHaveLength(0);
  });

  it("persists recovery state metadata for startup recovery", () => {
    const created = createProject(createEmptyImporterProject("Recovery Project"));
    saveRecoveryState(created, "sectionEdit", {
      bridgeId: "bridge-1",
      sectionId: "section-1",
    });

    expect(hasRecoveryState()).toBe(true);
    expect(getRecoveryInfo()).toMatchObject({
      projectId: created.id,
      projectName: "Recovery Project",
      lastEditedStep: "sectionEdit",
      lastEditedRef: {
        bridgeId: "bridge-1",
        sectionId: "section-1",
      },
    });
  });
});
