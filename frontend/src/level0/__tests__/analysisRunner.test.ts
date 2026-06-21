import { describe, test, expect } from "vitest";
import { fakeRun } from "../services/fakeAnalysisRunner";
import type { ProjectModel } from "../../types";

const mockProject: ProjectModel = {
  project: { id: "test", name: "テスト", schemaVersion: "1.0.0", description: "", createdAt: "", updatedAt: "" },
  units: { length: "m", force: "kN", moment: "kN·m", modulus: "N/mm²", area: "m²", inertia: "m⁴" },
  nodes: [],
  materials: [],
  sections: [],
  members: [],
  supports: [],
  loadCases: [],
  nodalLoads: [],
  memberLoads: [],
  analysisSettings: { analysisType: "linear_static", includeShearDeformation: false, largeDisplacement: false, tolerance: 1e-6 },
};

describe("fakeAnalysisRunner", () => {
  test("weak プリセット: 振幅 4cm", async () => {
    const result = await fakeRun({ project: mockProject, earthquakePreset: "weak" });
    expect(result.maxDisplacement.valueCm).toBeLessThanOrEqual(4);
    expect(result.maxDisplacement.nodeId).toBeTruthy();
    expect(result.timeHistoryResult.time.length).toBeGreaterThan(0);
  });

  test("medium プリセット: 振幅 12cm", async () => {
    const result = await fakeRun({ project: mockProject, earthquakePreset: "medium" });
    expect(result.maxDisplacement.valueCm).toBeLessThanOrEqual(12);
  });

  test("strong プリセット: 振幅 25cm", async () => {
    const result = await fakeRun({ project: mockProject, earthquakePreset: "strong" });
    expect(result.maxDisplacement.valueCm).toBeLessThanOrEqual(25);
  });

  test("timeHistoryResult に必要なフィールドがある", async () => {
    const result = await fakeRun({ project: mockProject, earthquakePreset: "medium" });
    expect(result.timeHistoryResult.meta).toBeTruthy();
    expect(result.timeHistoryResult.time).toBeInstanceOf(Array);
    expect(result.timeHistoryResult.displacements).toBeInstanceOf(Object);
  });

  test("maxDisplacement に必要なフィールドがある", async () => {
    const result = await fakeRun({ project: mockProject, earthquakePreset: "medium" });
    expect(result.maxDisplacement.nodeId).toBeTruthy();
    expect(typeof result.maxDisplacement.valueCm).toBe("number");
    expect(typeof result.maxDisplacement.timeSec).toBe("number");
  });
});
