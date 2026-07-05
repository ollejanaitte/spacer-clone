import * as THREE from "three";
import type { ProjectModel, SectionKey } from "../../types";
import type { ViewerScales, ViewerSelection, ViewerVisibility } from "../types";
import type { SpacerAxisSwap, ViewerDisplayCoordinatePolicy } from "../coordinateTransform";
import { createLabelSprite, createLine, createNodeMap, getMemberEnds, labelSamplingStride } from "../threeUtils";
import type { ForceColorComponent, ForceColorValueType } from "../memberForceColorMap";
import { computeMemberForceColorValues, computeForceColorRange, memberForceColor, DEFAULT_FORCE_COLOR_MODE } from "../memberForceColorMap";
import type { AnalysisResult } from "../../types";
import type { ResponseSpectrumSelection } from "../../results/resultViewModel";
import { assignLabelPriority } from "../labelCollisionAvoidance";

export function renderMembers(
  project: ProjectModel,
  selectedSection: SectionKey,
  selection: ViewerSelection,
  scales: ViewerScales,
  spacerAxisSwap: SpacerAxisSwap = "off",
  nodePositionOverride?: Map<string, { x: number; y: number; z: number }> | null,
  forceColorMode?: {
    enabled: boolean;
    component: ForceColorComponent;
    valueType: ForceColorValueType;
    result: AnalysisResult | null;
    loadCaseId: string;
    selectedResponseSpectrumResult: ResponseSpectrumSelection;
  },
  displayPolicy: ViewerDisplayCoordinatePolicy = "general",
): THREE.Object3D[] {
  const nodeMap = createNodeMap(project, spacerAxisSwap, nodePositionOverride, displayPolicy);
  const objects: THREE.Object3D[] = [];

  let forceValues: Map<string, number> | null = null;
  let forceRange = { min: 0, max: 0 };
  if (forceColorMode?.enabled && forceColorMode.result) {
    forceValues = computeMemberForceColorValues(
      project,
      forceColorMode.result,
      forceColorMode.loadCaseId,
      forceColorMode.component,
      forceColorMode.valueType,
      forceColorMode.selectedResponseSpectrumResult,
    );
    forceRange = computeForceColorRange(forceValues);
  }

  for (const member of project.members) {
    const ends = getMemberEnds(member, nodeMap);
    if (!ends) continue;
    const selected = selection?.type === "member" && selection.id === member.id;
    const color = forceValues
      ? memberForceColor(forceValues.get(member.id) ?? 0, forceRange)
      : selected
        ? "#f2c94c"
        : selectedSection === "members"
          ? "#222222"
          : "#222222";
    const line = createLine([ends.start, ends.end], color, undefined, scales.memberLineWidth ?? 1);
    line.userData = { selectable: true, type: "member", id: member.id };
    objects.push(line);

    const length = ends.start.distanceTo(ends.end);
    const directionMarker = new THREE.ArrowHelper(
      ends.direction,
      ends.start.clone().lerp(ends.end, 0.68),
      Math.max(length * 0.16, 0.18),
      forceValues ? new THREE.Color(color).getHex() : selected ? 0xf2c94c : 0x222222,
      Math.max(length * 0.045, 0.06),
      Math.max(length * 0.028, 0.04),
    );
    directionMarker.userData = { selectable: true, type: "member", id: member.id };
    objects.push(directionMarker);
  }
  return objects;
}

export function renderMemberLabels(
  project: ProjectModel,
  scales: ViewerScales,
  spacerAxisSwap: SpacerAxisSwap = "off",
  nodePositionOverride?: Map<string, { x: number; y: number; z: number }> | null,
  selection?: ViewerSelection,
  displayPolicy: ViewerDisplayCoordinatePolicy = "general",
): THREE.Object3D[] {
  const nodeMap = createNodeMap(project, spacerAxisSwap, nodePositionOverride, displayPolicy);
  const objects: THREE.Object3D[] = [];
  const stride = labelSamplingStride(project.members.length);
  for (let index = 0; index < project.members.length; index += stride) {
    const member = project.members[index];
    const ends = getMemberEnds(member, nodeMap);
    if (!ends) continue;
    const selected = selection?.type === "member" && selection.id === member.id;
    const label = createLabelSprite(member.label || member.id, "#222222", scales.labelSize);
    label.position.copy(ends.mid).add(new THREE.Vector3(0, scales.nodeSize * 2.2 + 0.08, 0));
    assignLabelPriority(label, selected ? "selected" : "member", member.id, "member");
    objects.push(label);
  }
  return objects;
}
