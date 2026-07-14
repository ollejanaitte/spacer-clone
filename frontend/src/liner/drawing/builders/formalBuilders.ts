import { formatStationDisplay, formatStationPlanNotation } from "../../core/station/stationFormat";
import { ja } from "../../../i18n/ja";
import type {
  CanonicalLinerIntermediateResult,
  GridLineResult,
  GridPointResult,
  HorizontalSegmentResult,
  ResolvedCrossfallState,
  SectionSliceResult,
} from "../../core/types";
import type { CrossfallMode } from "../../schema/types";
import { createDrawingDiagnostic } from "../model/diagnostics";
import {
  boundsFromPoints2,
  createEmptyBounds2,
  createPoint2,
  type Bounds2,
  type Point2,
} from "../model/geometry";
import {
  createEmptyDrawingLayer,
  type DrawingDocument,
  type DrawingLayer,
  type DrawingSheet,
  type DrawingViewport,
} from "../model/document";
import { createPaperDefinition, paperContentBoundsMm } from "../model/paper";
import {
  CAD_LAYER_PRESETS,
  drawingStyleFromCadPreset,
} from "../../dxf/presets/cadLayerPresets";
import { buildCenterlineOnlyPlanOutput } from "./planCenterlineOnlyBuilder";
import type { DrawingPolyline } from "../model/primitives";
import type { StationAxis, StationAxisLabelKind } from "../model/stationAxis";
import { transformPoint2 } from "../transforms/affineTransform2";
import type {
  BuildDrawingContext,
  DrawingBuilder,
  DrawingBuilderOutput,
  DrawingSettings,
} from "./types";
import { getPaperForKind } from "./types";
import {
  bandRowTextBaselineY,
  clampPlanTextAnchorX,
  clampPlanTextBaselineY,
  effectiveRenderedTextHeightMm,
  ellipsisToWidth,
  estimateTextWidthMm,
  PLAN_LAYOUT_VIEWPORT_PX,
  planBandValueThinStride,
  planStationLabelStaggerOffsetMm,
  planTextBoxFromAnchor,
  planViewportScreenScale,
  computePlanStationStaggerByPaperX,
  resolvePlanTextBaselineY,
  shouldThinPlanStationLabel,
} from "../rendering/screenTextLayout";
import {
  FORMAL_DRAWING_LAYOUT,
  fitTransformLongitudinal,
  geometryDataOriginX,
  geometryDrawableWidthMm,
  horizontalScaleMmPerMeter,
  identityPaperTransform,
  sheetRegionsForKind,
  stationColumnPaperX,
} from "./formalPaperLayout";

function expandBounds(bounds: Bounds2, paddingX: number, paddingY: number): Bounds2 {
  if (bounds.isEmpty) {
    return bounds;
  }
  return {
    minX: bounds.minX - paddingX,
    minY: bounds.minY - paddingY,
    maxX: bounds.maxX + paddingX,
    maxY: bounds.maxY + paddingY,
    isEmpty: false,
  };
}

function fitTransform(modelBounds: Bounds2, paperBounds: Bounds2): DrawingViewport["transform"] {
  if (modelBounds.isEmpty) {
    return {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 0,
      f: 0,
    };
  }
  const modelWidth = Math.max(modelBounds.maxX - modelBounds.minX, 1);
  const modelHeight = Math.max(modelBounds.maxY - modelBounds.minY, 1);
  const paperWidth = paperBounds.maxX - paperBounds.minX;
  const paperHeight = paperBounds.maxY - paperBounds.minY;
  const scale = Math.min(paperWidth / modelWidth, paperHeight / modelHeight);
  const scaledWidth = modelWidth * scale;
  const scaledHeight = modelHeight * scale;
  const left = paperBounds.minX + (paperWidth - scaledWidth) / 2;
  const top = paperBounds.minY + (paperHeight - scaledHeight) / 2;
  const bottom = top + scaledHeight;
  return {
    a: scale,
    b: 0,
    c: 0,
    d: -scale,
    e: left - modelBounds.minX * scale,
    f: bottom + modelBounds.minY * scale,
  };
}

function buildStationAxis(result: CanonicalLinerIntermediateResult): StationAxis {
  const stationEntries = result.stations.entries;
  const first = stationEntries[0];
  const last = stationEntries[stationEntries.length - 1];
  return {
    id: "station-axis-main",
    startPhysicalDistance: first?.physicalDistance ?? 0,
    endPhysicalDistance: last?.physicalDistance ?? result.horizontal.totalLength,
    startModelX: first?.physicalDistance ?? 0,
    endModelX: last?.physicalDistance ?? result.horizontal.totalLength,
    stationLabels: stationEntries.map((entry) => ({
      id: `station-axis-label-${entry.entryId}`,
      physicalDistance: entry.physicalDistance,
      displayedStation: entry.displayedStation,
      label: formatStationDisplay(entry.displayedStation),
      kind: (entry.provenance?.source ?? "interval") as StationAxisLabelKind,
    })),
  };
}

function drawingSettingsPaperSize(
  size: DrawingSettings["planPaper"]["size"],
  orientation: DrawingSettings["planPaper"]["orientation"],
  marginMm: number,
) {
  return createPaperDefinition(size, orientation, marginMm);
}

export function createDrawingSettingsFromDraft(
  result: CanonicalLinerIntermediateResult,
  persistedSettings: {
    version?: string;
    planPaperSize?: DrawingSettings["planPaper"]["size"];
    profilePaperSize?: DrawingSettings["profilePaper"]["size"];
    crossSectionPaperSize?: DrawingSettings["crossSectionPaper"]["size"];
    bandPaperSize?: DrawingSettings["bandPaper"]["size"];
    paperOrientation?: DrawingSettings["planPaper"]["orientation"];
    marginMm?: number;
  } | undefined,
): DrawingSettings {
  const orientation = persistedSettings?.paperOrientation ?? "landscape";
  const marginMm = persistedSettings?.marginMm ?? 10;
  return {
    version: persistedSettings?.version ?? "0.1.0",
    planPaper: drawingSettingsPaperSize(persistedSettings?.planPaperSize ?? "A2", orientation, marginMm),
    profilePaper: drawingSettingsPaperSize(persistedSettings?.profilePaperSize ?? "A2", orientation, marginMm),
    crossSectionPaper: drawingSettingsPaperSize(
      persistedSettings?.crossSectionPaperSize ?? "A2",
      orientation,
      marginMm,
    ),
    bandPaper: drawingSettingsPaperSize(persistedSettings?.bandPaperSize ?? "A3", orientation, marginMm),
    stationAxes: [buildStationAxis(result)],
  };
}

function pointsById(result: CanonicalLinerIntermediateResult): Map<string, GridPointResult> {
  return new Map(result.grid.points.map((point) => [point.id, point]));
}

function lineToPolyline(
  line: GridLineResult,
  pointMap: Map<string, GridPointResult>,
  idPrefix: string,
): DrawingPolyline | null {
  const points = line.pointIds
    .map((pointId) => pointMap.get(pointId))
    .filter((point): point is GridPointResult => point !== undefined)
    .map((point) => createPoint2(point.x, point.y));
  if (points.length < 2) {
    return null;
  }
  return {
    kind: "polyline",
    id: `${idPrefix}-${line.id}`,
    points,
  };
}

function centerlinePolyline(
  result: CanonicalLinerIntermediateResult,
): DrawingPolyline | null {
  const points = result.horizontal.sampledPoints.map((point) => createPoint2(point.x, point.y));
  if (points.length < 2) {
    return null;
  }
  return {
    kind: "polyline",
    id: "plan-centerline",
    points,
  };
}

