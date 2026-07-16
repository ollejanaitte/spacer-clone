import { describe, expect, it } from "vitest";
import { createDefaultLinerDraft } from "../../../adapters/linerUiAdapter";
import { buildIntermediateResult } from "../../../core/pipeline/pipeline";
import {
  buildMultiPageDrawingDocument,
  createDrawingSettingsFromDraft,
  FORMAL_DRAWING_PAGES,
  selectDrawingDocumentSheet,
} from "../../index";

function buildFixtureDocument() {
  const draft = createDefaultLinerDraft();
  if (!draft.offsets || draft.offsets.length < 2) {
    draft.offsets = [-5.5, -3.25, 0, 3.25, 5.5];
    draft.crossSections = [
      {
        id: "CS-multi-page",
        name: "Verify",
        offsetLines: draft.offsets.map((offset, index) => ({
          id: `OL-${index}`,
          offset,
          elevation: index === 2 ? 0 : -0.02 * Math.abs(offset),
          role: "custom" as const,
        })),
      },
    ];
  }
  const result = buildIntermediateResult(draft);
  const settings = createDrawingSettingsFromDraft(result, draft.drawingSettings);
  return buildMultiPageDrawingDocument({ result, settings });
}

describe("multi-page drawing document", () => {
  it("builds plan, profile, and cross-section sheets from the same intermediate result", () => {
    const document = buildFixtureDocument();

    expect(document.sheets).toHaveLength(FORMAL_DRAWING_PAGES.length);
    expect(document.sheets.map((sheet) => sheet.id)).toEqual([
      "plan-sheet",
      "profile-sheet",
      "cross_section-sheet",
    ]);
  });

  it("assigns consistent page numbers, scales, and sheet decoration", () => {
    const document = buildFixtureDocument();

    document.sheets.forEach((sheet, index) => {
      expect(sheet.page).toEqual(
        expect.objectContaining({
          pageIndex: index,
          pageNumber: index + 1,
          pageCount: 3,
        }),
      );
      expect(sheet.page?.scaleLabel.length).toBeGreaterThan(0);
      expect(sheet.viewports.some((viewport) => viewport.id === "sheet-decoration-viewport")).toBe(true);

      const decoration = sheet.viewports.find((viewport) => viewport.id === "sheet-decoration-viewport");
      const textLayer = decoration?.layers.find((layer) => layer.id === "sheet-text-layer");
      const pageText = textLayer?.primitives.find((primitive) => primitive.kind === "text" && primitive.id === "sheet-page-number");
      expect(pageText && pageText.kind === "text" ? pageText.value : "").toBe(`${index + 1}/3`);
    });
  });

  it("selects a single active sheet without rebuilding geometry", () => {
    const document = buildFixtureDocument();
    const selected = selectDrawingDocumentSheet(document, "profile-sheet");

    expect(selected.sheets).toHaveLength(1);
    expect(selected.sheets[0]?.id).toBe("profile-sheet");
    expect(selected.stationAxes).toEqual(document.stationAxes);
    expect(selected.version).toBe(document.version);
  });

  it("is deterministic for the same fixture input", () => {
    const first = buildFixtureDocument();
    const second = buildFixtureDocument();

    expect(first).toEqual(second);
  });
});
