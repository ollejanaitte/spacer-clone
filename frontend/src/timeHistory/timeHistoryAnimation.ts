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

/**
 * The displacement mode selects which combination of `ux`, `uy`,
 * `uz` is animated. The MVP supports single-axis and combined
 * `xyz` modes. Missing components default to 0.
 */
export type TimeHistoryDisplacementMode = "x" | "y" | "z" | "xyz";

export const DEFAULT_TIME_HISTORY_DISPLACEMENT_MODE: TimeHistoryDisplacementMode = "xyz";

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
  displacementMode?: TimeHistoryDisplacementMode;
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
  displacementMode = DEFAULT_TIME_HISTORY_DISPLACEMENT_MODE,
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
  const includeX = displacementMode === "x" || displacementMode === "xyz";
  const includeY = displacementMode === "y" || displacementMode === "xyz";
  const includeZ = displacementMode === "z" || displacementMode === "xyz";
  const override: TimeHistoryAnimationOverride = new Map();
  for (const node of project.nodes) {
    const ux = includeX ? readDisplacement(displacements, node.id, "ux", clampedIndex) : 0;
    const uy = includeY ? readDisplacement(displacements, node.id, "uy", clampedIndex) : 0;
    const uz = includeZ ? readDisplacement(displacements, node.id, "uz", clampedIndex) : 0;
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

/**
 * Compute a model-size scaling factor. The factor is the largest
 * axis-aligned extent of the model bounding box, or a small
 * non-zero value when the model has fewer than 2 nodes.
 */
export function computeModelSize(project: ProjectModel | null | undefined): number {
  if (!project || !Array.isArray(project.nodes) || project.nodes.length === 0) return 1;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const node of project.nodes) {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.z < minZ) minZ = node.z;
    if (node.x > maxX) maxX = node.x;
    if (node.y > maxY) maxY = node.y;
    if (node.z > maxZ) maxZ = node.z;
  }
  const dx = maxX - minX;
  const dy = maxY - minY;
  const dz = maxZ - minZ;
  const size = Math.max(dx, dy, dz);
  return size > 0 ? size : 1;
}

/**
 * Compute the maximum absolute displacement across all the
 * displacement series in the result. Returns 0 when no finite
 * values are found.
 */
export function computeMaxAbsDisplacement(result: TimeHistoryResult | null | undefined): number {
  if (!result || !result.displacements) return 0;
  let maxAbs = 0;
  for (const key of Object.keys(result.displacements)) {
    if (!key.endsWith("_ux") && !key.endsWith("_uy") && !key.endsWith("_uz")) continue;
    const series = result.displacements[key];
    if (!Array.isArray(series)) continue;
    for (const value of series) {
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      const abs = Math.abs(value);
      if (abs > maxAbs) maxAbs = abs;
    }
  }
  return maxAbs;
}

/**
 * Compute a sensible default displacement scale. The helper aims
 * for a deformation that is roughly 1% of the model size, with a
 * floor of 1 and a ceiling of 100000. The result is clamped to
 * positive finite numbers.
 */
export function computeAutoDisplacementScale(args: {
  modelSize: number;
  maxAbsDisplacement: number;
  fallback?: number;
  min?: number;
  max?: number;
}): number {
  const fallback = args.fallback ?? DEFAULT_TIME_HISTORY_ANIMATION_SCALE;
  const min = args.min ?? 1;
  const max = args.max ?? 100000;
  const size = Number.isFinite(args.modelSize) && args.modelSize > 0 ? args.modelSize : 0;
  const disp = Number.isFinite(args.maxAbsDisplacement) && args.maxAbsDisplacement > 0
    ? args.maxAbsDisplacement
    : 0;
  if (size <= 0 || disp <= 0) return clampScale(fallback, min, max);
  const target = size * 0.01;
  const candidate = target / disp;
  return clampScale(candidate, min, max);
}

function clampScale(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || value <= 0) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Find the time index at which the absolute value of the selected
 * series is maximised. The series is selected by a single key,
 * e.g. `N2_ux`. When the key is empty or the series is missing,
 * the function searches across all displacement series.
 */
export function findMaxAbsTimeIndex(args: {
  result: TimeHistoryResult | null | undefined;
  selectedKey?: string | null;
  seriesKind?: "displacement" | "velocity" | "acceleration";
  sampleCount: number;
  fallback?: number;
}): number {
  const { result, selectedKey, sampleCount, fallback = 0 } = args;
  const seriesKind = args.seriesKind ?? "displacement";
  if (!result || sampleCount <= 0) return clampTimeIndex(fallback, sampleCount);
  const table = seriesKind === "velocity"
    ? result.velocities
    : seriesKind === "acceleration"
      ? result.accelerations
      : result.displacements;
  if (!table || typeof table !== "object") return clampTimeIndex(fallback, sampleCount);
  const keys = typeof selectedKey === "string" && selectedKey !== "" && Array.isArray(table[selectedKey])
    ? [selectedKey]
    : Object.keys(table).filter((key) => key.endsWith("_ux") || key.endsWith("_uy") || key.endsWith("_uz"));
  if (keys.length === 0) return clampTimeIndex(fallback, sampleCount);
  let bestIndex = clampTimeIndex(fallback, sampleCount);
  let bestAbs = -1;
  for (const key of keys) {
    const series = table[key];
    if (!Array.isArray(series)) continue;
    for (let index = 0; index < Math.min(series.length, sampleCount); index += 1) {
      const value = series[index];
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      const abs = Math.abs(value);
      if (abs > bestAbs) {
        bestAbs = abs;
        bestIndex = index;
      }
    }
  }
  return bestIndex;
}

/**
 * Read the value of the active series at the active time index.
 * Returns 0 when the key is missing or the index is out of range.
 */
export function readActiveSeriesValue(args: {
  result: TimeHistoryResult | null | undefined;
  selectedKey?: string | null;
  seriesKind?: "displacement" | "velocity" | "acceleration";
  timeIndex: number;
  sampleCount: number;
}): number {
  const { result, selectedKey, timeIndex, sampleCount } = args;
  const seriesKind = args.seriesKind ?? "displacement";
  if (!result) return 0;
  const table = seriesKind === "velocity"
    ? result.velocities
    : seriesKind === "acceleration"
      ? result.accelerations
      : result.displacements;
  if (!table) return 0;
  const key = typeof selectedKey === "string" && selectedKey !== "" ? selectedKey : null;
  if (!key) return 0;
  const series = table[key];
  if (!Array.isArray(series)) return 0;
  const clamped = clampTimeIndex(timeIndex, sampleCount);
  if (clamped < 0 || clamped >= series.length) return 0;
  const value = series[clamped];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}