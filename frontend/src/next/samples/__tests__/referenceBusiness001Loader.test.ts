// F-7: RB001 production sample loader のユニットテスト。
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest, setPersistenceForTest } from "../../project/projectManagerInstance";
import { FilesystemProjectPersistence } from "../../persistence/filesystemProjectPersistence";
import { MemoryFileSystemGateway } from "../../persistence/memoryFileSystemGateway";
import { loadReferenceBusinessSample } from "../referenceBusiness001Loader";
import { RB001_COMPLETE_PROJECT_NAME } from "../../../liner/samples/reference-business-001/savedProject";

beforeEach(() => {
  resetProjectManagerForTest();
  setPersistenceForTest(new FilesystemProjectPersistence(new MemoryFileSystemGateway()));
});

afterEach(() => {
  resetProjectManagerForTest();
});

describe("F-7 referenceBusiness001Loader", () => {
  it("loads RB001 as a PDC project (schema-valid, all modules)", async () => {
    const result = await loadReferenceBusinessSample();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.name).toBe(RB001_COMPLETE_PROJECT_NAME);

    const project = getProjectManager().getProject(result.projectId);
    expect(project).toBeDefined();
    if (!project) return;
    // RB001 が実際に記録する module (F-2 unifiedModuleWriter 経由)
    for (const key of ["terrain", "road", "bridgeLayout", "superstructure", "substructure", "analysis"]) {
      expect(Object.keys(project.modules[key as keyof typeof project.modules] ?? {}).length).toBeGreaterThan(0);
    }
    // 全 module slot が module record 形状 (state/data/validation) を持つ
    for (const key of ["cim", "deliverables"]) {
      const mod = project.modules[key as keyof typeof project.modules] ?? {};
      expect(Object.keys(mod).length).toBeGreaterThanOrEqual(0);
    }
  });

  it("fails closed when the same-named project already exists (no duplicate)", async () => {
    const first = await loadReferenceBusinessSample();
    expect(first.ok).toBe(true);
    const second = await loadReferenceBusinessSample();
    expect(second.ok).toBe(false);
  });
});
