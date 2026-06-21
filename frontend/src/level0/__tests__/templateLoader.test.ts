import { describe, test, expect, vi, beforeEach } from "vitest";
import { loadTemplate, loadTemplateProject, loadTemplateWaveforms, clearTemplateCache } from "../services/templateLoader";

const mockTemplate = {
  schemaVersion: "1.0.0",
  level0_metadata: {
    templateId: "test-template",
    presentationLabel: "テスト",
    mode: "level0",
    createdBy: "test",
    displayReference: { displacementCm: 20 },
  },
  project: {
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
    analysisSettings: { analysisType: "linear_static" as const, includeShearDeformation: false, largeDisplacement: false, tolerance: 1e-6 },
  },
  presentation: { nodes: {}, members: {} },
  waveforms: { test_wave: { dt: 0.01, unit: "gal", values: [0, 1, 2] } },
};

describe("templateLoader", () => {
  beforeEach(() => {
    clearTemplateCache();
    vi.restoreAllMocks();
  });

  test("loadTemplate: テンプレートJSONを読み込む", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockTemplate,
    } as Response);

    const template = await loadTemplate("test-template");
    expect(template.level0_metadata.templateId).toBe("test-template");
    expect(globalThis.fetch).toHaveBeenCalledWith("/templates/test-template.json");
  });

  test("loadTemplate: キャッシュが効く", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockTemplate,
    } as Response);

    await loadTemplate("test-template");
    await loadTemplate("test-template");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("loadTemplate: 存在しないテンプレートはエラー", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await expect(loadTemplate("nonexistent")).rejects.toThrow("Failed to load template");
  });

  test("loadTemplateProject: ProjectModelを返す", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockTemplate,
    } as Response);

    const project = await loadTemplateProject("test-template");
    expect(project.project.id).toBe("test");
  });

  test("loadTemplateWaveforms: 波形データを返す", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockTemplate,
    } as Response);

    const waveforms = await loadTemplateWaveforms("test-template");
    expect(waveforms.test_wave.dt).toBe(0.01);
    expect(waveforms.test_wave.values).toEqual([0, 1, 2]);
  });
});
