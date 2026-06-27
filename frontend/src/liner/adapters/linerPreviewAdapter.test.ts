import { describe, expect, it } from "vitest";
import { buildLinerPreviewFromDraft } from "./linerPreviewAdapter";
import { createDefaultLinerDraft, updateLinerDraftSettings } from "./linerUiAdapter";

describe("linerPreviewAdapter", () => {
  it("builds a read-only preview view model from the draft through the intermediate pipeline", () => {
    const result = buildLinerPreviewFromDraft(createDefaultLinerDraft());

    expect(result.intermediate.schemaVersion).toBe("0.2.0");
    expect(result.viewModel.axisPolyline.length).toBeGreaterThan(0);
    expect(result.viewModel.gridPoints.length).toBeGreaterThan(0);
    expect(result.viewModel.summary.totalLength).toBe(100);
    expect(result.viewModel.summary.gridPointCount).toBe(result.viewModel.gridPoints.length);
    expect(result.viewModel.summary.gridLineCount).toBe(result.intermediate.grid.lines.length);
  });

  it("maps diagnostics to UI display records", () => {
    const draft = updateLinerDraftSettings(createDefaultLinerDraft(), { sampleInterval: 0 });
    const result = buildLinerPreviewFromDraft(draft);

    expect(result.viewModel.diagnostics.length).toBeGreaterThan(0);
    expect(result.viewModel.diagnostics[0]).toMatchObject({
      level: "error",
      code: "LINER_GRID_SPACING_INVALID",
    });
  });
});
