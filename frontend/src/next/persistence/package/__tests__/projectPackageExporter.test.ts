import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { exportProjectToPackage, suggestedPackageFileName } from "../projectPackageExporter";
import { SPACER_PROJ_EXTENSION } from "../projectPackage";
import { inspectProjectPackage } from "../projectPackageInspector";
import * as projectFileDialog from "../../../../desktop/projectFileDialog";

function makeProject(name = "国道〇〇号道路設計") {
  return applyBusinessMetadata(createEmptyProject(name), {
    businessNumber: "B-2026-010",
    designStage: "road-detailed",
  });
}

function mockSaveResult(result: { canceled: boolean; filePath: string }) {
  return vi.spyOn(projectFileDialog, "saveSpacerProjFile").mockResolvedValue(result as never);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("suggestedPackageFileName", () => {
  it("uses project name with .spacerproj extension, sanitizing unsafe chars", () => {
    const project = makeProject("国道〇〇号/道路設計:test");
    const name = suggestedPackageFileName(project);
    expect(name.endsWith(SPACER_PROJ_EXTENSION)).toBe(true);
    expect(name).not.toContain("/");
    expect(name).not.toContain(":");
    expect(name).toContain("国道");
  });
});

describe("exportProjectToPackage", () => {
  it("builds and saves a valid package via the save dialog", async () => {
    mockSaveResult({ canceled: false, filePath: "/tmp/国道.spacerproj" });
    const project = makeProject();
    const result = await exportProjectToPackage(project);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.filePath).toBe("/tmp/国道.spacerproj");
  });

  it("reports canceled when the user cancels the dialog", async () => {
    mockSaveResult({ canceled: true, filePath: "" });
    const project = makeProject();
    const result = await exportProjectToPackage(project);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("canceled");
  });

  it("reports save-failed on empty file path", async () => {
    mockSaveResult({ canceled: false, filePath: "" });
    const project = makeProject();
    const result = await exportProjectToPackage(project);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("save-failed");
  });

  it("does not modify the source project", async () => {
    mockSaveResult({ canceled: false, filePath: "/tmp/p.spacerproj" });
    const project = makeProject("非破壊テスト");
    const projectId = project.projectId;
    const name = project.name;
    await exportProjectToPackage(project);
    expect(project.projectId).toBe(projectId);
    expect(project.name).toBe(name);
  });

  it("exported package passes integrity inspection (round-trip ready)", async () => {
    mockSaveResult({ canceled: false, filePath: "/tmp/p.spacerproj" });
    const project = makeProject();
    // capture what was passed to saveSpacerProjFile
    const spy = mockSaveResult({ canceled: false, filePath: "/tmp/p.spacerproj" });
    await exportProjectToPackage(project);
    const captured = spy.mock.calls[0]?.[0] as string;
    const inspect = inspectProjectPackage({ fileName: "p.spacerproj", rawJson: captured });
    expect(inspect.ok).toBe(true);
    if (inspect.ok) {
      expect(inspect.report.verdict).toBe("loadable");
      expect(inspect.report.projectId).toBe(project.projectId);
      expect(inspect.report.businessName).toBe(project.name);
    }
  });
});
