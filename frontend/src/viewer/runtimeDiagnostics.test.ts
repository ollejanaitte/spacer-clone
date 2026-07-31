import { describe, expect, it } from "vitest";
import { createApollo200mContinuousBridgeSample } from "../apollo/sampleProjects";
import { buildApolloVisualizationModelOrThrow } from "../apollo/visualization";
import { defaultVisibility } from "./types";
import {
  classifyFallbackReason,
  createUnavailableWebGlDiagnostics,
  deriveApolloVisualizationCounts,
  describeSolidVisibilityAssessment,
  normalizeViewerGpuMode,
  UNAVAILABLE_LABEL,
} from "./runtimeDiagnostics";

describe("runtimeDiagnostics", () => {
  it("returns null counts for missing Apollo model", () => {
    expect(deriveApolloVisualizationCounts(null)).toBeNull();
    expect(deriveApolloVisualizationCounts(undefined)).toBeNull();
  });

  it("derives stable Apollo line and solid counts from the standard sample without mutating input", () => {
    const model = buildApolloVisualizationModelOrThrow({ project: createApollo200mContinuousBridgeSample() });
    const originalSolidCount = model.solidGeometryParameters.length;

    const counts = deriveApolloVisualizationCounts(model);

    expect(counts).not.toBeNull();
    expect(counts?.lineElementCount).toBe(model.elements.length);
    expect(counts?.solidCount).toBe(originalSolidCount);
    expect(counts?.girderCount).toBeGreaterThan(0);
    expect(counts?.crossBeamCount).toBeGreaterThan(0);
    expect(counts?.deckCount).toBeGreaterThan(0);
    expect(counts?.bearingCount).toBeGreaterThan(0);
    expect(counts?.warningCount).toBe(model.warnings.length);
    expect(model.solidGeometryParameters.length).toBe(originalSolidCount);
  });

  it("normalizes known and unknown GPU modes safely", () => {
    expect(normalizeViewerGpuMode("normal")).toBe("normal");
    expect(normalizeViewerGpuMode("compat-gpu-blocklist")).toBe("compat-gpu-blocklist");
    expect(normalizeViewerGpuMode("compat-angle-gl")).toBe("compat-angle-gl");
    expect(normalizeViewerGpuMode("legacy-desktop-gl")).toBe("legacy-desktop-gl");
    expect(normalizeViewerGpuMode("browser")).toBe("browser");
    expect(normalizeViewerGpuMode(undefined)).toBe("Unavailable");
    expect(normalizeViewerGpuMode(null)).toBe("Unavailable");
    expect(normalizeViewerGpuMode("mystery-mode")).toBe("Unavailable");
  });

  it("classifies fallback state and solid visibility consistently", () => {
    const model = buildApolloVisualizationModelOrThrow({ project: createApollo200mContinuousBridgeSample() });
    const counts = deriveApolloVisualizationCounts(model);
    expect(classifyFallbackReason("fallback2d", "none")).toBe("webgl-init-failed");
    expect(classifyFallbackReason("line-only", "none")).toBe("line-only-compatibility");
    expect(
      describeSolidVisibilityAssessment(counts, defaultVisibility, "fallback2d", "webgl-init-failed"),
    ).toContain("WebGL fallback");
    expect(
      describeSolidVisibilityAssessment(
        counts,
        { ...defaultVisibility, apolloSolidModel: false },
        "three",
        "none",
      ),
    ).toContain("visibility OFF");
  });

  it("creates unavailable WebGL diagnostics without throwing", () => {
    expect(createUnavailableWebGlDiagnostics()).toEqual({
      available: false,
      renderer: UNAVAILABLE_LABEL,
      vendor: UNAVAILABLE_LABEL,
      version: UNAVAILABLE_LABEL,
      shadingLanguageVersion: UNAVAILABLE_LABEL,
      unmaskedRenderer: UNAVAILABLE_LABEL,
      unmaskedVendor: UNAVAILABLE_LABEL,
    });
  });
});
