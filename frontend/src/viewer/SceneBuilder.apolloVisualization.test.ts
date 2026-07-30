// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
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
    expect(groups.apolloGirders.children.length).toBeGreaterThan(0);
    expect(groups.apolloDeck.children.length).toBeGreaterThan(0);
    expect(groups.labels.children.length).toBeGreaterThan(0);
    expect(groups.loads.children).toHaveLength(0);
    expect(groups.resultDiagrams.children).toHaveLength(0);
    expect(groups.deformed.children).toHaveLength(0);

    disposeObject(groups.root);
  });

  it("marks Apollo support objects selectable for viewer picking", () => {
    const groups = createSceneGroups();
    const model = buildApolloVisualizationModelOrThrow({ project: createDefaultProject() });

    rebuildModelScene(groups, {
      ...baseProps(),
      apolloVisualizationModel: model,
      selection: { type: "support", id: "SUP-1" },
      apolloSelectionKeys: ["support:SUP-1"],
    });

    const support = groups.supports.children.find((child) => child.userData?.id === "SUP-1");
    expect(support?.userData?.selectable).toBe(true);
    const supportCone = (support?.children[0] ?? null) as THREE.Mesh | null;
    expect(supportCone?.userData?.selectable).toBe(true);
    expect(supportCone?.userData?.id).toBe("SUP-1");

    disposeObject(groups.root);
  });

  it("applies validation highlight color to Apollo node objects", () => {
    const groups = createSceneGroups();
    const model = buildApolloVisualizationModelOrThrow({ project: createDefaultProject() });

    rebuildModelScene(groups, {
      ...baseProps(),
      apolloVisualizationModel: model,
      apolloValidationHighlight: { targetKey: "node:G0", severity: "error" },
    });

    const nodeMesh = groups.nodes.children.find((child) => child.userData?.id === "G0") as THREE.Mesh | undefined;
    expect(nodeMesh).toBeDefined();
    expect((nodeMesh?.material as THREE.MeshStandardMaterial).color.getHexString()).toBe("d14343");

    disposeObject(groups.root);
  });

  it("renders selectable bearing solids for support-derived picks", () => {
    const groups = createSceneGroups();
    const model = buildApolloVisualizationModelOrThrow({ project: createDefaultProject() });

    rebuildModelScene(groups, {
      ...baseProps(),
      apolloVisualizationModel: model,
      selection: { type: "support", id: "SUP-1" },
      apolloSelectionKeys: ["support:SUP-1"],
    });

    const bearing = groups.apolloBearings.children.find((child) => child.userData?.id === "SUP-1");
    expect(bearing?.userData?.selectable).toBe(true);
    expect((bearing as THREE.Mesh | undefined)?.material).toBeDefined();

    disposeObject(groups.root);
  });

  it("supports line-only and solid-only Apollo visibility modes", () => {
    const groups = createSceneGroups();
    const model = buildApolloVisualizationModelOrThrow({ project: createDefaultProject() });

    rebuildModelScene(groups, {
      ...baseProps(),
      apolloVisualizationModel: model,
      visibility: {
        ...baseProps().visibility,
        apolloLineModel: false,
        apolloSolidModel: true,
      },
    });

    expect(groups.nodes.children).toHaveLength(0);
    expect(groups.members.children).toHaveLength(0);
    expect(groups.apolloGirders.children.length).toBeGreaterThan(0);

    rebuildModelScene(groups, {
      ...baseProps(),
      apolloVisualizationModel: model,
      visibility: {
        ...baseProps().visibility,
        apolloLineModel: true,
        apolloSolidModel: false,
      },
    });

    expect(groups.nodes.children.length).toBeGreaterThan(0);
    expect(groups.apolloGirders.children).toHaveLength(0);

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
      apolloLineModel: true,
      apolloSolidModel: true,
      apolloGirders: true,
      apolloCrossBeams: true,
      apolloBracings: true,
      apolloDeck: true,
      apolloBearings: true,
      apolloMarkers: true,
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
