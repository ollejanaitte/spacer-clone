import DxfParser from "dxf-parser";
import { describe, expect, it } from "vitest";
import { createPoint2 } from "../../drawing/model/geometry";
import { createMinimalDxfDocument } from "../validation/validateDxfDocument";
import { serializeDxfDocument } from "../serializer/serializeDxfDocument";

type ParsedLine = {
  type: "LINE";
  layer: string;
  vertices: Array<{ x: number; y: number }>;
};

type ParsedLwPolyline = {
  type: "LWPOLYLINE";
  vertices: Array<{ x: number; y: number }>;
  shape?: boolean;
};

type ParsedArc = {
  type: "ARC";
  center: { x: number; y: number };
  radius: number;
  startAngle: number;
  endAngle: number;
};

type ParsedText = {
  type: "TEXT";
  text: string;
};

function parseDxf(dxf: string) {
  return new DxfParser().parseSync(dxf);
}

function headerValue(dxf: string, variableName: string): string | null {
  const lines = dxf.split("\n").map((line) => line.trim());
  const index = lines.indexOf(variableName);
  if (index < 0) {
    return null;
  }
  return lines[index + 2] ?? null;
}

describe("DXF parser round-trip", () => {
  it("round-trips LINE entities", () => {
    const document = createMinimalDxfDocument({
      entities: [
        {
          kind: "line",
          layer: "TEST",
          start: createPoint2(12.345678, -3.5),
          end: createPoint2(987654.321, 42),
        },
      ],
      tables: {
        layers: [
          { name: "TEST", color: 1, lineType: "CONTINUOUS", frozen: false, visible: true },
          { name: "0", color: 7, lineType: "CONTINUOUS", frozen: false, visible: true },
        ],
        linetypes: [{ name: "CONTINUOUS", description: "Solid", patternLength: 0, elements: [] }],
        textStyles: [{ name: "STANDARD", fontFile: "txt", height: 0 }],
      },
    });
    const { dxf } = serializeDxfDocument(document);
    const parsed = parseDxf(dxf);

    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const line = parsed.entities.find((entity) => entity.type === "LINE") as ParsedLine | undefined;
    expect(line).toBeDefined();
    expect(line?.layer).toBe("TEST");
    expect(line?.vertices[0]?.x).toBeCloseTo(12.345678, 5);
    expect(line?.vertices[0]?.y).toBeCloseTo(-3.5, 5);
    expect(line?.vertices[1]?.x).toBeCloseTo(987654.321, 5);
  });

  it("round-trips LWPOLYLINE entities", () => {
    const document = createMinimalDxfDocument({
      entities: [
        {
          kind: "lwpolyline",
          layer: "TEST",
          vertices: [createPoint2(0, 0), createPoint2(10, 0), createPoint2(10, 5)],
          closed: true,
        },
      ],
      tables: {
        layers: [
          { name: "TEST", color: 1, lineType: "CONTINUOUS", frozen: false, visible: true },
          { name: "0", color: 7, lineType: "CONTINUOUS", frozen: false, visible: true },
        ],
        linetypes: [{ name: "CONTINUOUS", description: "Solid", patternLength: 0, elements: [] }],
        textStyles: [{ name: "STANDARD", fontFile: "txt", height: 0 }],
      },
    });
    const { dxf } = serializeDxfDocument(document);
    const parsed = parseDxf(dxf);

    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const polyline = parsed.entities.find((entity) => entity.type === "LWPOLYLINE") as ParsedLwPolyline | undefined;
    expect(polyline?.vertices).toHaveLength(3);
    expect(polyline?.shape).toBe(true);
  });

  it("round-trips ARC entities", () => {
    const document = createMinimalDxfDocument({
      entities: [
        {
          kind: "arc",
          layer: "TEST",
          center: createPoint2(5, 5),
          radius: 2,
          startAngleDeg: 0,
          endAngleDeg: 90,
        },
      ],
      tables: {
        layers: [
          { name: "TEST", color: 1, lineType: "CONTINUOUS", frozen: false, visible: true },
          { name: "0", color: 7, lineType: "CONTINUOUS", frozen: false, visible: true },
        ],
        linetypes: [{ name: "CONTINUOUS", description: "Solid", patternLength: 0, elements: [] }],
        textStyles: [{ name: "STANDARD", fontFile: "txt", height: 0 }],
      },
    });
    const { dxf } = serializeDxfDocument(document);
    const parsed = parseDxf(dxf);

    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const arc = parsed.entities.find((entity) => entity.type === "ARC") as ParsedArc | undefined;
    expect(arc?.center.x).toBeCloseTo(5, 5);
    expect(arc?.radius).toBeCloseTo(2, 5);
    expect(arc?.startAngle).toBeCloseTo(0, 5);
    expect(arc?.endAngle).toBeCloseTo(Math.PI / 2, 5);
  });

  it("round-trips TEXT entities and retains Japanese text", () => {
    const japanese = "測点№12+345";
    const document = createMinimalDxfDocument({
      entities: [
        {
          kind: "text",
          layer: "TEST",
          position: createPoint2(1, 2),
          text: japanese,
          height: 2.5,
        },
      ],
      tables: {
        layers: [
          { name: "TEST", color: 1, lineType: "CONTINUOUS", frozen: false, visible: true },
          { name: "0", color: 7, lineType: "CONTINUOUS", frozen: false, visible: true },
        ],
        linetypes: [{ name: "CONTINUOUS", description: "Solid", patternLength: 0, elements: [] }],
        textStyles: [{ name: "STANDARD", fontFile: "txt", height: 0 }],
      },
    });
    const { dxf } = serializeDxfDocument(document);
    const parsed = parseDxf(dxf);

    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const text = parsed.entities.find((entity) => entity.type === "TEXT") as ParsedText | undefined;
    expect(text?.text).toBe(japanese);
  });

  it("exposes layer and meter units in header", () => {
    const document = createMinimalDxfDocument({
      entities: [
        { kind: "line", layer: "CENTER", start: createPoint2(0, 0), end: createPoint2(1, 0) },
      ],
      tables: {
        layers: [
          { name: "CENTER", color: 1, lineType: "CONTINUOUS", frozen: false, visible: true },
          { name: "0", color: 7, lineType: "CONTINUOUS", frozen: false, visible: true },
        ],
        linetypes: [{ name: "CONTINUOUS", description: "Solid", patternLength: 0, elements: [] }],
        textStyles: [{ name: "STANDARD", fontFile: "txt", height: 0 }],
      },
    });
    const { dxf } = serializeDxfDocument(document);
    const parsed = parseDxf(dxf);

    expect(headerValue(dxf, "$INSUNITS")).toBe("6");
    expect(parsed?.tables.layer.layers.CENTER).toBeDefined();
  });

  it("handles large and negative coordinates", () => {
    const document = createMinimalDxfDocument({
      entities: [
        {
          kind: "line",
          layer: "0",
          start: createPoint2(-1234567.89, -0.000001),
          end: createPoint2(9876543.21, 1000000),
        },
      ],
    });
    const { dxf } = serializeDxfDocument(document);
    const parsed = parseDxf(dxf);

    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const line = parsed.entities.find((entity) => entity.type === "LINE") as ParsedLine | undefined;
    expect(line?.vertices[0]?.x).toBeCloseTo(-1234567.89, 4);
    expect(line?.vertices[0]?.y).toBeCloseTo(-0.000001, 6);
    expect(line?.vertices[1]?.x).toBeCloseTo(9876543.21, 4);
  });
});
