import * as THREE from "three";
import type { NodeItem, NodalLoad, MemberLoad } from "../types";
import { isFiniteNumber } from "./threeUtils";

/**
 * SPACER-derived models sometimes have the Y axis inverted between
 * the design drawing and the analysis engine. LINER measuredGrid models use
 * X=bridge axis, Y=transverse, Z=vertical; the Viewer defaults to swap ON for
 * liner-derived projects so Three.js Y-up display matches bridge coordinates.
 *
 *   OFF: model(x, y, z) -> viewer(x, y, z)
 *   ON : model(x, y, z) -> viewer(x, z, y)
 *
 * It does not affect the nodes.x/y/z persisted in JSON, the analysis API
 * input, or the analysis result (ux/uy/uz, rx/ry/rz, section force components).
 */
export type SpacerAxisSwap = "off" | "on";

/** Display-only coordinate policy for viewer rendering. */
export type ViewerDisplayCoordinatePolicy = "general" | "liner";

export const SPACER_AXIS_SWAP_STORAGE_KEY = "spacer-clone:viewer:spacer-axis-swap";

export function isLinerDerivedProject(project: { liner?: unknown }): boolean {
  return typeof project.liner === "object" && project.liner !== null && !Array.isArray(project.liner);
}

export function resolveViewerDisplayCoordinatePolicy(isLinerDerived: boolean): ViewerDisplayCoordinatePolicy {
  return isLinerDerived ? "liner" : "general";
}

export function createSpacerAxisSwap(initial: boolean | SpacerAxisSwap = false): SpacerAxisSwap {
  return initial === true || initial === "on" ? "on" : "off";
}

export function loadStoredSpacerAxisSwap(): SpacerAxisSwap | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SPACER_AXIS_SWAP_STORAGE_KEY);
    if (raw === "on" || raw === "off") return raw;
    return null;
  } catch {
    return null;
  }
}

export function resolveInitialSpacerAxisSwap(isLinerDerived: boolean): SpacerAxisSwap {
  const stored = loadStoredSpacerAxisSwap();
  if (stored !== null) return stored;
  return isLinerDerived ? "on" : "off";
}

export function loadSpacerAxisSwap(): SpacerAxisSwap {
  return loadStoredSpacerAxisSwap() ?? "off";
}

export function persistSpacerAxisSwap(value: SpacerAxisSwap): void {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
  try {
    window.localStorage.setItem(SPACER_AXIS_SWAP_STORAGE_KEY, value);
  } catch {
    /* localStorage unavailable; ignore */
  }
}

export function applySpacerAxisSwap(
  x: number,
  y: number,
  z: number,
  swap: SpacerAxisSwap,
): { x: number; y: number; z: number } {
  if (swap === "on") {
    return { x, y: z, z: y };
  }
  return { x, y, z };
}

/**
 * Viewer display transform applied on top of model coordinates.
 *
 *   general OFF: model(x, y, z) -> viewer(x, y, z)
 *   general ON : model(x, y, z) -> viewer(x, z, y)
 *   liner     OFF: model(x, y, z) -> viewer(x, y, z)
 *   liner     ON : model(x, y, z) -> viewer(x, z, -y)
 */
export function applyViewerDisplayTransform(
  x: number,
  y: number,
  z: number,
  swap: SpacerAxisSwap,
  policy: ViewerDisplayCoordinatePolicy = "general",
): { x: number; y: number; z: number } {
  const swapped = applySpacerAxisSwap(x, y, z, swap);
  if (policy === "liner" && swap === "on") {
    return { x: swapped.x, y: swapped.y, z: -swapped.z };
  }
  return swapped;
}

export function modelToViewerVector(
  vector: { x: number; y: number; z: number },
  swap: SpacerAxisSwap,
  policy: ViewerDisplayCoordinatePolicy = "general",
): THREE.Vector3 {
  const transformed = applyViewerDisplayTransform(vector.x, vector.y, vector.z, swap, policy);
  return new THREE.Vector3(transformed.x, transformed.y, transformed.z);
}

export function modelNodeToViewer(
  node: NodeItem,
  swap: SpacerAxisSwap,
  policy: ViewerDisplayCoordinatePolicy = "general",
): THREE.Vector3 | null {
  if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y) || !isFiniteNumber(node.z)) {
    return null;
  }
  return modelToViewerVector(node, swap, policy);
}

export function modelNodalLoadToViewer(
  load: Pick<NodalLoad, "fx" | "fy" | "fz" | "mx" | "my" | "mz">,
  swap: SpacerAxisSwap,
  policy: ViewerDisplayCoordinatePolicy = "general",
): { force: THREE.Vector3; moment: THREE.Vector3 } {
  const force = applyViewerDisplayTransform(load.fx ?? 0, load.fy ?? 0, load.fz ?? 0, swap, policy);
  const moment = applyViewerDisplayTransform(load.mx ?? 0, load.my ?? 0, load.mz ?? 0, swap, policy);
  return {
    force: new THREE.Vector3(force.x, force.y, force.z),
    moment: new THREE.Vector3(moment.x, moment.y, moment.z),
  };
}

export function modelMemberLoadToViewer(
  load: Pick<MemberLoad, "wx" | "wy" | "wz">,
  swap: SpacerAxisSwap,
  policy: ViewerDisplayCoordinatePolicy = "general",
): THREE.Vector3 {
  const transformed = applyViewerDisplayTransform(load.wx ?? 0, load.wy ?? 0, load.wz ?? 0, swap, policy);
  return new THREE.Vector3(transformed.x, transformed.y, transformed.z);
}

export function modelDisplacementToViewer(
  displacement: { ux: number; uy: number; uz: number },
  swap: SpacerAxisSwap,
  policy: ViewerDisplayCoordinatePolicy = "general",
): THREE.Vector3 {
  const transformed = applyViewerDisplayTransform(
    displacement.ux,
    displacement.uy,
    displacement.uz,
    swap,
    policy,
  );
  return new THREE.Vector3(transformed.x, transformed.y, transformed.z);
}
