import * as THREE from "three";
import {
  buildResponseSpectrumViewModel,
  buildResultViewModel,
  type MemberSectionForceComponent,
  type ResponseSpectrumSelection,
} from "../../results/resultViewModel";
import type { AnalysisResult, ProjectModel } from "../../types";
import type { ViewerCoordinateMode } from "../coordinateTransform";
import { toViewerVector } from "../coordinateTransform";
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
  mode: ViewerCoordinateMode = "normal",
): THREE.Object3D[] {
  const responseSpectrumViewModel = buildResponseSpectrumViewModel(result, selectedResponseSpectrumResult);
  const viewModel = responseSpectrumViewModel ?? buildResultViewModel(result, selectedLoadCaseId);
  if (!viewModel || !isFiniteNumber(scales.resultScale)) return [];

  const objects: THREE.Object3D[] = [];
  const nodeMap = createNodeMap(project, mode);
  const span = computeSpan(nodeMap);
  const baseScale = Math.max(span * 0.18, 0.35) * scales.resultScale;

  if (visibility.reactions) {
    objects.push(...renderReactions(viewModel.reactions.items, nodeMap, baseScale, mode));
  }
  if (visibility.axialForce) {
    objects.push(...renderMemberForce(project, viewModel.memberForces.items, "N", baseScale, mode));
  }
  if (visibility.momentMy) {
    objects.push(...renderMemberForce(project, viewModel.memberForces.items, "My", baseScale, mode));
  }
  if (visibility.momentMz) {
    objects.push(...renderMemberForce(project, viewModel.memberForces.items, "Mz", baseScale, mode));
  }

  return objects;
}

function renderReactions(
  reactions: Array<{ nodeId: string; fx: number; fy: number; fz: number }>,
  nodeMap: Map<string, THREE.Vector3>,
  baseScale: number,
  mode: ViewerCoordinateMode,
): THREE.Object3D[] {
  const forceMax = Math.max(...reactions.map((reaction) => magnitude([reaction.fx, reaction.fy, reaction.fz])), 1);
  const objects: THREE.Object3D[] = [];

  for (const reaction of reactions) {
    const position = nodeMap.get(reaction.nodeId);
    if (!position) continue;
    const vector = vectorFromViewer(reaction.fx, reaction.fy, reaction.fz, mode);
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
  forces: Array<{
    memberId: string;
    component: MemberSectionForceComponent;
    stations: Array<{ station: number; value: number }>;
  }>,
  component: MemberSectionForceComponent,
  baseScale: number,
  mode: ViewerCoordinateMode,
): THREE.Object3D[] {
  const componentForces = forces.filter((force) => force.component === component);
  const maxAbs = Math.max(
    ...componentForces.flatMap((force) => force.stations.map((station) => Math.abs(station.value))),
    1,
  );
  const nodeMap = createNodeMap(project, mode);
  const objects: THREE.Object3D[] = [];

  for (const force of componentForces) {
    const member = project.members.find((item) => item.id === force.memberId);
    if (!member) continue;
    const ends = getMemberEnds(member, nodeMap);
    if (!ends) continue;
    const stations = [...force.stations].sort((a, b) => a.station - b.station);
    if (stations.length === 0) continue;
    // My/Mz は局所軸の成分なので、基準軸も viewer 座標系に揃える。
    const normal = diagramNormal(ends.direction, component, mode);
    const memberVector = new THREE.Vector3().subVectors(ends.end, ends.start);
    const diagramPoints = stations.map(({ station, value }) => {
      const basePoint = ends.start.clone().addScaledVector(memberVector, station);
      const diagramPoint = basePoint.clone().addScaledVector(normal, (value / maxAbs) * baseScale);
      return { basePoint, diagramPoint, value };
    });
    const color = colorFor(diagramPoints.reduce((sum, point) => sum + point.value, 0));

    objects.push(createLine(diagramPoints.map((point) => point.diagramPoint), color));
    for (const point of diagramPoints) {
      if (Math.abs(point.value) > 1e-12) {
        objects.push(createLine([point.basePoint, point.diagramPoint], color));
      }
    }
  }

  return objects;
}

function diagramNormal(
  direction: THREE.Vector3,
  component: MemberSectionForceComponent,
  mode: ViewerCoordinateMode,
): THREE.Vector3 {
  // 基準軸を model 空間で決めた後、viewer 座標系に揃える。
  const modelReference =
    component === "My"
      ? new THREE.Vector3(0, 0, 1)
      : component === "Mz"
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 1, 0);
  const v = toViewerVector({ x: 0, y: modelReference.y, z: modelReference.z }, mode);
  const reference = new THREE.Vector3(v.x, v.y, v.z);
  let normal = new THREE.Vector3().crossVectors(direction, reference).normalize();
  if (normal.lengthSq() <= 1e-12) {
    const fallback = toViewerVector({ x: 1, y: 0, z: 0 }, mode);
    normal = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(fallback.x, fallback.y, fallback.z)).normalize();
  }
  if (normal.lengthSq() <= 1e-12) {
    normal = new THREE.Vector3(0, 0, 1);
  }
  return normal;
}

function vectorFromViewer(
  x: number,
  y: number,
  z: number,
  mode: ViewerCoordinateMode,
): THREE.Vector3 | null {
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z)) return null;
  const v = toViewerVector({ x, y, z }, mode);
  const vector = new THREE.Vector3(v.x, v.y, v.z);
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
