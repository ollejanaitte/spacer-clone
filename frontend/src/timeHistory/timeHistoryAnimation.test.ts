import { describe, expect, it } from "vitest";
import {
  ALLOWED_TIME_HISTORY_ANIMATION_SPEEDS,
  clampTimeIndex,
  computeTimeHistoryNodeOverride,
  parseTimeHistoryDisplacementKey,
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
});