function crossfallModeLabel(crossfall: ResolvedCrossfallState): string {
  const modeLabel = ja.liner.fields.crossfallModes[crossfall.mode as CrossfallMode];
  return `${modeLabel} ${crossfall.leftSlopePercent.toFixed(2)} / ${crossfall.rightSlopePercent.toFixed(2)} %`;
}

function longitudinalFitBounds(
  startDistance: number,
  endDistance: number,
  geometryLayer: DrawingLayer,
  verticalPadding: number,
): Bounds2 {
  const geometryBounds = boundsFromPoints2(geometryPointsFromLayer(geometryLayer));
  if (geometryBounds.isEmpty) {
    return {
      minX: startDistance,
      minY: -verticalPadding,
      maxX: endDistance,
      maxY: verticalPadding,
      isEmpty: false,
    };
  }
  return {
    minX: startDistance,
    minY: geometryBounds.minY - verticalPadding,
    maxX: endDistance,
    maxY: geometryBounds.maxY + verticalPadding,
    isEmpty: false,
  };
}

function geometryPointsFromLayer(layer: DrawingLayer): Point2[] {
  return layer.primitives.flatMap((primitive) => {
    if (primitive.kind === "polyline") {
      return primitive.points;
    }
    if (primitive.kind === "line") {
      return [primitive.start, primitive.end];
    }
    return [];
  });
}

function sampleAtPhysicalDistance(
  result: CanonicalLinerIntermediateResult,
  physicalDistance: number,
): { x: number; y: number } | null {
  const exact = result.horizontal.sampledPoints.find(
    (entry) => Math.abs(entry.physicalDistance - physicalDistance) <= 1e-6,
  );
  if (exact) {
    return exact;
  }
  const sorted = [...result.horizontal.sampledPoints].sort(
    (left, right) => left.physicalDistance - right.physicalDistance,
  );
  if (sorted.length === 0) {
    return null;
  }
  const nextIndex = sorted.findIndex((entry) => entry.physicalDistance >= physicalDistance);
  if (nextIndex <= 0) {
    return sorted[0] ?? null;
  }
  if (nextIndex < 0) {
    return sorted.at(-1) ?? null;
  }
  const previous = sorted[nextIndex - 1]!;
  const next = sorted[nextIndex]!;
  const span = next.physicalDistance - previous.physicalDistance;
  if (span <= 0) {
    return previous;
  }
  const ratio = (physicalDistance - previous.physicalDistance) / span;
  return {
    x: previous.x + (next.x - previous.x) * ratio,
    y: previous.y + (next.y - previous.y) * ratio,
  };
}

function planGeometryModelBounds(
  geometryLayer: DrawingLayer,
  result: CanonicalLinerIntermediateResult,
): Bounds2 {
  const points = [...geometryPointsFromPoints(result, geometryPointsFromLayer(geometryLayer))];
  for (const segment of result.horizontal.segments) {
    if (segment.type === "straight") {
      continue;
    }
    for (const physicalDistance of [segment.startPhysicalDistance, segment.endPhysicalDistance]) {
      const sample = sampleAtPhysicalDistance(result, physicalDistance);
      if (sample) {
        points.push(createPoint2(sample.x, sample.y));
      }
    }
  }
  for (const piPoint of result.horizontal.piPoints) {
    points.push(createPoint2(piPoint.x, piPoint.y));
  }
  const bounds = boundsFromPoints2(points);
  if (bounds.isEmpty) {
    return bounds;
  }
  return expandBounds(bounds, 2, 2);
}

function geometryPointsFromPoints(
  result: CanonicalLinerIntermediateResult,
  points: Point2[],
): Point2[] {
  const annotationAnchors: Point2[] = [];
  for (const segment of result.horizontal.segments) {
    const middle = result.horizontal.sampledPoints.find(
      (entry) =>
        entry.physicalDistance >= segment.startPhysicalDistance
        && entry.physicalDistance <= segment.endPhysicalDistance,
    );
    if (middle) {
      annotationAnchors.push(createPoint2(middle.x, middle.y - 4));
    }
  }
  return [...points, ...annotationAnchors];
}

function curveBoundaryLabel(segment: HorizontalSegmentResult, boundary: "start" | "end"): string | null {
  if (segment.type === "arc") {
    return boundary === "start"
      ? ja.liner.formalDrawing.planCurvePoints.bc
      : ja.liner.formalDrawing.planCurvePoints.ec;
  }
  if (segment.type === "clothoid") {
    return boundary === "start"
      ? ja.liner.formalDrawing.planCurvePoints.ka
      : ja.liner.formalDrawing.planCurvePoints.ke;
  }
  return null;
}

function appendPlanCurveBoundaryMarkers(
  layer: DrawingLayer,
  result: CanonicalLinerIntermediateResult,
): void {
  for (const segment of result.horizontal.segments) {
    if (segment.type === "straight") {
      continue;
    }
    for (const [boundary, physicalDistance] of [
      ["start", segment.startPhysicalDistance] as const,
      ["end", segment.endPhysicalDistance] as const,
    ]) {
      const sample = sampleAtPhysicalDistance(result, physicalDistance);
      if (!sample) {
        continue;
      }
      layer.primitives.push({
        kind: "polyline",
        id: `plan-curve-boundary-tick-${segment.id}-${boundary}`,
        points: [
          createPoint2(sample.x, sample.y - 1.5),
          createPoint2(sample.x, sample.y + 1.5),
        ],
      });
    }
  }
}

function segmentAnnotation(segment: HorizontalSegmentResult): string {
  if (segment.type === "arc") {
    const radius = segment.startCurvature === 0 ? "∞" : (1 / Math.abs(segment.startCurvature)).toFixed(0);
    return `R=${radius}`;
  }
  if (segment.type === "clothoid") {
    return ja.liner.fields.elementTypes.clothoid;
  }
  return ja.liner.fields.elementTypes.straight;
}

function planGeometryLayer(context: BuildDrawingContext): DrawingLayer {
  const layer = createEmptyDrawingLayer("plan-layer", CAD_LAYER_PRESETS.PLAN_CENTER.name);
  layer.style = {
    ...drawingStyleFromCadPreset(CAD_LAYER_PRESETS.PLAN_CENTER),
    strokeWidthMm: FORMAL_DRAWING_LAYOUT.geometryStrokeWidthMm,
  };
  const pointMap = pointsById(context.result);
  const centerline = centerlinePolyline(context.result);
  if (centerline) {
    layer.primitives.push(centerline);
  }
  for (const line of context.result.grid.lines) {
    const polyline = lineToPolyline(line, pointMap, "plan-grid");
    if (polyline) {
      layer.primitives.push(polyline);
    }
  }
  for (const station of context.result.stations.entries) {
    const sample = context.result.horizontal.sampledPoints.find(
      (entry) => Math.abs(entry.physicalDistance - station.physicalDistance) <= 1e-6,
    );
    if (!sample) {
      continue;
    }
    layer.primitives.push({
      kind: "polyline",
      id: `plan-station-tick-${station.entryId}`,
      points: [createPoint2(sample.x, sample.y - 2), createPoint2(sample.x, sample.y + 2)],
    });
  }
  appendPlanCurveBoundaryMarkers(layer, context.result);
  return layer;
}

type PlanTextLayoutContext = {
  viewportWidthPx: number;
  drawableWidthMm: number;
  paperWidthMm: number;
};

function planLayoutTextHeightMm(
  heightMm: number,
  role: "major" | "station" | "curve" | "title" | "aux",
  layout: PlanTextLayoutContext,
): number {
  const screenScale = planViewportScreenScale(
    PLAN_LAYOUT_VIEWPORT_PX.narrow,
    layout.paperWidthMm,
  );
  return effectiveRenderedTextHeightMm(
    heightMm,
    screenScale,
    role,
    PLAN_LAYOUT_VIEWPORT_PX.narrow,
  );
}

