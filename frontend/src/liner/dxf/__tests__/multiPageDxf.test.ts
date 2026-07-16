import { describe, expect, it } from "vitest";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import {
  buildMultiPageDrawingDocument,
  createDrawingSettingsFromDraft,
} from "../../drawing";
import { exportFormalDrawingDxf } from "../export/exportFormalDrawingDxf";
import { mapDrawingDocumentToDxf } from "../mapper/mapDrawingDocumentToDxf";

function buildMultiPageFixture() {
  const draft = createDefaultLinerDraft();
  if (!draft.offsets || draft.offsets.length < 2) {
    draft.offsets = [-5.5, -3.25, 0, 3.25, 5.5];
    draft.crossSections = [
      {
        id: "CS-multi-page-dxf",
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

describe("multi-page DXF export", () => {
  it("maps all sheets and includes sheet frame/text layers", () => {
    const document = buildMultiPageFixture();
    const mapped = mapDrawingDocumentToDxf(document);

    expect(document.sheets).toHaveLength(3);
    expect(mapped.document.entities.length).toBeGreaterThan(0);
    expect(mapped.document.tables.layers.some((layer) => layer.name === "SHEET_FRAME")).toBe(true);
    expect(mapped.document.tables.layers.some((layer) => layer.name === "SHEET_TEXT")).toBe(true);
  });

  it("exports deterministic multi-sheet DXF with page labels", () => {
    const document = buildMultiPageFixture();
    const first = exportFormalDrawingDxf("plan", document, {
      timestamp: new Date("2026-07-16T12:00:00Z"),
      projectId: "multi-page",
    });
    const second = exportFormalDrawingDxf("plan", document, {
      timestamp: new Date("2026-07-16T12:00:00Z"),
      projectId: "multi-page",
    });

    expect(first.entityCount).toBeGreaterThan(0);
    expect(first.dxf).toContain("2\nSHEET_FRAME");
    expect(first.dxf).toContain("2\nSHEET_TEXT");
    expect(first.dxf).toContain("1/3");
    expect(first.dxf).toBe(second.dxf);
  });
});
