// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
import { buildApolloVisualizationModelOrThrow } from "../apollo/visualization";
import { createSceneGroups, rebuildModelScene } from "./SceneBuilder";
import { disposeObject } from "./threeUtils";
import type { ThreeViewportProps } from "./types";

describe("SceneBuilder Apollo visualization path", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders node, member, support, and label groups from ApolloVisualizationModel", () => {
    const groups = createSceneGroups();
    const model = buildApolloVisualizationModelOrThrow({ project: createDefaultProject() });

    rebuildModelScene(groups, {
      ...baseProps(),
      apolloVisualizationModel: model,
    });

    expect(groups.nodes.children.length).toBeGreaterThan(0);
    expect(groups.members.children.length).toBeGreaterThan(0);
    expect(groups.supports.children.length).toBeGreaterThan(0);
    expect(groups.labels.children.length).toBeGreaterThan(0);
    expect(groups.loads.children).toHaveLength(0);
    expect(groups.resultDiagrams.children).toHaveLength(0);
    expect(groups.deformed.children).toHaveLength(0);

    disposeObject(groups.root);
  });
});

function baseProps(): ThreeViewportProps {
  return {
    project: createDefaultProject(),
    apolloVisualizationModel: null,
    result: null,
    selectedSection: "nodes",
    selection: null,
    activeLoadCase: "",
    onSelectionChange: () => undefined,
    onActiveLoadCaseChange: () => undefined,
    visibility: {
      nodes: true,
      members: true,
      supports: true,
      loads: true,
      labels: true,
      nodeLabels: true,
      memberLabels: true,
      grid: true,
      axes: true,
      deformedShape: false,
      reactions: false,
      axialForce: false,
      momentMy: false,
      momentMz: false,
    },
    scales: {
      loadScale: 1,
      deformationScale: 1,
      modeScale: 1,
      resultScale: 1,
      nodeSize: 0.075,
      labelSize: 0.26,
      supportSize: 1,
      loadArrowSize: 1,
      memberLineWidth: 1,
    },
    selectedLoadCaseId: "",
    fitRequest: 0,
    cameraRequest: null,
    onInitializationError: () => undefined,
  };
}
