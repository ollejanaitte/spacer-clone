import { describe, expect, it } from "vitest";
import {
  LINER_FEATURE_CAPABILITIES,
  LINER_I18N_KEY_GROUPS,
  LINER_UI_PANEL_IDS,
  LINER_UI_PANEL_ROUTE,
  LINER_UI_ROUTE_IDS,
  LINER_UI_STATE_BOUNDARIES,
  LINER_UI_WORKFLOW_STEP_ORDER,
  LINER_UI_WORKFLOW_STEPS,
  assertUniqueLinerI18nKeyGroups,
  getLinerFeatureCapability,
  getLinerUiStateBoundary,
  resolveLinerUiRouteId,
  resolveLinerUiRoutePath,
  toLinerUiDiagnosticDisplay,
} from "../uiPreparation";
import { createIssue, LINER_DIAGNOSTIC_CODES } from "../core/diagnostics";

describe("liner ui preparation", () => {
  it("keeps route ids and paths stable", () => {
    expect(LINER_UI_ROUTE_IDS).toEqual(["liner.list", "liner.setup", "liner.preview", "liner.mappingReview"]);
    expect(resolveLinerUiRoutePath("liner.list")).toBe("/pro/liner");
    expect(resolveLinerUiRoutePath("liner.setup")).toBe("/pro/liner/setup");
    expect(resolveLinerUiRoutePath("liner.preview")).toBe("/pro/liner/preview");
    expect(resolveLinerUiRoutePath("liner.mappingReview")).toBe("/pro/liner/mapping-review");
    expect(resolveLinerUiRouteId("/pro/liner")).toBe("liner.list");
    expect(resolveLinerUiRouteId("/pro/liner/setup")).toBe("liner.setup");
    expect(resolveLinerUiRouteId("/pro/liner/preview")).toBe("liner.preview");
    expect(resolveLinerUiRouteId("/pro/th/run")).toBeNull();
  });

  it("keeps workflow steps and panel ids stable", () => {
    expect(LINER_UI_WORKFLOW_STEPS).toEqual([
      "editInput",
      "computeIntermediate",
      "reviewDiagnostics",
      "generateFrameMapping",
      "attachProjectExtension",
      "runHeadlessValidation",
    ]);
    expect(LINER_UI_WORKFLOW_STEP_ORDER).toEqual(LINER_UI_WORKFLOW_STEPS);
    expect(LINER_UI_PANEL_IDS).toEqual([
      "alignmentInput",
      "stationTable",
      "gridPreview",
      "diagnostics",
      "mappingReview",
      "headlessGenerationSummary",
    ]);
    expect(LINER_UI_PANEL_ROUTE.gridPreview).toBe("liner.preview");
    expect(LINER_UI_PANEL_ROUTE.headlessGenerationSummary).toBe("liner.mappingReview");
  });

  it("exposes deterministic state boundary descriptors", () => {
    expect(LINER_UI_STATE_BOUNDARIES.map((entry) => entry.slice)).toEqual([
      "draft",
      "domain",
      "intermediate",
      "mapping",
      "projectExtension",
      "analysisResult",
      "stale",
    ]);
    expect(getLinerUiStateBoundary("intermediate")).toMatchObject({
      owner: "linerCore",
      persisted: false,
    });
    expect(getLinerUiStateBoundary("domain")).toMatchObject({
      owner: "project",
      persisted: true,
    });
  });

  it("maps feature capabilities to P1 entry points", () => {
    expect(LINER_FEATURE_CAPABILITIES.map((entry) => entry.id)).toEqual([
      "buildIntermediateResult",
      "mapToFrameModel",
      "attachLinerMappingToProject",
      "createHeadlessLinerFrameProject",
    ]);
    expect(getLinerFeatureCapability("mapToFrameModel")).toMatchObject({
      module: "mapper",
      workflowStep: "generateFrameMapping",
      phase: "P1-3",
    });
  });

  it("keeps i18n key groups unique", () => {
    assertUniqueLinerI18nKeyGroups();
    expect(new Set(LINER_I18N_KEY_GROUPS).size).toBe(LINER_I18N_KEY_GROUPS.length);
    expect(LINER_I18N_KEY_GROUPS).toContain("liner.list");
    expect(LINER_I18N_KEY_GROUPS).toContain("liner.errors");
  });

  it("projects diagnostics for UI display without duplicating validation fields", () => {
    const diagnostic = createIssue("error", LINER_DIAGNOSTIC_CODES.zeroLengthSegment, {
      messageKey: "liner.errors.geom_zero_length",
      entityPath: "alignments[0].segments[0].length",
    });
    expect(toLinerUiDiagnosticDisplay(diagnostic)).toEqual({
      level: "error",
      code: LINER_DIAGNOSTIC_CODES.zeroLengthSegment,
      messageKey: "liner.errors.geom_zero_length",
      entityPath: "alignments[0].segments[0].length",
      entityId: undefined,
      station: undefined,
      physicalDistance: undefined,
    });
  });
});
