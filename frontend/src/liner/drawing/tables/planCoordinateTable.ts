import { formatStationDisplay, formatStationPlanNotation } from "../../core/station/stationFormat";
import type {
  CanonicalLinerIntermediateResult,
  HorizontalSegmentResult,
} from "../../core/types";
import { ja } from "../../../i18n/ja";
import type { DrawingLayer } from "../model/document";
import { createPoint2, type Bounds2, type Point2 } from "../model/geometry";
import { FORMAL_DRAWING_LAYOUT } from "../builders/formalPaperLayout";

export type PlanCoordinateTableRow = {
  id: string;
  pointLabel: string;
  stationLabel: string;
  x: number;
  y: number;
};

function sampleAtPhysicalDistance(
  result: CanonicalLinerIntermediateResult,
  physicalDistance: number,
): Point2 | null {
  const exact = result.horizontal.sampledPoints.find(
    (entry) => Math.abs(entry.physicalDistance - physicalDistance) <= 1e-6,
  );
  if (exact) {
    return createPoint2(exact.x, exact.y);
  }
  const sorted = [...result.horizontal.sampledPoints].sort(
    (left, right) => left.physicalDistance - right.physicalDistance,
  );
  if (sorted.length === 0) {
    return null;
  }
  const nextIndex = sorted.findIndex((entry) => entry.physicalDistance >= physicalDistance);
  if (nextIndex <= 0) {
    const first = sorted[0];
    return first ? createPoint2(first.x, first.y) : null;
  }
  if (nextIndex < 0) {
    const last = sorted.at(-1);
    return last ? createPoint2(last.x, last.y) : null;
  }
  const previous = sorted[nextIndex - 1]!;
  const next = sorted[nextIndex]!;
  const span = next.physicalDistance - previous.physicalDistance;
  if (span <= 0) {
    return createPoint2(previous.x, previous.y);
  }
  const ratio = (physicalDistance - previous.physicalDistance) / span;
  return createPoint2(
    previous.x + (next.x - previous.x) * ratio,
    previous.y + (next.y - previous.y) * ratio,
  );
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

function stationLabelForDistance(
  result: CanonicalLinerIntermediateResult,
  physicalDistance: number,
): string {
  const station = result.stations.entries.find(
    (entry) => Math.abs(entry.physicalDistance - physicalDistance) <= 1e-6,
  );
  if (station) {
    return formatStationDisplay(station.displayedStation);
  }
  return formatStationPlanNotation(physicalDistance);
}

function pushRow(
  rows: PlanCoordinateTableRow[],
  seen: Set<string>,
  row: PlanCoordinateTableRow,
): void {
  if (!Number.isFinite(row.x) || !Number.isFinite(row.y)) {
    return;
  }
  if (seen.has(row.id)) {
    return;
  }
  seen.add(row.id);
  rows.push(row);
}

export function collectPlanCoordinateTableRows(
  result: CanonicalLinerIntermediateResult,
  toLocal?: (point: Point2) => Point2,
): PlanCoordinateTableRow[] {
  const rows: PlanCoordinateTableRow[] = [];
  const seen = new Set<string>();
  const localize = (point: Point2): Point2 => (toLocal ? toLocal(point) : point);

  for (const piPoint of result.horizontal.piPoints) {
    const local = localize(createPoint2(piPoint.x, piPoint.y));
    pushRow(rows, seen, {
      id: `coord-ip-${piPoint.id}`,
      pointLabel: ja.liner.formalDrawing.planCurvePoints.ip,
      stationLabel:
        piPoint.displayedStation !== undefined
          ? formatStationDisplay(piPoint.displayedStation)
          : piPoint.physicalDistance !== undefined
            ? formatStationPlanNotation(piPoint.physicalDistance)
            : ja.liner.formalDrawing.bandRows.unavailable,
      x: local.x,
      y: local.y,
    });
  }

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
      const local = localize(sample);
      pushRow(rows, seen, {
        id: `coord-${segment.id}-${boundary}`,
        pointLabel: label,
        stationLabel: stationLabelForDistance(result, physicalDistance),
        x: local.x,
        y: local.y,
      });
    }
  }

  const start = sampleAtPhysicalDistance(result, 0);
  if (start) {
    const local = localize(start);
    pushRow(rows, seen, {
      id: "coord-bp",
      pointLabel: ja.liner.formalDrawing.planCurvePoints.bp,
      stationLabel: stationLabelForDistance(result, 0),
      x: local.x,
      y: local.y,
    });
  }
  const end = sampleAtPhysicalDistance(result, result.horizontal.totalLength);
  if (end) {
    const local = localize(end);
    pushRow(rows, seen, {
      id: "coord-ep",
      pointLabel: ja.liner.formalDrawing.planCurvePoints.ep,
      stationLabel: stationLabelForDistance(result, result.horizontal.totalLength),
      x: local.x,
      y: local.y,
    });
  }

  return rows;
}

export function appendPlanCoordinateTablePaper(
  layer: DrawingLayer,
  result: CanonicalLinerIntermediateResult,
  geometryPaperBounds: Bounds2,
  toLocal?: (point: Point2) => Point2,
): void {
  const rows = collectPlanCoordinateTableRows(result, toLocal);
  if (rows.length === 0) {
    return;
  }

  const labelHeight = FORMAL_DRAWING_LAYOUT.bandLabelTextHeightMm;
  const valueHeight = FORMAL_DRAWING_LAYOUT.bandValueTextHeightMm;
  const rowHeight = valueHeight + 2;
  const columns = ja.liner.formalDrawing.coordinateTable.columns;
  const colWidths = [10, 22, 20, 20];
  const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
  const tableHeight = (rows.length + 2) * rowHeight;
  const originX = geometryPaperBounds.maxX - tableWidth - FORMAL_DRAWING_LAYOUT.geometryInsetMm;
  const originY = geometryPaperBounds.minY + FORMAL_DRAWING_LAYOUT.geometryInsetMm;

  layer.primitives.push({
    kind: "text",
    id: "plan-coordinate-table-title",
    position: createPoint2(originX, originY + labelHeight),
    value: ja.liner.formalDrawing.coordinateTable.title,
    heightMm: labelHeight,
  });

  const headerY = originY + rowHeight + labelHeight * 0.2;
  let columnX = originX;
  for (const [index, label] of [columns.point, columns.station, columns.x, columns.y].entries()) {
    layer.primitives.push({
      kind: "text",
      id: `plan-coordinate-table-header-${index}`,
      position: createPoint2(columnX, headerY),
      value: label,
      heightMm: valueHeight,
    });
    columnX += colWidths[index] ?? 0;
  }

  rows.forEach((row, rowIndex) => {
    const y = headerY + (rowIndex + 1) * rowHeight;
    const values = [
      row.pointLabel,
      row.stationLabel,
      row.x.toFixed(3),
      row.y.toFixed(3),
    ];
    let x = originX;
    values.forEach((value, columnIndex) => {
      layer.primitives.push({
        kind: "text",
        id: `plan-coordinate-table-${row.id}-${columnIndex}`,
        position: createPoint2(x, y),
        value,
        heightMm: valueHeight,
      });
      x += colWidths[columnIndex] ?? 0;
    });
  });

  layer.primitives.push({
    kind: "polyline",
    id: "plan-coordinate-table-frame",
    closed: true,
    points: [
      createPoint2(originX - 1, originY),
      createPoint2(originX + tableWidth + 1, originY),
      createPoint2(originX + tableWidth + 1, originY + tableHeight + labelHeight),
      createPoint2(originX - 1, originY + tableHeight + labelHeight),
    ],
  });
}
