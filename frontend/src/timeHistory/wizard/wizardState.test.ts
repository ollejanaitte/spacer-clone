import { describe, expect, it } from "vitest";
import type { ProjectModel, TimeHistoryResult } from "../../types";
import {
  buildTimeHistoryCheckItems,
  computeGroundMotionConsistency,
  computeMatchDuration,
  isXyzAnimationAvailable,
  selectTimeHistoryMainStatus,
  toWizardError,
} from "./wizardState";

function makeProject(overrides: Partial<ProjectModel> = {}): ProjectModel {
  return {
    project: { id: "p", name: "test", schemaVersion: "v1", description: "", createdAt: "", updatedAt: "" },
    nodes: [
      { id: "N1", x: 0, y: 0, z: 0 },
      { id: "N2", x: 1, y: 0, z: 0 },
    ],
    members: [{ id: "M1", nodeI: "N1", nodeJ: "N2", materialId: "mat1", sectionId: "sec1" }],
    materials: [],
    sections: [],
    supports: [{ nodeId: "N1", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false }],
    loadCases: [],
    loads: { nodal: [], member: [] },
    massCases: [{ id: "mc1", name: "mass1", method: "lumped", source: "self_weight" }],
    analysisSettings: {
      timeHistory: {
        enabled: true,
        method: "newmark-beta",
        timeStep: 0.01,
        duration: 0.5,
        beta: 0.25,
        gamma: 0.5,
        massCaseId: "mc1",
        groundMotionId: "gm-001",
        direction: "X",
        damping: { type: "rayleigh", alpha: 0, beta: 0 },
      },
    },
    groundMotions: [
      { id: "gm-001", name: "wave", direction: "X", unit: "m/s2", timeStep: 0.01, duration: 0.5, samples: [0, 0.1, 0.2] },
    ],
    analysisResults: null,
    ...overrides,
  } as unknown as ProjectModel;
}

function makeResult(overrides: Partial<TimeHistoryResult> = {}): TimeHistoryResult {
  return {
    meta: { analysisId: "a1", status: "success", method: "newmark-beta", timeStep: 0.01, duration: 0.5, sampleCount: 3 },
    time: [0, 0.01, 0.02],
    displacements: {
      N1_ux: [0, 0.001, 0.002],
      N1_uy: [0, 0.0005, 0.001],
      N1_uz: [0, 0.0001, 0.0002],
    },
    velocities: {},
    accelerations: {},
    ...overrides,
  };
}

describe("selectTimeHistoryMainStatus", () => {
  it("returns unconfigured when no project and no result", () => {
    expect(selectTimeHistoryMainStatus(null, null, {})).toBe("unconfigured");
  });

  it("returns running while loading", () => {
    expect(selectTimeHistoryMainStatus(makeProject(), null, { loading: true })).toBe("running");
  });

  it("returns error when an error flag is set", () => {
    expect(selectTimeHistoryMainStatus(makeProject(), null, { hasError: true })).toBe("error");
  });

  it("returns complete when a result is present", () => {
    expect(selectTimeHistoryMainStatus(makeProject(), makeResult(), {})).toBe("complete");
  });

  it("returns ready when only the project has motion samples", () => {
    const project = makeProject();
    expect(selectTimeHistoryMainStatus(project, null, {})).toBe("ready");
  });

  it("returns incomplete when the project is empty", () => {
    expect(selectTimeHistoryMainStatus(null, makeResult(), {})).toBe("complete");
  });
});

describe("buildTimeHistoryCheckItems", () => {
  it("returns 10 items with NG first when project is missing", () => {
    const items = buildTimeHistoryCheckItems({ project: null, result: null, inputs: {} });
    expect(items).toHaveLength(10);
    expect(items[0].state).toBe("ng");
    const ngItems = items.filter((item) => item.state === "ng");
    expect(ngItems.length).toBeGreaterThan(0);
  });

  it("returns ok items when project is well-formed and has a result", () => {
    const items = buildTimeHistoryCheckItems({ project: makeProject(), result: makeResult(), inputs: {} });
    const ok = items.filter((item) => item.state === "ok");
    expect(ok.length).toBeGreaterThan(0);
  });

  it("flags animation warning when xyz components are missing", () => {
    const result = makeResult({ displacements: { N1_ux: [0, 0.001, 0.002] } });
    const items = buildTimeHistoryCheckItems({ project: makeProject(), result, inputs: {} });
    const anim = items.find((item) => item.id === "animation");
    expect(anim?.state).toBe("warning");
  });
});

