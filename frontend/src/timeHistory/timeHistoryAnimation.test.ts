import { describe, expect, it } from "vitest";
import {
  ALLOWED_TIME_HISTORY_ANIMATION_SPEEDS,
  clampTimeIndex,
  computeAutoDisplacementScale,
  computeMaxAbsDisplacement,
  computeModelSize,
  computeTimeHistoryNodeOverride,
  findMaxAbsTimeIndex,
  getTimeHistoryAxisAvailability,
  inferTimeHistoryActiveDirection,
  parseTimeHistoryDisplacementKey,
  readActiveSeriesValue,
} from "./timeHistoryAnimation";
import type { ProjectModel, TimeHistoryResult } from "../types";
import { createDefaultProject } from "../data/defaultProject";

const baseProject: ProjectModel = createDefaultProject();
baseProject.nodes = [
  { id: "N1", x: 0, y: 0, z: 0 },
  { id: "N2", x: 1, y: 0, z: 0 },
  { id: "N3", x: 2, y: 0, z: 0 },
];

const baseResult: TimeHistoryResult = {
  meta: {
    analysisId: "th-test",
    status: "success",
    method: "newmark-beta",
    timeStep: 0.05,
    duration: 0.1,
    sampleCount: 3,
  },
  time: [0, 0.05, 0.1],
  displacements: {
    N2_ux: [0, 1.0, 0.5],
    N2_uy: [0, 0.2, -0.3],
    N3_uz: [0, 2.0, 1.0],
  },
  velocities: {},
  accelerations: {},
};

describe("parseTimeHistoryDisplacementKey", () => {
  it("splits known translational keys", () => {
    expect(parseTimeHistoryDisplacementKey("N2_ux")).toEqual({ nodeId: "N2", dofName: "ux" });
    expect(parseTimeHistoryDisplacementKey("G5_uz")).toEqual({ nodeId: "G5", dofName: "uz" });
  });

  it("rejects rotational and malformed keys", () => {
    expect(parseTimeHistoryDisplacementKey("N2_rx")).toBeNull();
    expect(parseTimeHistoryDisplacementKey("N2_ry")).toBeNull();
    expect(parseTimeHistoryDisplacementKey("N2_rz")).toBeNull();
    expect(parseTimeHistoryDisplacementKey("_ux")).toBeNull();
    expect(parseTimeHistoryDisplacementKey("N2_")).toBeNull();
    expect(parseTimeHistoryDisplacementKey("N2")).toBeNull();
  });
});

