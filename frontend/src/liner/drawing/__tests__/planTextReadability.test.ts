import { describe, expect, it } from "vitest";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import { addLinerArcElement, createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { createPlanDrawingBuilder, createDrawingSettingsFromDraft } from "../builders/formalBuilders";
import { FORMAL_DRAWING_LAYOUT } from "../builders/formalPaperLayout";
import type { DrawingViewport } from "../model/document";
import type { DrawingText } from "../model/primitives";
import { transformPoint2 } from "../transforms/affineTransform2";
import {
  clampedFontSizeMm,
  effectiveRenderedTextHeightMm,
  inferDrawingTextRole,
  planTextBoxFromAnchor,
  planTextBoxesOverlap,
  planViewportScreenScale,
  screenTextClampProfile,
  selectReadablePlanTexts,
} from "../rendering/screenTextLayout";
import { ja } from "../../../i18n/ja";

function collectPlanPaperTexts(viewport: DrawingViewport): DrawingText[] {
  const paperTexts: DrawingText[] = [];
  const modelTexts: DrawingText[] = [];
  for (const layer of viewport.layers) {
    for (const primitive of layer.primitives) {
      if (primitive.kind !== "text") {
        continue;
      }
      if (layer.coordinateSpace === "paper") {
        paperTexts.push(primitive);
      } else {
        modelTexts.push(primitive);
      }
    }
  }
  return [
    ...paperTexts,
    ...modelTexts.map((text) => ({
      ...text,
      position: transformPoint2(viewport.transform, text.position),
    })),
  ];
}

function collectPlanTextCandidates(viewport: DrawingViewport) {
  const candidates: Array<{
    id: string;
    value: string;
    x: number;
    y: number;
    heightMm: number;
    alignment?: "center" | "left" | "right";
  }> = [];
  for (const layer of viewport.layers) {
    const transform = layer.coordinateSpace === "paper" ? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } : viewport.transform;
    for (const primitive of layer.primitives) {
      if (primitive.kind !== "text") {
        continue;
      }
      const position = transformPoint2(transform, primitive.position);
      candidates.push({
        id: primitive.id,
        value: primitive.value,
        x: position.x,
        y: position.y,
        heightMm: primitive.heightMm,
        alignment: primitive.alignment,
      });
    }
  }
  return candidates;
}

function screenTextBoxesForPlan(
  viewport: DrawingViewport,
  viewportWidthPx: number,
  paperWidthMm: number,
  zoomScale = 1,
) {
  const screenScale = planViewportScreenScale(viewportWidthPx, paperWidthMm, zoomScale);
  const profile = screenTextClampProfile(viewportWidthPx);
  const layout = selectReadablePlanTexts(collectPlanTextCandidates(viewport), {
    viewportWidthPx,
    paperWidthMm,
    screenScale: zoomScale,
  });
  const boxes = [];
  for (const candidate of collectPlanTextCandidates(viewport)) {
    const resolved = layout.get(candidate.id);
    if (resolved && !resolved.visible) {
      continue;
    }
    const role = inferDrawingTextRole(candidate.id);
    const effectiveHeight = effectiveRenderedTextHeightMm(
      candidate.heightMm,
      screenScale,
      role,
      viewportWidthPx,
    );
    boxes.push(
      planTextBoxFromAnchor(
        candidate.x,
        candidate.y,
        resolved?.value ?? candidate.value,
        effectiveHeight,
        candidate.alignment ?? "left",
      ),
    );
  }
  return boxes;
}

function buildStraightPlusArcPlan() {
  const result = buildIntermediateResult(addLinerArcElement(createDefaultLinerDraft()));
  const settings = createDrawingSettingsFromDraft(result, undefined);
  const output = createPlanDrawingBuilder().build({ result, settings });
  return {
    result,
    planViewport: output.sheet.viewports[0]!,
    bandViewport: output.sheet.viewports[1]!,
  };
}

