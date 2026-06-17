// Pure utilities for the Time History deformation animation.
//
// The animation layer is display-only: it never mutates the project
// payload, the analysis result, or the API contract. It only computes
// a transient per-node position override that the 3D viewer can
// consume in place of the original model coordinates.
//
// The companion design document is
// docs/design/time-history-animation-design.md.

import type { ProjectModel, TimeHistoryResult } from "../types";

export type TimeHistoryDofName = "ux" | "uy" | "uz";

export type TimeHistoryDisplacementKey = {
  nodeId: string;
  dofName: TimeHistoryDofName;
};

/**
 * Parse a displacement key of the form `<nodeId>_<dof>`.
 *
 * Returns `null` when the key is malformed or the dof suffix is not
 * one of the three supported translational degrees of freedom.
 * Rotational keys (`_rx`, `_ry`, `_rz`) are intentionally rejected:
 * the MVP does not animate rotations.
 */
export function parseTimeHistoryDisplacementKey(key: string): TimeHistoryDisplacementKey | null {
  if (typeof key !== "string" || key === "") return null;
  const separator = key.lastIndexOf("_");
  if (separator <= 0 || separator >= key.length - 1) return null;
  const nodeId = key.slice(0, separator);
  const dofName = key.slice(separator + 1);
  if (nodeId === "") return null;
  if (dofName !== "ux" && dofName !== "uy" && dofName !== "uz") return null;
  return { nodeId, dofName };
}

export type TimeHistoryAnimationOverride = Map<string, { x: number; y: number; z: number }>;

export type ComputeTimeHistoryOverrideArgs = {
  project: ProjectModel | null;
  result: TimeHistoryResult | null | undefined;
  timeIndex: number;
  displacementScale: number;
};

/**
 * Compute a transient per-node position override for the active time
 * index. The returned map is keyed by nodeId and contains the
 * original position plus the scaled displacement for the ux, uy, uz
 * components. Missing components and missing nodes default to the
 * original coordinates; the function never throws.
 *
 * The function returns `null` when the animation cannot run, so the
 * caller can fall back to the default model geometry.
 */
export function computeTimeHistoryNodeOverride({
  project,
  result,
  timeIndex,
  displacementScale,
}: ComputeTimeHistoryOverrideArgs): TimeHistoryAnimationOverride | null {
  if (!project) return null;
  if (!result) return null;
  const displacements = result.displacements;
  if (!displacements || typeof displacements !== "object") return null;
  const meta = result.meta;
  const sampleCount = typeof meta?.sampleCount === "number" && Number.isFinite(meta.sampleCount)
    ? meta.sampleCount
    : 0;
  if (sampleCount === 0) return null;
  if (!Number.isFinite(timeIndex)) return null;
  if (!Number.isFinite(displacementScale) || displacementScale === 0) {
    return null;
  }

  // Clamp the active index into [0, sampleCount - 1].
  const clampedIndex = Math.max(0, Math.min(sampleCount - 1, Math.floor(timeIndex)));
  const override: TimeHistoryAnimationOverride = new Map();
  for (const node of project.nodes) {
    const ux = readDisplacement(displacements, node.id, "ux", clampedIndex);
    const uy = readDisplacement(displacements, node.id, "uy", clampedIndex);
    const uz = readDisplacement(displacements, node.id, "uz", clampedIndex);
    override.set(node.id, {
      x: node.x + ux * displacementScale,
      y: node.y + uy * displacementScale,
      z: node.z + uz * displacementScale,
    });
  }
  return override;
}

function readDisplacement(
  displacements: Record<string, number[]>,
  nodeId: string,
  dof: TimeHistoryDofName,
  timeIndex: number,
): number {
  const series = displacements[`${nodeId}_${dof}`];
  if (!Array.isArray(series)) return 0;
  if (timeIndex < 0 || timeIndex >= series.length) return 0;
  const value = series[timeIndex];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Default values for the Time History animation state. Centralised so
 * the controls, the context provider, and the tests can share a
 * single source of truth.
 */
export const DEFAULT_TIME_HISTORY_ANIMATION_SCALE = 120;

export const DEFAULT_TIME_HISTORY_ANIMATION_SPEED = 1;

export const ALLOWED_TIME_HISTORY_ANIMATION_SPEEDS: readonly number[] = [0.25, 0.5, 1, 2, 4];

/**
 * Clamp the time index to the sample count. Returns 0 when the
 * sample count is non-positive.
 */
export function clampTimeIndex(timeIndex: number, sampleCount: number): number {
  if (!Number.isFinite(timeIndex) || !Number.isFinite(sampleCount) || sampleCount <= 0) return 0;
  if (timeIndex < 0) return 0;
  if (timeIndex > sampleCount - 1) return sampleCount - 1;
  return Math.floor(timeIndex);
}
