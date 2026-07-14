import { describe, expect, it } from "vitest";
import { createPoint2 } from "../../drawing/model/geometry";
import { createMinimalDxfDocument } from "../validation/validateDxfDocument";
import { serializeDxfDocument } from "../serializer/serializeDxfDocument";
import { formatDxfCoordinate, formatDxfNumber } from "../serializer/formatNumber";
import { DEFAULT_DXF_PRECISION_POLICY } from "../model/precision";

describe("DXF serializer", () => {
  it("outputs HEADER, TABLES, BLOCKS, ENTITIES, and EOF sections", () => {
    const document = createMinimalDxfDocument({
      entities: [
        {
          kind: "line",
          layer: "0",
          start: createPoint2(0, 0),
          end: createPoint2(1, 0),
        },
      ],
    });
    const { dxf } = serializeDxfDocument(document);

    expect(dxf).toMatch(/^0\nSECTION\n2\nHEADER/);
    expect(dxf).toContain("0\nSECTION\n2\nTABLES");
    expect(dxf).toContain("0\nSECTION\n2\nBLOCKS");
    expect(dxf).toContain("0\nSECTION\n2\nENTITIES");
    expect(dxf.trimEnd().endsWith("0\nEOF")).toBe(true);
  });

  it("writes ACADVER and DWGCODEPAGE header variables", () => {
    const document = createMinimalDxfDocument();
    const { dxf } = serializeDxfDocument(document);

    expect(dxf).toContain("9\n$ACADVER\n1\nAC1021");
    expect(dxf).toContain("9\n$DWGCODEPAGE\n3\nUTF-8");
    expect(dxf).toContain("9\n$INSUNITS\n70\n6");
    expect(dxf).toContain("9\n$MEASUREMENT\n70\n1");
  });

  it("writes layer and linetype tables", () => {
    const document = createMinimalDxfDocument({
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

    expect(dxf).toContain("0\nTABLE\n2\nLAYER");
    expect(dxf).toContain("0\nLAYER\n");
    expect(dxf).toContain("2\nCENTER");
    expect(dxf).toContain("0\nTABLE\n2\nLTYPE");
    expect(dxf).toContain("2\nCONTINUOUS");
    expect(dxf).toContain("0\nTABLE\n2\nSTYLE");
    expect(dxf).toContain("2\nSTANDARD");
  });

  it("serializes LINE, LWPOLYLINE, ARC, CIRCLE, and TEXT entities", () => {
    const document = createMinimalDxfDocument({
      entities: [
        { kind: "line", layer: "0", start: createPoint2(0, 0), end: createPoint2(1, 0) },
        {
          kind: "lwpolyline",
          layer: "0",
          vertices: [createPoint2(0, 0), createPoint2(1, 0), createPoint2(1, 1)],
          closed: false,
        },
        {
          kind: "arc",
          layer: "0",
          center: createPoint2(0, 0),
          radius: 2,
          startAngleDeg: 0,
          endAngleDeg: 90,
        },
        {
          kind: "circle",
          layer: "0",
          center: createPoint2(5, 5),
          radius: 1,
        },
        {
          kind: "text",
          layer: "0",
          position: createPoint2(1, 2),
          text: "A",
          height: 2.5,
        },
      ],
    });
    const { dxf } = serializeDxfDocument(document);

    expect(dxf).toContain("0\nLINE");
    expect(dxf).toContain("0\nLWPOLYLINE");
    expect(dxf).toContain("0\nARC");
    expect(dxf).toContain("0\nCIRCLE");
    expect(dxf).toContain("0\nTEXT");
  });

  it("uses locale-independent number formatting and precision policy", () => {
    const formatted = formatDxfCoordinate(1.23456789, DEFAULT_DXF_PRECISION_POLICY);
    expect(formatted).toBe("1.234568");
    expect(formatDxfNumber(10, 3)).toBe("10.000");
  });

  it("rejects NaN entity values", () => {
    const document = createMinimalDxfDocument({
      entities: [
        {
          kind: "line",
          layer: "0",
          start: createPoint2(Number.NaN, 0),
          end: createPoint2(1, 0),
        },
      ],
    });
    const { dxf, diagnostics } = serializeDxfDocument(document);

    expect(dxf).toBe("");
    expect(diagnostics.some((diagnostic) => diagnostic.code === "DXF_NON_FINITE_VALUE")).toBe(true);
  });

  it("rejects Infinity entity values", () => {
    const document = createMinimalDxfDocument({
      entities: [
        {
          kind: "circle",
          layer: "0",
          center: createPoint2(0, 0),
          radius: Number.POSITIVE_INFINITY,
        },
      ],
    });
    const { dxf, diagnostics } = serializeDxfDocument(document);

    expect(dxf).toBe("");
    expect(diagnostics.some((diagnostic) => diagnostic.code === "DXF_NON_FINITE_VALUE")).toBe(true);
  });

  it("rejects non-positive arc and circle radii", () => {
    const arcDocument = createMinimalDxfDocument({
      entities: [
        {
          kind: "arc",
          layer: "0",
          center: createPoint2(0, 0),
          radius: -2,
          startAngleDeg: 0,
          endAngleDeg: 45,
        },
      ],
    });
    const circleDocument = createMinimalDxfDocument({
      entities: [
        {
          kind: "circle",
          layer: "0",
          center: createPoint2(0, 0),
          radius: 0,
        },
      ],
    });

    const arcResult = serializeDxfDocument(arcDocument);
    const circleResult = serializeDxfDocument(circleDocument);

    expect(arcResult.dxf).toBe("");
    expect(arcResult.diagnostics.some((diagnostic) => diagnostic.code === "DXF_INVALID_ARC_RADIUS")).toBe(true);
    expect(circleResult.dxf).toBe("");
    expect(circleResult.diagnostics.some((diagnostic) => diagnostic.code === "DXF_INVALID_CIRCLE_RADIUS")).toBe(true);
  });

  it("omits MTEXT entities with a warning diagnostic", () => {
    const document = createMinimalDxfDocument({
      entities: [
        { kind: "line", layer: "0", start: createPoint2(0, 0), end: createPoint2(1, 0) },
        {
          kind: "mtext",
          layer: "0",
          position: createPoint2(1, 2),
          text: "note",
          height: 2.5,
        },
      ],
    });
    const { dxf, diagnostics } = serializeDxfDocument(document);

    expect(dxf).toContain("0\nLINE");
    expect(dxf).not.toContain("0\nMTEXT");
    expect(diagnostics.some((diagnostic) => diagnostic.code === "DXF_MTEXT_UNSUPPORTED")).toBe(true);
    expect(diagnostics.some((diagnostic) => diagnostic.severity === "error")).toBe(false);
  });

  it("serializes an empty document with tables and EOF", () => {
    const { dxf } = serializeDxfDocument(createMinimalDxfDocument());
    const trimmed = dxf.trimEnd();
    expect(trimmed.endsWith("0\nEOF")).toBe(true);
    expect(dxf).toContain("0\nENDSEC");
  });

  it("is deterministic across repeated serialization", () => {
    const document = createMinimalDxfDocument({
      entities: [
        { kind: "line", layer: "0", start: createPoint2(0, 0), end: createPoint2(10, 0) },
      ],
    });

    const first = serializeDxfDocument(document).dxf;
    const second = serializeDxfDocument(document).dxf;

    expect(first).toBe(second);
  });
});
