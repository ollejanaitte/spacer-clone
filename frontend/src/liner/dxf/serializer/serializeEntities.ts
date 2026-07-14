import type { Point2 } from "../../drawing/model/geometry";
import type { DxfPrecisionPolicy } from "../model/precision";
import type { DxfEntity } from "../model/types";
import type { HandleAllocator } from "./handleAllocator";
import {
  formatDxfAngleDeg,
  formatDxfCoordinate,
  formatDxfTextHeight,
} from "./formatNumber";
import type { DxfWriter } from "./dxfWriter";

export function serializeEntities(
  writer: DxfWriter,
  entities: readonly DxfEntity[],
  precision: DxfPrecisionPolicy,
  handles: HandleAllocator,
): void {
  for (const entity of entities) {
    serializeEntity(writer, entity, precision, handles);
  }
}

function serializeEntity(
  writer: DxfWriter,
  entity: DxfEntity,
  precision: DxfPrecisionPolicy,
  handles: HandleAllocator,
): void {
  switch (entity.kind) {
    case "line":
      serializeLine(writer, entity, precision, handles);
      return;
    case "lwpolyline":
      serializeLwPolyline(writer, entity, precision, handles);
      return;
    case "arc":
      serializeArc(writer, entity, precision, handles);
      return;
    case "circle":
      serializeCircle(writer, entity, precision, handles);
      return;
    case "text":
      serializeText(writer, entity, precision, handles);
      return;
    case "mtext":
      return;
    default: {
      const exhaustive: never = entity;
      return exhaustive;
    }
  }
}

function writeCommonEntity(
  writer: DxfWriter,
  entityType: string,
  layer: string,
  lineType: string | undefined,
  handles: HandleAllocator,
): void {
  writer.pair(0, entityType);
  writer.pair(5, handles.next());
  writer.pair(100, "AcDbEntity");
  writer.pair(8, layer);
  if (lineType) {
    writer.pair(6, lineType);
  }
}

function writePoint(
  writer: DxfWriter,
  point: Point2,
  precision: DxfPrecisionPolicy,
  xCode: number,
  yCode: number,
): void {
  writer.pair(xCode, formatDxfCoordinate(point.x, precision));
  writer.pair(yCode, formatDxfCoordinate(point.y, precision));
}

function serializeLine(
  writer: DxfWriter,
  entity: Extract<DxfEntity, { kind: "line" }>,
  precision: DxfPrecisionPolicy,
  handles: HandleAllocator,
): void {
  writeCommonEntity(writer, "LINE", entity.layer, entity.lineType, handles);
  writer.pair(100, "AcDbLine");
  writePoint(writer, entity.start, precision, 10, 20);
  writePoint(writer, entity.end, precision, 11, 21);
}

function serializeLwPolyline(
  writer: DxfWriter,
  entity: Extract<DxfEntity, { kind: "lwpolyline" }>,
  precision: DxfPrecisionPolicy,
  handles: HandleAllocator,
): void {
  writeCommonEntity(writer, "LWPOLYLINE", entity.layer, entity.lineType, handles);
  writer.pair(100, "AcDbPolyline");
  writer.pair(90, entity.vertices.length);
  writer.pair(70, entity.closed ? 1 : 0);
  for (const vertex of entity.vertices) {
    writePoint(writer, vertex, precision, 10, 20);
  }
}

function serializeArc(
  writer: DxfWriter,
  entity: Extract<DxfEntity, { kind: "arc" }>,
  precision: DxfPrecisionPolicy,
  handles: HandleAllocator,
): void {
  writeCommonEntity(writer, "ARC", entity.layer, entity.lineType, handles);
  writer.pair(100, "AcDbCircle");
  writePoint(writer, entity.center, precision, 10, 20);
  writer.pair(40, formatDxfCoordinate(entity.radius, precision));
  writer.pair(100, "AcDbArc");
  writer.pair(50, formatDxfAngleDeg(entity.startAngleDeg, precision));
  writer.pair(51, formatDxfAngleDeg(entity.endAngleDeg, precision));
}

function serializeCircle(
  writer: DxfWriter,
  entity: Extract<DxfEntity, { kind: "circle" }>,
  precision: DxfPrecisionPolicy,
  handles: HandleAllocator,
): void {
  writeCommonEntity(writer, "CIRCLE", entity.layer, entity.lineType, handles);
  writer.pair(100, "AcDbCircle");
  writePoint(writer, entity.center, precision, 10, 20);
  writer.pair(40, formatDxfCoordinate(entity.radius, precision));
}

function serializeText(
  writer: DxfWriter,
  entity: Extract<DxfEntity, { kind: "text" }>,
  precision: DxfPrecisionPolicy,
  handles: HandleAllocator,
): void {
  writeCommonEntity(writer, "TEXT", entity.layer, undefined, handles);
  writer.pair(100, "AcDbText");
  writePoint(writer, entity.position, precision, 10, 20);
  writePoint(writer, entity.position, precision, 11, 21);
  writer.pair(40, formatDxfTextHeight(entity.height, precision));
  writer.pair(1, entity.text);
  if (entity.rotationDeg !== undefined) {
    writer.pair(50, formatDxfAngleDeg(entity.rotationDeg, precision));
  }
  if (entity.halign !== undefined) {
    writer.pair(72, entity.halign);
  }
  if (entity.valign !== undefined) {
    writer.pair(73, entity.valign);
  }
}
