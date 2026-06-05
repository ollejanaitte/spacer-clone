import * as THREE from "three";
import { renderDeformedShape } from "./renderers/DeformedShapeRenderer";
import { renderLoads } from "./renderers/LoadRenderer";
import { renderMemberLabels, renderMembers } from "./renderers/MemberRenderer";
import { renderNodeLabels, renderNodes } from "./renderers/NodeRenderer";
import { renderResultDiagrams } from "./renderers/ResultDiagramRenderer";
import { renderSupports } from "./renderers/SupportRenderer";
import type { SceneGroups, ThreeViewportProps } from "./types";
import { replaceGroupContents } from "./threeUtils";

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

export function rebuildModelScene(groups: SceneGroups, props: ThreeViewportProps): void {
  const { project, result, selectedSection, visibility, scales, selection, selectedLoadCaseId, selectedEigenMode } = props;
  replaceGroupContents(
    groups.nodes,
    visibility.nodes ? renderNodes(project, selectedSection, selection, scales) : [],
  );
  replaceGroupContents(
    groups.members,
    visibility.members ? renderMembers(project, selectedSection, selection) : [],
  );
  replaceGroupContents(groups.supports, visibility.supports ? renderSupports(project, scales) : []);
  replaceGroupContents(
    groups.loads,
    visibility.loads ? renderLoads(project, selectedLoadCaseId, scales) : [],
  );
  replaceGroupContents(
    groups.deformed,
    visibility.deformedShape ? renderDeformedShape(project, result, selectedLoadCaseId, selectedEigenMode ?? 1, scales) : [],
  );
  replaceGroupContents(
    groups.resultDiagrams,
    renderResultDiagrams(project, result, selectedLoadCaseId, visibility, scales),
  );
  replaceGroupContents(
    groups.labels,
    visibility.labels
      ? [
          ...(visibility.nodeLabels ? renderNodeLabels(project, scales) : []),
          ...(visibility.memberLabels ? renderMemberLabels(project, scales) : []),
        ]
      : [],
  );
}
