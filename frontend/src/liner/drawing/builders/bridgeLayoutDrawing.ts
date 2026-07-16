import {
  pierLineDirectionFromSkew,
  pierLinePointAtOffset,
} from "../../core/bridge/pierLineGeometry";
import type {
  AlignmentSamplePoint,
  CanonicalLinerIntermediateResult,
  GridPointResult,
  PierResult,
  SpanResult,
} from "../../core/types";
import { ja } from "../../../i18n/ja";
import {
  CAD_LAYER_PRESETS,
  drawingStyleFromCadPreset,
} from "../../dxf/presets/cadLayerPresets";
import { createEmptyDrawingLayer, type DrawingLayer } from "../model/document";
import { createPoint2, type Bounds2, type Point2 } from "../model/geometry";
import type { DrawingViewport } from "../model/document";
import { transformPoint2 } from "../transforms/affineTransform2";
import { FORMAL_DRAWING_LAYOUT } from "./formalPaperLayout";
import { stationColumnPaperX } from "./formalPaperLayout";
import {
  bandRowTextBaselineY,
  clampPlanTextAnchorX,
  clampPlanTextBaselineY,
  effectiveRenderedTextHeightMm,
  ellipsisToWidth,
  planTextBoxFromAnchor,
  planViewportScreenScale,
  resolvePlanTextBaselineY,
} from "../rendering/screenTextLayout";
import { PLAN_LAYOUT_VIEWPORT_PX } from "../rendering/screenTextLayout";

const DEFAULT_SUPPORT_HALF_WIDTH_M = 8;
const SUPPORT_LINE_EXTENSION_M = 0.5;

export type PlanTextLayoutContext = {
  viewportWidthPx: number;
  drawableWidthMm: number;
  paperWidthMm: number;
};

export function hasBridgeLayout(result: CanonicalLinerIntermediateResult): boolean {
  return result.spans.length > 0 || result.piers.length > 0;
}

export function sampleAlignmentAt(
  result: CanonicalLinerIntermediateResult,
  physicalDistance: number,
): AlignmentSamplePoint | null {
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
    ...previous,
    physicalDistance,
    x: previous.x + (next.x - previous.x) * ratio,
    y: previous.y + (next.y - previous.y) * ratio,
    azimuth: previous.azimuth + (next.azimuth - previous.azimuth) * ratio,
    curvature: previous.curvature + (next.curvature - previous.curvature) * ratio,
  };
}

function gridPointById(
  result: CanonicalLinerIntermediateResult,
): Map<string, GridPointResult> {
  return new Map(result.grid.points.map((point) => [point.id, point]));
}

function transverseHalfWidthM(result: CanonicalLinerIntermediateResult): number {
  const offsets = result.grid.points.map((point) => Math.abs(point.offset));
  if (offsets.length === 0) {
    return DEFAULT_SUPPORT_HALF_WIDTH_M;
  }
  return Math.max(...offsets, DEFAULT_SUPPORT_HALF_WIDTH_M / 2) + SUPPORT_LINE_EXTENSION_M;
}

function pierSupportEndpoints(
  result: CanonicalLinerIntermediateResult,
  pier: PierResult,
  pointMap: Map<string, GridPointResult>,
): [Point2, Point2] | null {
  const sample = sampleAlignmentAt(result, pier.physicalDistance);
  if (!sample) {
    return null;
  }

  const supportPoints = pier.supportLinePointIds
    .map((pointId) => pointMap.get(pointId))
    .filter((point): point is GridPointResult => point !== undefined);
  if (supportPoints.length >= 2) {
    const direction = pierLineDirectionFromSkew(sample.azimuth, pier.skewAngleRad);
    const sorted = [...supportPoints].sort((left, right) => {
      const leftAlong =
        (left.x - sample.x) * direction.x + (left.y - sample.y) * direction.y;
      const rightAlong =
        (right.x - sample.x) * direction.x + (right.y - sample.y) * direction.y;
      return leftAlong - rightAlong;
    });
    const first = sorted[0]!;
    const last = sorted.at(-1)!;
    return [createPoint2(first.x, first.y), createPoint2(last.x, last.y)];
  }

  const halfWidth = transverseHalfWidthM(result);
  const start = pierLinePointAtOffset(
    sample,
    sample.azimuth,
    pier.skewAngleRad,
    -halfWidth,
  );
  const end = pierLinePointAtOffset(sample, sample.azimuth, pier.skewAngleRad, halfWidth);
  return [createPoint2(start.x, start.y), createPoint2(end.x, end.y)];
}

