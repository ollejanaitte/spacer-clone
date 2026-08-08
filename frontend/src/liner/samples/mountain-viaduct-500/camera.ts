/**
 * Mountain sample camera preset application (MOUNTAIN-SAMPLE P07).
 *
 * Applies a MountainCameraPreset (position + target) to a THREE.PerspectiveCamera
 * and OrbitControls. Presets are visual convenience only — they never affect
 * the computed geometry. Pure helpers so the preset math is unit-testable
 * without a rendering context.
 */
import type { MountainCameraPreset } from "./schema";

export interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

/** Resolve the camera state for a preset id (falls back to overview). */
export function cameraStateForPreset(
  presets: readonly MountainCameraPreset[],
  presetId: string,
): CameraState {
  const preset = presets.find((p) => p.id === presetId) ?? presets[0];
  if (!preset) {
    return { position: { x: 250, y: 120, z: 300 }, target: { x: 250, y: 60, z: 0 } };
  }
  return {
    position: { ...preset.position },
    target: { ...preset.target },
  };
}

/** Direction vector from target to camera (unit) + distance. */
export function cameraViewOf(state: CameraState): {
  direction: { x: number; y: number; z: number };
  distance: number;
} {
  const dx = state.position.x - state.target.x;
  const dy = state.position.y - state.target.y;
  const dz = state.position.z - state.target.z;
  const distance = Math.hypot(dx, dy, dz) || 1;
  return {
    direction: { x: dx / distance, y: dy / distance, z: dz / distance },
    distance,
  };
}
