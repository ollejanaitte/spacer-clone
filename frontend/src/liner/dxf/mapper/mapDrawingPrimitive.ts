import type { Point2 } from "../../drawing/model/geometry";
import type {
  DrawingArc,
  DrawingDimension,
  DrawingLine,
  DrawingPolyline,
  DrawingPrimitive,
  DrawingText,
} from "../../drawing/model/primitives";
import { createDxfDiagnostic, type DxfDiagnostic } from "../model/diagnostics";
import { DEFAULT_DXF_LAYER_0 } from "../model/defaults";
import type { DxfEntity } from "../model/types";
import { textHeightModelUnits, type DxfUnits } from "../model/units";
import { roundDxfNumber } from "../serializer/formatNumber";
import { resolveDxfPrecisionPolicy } from "../model/precision";

const RADIANS_TO_DEGREES = 180 / Math.PI;

export type MapDrawingPrimitiveResult = {
  entities: DxfEntity[];
  diagnostics: DxfDiagnostic[];
};

export function mapDrawingPrimitiveToDxfEntities(
  primitive: DrawingPrimitive,
  layerNameById: ReadonlyMap<string, string>,
  units: DxfUnits,
): MapDrawingPrimitiveResult {
  const layer = resolveLayerName(primitive.layerId, layerNameById);
  switch (primitive.kind) {
    case "line":
      return mapDrawingLine(primitive, layer);
    case "polyline":
      return mapDrawingPolyline(primitive, layer);
    case "arc":
      return mapDrawingArc(primitive, layer);
    case "text":
      return mapDrawingText(primitive, layer, units);
    case "dimension":
      return mapDrawingDimension(primitive, layer, units);
    default: {
      const exhaustive: never = primitive;
      return exhaustive;
    }
  }
}

function resolveLayerName(
  layerId: string | undefined,
  layerNameById: ReadonlyMap<string, string>,
): string {
  if (!layerId) {
    return DEFAULT_DXF_LAYER_0.name;
  }
  return layerNameById.get(layerId) ?? DEFAULT_DXF_LAYER_0.name;
}

function mapDrawingLine(line: DrawingLine, layer: string): MapDrawingPrimitiveResult {
  return {
    entities: [
      {
        kind: "line",
        layer,
        start: copyPoint(line.start),
        end: copyPoint(line.end),
      },
    ],
    diagnostics: [],
  };
}

function mapDrawingPolyline(polyline: DrawingPolyline, layer: string): MapDrawingPrimitiveResult {
  if (polyline.points.length < 2) {
    return {
      entities: [],
      diagnostics: [
        createDxfDiagnostic(
          "warning",
          "DXF_POLYLINE_TOO_SHORT",
          `Polyline ${polyline.id} has fewer than 2 points`,
          { entityId: polyline.id, layerName: layer },
        ),
      ],
    };
  }

  return {
    entities: [
      {
        kind: "lwpolyline",
        layer,
        vertices: polyline.points.map(copyPoint),
        closed: polyline.closed ?? false,
      },
    ],
    diagnostics: [],
  };
}

function mapDrawingArc(arc: DrawingArc, layer: string): MapDrawingPrimitiveResult {
  const precision = resolveDxfPrecisionPolicy();
  const startAngleDeg = normalizeAngleDeg(arc.startAngleRad * RADIANS_TO_DEGREES);
  const endAngleDeg = normalizeAngleDeg(arc.endAngleRad * RADIANS_TO_DEGREES);
  const angles = arc.clockwise
    ? { startAngleDeg: endAngleDeg, endAngleDeg: startAngleDeg }
    : { startAngleDeg, endAngleDeg };

  return {
    entities: [
      {
        kind: "arc",
        layer,
        center: copyPoint(arc.center),
        radius: roundDxfNumber(arc.radius, precision.coordinateDecimals),
        ...angles,
      },
    ],
    diagnostics: [],
  };
}

function mapDrawingText(text: DrawingText, layer: string, units: DxfUnits): MapDrawingPrimitiveResult {
  const precision = resolveDxfPrecisionPolicy();
  const height = roundDxfNumber(textHeightModelUnits(text.heightMm, units), precision.textHeightDecimals);
  const rotationDeg = text.rotationRad === undefined
    ? undefined
    : roundDxfNumber(normalizeAngleDeg(text.rotationRad * RADIANS_TO_DEGREES), precision.angleDecimals);

  return {
    entities: [
      {
        kind: "text",
        layer,
        position: copyPoint(text.position),
        text: text.value,
        height,
        rotationDeg,
        halign: textAlignmentToHalign(text.alignment),
        valign: 0,
      },
    ],
    diagnostics: [],
  };
}

function mapDrawingDimension(
  dimension: DrawingDimension,
  layer: string,
  units: DxfUnits,
): MapDrawingPrimitiveResult {
  const precision = resolveDxfPrecisionPolicy();
  const dx = dimension.end.x - dimension.start.x;
  const dy = dimension.end.y - dimension.start.y;
  const length = Math.hypot(dx, dy);
  const entities: DxfEntity[] = [
    {
      kind: "line",
      layer,
      start: copyPoint(dimension.start),
      end: copyPoint(dimension.end),
    },
  ];

  if (length > 1e-9 && Number.isFinite(dimension.offset) && Math.abs(dimension.offset) > 1e-9) {
    const ux = -dy / length;
    const uy = dx / length;
    const offsetStart = {
      x: dimension.start.x + ux * dimension.offset,
      y: dimension.start.y + uy * dimension.offset,
    };
    const offsetEnd = {
      x: dimension.end.x + ux * dimension.offset,
      y: dimension.end.y + uy * dimension.offset,
    };
    entities.push(
      { kind: "line", layer, start: offsetStart, end: offsetEnd },
      { kind: "line", layer, start: copyPoint(dimension.start), end: offsetStart },
      { kind: "line", layer, start: copyPoint(dimension.end), end: offsetEnd },
    );
  }

  const label =
    dimension.text
    ?? `${roundDxfNumber(length, precision.coordinateDecimals)}`;
  const textPosition = dimension.textPosition
    ?? {
      x: (dimension.start.x + dimension.end.x) / 2,
      y: (dimension.start.y + dimension.end.y) / 2 + (dimension.offset || 0),
    };
  entities.push({
    kind: "text",
    layer,
    position: copyPoint(textPosition),
    text: label,
    height: roundDxfNumber(textHeightModelUnits(2.5, units), precision.textHeightDecimals),
    halign: 1,
    valign: 0,
  });

  return {
    entities,
    diagnostics: [
      createDxfDiagnostic(
        "info",
        "DXF_DIMENSION_DECOMPOSED",
        `Dimension ${dimension.id} exported as LINE/TEXT decomposition`,
        { entityId: dimension.id, layerName: layer },
      ),
    ],
  };
}

function copyPoint(point: Point2): Point2 {
  return { x: point.x, y: point.y };
}

function normalizeAngleDeg(angleDeg: number): number {
  let normalized = angleDeg % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized;
}

function textAlignmentToHalign(alignment: DrawingText["alignment"]): number {
  switch (alignment) {
    case "center":
      return 1;
    case "right":
      return 2;
    case "left":
    default:
      return 0;
  }
}
