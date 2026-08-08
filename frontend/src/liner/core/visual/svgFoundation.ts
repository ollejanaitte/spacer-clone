/**
 * Schematic SVG foundation (STEP-3 S3-UX01).
 *
 * Shared helpers for rendering schematic diagrams (PLAN / PROFILE / SECTION /
 * BRIDGE) with consistent selection / highlight / warning / error visual
 * states (UX-P06 FROZEN). No geometry is computed here; callers pass resolved
 * screen points from the existing frontend core (no UI-side re-implementation
 * of the geometry solvers).
 */

import type {
  DiagramPayload,
  VisualState,
} from "../visual/contract";
import {
  errorsForObject,
  warningsForObject,
} from "../visual/contract";

/** Common visual state colors (UX-P06 §5, FROZEN). */
export const VISUAL_COLORS = {
  selected: "#2563eb",
  input: "#94a3b8",
  validated: "#22c55e",
  calculated: "#16a34a",
  warning: "#d97706",
  error: "#dc2626",
  invalid: "#9ca3af",
  edge: "#ea580c",
  default: "#334155",
} as const;

export interface SvgPoint {
  x: number;
  y: number;
}

export interface SvgBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Map a world-coordinate point into the SVG viewBox space. */
export function toViewBox(
  point: SvgPoint,
  bounds: SvgBounds,
  width: number,
  height: number,
  padding = 24,
): SvgPoint {
  const spanX = Math.max(bounds.maxX - bounds.minX, 1e-9);
  const spanY = Math.max(bounds.maxY - bounds.minY, 1e-9);
  return {
    x: ((point.x - bounds.minX) / spanX) * (width - 2 * padding) + padding,
    y: height - padding - ((point.y - bounds.minY) / spanY) * (height - 2 * padding),
  };
}

/** Bounds of a set of points (falls back to [0,1] when empty). */
export function boundsOf(points: readonly SvgPoint[]): SvgBounds {
  if (points.length === 0) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/** Fill / stroke color for an object based on its visual state. */
export function objectColor(
  objectId: string,
  payload: DiagramPayload,
  state: VisualState,
): string {
  if (errorsForObject(payload, objectId).length > 0) {
    return VISUAL_COLORS.error;
  }
  if (warningsForObject(payload, objectId).length > 0) {
    return VISUAL_COLORS.warning;
  }
  if (payload.selectedObjectId === objectId) {
    return VISUAL_COLORS.selected;
  }
  if (state === "INPUT") {
    return VISUAL_COLORS.input;
  }
  if (state === "VALIDATED") {
    return VISUAL_COLORS.validated;
  }
  return VISUAL_COLORS.calculated;
}

/** Stroke width: highlighted objects are thicker. */
export function objectStrokeWidth(objectId: string, payload: DiagramPayload): number {
  return payload.selectedObjectId === objectId ? 3 : 1.5;
}

/** Dash array for invalid / deferred objects. */
export function objectDash(objectId: string, payload: DiagramPayload): string | undefined {
  const hasError = errorsForObject(payload, objectId).length > 0;
  return hasError ? "6 3" : undefined;
}

export interface AxisLegendProps {
  orientation: "horizontal" | "vertical";
  label: string;
}

export function axisLegend({ orientation, label }: AxisLegendProps): string {
  return `${orientation}:${label}`;
}
