import * as THREE from "three";
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

export function createNodeMap(project: ProjectModel): Map<string, THREE.Vector3> {
  const nodes = new Map<string, THREE.Vector3>();
  for (const node of project.nodes) {
    const position = nodeToVector(node);
    if (position) nodes.set(node.id, position);
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
): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
  const line = new THREE.Line(geometry, material);
  if (name) line.name = name;
  return line;
}

export function createLabelSprite(
  text: string,
  color = "#243447",
  size = 1,
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const fontSize = 48;
  const padding = 18;
  const safeText = text.slice(0, 28);
  canvas.width = Math.max(128, safeText.length * 28 + padding * 2);
  canvas.height = 80;
  if (context) {
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
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set((canvas.width / canvas.height) * size, size, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    const line = child as THREE.Line;
    const sprite = child as THREE.Sprite;
    const geometry = mesh.geometry ?? line.geometry;
    if (geometry && "dispose" in geometry) geometry.dispose();
    const material = mesh.material ?? line.material ?? sprite.material;
    const materials = Array.isArray(material) ? material : material ? [material] : [];
    for (const item of materials) {
      const maybeMap = item as THREE.Material & { map?: THREE.Texture };
      maybeMap.map?.dispose();
      item.dispose();
    }
  });
}

export function replaceGroupContents(group: THREE.Group, children: THREE.Object3D[]): void {
  for (const child of [...group.children]) {
    group.remove(child);
    disposeObject(child);
  }
  group.add(...children);
}

export function computeModelBox(
  project: ProjectModel,
  result: AnalysisResult | null,
  deformationScale: number,
  loadCaseId: string,
): THREE.Box3 {
  const box = new THREE.Box3();
  const nodeMap = createNodeMap(project);
  for (const position of nodeMap.values()) box.expandByPoint(position);
  const displacements = createDisplacementMap(result, loadCaseId);
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
): Map<string, THREE.Vector3> {
  const map = new Map<string, THREE.Vector3>();
  if (!result || result.errors.length > 0) return map;
  for (const item of result.displacements) {
    if (item.loadCaseId !== loadCaseId) continue;
    if (!isFiniteNumber(item.ux) || !isFiniteNumber(item.uy) || !isFiniteNumber(item.uz)) continue;
    map.set(item.nodeId, new THREE.Vector3(item.ux, item.uy, item.uz));
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
