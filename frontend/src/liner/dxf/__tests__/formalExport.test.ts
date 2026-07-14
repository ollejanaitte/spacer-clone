import { describe, expect, it } from "vitest";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import {
  buildDrawingDocument,
  createCrossSectionDrawingBuilder,
  createDrawingSettingsFromDraft,
  createPlanDrawingBuilder,
  createProfileDrawingBuilder,
} from "../../drawing";
import { createPoint2 } from "../../drawing/model/geometry";
import { createEmptyDrawingLayer, type DrawingDocument } from "../../drawing/model/document";
import {
  buildFormalDrawingDxfFileName,
  canExportFormalDrawingDxf,
  exportFormalDrawingDxf,
} from "../export/exportFormalDrawingDxf";
import { mapDrawingDocumentToDxf } from "../mapper/mapDrawingDocumentToDxf";
import { CAD_LAYER_PRESETS, listSheetPresets, sanitizeDxfLayerName } from "../index";
import { serializeDxfDocument } from "../serializer/serializeDxfDocument";

function buildKindDocument(kind: "plan" | "profile" | "cross-section"): DrawingDocument {
  const draft = createDefaultLinerDraft();
  // Ensure cross-section has a drawable shape (default draft is center-only).
  if (!draft.offsets || draft.offsets.length < 2) {
    draft.offsets = [-5.5, -3.25, 0, 3.25, 5.5];
    draft.crossSections = [
      {
        id: "CS-verify",
        name: "Verify",
        offsetLines: draft.offsets.map((offset, index) => ({
          id: `OL-${index}`,
          offset,
          elevation: index === 2 ? 0 : -0.02 * Math.abs(offset),
          role: "custom" as const,
        })),
      },
    ];
  }
  const result = buildIntermediateResult(draft);
  const settings = createDrawingSettingsFromDraft(result, draft.drawingSettings);
  const builder =
    kind === "plan"
      ? createPlanDrawingBuilder()
      : kind === "profile"
        ? createProfileDrawingBuilder()
        : createCrossSectionDrawingBuilder(settings.selectedCrossSectionStation);
  const output = builder.build({ result, settings });
  return buildDrawingDocument(output.sheet, settings, output.diagnostics);
}