describe("plan text readability", () => {
  it("keeps arc centerline samples and places BC/EC in paper annotation space", () => {
    const { result, planViewport } = buildStraightPlusArcPlan();
    const centerline = planViewport.layers
      .flatMap((layer) => layer.primitives)
      .find((primitive) => primitive.kind === "polyline" && primitive.id === "plan-centerline");

    expect(result.horizontal.sampledPoints.length).toBeGreaterThanOrEqual(16);
    expect(centerline?.kind).toBe("polyline");
    if (centerline?.kind === "polyline") {
      expect(centerline.points.length).toBe(result.horizontal.sampledPoints.length);
    }

    const texts = collectPlanPaperTexts(planViewport);
    expect(texts.some((text) => text.value === ja.liner.formalDrawing.planCurvePoints.bc)).toBe(true);
    expect(texts.some((text) => text.value === ja.liner.formalDrawing.planCurvePoints.ec)).toBe(true);
    const geometryTexts = planViewport.layers
      .filter((layer) => layer.coordinateSpace !== "paper")
      .flatMap((layer) => layer.primitives)
      .filter((primitive) => primitive.kind === "text");
    expect(geometryTexts.some((text) => text.id.startsWith("plan-curve-point-"))).toBe(false);
  });

  it("avoids overlapping plan annotation boxes for straight-plus-arc fixture", () => {
    const { planViewport } = buildStraightPlusArcPlan();
    const boxes = screenTextBoxesForPlan(planViewport, 1920, 594);
    for (let leftIndex = 0; leftIndex < boxes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex += 1) {
        expect(planTextBoxesOverlap(boxes[leftIndex]!, boxes[rightIndex]!)).toBe(false);
      }
    }
  });

  it("keeps readable non-overlapping plan and band text at 1366 while preserving BC/EC and endpoints", () => {
    const { result, planViewport, bandViewport } = buildStraightPlusArcPlan();
    const paperWidthMm = 594;
    const planBoxes = screenTextBoxesForPlan(planViewport, 1366, paperWidthMm);
    const bandBoxes = screenTextBoxesForPlan(bandViewport, 1366, paperWidthMm);

    for (const boxes of [planBoxes, bandBoxes]) {
      for (let leftIndex = 0; leftIndex < boxes.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex += 1) {
          expect(planTextBoxesOverlap(boxes[leftIndex]!, boxes[rightIndex]!)).toBe(false);
        }
      }
    }

    const planLayout = selectReadablePlanTexts(collectPlanTextCandidates(planViewport), {
      viewportWidthPx: 1366,
      paperWidthMm,
    });
    const visiblePlanIds = [...planLayout.entries()]
      .filter(([, layout]) => layout.visible)
      .map(([id]) => id);
    expect(visiblePlanIds.some((id) => id.startsWith("plan-curve-point-"))).toBe(true);
    expect(visiblePlanIds.some((id) => id.startsWith("plan-segment-"))).toBe(true);
    const visibleStationCount = visiblePlanIds.filter((id) => id.startsWith("plan-station-text-")).length;
    expect(visibleStationCount).toBeGreaterThan(0);
    expect(visibleStationCount).toBeLessThan(result.stations.entries.length);

    const wideLayout = selectReadablePlanTexts(collectPlanTextCandidates(planViewport), {
      viewportWidthPx: 1920,
      paperWidthMm,
    });
    const wideVisibleCount = [...wideLayout.values()].filter((layout) => layout.visible).length;
    const narrowVisibleCount = [...planLayout.values()].filter((layout) => layout.visible).length;
    expect(wideVisibleCount).toBeGreaterThanOrEqual(narrowVisibleCount);
  });

  it("thins dense band values while keeping row labels inside band bounds", () => {
    const { result, bandViewport } = buildStraightPlusArcPlan();
    const bandTexts = bandViewport.layers
      .flatMap((layer) => layer.primitives)
      .filter((primitive): primitive is DrawingText => primitive.kind === "text");
    const valueTexts = bandTexts.filter((text) => text.id.startsWith("plan-band-value-"));

    expect(valueTexts.length).toBeLessThan(result.stations.entries.length * 4);
    expect(valueTexts.length / 4).toBeLessThanOrEqual(result.stations.entries.length);
    expect(bandTexts.every((text) => text.heightMm >= FORMAL_DRAWING_LAYOUT.minReadableTextHeightMm)).toBe(
      true,
    );
    for (const text of bandTexts) {
      const box = planTextBoxFromAnchor(text.position.x, text.position.y, text.value, text.heightMm, text.alignment ?? "left");
      expect(box.left).toBeGreaterThanOrEqual(bandViewport.paperBounds.minX - 1);
      expect(box.right).toBeLessThanOrEqual(bandViewport.paperBounds.maxX + 1);
      expect(box.bottom).toBeLessThanOrEqual(bandViewport.paperBounds.maxY + 1);
    }
    const bandBoxes = bandTexts.map((text) =>
      planTextBoxFromAnchor(text.position.x, text.position.y, text.value, text.heightMm, text.alignment ?? "left"),
    );
    for (let leftIndex = 0; leftIndex < bandBoxes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < bandBoxes.length; rightIndex += 1) {
        expect(planTextBoxesOverlap(bandBoxes[leftIndex]!, bandBoxes[rightIndex]!)).toBe(false);
      }
    }
  });

  it.each([1366, 1920])("keeps clamped screen text within px bounds at %ipx", (viewportWidthPx) => {
    const profile = screenTextClampProfile(viewportWidthPx);
    const { planViewport } = buildStraightPlusArcPlan();
    const paperWidthMm = 594;
    const paperHeight = planViewport.paperBounds.maxY - planViewport.paperBounds.minY;
    const screenScale = planViewportScreenScale(
      viewportWidthPx,
      paperWidthMm,
    );

    for (const text of collectPlanPaperTexts(planViewport)) {
      const role = inferDrawingTextRole(text.id);
      const clampedMm = clampedFontSizeMm(text.heightMm, screenScale, role, profile);
      const renderedPx = clampedMm * screenScale;
      const minPx = role === "title" || role === "major" ? profile.titleMinPx : profile.generalMinPx;
      expect(renderedPx).toBeGreaterThanOrEqual(minPx - 0.01);
      expect(renderedPx).toBeLessThanOrEqual(profile.maxPx + 0.01);
      expect(text.position.y).toBeLessThanOrEqual(planViewport.paperBounds.maxY);
      expect(text.position.y).toBeGreaterThanOrEqual(planViewport.paperBounds.minY - paperHeight * 0.05);
    }
  });
});