describe("computeTimeHistoryNodeOverride", () => {
  it("returns null when no result is supplied", () => {
    expect(computeTimeHistoryNodeOverride({
      project: baseProject,
      result: null,
      timeIndex: 0,
      displacementScale: 1,
    })).toBeNull();
  });

  it("returns null when project is null", () => {
    expect(computeTimeHistoryNodeOverride({
      project: null,
      result: baseResult,
      timeIndex: 0,
      displacementScale: 1,
    })).toBeNull();
  });

  it("returns null when the sample count is zero", () => {
    const emptyResult: TimeHistoryResult = { ...baseResult, meta: { ...baseResult.meta, sampleCount: 0 } };
    expect(computeTimeHistoryNodeOverride({
      project: baseProject,
      result: emptyResult,
      timeIndex: 0,
      displacementScale: 1,
    })).toBeNull();
  });

  it("computes original + scale * displacement for the active index", () => {
    const override = computeTimeHistoryNodeOverride({
      project: baseProject,
      result: baseResult,
      timeIndex: 1,
      displacementScale: 10,
    });
    expect(override).not.toBeNull();
    const map = override as Map<string, { x: number; y: number; z: number }>;
    // N1 has no displacement data: position is unchanged.
    expect(map.get("N1")).toEqual({ x: 0, y: 0, z: 0 });
    // N2: ux = 1.0, uy = 0.2 -> position scaled by 10
    expect(map.get("N2")).toEqual({ x: 1 + 1.0 * 10, y: 0 + 0.2 * 10, z: 0 });
    // N3: only uz is set; ux, uy default to 0
    expect(map.get("N3")).toEqual({ x: 2, y: 0, z: 0 + 2.0 * 10 });
  });

  it("treats missing ux, uy, uz components as zero", () => {
    const onlyUx: TimeHistoryResult = {
      ...baseResult,
      displacements: { N2_ux: [0, 1.0, 0.5] },
    };
    const override = computeTimeHistoryNodeOverride({
      project: baseProject,
      result: onlyUx,
      timeIndex: 1,
      displacementScale: 2,
    });
    const map = override as Map<string, { x: number; y: number; z: number }>;
    expect(map.get("N2")).toEqual({ x: 1 + 1.0 * 2, y: 0, z: 0 });
  });

  it("clamps the active index to the sample count", () => {
    const override = computeTimeHistoryNodeOverride({
      project: baseProject,
      result: baseResult,
      timeIndex: 999,
      displacementScale: 1,
    });
    const map = override as Map<string, { x: number; y: number; z: number }>;
    // index 999 is clamped to sampleCount - 1 = 2 -> uz = 1.0
    expect(map.get("N3")).toEqual({ x: 2, y: 0, z: 0 + 1.0 });
  });

  it("treats non-finite values as zero", () => {
    const result: TimeHistoryResult = {
      ...baseResult,
      displacements: { N2_ux: [0, Number.NaN, 1.0] },
    };
    const override = computeTimeHistoryNodeOverride({
      project: baseProject,
      result,
      timeIndex: 1,
      displacementScale: 100,
    });
    const map = override as Map<string, { x: number; y: number; z: number }>;
    expect(map.get("N2")).toEqual({ x: 1, y: 0, z: 0 });
  });

  it("does not mutate the project nodes", () => {
    const snapshot = JSON.stringify(baseProject.nodes);
    computeTimeHistoryNodeOverride({
      project: baseProject,
      result: baseResult,
      timeIndex: 2,
      displacementScale: 5,
    });
    expect(JSON.stringify(baseProject.nodes)).toBe(snapshot);
  });
});

describe("clampTimeIndex", () => {
  it("clamps negative values to 0", () => {
    expect(clampTimeIndex(-1, 5)).toBe(0);
  });
  it("clamps large values to sampleCount - 1", () => {
    expect(clampTimeIndex(99, 5)).toBe(4);
  });
  it("returns 0 when sampleCount is non-positive", () => {
    expect(clampTimeIndex(2, 0)).toBe(0);
    expect(clampTimeIndex(2, -1)).toBe(0);
  });
  it("floors fractional inputs", () => {
    expect(clampTimeIndex(2.7, 10)).toBe(2);
  });
});

