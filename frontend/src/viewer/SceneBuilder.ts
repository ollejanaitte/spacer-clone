import * as THREE from "three";
import { renderDeformedShape } from "./renderers/DeformedShapeRenderer";
import { renderLoads } from "./renderers/LoadRenderer";
import { renderMemberLabels, renderMembers } from "./renderers/MemberRenderer";
import { renderNodeLabels, renderNodes } from "./renderers/NodeRenderer";
import { renderResultDiagrams } from "./renderers/ResultDiagramRenderer";
import { renderSupports } from "./renderers/SupportRenderer";
import type { SceneGroups, ThreeViewportProps } from "./types";
import { replaceGroupContents } from "./threeUtils";
import type { ForceColorModeData } from "./memberForceColorMap";

export function createSceneGroups(): SceneGroups {
  const root = new THREE.Group();
  const groups: SceneGroups = {
    root,
    nodes: new THREE.Group(),
    members: new THREE.Group(),
    supports: new THREE.Group(),
    loads: new THREE.Group(),
    resultDiagrams: new THREE.Group(),
    labels: new THREE.Group(),
    deformed: new THREE.Group(),
  };
  groups.nodes.name = "Nodes";
  groups.members.name = "Members";
  groups.supports.name = "Supports";
  groups.loads.name = "Loads";
  groups.resultDiagrams.name = "ResultDiagrams";
  groups.labels.name = "Labels";
  groups.deformed.name = "DeformedShape";
  root.add(groups.members, groups.nodes, groups.supports, groups.loads, groups.deformed, groups.resultDiagrams, groups.labels);
  return groups;
}

/**
 * Rebuild the model scene from the current props.
 *
 * `nodePositionOverride` is an optional map of nodeId -> animated
 * position. The viewer supplies it to apply the per-frame animation
 * displacement on top of the original model coordinates. Renderers
 * pick it up through `createNodeMap` and never see the raw model
 * coordinates when an override is present, so the underlying
 * `project.nodes` is not mutated.
 */
export function rebuildModelScene(
  groups: SceneGroups,
  props: ThreeViewportProps,
  nodePositionOverride?: Map<string, { x: number; y: number; z: number }> | null,
  forceColorMode?: ForceColorModeData,
): void {
  const {
    project,
    result,
    selectedSection,
    visibility,
    scales,
    selection,
    selectedLoadCaseId,
    selectedEigenMode,
    selectedResponseSpectrumResult = "SRSS",
    spacerAxisSwap = "off",
    viewerDisplayPolicy = "general",
  } = props;
  replaceGroupContents(
    groups.nodes,
    visibility.nodes
      ? renderNodes(project, selectedSection, selection, scales, spacerAxisSwap, nodePositionOverride, viewerDisplayPolicy)
      : [],
  );
  replaceGroupContents(
    groups.members,
    visibility.members
      ? renderMembers(project, selectedSection, selection, scales, spacerAxisSwap, nodePositionOverride, {
          enabled: forceColorMode?.enabled ?? false,
          component: forceColorMode?.component ?? "N",
          valueType: forceColorMode?.valueType ?? "absMax",
          result,
          loadCaseId: selectedLoadCaseId,
          selectedResponseSpectrumResult,
        }, viewerDisplayPolicy)
      : [],
  );
  replaceGroupContents(
    groups.supports,
    visibility.supports ? renderSupports(project, scales, spacerAxisSwap, nodePositionOverride, viewerDisplayPolicy) : [],
  );
  replaceGroupContents(
    groups.loads,
    visibility.loads
      ? renderLoads(project, selectedLoadCaseId, scales, spacerAxisSwap, nodePositionOverride, viewerDisplayPolicy)
      : [],
  );
  replaceGroupContents(
    groups.deformed,
    visibility.deformedShape
      ? renderDeformedShape(
          project,
          result,
          selectedLoadCaseId,
          selectedEigenMode ?? 1,
          selectedResponseSpectrumResult,
          scales,
          spacerAxisSwap,
          viewerDisplayPolicy,
        )
      : [],
  );
  replaceGroupContents(
    groups.resultDiagrams,
    renderResultDiagrams(
      project,
      result,
      selectedLoadCaseId,
      selectedResponseSpectrumResult,
      visibility,
      scales,
      spacerAxisSwap,
      viewerDisplayPolicy,
    ),
  );
  replaceGroupContents(
    groups.labels,
    visibility.labels
      ? [
          ...(visibility.nodeLabels
            ? renderNodeLabels(project, scales, spacerAxisSwap, nodePositionOverride, selection, viewerDisplayPolicy)
            : []),
          ...(visibility.memberLabels
            ? renderMemberLabels(project, scales, spacerAxisSwap, nodePositionOverride, selection, viewerDisplayPolicy)
            : []),
        ]
      : [],
  );
}
