import * as THREE from "three";
import type { MemberLoad, ProjectModel } from "../../types";
import type { ViewerScales } from "../types";
import {
  modelMemberLoadToViewer,
  modelNodalLoadToViewer,
  type SpacerAxisSwap,
} from "../coordinateTransform";
import { createLine, createNodeMap, getMemberEnds, isFiniteNumber, magnitude } from "../threeUtils";

const forceColor = 0xc94f4f;
const momentColor = 0x8a5fb5;
const memberLoadColor = 0xd98b2b;

export function renderLoads(
  project: ProjectModel,
  selectedLoadCaseId: string,
  scales: ViewerScales,
  spacerAxisSwap: SpacerAxisSwap = "off",
  nodePositionOverride?: Map<string, { x: number; y: number; z: number }> | null,
): THREE.Object3D[] {
  const nodeMap = createNodeMap(project, spacerAxisSwap, nodePositionOverride);
  const objects: THREE.Object3D[] = [];
  const forceMax = Math.max(
    ...project.nodalLoads
      .filter((load) => load.loadCaseId === selectedLoadCaseId)
      .map((load) => magnitude([load.fx, load.fy, load.fz])),
    1,
  );
  const momentMax = Math.max(
    ...project.nodalLoads
      .filter((load) => load.loadCaseId === selectedLoadCaseId)
      .map((load) => magnitude([load.mx, load.my, load.mz])),
    1,
  );
  const modelSpan = computeSpan(nodeMap);
  const baseLength = Math.max(modelSpan * 0.18, 0.35) * scales.loadScale;

  for (const load of project.nodalLoads) {
    if (load.loadCaseId !== selectedLoadCaseId) continue;
    const position = nodeMap.get(load.nodeId);
    if (!position) continue;
    const transformed = modelNodalLoadToViewer(load, spacerAxisSwap);
    const forceVector = nonZeroVector(transformed.force);
    if (forceVector) {
      const ratio = clamp(forceVector.length() / forceMax, 0.18, 1);
      objects.push(
        new THREE.ArrowHelper(
          forceVector.normalize(),
          position.clone().addScaledVector(forceVector, -baseLength * ratio),
          baseLength * ratio,
          forceColor,
          baseLength * 0.18,
          baseLength * 0.09,
        ),
      );
    }
    const momentVector = nonZeroVector(transformed.moment);
    if (momentVector) {
      const ratio = clamp(momentVector.length() / momentMax, 0.2, 1);
      objects.push(createMomentGlyph(position, momentVector.normalize(), baseLength * 0.32 * ratio));
    }
  }

  for (const load of project.memberLoads) {
    if (load.loadCaseId !== selectedLoadCaseId) continue;
    objects.push(
      ...renderMemberLoad(load, project, baseLength, spacerAxisSwap, nodePositionOverride),
    );
  }

  return objects;
}

function renderMemberLoad(
  load: MemberLoad,
  project: ProjectModel,
  baseLength: number,
  spacerAxisSwap: SpacerAxisSwap,
  nodePositionOverride?: Map<string, { x: number; y: number; z: number }> | null,
): THREE.Object3D[] {
  const nodeMap = createNodeMap(project, spacerAxisSwap, nodePositionOverride);
  const member = project.members.find((item) => item.id === load.memberId);
  if (!member) return [];
  const ends = getMemberEnds(member, nodeMap);
  if (!ends) return [];
  const direction = nonZeroVector(modelMemberLoadToViewer(load, spacerAxisSwap));
  if (!direction) return [];
  const objects: THREE.Object3D[] = [];
  const length = ends.start.distanceTo(ends.end);
  const arrowLength = clamp(direction.length() * baseLength * 0.2, baseLength * 0.22, baseLength * 0.7);
  const count = Math.max(2, Math.min(6, Math.round(length / Math.max(baseLength, 0.2)) + 1));
  for (let index = 0; index < count; index += 1) {
    const t = (index + 1) / (count + 1);
    const point = ends.start.clone().lerp(ends.end, t);
    const arrow = new THREE.ArrowHelper(
      direction.clone().normalize(),
      point.clone().addScaledVector(direction.clone().normalize(), -arrowLength),
      arrowLength,
      memberLoadColor,
      arrowLength * 0.22,
      arrowLength * 0.11,
    );
    objects.push(arrow);
  }
  return objects;
}

function createMomentGlyph(origin: THREE.Vector3, axis: THREE.Vector3, radius: number): THREE.Object3D {
  const group = new THREE.Group();
  group.position.copy(origin);
  const basisA = new THREE.Vector3(1, 0, 0);
  if (Math.abs(basisA.dot(axis)) > 0.85) basisA.set(0, 1, 0);
  const tangentA = new THREE.Vector3().crossVectors(axis, basisA).normalize();
  const tangentB = new THREE.Vector3().crossVectors(axis, tangentA).normalize();
  const points: THREE.Vector3[] = [];
  const arc = Math.PI * 1.45;
  for (let index = 0; index <= 28; index += 1) {
    const theta = (index / 28) * arc;
    points.push(
      tangentA.clone().multiplyScalar(Math.cos(theta) * radius).add(
        tangentB.clone().multiplyScalar(Math.sin(theta) * radius),
      ),
    );
  }
  group.add(createLine(points, momentColor));
  const end = points[points.length - 1];
  const previous = points[points.length - 3];
  const tangent = new THREE.Vector3().subVectors(end, previous).normalize();
  group.add(new THREE.ArrowHelper(tangent, end, radius * 0.42, momentColor, radius * 0.18, radius * 0.1));
  return group;
}

function nonZeroVector(vector: THREE.Vector3): THREE.Vector3 | null {
  if (![vector.x, vector.y, vector.z].every(isFiniteNumber)) return null;
  return vector.lengthSq() > 1e-16 ? vector : null;
}

function computeSpan(nodeMap: Map<string, THREE.Vector3>): number {
  const box = new THREE.Box3();
  for (const node of nodeMap.values()) box.expandByPoint(node);
  if (box.isEmpty()) return 1;
  return Math.max(box.getSize(new THREE.Vector3()).length(), 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
