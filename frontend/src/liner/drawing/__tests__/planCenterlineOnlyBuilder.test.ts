import { describe, expect, it } from "vitest";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import { formatStationPlanNotation, isMajorStationDistance } from "../../core/station/stationFormat";
import {
  buildDrawingDocument,
  createDrawingSettingsFromDraft,
  createPlanDrawingBuilder,
} from "..";
import type { DrawingCircle, DrawingPrimitive, DrawingText } from "../model/primitives";

function collectPrimitives(document: ReturnType<typeof buildDrawingDocument>): DrawingPrimitive[] {
  return document.sheets.flatMap((sheet) =>
    sheet.viewports.flatMap((viewport) => viewport.layers.flatMap((layer) => layer.primitives)),
  );
}

describe("formatStationPlanNotation", () => {
  it("formats major and minor stations with No. notation", () => {
    expect(formatStationPlanNotation(0)).toBe("No.0");
    expect(formatStationPlanNotation(20)).toBe("No.0+20");
    expect(formatStationPlanNotation(40)).toBe("No.0+40");
    expect(formatStationPlanNotation(100)).toBe("No.1");
    expect(formatStationPlanNotation(140)).toBe("No.1+40");
    expect(formatStationPlanNotation(200)).toBe("No.2");
    expect(formatStationPlanNotation(260)).toBe("No.2+60");
    expect(isMajorStationDistance(100)).toBe(true);
    expect(isMajorStationDistance(20)).toBe(false);
  });
});

describe("plan Type B centerline-only builder", () => {
  it("uses station-0 local origin, centerline-only geometry, and station circles", () => {
    const draft = createDefaultLinerDraft();
    draft.offsets = [-5, 0, 5];
    const result = buildIntermediateResult(draft);
    const settings = {
      ...createDrawingSettingsFromDraft(result, draft.drawingSettings),
      planType: "centerline_only" as const,
    };
    const output = createPlanDrawingBuilder().build({ result, settings });
    const document = buildDrawingDocument(output.sheet, settings, output.diagnostics);
    const primitives = collectPrimitives(document);
    const texts = primitives.filter((primitive): primitive is DrawingText => primitive.kind === "text");
    const circles = primitives.filter(
      (primitive): primitive is DrawingCircle => primitive.kind === "circle",
    );

    expect(circles.length).toBeGreaterThan(0);
    const majorCircles = circles.filter((circle) => circle.radius >= 1.1);
    const minorCircles = circles.filter((circle) => circle.radius < 1.1);
    expect(majorCircles.length).toBeGreaterThan(0);
    expect(minorCircles.length).toBeGreaterThan(0);

    // Station 0 is translated to local origin: at least one sample/circle near (0,0).
    const nearOrigin = circles.some(
      (circle) => Math.hypot(circle.center.x, circle.center.y) < 1e-3,
    );
    expect(nearOrigin).toBe(true);

    expect(texts.some((text) => text.value === "No.0")).toBe(true);
    expect(texts.some((text) => /^No\.\d+(\+\d+)?$/.test(text.value))).toBe(true);

    const polylineIds = primitives
      .filter((primitive) => primitive.kind === "polyline")
      .map((primitive) => primitive.id);
    expect(polylineIds.some((id) => id.includes("centerline"))).toBe(true);
    expect(polylineIds.every((id) => !id.includes("offset") && !id.includes("edge"))).toBe(true);

    // Type A still available.
    const typeA = createPlanDrawingBuilder().build({
      result,
      settings: { ...settings, planType: "road_shape" },
    });
    expect(typeA.sheet.viewports.length).toBeGreaterThan(0);
  });
});
