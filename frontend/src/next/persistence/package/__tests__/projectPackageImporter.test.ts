import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { buildProjectPackage } from "../projectPackageBuilder";
import { inspectPackageContent, extractProjectFromPackage } from "../projectPackageImporter";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";

function makeProject(name = "読込テスト業務") {
  return applyBusinessMetadata(createEmptyProject(name), {
    businessNumber: "B-IMPORT-001",
    designStage: "bridge-detailed",
  });
}

afterEach(() => {
  resetProjectManagerForTest();
});

describe("inspectPackageContent (import pre-check)", () => {
  it("accepts a valid package", () => {
    const project = makeProject();
    const built = buildProjectPackage(project);
    if (!built.ok) return;
    const result = inspectPackageContent("test.spacerproj", built.json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.report.verdict).toBe("loadable");
      expect(result.pkg).toBeTruthy();
    }
  });

  it("rejects a corrupted package", () => {
    const result = inspectPackageContent("bad.spacerproj", "{ broken");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("invalid-json");
  });

  it("rejects unsafe paths inside the package", () => {
    const project = makeProject();
    const built = buildProjectPackage(project);
    if (!built.ok) return;
    const unsafe = {
      ...built.pkg,
      files: [
        ...built.pkg.files,
        { path: "../evil.txt", content: "x" },
      ],
    };
    const result = inspectPackageContent("unsafe.spacerproj", JSON.stringify(unsafe));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unsafe-path-in-package");
  });
});

describe("extractProjectFromPackage", () => {
  it("extracts the Project from a valid package", () => {
    const project = makeProject();
    const built = buildProjectPackage(project);
    if (!built.ok) return;
    const extracted = extractProjectFromPackage(built.pkg);
    expect(extracted?.projectId).toBe(project.projectId);
    expect(extracted?.name).toBe(project.name);
    expect(extracted?.metadata?.businessNumber).toBe("B-IMPORT-001");
  });
});

describe("importProject registration", () => {
  it("registers an imported project into the business list", async () => {
    const project = makeProject();
    const manager = getProjectManager();
    expect(manager.listProjects()).toHaveLength(0);
    const ok = manager.importProject(project);
    expect(ok).toBe(true);
    expect(manager.listProjects()).toHaveLength(1);
    expect(manager.getProject(project.projectId)?.name).toBe(project.name);
    await manager.flushPendingSaves();
  });

  it("refuses to import a duplicate projectId", () => {
    const project = makeProject();
    const manager = getProjectManager();
    manager.importProject(project);
    const ok = manager.importProject({ ...project, name: "別名" });
    expect(ok).toBe(false);
    expect(manager.listProjects()).toHaveLength(1);
  });
});
