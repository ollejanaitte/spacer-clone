import { describe, expect, it } from "vitest";
import {
  clampedFontSizeMm,
  computePlanStationStaggerByPaperX,
  effectiveRenderedTextHeightMm,
  ellipsisToWidth,
  estimateTextWidthMm,
  inferDrawingTextRole,
  inferPlanTextScreenPriority,
  planBandValueThinStride,
  planStationLabelKeepSet,
  planStationLabelStaggerOffsetMm,
  planTextBoxFromAnchor,
  planTextBoxesOverlap,
  planViewportScreenScale,
  screenTextClampProfile,
  selectReadablePlanTexts,
  shouldThinPlanStationLabel,
} from "../rendering/screenTextLayout";

describe("screenTextLayout", () => {
  it("selects resolution-specific clamp profiles", () => {
    expect(screenTextClampProfile(1366)).toEqual({
      generalMinPx: 8,
      titleMinPx: 10,
      maxPx: 24,
    });
    expect(screenTextClampProfile(1920)).toEqual({
      generalMinPx: 10,
      titleMinPx: 12,
      maxPx: 28,
    });
  });

  it("infers text roles from primitive ids", () => {
    expect(inferDrawingTextRole("plan-north")).toBe("title");
    expect(inferDrawingTextRole("plan-curve-point-A1-start")).toBe("major");
    expect(inferDrawingTextRole("plan-station-text-S1")).toBe("station");
    expect(inferDrawingTextRole("plan-segment-A1")).toBe("curve");
    expect(inferDrawingTextRole("cross-section-pivot-1")).toBe("aux");
  });

  it("clamps font sizes at renderer boundary", () => {
    const profile = screenTextClampProfile(1366);
    expect(clampedFontSizeMm(7, 0.5, "station", profile)).toBeCloseTo(16, 5);
    expect(clampedFontSizeMm(7, 1, "station", profile)).toBeCloseTo(8, 5);
    expect(clampedFontSizeMm(10, 3, "title", profile)).toBeCloseTo(8, 5);
  });

  it("ellipsizes band values to available width", () => {
    expect(ellipsisToWidth("1234567890", 16, 2)).toBe("1234567…");
    expect(ellipsisToWidth("短", 20, 2)).toBe("短");
  });

  it("staggers dense plan station labels by rendered text width", () => {
    const stagger = computePlanStationStaggerByPaperX(
      [
        { stationId: "a", paperX: 10, value: "No.0+0.000" },
        { stationId: "b", paperX: 40, value: "No.0+10.000" },
      ],
      7,
    );
    expect(stagger.get("a")).toBe(0);
    expect(stagger.get("b")).toBeGreaterThan(0);
    expect(planStationLabelStaggerOffsetMm(0, 7)).toBe(0);
    expect(planStationLabelStaggerOffsetMm(2, 7)).toBeGreaterThan(0);
  });

  it("thins labels and band values when density exceeds thresholds", () => {
    expect(shouldThinPlanStationLabel(1, 16, 150)).toBe(true);
    expect(shouldThinPlanStationLabel(0, 5, 100)).toBe(false);
    expect(shouldThinPlanStationLabel(0, 16, 150)).toBe(false);
    expect(shouldThinPlanStationLabel(15, 16, 150)).toBe(false);
    expect(planBandValueThinStride(12, 7)).toBeGreaterThan(1);
    expect(planBandValueThinStride(estimateTextWidthMm("No.0+00.000", 7) + 6, 7, 8)).toBe(1);
  });

  it("keeps more station labels at 1920 than 1366 for the same paper width when zoomed out", () => {
    const narrow = planStationLabelKeepSet(16, 1366, 520, 594, 7, "No.0+00.000", 0.4);
    const wide = planStationLabelKeepSet(16, 1920, 520, 594, 7, "No.0+00.000", 0.4);
    expect(wide.size).toBeGreaterThan(narrow.size);
    expect(narrow.has(0)).toBe(true);
    expect(narrow.has(15)).toBe(true);
    expect(wide.has(0)).toBe(true);
    expect(wide.has(15)).toBe(true);
  });

  it("prioritizes BC/EC and endpoint station labels during screen filtering", () => {
    expect(inferPlanTextScreenPriority("plan-curve-point-A1-start")).toBeGreaterThan(
      inferPlanTextScreenPriority("plan-station-text-S2"),
    );
    const resolved = selectReadablePlanTexts(
      [
        { id: "plan-curve-point-A1-start", value: "BC", x: 100, y: 20, heightMm: 7 },
        { id: "plan-station-text-S2", value: "No.0+10.000", x: 101, y: 20, heightMm: 7 },
        { id: "plan-station-text-S1", value: "No.0+00.000", x: 20, y: 20, heightMm: 7 },
        { id: "plan-station-text-S16", value: "No.1+50.000", x: 500, y: 20, heightMm: 7 },
      ],
      { viewportWidthPx: 1366, paperWidthMm: 594, screenScale: 1 },
    );
    expect(resolved.get("plan-curve-point-A1-start")?.visible).toBe(true);
    expect(resolved.get("plan-station-text-S1")?.visible).toBe(true);
    expect(resolved.get("plan-station-text-S16")?.visible).toBe(true);
    expect(resolved.get("plan-station-text-S2")?.visible).toBe(false);
  });

  it("combines viewport width and zoom into screen scale", () => {
    expect(planViewportScreenScale(1366, 594, 0.5)).toBeCloseTo((1366 / 594) * 0.5, 5);
    const height = effectiveRenderedTextHeightMm(7, planViewportScreenScale(1366, 594), "station", 1366);
    expect(height).toBeCloseTo(7, 5);
  });

  it("detects text box overlap with margin", () => {
    const left = planTextBoxFromAnchor(10, 20, "BC", 7);
    const right = planTextBoxFromAnchor(12, 20, "EC", 7);
    expect(planTextBoxesOverlap(left, right)).toBe(true);
  });
});
