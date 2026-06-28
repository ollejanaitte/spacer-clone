import DxfParser from "dxf-parser";
import { describe, expect, it } from "vitest";
import { createDefaultLinerDraft, updateLinerDraftSettings } from "../adapters/linerUiAdapter";
import { buildLinerProfileDxf } from "./linerProfileDxf";
import { dxfHeaderVariableValue } from "./makerDxfSpike";

describe("buildLinerProfileDxf", () => {
  it("exports ground and design profile layers in meters", () => {
    const draft = updateLinerDraftSettings(createDefaultLinerDraft(), { z: 12 });
    const dxf = buildLinerProfileDxf(draft);
    const parsed = new DxfParser().parseSync(dxf);

    expect(dxfHeaderVariableValue(dxf, "$INSUNITS")).toBe("6");
    expect(dxfHeaderVariableValue(dxf, "$MEASUREMENT")).toBe("1");
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    expect(parsed.entities.some((entity) => entity.layer === "PROFILE_GROUND")).toBe(true);
    expect(parsed.entities.some((entity) => entity.layer === "PROFILE_DESIGN")).toBe(true);
  });
});
