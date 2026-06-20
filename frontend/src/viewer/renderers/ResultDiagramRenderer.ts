import * as THREE from "three";
import {
  buildResponseSpectrumViewModel,
  buildResultViewModel,
  type MemberSectionForceComponent,
  type ResponseSpectrumSelection,
} from "../../results/resultViewModel";
import type { AnalysisResult, ProjectModel } from "../../types";
import type { ViewerScales, ViewerVisibility } from "../types";
import { modelToViewerVector, type SpacerAxisSwap } from "../coordinateTransform";
import { createLine, createNodeMap, getMemberEnds, isFiniteNumber, magnitude } from "../threeUtils";
import { createLabelSprite } from "../threeUtils";
import { buildReactionLabel, formatForceLabel } from "../forceLabels";

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
  spacerAxisSwap: SpacerAxisSwap = "off",
): THREE.Object3D[] {
  const responseSpectrumViewModel = buildResponseSpectrumViewModel(result, selectedResponseSpectrumResult);
  const viewModel = responseSpectrumViewModel ?? buildResultViewModel(result, selectedLoadCaseId);
  if (!viewModel || !isFiniteNumber(scales.resultScale)) return [];

  const objects: THREE.Object3D[] = [];
  const nodeMap = createNodeMap(project, spacerAxisSwap);
  const span = computeSpan(nodeMap);
  const baseScale = Math.max(span * 0.18, 0.35) * scales.resultScale;

  if (visibility.reactions) {
    objects.push(
      ...renderReactions(viewModel.reactions.items, nodeMap, baseScale, spacerAxisSwap),
    );
  }
  if (visibility.reactionLabels) {
    objects.push(...renderReactionLabels(
      viewModel.reactions.items,
      nodeMap,
      scales,
      visibility,
    ));
  }
  if (visibility.axialForce) {
    objects.push(...renderMemberForce(project, nodeMap, viewModel.memberForces.items, "N", baseScale));
  }
  if (visibility.memberForceLabels || visibility.axialForceLabels) {
    objects.push(...renderMemberForceLabels(project, nodeMap, viewModel.memberForces.items, scales, visibility));
  }
  if (visibility.momentMy) {
    objects.push(...renderMemberForce(project, nodeMap, viewModel.memberForces.items, "My", baseScale));
  }
  if (visibility.momentMz) {
    objects.push(...renderMemberForce(project, nodeMap, viewModel.memberForces.items, "Mz", baseScale));
  }

  return objects;
}

function renderReactionLabels(
  reactions: Array<{ nodeId: string; fx: number; fy: number; fz: number; mx: number; my: number; mz: number }>,
  nodeMap: Map<string, THREE.Vector3>,
  scales: ViewerScales,
  visibility: ViewerVisibility,
): THREE.Object3D[] {
  const objects: THREE.Object3D[] = [];
  for (const reaction of reactions) {
    const position = nodeMap.get(reaction.nodeId);
    if (!position) continue;
    const text = buildReactionLabel(reaction, {
      fx: visibility.reactionLabelFx !== false,
      fy: visibility.reactionLabelFy !== false,
      fz: visibility.reactionLabelFz !== false,
      mx: Boolean(visibility.reactionLabelMx),
      my: Boolean(visibility.reactionLabelMy),
      mz: Boolean(visibility.reactionLabelMz),
    });
    if (!text) continue;
    const label = createLabelSprite(text, "#176b55", scales.labelSize);
    label.position.copy(position).add(new THREE.Vector3(0, scales.nodeSize * 5, 0));
    label.userData = { type: "reaction-label", nodeId: reaction.nodeId, text };
    objects.push(label);
  }
  return objects;
}

const memberForceLabelMap: Record<MemberSectionForceComponent, { label: string; flag: keyof ViewerVisibility; unit: "kN" | "kN·m" }> = {
  N: { label: "FX", flag: "memberForceLabelFx", unit: "kN" },
  Qy: { label: "FY", flag: "memberForceLabelFy", unit: "kN" },
  Qz: { label: "FZ", flag: "memberForceLabelFz", unit: "kN" },
  Mx: { label: "MX", flag: "memberForceLabelMx", unit: "kN·m" },
  My: { label: "MY", flag: "memberForceLabelMy", unit: "kN·m" },
  Mz: { label: "MZ", flag: "memberForceLabelMz", unit: "kN·m" },
};

