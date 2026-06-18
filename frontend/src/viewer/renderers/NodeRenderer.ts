import * as THREE from "three";
import type { ProjectModel, SectionKey } from "../../types";
import type { ViewerScales, ViewerSelection } from "../types";
import type { SpacerAxisSwap } from "../coordinateTransform";
import { createLabelSprite, createNodeMap } from "../threeUtils";

const nodeMaterial = new THREE.MeshStandardMaterial({ color: "#d45d50", roughness: 0.55 });
const selectedNodeMaterial = new THREE.MeshStandardMaterial({ color: "#f2c94c", roughness: 0.35 });

export function renderNodes(
  project: ProjectModel,
  selectedSection: SectionKey,
  selection: ViewerSelection,
  scales: ViewerScales,
  spacerAxisSwap: SpacerAxisSwap = "off",
  nodePositionOverride?: Map<string, { x: number; y: number; z: number }> | null,
): THREE.Object3D[] {
  const nodeMap = createNodeMap(project, spacerAxisSwap, nodePositionOverride);
  const radius = Math.max(scales.nodeSize, 0.02);
  const geometry = new THREE.SphereGeometry(radius, 18, 12);
  const objects: THREE.Object3D[] = [];

  for (const node of project.nodes) {
    const position = nodeMap.get(node.id);
    if (!position) continue;
    const selected = selection?.type === "node" && selection.id === node.id;
    const mesh = new THREE.Mesh(geometry.clone(), selected ? selectedNodeMaterial.clone() : nodeMaterial.clone());
    mesh.position.copy(position);
    mesh.userData = { selectable: true, type: "node", id: node.id };
    if (selectedSection === "nodes") {
      mesh.scale.setScalar(selected ? 1.65 : 1.25);
    }
    objects.push(mesh);
  }
  return objects;
}

export function renderNodeLabels(
  project: ProjectModel,
  scales: ViewerScales,
  spacerAxisSwap: SpacerAxisSwap = "off",
  nodePositionOverride?: Map<string, { x: number; y: number; z: number }> | null,
): THREE.Object3D[] {
  const nodeMap = createNodeMap(project, spacerAxisSwap, nodePositionOverride);
  const objects: THREE.Object3D[] = [];
  for (const node of project.nodes) {
    const position = nodeMap.get(node.id);
    if (!position) continue;
    const label = createLabelSprite(node.label || node.id, "#7b3440", scales.labelSize);
    label.position.copy(position).add(new THREE.Vector3(0, scales.nodeSize * 2.8 + 0.08, 0));
    objects.push(label);
  }
  return objects;
}
