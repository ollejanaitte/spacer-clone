import { describe, expect, it } from "vitest";
import { cameraStateForPreset, cameraViewOf } from "../mountain-viaduct-500/camera";
import { MOUNTAIN_CAMERA_PRESETS } from "../mountain-viaduct-500/fixture";

describe("mountain camera presets", () => {
  it("resolves presets by id", () => {
    const state = cameraStateForPreset(MOUNTAIN_CAMERA_PRESETS, "overview");
    expect(state.position).toEqual(MOUNTAIN_CAMERA_PRESETS[0].position);
    expect(state.target).toEqual(MOUNTAIN_CAMERA_PRESETS[0].target);
  });

  it("falls back to overview for unknown id", () => {
    const state = cameraStateForPreset(MOUNTAIN_CAMERA_PRESETS, "nope");
    expect(state.position).toEqual(MOUNTAIN_CAMERA_PRESETS[0].position);
  });

  it("all presets have finite coordinates", () => {
    for (const preset of MOUNTAIN_CAMERA_PRESETS) {
      const state = cameraStateForPreset(MOUNTAIN_CAMERA_PRESETS, preset.id);
      for (const axis of ["x", "y", "z"] as const) {
        expect(Number.isFinite(state.position[axis])).toBe(true);
        expect(Number.isFinite(state.target[axis])).toBe(true);
      }
    }
  });

  it("computes view direction", () => {
    const state = cameraStateForPreset(MOUNTAIN_CAMERA_PRESETS, "overview");
    const view = cameraViewOf(state);
    expect(view.distance).toBeGreaterThan(0);
    expect(Math.hypot(view.direction.x, view.direction.y, view.direction.z)).toBeCloseTo(1, 3);
  });
});
