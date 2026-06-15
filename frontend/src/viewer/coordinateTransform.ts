import * as THREE from "three";
import type { NodeItem, NodalLoad, MemberLoad } from "../types";
import { isFiniteNumber } from "./threeUtils";

/**
 * SPACER 由来のモデルでは、設計図面上の Y 軸と解析エンジン上の Y 軸の
 * 意味が逆になっているケースがあります。本関数は Viewer 表示時のみ
 * 表示座標を入れ替えるための純粋関数群です。
 *
 *   OFF: model(x, y, z) -> viewer(x, y, z)
 *   ON : model(x, y, z) -> viewer(x, z, y)
 *
 * JSON に保存される nodes.x/y/z、解析 API への入力、解析結果
 * (ux/uy/uz, rx/ry/rz, 断面力成分) には一切影響を与えません。
 */
export type SpacerAxisSwap = "off" | "on";

export const SPACER_AXIS_SWAP_STORAGE_KEY = "spacer-clone:viewer:spacer-axis-swap";

export function createSpacerAxisSwap(initial: boolean | SpacerAxisSwap = false): SpacerAxisSwap {
  return initial === true || initial === "on" ? "on" : "off";
}

export function loadSpacerAxisSwap(): SpacerAxisSwap {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return "off";
  try {
    const raw = window.localStorage.getItem(SPACER_AXIS_SWAP_STORAGE_KEY);
    return raw === "on" ? "on" : "off";
  } catch {
    return "off";
  }
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

export function modelToViewerVector(
  vector: { x: number; y: number; z: number },
  swap: SpacerAxisSwap,
): THREE.Vector3 {
  const transformed = applySpacerAxisSwap(vector.x, vector.y, vector.z, swap);
  return new THREE.Vector3(transformed.x, transformed.y, transformed.z);
}

export function modelNodeToViewer(node: NodeItem, swap: SpacerAxisSwap): THREE.Vector3 | null {
  if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y) || !isFiniteNumber(node.z)) {
    return null;
  }
  return modelToViewerVector(node, swap);
}

export function modelNodalLoadToViewer(
  load: Pick<NodalLoad, "fx" | "fy" | "fz" | "mx" | "my" | "mz">,
  swap: SpacerAxisSwap,
): { force: THREE.Vector3; moment: THREE.Vector3 } {
  const force = applySpacerAxisSwap(load.fx ?? 0, load.fy ?? 0, load.fz ?? 0, swap);
  const moment = applySpacerAxisSwap(load.mx ?? 0, load.my ?? 0, load.mz ?? 0, swap);
  return {
    force: new THREE.Vector3(force.x, force.y, force.z),
    moment: new THREE.Vector3(moment.x, moment.y, moment.z),
  };
}

export function modelMemberLoadToViewer(
  load: Pick<MemberLoad, "wx" | "wy" | "wz">,
  swap: SpacerAxisSwap,
): THREE.Vector3 {
  const transformed = applySpacerAxisSwap(load.wx ?? 0, load.wy ?? 0, load.wz ?? 0, swap);
  return new THREE.Vector3(transformed.x, transformed.y, transformed.z);
}

export function modelDisplacementToViewer(
  displacement: { ux: number; uy: number; uz: number },
  swap: SpacerAxisSwap,
): THREE.Vector3 {
  const transformed = applySpacerAxisSwap(displacement.ux, displacement.uy, displacement.uz, swap);
  return new THREE.Vector3(transformed.x, transformed.y, transformed.z);
}