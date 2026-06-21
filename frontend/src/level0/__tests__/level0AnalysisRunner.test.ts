import { describe, test, expect, vi, beforeEach } from "vitest";
import { runLevel0Analysis } from "../services/level0AnalysisRunner";
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

const mockResponse = {
  result: {
    timeHistoryResult: {
      meta: { analysisId: "test", status: "success", method: "newmark-beta", timeStep: 0.01, duration: 30, sampleCount: 3000 },
      time: [0, 0.01, 0.02],
      displacements: { "N007_ux": [0, 1, 2], "N008_ux": [0, 0.5, 1] },
      velocities: {},
      accelerations: {},
    },
  },
};

describe("level0AnalysisRunner", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("runLevel0Analysis: API呼び出し成功", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await runLevel0Analysis({ project: mockProject, earthquakePreset: "medium" });
    expect(result.timeHistoryResult.meta.status).toBe("success");
    expect(result.maxDisplacement.nodeId).toBeTruthy();
    expect(typeof result.maxDisplacement.valueCm).toBe("number");
  });

  test("runLevel0Analysis: API呼び出し失敗", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(runLevel0Analysis({ project: mockProject, earthquakePreset: "weak" })).rejects.toThrow("Analysis failed");
  });
});