describe("computeGroundMotionConsistency", () => {
  it("marks a matching series as ok", () => {
    const consistency = computeGroundMotionConsistency({
      samples: [0, 0.01, 0.02, 0.03, 0.04],
      timeStep: 0.01,
      duration: 0.04,
    });
    expect(consistency.matches).toBe(true);
    expect(consistency.ok).toBe(true);
    expect(consistency.expectedSamples).toBe(5);
    expect(consistency.motionDuration).toBeCloseTo(0.04, 5);
  });

  it("flags a mismatch", () => {
    const consistency = computeGroundMotionConsistency({
      samples: [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1],
      timeStep: 0.01,
      duration: 0.04,
    });
    expect(consistency.matches).toBe(false);
    expect(consistency.ok).toBe(false);
  });

  it("returns 0 expected samples when duration is zero", () => {
    const consistency = computeGroundMotionConsistency({ samples: [0, 0.01], timeStep: 0.01, duration: 0 });
    expect(consistency.expectedSamples).toBe(0);
    expect(consistency.matches).toBe(false);
  });
});

describe("computeMatchDuration", () => {
  it("returns the full duration of the motion", () => {
    expect(computeMatchDuration(0.01, 5000)).toBeCloseTo(49.99, 5);
  });

  it("returns 0 for invalid input", () => {
    expect(computeMatchDuration(0, 5)).toBe(0);
    expect(computeMatchDuration(0.01, 0)).toBe(0);
  });
});

describe("toWizardError", () => {
  it("renders a ground motion mismatch card with current values and formula", () => {
    const card = toWizardError("ground-motion-mismatch", {
      groundMotion: { sampleCount: 5000, timeStep: 0.01, motionDuration: 49.99, duration: 45 },
    });
    expect(card.title).toContain("一致していません");
    expect(card.buttons.find((button) => button.id === "match-duration")).toBeTruthy();
    expect(card.buttons.find((button) => button.id === "go-to-section")).toBeTruthy();
    expect(card.targetSection).toBe("groundMotion");
    expect(card.detail.length).toBeGreaterThan(0);
  });

  it("renders a ground motion missing card", () => {
    const card = toWizardError("ground-motion-missing");
    expect(card.title).toContain("選択されていません");
    expect(card.targetSection).toBe("groundMotion");
  });

  it("renders an invalid dt card", () => {
    const card = toWizardError("invalid-dt", { dt: 0 });
    expect(card.title).toContain("dt");
    expect(card.targetSection).toBe("analysis");
  });

  it("renders an output target missing card", () => {
    const card = toWizardError("output-target-missing");
    expect(card.title).toContain("対象が選択されていません");
    expect(card.targetSection).toBe("output");
  });

  it("renders an animation incomplete card with missing axes", () => {
    const card = toWizardError("animation-incomplete", { missingAxes: ["Y", "Z"] });
    expect(card.title).toContain("XYZ合成変位");
    expect(card.reason).toContain("Y・Z");
  });
});

describe("isXyzAnimationAvailable", () => {
  it("returns true when all ux/uy/uz are present", () => {
    expect(isXyzAnimationAvailable(makeResult()).available).toBe(true);
  });

  it("returns missing axes when components are absent", () => {
    const availability = isXyzAnimationAvailable(
      makeResult({ displacements: { N1_ux: [0, 0.001] } }),
    );
    expect(availability.available).toBe(false);
    expect(availability.missingAxes).toEqual(["Y", "Z"]);
  });

  it("returns all axes missing for a null result", () => {
    expect(isXyzAnimationAvailable(null)).toEqual({ available: false, missingAxes: ["X", "Y", "Z"] });
  });
});
