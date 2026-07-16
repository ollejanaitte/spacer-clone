import DxfParser from "dxf-parser";
import { describe, expect, it } from "vitest";
import { createDefaultLinerDraft, updateLinerDraftSettings } from "../adapters/linerUiAdapter";
import { exportFormalDrawingDxf } from "../dxf";
import { buildPlanDrawingDocumentFromDraft } from "./formalDrawingFromDraft";
import { buildLinerPlanDxf } from "./linerPlanDxf";

describe("buildLinerPlanDxf", () => {
  it("exports formal plan layers via DrawingDocument", () => {
    const draft = updateLinerDraftSettings(createDefaultLinerDraft(), { offsets: [-2, 0, 2] });
    const document = buildPlanDrawingDocumentFromDraft(draft);
    const dxf = buildLinerPlanDxf(draft);
    const parsed = new DxfParser().parseSync(dxf);

    expect(exportFormalDrawingDxf("plan", document).dxf).toBe(dxf);
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    expect(parsed.entities.some((entity) => entity.layer === "PLAN_CENTER")).toBe(true);
    expect(parsed.entities.some((entity) => entity.layer === "PLAN_BAND")).toBe(true);
    expect(dxf).toContain("9\n$ACADVER\n1\nAC1021");
  });
});
