// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createDefaultLinerDraft } from "../../../adapters/linerUiAdapter";
import { buildFormalDrawingWorkspaceDocuments } from "../../formalDrawingWorkspaceDocuments";
import {
  ensureFormalDrawingPrintStyles,
  printFormalDrawing,
  resolvePrintFormalDrawingDocument,
} from "../printFormalDrawing";
import { FORMAL_DRAWING_PRINT_STYLE_ID, formalDrawingPrintStyles } from "../formalDrawingPrintStyles";

describe("printFormalDrawing", () => {
  beforeEach(() => {
    document.getElementById(FORMAL_DRAWING_PRINT_STYLE_ID)?.remove();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("injects browser print stylesheet once", () => {
    ensureFormalDrawingPrintStyles();
    const style = document.getElementById(FORMAL_DRAWING_PRINT_STYLE_ID);
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain("@media print");
    expect(style?.textContent).toContain(".liner-formal-workspace-sidebar");

    ensureFormalDrawingPrintStyles();
    expect(document.querySelectorAll(`#${FORMAL_DRAWING_PRINT_STYLE_ID}`)).toHaveLength(1);
  });

  it("exports print CSS that hides workspace chrome", () => {
    expect(formalDrawingPrintStyles).toContain(".liner-formal-workspace-page > header");
    expect(formalDrawingPrintStyles).toContain(".liner-formal-workspace-canvas-transform");
  });

  it("calls window.print with the same DrawingDocument as preview", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const bundle = buildFormalDrawingWorkspaceDocuments(createDefaultLinerDraft(), "plan");
    const returned = printFormalDrawing({
      document: bundle.previewDocument,
      title: "平面線形図",
    });

    expect(returned).toBe(bundle.previewDocument);
    expect(resolvePrintFormalDrawingDocument(bundle.previewDocument)).toBe(bundle.previewDocument);
    expect(printSpy).toHaveBeenCalledTimes(1);
  });
});
