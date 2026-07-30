import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  buildApolloVisualizationModel,
  buildApolloVisualizationModelOrThrow,
  convertLengthMetersToMillimeters,
  DEFAULT_APOLLO_BRIDGE_GEOMETRY_DEFAULTS,
} from "../visualization";
import { hydrateApolloPhase1Unit2FromPersistence } from "../unit2Draft";
import type { ProjectModel } from "../../types";
import { createApollo200mContinuousBridgeSample } from "../sampleProjects";
import { computeApolloVisualizationBox } from "../../viewer/threeUtils";

function withProjectDraft(
  project: ProjectModel,
  updater: (draft: NonNullable<ProjectModel["apolloPhase1Unit2"]>) => NonNullable<ProjectModel["apolloPhase1Unit2"]>,
): ProjectModel {
  const hydrated = hydrateApolloPhase1Unit2FromPersistence(project);
  if (!hydrated.ok) {
    throw new Error(hydrated.diagnostics.join(" "));
  }
  return {
    ...hydrated.project,
    apolloPhase1Unit2: updater(hydrated.project.apolloPhase1Unit2!),
  };
}

describe("Apollo visualization builder", () => {
  it("returns an empty-model warning for a project without nodes", () => {
    const project: ProjectModel = {
      ...createDefaultProject(),
      nodes: [],
      members: [],
      supports: [],
    };
    const result = buildApolloVisualizationModel({ project });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.model.warnings.map((entry) => entry.code)).toContain("empty-model");
    expect(result.model.elements).toHaveLength(0);
  });

  it("builds node geometry for a single-node model", () => {
    const project: ProjectModel = {
      ...createDefaultProject(),
      nodes: [{ id: "N1", x: 1, y: 2, z: 3, label: "Node 1" }],
      members: [],
      supports: [],
    };
    const model = buildApolloVisualizationModelOrThrow({ project });
    expect(model.elements.map((entry) => entry.id)).toEqual(["node:N1", "node-label:N1"]);
    expect(model.commonGeometryParameters[0]?.coordinatesM.position).toEqual([1, 2, 3]);
  });

  it("builds a valid member and support mapping", () => {
    const project = createDefaultProject();
    const model = buildApolloVisualizationModelOrThrow({ project });
    expect(model.elements.some((entry) => entry.id === "member:MG0")).toBe(true);
    expect(model.elements.some((entry) => entry.id === "support:SUP-1")).toBe(true);
    expect(model.commonGeometryParameters.some((entry) => entry.id === "geom-member:MG0")).toBe(true);
    expect(model.solidGeometryParameters.some((entry) => entry.kind === "girder")).toBe(true);
    expect(model.solidGeometryParameters.some((entry) => entry.kind === "deck")).toBe(true);
  });

  it("returns a warning for a missing node reference", () => {
    const project = withProjectDraft(createDefaultProject(), (draft) => ({
      ...draft,
      members: [
        ...draft.members,
        {
          ...draft.members[0]!,
          id: "BROKEN-MEMBER",
          nodeI: "MISSING",
        },
      ],
    }));
    const result = buildApolloVisualizationModel({ project });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.model.warnings.map((entry) => entry.code)).toContain("missing-node-reference");
  });

  it("fails closed on duplicate ids", () => {
    const project = withProjectDraft(createDefaultProject(), (draft) => ({
      ...draft,
      nodes: [...draft.nodes, { ...draft.nodes[0]! }],
    }));
    const result = buildApolloVisualizationModel({ project });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.map((entry) => entry.code)).toContain("duplicate-id");
  });

  it("fails closed on non-finite coordinates", () => {
    const project = withProjectDraft(createDefaultProject(), (draft) => ({
      ...draft,
      nodes: [
        {
          ...draft.nodes[0]!,
          x: Number.NaN,
        },
      ],
    }));
    const result = buildApolloVisualizationModel({ project });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.map((entry) => entry.code)).toContain("non-finite-coordinate");
  });

  it("returns a warning for a zero-length member", () => {
    const project = withProjectDraft(createDefaultProject(), (draft) => ({
      ...draft,
      members: [
        ...draft.members,
        {
          ...draft.members[0]!,
          id: "ZERO-LENGTH",
          nodeI: draft.nodes[0]!.id,
          nodeJ: draft.nodes[0]!.id,
        },
      ],
    }));
    const result = buildApolloVisualizationModel({ project });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.model.warnings.map((entry) => entry.code)).toContain("zero-length-member");
  });

  it("sorts deterministically even when draft arrays are shuffled", () => {
    const base = buildApolloVisualizationModelOrThrow({ project: createDefaultProject() });
    const project = withProjectDraft(createDefaultProject(), (draft) => ({
      ...draft,
      nodes: [...draft.nodes].reverse(),
      members: [...draft.members].reverse(),
      supports: [...draft.supports].reverse(),
    }));
    const model = buildApolloVisualizationModelOrThrow({ project });
    expect(model.elements.map((entry) => entry.id)).toEqual(base.elements.map((entry) => entry.id));
  });

  it("returns the same output for the same input", () => {
    const project = createDefaultProject();
    const first = buildApolloVisualizationModelOrThrow({ project });
    const second = buildApolloVisualizationModelOrThrow({ project });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("converts meters to millimeters deterministically", () => {
    expect(convertLengthMetersToMillimeters(0)).toBe(0);
    expect(convertLengthMetersToMillimeters(2.345)).toBe(2345);
  });

  it("does not mutate the input project", () => {
    const project = createDefaultProject();
    const before = JSON.stringify(project);
    buildApolloVisualizationModelOrThrow({ project });
    expect(JSON.stringify(project)).toBe(before);
  });

  it("classifies warnings by severity", () => {
    const project = withProjectDraft(createDefaultProject(), (draft) => ({
      ...draft,
      members: [
        {
          ...draft.members[0]!,
          id: "BROKEN",
          nodeI: "MISSING",
          nodeJ: "MISSING",
        },
      ],
    }));
    const result = buildApolloVisualizationModel({ project });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const missingNode = result.model.warnings.find((entry) => entry.code === "missing-node-reference");
    expect(missingNode?.severity).toBe("warning");
  });

  it("accepts a custom PoC defaults provider without mutation", () => {
    const customDefaults = {
      ...DEFAULT_APOLLO_BRIDGE_GEOMETRY_DEFAULTS,
      girder: {
        ...DEFAULT_APOLLO_BRIDGE_GEOMETRY_DEFAULTS.girder,
        depthM: 3.25,
      },
    };
    const before = JSON.stringify(customDefaults);
    const model = buildApolloVisualizationModelOrThrow({
      project: createDefaultProject(),
      defaultsProvider: customDefaults,
    });
    expect(model.assumptions.some((entry) => entry.message.includes("3.25"))).toBe(true);
    expect(JSON.stringify(customDefaults)).toBe(before);
  });

  it("builds deterministic simple solid geometry for the Apollo bridge sample", () => {
    const model = buildApolloVisualizationModelOrThrow({
      project: createApollo200mContinuousBridgeSample(),
    });
    const girders = model.solidGeometryParameters.filter((entry) => entry.kind === "girder");
    const crossBeams = model.solidGeometryParameters.filter((entry) => entry.kind === "cross_beam");
    const bracings = model.solidGeometryParameters.filter((entry) => entry.kind === "bracing");
    const bearings = model.solidGeometryParameters.filter((entry) => entry.kind === "bearing");
    const markers = model.solidGeometryParameters.filter((entry) =>
      entry.kind === "pier_marker" || entry.kind === "abutment_marker");
    expect(girders).toHaveLength(20);
    expect(crossBeams).toHaveLength(15);
    expect(bracings).toHaveLength(10);
    expect(bearings).toHaveLength(24);
    expect(markers).toHaveLength(6);
    expect(model.solidGeometryParameters[0]?.id).toBe("solid:bearing:SUP-1:0");

    const firstGirder = girders[0]!;
    const firstDeck = model.solidGeometryParameters.find((entry) => entry.kind === "deck")!;
    const firstBearing = bearings[0]!;
    expect(firstGirder.dimensionsM.length).toBe(35);
    expect(firstGirder.dimensionsM.depth).toBe(2);
    expect(firstGirder.dimensionsM.offset).toBe(-4.5);
    expect(firstDeck.dimensionsM.width).toBe(10);
    expect(firstDeck.dimensionsM.thickness).toBe(0.24);
    expect(firstBearing.localFrame.origin).toEqual([0, -4.5, -0.06]);
  });

  it("assigns visibility groups and selection keys to simple solids", () => {
    const model = buildApolloVisualizationModelOrThrow({
      project: createApollo200mContinuousBridgeSample(),
    });
    const girder = model.solidGeometryParameters.find((entry) => entry.kind === "girder");
    const bearing = model.solidGeometryParameters.find((entry) => entry.kind === "bearing");
    const marker = model.solidGeometryParameters.find((entry) => entry.kind === "pier_marker");
    expect(girder?.visibilityGroup).toBe("girders");
    expect(girder?.selectionKey).toBe("member:M-01");
    expect(bearing?.visibilityGroup).toBe("bearings");
    expect(bearing?.selectionKey).toBe("support:SUP-1");
    expect(marker?.visibilityGroup).toBe("markers");
    expect(marker?.exportable).toBe(false);
  });

  it("falls back to a single girder and omits cross beams when transverse offsets are absent", () => {
    const model = buildApolloVisualizationModelOrThrow({
      project: createApollo200mContinuousBridgeSample(),
      defaultsProvider: {
        ...DEFAULT_APOLLO_BRIDGE_GEOMETRY_DEFAULTS,
        girder: {
          ...DEFAULT_APOLLO_BRIDGE_GEOMETRY_DEFAULTS.girder,
          transverseOffsetsM: [],
        },
      },
    });
    expect(model.warnings.map((entry) => entry.code)).toContain("missing-bridge-geometry");
    expect(model.solidGeometryParameters.filter((entry) => entry.kind === "girder")).toHaveLength(5);
    expect(model.solidGeometryParameters.filter((entry) => entry.kind === "cross_beam")).toHaveLength(0);
  });

  it("expands the Apollo visualization bounding box to include simple solids", () => {
    const model = buildApolloVisualizationModelOrThrow({
      project: createApollo200mContinuousBridgeSample(),
    });
    const box = computeApolloVisualizationBox(model);
    expect(box.min.x).toBeCloseTo(-0.3, 6);
    expect(box.max.x).toBeCloseTo(200.3, 6);
    expect(box.min.y).toBeCloseTo(-5, 6);
    expect(box.max.y).toBeCloseTo(5, 6);
    expect(box.min.z).toBeCloseTo(-2, 6);
    expect(box.max.z).toBeCloseTo(0.24, 6);
  });
});
