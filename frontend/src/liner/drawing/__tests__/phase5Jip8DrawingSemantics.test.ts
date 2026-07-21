import { describe, expect, it } from "vitest";
import { ja } from "../../../i18n/ja";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import {
  buildMultiPageDrawingDocument,
  createDrawingSettingsFromDraft,
  createCrossSectionDrawingBuilder,
  createPlanDrawingBuilder,
  FORMAL_DRAWING_PAGES,
} from "../index";
import type { DrawingDocument } from "../model/document";
import type { DrawingDimension, DrawingPrimitive, DrawingText } from "../model/primitives";
import {
  P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST,
  validatePhase5FormalDrawingFixtureGate,
} from "../phase5/formalDrawingFixtureManifest";
import { collectPlanCoordinateTableRows } from "../tables/planCoordinateTable";

function collectPrimitives(document: DrawingDocument): DrawingPrimitive[] {
  return document.sheets.flatMap((sheet) =>
    sheet.viewports.flatMap((viewport) => viewport.layers.flatMap((layer) => layer.primitives)),
  );
}

function collectPrimitiveIds(document: DrawingDocument): string[] {
  return collectPrimitives(document).map((primitive) => primitive.id).sort();
}

function collectTexts(document: DrawingDocument): DrawingText[] {
  return collectPrimitives(document).filter((primitive): primitive is DrawingText => primitive.kind === "text");
}

function collectDimensions(document: DrawingDocument): DrawingDimension[] {
  return collectPrimitives(document).filter(
    (primitive): primitive is DrawingDimension => primitive.kind === "dimension",
  );
}

function createMultiOffsetDraft() {
  const draft = createDefaultLinerDraft();
  draft.offsets = [-5.5, -3.25, 0, 3.25, 5.5];
  draft.crossSections = [
    {
      id: "CS-p5-d02",
      name: "P5-D02 section",
      offsetLines: draft.offsets.map((offset, index) => ({
        id: `OL-p5-d02-${index}`,
        offset,
        elevation: index === 2 ? 0 : -0.02 * Math.abs(offset),
        role: "custom" as const,
      })),
    },
  ];
  return draft;
}

describe("P5-D02 JIP section 8 drawing semantics", () => {
  it("keeps the formal drawing list fixed and deterministic for JIP 8.1", () => {
    expect(FORMAL_DRAWING_PAGES.map((page) => [page.kind, page.routeKind, page.sheetId])).toEqual([
      ["plan", "plan", "plan-sheet"],
      ["profile", "profile", "profile-sheet"],
      ["cross_section", "cross-section", "cross_section-sheet"],
    ]);
  });

  it("emits deterministic plan line drawing, coordinate table, and line-to-line dimensions", () => {
    const result = buildIntermediateResult(createMultiOffsetDraft());
    const settings = createDrawingSettingsFromDraft(result, undefined);
    const first = createPlanDrawingBuilder().build({ result, settings }).sheet;
    const second = createPlanDrawingBuilder().build({ result, settings }).sheet;
    const firstDocument: DrawingDocument = {
      version: "0.1.0",
      sheets: [first],
      stationAxes: settings.stationAxes,
      diagnostics: [],
    };
    const secondDocument: DrawingDocument = {
      version: "0.1.0",
      sheets: [second],
      stationAxes: settings.stationAxes,
      diagnostics: [],
    };

    const coordinateRows = collectPlanCoordinateTableRows(result);
    expect(coordinateRows.length).toBeGreaterThan(0);
    expect(coordinateRows).toEqual([...coordinateRows].sort((left, right) => left.id.localeCompare(right.id)));
    expect(
      coordinateRows.every(
        (row) => /^-?\d+\.\d{3}$/.test(row.x.toFixed(3)) && /^-?\d+\.\d{3}$/.test(row.y.toFixed(3)),
      ),
    ).toBe(true);

    const dimensions = collectDimensions(firstDocument);
    expect(dimensions.some((dimension) => dimension.id.startsWith("plan-line-spacing-dimension-"))).toBe(true);
    expect(
      dimensions.every((dimension) => dimension.text !== undefined && /^\d+\.\d{2}$/.test(dimension.text)),
    ).toBe(true);
    expect(collectPrimitiveIds(firstDocument)).toEqual(collectPrimitiveIds(secondDocument));
  });

  it("emits deterministic section drawing, skew-angle annotation, and section dimensions", () => {
    const result = buildIntermediateResult(createMultiOffsetDraft());
    const settings = createDrawingSettingsFromDraft(result, undefined);
    const output = createCrossSectionDrawingBuilder().build({ result, settings });
    const document: DrawingDocument = {
      version: "0.1.0",
      sheets: [output.sheet],
      stationAxes: settings.stationAxes,
      diagnostics: [],
    };
    const texts = collectTexts(document);
    const dimensions = collectDimensions(document);

    expect(texts.some((text) => text.value.includes(ja.liner.formalDrawing.planBandRows.skewAngle))).toBe(true);
    expect(texts.some((text) => text.value.includes("90.00°"))).toBe(true);
    expect(dimensions.some((dimension) => dimension.id.startsWith("cross-section-section-dimension-"))).toBe(true);
    expect(
      dimensions.every((dimension) => dimension.text !== undefined && /^\d+\.\d{2}$/.test(dimension.text)),
    ).toBe(true);
  });

  it("keeps preview, print, and DXF semantics on one deterministic DrawingDocument", () => {
    const result = buildIntermediateResult(createDefaultLinerDraft());
    const settings = createDrawingSettingsFromDraft(result, undefined);
    const first = buildMultiPageDrawingDocument({ result, settings });
    const second = buildMultiPageDrawingDocument({ result, settings });

    expect(collectPrimitiveIds(first)).toEqual(collectPrimitiveIds(second));
    expect(collectPrimitives(first).some((primitive) => primitive.kind === "dimension")).toBe(true);
  });

  it("passes the P5-D01 fixture gate with the stricter P5-D02 JIP section 8 expectations", () => {
    const result = validatePhase5FormalDrawingFixtureGate(P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST);

    expect(result).toEqual({ ok: true, diagnostics: [] });
  });
});
