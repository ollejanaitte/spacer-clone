import * as THREE from "three";
import type {
  ApolloVisualizationElement,
  ApolloVisualizationLabelAnchorGeometry,
  ApolloVisualizationLineGeometry,
  ApolloVisualizationModel,
  ApolloVisualizationPointGeometry,
} from "../../apollo/visualization";
import type { SectionKey } from "../../types";
import { assignLabelPriority } from "../labelCollisionAvoidance";
import { createLabelSprite, createLine } from "../threeUtils";
import type { ViewerScales, ViewerSelection } from "../types";

const nodeMaterial = new THREE.MeshStandardMaterial({ color: "#222222", roughness: 0.55 });
const selectedNodeMaterial = new THREE.MeshStandardMaterial({ color: "#f2c94c", roughness: 0.35 });
const supportMaterial = new THREE.MeshStandardMaterial({ color: "#444444", roughness: 0.65 });

export function renderApolloVisualizationNodes(
  model: ApolloVisualizationModel,
  selectedSection: SectionKey,
  selection: ViewerSelection,
  scales: ViewerScales,
): THREE.Object3D[] {
  const radius = Math.max(scales.nodeSize, 0.02);
  const geometry = new THREE.SphereGeometry(radius, 18, 12);
  return model.elements
    .filter((entry): entry is ApolloVisualizationElement & { geometry: ApolloVisualizationPointGeometry } =>
      entry.elementKind === "node" && entry.geometry.type === "point")
    .map((entry) => {
      const selected = isSelectionMatch(selection, entry);
      const mesh = new THREE.Mesh(geometry.clone(), selected ? selectedNodeMaterial.clone() : nodeMaterial.clone());
      mesh.position.set(entry.geometry.position[0], entry.geometry.position[1], entry.geometry.position[2]);
      mesh.userData = {
        selectable: true,
        type: entry.sourceEntityKind,
        id: entry.sourceEntityId,
        apolloVisualizationElementId: entry.id,
      };
      if (selectedSection === "nodes") {
        mesh.scale.setScalar(selected ? 1.65 : 1.25);
      }
      return mesh;
    });
}

export function renderApolloVisualizationMembers(
  model: ApolloVisualizationModel,
  selectedSection: SectionKey,
  selection: ViewerSelection,
  scales: ViewerScales,
): THREE.Object3D[] {
  const objects: THREE.Object3D[] = [];
  for (const entry of model.elements) {
    if (entry.elementKind !== "member" || entry.geometry.type !== "line") continue;
    const geometry = entry.geometry as ApolloVisualizationLineGeometry;
    const start = new THREE.Vector3(geometry.start[0], geometry.start[1], geometry.start[2]);
    const end = new THREE.Vector3(geometry.end[0], geometry.end[1], geometry.end[2]);
    const delta = new THREE.Vector3().subVectors(end, start);
    const length = delta.length();
    if (!Number.isFinite(length) || length <= 1e-9) continue;
    const selected = isSelectionMatch(selection, entry);
    const color = selectedSection === "members" || selected ? "#f2c94c" : "#222222";
    const line = createLine([start, end], color, undefined, scales.memberLineWidth ?? 1);
    line.userData = {
      selectable: true,
      type: entry.sourceEntityKind,
      id: entry.sourceEntityId,
      apolloVisualizationElementId: entry.id,
    };
    objects.push(line);

    const directionMarker = new THREE.ArrowHelper(
      delta.clone().normalize(),
      start.clone().lerp(end, 0.68),
      Math.max(length * 0.16, 0.18),
      selected ? 0xf2c94c : 0x222222,
      Math.max(length * 0.045, 0.06),
      Math.max(length * 0.028, 0.04),
    );
    directionMarker.userData = {
      selectable: true,
      type: entry.sourceEntityKind,
      id: entry.sourceEntityId,
      apolloVisualizationElementId: `${entry.id}:arrow`,
    };
    objects.push(directionMarker);
  }
  return objects;
}

export function renderApolloVisualizationSupports(
  model: ApolloVisualizationModel,
  selectedSection: SectionKey,
  scales: ViewerScales,
): THREE.Object3D[] {
  const size = Math.max(scales.nodeSize * 2.2, 0.16) * (scales.supportSize ?? 1);
  return model.elements
    .filter((entry): entry is ApolloVisualizationElement & { geometry: ApolloVisualizationPointGeometry } =>
      entry.elementKind === "support" && entry.geometry.type === "point")
    .map((entry) => {
      const position = new THREE.Vector3(entry.geometry.position[0], entry.geometry.position[1], entry.geometry.position[2]);
      const group = new THREE.Group();
      group.position.copy(position).add(new THREE.Vector3(0, -size * 1.7, 0));
      const cone = new THREE.Mesh(new THREE.ConeGeometry(size * 0.9, size * 1.35, 4), supportMaterial.clone());
      cone.rotation.y = Math.PI / 4;
      group.add(cone);
      if (selectedSection === "supports") {
        group.scale.setScalar(1.18);
      }
      group.userData = {
        selectable: false,
        type: entry.sourceEntityKind,
        id: entry.sourceEntityId,
        apolloVisualizationElementId: entry.id,
      };
      return group;
    });
}

export function renderApolloVisualizationLabels(
  model: ApolloVisualizationModel,
  scales: ViewerScales,
  selection: ViewerSelection,
): THREE.Object3D[] {
  const objects: THREE.Object3D[] = [];
  for (const entry of model.elements) {
    if (!isLabelElement(entry) || entry.geometry.type !== "label-anchor") continue;
    const geometry = entry.geometry as ApolloVisualizationLabelAnchorGeometry;
    const selected = isSelectionMatch(selection, entry);
    const label = createLabelSprite(geometry.text, "#222222", scales.labelSize);
    label.position.set(geometry.position[0], geometry.position[1], geometry.position[2]);
    label.position.add(new THREE.Vector3(0, scales.nodeSize * 2.4 + 0.08, 0));
    assignLabelPriority(
      label,
      selected ? "selected" : entry.elementKind === "node-label" ? "node" : "member",
      entry.sourceEntityId,
      entry.sourceEntityKind === "member" ? "member" : "node",
    );
    label.userData = {
      id: entry.id,
      ownerId: entry.sourceEntityId,
      ownerType: entry.sourceEntityKind === "member" ? "member" : "node",
    };
    objects.push(label);
  }
  return objects;
}

function isSelectionMatch(selection: ViewerSelection, entry: ApolloVisualizationElement): boolean {
  return selection?.type === entry.sourceEntityKind && selection.id === entry.sourceEntityId;
}

function isLabelElement(entry: ApolloVisualizationElement): boolean {
  return entry.elementKind === "node-label" || entry.elementKind === "member-label";
}