function buildPlanAnnotationLayerPaper(
  result: CanonicalLinerIntermediateResult,
  geometryTransform: DrawingViewport["transform"],
  geometryPaperBounds: Bounds2,
  layout: PlanTextLayoutContext,
): DrawingLayer {
  const layer = createEmptyDrawingLayer("plan-annotation-layer", CAD_LAYER_PRESETS.PLAN_TEXT.name);
  layer.coordinateSpace = "paper";
  layer.style = drawingStyleFromCadPreset(CAD_LAYER_PRESETS.PLAN_TEXT);
  const annotationHeight = FORMAL_DRAWING_LAYOUT.planAnnotationTextHeightMm;
  const northHeight = FORMAL_DRAWING_LAYOUT.planNorthTextHeightMm;
  const layoutAnnotationHeight = planLayoutTextHeightMm(annotationHeight, "station", layout);
  const layoutMajorHeight = planLayoutTextHeightMm(annotationHeight, "major", layout);
  const layoutCurveHeight = planLayoutTextHeightMm(annotationHeight, "curve", layout);
  const stationCount = result.stations.entries.length;
  const stationThinOptions = {
    viewportWidthPx: layout.viewportWidthPx,
    drawableWidthMm: layout.drawableWidthMm,
    paperWidthMm: layout.paperWidthMm,
    textHeightMm: annotationHeight,
  };
  const placedBoxes: ReturnType<typeof planTextBoxFromAnchor>[] = [];
  const yStepMm = layoutAnnotationHeight + 1.5;

  for (const segment of result.horizontal.segments) {
    if (segment.type === "straight") {
      continue;
    }
    for (const [boundary, physicalDistance] of [
      ["start", segment.startPhysicalDistance] as const,
      ["end", segment.endPhysicalDistance] as const,
    ]) {
      const label = curveBoundaryLabel(segment, boundary);
      const sample = sampleAtPhysicalDistance(result, physicalDistance);
      if (!label || !sample) {
        continue;
      }
      const paperAnchor = transformPoint2(geometryTransform, createPoint2(sample.x, sample.y + 3.5));
      const preferredY = paperAnchor.y;
      const resolvedY = resolvePlanTextBaselineY(
        paperAnchor.x,
        preferredY,
        label,
        layoutMajorHeight,
        placedBoxes,
        yStepMm,
        6,
      );
      const clampedX = clampPlanTextAnchorX(
        paperAnchor.x,
        resolvedY,
        label,
        layoutMajorHeight,
        geometryPaperBounds,
      );
      const clampedY = clampPlanTextBaselineY(
        clampedX,
        resolvedY,
        label,
        layoutMajorHeight,
        geometryPaperBounds,
      );
      placedBoxes.push(planTextBoxFromAnchor(clampedX, clampedY, label, layoutMajorHeight));
      layer.primitives.push({
        kind: "text",
        id: `plan-curve-point-${segment.id}-${boundary}`,
        position: createPoint2(clampedX, clampedY),
        value: label,
        heightMm: annotationHeight,
        alignment: "center",
      });
    }
  }

  const stationLabelCandidates: Array<{
    stationId: string;
    paperX: number;
    baseY: number;
    value: string;
  }> = [];

  result.stations.entries.forEach((station, stationIndex) => {
    if (shouldThinPlanStationLabel(stationIndex, stationCount, 0, stationThinOptions)) {
      return;
    }
    const sample = result.horizontal.sampledPoints.find(
      (entry) => Math.abs(entry.physicalDistance - station.physicalDistance) <= 1e-6,
    );
    if (!sample) {
      return;
    }
    const tickBottom = transformPoint2(geometryTransform, createPoint2(sample.x, sample.y - 2));
    stationLabelCandidates.push({
      stationId: station.entryId,
      paperX: tickBottom.x,
      baseY: tickBottom.y + layoutAnnotationHeight * 0.55,
      value: formatStationDisplay(station.displayedStation),
    });
  });

  const staggerByStationId = computePlanStationStaggerByPaperX(
    stationLabelCandidates.map((candidate) => ({
      stationId: candidate.stationId,
      paperX: candidate.paperX,
      value: candidate.value,
    })),
    layoutAnnotationHeight,
  );

  for (const candidate of stationLabelCandidates) {
    const staggerIndex = staggerByStationId.get(candidate.stationId) ?? 0;
    const preferredY = candidate.baseY + planStationLabelStaggerOffsetMm(staggerIndex, layoutAnnotationHeight);
    const resolvedY = resolvePlanTextBaselineY(
      candidate.paperX,
      preferredY,
      candidate.value,
      layoutAnnotationHeight,
      placedBoxes,
      yStepMm,
      6,
    );
    const clampedX = clampPlanTextAnchorX(
      candidate.paperX,
      resolvedY,
      candidate.value,
      layoutAnnotationHeight,
      geometryPaperBounds,
    );
    const clampedY = clampPlanTextBaselineY(
      clampedX,
      resolvedY,
      candidate.value,
      layoutAnnotationHeight,
      geometryPaperBounds,
    );
    placedBoxes.push(planTextBoxFromAnchor(clampedX, clampedY, candidate.value, layoutAnnotationHeight));
    layer.primitives.push({
      kind: "text",
      id: `plan-station-text-${candidate.stationId}`,
      position: createPoint2(clampedX, clampedY),
      value: candidate.value,
      heightMm: annotationHeight,
      alignment: "center",
    });
  }

  for (const segment of result.horizontal.segments) {
    const middle = result.horizontal.sampledPoints.find(
      (entry) =>
        entry.physicalDistance >= segment.startPhysicalDistance
        && entry.physicalDistance <= segment.endPhysicalDistance,
    );
    if (!middle) {
      continue;
    }
    const segmentValue = segmentAnnotation(segment);
    const paperPosition = transformPoint2(geometryTransform, createPoint2(middle.x, middle.y - 4));
    const preferredY = paperPosition.y - layoutCurveHeight * 1.1;
    const resolvedY = resolvePlanTextBaselineY(
      paperPosition.x,
      preferredY,
      segmentValue,
      layoutCurveHeight,
      placedBoxes,
      -yStepMm,
      6,
    );
    const clampedX = clampPlanTextAnchorX(
      paperPosition.x,
      resolvedY,
      segmentValue,
      layoutCurveHeight,
      geometryPaperBounds,
    );
    const clampedY = clampPlanTextBaselineY(
      clampedX,
      resolvedY,
      segmentValue,
      layoutCurveHeight,
      geometryPaperBounds,
    );
    placedBoxes.push(planTextBoxFromAnchor(clampedX, clampedY, segmentValue, layoutCurveHeight));
    layer.primitives.push({
      kind: "text",
      id: `plan-segment-${segment.id}`,
      position: createPoint2(clampedX, clampedY),
      value: segmentValue,
      heightMm: annotationHeight,
      alignment: "center",
    });
  }

  const firstPoint = result.horizontal.sampledPoints[0];
  if (firstPoint) {
    const northX = geometryPaperBounds.minX + FORMAL_DRAWING_LAYOUT.geometryInsetMm;
    const northY = geometryPaperBounds.minY + northHeight;
    const northValue = "N";
    const scaleValue = "1:500";
    const scaleX = northX + estimateTextWidthMm(northValue, northHeight) + 3;
    const scaleY = northY;
    const northClampedY = clampPlanTextBaselineY(northX, northY, northValue, northHeight, geometryPaperBounds, "left");
    const scaleClampedX = clampPlanTextAnchorX(scaleX, scaleY, scaleValue, annotationHeight, geometryPaperBounds, "left");
    const scaleClampedY = clampPlanTextBaselineY(
      scaleClampedX,
      scaleY,
      scaleValue,
      annotationHeight,
      geometryPaperBounds,
      "left",
    );
    layer.primitives.push({
      kind: "text",
      id: "plan-north",
      position: createPoint2(northX, northClampedY),
      value: northValue,
      heightMm: northHeight,
    });
    layer.primitives.push({
      kind: "text",
      id: "plan-scale",
      position: createPoint2(scaleClampedX, scaleClampedY),
      value: scaleValue,
      heightMm: annotationHeight,
    });
  }

  return layer;
}

