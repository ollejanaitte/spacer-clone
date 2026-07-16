import { ja } from "../../../i18n/ja";
import type {
  AlignmentSamplePoint,
  CanonicalLinerIntermediateResult,
  HorizontalSegmentResult,
} from "../../core/types";
import {
  formatStationPlanNotation,
  isMajorStationDistance,
} from "../../core/station/stationFormat";
import {
  CAD_LAYER_PRESETS,
  drawingStyleFromCadPreset,
} from "../../dxf/presets/cadLayerPresets";
import { createDrawingDiagnostic } from "../model/diagnostics";
import { createEmptyDrawingLayer, type DrawingLayer, type DrawingViewport } from "../model/document";
import { boundsFromPoints2, createPoint2, type Point2 } from "../model/geometry";
import { paperContentBoundsMm } from "../model/paper";
import type { DrawingPrimitive } from "../model/primitives";
import { fitViewportTransform2 } from "../transforms/viewportTransform";
import { FORMAL_DRAWING_LAYOUT, sheetRegionsForKind } from "./formalPaperLayout";
import {
  appendBridgeLayoutBandRows,
  appendBridgeLayoutGeometry,
  appendBridgeLayoutModelAnnotations,
  bridgeLayoutGeometryPoints,
  hasBridgeLayout,
} from "./bridgeLayoutDrawing";
import { appendAlignmentSegmentDimensions } from "../dimensions/alignmentSegmentDimensions";
import { appendPlanCoordinateTablePaper } from "../tables/planCoordinateTable";
import type { BuildDrawingContext, DrawingBuilderOutput } from "./types";
import { getPaperForKind } from "./types";

const MAJOR_STATION_M = 100;
const MINOR_STATION_M = 20;
const MAJOR_CIRCLE_RADIUS_M = 1.2;
const MINOR_CIRCLE_RADIUS_M = 0.7;
const LABEL_OFFSET_M = 3.5;

export function buildCenterlineOnlyPlanOutput(context: BuildDrawingContext): DrawingBuilderOutput {
  if (context.result.horizontal.sampledPoints.length < 2) {
    return {
      sheet: {
        id: "plan-sheet",
        name: "plan-centerline",
        paper: getPaperForKind(context.settings, "plan"),
        viewports: [],
      },
      diagnostics: [
        createDrawingDiagnostic("info", "DRAWING_BUILDER_EMPTY", "No centerline samples for Type B plan.", {
          source: "plan",
        }),
      ],
    };
  }

  const origin = resolveStationZeroOrigin(context.result);
  const toLocal = (point: Point2): Point2 => createPoint2(point.x - origin.x, point.y - origin.y);
  const paper = getPaperForKind(context.settings, "plan");
  const { geometryBounds, bandBounds } = sheetRegionsForKind(paper, "plan");

  const geometryLayer = buildCenterlineGeometryLayer(context.result, toLocal);
  appendAlignmentSegmentDimensions(geometryLayer, context.result, toLocal);
  const annotationLayer = buildCenterlineAnnotationLayer(context.result, toLocal);
  const coordinateLayer = createEmptyDrawingLayer(
    "plan-coordinate-table-layer",
    CAD_LAYER_PRESETS.PLAN_TEXT.name,
  );
  coordinateLayer.coordinateSpace = "paper";
  coordinateLayer.style = drawingStyleFromCadPreset(CAD_LAYER_PRESETS.PLAN_TEXT);
  appendPlanCoordinateTablePaper(coordinateLayer, context.result, geometryBounds, toLocal);
  const bandLayer = buildCenterlineBandLayer(context.result, bandBounds);

  const modelPoints = geometryLayer.primitives.flatMap((primitive) => primitivePoints(primitive));
  const modelBounds = expandBounds(boundsFromPoints2([...modelPoints, ...bridgeLayoutGeometryPoints(context.result)]), 4, 4);
  const geometryTransform = fitViewportTransform2(modelBounds, geometryBounds, {
    marginMm: paper.marginMm,
    invertY: true,
  });

  const viewports: DrawingViewport[] = [
    {
      id: "plan-centerline-viewport",
      kind: "plan",
      modelBounds,
      paperBounds: geometryBounds,
      transform: geometryTransform,
      layers: [geometryLayer, annotationLayer, coordinateLayer],
      stationAxisId: context.settings.stationAxes[0]?.id,
    },
    {
      id: "plan-centerline-band-viewport",
      kind: "band",
      modelBounds: bandBounds,
      paperBounds: bandBounds,
      transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      layers: [bandLayer],
      stationAxisId: context.settings.stationAxes[0]?.id,
    },
  ];

  return {
    sheet: {
      id: "plan-sheet",
      name: "plan-centerline",
      paper,
      viewports,
    },
    diagnostics: [],
  };
}

