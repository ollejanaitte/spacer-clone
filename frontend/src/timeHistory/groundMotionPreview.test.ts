import { describe, expect, it } from "vitest";
import {
  computeGroundMotionPreview,
  computeGroundMotionSampleStatus,
} from "./groundMotionPreview";

describe("computeGroundMotionSampleStatus", () => {
  it("returns ok when sample count matches the expected count", () => {
    const status = computeGroundMotionSampleStatus({ duration: 0.1, timeStep: 0.05, sampleCount: 3 });
    expect(status).toEqual({ kind: "ok", expected: 3, actual: 3 });
  });

  it("returns short when the sample count is too low", () => {
    const status = computeGroundMotionSampleStatus({ duration: 0.2, timeStep: 0.05, sampleCount: 2 });
    expect(status).toEqual({ kind: "short", expected: 5, actual: 2 });
  });

  it("returns long when the sample count is too high", () => {
    const status = computeGroundMotionSampleStatus({ duration: 0.1, timeStep: 0.05, sampleCount: 5 });
    expect(status).toEqual({ kind: "long", expected: 3, actual: 5 });
  });

  it("returns unknown when duration is non-positive", () => {
    expect(computeGroundMotionSampleStatus({ duration: 0, timeStep: 0.05, sampleCount: 1 })).toEqual({ kind: "unknown" });
  });

  it("returns unknown when timeStep is non-positive", () => {
    expect(computeGroundMotionSampleStatus({ duration: 0.1, timeStep: 0, sampleCount: 1 })).toEqual({ kind: "unknown" });
  });
});

describe("computeGroundMotionPreview", () => {
  it("returns max, min, absMax, sampleCount, timeStep, duration", () => {
    const preview = computeGroundMotionPreview({ samples: [-3, 1, 5, -8, 2], timeStep: 0.01, duration: 0.04 });
    expect(preview.sampleCount).toBe(5);
    expect(preview.timeStep).toBe(0.01);
    expect(preview.duration).toBe(0.04);
    expect(preview.max).toBe(5);
    expect(preview.min).toBe(-8);
    expect(preview.absMax).toBe(8);
  });

  it("handles an empty sample list", () => {
    const preview = computeGroundMotionPreview({ samples: [], timeStep: 0.01, duration: 0 });
    expect(preview.max).toBe(0);
    expect(preview.min).toBe(0);
    expect(preview.absMax).toBe(0);
    expect(preview.sampleCount).toBe(0);
  });

  it("ignores non-finite values", () => {
    const preview = computeGroundMotionPreview({ samples: [Number.NaN, 2, Number.POSITIVE_INFINITY, -1], timeStep: 0.01, duration: 0.03 });
    expect(preview.max).toBe(2);
    expect(preview.min).toBe(-1);
    expect(preview.absMax).toBe(2);
  });
});