function buildPlanBandLayerPaper(
  result: CanonicalLinerIntermediateResult,
  bandBounds: Bounds2,
  mmPerMeter: number,
  layout: PlanTextLayoutContext,
): DrawingLayer {
  const layer = createEmptyDrawingLayer("plan-band-layer", CAD_LAYER_PRESETS.PLAN_BAND.name);
  layer.coordinateSpace = "paper";
  layer.style = {
    ...drawingStyleFromCadPreset(CAD_LAYER_PRESETS.PLAN_BAND),
    strokeWidthMm: FORMAL_DRAWING_LAYOUT.bandStrokeWidthMm,
  };
  const rowHeight = FORMAL_DRAWING_LAYOUT.planRowHeightMm;
  const labelHeight = FORMAL_DRAWING_LAYOUT.bandLabelTextHeightMm;
  const valueHeight = FORMAL_DRAWING_LAYOUT.bandValueTextHeightMm;
  const rowLabels = [
    ja.liner.formalDrawing.planBandRows.station,
    ja.liner.formalDrawing.planBandRows.physicalDistance,
    ja.liner.formalDrawing.planBandRows.element,
    ja.liner.formalDrawing.planBandRows.radius,
  ];
  const startDistance = result.stations.entries[0]?.physicalDistance ?? 0;
  const endDistance = result.stations.entries.at(-1)?.physicalDistance ?? result.horizontal.totalLength;
  const dataRight = geometryDataOriginX(bandBounds) + (endDistance - startDistance) * mmPerMeter;
  const stationDistances = result.stations.entries.map((station) => station.physicalDistance);
  const minStationGapM =
    stationDistances.length > 1
      ? Math.min(
          ...stationDistances.slice(1).map((distance, index) => distance - stationDistances[index]!),
        )
      : endDistance - startDistance;
  const bandCellWidthMm = Math.max(minStationGapM * mmPerMeter - 1, FORMAL_DRAWING_LAYOUT.minReadableTextHeightMm);
  const bandCharWidthMm = valueHeight * 0.55;
  const labelColumnTextWidthMm = FORMAL_DRAWING_LAYOUT.labelColumnWidthMm - 4;
  const labelCharWidthMm = labelHeight * 0.55;
  const bandThinOptions = {
    viewportWidthPx: layout.viewportWidthPx,
    drawableWidthMm: layout.drawableWidthMm,
    paperWidthMm: layout.paperWidthMm,
  };
  const bandValueThinStride = planBandValueThinStride(
    bandCellWidthMm,
    valueHeight,
    result.stations.entries.length,
    bandThinOptions,
  );
  const layoutValueHeight = planLayoutTextHeightMm(valueHeight, "station", layout);
  const effectiveBandCellWidthMm = Math.max(
    bandCellWidthMm * bandValueThinStride * 0.92,
    layoutValueHeight * 3,
  );

  for (let rowIndex = 0; rowIndex < rowLabels.length; rowIndex += 1) {
    const y = bandBounds.minY + rowIndex * rowHeight;
    layer.primitives.push({
      kind: "polyline",
      id: `plan-band-row-${rowIndex}`,
      points: [
        createPoint2(bandBounds.minX, y),
        createPoint2(bandBounds.maxX - FORMAL_DRAWING_LAYOUT.geometryInsetMm, y),
      ],
    });
    layer.primitives.push({
      kind: "text",
      id: `plan-band-row-label-${rowIndex}`,
      position: createPoint2(
        bandBounds.minX + 2,
        bandRowTextBaselineY(y, rowHeight, labelHeight),
      ),
      value: ellipsisToWidth(rowLabels[rowIndex]!, labelColumnTextWidthMm, labelCharWidthMm),
      heightMm: labelHeight,
    });
  }

  for (const [stationIndex, station] of result.stations.entries.entries()) {
    const x = stationColumnPaperX(bandBounds, station.physicalDistance, startDistance, mmPerMeter);
    const segment = result.horizontal.segments.find(
      (entry) =>
        station.physicalDistance >= entry.startPhysicalDistance
        && station.physicalDistance <= entry.endPhysicalDistance,
    );
    const values = [
      formatStationDisplay(station.displayedStation),
      station.physicalDistance.toFixed(2),
      segment ? segmentAnnotation(segment) : ja.liner.formalDrawing.bandRows.unavailable,
      segment?.type === "arc"
        ? segmentAnnotation(segment)
        : ja.liner.formalDrawing.bandRows.unavailable,
    ];
    layer.primitives.push({
      kind: "polyline",
      id: `plan-band-station-line-${station.entryId}`,
      points: [
        createPoint2(x, bandBounds.minY),
        createPoint2(x, bandBounds.minY + rowLabels.length * rowHeight),
      ],
    });
    if (stationIndex % bandValueThinStride !== 0) {
      continue;
    }
    values.forEach((value, rowIndex) => {
      layer.primitives.push({
        kind: "text",
        id: `plan-band-value-${station.entryId}-${rowIndex}`,
        position: createPoint2(
          x,
          bandRowTextBaselineY(bandBounds.minY + rowIndex * rowHeight, rowHeight, valueHeight),
        ),
        value: ellipsisToWidth(value, effectiveBandCellWidthMm, bandCharWidthMm),
        heightMm: valueHeight,
        alignment: "center",
      });
    });
  }

  layer.primitives.push({
    kind: "polyline",
    id: "plan-band-data-frame",
    points: [
      createPoint2(geometryDataOriginX(bandBounds), bandBounds.minY),
      createPoint2(dataRight, bandBounds.minY),
      createPoint2(dataRight, bandBounds.minY + rowLabels.length * rowHeight),
      createPoint2(geometryDataOriginX(bandBounds), bandBounds.minY + rowLabels.length * rowHeight),
      createPoint2(geometryDataOriginX(bandBounds), bandBounds.minY),
    ],
  });

  return layer;
}

function buildPlanViewports(context: BuildDrawingContext): DrawingViewport[] {
  const paper = getPaperForKind(context.settings, "plan");
  const { geometryBounds, bandBounds } = sheetRegionsForKind(paper, "plan");
  const planLayer = planGeometryLayer(context);
  const startDistance = context.result.stations.entries[0]?.physicalDistance ?? 0;
  const endDistance =
    context.result.stations.entries.at(-1)?.physicalDistance ?? context.result.horizontal.totalLength;
  const planModelBounds = planGeometryModelBounds(planLayer, context.result);
  const geometryTransform = fitTransform(planModelBounds, geometryBounds);
  const drawableWidthMm = geometryDrawableWidthMm(geometryBounds);
  const mmPerMeter = horizontalScaleMmPerMeter(
    endDistance - startDistance,
    drawableWidthMm,
  );
  const layout: PlanTextLayoutContext = {
    viewportWidthPx: PLAN_LAYOUT_VIEWPORT_PX.wide,
    drawableWidthMm,
    paperWidthMm: paper.widthMm,
  };
  const annotationLayer = buildPlanAnnotationLayerPaper(
    context.result,
    geometryTransform,
    geometryBounds,
    layout,
  );
  const bandLayer = buildPlanBandLayerPaper(context.result, bandBounds, mmPerMeter, layout);
  const stationAxisId = context.settings.stationAxes[0]?.id;
  return [
    {
      id: "plan-viewport",
      kind: "plan",
      modelBounds: planModelBounds,
      paperBounds: geometryBounds,
      transform: geometryTransform,
      layers: [planLayer, annotationLayer],
      stationAxisId,
    },
    {
      id: "plan-band-viewport",
      kind: "band",
      modelBounds: bandBounds,
      paperBounds: bandBounds,
      transform: identityPaperTransform(),
      layers: [bandLayer],
      stationAxisId,
    },
  ];
}

