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
    expect(model.assumptions[0]?.message).toContain("3.25");
    expect(JSON.stringify(customDefaults)).toBe(before);
  });
});