function resolveStationZeroOrigin(result: CanonicalLinerIntermediateResult): Point2 {
  const atZero = result.horizontal.sampledPoints.find(
    (sample) => Math.abs(sample.physicalDistance) <= 1e-6,
  );
  if (atZero) {
    return createPoint2(atZero.x, atZero.y);
  }
  const first = result.horizontal.sampledPoints[0]!;
  return createPoint2(first.x, first.y);
}

function buildCenterlineGeometryLayer(
  result: CanonicalLinerIntermediateResult,
  toLocal: (point: Point2) => Point2,
): DrawingLayer {
  const layer = createEmptyDrawingLayer("plan-layer", CAD_LAYER_PRESETS.PLAN_CENTER.name);
  layer.style = {
    ...drawingStyleFromCadPreset(CAD_LAYER_PRESETS.PLAN_CENTER),
    strokeWidthMm: FORMAL_DRAWING_LAYOUT.geometryStrokeWidthMm,
  };

  const centerlinePoints = result.horizontal.sampledPoints.map((sample) =>
    toLocal(createPoint2(sample.x, sample.y)),
  );
  if (centerlinePoints.length >= 2) {
    layer.primitives.push({
      kind: "polyline",
      id: "plan-type-b-centerline",
      points: centerlinePoints,
    });
  }

  for (const distance of collectStationDistances(result.horizontal.totalLength)) {
    const sample = sampleAt(result, distance);
    if (!sample) {
      continue;
    }
    const center = toLocal(createPoint2(sample.x, sample.y));
    const major = isMajorStationDistance(distance, MAJOR_STATION_M);
    layer.primitives.push({
      kind: "circle",
      id: `plan-type-b-station-circle-${distance}`,
      center,
      radius: major ? MAJOR_CIRCLE_RADIUS_M : MINOR_CIRCLE_RADIUS_M,
    });
    if (major) {
      layer.primitives.push({
        kind: "circle",
        id: `plan-type-b-station-circle-outer-${distance}`,
        center,
        radius: MAJOR_CIRCLE_RADIUS_M * 1.55,
      });
    }
  }

  appendCurveMarkers(layer, result, toLocal);
  if (hasBridgeLayout(result)) {
    const bridgeLayer = createEmptyDrawingLayer("plan-bridge-layer");
    appendBridgeLayoutGeometry(bridgeLayer, result);
    for (const primitive of bridgeLayer.primitives) {
      if (primitive.kind === "line") {
        layer.primitives.push({
          ...primitive,
          start: toLocal(primitive.start),
          end: toLocal(primitive.end),
        });
      } else if (primitive.kind === "polyline") {
        layer.primitives.push({
          ...primitive,
          points: primitive.points.map((point) => toLocal(point)),
        });
      }
    }
  }
  return layer;
}