function closestSection(
  sections: readonly SectionSliceResult[],
  selectedStation: number | undefined,
): SectionSliceResult | null {
  if (sections.length === 0) {
    return null;
  }
  if (!Number.isFinite(selectedStation)) {
    return sections[0]!;
  }
  return [...sections].sort(
    (left, right) =>
      Math.abs(left.physicalDistance - selectedStation!)
      - Math.abs(right.physicalDistance - selectedStation!),
  )[0]!;
}

function profileElevationBounds(result: CanonicalLinerIntermediateResult): { minY: number; maxY: number } {
  const elevations = result.vertical.sampledPoints.map((point) => point.profileElevation);
  const minElev = elevations.length > 0 ? Math.min(...elevations) : result.vertical.profileElevation;
  const maxElev = elevations.length > 0 ? Math.max(...elevations) : result.vertical.profileElevation;
  const naturalSpan = Math.max(maxElev - minElev, FORMAL_DRAWING_LAYOUT.minElevationSpanM);
  const mid = (minElev + maxElev) / 2;
  const halfSpan = naturalSpan / 2;
  return {
    minY: mid - halfSpan,
    maxY: mid + halfSpan,
  };
}

function buildProfileLayer(result: CanonicalLinerIntermediateResult): DrawingLayer {
  const layer = createEmptyDrawingLayer("profile-layer", CAD_LAYER_PRESETS.PROFILE_DESIGN.name);
  layer.style = {
    ...drawingStyleFromCadPreset(CAD_LAYER_PRESETS.PROFILE_DESIGN),
    strokeWidthMm: FORMAL_DRAWING_LAYOUT.geometryStrokeWidthMm,
  };
  const profilePoints = result.vertical.sampledPoints.map((point) =>
    createPoint2(point.physicalDistance, point.profileElevation),
  );
  const minX = profilePoints[0]?.x ?? 0;
  const maxX = profilePoints.at(-1)?.x ?? result.horizontal.totalLength;
  const { minY, maxY } = profileElevationBounds(result);
  const datumY = result.vertical.profileElevation;

  for (let index = 0; index <= 4; index += 1) {
    const y = minY + ((maxY - minY) * index) / 4;
    layer.primitives.push({
      kind: "polyline",
      id: `profile-grid-h-${index}`,
      points: [createPoint2(minX, y), createPoint2(maxX, y)],
    });
  }
  for (const station of result.stations.entries) {
    layer.primitives.push({
      kind: "polyline",
      id: `profile-grid-v-${station.entryId}`,
      points: [
        createPoint2(station.physicalDistance, minY),
        createPoint2(station.physicalDistance, maxY),
      ],
    });
  }
  layer.primitives.push({
    kind: "polyline",
    id: "profile-datum",
    points: [createPoint2(minX, datumY), createPoint2(maxX, datumY)],
  });

  const profilePolyline: DrawingPolyline = {
    kind: "polyline",
    id: "profile-line",
    points: profilePoints,
  };
  if (profilePolyline.points.length >= 2) {
    layer.primitives.push(profilePolyline);
  }
  return layer;
}

function buildProfileAnnotationLayerPaper(
  result: CanonicalLinerIntermediateResult,
  geometryTransform: DrawingViewport["transform"],
  geometryPaperBounds: Bounds2,
): DrawingLayer {
  const layer = createEmptyDrawingLayer("profile-annotation-layer", CAD_LAYER_PRESETS.PROFILE_TEXT.name);
  layer.coordinateSpace = "paper";
  layer.style = drawingStyleFromCadPreset(CAD_LAYER_PRESETS.PROFILE_TEXT);
  const annotationHeight = FORMAL_DRAWING_LAYOUT.profileAnnotationTextHeightMm;
  const { minY, maxY } = profileElevationBounds(result);
  const minX = result.stations.entries[0]?.physicalDistance ?? 0;
  const maxX = result.stations.entries.at(-1)?.physicalDistance ?? result.horizontal.totalLength;
  const chartTopLeft = transformPoint2(geometryTransform, createPoint2(minX, maxY));
  const chartBottomRight = transformPoint2(geometryTransform, createPoint2(maxX, minY));
  const chartCenterX = (chartTopLeft.x + chartBottomRight.x) / 2;
  const chartCenterY = (chartTopLeft.y + chartBottomRight.y) / 2;

  layer.primitives.push({
    kind: "text",
    id: "profile-ground-unavailable",
    position: createPoint2(chartCenterX, chartCenterY),
    value: ja.liner.formalDrawing.groundLineUnavailable,
    heightMm: annotationHeight + 1,
    alignment: "center",
  });
  layer.primitives.push({
    kind: "text",
    id: "profile-scale-h",
    position: createPoint2(
      chartBottomRight.x - 2,
      chartBottomRight.y + annotationHeight + FORMAL_DRAWING_LAYOUT.profileStationLabelReserveMm,
    ),
    value: ja.liner.formalDrawing.scaleHorizontal("1:500"),
    heightMm: annotationHeight,
    alignment: "right",
  });
  layer.primitives.push({
    kind: "text",
    id: "profile-scale-v",
    position: createPoint2(
      chartTopLeft.x - 2,
      chartTopLeft.y + annotationHeight,
    ),
    value: ja.liner.formalDrawing.scaleVertical("1:100"),
    heightMm: annotationHeight,
    alignment: "right",
  });
  layer.primitives.push({
    kind: "text",
    id: "profile-datum-label",
    position: createPoint2(chartTopLeft.x + 2, transformPoint2(geometryTransform, createPoint2(minX, result.vertical.profileElevation)).y - 1),
    value: `EL=${result.vertical.profileElevation.toFixed(2)}`,
    heightMm: annotationHeight,
  });

  for (const station of result.stations.entries) {
    const paperPosition = transformPoint2(
      geometryTransform,
      createPoint2(station.physicalDistance, minY),
    );
    layer.primitives.push({
      kind: "text",
      id: `profile-station-${station.entryId}`,
      position: createPoint2(
        paperPosition.x,
        chartBottomRight.y + FORMAL_DRAWING_LAYOUT.profileStationLabelReserveMm,
      ),
      value: formatStationDisplay(station.displayedStation),
      heightMm: annotationHeight,
      alignment: "center",
    });
  }
  for (const breakPoint of result.vertical.gradeBreaks) {
    const paperPosition = transformPoint2(
      geometryTransform,
      createPoint2(breakPoint.physicalDistance, maxY),
    );
    layer.primitives.push({
      kind: "text",
      id: `profile-grade-break-${breakPoint.id}`,
      position: createPoint2(paperPosition.x, geometryPaperBounds.minY + annotationHeight),
      value: `${ja.liner.fields.grade}=${(breakPoint.incomingGrade ?? 0).toFixed(3)}`,
      heightMm: annotationHeight,
      alignment: "center",
    });
  }
  return layer;
}

