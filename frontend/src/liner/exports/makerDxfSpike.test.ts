import DxfParser from "dxf-parser";
import { describe, expect, it } from "vitest";
import { buildMakerDxfSpike, dxfHeaderVariableValue } from "./makerDxfSpike";

describe("Maker.js DXF spike", () => {
  it("exports meter-based DXF with INSUNITS=6", () => {
    const dxf = buildMakerDxfSpike();

    expect(dxfHeaderVariableValue(dxf, "$INSUNITS")).toBe("6");
    expect(dxfHeaderVariableValue(dxf, "$MEASUREMENT")).toBe("1");
  });

  it("round-trips through dxf-parser", () => {
    const parsed = new DxfParser().parseSync(buildMakerDxfSpike());

    expect(parsed).not.toBeNull();
    if (!parsed) return;
    expect(parsed.entities.length).toBeGreaterThan(0);
    expect(parsed.entities.some((entity) => entity.layer === "PLAN_CENTERLINE")).toBe(true);
  });
});
