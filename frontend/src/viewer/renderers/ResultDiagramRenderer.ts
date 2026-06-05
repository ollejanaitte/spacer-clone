import * as THREE from "three";
import {
  buildResponseSpectrumViewModel,
  buildResultViewModel,
  type MemberSectionForceComponent,
  type ResponseSpectrumSelection,
} from "../../results/resultViewModel";
import type { AnalysisResult, ProjectModel } from "../../types";
import type { ViewerScales, ViewerVisibility } from "../types";
import { createLine, createNodeMap, getMemberEnds, isFiniteNumber, magnitude } from "../threeUtils";

const reactionColor = 0x1f8a70;
const positiveColor = 0x2f80ed;
const negativeColor = 0xd14b4b;
const zeroColor = 0x8a98a8;

export function renderResultDiagrams(
  project: ProjectModel,
  result: AnalysisResult | null,
  selectedLoadCaseId: string,
  selectedResponseSpectrumResult: ResponseSpectrumSelection,
  visibility: ViewerVisibility,
  scales: ViewerScales,
): THREE.Object3D[] {
  const responseSpectrumViewModel = buildResponseSpectrumViewModel(result, selectedResponseSpectrumResult);
  const viewModel = responseSpectrumViewModel ?? buildResultViewModel(result, selectedLoadCaseId);
  if (!viewModel || !isFiniteNumber(scales.resultScale)) return [];

  const objects: THREE.Object3D[] = [];
  const nodeMap = createNodeMap(project);
  const span = computeSpan(nodeMap);
  const baseScale = Math.max(span * 0.18, 0.35) * scales.resultScale;

  if (visibility.reactions) {
    objects.push(...renderReactions(viewModel.reactions.items, nodeMap, baseScale));
  }
  if (visibility.axialForce) {
    objects.push(...renderMemberForce(project, viewModel.memberForces.items, "N", baseScale));
  }
  if (visibility.momentMy) {
    objects.push(...renderMemberForce(project, viewModel.memberForces.items, "My", baseScale));
  }
  if (visibility.momentMz) {
    objects.push(...renderMemberForce(project, viewModel.memberForces.items, "Mz", baseScale));
  }

  return objects;
}

function renderReactions(
  reactions: Array<{ nodeId: string; fx: number; fy: number; fz: number }>,
  nodeMap: Map<string, THREE.Vector3>,
  baseScale: number,
): THREE.Object3D[] {
  const forceMax = Math.max(...reactions.map((reaction) => magnitude([reaction.fx, reaction.fy, reaction.fz])), 1);
  const objects: THREE.Object3D[] = [];

  for (const reaction of reactions) {
    const position = nodeMap.get(reaction.nodeId);
    if (!position) continue;
    const vector = vectorFrom(reaction.fx, reaction.fy, reaction.fz);
    if (!vector) continue;
    const length = clamp((vector.length() / forceMax) * baseScale, baseScale * 0.18, baseScale);
    const direction = vector.normalize();
    const arrow = new THREE.ArrowHelper(
      direction,
      position.clone(),
      length,
      reactionColor,
      length * 0.22,
      length * 0.11,
    );
    objects.push(arrow);
  }

  return objects;
}

function renderMemberForce(
  project: ProjectModel,
  forces: Array<{ memberId: string; component: MemberSectionForceComponent; i: number; j: number }>,
  component: MemberSectionForceComponent,
  baseScale: number,
): THREE.Object3D[] {
  const componentForces = forces.filter((force) => force.component === component);
  const maxAbs = Math.max(...componentForces.flatMap((force) => [Math.abs(force.i), Math.abs(force.j)]), 1);
  const nodeMap = createNodeMap(project);
  const objects: THREE.Object3D[] = [];

  for (const force of componentForces) {
    const member = project.members.find((item) => item.id === force.memberId);
    if (!member) continue;
    const ends = getMemberEnds(member, nodeMap);
    if (!ends) continue;
    const normal = diagramNormal(ends.direction, component);
    const iOffset = normal.clone().multiplyScalar((force.i / maxAbs) * baseScale);
    const jOffset = normal.clone().multiplyScalar((force.j / maxAbs) * baseScale);
    const iPoint = ends.start.clone().add(iOffset);
    const jPoint = ends.end.clone().add(jOffset);
    const color = colorFor(force.i + force.j);

    objects.push(createLine([ends.start, iPoint, jPoint, ends.end], color));
    objects.push(createLine([iPoint, jPoint], color));
    objects.push(createLine([ends.start, ends.end], zeroColor));
  }

  return objects;
}

function diagramNormal(direction: THREE.Vector3, component: MemberSectionForceComponent): THREE.Vector3 {
  const reference =
    component === "My"
      ? new THREE.Vector3(0, 0, 1)
      : component === "Mz"
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 1, 0);
  let normal = new THREE.Vector3().crossVectors(direction, reference).normalize();
  if (normal.lengthSq() <= 1e-12) {
    normal = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(1, 0, 0)).normalize();
  }
  if (normal.lengthSq() <= 1e-12) {
    normal = new THREE.Vector3(0, 0, 1);
  }
  return normal;
}

function vectorFrom(x: number, y: number, z: number): THREE.Vector3 | null {
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z)) return null;
  const vector = new THREE.Vector3(x, y, z);
  return vector.lengthSq() > 1e-16 ? vector : null;
}

function computeSpan(nodeMap: Map<string, THREE.Vector3>): number {
  const box = new THREE.Box3();
  for (const node of nodeMap.values()) box.expandByPoint(node);
  if (box.isEmpty()) return 1;
  return Math.max(box.getSize(new THREE.Vector3()).length(), 1);
}

function colorFor(value: number): THREE.ColorRepresentation {
  if (Math.abs(value) <= 1e-12) return zeroColor;
  return value >= 0 ? positiveColor : negativeColor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
