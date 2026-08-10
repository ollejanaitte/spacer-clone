import { describe, expect, it } from "vitest";
import { InMemoryProjectRepository } from "../inMemoryProjectRepository";
import { createEmptyProject } from "../projectDataCore";
import { ProjectManager } from "../projectManager";
import {
  applyBusinessMetadata,
  designStageDisplayName,
  getBusinessNumber,
  getDesignStage,
  PROJECT_DESIGN_STAGE_LABELS,
  PROJECT_DESIGN_STAGES,
} from "../businessMetadata";

function createManager() {
  return new ProjectManager(new InMemoryProjectRepository());
}

describe("ProjectManager.createProject", () => {
  it("creates a project with business metadata and current schema version", () => {
    const manager = createManager();
    const result = manager.createProject({
      name: "道路詳細設計業務",
      businessNumber: "B-2026-001",
      designStage: "road-detailed",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.name).toBe("道路詳細設計業務");
    expect(getBusinessNumber(result.project)).toBe("B-2026-001");
    expect(getDesignStage(result.project).id).toBe("road-detailed");
  });

  it("rejects empty business name", () => {
    const manager = createManager();
    const result = manager.createProject({
      name: "",
      businessNumber: "B-2026-001",
      designStage: "other",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("supports other design stage with custom label", () => {
    const manager = createManager();
    const result = manager.createProject({
      name: "その他業務",
      businessNumber: "B-2026-002",
      designStage: "other",
      designStageCustomLabel: "耐震照査",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getDesignStage(result.project).id).toBe("other");
    expect(getDesignStage(result.project).customLabel).toBe("耐震照査");
    expect(designStageDisplayName(result.project)).toBe("耐震照査");
  });
});

describe("ProjectManager get/list/update", () => {
  it("gets a project by id and lists all projects", () => {
    const manager = createManager();
    const created = manager.createProject({
      name: "業務A",
      businessNumber: "A-001",
      designStage: "bridge-preliminary",
    });
    if (!created.ok) throw new Error("create failed");
    const got = manager.getProject(created.project.projectId);
    expect(got?.name).toBe("業務A");
    expect(manager.listProjects()).toHaveLength(1);
  });

  it("returns undefined for missing project", () => {
    const manager = createManager();
    expect(manager.getProject("missing-id")).toBeUndefined();
  });

  it("updates business metadata and name", () => {
    const manager = createManager();
    const created = manager.createProject({
      name: "業務A",
      businessNumber: "A-001",
      designStage: "road-preliminary",
    });
    if (!created.ok) throw new Error("create failed");
    const result = manager.updateProject(created.project.projectId, {
      name: "業務A改訂",
      businessNumber: "A-999",
      designStage: "road-detailed",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.name).toBe("業務A改訂");
    expect(getBusinessNumber(result.project)).toBe("A-999");
    expect(getDesignStage(result.project).id).toBe("road-detailed");
  });

  it("update returns not-found for missing project", () => {
    const manager = createManager();
    const result = manager.updateProject("missing", { name: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-found");
  });
});

describe("ProjectManager.duplicateProject", () => {
  it("creates a duplicate with a new projectId without destroying the original", () => {
    const manager = createManager();
    const created = manager.createProject({
      name: "元業務",
      businessNumber: "ORIG-001",
      designStage: "bridge-detailed",
    });
    if (!created.ok) throw new Error("create failed");
    const duplicateResult = manager.duplicateProject(created.project.projectId);
    expect(duplicateResult.ok).toBe(true);
    if (!duplicateResult.ok) return;
    expect(duplicateResult.project.projectId).not.toBe(created.project.projectId);
    expect(duplicateResult.project.name).toBe("元業務");
    expect(getBusinessNumber(duplicateResult.project)).toBe("ORIG-001");
    expect(getDesignStage(duplicateResult.project).id).toBe("bridge-detailed");
    expect(manager.listProjects()).toHaveLength(2);
    const original = manager.getProject(created.project.projectId);
    expect(original?.name).toBe("元業務");
  });

  it("duplicate returns not-found for missing project", () => {
    const manager = createManager();
    const result = manager.duplicateProject("missing");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-found");
  });
});

describe("ProjectManager.deleteProject", () => {
  it("deletes a project completely", () => {
    const manager = createManager();
    const created = manager.createProject({
      name: "削除対象",
      businessNumber: "DEL-001",
      designStage: "road-preliminary",
    });
    if (!created.ok) throw new Error("create failed");
    expect(manager.deleteProject(created.project.projectId)).toBe(true);
    expect(manager.getProject(created.project.projectId)).toBeUndefined();
    expect(manager.listProjects()).toHaveLength(0);
  });

  it("returns false for missing project", () => {
    const manager = createManager();
    expect(manager.deleteProject("missing")).toBe(false);
  });
});

describe("InMemoryProjectRepository validation boundary", () => {
  it("rejects invalid project objects", () => {
    const repository = new InMemoryProjectRepository();
    const invalid = { ...createEmptyProject("x"), name: "" };
    const result = repository.create(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("rejects duplicate projectId", () => {
    const repository = new InMemoryProjectRepository();
    const project = createEmptyProject("x");
    expect(repository.create(project).ok).toBe(true);
    const duplicate = { ...project, name: "y" };
    const result = repository.create(duplicate);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("duplicate-id");
  });
});

describe("businessMetadata", () => {
  it("exposes the 5 design stage ids with Japanese labels", () => {
    expect(PROJECT_DESIGN_STAGES).toEqual([
      "road-preliminary",
      "road-detailed",
      "bridge-preliminary",
      "bridge-detailed",
      "other",
    ]);
    expect(PROJECT_DESIGN_STAGE_LABELS["road-preliminary"]).toBe("道路予備設計");
    expect(PROJECT_DESIGN_STAGE_LABELS["road-detailed"]).toBe("道路詳細設計");
    expect(PROJECT_DESIGN_STAGE_LABELS["bridge-preliminary"]).toBe("橋梁予備設計");
    expect(PROJECT_DESIGN_STAGE_LABELS["bridge-detailed"]).toBe("橋梁詳細設計");
    expect(PROJECT_DESIGN_STAGE_LABELS.other).toBe("その他");
  });

  it("applyBusinessMetadata stores businessNumber and designStage in metadata", () => {
    const project = createEmptyProject("業務");
    const withMeta = applyBusinessMetadata(project, {
      businessNumber: "B-123",
      designStage: "other",
      designStageCustomLabel: "耐震補強",
    });
    expect(getBusinessNumber(withMeta)).toBe("B-123");
    expect(getDesignStage(withMeta).id).toBe("other");
    expect(getDesignStage(withMeta).customLabel).toBe("耐震補強");
    expect(withMeta.projectId).toBe(project.projectId);
  });
});