describe("formal drawing DXF export", () => {
  it("exports plan DXF with centerline, stations, band layers, and deterministic content", () => {
    const document = buildKindDocument("plan");
    const first = exportFormalDrawingDxf("plan", document, {
      timestamp: new Date("2026-07-14T04:00:00Z"),
      projectId: "demo",
    });
    const second = exportFormalDrawingDxf("plan", document, {
      timestamp: new Date("2026-07-14T04:00:00Z"),
      projectId: "demo",
    });

    expect(first.entityCount).toBeGreaterThan(0);
    expect(first.dxf).toContain("0\nLWPOLYLINE");
    expect(first.dxf).toContain("0\nTEXT");
    expect(first.dxf).toContain("2\nPLAN_CENTER");
    expect(first.dxf).toContain("2\nPLAN_TEXT");
    expect(first.dxf).toContain("2\nPLAN_BAND");
    expect(first.dxf).toContain("9\n$ACADVER\n1\nAC1021");
    expect(first.dxf.trimEnd().endsWith("0\nEOF")).toBe(true);
    expect(first.dxf).toBe(second.dxf);
    expect(first.fileName).toContain("liner-demo-plan-");
  });

  it("exports profile and band DXF with grid, design profile, and band", () => {
    const document = buildKindDocument("profile");
    const exported = exportFormalDrawingDxf("profile-band", document, {
      timestamp: new Date("2026-07-14T04:00:00Z"),
    });

    expect(exported.entityCount).toBeGreaterThan(0);
    expect(exported.dxf).toContain("2\nPROFILE_DESIGN");
    expect(exported.dxf).toContain("2\nPROFILE_BAND");
    expect(exported.dxf).toContain("2\nPROFILE_TEXT");
    expect(exported.fileName).toContain("profile-band");
  });

  it("exports cross-section DXF with centerline at offset zero and shape", () => {
    const document = buildKindDocument("cross-section");
    const exported = exportFormalDrawingDxf("cross-section", document, {
      timestamp: new Date("2026-07-14T04:00:00Z"),
    });
    const { document: dxfDocument } = mapDrawingDocumentToDxf(document);

    expect(exported.entityCount).toBeGreaterThan(0);
    expect(exported.dxf).toContain("2\nCROSS_SHAPE");
    expect(exported.dxf).toContain("2\nCROSS_CENTER");
    expect(exported.dxf).toContain("0\nLWPOLYLINE");
    expect(dxfDocument.entities.some((entity) => entity.kind === "line" && entity.layer === "CROSS_CENTER")).toBe(
      true,
    );
    const centerLine = dxfDocument.entities.find(
      (entity) => entity.kind === "line" && entity.layer === "CROSS_CENTER",
    );
    if (centerLine?.kind === "line") {
      expect(centerLine.start.x).toBeCloseTo(0, 6);
      expect(centerLine.end.x).toBeCloseTo(0, 6);
    }
  });

  it("handles large and negative model coordinates", () => {
    const layer = createEmptyDrawingLayer("plan-layer", "PLAN_CENTER");
    layer.primitives.push({
      kind: "line",
      id: "large-line",
      start: createPoint2(-1_000_000, -500_000),
      end: createPoint2(2_000_000, 750_000),
    });
    const document: DrawingDocument = {
      version: "1",
      sheets: [
        {
          id: "sheet",
          name: "plan",
          paper: { size: "A3", orientation: "landscape", widthMm: 420, heightMm: 297, marginMm: 10 },
          viewports: [
            {
              id: "vp",
              kind: "plan",
              modelBounds: { minX: -1e6, minY: -5e5, maxX: 2e6, maxY: 7.5e5, isEmpty: false },
              paperBounds: { minX: 10, minY: 10, maxX: 410, maxY: 287, isEmpty: false },
              transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
              layers: [layer],
            },
          ],
        },
      ],
      diagnostics: [],
      stationAxes: [],
    };

    const exported = exportFormalDrawingDxf("plan", document);
    expect(exported.dxf).toContain("-1000000");
    expect(exported.dxf).toContain("2000000");
    expect(exported.diagnostics.some((diagnostic) => diagnostic.severity === "error")).toBe(false);
  });

  it("sanitizes invalid layer names and exposes sheet presets", () => {
    expect(sanitizeDxfLayerName("平面中心")).toBe("LAYER");
    expect(sanitizeDxfLayerName("PLAN CENTER")).toBe("PLAN_CENTER");
    expect(listSheetPresets().map((preset) => preset.id)).toEqual([
      "common",
      "a1-landscape",
      "a3-landscape",
    ]);
    expect(CAD_LAYER_PRESETS.PLAN_CENTER.aciColor).toBe(1);
  });

  it("builds stable file names and canExport gate", () => {
    expect(
      buildFormalDrawingDxfFileName("cross-section", {
        projectId: "abc/..",
        timestamp: new Date("2026-01-02T03:04:05"),
      }),
    ).toMatch(/^liner-abc-cross-section-/);
    expect(canExportFormalDrawingDxf(buildKindDocument("plan"))).toBe(true);
  });

  it("serializes CAD linetypes and lineweights from presets", () => {
    const document = buildKindDocument("cross-section");
    const { document: dxfDocument } = mapDrawingDocumentToDxf(document);
    const { dxf } = serializeDxfDocument(dxfDocument);
    const centerLayer = dxfDocument.tables.layers.find((layer) => layer.name === "CROSS_CENTER");
    expect(centerLayer?.lineType).toBe("CENTER");
    expect(centerLayer?.lineweight).toBe(CAD_LAYER_PRESETS.CROSS_CENTER.lineweight);
    expect(dxf).toContain("2\nCENTER");
    expect(dxf).toContain("370\n");
  });
});
