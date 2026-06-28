import DxfParser from "dxf-parser";
import { describe, expect, it } from "vitest";
import { createDefaultLinerDraft, updateLinerDraftSettings } from "../adapters/linerUiAdapter";
import { buildLinerPlanDxf } from "./linerPlanDxf";
import { dxfHeaderVariableValue } from "./makerDxfSpike";

describe("buildLinerPlanDxf", () => {
  it("exports centerline and offset layers in meters", () => {
    const draft = updateLinerDraftSettings(createDefaultLinerDraft(), { offsets: [-2, 0, 2] });
    const dxf = buildLinerPlanDxf(draft);
    const parsed = new DxfParser().parseSync(dxf);

    expect(dxfHeaderVariableValue(dxf, "$INSUNITS")).toBe("6");
    expect(dxfHeaderVariableValue(dxf, "$MEASUREMENT")).toBe("1");
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    expect(parsed.entities.some((entity) => entity.layer === "PLAN_CENTERLINE")).toBe(true);
    expect(parsed.entities.some((entity) => entity.layer === "PLAN_OFFSET")).toBe(true);
  });
});
