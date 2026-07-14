import { describe, expect, it } from "vitest";
import { createPoint2 } from "../../drawing/model/geometry";
import { createMinimalDxfDocument, validateDxfDocument } from "../validation/validateDxfDocument";
import { serializeDxfDocument } from "../serializer/serializeDxfDocument";
import { DEFAULT_DXF_HEADER } from "../model/defaults";
import { SUPPORTED_ACAD_VERSIONS } from "../model/types";

describe("DxfDocument model", () => {
  it("creates a minimal valid document with default header and tables", () => {
    const document = createMinimalDxfDocument();
    const validation = validateDxfDocument(document);

    expect(validation.hasErrors).toBe(false);
    expect(document.header.acadVer).toBe("AC1021");
    expect(document.header.units).toBe("meters");
    expect(document.tables.layers.some((layer) => layer.name === "0")).toBe(true);
  });

  it("accepts empty entities", () => {
    const document = createMinimalDxfDocument({ entities: [] });
    const serialized = serializeDxfDocument(document);

    expect(serialized.dxf).toContain("2\nENTITIES");
    expect(serialized.dxf).toContain("0\nEOF");
    expect(serialized.diagnostics.some((diagnostic) => diagnostic.severity === "error")).toBe(false);
  });

  it("diagnoses duplicate layers during validation", () => {
    const document = createMinimalDxfDocument({
      tables: {
        layers: [
          { name: "A", color: 1, lineType: "CONTINUOUS", frozen: false, visible: true },
          { name: "A", color: 2, lineType: "CONTINUOUS", frozen: false, visible: true },
        ],
        linetypes: [{ name: "CONTINUOUS", description: "Solid", patternLength: 0, elements: [] }],
        textStyles: [{ name: "STANDARD", fontFile: "txt", height: 0 }],
      },
    });

    const validation = validateDxfDocument(document);
    expect(validation.diagnostics.some((diagnostic) => diagnostic.code === "DXF_DUPLICATE_LAYER")).toBe(true);
    expect(validation.normalizedTables.layers.filter((layer) => layer.name === "A")).toHaveLength(1);
  });

  it("rejects unsupported ACADVER", () => {
    const document = createMinimalDxfDocument({
      header: {
        acadVer: "AC9999" as "AC1021",
        dwgCodepage: "UTF-8",
        units: "meters",
        measurement: 1,
      },
    });

    const validation = validateDxfDocument(document);
    expect(validation.hasErrors).toBe(true);
    expect(validation.diagnostics.some((diagnostic) => diagnostic.code === "DXF_INVALID_ACADVER")).toBe(true);
  });

  it("rejects unsupported units", () => {
    const document = createMinimalDxfDocument({
      header: {
        acadVer: "AC1021",
        dwgCodepage: "UTF-8",
        units: "invalid" as "meters",
        measurement: 1,
      },
    });

    const validation = validateDxfDocument(document);
    expect(validation.hasErrors).toBe(true);
    expect(validation.diagnostics.some((diagnostic) => diagnostic.code === "DXF_INVALID_UNITS")).toBe(true);
  });

  it("defaults ACADVER to AC1021 and supports documented ACAD versions only", () => {
    expect(DEFAULT_DXF_HEADER.acadVer).toBe("AC1021");
    expect(SUPPORTED_ACAD_VERSIONS).toEqual(["AC1015", "AC1021", "AC1024", "AC1027"]);
  });

  it("diagnoses non-positive arc radius while keeping finite-value checks", () => {
    const document = createMinimalDxfDocument({
      entities: [
        {
          kind: "arc",
          layer: "0",
          center: createPoint2(0, 0),
          radius: 0,
          startAngleDeg: 0,
          endAngleDeg: 90,
        },
      ],
    });

    const validation = validateDxfDocument(document);
    expect(validation.hasErrors).toBe(true);
    expect(validation.diagnostics.some((diagnostic) => diagnostic.code === "DXF_INVALID_ARC_RADIUS")).toBe(true);
    expect(validation.diagnostics.some((diagnostic) => diagnostic.code === "DXF_NON_FINITE_VALUE")).toBe(false);
  });

  it("diagnoses non-positive circle radius while keeping finite-value checks", () => {
    const document = createMinimalDxfDocument({
      entities: [
        {
          kind: "circle",
          layer: "0",
          center: createPoint2(0, 0),
          radius: -1,
        },
      ],
    });

    const validation = validateDxfDocument(document);
    expect(validation.hasErrors).toBe(true);
    expect(validation.diagnostics.some((diagnostic) => diagnostic.code === "DXF_INVALID_CIRCLE_RADIUS")).toBe(true);
    expect(validation.diagnostics.some((diagnostic) => diagnostic.code === "DXF_NON_FINITE_VALUE")).toBe(false);
  });

  it("warns when MTEXT entities are present because Step3 PR1 does not serialize them", () => {
    const document = createMinimalDxfDocument({
      entities: [
        {
          kind: "mtext",
          layer: "0",
          position: createPoint2(1, 2),
          text: "note",
          height: 2.5,
        },
      ],
    });

    const validation = validateDxfDocument(document);
    expect(validation.hasErrors).toBe(false);
    expect(validation.diagnostics.some((diagnostic) => diagnostic.code === "DXF_MTEXT_UNSUPPORTED")).toBe(true);
  });
});