describe("ALLOWED_TIME_HISTORY_ANIMATION_SPEEDS", () => {
  it("contains the MVP speed set", () => {
    expect(ALLOWED_TIME_HISTORY_ANIMATION_SPEEDS).toEqual([0.25, 0.5, 1, 2, 4]);
  });

describe("computeTimeHistoryNodeOverride with displacement modes", () => {
  it("x mode uses ux only", () => {
    const override = computeTimeHistoryNodeOverride({
      project: baseProject,
      result: baseResult,
      timeIndex: 1,
      displacementScale: 1,
      displacementMode: "x",
    });
    const map = override as Map<string, { x: number; y: number; z: number }>;
    expect(map.get("N2")).toEqual({ x: 1 + 1.0, y: 0, z: 0 });
  });
  it("y mode uses uy only", () => {
    const override = computeTimeHistoryNodeOverride({
      project: baseProject,
      result: baseResult,
      timeIndex: 1,
      displacementScale: 1,
      displacementMode: "y",
    });
    const map = override as Map<string, { x: number; y: number; z: number }>;
    expect(map.get("N2")).toEqual({ x: 1, y: 0 + 0.2, z: 0 });
  });
  it("z mode uses uz only", () => {
    const override = computeTimeHistoryNodeOverride({
      project: baseProject,
      result: baseResult,
      timeIndex: 1,
      displacementScale: 1,
      displacementMode: "z",
    });
    const map = override as Map<string, { x: number; y: number; z: number }>;
    expect(map.get("N3")).toEqual({ x: 2, y: 0, z: 0 + 2.0 });
  });
  it("xyz mode combines ux, uy, uz", () => {
    const override = computeTimeHistoryNodeOverride({
      project: baseProject,
      result: baseResult,
      timeIndex: 1,
      displacementScale: 1,
      displacementMode: "xyz",
    });
    const map = override as Map<string, { x: number; y: number; z: number }>;
    expect(map.get("N2")).toEqual({ x: 1 + 1.0, y: 0 + 0.2, z: 0 });
    expect(map.get("N3")).toEqual({ x: 2, y: 0, z: 0 + 2.0 });
  });
  it("xyz mode applies displacementScale to all components", () => {
    const override = computeTimeHistoryNodeOverride({
      project: baseProject,
      result: baseResult,
      timeIndex: 1,
      displacementScale: 10,
      displacementMode: "xyz",
    });
    const map = override as Map<string, { x: number; y: number; z: number }>;
    expect(map.get("N2")).toEqual({ x: 1 + 10, y: 0 + 2, z: 0 });
    expect(map.get("N3")).toEqual({ x: 2, y: 0, z: 0 + 20 });
  });
  it("missing component is treated as zero in xyz mode", () => {
    const partialResult: TimeHistoryResult = {
      ...baseResult,
      displacements: { N2_ux: [0, 0.5, 0.5] },
    };
    const override = computeTimeHistoryNodeOverride({
      project: baseProject,
      result: partialResult,
      timeIndex: 1,
      displacementScale: 2,
      displacementMode: "xyz",
    });
    const map = override as Map<string, { x: number; y: number; z: number }>;
    expect(map.get("N2")).toEqual({ x: 1 + 1.0, y: 0, z: 0 });
  });
});

describe("computeModelSize", () => {
  it("returns the largest axis extent", () => {
    expect(computeModelSize(baseProject)).toBe(2);
  });
  it("returns 1 for empty or missing projects", () => {
    expect(computeModelSize(null)).toBe(1);
    expect(computeModelSize({ ...baseProject, nodes: [] })).toBe(1);
  });
});

describe("computeMaxAbsDisplacement", () => {
  it("returns the max absolute value across all displacement series", () => {
    expect(computeMaxAbsDisplacement(baseResult)).toBe(2.0);
  });
  it("returns 0 when no result is supplied", () => {
    expect(computeMaxAbsDisplacement(null)).toBe(0);
    expect(computeMaxAbsDisplacement({ ...baseResult, displacements: {} })).toBe(0);
  });
});

describe("computeAutoDisplacementScale", () => {
  it("aims for a deformation that is roughly 1% of the model size", () => {
    const scale = computeAutoDisplacementScale({ modelSize: 100, maxAbsDisplacement: 5, min: 0.01 });
    expect(scale).toBeCloseTo(0.2, 9);
  });
  it("clamps to the minimum when the result is below 1", () => {
    expect(computeAutoDisplacementScale({ modelSize: 0.01, maxAbsDisplacement: 100, min: 1 })).toBe(1);
  });
  it("clamps to the maximum when the result is above the ceiling", () => {
    expect(computeAutoDisplacementScale({ modelSize: 1e9, maxAbsDisplacement: 1e-9, max: 100000 })).toBe(100000);
  });
  it("returns the fallback when the inputs are non-positive", () => {
    expect(computeAutoDisplacementScale({ modelSize: 0, maxAbsDisplacement: 0, fallback: 50 })).toBe(50);
  });
});

describe("findMaxAbsTimeIndex", () => {
  it("returns the index of the largest absolute value", () => {
    expect(findMaxAbsTimeIndex({ result: baseResult, sampleCount: 3 })).toBe(1);
  });
  it("respects the selected key", () => {
    expect(findMaxAbsTimeIndex({ result: baseResult, selectedKey: "N3_uz", sampleCount: 3 })).toBe(1);
  });
  it("returns the fallback when no result is supplied", () => {
    expect(findMaxAbsTimeIndex({ result: null, sampleCount: 3, fallback: 2 })).toBe(2);
  });
});

describe("readActiveSeriesValue", () => {
  it("returns the active value at the active index", () => {
    expect(readActiveSeriesValue({ result: baseResult, selectedKey: "N2_ux", timeIndex: 1, sampleCount: 3 })).toBe(1.0);
  });
  it("returns 0 when the key is missing", () => {
    expect(readActiveSeriesValue({ result: baseResult, selectedKey: "missing", timeIndex: 0, sampleCount: 3 })).toBe(0);
  });
});

describe("inferTimeHistoryActiveDirection", () => {
  it("infers X from meta.groundMotions[0].direction", () => {
    expect(inferTimeHistoryActiveDirection({
      ...baseResult,
      meta: { ...baseResult.meta, groundMotions: [{ direction: "Y" }] },
    })).toBe("uy");
  });
  it("infers X from a per-node _ux key when meta is silent", () => {
    expect(inferTimeHistoryActiveDirection(baseResult)).toBe("ux");
  });
  it("returns null for a null result", () => {
    expect(inferTimeHistoryActiveDirection(null)).toBeNull();
  });
});

describe("getTimeHistoryAxisAvailability", () => {
  it("marks all three axes available for the unconstrained 3D result", () => {
    expect(getTimeHistoryAxisAvailability(baseResult)).toEqual({
      ux: true,
      uy: true,
      uz: true,
      xyz: true,
      activeDirection: "ux",
    });
  });
  it("marks only the active axis available for the constrained single-direction result", () => {
    const onlyX: TimeHistoryResult = {
      ...baseResult,
      displacements: { N2: [0, 0.1, 0.2] },
      meta: { ...baseResult.meta, groundMotions: [{ direction: "X" }] },
    };
    expect(getTimeHistoryAxisAvailability(onlyX)).toEqual({
      ux: true,
      uy: false,
      uz: false,
      xyz: false,
      activeDirection: "ux",
    });
  });
});

describe("computeTimeHistoryNodeOverride with shorthand keys", () => {
  it("maps the shorthand <nodeId> to the active direction", () => {
    const onlyX: TimeHistoryResult = {
      ...baseResult,
      displacements: { N2: [0, 0.1, 0.2], N3: [0, 0.4, 0.5] },
      meta: { ...baseResult.meta, groundMotions: [{ direction: "X" }] },
    };
    const override = computeTimeHistoryNodeOverride({
      project: baseProject,
      result: onlyX,
      timeIndex: 1,
      displacementScale: 10,
    });
    const map = override as Map<string, { x: number; y: number; z: number }>;
    // N1 has no shorthand; the override falls back to the model
    // position.
    expect(map.get("N1")).toEqual({ x: 0, y: 0, z: 0 });
    // N2: ux = 0.1 * 10 = 1.0
    expect(map.get("N2")).toEqual({ x: 1 + 0.1 * 10, y: 0, z: 0 });
    // N3: ux = 0.4 * 10 = 4.0
    expect(map.get("N3")).toEqual({ x: 2 + 0.4 * 10, y: 0, z: 0 });
  });
  it("keeps the Y and Z components at zero when the active direction is X", () => {
    const onlyX: TimeHistoryResult = {
      ...baseResult,
      displacements: { N2: [0, 0.1, 0.2] },
      meta: { ...baseResult.meta, groundMotions: [{ direction: "X" }] },
    };
    const override = computeTimeHistoryNodeOverride({
      project: baseProject,
      result: onlyX,
      timeIndex: 1,
      displacementScale: 1,
      displacementMode: "y",
    });
    const map = override as Map<string, { x: number; y: number; z: number }>;
    // y mode with no Y data: position is unchanged.
    expect(map.get("N2")).toEqual({ x: 1, y: 0, z: 0 });
  });
});})
