import * as THREE from "three";
import type { ProjectModel, SectionKey } from "../../types";
import type { ViewerScales, ViewerSelection } from "../types";
import { createLabelSprite, createLine, createNodeMap, getMemberEnds } from "../threeUtils";

export function renderMembers(
  project: ProjectModel,
  selectedSection: SectionKey,
  selection: ViewerSelection,
): THREE.Object3D[] {
  const nodeMap = createNodeMap(project);
  const objects: THREE.Object3D[] = [];

  for (const member of project.members) {
    const ends = getMemberEnds(member, nodeMap);
    if (!ends) continue;
    const selected = selection?.type === "member" && selection.id === member.id;
    const color = selected ? "#f2c94c" : selectedSection === "members" ? "#1b6b93" : "#2f6f9f";
    const line = createLine([ends.start, ends.end], color);
    line.userData = { selectable: true, type: "member", id: member.id };
    objects.push(line);

    const length = ends.start.distanceTo(ends.end);
    const directionMarker = new THREE.ArrowHelper(
      ends.direction,
      ends.start.clone().lerp(ends.end, 0.68),
      Math.max(length * 0.16, 0.18),
      selected ? 0xf2c94c : 0x2f6f9f,
      Math.max(length * 0.045, 0.06),
      Math.max(length * 0.028, 0.04),
    );
    directionMarker.userData = { selectable: true, type: "member", id: member.id };
    objects.push(directionMarker);
  }
  return objects;
}

export function renderMemberLabels(project: ProjectModel, scales: ViewerScales): THREE.Object3D[] {
  const nodeMap = createNodeMap(project);
  const objects: THREE.Object3D[] = [];
  for (const member of project.members) {
    const ends = getMemberEnds(member, nodeMap);
    if (!ends) continue;
    const label = createLabelSprite(member.label || member.id, "#23527a", scales.labelSize);
    label.position.copy(ends.mid).add(new THREE.Vector3(0, scales.nodeSize * 2.2 + 0.08, 0));
    objects.push(label);
  }
  return objects;
}