function skewAngleDegrees(skewAngleRad: number): string {
  return ((skewAngleRad * 180) / Math.PI).toFixed(1);
}

function spanLengthM(span: SpanResult): number {
  return span.endPhysicalDistance - span.startPhysicalDistance;
}

function pierAtDistance(
  piers: readonly PierResult[],
  physicalDistance: number,
): PierResult | undefined {
  return piers.find((pier) => Math.abs(pier.physicalDistance - physicalDistance) <= 1e-6);
}

export function bridgeLayoutGeometryPoints(
  result: CanonicalLinerIntermediateResult,
): Point2[] {
  if (!hasBridgeLayout(result)) {
    return [];
  }
  const pointMap = gridPointById(result);
  const points: Point2[] = [];
  for (const pier of result.piers) {
    const endpoints = pierSupportEndpoints(result, pier, pointMap);
    if (endpoints) {
      points.push(...endpoints);
    }
    const sample = sampleAlignmentAt(result, pier.physicalDistance);
    if (sample) {
      points.push(createPoint2(sample.x, sample.y));
    }
  }
  for (const span of result.spans) {
    const midpoint = (span.startPhysicalDistance + span.endPhysicalDistance) / 2;
    const sample = sampleAlignmentAt(result, midpoint);
    if (sample) {
      points.push(createPoint2(sample.x, sample.y - 3));
    }
  }
  return points;
}

export function appendBridgeLayoutGeometry(
  layer: DrawingLayer,
  result: CanonicalLinerIntermediateResult,
): void {
  if (!hasBridgeLayout(result)) {
    return;
  }

  const pointMap = gridPointById(result);
  for (const pier of result.piers) {
    const endpoints = pierSupportEndpoints(result, pier, pointMap);
    const sample = sampleAlignmentAt(result, pier.physicalDistance);
    if (!endpoints || !sample) {
      continue;
    }
    layer.primitives.push({
      kind: "line",
      id: `plan-pier-support-${pier.id}`,
      start: endpoints[0],
      end: endpoints[1],
    });
    layer.primitives.push({
      kind: "polyline",
      id: `plan-pier-center-tick-${pier.id}`,
      points: [
        createPoint2(sample.x, sample.y - 2.5),
        createPoint2(sample.x, sample.y + 2.5),
      ],
    });
  }

  for (const span of result.spans) {
    const start = sampleAlignmentAt(result, span.startPhysicalDistance);
    const end = sampleAlignmentAt(result, span.endPhysicalDistance);
    if (!start || !end) {
      continue;
    }
    layer.primitives.push({
      kind: "polyline",
      id: `plan-span-dimension-${span.id}`,
      points: [
        createPoint2(start.x, start.y - 1.2),
        createPoint2(end.x, end.y - 1.2),
      ],
    });
    const tickHalf = 0.8;
    for (const [boundary, sample] of [
      ["start", start] as const,
      ["end", end] as const,
    ]) {
      layer.primitives.push({
        kind: "polyline",
        id: `plan-span-dimension-tick-${span.id}-${boundary}`,
        points: [
          createPoint2(sample.x, sample.y - 1.2 - tickHalf),
          createPoint2(sample.x, sample.y - 1.2 + tickHalf),
        ],
      });
    }
  }
}

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

