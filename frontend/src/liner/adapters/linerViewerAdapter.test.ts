import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  LINER_HEADLESS_FIXTURE_MATERIAL_IDS,
  LINER_HEADLESS_FIXTURE_SECTION_IDS,
} from "../headless";
import { isLinerDerivedProject, resolveInitialSpacerAxisSwap } from "../../viewer/coordinateTransform";
import { buildLinerViewerReviewFromDraft } from "./linerViewerAdapter";
import { createDefaultLinerDraft, updateLinerDraftSettings } from "./linerUiAdapter";

describe("linerViewerAdapter", () => {
  it("builds a Viewer3D-ready project through the headless path", () => {
    const result = buildLinerViewerReviewFromDraft(createDefaultLinerDraft(), createDefaultProject(), {
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(result.viewerProject).not.toBeNull();
    expect(result.summary.validationReady).toBe(true);
    expect(result.summary.nodeCount).toBeGreaterThan(0);
    expect(result.summary.memberCount).toBeGreaterThan(0);
    expect(result.summary.traceCount).toBe(result.mappingResult.linerTrace.length);
    expect(result.viewerProject?.liner?.linerModelId).toBe("liner-model-1");
    expect(result.viewerProject?.analysisSettings.solver).toBe("scipy_sparse");
    expect(result.viewerProject?.materials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: LINER_HEADLESS_FIXTURE_MATERIAL_IDS.deck }),
      ]),
    );
    expect(result.viewerProject?.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: LINER_HEADLESS_FIXTURE_SECTION_IDS.deck }),
      ]),
    );
  });

  it("blocks viewer project output for unsafe draft inputs before pipeline execution", () => {
    const draft = updateLinerDraftSettings(createDefaultLinerDraft(), { sampleInterval: 0 });
    const result = buildLinerViewerReviewFromDraft(draft, createDefaultProject());

    expect(result.viewerProject).toBeNull();
    expect(result.summary.validationReady).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      level: "error",
      code: "LINER_GRID_SPACING_INVALID",
    });
  });

  it("marks mapping review viewer projects as liner-derived for axis swap defaults", () => {
    const result = buildLinerViewerReviewFromDraft(createDefaultLinerDraft(), createDefaultProject());

    expect(result.viewerProject).not.toBeNull();
    expect(isLinerDerivedProject(result.viewerProject!)).toBe(true);
    expect(resolveInitialSpacerAxisSwap(true)).toBe("on");
  });
});
