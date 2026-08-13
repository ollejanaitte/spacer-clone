import { describe, expect, it } from "vitest";
import { createDefaultLinerDraft } from "../../../../liner/adapters/linerUiAdapter";
import {
  updateCrossSectionCrossSlope,
  updateStationDefinition,
} from "../roadEditorIntegration";

describe("roadEditorIntegration (Phase 7.4)", () => {
  it("updates stationDefinition immutably", () => {
    const draft = createDefaultLinerDraft();
    const next = updateStationDefinition(draft, {
      originDisplayedStation: 1.5,
      interval: 20,
      explicitStations: [0, 100],
      equations: [],
    });
    expect(draft.stationDefinition.originDisplayedStation).not.toBe(1.5);
    expect(next.stationDefinition.originDisplayedStation).toBe(1.5);
    expect(next.stationDefinition.interval).toBe(20);
  });

  it("updates crossSlope on a cross section template immutably", () => {
    const draft = createDefaultLinerDraft();
    const next = updateCrossSectionCrossSlope(draft, 0, {
      signConvention: "right_down_positive",
      valuePercent: -2.5,
    });
    expect(draft.crossSections?.[0]?.crossSlope?.valuePercent).not.toBe(-2.5);
    expect(next.crossSections?.[0]?.crossSlope?.valuePercent).toBe(-2.5);
    expect(next.crossSections?.[0]?.crossSlope?.signConvention).toBe("right_down_positive");
  });
});