export function appendBridgeLayoutPaperAnnotations(
  layer: DrawingLayer,
  result: CanonicalLinerIntermediateResult,
  geometryTransform: DrawingViewport["transform"],
  geometryPaperBounds: Bounds2,
  layout: PlanTextLayoutContext,
  placedBoxes: ReturnType<typeof planTextBoxFromAnchor>[],
): void {
  if (!hasBridgeLayout(result)) {
    return;
  }

  const annotationHeight = FORMAL_DRAWING_LAYOUT.planAnnotationTextHeightMm;
  const layoutMajorHeight = planLayoutTextHeightMm(annotationHeight, "major", layout);
  const layoutCurveHeight = planLayoutTextHeightMm(annotationHeight, "curve", layout);
  const yStepMm = layoutMajorHeight + 1.5;

  for (const pier of result.piers) {
    const sample = sampleAlignmentAt(result, pier.physicalDistance);
    if (!sample) {
      continue;
    }
    const pierLabel = ja.liner.formalDrawing.bridgeLayout.pierLabel(pier.id);
    const paperAnchor = transformPoint2(
      geometryTransform,
      createPoint2(sample.x, sample.y + 5),
    );
    const resolvedY = resolvePlanTextBaselineY(
      paperAnchor.x,
      paperAnchor.y,
      pierLabel,
      layoutMajorHeight,
      placedBoxes,
      yStepMm,
      6,
    );
    const clampedX = clampPlanTextAnchorX(
      paperAnchor.x,
      resolvedY,
      pierLabel,
      layoutMajorHeight,
      geometryPaperBounds,
    );
    const clampedY = clampPlanTextBaselineY(
      clampedX,
      resolvedY,
      pierLabel,
      layoutMajorHeight,
      geometryPaperBounds,
    );
    placedBoxes.push(planTextBoxFromAnchor(clampedX, clampedY, pierLabel, layoutMajorHeight));
    layer.primitives.push({
      kind: "text",
      id: `plan-pier-label-${pier.id}`,
      position: createPoint2(clampedX, clampedY),
      value: pierLabel,
      heightMm: annotationHeight,
      alignment: "center",
    });

    const skewValue = ja.liner.formalDrawing.bridgeLayout.skewDegrees(skewAngleDegrees(pier.skewAngleRad));
    const skewAnchor = transformPoint2(
      geometryTransform,
      createPoint2(sample.x, sample.y - 5.5),
    );
    const skewResolvedY = resolvePlanTextBaselineY(
      skewAnchor.x,
      skewAnchor.y,
      skewValue,
      layoutCurveHeight,
      placedBoxes,
      -yStepMm,
      6,
    );
    const skewClampedX = clampPlanTextAnchorX(
      skewAnchor.x,
      skewResolvedY,
      skewValue,
      layoutCurveHeight,
      geometryPaperBounds,
    );
    const skewClampedY = clampPlanTextBaselineY(
      skewClampedX,
      skewResolvedY,
      skewValue,
      layoutCurveHeight,
      geometryPaperBounds,
    );
    placedBoxes.push(planTextBoxFromAnchor(skewClampedX, skewClampedY, skewValue, layoutCurveHeight));
    layer.primitives.push({
      kind: "text",
      id: `plan-pier-skew-${pier.id}`,
      position: createPoint2(skewClampedX, skewClampedY),
      value: skewValue,
      heightMm: annotationHeight,
      alignment: "center",
    });
  }

  for (const span of result.spans) {
    const midpoint = (span.startPhysicalDistance + span.endPhysicalDistance) / 2;
    const sample = sampleAlignmentAt(result, midpoint);
    if (!sample) {
      continue;
    }
    const spanValue = ja.liner.formalDrawing.bridgeLayout.spanLength(spanLengthM(span).toFixed(2));
    const paperAnchor = transformPoint2(
      geometryTransform,
      createPoint2(sample.x, sample.y - 6.5),
    );
    const resolvedY = resolvePlanTextBaselineY(
      paperAnchor.x,
      paperAnchor.y,
      spanValue,
      layoutCurveHeight,
      placedBoxes,
      -yStepMm,
      6,
    );
    const clampedX = clampPlanTextAnchorX(
      paperAnchor.x,
      resolvedY,
      spanValue,
      layoutCurveHeight,
      geometryPaperBounds,
    );
    const clampedY = clampPlanTextBaselineY(
      clampedX,
      resolvedY,
      spanValue,
      layoutCurveHeight,
      geometryPaperBounds,
    );
    placedBoxes.push(planTextBoxFromAnchor(clampedX, clampedY, spanValue, layoutCurveHeight));
    layer.primitives.push({
      kind: "text",
      id: `plan-span-label-${span.id}`,
      position: createPoint2(clampedX, clampedY),
      value: spanValue,
      heightMm: annotationHeight,
      alignment: "center",
    });
  }
}