function buildCenterlineAnnotationLayer(
  result: CanonicalLinerIntermediateResult,
  toLocal: (point: Point2) => Point2,
): DrawingLayer {
  const layer = createEmptyDrawingLayer("plan-annotation-layer", CAD_LAYER_PRESETS.PLAN_TEXT.name);
  layer.style = drawingStyleFromCadPreset(CAD_LAYER_PRESETS.PLAN_TEXT);

  let labelIndex = 0;
  for (const distance of collectStationDistances(result.horizontal.totalLength)) {
    const sample = sampleAt(result, distance);
    if (!sample) {
      continue;
    }
    const center = toLocal(createPoint2(sample.x, sample.y));
    const normal = stationLabelOffset(sample, labelIndex);
    layer.primitives.push({
      kind: "text",
      id: `plan-type-b-station-label-${distance}`,
      position: createPoint2(center.x + normal.x, center.y + normal.y),
      value: formatStationPlanNotation(distance, MAJOR_STATION_M),
      heightMm: isMajorStationDistance(distance, MAJOR_STATION_M)
        ? FORMAL_DRAWING_LAYOUT.planAnnotationTextHeightMm
        : FORMAL_DRAWING_LAYOUT.planAnnotationTextHeightMm - 1,
      alignment: "center",
    });
    labelIndex += 1;
  }

  for (const segment of result.horizontal.segments) {
    if (segment.type === "straight") {
      continue;
    }
    appendSegmentLabels(layer, result, segment, toLocal);
  }

  for (const [index, pi] of result.horizontal.piPoints.entries()) {
    const local = toLocal(createPoint2(pi.x, pi.y));
    layer.primitives.push({
      kind: "text",
      id: `plan-type-b-ip-${pi.id}`,
      position: createPoint2(local.x, local.y + LABEL_OFFSET_M + index * 0.2),
      value: ja.liner.formalDrawing.planCurvePoints.ip,
      heightMm: FORMAL_DRAWING_LAYOUT.planAnnotationTextHeightMm,
      alignment: "center",
    });
  }

  const start = sampleAt(result, 0);
  const end = sampleAt(result, result.horizontal.totalLength);
  if (start) {
    const local = toLocal(createPoint2(start.x, start.y));
    layer.primitives.push({
      kind: "text",
      id: "plan-type-b-bp",
      position: createPoint2(local.x - LABEL_OFFSET_M, local.y - LABEL_OFFSET_M),
      value: ja.liner.formalDrawing.planCurvePoints.bp,
      heightMm: FORMAL_DRAWING_LAYOUT.planAnnotationTextHeightMm,
    });
  }
  if (end) {
    const local = toLocal(createPoint2(end.x, end.y));
    layer.primitives.push({
      kind: "text",
      id: "plan-type-b-ep",
      position: createPoint2(local.x + LABEL_OFFSET_M, local.y - LABEL_OFFSET_M),
      value: ja.liner.formalDrawing.planCurvePoints.ep,
      heightMm: FORMAL_DRAWING_LAYOUT.planAnnotationTextHeightMm,
    });
  }

  if (hasBridgeLayout(result)) {
    const bridgeLayer = createEmptyDrawingLayer("plan-bridge-annotation-layer");
    appendBridgeLayoutModelAnnotations(bridgeLayer, result);
    for (const primitive of bridgeLayer.primitives) {
      if (primitive.kind === "text") {
        layer.primitives.push({
          ...primitive,
          position: toLocal(primitive.position),
        });
      }
    }
  }

  return layer;
}

function buildCenterlineBandLayer(
  result: CanonicalLinerIntermediateResult,
  bandBounds: { minX: number; minY: number; maxX: number; maxY: number },
): DrawingLayer {
  const layer = createEmptyDrawingLayer("plan-band-layer", CAD_LAYER_PRESETS.PLAN_BAND.name);
  layer.coordinateSpace = "paper";
  layer.style = {
    ...drawingStyleFromCadPreset(CAD_LAYER_PRESETS.PLAN_BAND),
    strokeWidthMm: FORMAL_DRAWING_LAYOUT.bandStrokeWidthMm,
  };

  const width = bandBounds.maxX - bandBounds.minX;
  const height = bandBounds.maxY - bandBounds.minY;
  const rows = 4;
  const rowHeight = height / rows;
  const totalLength = Math.max(result.horizontal.totalLength, 1);

  layer.primitives.push({
    kind: "polyline",
    id: "plan-type-b-band-frame",
    closed: true,
    points: [
      createPoint2(bandBounds.minX, bandBounds.minY),
      createPoint2(bandBounds.maxX, bandBounds.minY),
      createPoint2(bandBounds.maxX, bandBounds.maxY),
      createPoint2(bandBounds.minX, bandBounds.maxY),
    ],
  });

  for (let row = 1; row < rows; row += 1) {
    const y = bandBounds.minY + row * rowHeight;
    layer.primitives.push({
      kind: "line",
      id: `plan-type-b-band-h-${row}`,
      start: createPoint2(bandBounds.minX, y),
      end: createPoint2(bandBounds.maxX, y),
    });
  }

  const labels = [
    ja.liner.formalDrawing.planBandRows.station,
    ja.liner.formalDrawing.planBandRows.element,
    ja.liner.formalDrawing.planBandRows.radius,
    ja.liner.formalDrawing.planBandRows.clothoid,
  ];
  for (const [index, label] of labels.entries()) {
    layer.primitives.push({
      kind: "text",
      id: `plan-type-b-band-label-${index}`,
      position: createPoint2(bandBounds.minX + 4, bandBounds.minY + (index + 0.65) * rowHeight),
      value: label,
      heightMm: FORMAL_DRAWING_LAYOUT.bandLabelTextHeightMm,
    });
  }

  for (const segment of result.horizontal.segments) {
    const x0 = bandBounds.minX + FORMAL_DRAWING_LAYOUT.labelColumnWidthMm
      + (segment.startPhysicalDistance / totalLength) * (width - FORMAL_DRAWING_LAYOUT.labelColumnWidthMm);
    const x1 = bandBounds.minX + FORMAL_DRAWING_LAYOUT.labelColumnWidthMm
      + (segment.endPhysicalDistance / totalLength) * (width - FORMAL_DRAWING_LAYOUT.labelColumnWidthMm);
    layer.primitives.push({
      kind: "line",
      id: `plan-type-b-band-seg-${segment.id}`,
      start: createPoint2(x0, bandBounds.minY),
      end: createPoint2(x0, bandBounds.maxY),
    });
    const midX = (x0 + x1) / 2;
    layer.primitives.push({
      kind: "text",
      id: `plan-type-b-band-type-${segment.id}`,
      position: createPoint2(midX, bandBounds.minY + 1.65 * rowHeight),
      value: segmentTypeLabel(segment),
      heightMm: FORMAL_DRAWING_LAYOUT.bandValueTextHeightMm,
      alignment: "center",
    });
    if (segment.type === "arc") {
      const radius = segment.startCurvature === 0 ? "—" : `R=${(1 / Math.abs(segment.startCurvature)).toFixed(1)}`;
      layer.primitives.push({
        kind: "text",
        id: `plan-type-b-band-r-${segment.id}`,
        position: createPoint2(midX, bandBounds.minY + 2.65 * rowHeight),
        value: radius,
        heightMm: FORMAL_DRAWING_LAYOUT.bandValueTextHeightMm,
        alignment: "center",
      });
      layer.primitives.push({
        kind: "text",
        id: `plan-type-b-band-bc-ec-${segment.id}`,
        position: createPoint2(midX, bandBounds.minY + 0.65 * rowHeight),
        value: `${ja.liner.formalDrawing.planCurvePoints.bc}/${ja.liner.formalDrawing.planCurvePoints.sp}/${ja.liner.formalDrawing.planCurvePoints.ec}`,
        heightMm: FORMAL_DRAWING_LAYOUT.bandValueTextHeightMm - 1,
        alignment: "center",
      });
    }
    if (segment.type === "clothoid") {
      layer.primitives.push({
        kind: "text",
        id: `plan-type-b-band-ka-ke-${segment.id}`,
        position: createPoint2(midX, bandBounds.minY + 3.65 * rowHeight),
        value: `${ja.liner.formalDrawing.planCurvePoints.ka}/${ja.liner.formalDrawing.planCurvePoints.ke}`,
        heightMm: FORMAL_DRAWING_LAYOUT.bandValueTextHeightMm,
        alignment: "center",
      });
    }
  }

  return layer;
}

