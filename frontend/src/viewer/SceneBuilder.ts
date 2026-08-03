import * as THREE from "three";
import type { ApolloVisualizationModel } from "../apollo/visualization";
import { renderDeformedShape } from "./renderers/DeformedShapeRenderer";
import { renderLoads } from "./renderers/LoadRenderer";
import { renderMemberLabels, renderMembers } from "./renderers/MemberRenderer";
import { renderNodeLabels, renderNodes } from "./renderers/NodeRenderer";
import { renderResultDiagrams } from "./renderers/ResultDiagramRenderer";
import { renderSupports } from "./renderers/SupportRenderer";
import {
  renderApolloVisualizationLabels,
  renderApolloVisualizationMembers,
  renderApolloVisualizationNodes,
  renderApolloVisualizationSolids,
  renderApolloVisualizationSupports,
} from "./renderers/ApolloVisualizationRenderer";
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
    apolloGirders: new THREE.Group(),
    apolloCrossBeams: new THREE.Group(),
    apolloBracings: new THREE.Group(),
    apolloDeck: new THREE.Group(),
    apolloBearings: new THREE.Group(),
    apolloMarkers: new THREE.Group(),
    apolloAppurtenances: new THREE.Group(),
    apolloHaunches: new THREE.Group(),
    loads: new THREE.Group(),
    resultDiagrams: new THREE.Group(),
    labels: new THREE.Group(),
    deformed: new THREE.Group(),
  };
  groups.nodes.name = "Nodes";
  groups.members.name = "Members";
  groups.supports.name = "Supports";
  groups.apolloGirders.name = "ApolloGirders";
  groups.apolloCrossBeams.name = "ApolloCrossBeams";
  groups.apolloBracings.name = "ApolloBracings";
  groups.apolloDeck.name = "ApolloDeck";
  groups.apolloBearings.name = "ApolloBearings";
  groups.apolloMarkers.name = "ApolloMarkers";
  groups.apolloAppurtenances.name = "ApolloAppurtenances";
  groups.apolloHaunches.name = "ApolloHaunches";
  groups.loads.name = "Loads";
  groups.resultDiagrams.name = "ResultDiagrams";
  groups.labels.name = "Labels";
  groups.deformed.name = "DeformedShape";
  root.add(
    groups.members,
    groups.nodes,
    groups.supports,
    groups.apolloGirders,
    groups.apolloCrossBeams,
    groups.apolloBracings,
    groups.apolloDeck,
    groups.apolloBearings,
    groups.apolloMarkers,
    groups.apolloAppurtenances,
    groups.apolloHaunches,
    groups.loads,
    groups.deformed,
    groups.resultDiagrams,
    groups.labels,
  );
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
    apolloVisualizationModel,
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
  if (apolloVisualizationModel) {
    rebuildApolloVisualizationScene(groups, apolloVisualizationModel, props);
    return;
  }
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

function rebuildApolloVisualizationScene(
  groups: SceneGroups,
  model: ApolloVisualizationModel,
  props: ThreeViewportProps,
): void {
  const apolloSelectionState = {
    primarySelection: props.selection,
    selectedKeys: new Set(props.apolloSelectionKeys ?? []),
    validationHighlight: props.apolloValidationHighlight ?? null,
  };
  const solidObjects = renderApolloVisualizationSolids(model, apolloSelectionState);
  replaceGroupContents(
    groups.nodes,
    props.visibility.nodes && props.visibility.apolloLineModel !== false
      ? renderApolloVisualizationNodes(model, props.selectedSection, apolloSelectionState, props.scales)
      : [],
  );
  replaceGroupContents(
    groups.members,
    props.visibility.members && props.visibility.apolloLineModel !== false
      ? renderApolloVisualizationMembers(model, props.selectedSection, apolloSelectionState, props.scales)
      : [],
  );
  replaceGroupContents(
    groups.supports,
    props.visibility.supports && props.visibility.apolloLineModel !== false
      ? renderApolloVisualizationSupports(model, props.selectedSection, apolloSelectionState, props.scales)
      : [],
  );
  replaceGroupContents(
    groups.apolloGirders,
    props.visibility.apolloSolidModel !== false && props.visibility.apolloGirders !== false ? solidObjects.girders : [],
  );
  replaceGroupContents(
    groups.apolloCrossBeams,
    props.visibility.apolloSolidModel !== false && props.visibility.apolloCrossBeams !== false ? solidObjects.crossBeams : [],
  );
  replaceGroupContents(
    groups.apolloBracings,
    props.visibility.apolloSolidModel !== false && props.visibility.apolloBracings !== false ? solidObjects.bracings : [],
  );
  replaceGroupContents(
    groups.apolloDeck,
    props.visibility.apolloSolidModel !== false && props.visibility.apolloDeck !== false ? solidObjects.deck : [],
  );
  replaceGroupContents(
    groups.apolloBearings,
    props.visibility.apolloSolidModel !== false && props.visibility.apolloBearings !== false ? solidObjects.bearings : [],
  );
  replaceGroupContents(
    groups.apolloMarkers,
    props.visibility.apolloSolidModel !== false && props.visibility.apolloMarkers !== false ? solidObjects.markers : [],
  );
  replaceGroupContents(
    groups.apolloAppurtenances,
    props.visibility.apolloSolidModel !== false && props.visibility.apolloAppurtenances !== false
      ? solidObjects.appurtenances
      : [],
  );
  replaceGroupContents(
    groups.apolloHaunches,
    props.visibility.apolloSolidModel !== false && props.visibility.apolloHaunches !== false
      ? solidObjects.haunches
      : [],
  );
  replaceGroupContents(groups.loads, []);
  replaceGroupContents(groups.deformed, []);
  replaceGroupContents(groups.resultDiagrams, []);
  replaceGroupContents(
    groups.labels,
    props.visibility.labels
      ? renderApolloVisualizationLabels(model, props.scales, apolloSelectionState)
      : [],
  );
}
