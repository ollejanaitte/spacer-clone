import * as THREE from "three";
import type { AnalysisResult, ProjectModel } from "../../types";
import type { ViewerScales } from "../types";
import {
  createDisplacementMap,
  createLine,
  createNodeMap,
  getMemberEnds,
  isFiniteNumber,
} from "../threeUtils";

export function renderDeformedShape(
  project: ProjectModel,
  result: AnalysisResult | null,
  selectedLoadCaseId: string,
  selectedEigenMode: number,
  scales: ViewerScales,
): THREE.Object3D[] {
  if (!result || result.errors.length > 0 || !isFiniteNumber(scales.deformationScale)) return [];
  const nodeMap = createNodeMap(project);
  const displacementMap = createDisplacementMap(result, selectedLoadCaseId, selectedEigenMode);
  if (displacementMap.size === 0) return [];

  const objects: THREE.Object3D[] = [];
  const material = new THREE.MeshStandardMaterial({
    color: "#e3a51a",
    emissive: "#2a1c00",
    roughness: 0.45,
  });
  const nodeGeometry = new THREE.SphereGeometry(Math.max(scales.nodeSize * 0.75, 0.025), 14, 10);

  for (const [nodeId, base] of nodeMap) {
    const displacement = displacementMap.get(nodeId);
    if (!displacement) continue;
    const node = new THREE.Mesh(nodeGeometry.clone(), material.clone());
    node.position.copy(base).addScaledVector(displacement, scales.deformationScale);
    objects.push(node);
  }

  for (const member of project.members) {
    const ends = getMemberEnds(member, nodeMap);
    if (!ends) continue;
    const startDisp = displacementMap.get(member.nodeI);
    const endDisp = displacementMap.get(member.nodeJ);
    if (!startDisp && !endDisp) continue;
    const start = ends.start.clone();
    const end = ends.end.clone();
    if (startDisp) start.addScaledVector(startDisp, scales.deformationScale);
    if (endDisp) end.addScaledVector(endDisp, scales.deformationScale);
    objects.push(createLine([start, end], "#e3a51a"));
  }

  return objects;
}