export function bridgeLayoutBandRowLabels(): string[] {
  return [
    ja.liner.formalDrawing.planBandRows.pier,
    ja.liner.formalDrawing.planBandRows.span,
    ja.liner.formalDrawing.planBandRows.skewAngle,
  ];
}

function pierBandValue(
  result: CanonicalLinerIntermediateResult,
  physicalDistance: number,
): string {
  const pier = pierAtDistance(result.piers, physicalDistance);
  return pier ? pier.id : ja.liner.formalDrawing.bandRows.unavailable;
}

function spanBandValue(
  result: CanonicalLinerIntermediateResult,
  physicalDistance: number,
): string {
  const span = result.spans.find(
    (entry) =>
      physicalDistance >= entry.startPhysicalDistance - 1e-6
      && physicalDistance <= entry.endPhysicalDistance + 1e-6,
  );
  if (!span) {
    return ja.liner.formalDrawing.bandRows.unavailable;
  }
  if (Math.abs(physicalDistance - span.startPhysicalDistance) <= 1e-6) {
    return span.id;
  }
  if (Math.abs(physicalDistance - span.endPhysicalDistance) <= 1e-6) {
    return span.id;
  }
  if (Math.abs(physicalDistance - (span.startPhysicalDistance + span.endPhysicalDistance) / 2) <= 1e-3) {
    return spanLengthM(span).toFixed(2);
  }
  return ja.liner.formalDrawing.bandRows.unavailable;
}

function skewBandValue(
  result: CanonicalLinerIntermediateResult,
  physicalDistance: number,
): string {
  const pier = pierAtDistance(result.piers, physicalDistance);
  if (!pier) {
    return ja.liner.formalDrawing.bandRows.unavailable;
  }
  return skewAngleDegrees(pier.skewAngleRad);
}

export function appendBridgeLayoutBandRows(
  layer: DrawingLayer,
  result: CanonicalLinerIntermediateResult,
  bandBounds: Bounds2,
  mmPerMeter: number,
  layout: PlanTextLayoutContext,
  startDistance: number,
  baseRowIndex: number,
): number {
  if (!hasBridgeLayout(result)) {
    return baseRowIndex;
  }

  const rowHeight = FORMAL_DRAWING_LAYOUT.planRowHeightMm;
  const labelHeight = FORMAL_DRAWING_LAYOUT.bandLabelTextHeightMm;
  const valueHeight = FORMAL_DRAWING_LAYOUT.bandValueTextHeightMm;
  const rowLabels = bridgeLayoutBandRowLabels();
  const labelCharWidthMm = labelHeight * 0.55;
  const labelColumnTextWidthMm = FORMAL_DRAWING_LAYOUT.labelColumnWidthMm - 4;
  const bandCharWidthMm = valueHeight * 0.55;
  const endDistance =
    result.stations.entries.at(-1)?.physicalDistance ?? result.horizontal.totalLength;
  const stationDistances = result.stations.entries.map((station) => station.physicalDistance);
  const minStationGapM =
    stationDistances.length > 1
      ? Math.min(
          ...stationDistances.slice(1).map((distance, index) => distance - stationDistances[index]!),
        )
      : endDistance - startDistance;
  const bandCellWidthMm = Math.max(minStationGapM * mmPerMeter - 1, FORMAL_DRAWING_LAYOUT.minReadableTextHeightMm);
  const layoutValueHeight = planLayoutTextHeightMm(valueHeight, "station", layout);

  const valueResolvers = [pierBandValue, spanBandValue, skewBandValue] as const;

  for (let rowOffset = 0; rowOffset < rowLabels.length; rowOffset += 1) {
    const rowIndex = baseRowIndex + rowOffset;
    const y = bandBounds.minY + rowIndex * rowHeight;
    layer.primitives.push({
      kind: "polyline",
      id: `plan-band-bridge-row-${rowOffset}`,
      points: [
        createPoint2(bandBounds.minX, y),
        createPoint2(bandBounds.maxX - FORMAL_DRAWING_LAYOUT.geometryInsetMm, y),
      ],
    });
    layer.primitives.push({
      kind: "text",
      id: `plan-band-bridge-row-label-${rowOffset}`,
      position: createPoint2(
        bandBounds.minX + 2,
        bandRowTextBaselineY(y, rowHeight, labelHeight),
      ),
      value: ellipsisToWidth(rowLabels[rowOffset]!, labelColumnTextWidthMm, labelCharWidthMm),
      heightMm: labelHeight,
    });

    for (const station of result.stations.entries) {
      const x = stationColumnPaperX(bandBounds, station.physicalDistance, startDistance, mmPerMeter);
      const value = valueResolvers[rowOffset]!(result, station.physicalDistance);
      layer.primitives.push({
        kind: "text",
        id: `plan-band-bridge-value-${rowOffset}-${station.entryId}`,
        position: createPoint2(
          x,
          bandRowTextBaselineY(y, rowHeight, valueHeight),
        ),
        value: ellipsisToWidth(value, bandCellWidthMm, bandCharWidthMm),
        heightMm: valueHeight,
        alignment: "center",
      });
      if (rowOffset === 0) {
        const span = result.spans.find(
          (entry) =>
            Math.abs(station.physicalDistance - (entry.startPhysicalDistance + entry.endPhysicalDistance) / 2)
            <= 1e-3,
        );
        if (span) {
          const midX = stationColumnPaperX(
            bandBounds,
            (span.startPhysicalDistance + span.endPhysicalDistance) / 2,
            startDistance,
            mmPerMeter,
          );
          layer.primitives.push({
            kind: "text",
            id: `plan-band-span-mid-${span.id}`,
            position: createPoint2(
              midX,
              bandRowTextBaselineY(bandBounds.minY + (baseRowIndex + 1) * rowHeight, rowHeight, valueHeight),
            ),
            value: ellipsisToWidth(
              spanLengthM(span).toFixed(2),
              Math.max(bandCellWidthMm * 2, layoutValueHeight * 4),
              bandCharWidthMm,
            ),
            heightMm: valueHeight,
            alignment: "center",
          });
        }
      }
    }
  }

  return baseRowIndex + rowLabels.length;
}