function buildProfileBandLayerPaper(
  result: CanonicalLinerIntermediateResult,
  bandBounds: Bounds2,
  mmPerMeter: number,
): DrawingLayer {
  const layer = createEmptyDrawingLayer("band-layer", CAD_LAYER_PRESETS.PROFILE_BAND.name);
  layer.coordinateSpace = "paper";
  layer.style = {
    ...drawingStyleFromCadPreset(CAD_LAYER_PRESETS.PROFILE_BAND),
    strokeWidthMm: FORMAL_DRAWING_LAYOUT.bandStrokeWidthMm,
  };
  const rowHeight = FORMAL_DRAWING_LAYOUT.profileRowHeightMm;
  const labelHeight = FORMAL_DRAWING_LAYOUT.bandLabelTextHeightMm;
  const valueHeight = FORMAL_DRAWING_LAYOUT.bandValueTextHeightMm;
  const startDistance = result.stations.entries[0]?.physicalDistance ?? 0;
  const endDistance = result.stations.entries.at(-1)?.physicalDistance ?? result.horizontal.totalLength;
  const sectionByDistance = new Map(
    result.sections.map((section) => [section.physicalDistance, section] as const),
  );
  const stationDistances = result.stations.entries.map((station) => station.physicalDistance);
  const minStationGapM =
    stationDistances.length > 1
      ? Math.min(
          ...stationDistances.slice(1).map((distance, index) => distance - stationDistances[index]!),
        )
      : endDistance - startDistance;
  const bandCellWidthMm = Math.max(minStationGapM * mmPerMeter - 1, FORMAL_DRAWING_LAYOUT.minReadableTextHeightMm);
  const bandCharWidthMm = valueHeight * 0.55;
  const rowDefinitions = [
    {
      key: "station",
      label: ja.liner.formalDrawing.bandRows.station,
      value: (stationIndex: number) =>
        formatStationDisplay(result.stations.entries[stationIndex]?.displayedStation ?? 0),
    },
    {
      key: "additionalDistance",
      label: ja.liner.formalDrawing.bandRows.additionalDistance,
      value: (stationIndex: number) => {
        const current = result.stations.entries[stationIndex]?.physicalDistance ?? 0;
        const previous = result.stations.entries[stationIndex - 1]?.physicalDistance ?? current;
        return (current - previous).toFixed(2);
      },
    },
    {
      key: "cumulativeDistance",
      label: ja.liner.formalDrawing.bandRows.cumulativeDistance,
      value: (stationIndex: number) =>
        (result.stations.entries[stationIndex]?.physicalDistance ?? 0).toFixed(2),
    },
    {
      key: "singleDistance",
      label: ja.liner.formalDrawing.bandRows.singleDistance,
      value: (stationIndex: number) => {
        const current = result.stations.entries[stationIndex]?.physicalDistance ?? 0;
        const previous = result.stations.entries[stationIndex - 1]?.physicalDistance ?? current;
        return (current - previous).toFixed(2);
      },
    },
    {
      key: "groundElevation",
      label: ja.liner.formalDrawing.bandRows.groundElevation,
      value: () => ja.liner.formalDrawing.groundLineUnavailable,
    },
    {
      key: "designElevation",
      label: ja.liner.formalDrawing.bandRows.designElevation,
      value: (stationIndex: number) => {
        const station = result.stations.entries[stationIndex];
        const sample = result.vertical.sampledPoints.find(
          (point) => point.physicalDistance === station?.physicalDistance,
        );
        return sample ? sample.profileElevation.toFixed(2) : ja.liner.formalDrawing.bandRows.unavailable;
      },
    },
    {
      key: "cutFill",
      label: ja.liner.formalDrawing.bandRows.cutFill,
      value: () => ja.liner.formalDrawing.bandRows.unavailable,
    },
    {
      key: "grade",
      label: ja.liner.formalDrawing.bandRows.grade,
      value: (stationIndex: number) => {
        const station = result.stations.entries[stationIndex];
        const sample = result.vertical.sampledPoints.find(
          (point) => point.physicalDistance === station?.physicalDistance,
        );
        return sample ? sample.grade.toFixed(3) : ja.liner.formalDrawing.bandRows.unavailable;
      },
    },
    {
      key: "verticalCurve",
      label: ja.liner.formalDrawing.bandRows.verticalCurve,
      value: (stationIndex: number) => {
        const station = result.stations.entries[stationIndex];
        const distance = station?.physicalDistance ?? Number.NaN;
        const segment = result.vertical.segments.find(
          (entry) =>
            entry.pvcPhysicalDistance !== undefined
            && distance >= entry.startPhysicalDistance
            && distance <= entry.endPhysicalDistance,
        );
        if (!segment) {
          return ja.liner.formalDrawing.bandRows.unavailable;
        }
        if (
          segment.pvcPhysicalDistance !== undefined
          && Math.abs(distance - segment.pvcPhysicalDistance) < 1e-6
        ) {
          return "BVC";
        }
        if (
          segment.pvtPhysicalDistance !== undefined
          && Math.abs(distance - segment.pvtPhysicalDistance) < 1e-6
        ) {
          return "EVC";
        }
        if (
          segment.pviPhysicalDistance !== undefined
          && Math.abs(distance - segment.pviPhysicalDistance) < 1e-6
        ) {
          return "PVI";
        }
        const lengthM = segment.endPhysicalDistance - segment.startPhysicalDistance;
        return `L=${lengthM.toFixed(1)}`;
      },
    },
    {
      key: "planAlignment",
      label: ja.liner.formalDrawing.bandRows.planAlignment,
      value: (stationIndex: number) => {
        const station = result.stations.entries[stationIndex];
        const segment = result.horizontal.segments.find(
          (entry) =>
            (station?.physicalDistance ?? 0) >= entry.startPhysicalDistance
            && (station?.physicalDistance ?? 0) <= entry.endPhysicalDistance,
        );
        return segment ? segmentAnnotation(segment) : ja.liner.formalDrawing.bandRows.unavailable;
      },
    },
    {
      key: "crossfall",
      label: ja.liner.formalDrawing.bandRows.crossfall,
      value: (stationIndex: number) => {
        const station = result.stations.entries[stationIndex];
        const section = sectionByDistance.get(station?.physicalDistance ?? -1);
        if (!section) {
          return ja.liner.formalDrawing.bandRows.unavailable;
        }
        return crossfallModeLabel(section.crossfall);
      },
    },
    {
      key: "widening",
      label: ja.liner.formalDrawing.bandRows.widening,
      value: () => ja.liner.formalDrawing.bandRows.unavailable,
    },
  ];

  rowDefinitions.forEach((row, rowIndex) => {
    const y = bandBounds.minY + rowIndex * rowHeight;
    layer.primitives.push({
      kind: "polyline",
      id: `band-row-${row.key}`,
      points: [
        createPoint2(bandBounds.minX, y),
        createPoint2(bandBounds.maxX - FORMAL_DRAWING_LAYOUT.geometryInsetMm, y),
      ],
    });
    layer.primitives.push({
      kind: "text",
      id: `band-row-label-${row.key}`,
      position: createPoint2(bandBounds.minX + 2, y + rowHeight - 1.5),
      value: row.label,
      heightMm: labelHeight,
    });
    result.stations.entries.forEach((station, stationIndex) => {
      const x = stationColumnPaperX(bandBounds, station.physicalDistance, startDistance, mmPerMeter);
      layer.primitives.push({
        kind: "text",
        id: `band-value-${row.key}-${station.entryId}`,
        position: createPoint2(x, y + rowHeight - 1.5),
        value: ellipsisToWidth(row.value(stationIndex), bandCellWidthMm, bandCharWidthMm),
        heightMm: valueHeight,
        alignment: "center",
      });
    });
  });
  for (const station of result.stations.entries) {
    const x = stationColumnPaperX(bandBounds, station.physicalDistance, startDistance, mmPerMeter);
    layer.primitives.push({
      kind: "polyline",
      id: `band-station-line-${station.entryId}`,
      points: [
        createPoint2(x, bandBounds.minY),
        createPoint2(x, bandBounds.minY + rowDefinitions.length * rowHeight),
      ],
    });
  }

  const verticalCurveRowIndex = rowDefinitions.findIndex((row) => row.key === "verticalCurve");
  if (verticalCurveRowIndex >= 0) {
    const rowY = bandBounds.minY + verticalCurveRowIndex * rowHeight;
    const midY = rowY + rowHeight / 2;
    for (const segment of result.vertical.segments) {
      if (segment.pvcPhysicalDistance === undefined || segment.pvtPhysicalDistance === undefined) {
        continue;
      }
      const xStart = stationColumnPaperX(
        bandBounds,
        segment.pvcPhysicalDistance,
        startDistance,
        mmPerMeter,
      );
      const xEnd = stationColumnPaperX(
        bandBounds,
        segment.pvtPhysicalDistance,
        startDistance,
        mmPerMeter,
      );
      const slash = Math.min(rowHeight * 0.35, 2.2);
      layer.primitives.push({
        kind: "polyline",
        id: `band-vc-baseline-${segment.id}`,
        points: [createPoint2(xStart, midY), createPoint2(xEnd, midY)],
      });
      layer.primitives.push({
        kind: "polyline",
        id: `band-vc-bvc-${segment.id}`,
        points: [
          createPoint2(xStart, rowY + 0.4),
          createPoint2(xStart, rowY + rowHeight - 0.4),
        ],
      });
      layer.primitives.push({
        kind: "polyline",
        id: `band-vc-evc-${segment.id}`,
        points: [
          createPoint2(xEnd, rowY + 0.4),
          createPoint2(xEnd, rowY + rowHeight - 0.4),
        ],
      });
      // Slash marks at BVC / EVC (Japanese-style vertical-curve interval markers).
      layer.primitives.push({
        kind: "polyline",
        id: `band-vc-slash-start-${segment.id}`,
        points: [
          createPoint2(xStart - slash * 0.2, midY - slash),
          createPoint2(xStart + slash * 0.8, midY + slash),
        ],
      });
      layer.primitives.push({
        kind: "polyline",
        id: `band-vc-slash-end-${segment.id}`,
        points: [
          createPoint2(xEnd - slash * 0.2, midY - slash),
          createPoint2(xEnd + slash * 0.8, midY + slash),
        ],
      });
      if (segment.pviPhysicalDistance !== undefined) {
        const xPvi = stationColumnPaperX(
          bandBounds,
          segment.pviPhysicalDistance,
          startDistance,
          mmPerMeter,
        );
        layer.primitives.push({
          kind: "text",
          id: `band-vc-pvi-${segment.id}`,
          position: createPoint2(xPvi, midY + valueHeight * 0.2),
          value: `PVI ${formatStationPlanNotation(segment.pviPhysicalDistance)}`,
          heightMm: Math.max(valueHeight - 0.2, 1.6),
          alignment: "center",
        });
      }
      const lengthM = segment.endPhysicalDistance - segment.startPhysicalDistance;
      layer.primitives.push({
        kind: "text",
        id: `band-vc-length-${segment.id}`,
        position: createPoint2((xStart + xEnd) / 2, midY - valueHeight * 0.85),
        value: `L=${lengthM.toFixed(1)}`,
        heightMm: Math.max(valueHeight - 0.3, 1.5),
        alignment: "center",
      });
    }
  }

  const dataRight = geometryDataOriginX(bandBounds) + (endDistance - startDistance) * mmPerMeter;
  layer.primitives.push({
    kind: "polyline",
    id: "profile-band-data-frame",
    points: [
      createPoint2(geometryDataOriginX(bandBounds), bandBounds.minY),
      createPoint2(dataRight, bandBounds.minY),
      createPoint2(dataRight, bandBounds.minY + rowDefinitions.length * rowHeight),
      createPoint2(geometryDataOriginX(bandBounds), bandBounds.minY + rowDefinitions.length * rowHeight),
      createPoint2(geometryDataOriginX(bandBounds), bandBounds.minY),
    ],
  });
  return layer;
}

