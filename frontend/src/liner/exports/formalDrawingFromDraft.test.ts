import { describe, expect, it } from "vitest";
import { createDefaultLinerDraft } from "../adapters/linerUiAdapter";
import { exportFormalDrawingDxf } from "../dxf";
import {
  buildPlanDrawingDocumentFromDraft,
  buildProfileDrawingDocumentFromDraft,
} from "./formalDrawingFromDraft";
import { buildLinerPlanDxf } from "./linerPlanDxf";
import { buildLinerProfileDxf } from "./linerProfileDxf";

describe("formalDrawingFromDraft", () => {
  it("uses the same DrawingDocument for plan preview and DXF export", () => {
    const draft = createDefaultLinerDraft();
    const document = buildPlanDrawingDocumentFromDraft(draft);
    const facadeDxf = buildLinerPlanDxf(draft);
    const formalDxf = exportFormalDrawingDxf("plan", document).dxf;

    expect(facadeDxf).toBe(formalDxf);
    expect(document.sheets[0]?.viewports.length).toBeGreaterThan(0);
  });

  it("uses the same DrawingDocument for profile preview and DXF export", () => {
    const draft = createDefaultLinerDraft();
    const document = buildProfileDrawingDocumentFromDraft(draft);
    const facadeDxf = buildLinerProfileDxf(draft);
    const formalDxf = exportFormalDrawingDxf("profile-band", document).dxf;

    expect(facadeDxf).toBe(formalDxf);
    expect(document.sheets[0]?.viewports.length).toBeGreaterThan(0);
  });
});