export function createBridgeLayoutGeometryLayer(
  result: CanonicalLinerIntermediateResult,
): DrawingLayer | null {
  if (!hasBridgeLayout(result)) {
    return null;
  }
  const layer = createEmptyDrawingLayer("plan-bridge-layer", CAD_LAYER_PRESETS.PLAN_STATION.name);
  layer.style = {
    ...drawingStyleFromCadPreset(CAD_LAYER_PRESETS.PLAN_STATION),
    strokeWidthMm: FORMAL_DRAWING_LAYOUT.geometryStrokeWidthMm,
  };
  appendBridgeLayoutGeometry(layer, result);
  return layer;
}

export function appendBridgeLayoutModelAnnotations(
  layer: DrawingLayer,
  result: CanonicalLinerIntermediateResult,
): void {
  if (!hasBridgeLayout(result)) {
    return;
  }

  const annotationHeight = FORMAL_DRAWING_LAYOUT.planAnnotationTextHeightMm;
  for (const pier of result.piers) {
    const sample = sampleAlignmentAt(result, pier.physicalDistance);
    if (!sample) {
      continue;
    }
    layer.primitives.push({
      kind: "text",
      id: `plan-pier-label-${pier.id}`,
      position: createPoint2(sample.x, sample.y + 5),
      value: ja.liner.formalDrawing.bridgeLayout.pierLabel(pier.id),
      heightMm: annotationHeight,
      alignment: "center",
    });
    layer.primitives.push({
      kind: "text",
      id: `plan-pier-skew-${pier.id}`,
      position: createPoint2(sample.x, sample.y - 5.5),
      value: ja.liner.formalDrawing.bridgeLayout.skewDegrees(skewAngleDegrees(pier.skewAngleRad)),
      heightMm: annotationHeight,
      alignment: "center",
    });
  }

  for (const span of result.spans) {
    const midpoint = (span.startPhysicalDistance + span.endPhysicalDistance) / 2;
    const sample = sampleAlignmentAt(result, midpoint);
    if (!sample) {
      continue;
    }
    layer.primitives.push({
      kind: "text",
      id: `plan-span-label-${span.id}`,
      position: createPoint2(sample.x, sample.y - 6.5),
      value: ja.liner.formalDrawing.bridgeLayout.spanLength(spanLengthM(span).toFixed(2)),
      heightMm: annotationHeight,
      alignment: "center",
    });
  }
}
