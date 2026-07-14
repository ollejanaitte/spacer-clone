import { describe, expect, it } from "vitest";
import { createPoint2 } from "../../drawing/model/geometry";
import { createEmptyDrawingLayer, type DrawingDocument } from "../../drawing/model/document";
import { mapDrawingDocumentToDxf } from "../mapper/mapDrawingDocumentToDxf";
import { mapDrawingPrimitiveToDxfEntities } from "../mapper/mapDrawingPrimitive";
import type { DrawingArc, DrawingDimension, DrawingLine, DrawingPolyline, DrawingText } from "../../drawing/model/primitives";

function createTestDrawingDocument(layers: DrawingDocument["sheets"][number]["viewports"][number]["layers"]): DrawingDocument {
  return {
    version: "1",
    sheets: [
      {
        id: "sheet-1",
        name: "Sheet 1",
        paper: {
          size: "A3",
          orientation: "landscape",
          widthMm: 420,
          heightMm: 297,
          marginMm: 10,
        },
        viewports: [
          {
            id: "vp-1",
            kind: "plan",
            modelBounds: { minX: 0, minY: 0, maxX: 100, maxY: 100, isEmpty: false },
            paperBounds: { minX: 0, minY: 0, maxX: 400, maxY: 280, isEmpty: false },
            transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
            layers,
          },
        ],
      },
    ],
    diagnostics: [],
    stationAxes: [],
  };
}

describe("DrawingDocument to DxfDocument mapper", () => {
  it("maps DrawingLine to DXF LINE in model coordinates", () => {
    const line: DrawingLine = {
      kind: "line",
      id: "line-1",
      start: createPoint2(1, 2),
      end: createPoint2(3, 4),
      layerId: "layer-a",
    };
    const mapped = mapDrawingPrimitiveToDxfEntities(line, new Map([["layer-a", "CENTERLINE"]]), "meters");

    expect(mapped.entities).toHaveLength(1);
    expect(mapped.entities[0]).toMatchObject({
      kind: "line",
      layer: "CENTERLINE",
      start: { x: 1, y: 2 },
      end: { x: 3, y: 4 },
    });
  });

  it("maps DrawingPolyline to LWPOLYLINE", () => {
    const polyline: DrawingPolyline = {
      kind: "polyline",
      id: "poly-1",
      points: [createPoint2(0, 0), createPoint2(10, 0), createPoint2(10, 5)],
      closed: true,
      layerId: "layer-a",
    };
    const mapped = mapDrawingPrimitiveToDxfEntities(polyline, new Map([["layer-a", "OUTLINE"]]), "meters");

    expect(mapped.entities[0]).toMatchObject({
      kind: "lwpolyline",
      closed: true,
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
      ],
    });
  });

  it("maps DrawingArc with radians to DXF degrees without Y inversion", () => {
    const arc: DrawingArc = {
      kind: "arc",
      id: "arc-1",
      center: createPoint2(5, 5),
      radius: 2,
      startAngleRad: 0,
      endAngleRad: Math.PI / 2,
      layerId: "layer-a",
    };
    const mapped = mapDrawingPrimitiveToDxfEntities(arc, new Map([["layer-a", "ARC"]]), "meters");
    const entity = mapped.entities[0];

    expect(entity?.kind).toBe("arc");
    if (entity?.kind === "arc") {
      expect(entity.center).toEqual({ x: 5, y: 5 });
      expect(entity.startAngleDeg).toBeCloseTo(0, 6);
      expect(entity.endAngleDeg).toBeCloseTo(90, 6);
    }
  });

  it("maps DrawingText height from mm to meters", () => {
    const text: DrawingText = {
      kind: "text",
      id: "text-1",
      position: createPoint2(1, 2),
      value: "KM 12+345",
      heightMm: 2500,
      layerId: "layer-a",
    };
    const mapped = mapDrawingPrimitiveToDxfEntities(text, new Map([["layer-a", "TEXT"]]), "meters");
    const entity = mapped.entities[0];

    expect(entity?.kind).toBe("text");
    if (entity?.kind === "text") {
      expect(entity.height).toBe(2.5);
      expect(entity.text).toBe("KM 12+345");
    }
  });

  it("emits diagnostic for DrawingDimension without native DIMENSION entity", () => {
    const dimension: DrawingDimension = {
      kind: "dimension",
      id: "dim-1",
      start: createPoint2(0, 0),
      end: createPoint2(10, 0),
      offset: 1,
      layerId: "layer-a",
    };
    const mapped = mapDrawingPrimitiveToDxfEntities(dimension, new Map([["layer-a", "DIM"]]), "meters");

    expect(mapped.entities).toHaveLength(0);
    expect(mapped.diagnostics.some((diagnostic) => diagnostic.code === "DXF_DIMENSION_UNSUPPORTED")).toBe(true);
  });

  it("falls back to layer 0 for missing layer id", () => {
    const line: DrawingLine = {
      kind: "line",
      id: "line-2",
      start: createPoint2(0, 0),
      end: createPoint2(1, 1),
      layerId: "missing",
    };
    const mapped = mapDrawingPrimitiveToDxfEntities(line, new Map(), "meters");
    expect(mapped.entities[0]?.layer).toBe("0");
  });

  it("uses layer style fallback from DrawingLayer", () => {
    const layer = createEmptyDrawingLayer("layer-a", "CENTERLINE");
    layer.style = { lineType: "DASHED", color: "3" };
    layer.primitives.push({
      kind: "line",
      id: "line-3",
      start: createPoint2(0, 0),
      end: createPoint2(1, 0),
    });

    const { document } = mapDrawingDocumentToDxf(createTestDrawingDocument([layer]));
    const dxfLayer = document.tables.layers.find((entry) => entry.name === "CENTERLINE");

    expect(dxfLayer?.lineType).toBe("DASHED");
    expect(dxfLayer?.color).toBe(3);
  });

  it("produces deterministic entity ordering", () => {
    const layer = createEmptyDrawingLayer("layer-a", "A");
    layer.primitives.push(
      {
        kind: "text",
        id: "t2",
        position: createPoint2(2, 0),
        value: "B",
        heightMm: 1000,
      },
      {
        kind: "line",
        id: "l1",
        start: createPoint2(0, 0),
        end: createPoint2(1, 0),
      },
      {
        kind: "line",
        id: "l2",
        start: createPoint2(0, 1),
        end: createPoint2(1, 1),
      },
    );

    const first = mapDrawingDocumentToDxf(createTestDrawingDocument([layer]));
    const second = mapDrawingDocumentToDxf(createTestDrawingDocument([layer]));

    expect(first.document.entities).toEqual(second.document.entities);
  });

  it("does not mutate the input DrawingDocument", () => {
    const layer = createEmptyDrawingLayer("layer-a", "A");
    layer.primitives.push({
      kind: "line",
      id: "line-1",
      start: createPoint2(0, 0),
      end: createPoint2(1, 0),
    });
    const document = createTestDrawingDocument([layer]);
    const snapshot = JSON.stringify(document);

    mapDrawingDocumentToDxf(document);

    expect(JSON.stringify(document)).toBe(snapshot);
  });
});
