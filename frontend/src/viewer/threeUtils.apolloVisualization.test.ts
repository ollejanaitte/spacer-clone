// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createApollo200mContinuousBridgeSample } from "../apollo/sampleProjects";
import { buildApolloVisualizationModelOrThrow } from "../apollo/visualization";
import { APOLLO_MODEL_UP, computeApolloVisualizationBox, resolveCameraViewForPreset } from "./threeUtils";
import { defaultVisibility } from "./types";

describe("Apollo visualization camera helpers", () => {
  it("uses Z-up for Apollo side and front presets", () => {
    expect(resolveCameraViewForPreset("xz", true).up.toArray()).toEqual(APOLLO_MODEL_UP.toArray());
    expect(resolveCameraViewForPreset("yz", true).up.toArray()).toEqual(APOLLO_MODEL_UP.toArray());
  });

  it("uses plan labels with a top-down direction for Apollo plan view", () => {
    const view = resolveCameraViewForPreset("xy", true);
    expect(view.direction.toArray()).toEqual([0, 0, 1]);
    expect(view.up.toArray()).toEqual([0, 1, 0]);
  });
});

describe("Apollo visualization bbox", () => {
  it("excludes markers by default and when explicitly requested", () => {
    const model = buildApolloVisualizationModelOrThrow({ project: createApollo200mContinuousBridgeSample() });
    const withoutMarkers = computeApolloVisualizationBox(model, {
      includeMarkers: false,
      visibility: defaultVisibility,
    });
    const withMarkers = computeApolloVisualizationBox(model, {
      includeMarkers: true,
      visibility: { ...defaultVisibility, apolloMarkers: true },
    });

    expect(withoutMarkers.min.z).toBeGreaterThan(withMarkers.min.z);
  });

  it("respects Apollo solid visibility when fitting", () => {
    const model = buildApolloVisualizationModelOrThrow({ project: createApollo200mContinuousBridgeSample() });
    const lineOnly = computeApolloVisualizationBox(model, {
      includeMarkers: false,
      visibility: {
        ...defaultVisibility,
        apolloSolidModel: false,
      },
    });
    const lineAndSolid = computeApolloVisualizationBox(model, {
      includeMarkers: false,
      visibility: defaultVisibility,
    });

    expect(lineOnly.max.y).toBeLessThan(lineAndSolid.max.y);
  });
});
