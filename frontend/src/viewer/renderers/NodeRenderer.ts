import * as THREE from "three";
import type { ProjectModel, SectionKey } from "../../types";
import type { ViewerScales, ViewerSelection } from "../types";
import type { SpacerAxisSwap } from "../coordinateTransform";
import { createLabelSprite, createNodeMap, labelSamplingStride } from "../threeUtils";
import { assignLabelPriority } from "../labelCollisionAvoidance";

const nodeMaterial = new THREE.MeshStandardMaterial({ color: "#222222", roughness: 0.55 });
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
  selection?: ViewerSelection,
): THREE.Object3D[] {
  const nodeMap = createNodeMap(project, spacerAxisSwap, nodePositionOverride);
  const objects: THREE.Object3D[] = [];
  const stride = labelSamplingStride(project.nodes.length);
  for (let index = 0; index < project.nodes.length; index += stride) {
    const node = project.nodes[index];
    const position = nodeMap.get(node.id);
    if (!position) continue;
    const selected = selection?.type === "node" && selection.id === node.id;
    const label = createLabelSprite(node.label || node.id, "#222222", scales.labelSize);
    label.position.copy(position).add(new THREE.Vector3(0, scales.nodeSize * 2.8 + 0.08, 0));
    assignLabelPriority(label, selected ? "selected" : "node", node.id, "node");
    objects.push(label);
  }
  return objects;
}