function renderMemberForceLabels(
  project: ProjectModel,
  nodeMap: Map<string, THREE.Vector3>,
  forces: Array<{
    memberId: string;
    component: MemberSectionForceComponent;
    i: number;
    j: number;
  }>,
  scales: ViewerScales,
  visibility: ViewerVisibility,
): THREE.Object3D[] {
  const objects: THREE.Object3D[] = [];
  for (const force of forces) {
    const labelSpec = memberForceLabelMap[force.component];
    const enabled = force.component === "N" && visibility.axialForceLabels ? true : Boolean(visibility[labelSpec.flag]);
    if (!enabled) continue;
    const member = project.members.find((item) => item.id === force.memberId);
    if (!member) continue;
    const ends = getMemberEnds(member, nodeMap);
    if (!ends) continue;
    for (const [end, position, value] of [
      ["i", ends.start, force.i],
      ["j", ends.end, force.j],
    ] as const) {
      const text = `${force.memberId}-${end} ${formatForceLabel(labelSpec.label, value, labelSpec.unit)}`;
      const label = createLabelSprite(text, value >= 0 ? "#1d5f9a" : "#a43a3a", scales.labelSize);
      label.position.copy(position).add(new THREE.Vector3(0, scales.nodeSize * 3.5, 0));
      label.userData = {
        type: force.component === "N" ? "axial-force-label" : "member-force-label",
        memberId: force.memberId,
        end,
        component: force.component,
        value,
        text,
      };
      objects.push(label);
    }
  }
  return objects;
}

function renderReactions(
  reactions: Array<{ nodeId: string; fx: number; fy: number; fz: number }>,
  nodeMap: Map<string, THREE.Vector3>,
  baseScale: number,
  spacerAxisSwap: SpacerAxisSwap,
): THREE.Object3D[] {
  const forceMax = Math.max(...reactions.map((reaction) => magnitude([reaction.fx, reaction.fy, reaction.fz])), 1);
  const objects: THREE.Object3D[] = [];

  for (const reaction of reactions) {
    const position = nodeMap.get(reaction.nodeId);
    if (!position) continue;
    const vector = nonZeroVector(
      modelToViewerVector(
        { x: reaction.fx, y: reaction.fy, z: reaction.fz },
        spacerAxisSwap,
      ),
    );
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
  nodeMap: Map<string, THREE.Vector3>,
  forces: Array<{
    memberId: string;
    component: MemberSectionForceComponent;
    stations: Array<{ station: number; value: number }>;
  }>,
  component: MemberSectionForceComponent,
  baseScale: number,
): THREE.Object3D[] {
  const componentForces = forces.filter((force) => force.component === component);
  const maxAbs = Math.max(
    ...componentForces.flatMap((force) => force.stations.map((station) => Math.abs(station.value))),
    1,
  );
  const objects: THREE.Object3D[] = [];
  const isMomentComponent = component === "My" || component === "Mz";

  for (const force of componentForces) {
    const member = project.members.find((item) => item.id === force.memberId);
    if (!member) continue;
    const ends = getMemberEnds(member, nodeMap);
    if (!ends) continue;
    const stations = [...force.stations].sort((a, b) => a.station - b.station);
    if (stations.length === 0) continue;
    const normal = diagramNormal(ends.direction, component);
    const memberVector = new THREE.Vector3().subVectors(ends.end, ends.start);
    const diagramPoints = stations.map(({ station, value }) => {
      const basePoint = ends.start.clone().addScaledVector(memberVector, station);
      const diagramPoint = basePoint.clone().addScaledVector(normal, (value / maxAbs) * baseScale);
      return { basePoint, diagramPoint, value };
    });
    const color = colorFor(diagramPoints.reduce((sum, point) => sum + point.value, 0));

    if (isMomentComponent && diagramPoints.length >= 2) {
      const ribbonPoints: THREE.Vector3[] = [];
      for (const point of diagramPoints) {
        ribbonPoints.push(point.basePoint);
      }
      for (let i = diagramPoints.length - 1; i >= 0; i--) {
        ribbonPoints.push(diagramPoints[i].diagramPoint);
      }
      ribbonPoints.push(diagramPoints[0].basePoint);

      const ribbonGeometry = new THREE.BufferGeometry().setFromPoints(ribbonPoints);
      const ribbonColor = new THREE.Color(color);
      const ribbonMaterial = new THREE.MeshBasicMaterial({
        color: ribbonColor,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ribbonMesh = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
      ribbonMesh.userData = {
        type: "moment-ribbon",
        memberId: force.memberId,
        component,
      };
      objects.push(ribbonMesh);
    }

    objects.push(createLine(diagramPoints.map((point) => point.diagramPoint), color));
    for (const point of diagramPoints) {
      if (Math.abs(point.value) > 1e-12) {
        objects.push(createLine([point.basePoint, point.diagramPoint], color));
      }
    }
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

function colorFor(value: number): THREE.ColorRepresentation {
  if (Math.abs(value) <= 1e-12) return zeroColor;
  return value >= 0 ? positiveColor : negativeColor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
