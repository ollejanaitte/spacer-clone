import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { getResponseSpectrumDisplacements, type ResponseSpectrumSelection } from "../results/resultViewModel";
import { applyViewerDisplayTransform, type SpacerAxisSwap, type ViewerDisplayCoordinatePolicy } from "./coordinateTransform";
import type { AnalysisResult, Member, NodeItem, ProjectModel } from "../types";

export const MODEL_UP = new THREE.Vector3(0, 1, 0);

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function nodeToVector(node: NodeItem | undefined): THREE.Vector3 | null {
  if (!node || !isFiniteNumber(node.x) || !isFiniteNumber(node.y) || !isFiniteNumber(node.z)) {
    return null;
  }
  return new THREE.Vector3(node.x, node.y, node.z);
}

/**
 * Build the per-node position map used by the renderers.
 *
 * When `override` is supplied (e.g. an animation-time displacement map),
 * the override is applied on top of the model coordinates for any node
 * whose id is present. The viewer uses this hook to apply display-only
 * animation displacement without mutating the underlying project.
 *
 * The original model coordinates are still used as the source of truth
 * so `override` is always additive, never destructive.
 */
export function createNodeMap(
  project: ProjectModel,
  swap: SpacerAxisSwap = "off",
  override?: Map<string, { x: number; y: number; z: number }> | null,
  displayPolicy: ViewerDisplayCoordinatePolicy = "general",
): Map<string, THREE.Vector3> {
  const nodes = new Map<string, THREE.Vector3>();
  for (const node of project.nodes) {
    if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y) || !isFiniteNumber(node.z)) continue;
    const o = override?.get(node.id);
    const srcX = o && isFiniteNumber(o.x) ? o.x : node.x;
    const srcY = o && isFiniteNumber(o.y) ? o.y : node.y;
    const srcZ = o && isFiniteNumber(o.z) ? o.z : node.z;
    const t = applyViewerDisplayTransform(srcX, srcY, srcZ, swap, displayPolicy);
    nodes.set(node.id, new THREE.Vector3(t.x, t.y, t.z));
  }
  return nodes;
}

export function getMemberEnds(
  member: Member,
  nodeMap: Map<string, THREE.Vector3>,
): { start: THREE.Vector3; end: THREE.Vector3; mid: THREE.Vector3; direction: THREE.Vector3 } | null {
  const start = nodeMap.get(member.nodeI);
  const end = nodeMap.get(member.nodeJ);
  if (!start || !end) return null;
  const delta = new THREE.Vector3().subVectors(end, start);
  const length = delta.length();
  if (!Number.isFinite(length) || length <= 1e-9) return null;
  return {
    start,
    end,
    mid: new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5),
    direction: delta.normalize(),
  };
}

export function createLine(
  points: THREE.Vector3[],
  color: THREE.ColorRepresentation,
  name?: string,
  width = 1,
): THREE.Line | Line2 {
  if (width > 1) {
    const geometry = new LineGeometry();
    geometry.setPositions(points.flatMap((point) => [point.x, point.y, point.z]));
    const material = new LineMaterial({
      color: new THREE.Color(color).getHex(),
      linewidth: Math.min(50, Math.max(1, width)),
      worldUnits: false,
    });
    const line = new Line2(geometry, material);
    line.computeLineDistances();
    if (name) line.name = name;
    return line;
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geometry, material);
  if (name) line.name = name;
  return line;
}