function buildCrossSectionViewport(
  context: BuildDrawingContext,
  selectedStation: number | undefined,
): DrawingViewport {
  const geometryLayer = createEmptyDrawingLayer("cross-section-layer", CAD_LAYER_PRESETS.CROSS_SHAPE.name);
  geometryLayer.style = {
    ...drawingStyleFromCadPreset(CAD_LAYER_PRESETS.CROSS_SHAPE),
    strokeWidthMm: FORMAL_DRAWING_LAYOUT.geometryStrokeWidthMm,
  };
  const centerlineLayer = createEmptyDrawingLayer(
    "cross-section-centerline-layer",
    CAD_LAYER_PRESETS.CROSS_CENTER.name,
  );
  centerlineLayer.style = {
    ...drawingStyleFromCadPreset(CAD_LAYER_PRESETS.CROSS_CENTER),
    strokeWidthMm: FORMAL_DRAWING_LAYOUT.crossSectionCenterlineStrokeWidthMm,
  };

  const section = closestSection(context.result.sections, selectedStation);
  let sectionZMin = 0;
  let sectionZMax = 0;
  if (section) {
    const sectionPoints = section.points.map((point) => createPoint2(point.offset, point.z));
    // Ensure a drawable shape even when only the center offset exists.
    const shapePoints =
      sectionPoints.length >= 2
        ? sectionPoints
        : sectionPoints.length === 1
          ? [
              createPoint2(sectionPoints[0]!.x - 1, sectionPoints[0]!.y),
              sectionPoints[0]!,
              createPoint2(sectionPoints[0]!.x + 1, sectionPoints[0]!.y),
            ]
          : [];
    if (shapePoints.length >= 2) {
      const sectionPolyline: DrawingPolyline = {
        kind: "polyline",
        id: `cross-section-${section.id}`,
        points: shapePoints,
      };
      geometryLayer.primitives.push(sectionPolyline);
    }
    const sectionZs = section.points.map((point) => point.z);
    sectionZMin = sectionZs.length > 0 ? Math.min(...sectionZs) : 0;
    sectionZMax = sectionZs.length > 0 ? Math.max(...sectionZs) : 0;
    geometryLayer.primitives.push({
      kind: "text",
      id: `cross-section-title-${section.id}`,
      position: createPoint2(section.leftEdge.offset, section.leftEdge.z + 1.5),
      value: `${formatStationDisplay(section.displayedStation)}  ${crossfallModeLabel(section.crossfall)}`,
      heightMm: FORMAL_DRAWING_LAYOUT.crossSectionTitleTextHeightMm,
    });
    geometryLayer.primitives.push({
      kind: "text",
      id: `cross-section-pivot-${section.id}`,
      position: createPoint2(section.crossfall.pivotDistance, section.leftEdge.z - 1),
      value: `${ja.liner.fields.crossfallPivotDistance}: ${section.crossfall.pivotDistance.toFixed(2)}`,
      heightMm: FORMAL_DRAWING_LAYOUT.crossSectionAnnotationTextHeightMm,
    });
    for (const point of section.points) {
      geometryLayer.primitives.push({
        kind: "text",
        id: `cross-section-point-label-${point.id}`,
        position: createPoint2(point.offset, point.z + 0.5),
        value: point.label ?? `${point.offset.toFixed(2)}, ${point.z.toFixed(2)}`,
        heightMm: FORMAL_DRAWING_LAYOUT.crossSectionAnnotationTextHeightMm,
      });
    }
  }

  const centerlinePadding = 1.5;
  const centerlineTop = sectionZMax + centerlinePadding;
  const centerlineBottom = sectionZMin - centerlinePadding;
  centerlineLayer.primitives.push({
    kind: "line",
    id: "cross-section-centerline",
    start: createPoint2(0, centerlineBottom),
    end: createPoint2(0, centerlineTop),
  });
  centerlineLayer.primitives.push({
    kind: "text",
    id: "cross-section-centerline-label",
    position: createPoint2(0.8, centerlineTop + 0.8),
    value: ja.liner.formalDrawing.centerlineLabel,
    heightMm: FORMAL_DRAWING_LAYOUT.crossSectionAnnotationTextHeightMm,
  });

  const primitivePoints = [...geometryLayer.primitives, ...centerlineLayer.primitives].flatMap((primitive) => {
    if (primitive.kind === "polyline") {
      return primitive.points;
    }
    if (primitive.kind === "line") {
      return [primitive.start, primitive.end];
    }
    if (primitive.kind === "text") {
      return [primitive.position];
    }
    return [];
  });
  const rawBounds = boundsFromPoints2(primitivePoints);
  const modelBounds = expandBounds(rawBounds, 1.5, 1.5);
  const paperBounds = paperContentBoundsMm(getPaperForKind(context.settings, "cross_section"));
  return {
    id: "cross-section-viewport",
    kind: "cross_section",
    modelBounds,
    paperBounds,
    transform: fitTransform(modelBounds, paperBounds),
    layers: [centerlineLayer, geometryLayer],
  };
}

