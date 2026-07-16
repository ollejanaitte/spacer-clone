import { describe, expect, it } from "vitest";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import type { LinearAlignment } from "../../core/types";
import {
  createDrawingSettingsFromDraft,
  createPlanDrawingBuilder,
  createProfileDrawingBuilder,
} from "../builders/formalBuilders";
import { collectPlanCoordinateTableRows } from "../tables/planCoordinateTable";
import type { DrawingViewport } from "../model/document";
import type { DrawingText } from "../model/primitives";
import { ja } from "../../../i18n/ja";

function collectPaperTexts(viewport: DrawingViewport): DrawingText[] {
  return viewport.layers
    .filter((layer) => layer.coordinateSpace === "paper")
    .flatMap((layer) => layer.primitives)
    .filter((primitive): primitive is DrawingText => primitive.kind === "text");
}

function collectModelPrimitives(viewport: DrawingViewport) {
  return viewport.layers
    .filter((layer) => layer.coordinateSpace !== "paper")
    .flatMap((layer) => layer.primitives);
}

function buildArcIntermediate() {
  const alignment: LinearAlignment = {
    id: "alignment-arc-remediation",
    linerModelId: "liner-model-arc",
    coordinatePolicyId: "global",
    elements: [
      {
        id: "A1",
        type: "arc",
        start: { x: 10000, y: 10000 },
        azimuth: 0,
        radius: 50,
        turn: "left",
        length: 80,
      },
    ],
  };
  return buildIntermediateResult({
    alignment,
    stationDefinition: {
      originDisplayedStation: 0,
      explicitStations: [0, 40, 80],
    },
    crossSections: [
      {
        id: "CS-1",
        name: "Main",
        offsetLines: [
          { id: "OL-c", offset: 0, elevation: 0, role: "lane" },
          { id: "OL-l", offset: -4, elevation: 0.25, role: "edge" },
          { id: "OL-r", offset: 4, elevation: 0.25, role: "edge" },
        ],
      },
    ],
    offsets: [-4, 0, 4],
    verticalAlignment: {
      id: "VA-1",
      elements: [
        {
          type: "grade",
          id: "VG-1",
          startStation: 0,
          endStation: 80,
          startElevation: 10,
          grade: 0,
          length: 80,
        },
      ],
    },
    z: 10,
    crossSlopeIntervals: [
      {
        id: "CF-flat",
        startPhysicalDistance: 0,
        endPhysicalDistance: 80,
        mode: "flat",
        leftSlopePercent: 0,
        rightSlopePercent: 0,
      },
    ],
  });
}

describe("Phase 5 Japanese remediation drawing completeness", () => {
  it("exposes profile band Japanese rows for elevation, grade, and crossfall", () => {
    const intermediate = buildIntermediateResult(createDefaultLinerDraft());
    const settings = createDrawingSettingsFromDraft(intermediate, undefined);
    const output = createProfileDrawingBuilder().build({ result: intermediate, settings });
    const bandTexts = collectPaperTexts(output.sheet.viewports[1]!);
    const labels = bandTexts.map((text) => text.value);

    expect(labels).toContain(ja.liner.formalDrawing.bandRows.station);
    expect(labels).toContain(ja.liner.formalDrawing.bandRows.additionalDistance);
    expect(labels).toContain(ja.liner.formalDrawing.bandRows.singleDistance);
    expect(labels).toContain(ja.liner.formalDrawing.bandRows.designElevation);
    expect(labels).toContain(ja.liner.formalDrawing.bandRows.groundElevation);
    expect(labels).toContain(ja.liner.formalDrawing.bandRows.grade);
    expect(labels).toContain(ja.liner.formalDrawing.bandRows.crossfall);
  });

  it("marks missing ground elevation explicitly in profile band", () => {
    const intermediate = buildIntermediateResult(createDefaultLinerDraft());
    const settings = createDrawingSettingsFromDraft(intermediate, undefined);
    const output = createProfileDrawingBuilder().build({ result: intermediate, settings });
    const bandTexts = collectPaperTexts(output.sheet.viewports[1]!);
    const groundValues = bandTexts.filter((text) => text.value === ja.liner.formalDrawing.groundLineUnavailable);

    expect(groundValues.length).toBeGreaterThan(0);
  });

  it("adds plan coordinate table and straight segment dimensions from alignment data", () => {
    const intermediate = buildArcIntermediate();
    const settings = createDrawingSettingsFromDraft(intermediate, undefined);
    const output = createPlanDrawingBuilder().build({ result: intermediate, settings });
    const planViewport = output.sheet.viewports[0]!;
    const bandViewport = output.sheet.viewports[1]!;

    const coordinateRows = collectPlanCoordinateTableRows(intermediate);
    expect(coordinateRows.some((row) => row.pointLabel === ja.liner.formalDrawing.planCurvePoints.bc)).toBe(true);
    expect(coordinateRows.some((row) => row.pointLabel === ja.liner.formalDrawing.planCurvePoints.bp)).toBe(true);

    const annotationTexts = collectPaperTexts(planViewport);
    expect(annotationTexts.some((text) => text.value === ja.liner.formalDrawing.coordinateTable.title)).toBe(true);
    expect(annotationTexts.some((text) => text.value === ja.liner.formalDrawing.coordinateTable.columns.x)).toBe(
      true,
    );

    const bandLabels = collectPaperTexts(bandViewport).map((text) => text.value);
    expect(bandLabels).toContain(ja.liner.formalDrawing.bandRows.additionalDistance);
    expect(bandLabels).toContain(ja.liner.formalDrawing.bandRows.singleDistance);
    expect(
      collectPaperTexts(bandViewport).some((text) => text.value.startsWith("No.")),
    ).toBe(true);
  });

  it("emits DrawingDimension primitives for straight alignment segments", () => {
    const intermediate = buildIntermediateResult(createDefaultLinerDraft());
    const settings = createDrawingSettingsFromDraft(intermediate, undefined);
    const output = createPlanDrawingBuilder().build({ result: intermediate, settings });
    const dimensions = collectModelPrimitives(output.sheet.viewports[0]!).filter(
      (primitive) => primitive.kind === "dimension",
    );

    expect(dimensions.length).toBeGreaterThan(0);
    expect(dimensions.every((primitive) => primitive.kind !== "dimension" || primitive.text !== undefined)).toBe(
      true,
    );
  });

  it("includes Type B coordinate table with local origin coordinates", () => {
    const intermediate = buildArcIntermediate();
    const settings = {
      ...createDrawingSettingsFromDraft(intermediate, undefined),
      planType: "centerline_only" as const,
    };
    const output = createPlanDrawingBuilder().build({ result: intermediate, settings });
    const planViewport = output.sheet.viewports[0]!;
    const tableTexts = collectPaperTexts(planViewport);

    expect(tableTexts.some((text) => text.value === ja.liner.formalDrawing.coordinateTable.title)).toBe(true);
    expect(tableTexts.some((text) => /^-?\d+\.\d{3}$/.test(text.value))).toBe(true);
  });
});
