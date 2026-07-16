import DxfParser from "dxf-parser";
import { describe, expect, it } from "vitest";
import { createDefaultLinerDraft, updateLinerDraftSettings } from "../adapters/linerUiAdapter";
import { exportFormalDrawingDxf } from "../dxf";
import { buildProfileDrawingDocumentFromDraft } from "./formalDrawingFromDraft";
import { buildLinerProfileDxf } from "./linerProfileDxf";

describe("buildLinerProfileDxf", () => {
  it("exports formal profile layers via DrawingDocument", () => {
    const draft = updateLinerDraftSettings(createDefaultLinerDraft(), { z: 12 });
    const document = buildProfileDrawingDocumentFromDraft(draft);
    const dxf = buildLinerProfileDxf(draft);
    const parsed = new DxfParser().parseSync(dxf);

    expect(exportFormalDrawingDxf("profile-band", document).dxf).toBe(dxf);
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    expect(parsed.entities.some((entity) => entity.layer === "PROFILE_DESIGN")).toBe(true);
    expect(parsed.entities.some((entity) => entity.layer === "PROFILE_BAND")).toBe(true);
    expect(dxf).toContain("9\n$ACADVER\n1\nAC1021");
  });
});
