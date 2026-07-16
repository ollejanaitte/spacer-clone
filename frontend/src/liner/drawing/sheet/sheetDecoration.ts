import {
  CAD_LAYER_PRESETS,
  drawingStyleFromCadPreset,
} from "../../dxf/presets/cadLayerPresets";
import type { SheetPreset } from "../../dxf/presets/sheetPresets";
import { createPoint2 } from "../model/geometry";
import {
  createEmptyDrawingLayer,
  type DrawingSheet,
  type DrawingSheetPageMeta,
  type DrawingViewport,
} from "../model/document";
import { identityPaperTransform } from "../builders/formalPaperLayout";

function buildSheetFrameLayer(sheet: DrawingSheet): ReturnType<typeof createEmptyDrawingLayer> {
  const layer = createEmptyDrawingLayer("sheet-frame-layer", CAD_LAYER_PRESETS.SHEET_FRAME.name);
  layer.coordinateSpace = "paper";
  layer.style = drawingStyleFromCadPreset(CAD_LAYER_PRESETS.SHEET_FRAME);

  const margin = sheet.paper.marginMm;
  const right = sheet.paper.widthMm - margin;
  const bottom = sheet.paper.heightMm - margin;
  layer.primitives.push({
    kind: "polyline",
    id: "sheet-outer-frame",
    points: [
      createPoint2(margin, margin),
      createPoint2(right, margin),
      createPoint2(right, bottom),
      createPoint2(margin, bottom),
      createPoint2(margin, margin),
    ],
  });

  return layer;
}

function buildSheetTextLayer(
  sheet: DrawingSheet,
  page: DrawingSheetPageMeta,
  preset: SheetPreset,
): ReturnType<typeof createEmptyDrawingLayer> {
  const layer = createEmptyDrawingLayer("sheet-text-layer", CAD_LAYER_PRESETS.SHEET_TEXT.name);
  layer.coordinateSpace = "paper";
  layer.style = drawingStyleFromCadPreset(CAD_LAYER_PRESETS.SHEET_TEXT);

  const textHeight = preset.textHeightMm;
  const titleArea = preset.titleArea;
  const margin = sheet.paper.marginMm;

  layer.primitives.push({
    kind: "text",
    id: "sheet-title",
    position: createPoint2(titleArea.minXMm, titleArea.maxYMm - textHeight),
    value: sheet.name,
    heightMm: textHeight + 1,
    alignment: "left",
  });
  layer.primitives.push({
    kind: "text",
    id: "sheet-scale-label",
    position: createPoint2(titleArea.minXMm, titleArea.maxYMm - textHeight * 2.6),
    value: page.scaleLabel,
    heightMm: textHeight,
    alignment: "left",
  });
  layer.primitives.push({
    kind: "text",
    id: "sheet-page-number",
    position: createPoint2(sheet.paper.widthMm - margin - 2, sheet.paper.heightMm - margin - 2),
    value: `${page.pageNumber}/${page.pageCount}`,
    heightMm: textHeight,
    alignment: "right",
  });

  return layer;
}

export function buildSheetDecorationViewport(
  sheet: DrawingSheet,
  page: DrawingSheetPageMeta,
  preset: SheetPreset,
): DrawingViewport {
  const paperBounds = {
    minX: 0,
    minY: 0,
    maxX: sheet.paper.widthMm,
    maxY: sheet.paper.heightMm,
    isEmpty: false,
  };

  return {
    id: "sheet-decoration-viewport",
    kind: "sheet",
    modelBounds: paperBounds,
    paperBounds,
    transform: identityPaperTransform(),
    layers: [
      buildSheetFrameLayer(sheet),
      buildSheetTextLayer(sheet, page, preset),
    ],
  };
}

export function decorateDrawingSheet(
  sheet: DrawingSheet,
  page: DrawingSheetPageMeta,
  preset: SheetPreset,
): DrawingSheet {
  const decorationViewport = buildSheetDecorationViewport(sheet, page, preset);
  return {
    ...sheet,
    page,
    viewports: [...sheet.viewports, decorationViewport],
  };
}