export function createLabelSprite(
  text: string,
  color = "#222222",
  size = 1,
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const fontSize = 48;
  const padding = 18;
  const safeText = String(text ?? "").slice(0, 28);
  canvas.width = Math.max(128, safeText.length * 28 + padding * 2);
  canvas.height = 80;
  const context = canvas.getContext("2d");
  if (!context) {
    const fallback = new THREE.Sprite(new THREE.SpriteMaterial({ color, depthTest: false }));
    fallback.scale.set(Math.max(size, 0.1), Math.max(size * 0.28, 0.05), 1);
    fallback.renderOrder = 10;
    return fallback;
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(248, 250, 252, 0.92)";
  roundRect(context, 2, 8, canvas.width - 4, canvas.height - 16, 12);
  context.fill();
  context.strokeStyle = "rgba(82, 103, 125, 0.45)";
  context.stroke();
  context.fillStyle = color;
  context.font = `600 ${fontSize}px Inter, Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(safeText, canvas.width / 2, canvas.height / 2 + 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set((canvas.width / canvas.height) * size, size, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export const MAX_VISIBLE_MODEL_LABELS = 250;

export function labelSamplingStride(itemCount: number, maximum = MAX_VISIBLE_MODEL_LABELS): number {
  if (!Number.isFinite(itemCount) || itemCount <= maximum) return 1;
  return Math.max(1, Math.ceil(itemCount / Math.max(1, maximum)));
}

export function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) disposeMaterial(mesh.material);
    } else if ((child as THREE.Line).isLine) {
      const line = child as THREE.Line;
      if (line.geometry) line.geometry.dispose();
      if (line.material) disposeMaterial(line.material);
    } else if ((child as unknown as { isLine2?: boolean }).isLine2) {
      const line2 = child as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
      if (line2.geometry) line2.geometry.dispose();
      if (line2.material) disposeMaterial(line2.material);
    } else if ((child as THREE.Sprite).isSprite) {
      const sprite = child as THREE.Sprite;
      if (sprite.material) disposeMaterial(sprite.material);
    }
  });
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  const materials = Array.isArray(material) ? material : [material];
  for (const item of materials) {
    if (!item) continue;
    const maybeMap = item as THREE.Material & { map?: THREE.Texture };
    if (maybeMap.map) maybeMap.map.dispose();
    item.dispose();
  }
}

export function replaceGroupContents(group: THREE.Group, children: THREE.Object3D[]): void {
  for (const child of [...group.children]) {
    group.remove(child);
    disposeObject(child);
  }
  const objects = children.filter(isObject3D);
  if (objects.length > 0) {
    group.add(...objects);
  }
}

function isObject3D(value: unknown): value is THREE.Object3D {
  return Boolean(value && typeof value === "object" && (value as THREE.Object3D).isObject3D);
}

export function computeModelBox(
  project: ProjectModel,
  result: AnalysisResult | null,
  deformationScale: number,
  loadCaseId: string,
  selectedEigenMode: number,
  selectedResponseSpectrumResult: ResponseSpectrumSelection = "SRSS",
  swap: SpacerAxisSwap = "off",
  override?: Map<string, { x: number; y: number; z: number }> | null,
  displayPolicy: ViewerDisplayCoordinatePolicy = "general",
): THREE.Box3 {
  const box = new THREE.Box3();
  const nodeMap = createNodeMap(project, swap, override, displayPolicy);
  for (const position of nodeMap.values()) box.expandByPoint(position);
  const displacements = createDisplacementMap(
    result,
    loadCaseId,
    selectedEigenMode,
    selectedResponseSpectrumResult,
    swap,
    displayPolicy,
  );
  if (displacements.size > 0 && Number.isFinite(deformationScale)) {
    for (const [nodeId, base] of nodeMap) {
      const displacement = displacements.get(nodeId);
      if (displacement) {
        box.expandByPoint(base.clone().addScaledVector(displacement, deformationScale));
      }
    }
  }
  if (box.isEmpty()) {
    box.expandByPoint(new THREE.Vector3(-1, -1, -1));
    box.expandByPoint(new THREE.Vector3(1, 1, 1));
  }
  return box;
}

export function fitCameraToBox(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  box: THREE.Box3,
  direction = new THREE.Vector3(1, 0.8, 1),
): void {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() * 0.5, 1);
  const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov * 0.5));
  const viewDirection = direction.clone().normalize();
  camera.position.copy(center).addScaledVector(viewDirection, distance * 1.18);
  camera.near = Math.max(distance / 1000, 0.01);
  camera.far = Math.max(distance * 100, 1000);
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.update();
}

export function createDisplacementMap(
  result: AnalysisResult | null,
  loadCaseId: string,
  selectedEigenMode = 1,
  selectedResponseSpectrumResult: ResponseSpectrumSelection = "SRSS",
  swap: SpacerAxisSwap = "off",
  displayPolicy: ViewerDisplayCoordinatePolicy = "general",
): Map<string, THREE.Vector3> {
  const map = new Map<string, THREE.Vector3>();
  if (!result || result.errors.length > 0) return map;
  const recordSample = (nodeId: string, ux: number, uy: number, uz: number) => {
    if (!isFiniteNumber(ux) || !isFiniteNumber(uy) || !isFiniteNumber(uz)) return;
    const transformed = applyViewerDisplayTransform(ux, uy, uz, swap, displayPolicy);
    map.set(nodeId, new THREE.Vector3(transformed.x, transformed.y, transformed.z));
  };
  const responseSpectrumDisplacements = getResponseSpectrumDisplacements(result, selectedResponseSpectrumResult);
  if (responseSpectrumDisplacements.length > 0) {
    for (const item of responseSpectrumDisplacements) recordSample(item.nodeId, item.ux, item.uy, item.uz);
    return map;
  }
  const eigenMode = result.eigenResult?.modes.find((mode) => mode.modeNo === selectedEigenMode);
  if (eigenMode) {
    for (const item of eigenMode.shape) recordSample(item.nodeId, item.ux, item.uy, item.uz);
    return map;
  }
  for (const item of result.displacements) {
    if (item.loadCaseId !== loadCaseId) continue;
    recordSample(item.nodeId, item.ux, item.uy, item.uz);
  }
  return map;
}

export function magnitude(values: number[]): number {
  const total = values.reduce((sum, value) => (isFiniteNumber(value) ? sum + value * value : sum), 0);
  return Math.sqrt(total);
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}