function appendCurveMarkers(
  layer: DrawingLayer,
  result: CanonicalLinerIntermediateResult,
  toLocal: (point: Point2) => Point2,
): void {
  for (const segment of result.horizontal.segments) {
    if (segment.type === "straight") {
      continue;
    }
    for (const boundary of ["start", "end"] as const) {
      const distance = boundary === "start" ? segment.startPhysicalDistance : segment.endPhysicalDistance;
      const sample = sampleAt(result, distance);
      if (!sample) {
        continue;
      }
      const center = toLocal(createPoint2(sample.x, sample.y));
      layer.primitives.push({
        kind: "line",
        id: `plan-type-b-curve-tick-${segment.id}-${boundary}`,
        start: createPoint2(center.x, center.y - 2),
        end: createPoint2(center.x, center.y + 2),
      });
    }
    if (segment.type === "arc") {
      const midDistance = (segment.startPhysicalDistance + segment.endPhysicalDistance) / 2;
      const sample = sampleAt(result, midDistance);
      if (sample) {
        const center = toLocal(createPoint2(sample.x, sample.y));
        layer.primitives.push({
          kind: "circle",
          id: `plan-type-b-sp-${segment.id}`,
          center,
          radius: MINOR_CIRCLE_RADIUS_M,
        });
      }
    }
  }
}

