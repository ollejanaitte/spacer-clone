import { describe, expect, it } from "vitest";
import { renderPlanPreview } from "../plan-preview/PlanPreviewRenderer";
import { createSampleBridge } from "../__tests__/fixtures/sampleProject";

describe("PlanPreviewRenderer", () => {
  it("renders plan preview with adjacent sections", () => {
    const bridge = createSampleBridge();
    const second = {
      ...bridge.sections[0]!,
      id: "section-2",
      pdfPage: 24,
      stationingRef: {
        ...bridge.sections[0]!.stationingRef,
        stationValue: 269.7133,
      },
    };
    const sections = [bridge.sections[0]!, second];
    const result = renderPlanPreview(sections, bridge.sections[0]!.id, bridge.id);
    expect(result.points.length).toBeGreaterThan(0);
    expect(result.renderability.planPreview).not.toBe("blocked");
  });
});
