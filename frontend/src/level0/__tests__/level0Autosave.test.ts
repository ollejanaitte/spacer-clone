// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { saveLevel0State, loadLevel0State, clearLevel0State, getStorageKey } from "../services/level0Autosave";
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

describe("level0Autosave", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  test("saveLevel0State: 状態を保存できる", () => {
    saveLevel0State(mockProject, "medium");
    const raw = window.localStorage.getItem(getStorageKey());
    expect(raw).toBeTruthy();
  });

  test("loadLevel0State: 保存した状態を読み込める", () => {
    saveLevel0State(mockProject, "medium");
    const data = loadLevel0State();
    expect(data).toBeTruthy();
    expect(data?.preset).toBe("medium");
    expect(data?.project.project.id).toBe("test");
  });

  test("loadLevel0State: データがない場合はnull", () => {
    const data = loadLevel0State();
    expect(data).toBeNull();
  });

  test("clearLevel0State: 状態を削除できる", () => {
    saveLevel0State(mockProject, "weak");
    clearLevel0State();
    const data = loadLevel0State();
    expect(data).toBeNull();
  });

  test("savedAt はタイムスタンプ", () => {
    const before = Date.now();
    saveLevel0State(mockProject, "strong");
    const data = loadLevel0State();
    expect(data?.savedAt).toBeGreaterThanOrEqual(before);
  });
});