function appendSegmentLabels(
  layer: DrawingLayer,
  result: CanonicalLinerIntermediateResult,
  segment: HorizontalSegmentResult,
  toLocal: (point: Point2) => Point2,
): void {
  const start = sampleAt(result, segment.startPhysicalDistance);
  const end = sampleAt(result, segment.endPhysicalDistance);
  if (start) {
    const local = toLocal(createPoint2(start.x, start.y));
    layer.primitives.push({
      kind: "text",
      id: `plan-type-b-label-${segment.id}-start`,
      position: createPoint2(local.x - 1.5, local.y + LABEL_OFFSET_M),
      value:
        segment.type === "arc"
          ? ja.liner.formalDrawing.planCurvePoints.bc
          : ja.liner.formalDrawing.planCurvePoints.ka,
      heightMm: FORMAL_DRAWING_LAYOUT.planAnnotationTextHeightMm,
    });
  }
  if (end) {
    const local = toLocal(createPoint2(end.x, end.y));
    layer.primitives.push({
      kind: "text",
      id: `plan-type-b-label-${segment.id}-end`,
      position: createPoint2(local.x + 1.5, local.y + LABEL_OFFSET_M),
      value:
        segment.type === "arc"
          ? ja.liner.formalDrawing.planCurvePoints.ec
          : ja.liner.formalDrawing.planCurvePoints.ke,
      heightMm: FORMAL_DRAWING_LAYOUT.planAnnotationTextHeightMm,
    });
  }
  if (segment.type === "arc") {
    const midDistance = (segment.startPhysicalDistance + segment.endPhysicalDistance) / 2;
    const mid = sampleAt(result, midDistance);
    if (mid) {
      const local = toLocal(createPoint2(mid.x, mid.y));
      layer.primitives.push({
        kind: "text",
        id: `plan-type-b-label-${segment.id}-sp`,
        position: createPoint2(local.x, local.y - LABEL_OFFSET_M),
        value: ja.liner.formalDrawing.planCurvePoints.sp,
        heightMm: FORMAL_DRAWING_LAYOUT.planAnnotationTextHeightMm,
        alignment: "center",
      });
      if (segment.startCurvature !== 0) {
        const radius = 1 / Math.abs(segment.startCurvature);
        layer.primitives.push({
          kind: "text",
          id: `plan-type-b-label-${segment.id}-r`,
          position: createPoint2(local.x, local.y - LABEL_OFFSET_M * 1.8),
          value: `R=${radius.toFixed(1)}`,
          heightMm: FORMAL_DRAWING_LAYOUT.planAnnotationTextHeightMm - 1,
          alignment: "center",
        });
      }
    }
  }
}

function collectStationDistances(totalLength: number): number[] {
  const distances: number[] = [];
  for (let distance = 0; distance <= totalLength + 1e-9; distance += MINOR_STATION_M) {
    distances.push(Number(distance.toFixed(6)));
  }
  if (distances.length === 0 || Math.abs(distances[distances.length - 1]! - totalLength) > 1e-6) {
    distances.push(Number(totalLength.toFixed(6)));
  }
  return distances;
}

function sampleAt(
  result: CanonicalLinerIntermediateResult,
  physicalDistance: number,
): AlignmentSamplePoint | undefined {
  let best: AlignmentSamplePoint | undefined;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const sample of result.horizontal.sampledPoints) {
    const delta = Math.abs(sample.physicalDistance - physicalDistance);
    if (delta < bestDelta) {
      best = sample;
      bestDelta = delta;
    }
  }
  return bestDelta <= MINOR_STATION_M / 2 + 1e-6 ? best : best;
}

function stationLabelOffset(sample: AlignmentSamplePoint, index: number): Point2 {
  const side = index % 2 === 0 ? 1 : -1;
  const nx = -Math.sin(sample.azimuth) * LABEL_OFFSET_M * side;
  const ny = Math.cos(sample.azimuth) * LABEL_OFFSET_M * side;
  return createPoint2(nx, ny);
}

function segmentTypeLabel(segment: HorizontalSegmentResult): string {
  if (segment.type === "arc") {
    return ja.liner.fields.elementTypes.arc;
  }
  if (segment.type === "clothoid") {
    return ja.liner.fields.elementTypes.clothoid;
  }
  return ja.liner.fields.elementTypes.straight;
}

function primitivePoints(primitive: DrawingPrimitive): Point2[] {
  if (primitive.kind === "line") {
    return [primitive.start, primitive.end];
  }
  if (primitive.kind === "polyline") {
    return [...primitive.points];
  }
  if (primitive.kind === "arc" || primitive.kind === "circle") {
    return [
      createPoint2(primitive.center.x - primitive.radius, primitive.center.y - primitive.radius),
      createPoint2(primitive.center.x + primitive.radius, primitive.center.y + primitive.radius),
    ];
  }
  if (primitive.kind === "text") {
    return [primitive.position];
  }
  return [primitive.start, primitive.end];
}

function expandBounds(
  bounds: ReturnType<typeof boundsFromPoints2>,
  padX: number,
  padY: number,
) {
  if (bounds.isEmpty) {
    return bounds;
  }
  return {
    minX: bounds.minX - padX,
    minY: bounds.minY - padY,
    maxX: bounds.maxX + padX,
    maxY: bounds.maxY + padY,
    isEmpty: false,
  };
}