function buildProfileViewports(context: BuildDrawingContext): DrawingViewport[] {
  const paper = getPaperForKind(context.settings, "profile");
  const { geometryBounds, bandBounds } = sheetRegionsForKind(paper, "profile");
  const profileLayer = buildProfileLayer(context.result);
  const minX = context.result.stations.entries[0]?.physicalDistance ?? 0;
  const maxX =
    context.result.stations.entries.at(-1)?.physicalDistance ?? context.result.horizontal.totalLength;
  const profileBounds = longitudinalFitBounds(minX, maxX, profileLayer, 1);
  const startDistance = minX;
  const endDistance = maxX;
  const mmPerMeter = horizontalScaleMmPerMeter(
    endDistance - startDistance,
    geometryDrawableWidthMm(geometryBounds),
  );
  const geometryTransform = fitTransformLongitudinal(
    profileBounds,
    geometryBounds,
    startDistance,
    mmPerMeter,
    {
      minModelHeightM: FORMAL_DRAWING_LAYOUT.minElevationSpanM,
    },
  );
  const annotationLayer = buildProfileAnnotationLayerPaper(
    context.result,
    geometryTransform,
    geometryBounds,
  );
  const bandLayer = buildProfileBandLayerPaper(context.result, bandBounds, mmPerMeter);
  return [
    {
      id: "profile-viewport",
      kind: "profile",
      modelBounds: profileBounds,
      paperBounds: geometryBounds,
      transform: geometryTransform,
      layers: [profileLayer, annotationLayer],
      stationAxisId: context.settings.stationAxes[0]?.id,
    },
    {
      id: "band-viewport",
      kind: "band",
      modelBounds: bandBounds,
      paperBounds: bandBounds,
      transform: identityPaperTransform(),
      layers: [bandLayer],
      stationAxisId: context.settings.stationAxes[0]?.id,
    },
  ];
}

function buildBandViewport(context: BuildDrawingContext): DrawingViewport {
  const paper = getPaperForKind(context.settings, "band");
  const bandBounds = paperContentBoundsMm(paper);
  const startDistance = context.result.stations.entries[0]?.physicalDistance ?? 0;
  const endDistance =
    context.result.stations.entries.at(-1)?.physicalDistance ?? context.result.horizontal.totalLength;
  const mmPerMeter = horizontalScaleMmPerMeter(
    endDistance - startDistance,
    geometryDrawableWidthMm(bandBounds),
  );
  const layer = buildProfileBandLayerPaper(context.result, bandBounds, mmPerMeter);
  return {
    id: "band-viewport",
    kind: "band",
    modelBounds: bandBounds,
    paperBounds: bandBounds,
    transform: identityPaperTransform(),
    layers: [layer],
    stationAxisId: context.settings.stationAxes[0]?.id,
  };
}

function buildSheet(
  id: string,
  name: string,
  paper: DrawingSheet["paper"],
  viewports: DrawingViewport[],
): DrawingSheet {
  return {
    id,
    name,
    paper,
    viewports,
  };
}

function emptyOutput(
  kind: DrawingViewport["kind"],
  context: BuildDrawingContext,
): DrawingBuilderOutput {
  return {
    sheet: buildSheet(
      `${kind}-sheet`,
      kind,
      getPaperForKind(context.settings, kind),
      [
        {
          id: `${kind}-viewport`,
          kind,
          modelBounds: createEmptyBounds2(),
          paperBounds: paperContentBoundsMm(getPaperForKind(context.settings, kind)),
          transform: fitTransform(createEmptyBounds2(), paperContentBoundsMm(getPaperForKind(context.settings, kind))),
          layers: [createEmptyDrawingLayer(`${kind}-layer`)],
        },
      ],
    ),
    diagnostics: [
      createDrawingDiagnostic("info", "DRAWING_BUILDER_EMPTY", `No primitives were generated for ${kind}.`, {
        source: kind,
      }),
    ],
  };
}

export function createPlanDrawingBuilder(): DrawingBuilder {
  return {
    kind: "plan",
    build(context: BuildDrawingContext): DrawingBuilderOutput {
      if (context.result.horizontal.sampledPoints.length < 2) {
        return emptyOutput("plan", context);
      }
      if (context.settings.planType === "centerline_only") {
        return buildCenterlineOnlyPlanOutput(context);
      }
      const sheet = buildSheet(
        "plan-sheet",
        "plan",
        getPaperForKind(context.settings, "plan"),
        buildPlanViewports(context),
      );
      return { sheet, diagnostics: [] };
    },
  };
}

export function createProfileDrawingBuilder(): DrawingBuilder {
  return {
    kind: "profile",
    build(context: BuildDrawingContext): DrawingBuilderOutput {
      if (context.result.sections.length === 0) {
        return emptyOutput("profile", context);
      }
      const sheet = buildSheet(
        "profile-sheet",
        "profile",
        getPaperForKind(context.settings, "profile"),
        buildProfileViewports(context),
      );
      return { sheet, diagnostics: [] };
    },
  };
}

export function createCrossSectionDrawingBuilder(
  selectedStation?: number,
): DrawingBuilder {
  return {
    kind: "cross_section",
    build(context: BuildDrawingContext): DrawingBuilderOutput {
      if (context.result.sections.length === 0) {
        return emptyOutput("cross_section", context);
      }
      const sheet = buildSheet(
        "cross_section-sheet",
        "cross_section",
        getPaperForKind(context.settings, "cross_section"),
        [buildCrossSectionViewport(context, selectedStation)],
      );
      return { sheet, diagnostics: [] };
    },
  };
}

export function createBandDrawingBuilder(): DrawingBuilder {
  return {
    kind: "band",
    build(context: BuildDrawingContext): DrawingBuilderOutput {
      if (context.result.sections.length === 0) {
        return emptyOutput("band", context);
      }
      const sheet = buildSheet(
        "band-sheet",
        "band",
        getPaperForKind(context.settings, "band"),
        [buildBandViewport(context)],
      );
      return { sheet, diagnostics: [] };
    },
  };
}

export function buildDrawingDocument(
  sheet: DrawingSheet,
  settings: DrawingSettings,
  diagnostics: readonly ReturnType<typeof createDrawingDiagnostic>[],
): DrawingDocument {
  return {
    version: settings.version,
    sheets: [sheet],
    diagnostics: [...diagnostics],
    stationAxes: [...settings.stationAxes],
  };
}
