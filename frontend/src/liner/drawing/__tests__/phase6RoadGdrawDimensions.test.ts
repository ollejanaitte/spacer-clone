import { describe, expect, it } from "vitest";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import type {
  CanonicalLinerIntermediateResult,
  GridPointResult,
  LinearAlignment,
} from "../../core/types";
import {
  appendAlignmentSegmentDimensions,
  appendPlanLineSpacingDimensions,
} from "../dimensions/alignmentSegmentDimensions";
import {
  createCrossSectionDrawingBuilder,
  createDrawingSettingsFromDraft,
  createPlanDrawingBuilder,
} from "../builders/formalBuilders";
import { createEmptyDrawingLayer } from "../model/document";
import type { DrawingDocument, DrawingViewport } from "../model/document";
import type { DrawingDimension, DrawingPrimitive } from "../model/primitives";
import { mapDrawingDocumentToDxf } from "../../dxf/mapper/mapDrawingDocumentToDxf";

function buildPr39bIntermediate(): CanonicalLinerIntermediateResult {
  const alignment: LinearAlignment = {
    id: "alignment-pr39b",
    linerModelId: "liner-pr39b",
    coordinatePolicyId: "global",
    elements: [
      {
        id: "S1",
        type: "straight",
        start: { x: 0, y: 0 },
        azimuth: 0,
        length: 30,
      },
      {
        id: "S2",
        type: "straight",
        start: { x: 30, y: 0 },
        azimuth: 0,
        length: 50,
      },
    ],
  };
  const offsets = [-5.5, -3.25, 0, 3.25, 5.5];
  return buildIntermediateResult({
    alignment,
    stationDefinition: {
      originDisplayedStation: 0,
      interval: 10,
      explicitStations: [0, 30, 80],
    },
    offsets,
    crossSections: [
      {
        id: "CS-pr39b",
        name: "PR-39B section",
        offsetLines: offsets.map((offset, index) => ({
          id: `OL-pr39b-${index}`,
          offset,
          elevation: index === 2 ? 0 : -0.015 * Math.abs(offset),
          role: "custom" as const,
        })),
      },
    ],
    verticalAlignment: {
      id: "VA-pr39b",
      elements: [
        {
          type: "grade",
          id: "VG-pr39b",
          startStation: 0,
          endStation: 80,
          startElevation: 10,
          grade: 0,
          length: 80,
        },
      ],
    },
    crossSlopeIntervals: [
      {
        id: "CF-pr39b-flat",
        startPhysicalDistance: 0,
        endPhysicalDistance: 80,
        mode: "flat",
        leftSlopePercent: 0,
        rightSlopePercent: 0,
      },
    ],
    z: 10,
  });
}

function collectPrimitives(viewport: DrawingViewport): DrawingPrimitive[] {
  return viewport.layers.flatMap((layer) => layer.primitives);
}

function collectDimensions(viewport: DrawingViewport): DrawingDimension[] {
  return collectPrimitives(viewport).filter(
    (primitive): primitive is DrawingDimension => primitive.kind === "dimension",
  );
}

function collectDocumentDimensions(document: DrawingDocument): DrawingDimension[] {
  return document.sheets.flatMap((sheet) =>
    sheet.viewports.flatMap((viewport) => collectDimensions(viewport)),
  );
}

function pointById(result: CanonicalLinerIntermediateResult): Map<string, GridPointResult> {
  return new Map(result.grid.points.map((point) => [point.id, point]));
}

function firstPhysicalDistance(
  pointIds: readonly string[],
  points: ReadonlyMap<string, GridPointResult>,
): number {
  for (const pointId of pointIds) {
    const point = points.get(pointId);
    if (point) {
      return point.physicalDistance;
    }
  }
  return Number.POSITIVE_INFINITY;
}

function assertValidDimensions(dimensions: readonly DrawingDimension[]): void {
  const ids = new Set<string>();
  const textGeometry = new Set<string>();
  for (const dimension of dimensions) {
    expect(ids.has(dimension.id)).toBe(false);
    ids.add(dimension.id);
    expect(Number.isFinite(dimension.start.x)).toBe(true);
    expect(Number.isFinite(dimension.start.y)).toBe(true);
    expect(Number.isFinite(dimension.end.x)).toBe(true);
    expect(Number.isFinite(dimension.end.y)).toBe(true);
    expect(Number.isFinite(dimension.offset)).toBe(true);
    expect(Math.hypot(dimension.end.x - dimension.start.x, dimension.end.y - dimension.start.y)).toBeGreaterThan(0);
    expect(dimension.text).toMatch(/^\d+\.\d{2}$/);
    const key = [
      dimension.text,
      dimension.start.x.toFixed(6),
      dimension.start.y.toFixed(6),
      dimension.end.x.toFixed(6),
      dimension.end.y.toFixed(6),
    ].join(":");
    expect(textGeometry.has(key)).toBe(false);
    textGeometry.add(key);
  }
}

describe("Phase 6 PR-39B Road GDRAW dimensions", () => {
  it("emits source-backed deterministic straight plan segment dimensions", () => {
    const result = buildPr39bIntermediate();
    const settings = createDrawingSettingsFromDraft(result, undefined);
    const output = createPlanDrawingBuilder().build({ result, settings });
    const dimensions = collectDimensions(output.sheet.viewports[0]!).filter((dimension) =>
      dimension.id.startsWith("plan-segment-dimension-"),
    );
    const expectedSegments = result.horizontal.segments.filter((segment) => segment.type === "straight");

    expect(dimensions.map((dimension) => dimension.id)).toEqual(
      expectedSegments.map((segment) => `plan-segment-dimension-${segment.id}`),
    );
    for (const segment of expectedSegments) {
      const dimension = dimensions.find((candidate) => candidate.id === `plan-segment-dimension-${segment.id}`);
      const start = result.horizontal.sampledPoints.find(
        (point) => Math.abs(point.physicalDistance - segment.startPhysicalDistance) <= 1e-6,
      );
      const end = result.horizontal.sampledPoints.find(
        (point) => Math.abs(point.physicalDistance - segment.endPhysicalDistance) <= 1e-6,
      );
      expect(dimension).toBeDefined();
      expect(start).toBeDefined();
      expect(end).toBeDefined();
      expect(dimension?.start).toEqual({ x: start?.x, y: start?.y });
      expect(dimension?.end).toEqual({ x: end?.x, y: end?.y });
      expect(dimension?.offset).toBe(-2.5);
      expect(dimension?.text).toBe(
        (segment.endPhysicalDistance - segment.startPhysicalDistance).toFixed(2),
      );
    }
    assertValidDimensions(dimensions);
  });

  it("emits adjacent transverse grid line spacing dimensions only from real source points", () => {
    const result = buildPr39bIntermediate();
    const settings = createDrawingSettingsFromDraft(result, undefined);
    const output = createPlanDrawingBuilder().build({ result, settings });
    const dimensions = collectDimensions(output.sheet.viewports[0]!).filter((dimension) =>
      dimension.id.startsWith("plan-line-spacing-dimension-"),
    );
    const points = pointById(result);
    const expected = result.grid.lines
      .filter((line) => line.direction === "transverse")
      .sort((left, right) =>
        firstPhysicalDistance(left.pointIds, points) - firstPhysicalDistance(right.pointIds, points)
        || left.id.localeCompare(right.id),
      )
      .flatMap((line) => {
        const linePoints = line.pointIds
          .map((pointId) => points.get(pointId))
          .filter((point): point is GridPointResult => Boolean(point))
          .sort((left, right) => left.offset - right.offset || left.id.localeCompare(right.id));
        return linePoints.slice(0, -1).map((startPoint, index) => {
          const endPoint = linePoints[index + 1]!;
          return {
            id: `plan-line-spacing-dimension-${line.id}-${startPoint.id}-${endPoint.id}`,
            text: Math.abs(endPoint.offset - startPoint.offset).toFixed(2),
            start: { x: startPoint.x, y: startPoint.y },
            end: { x: endPoint.x, y: endPoint.y },
          };
        });
      });

    expect(dimensions.map((dimension) => ({
      id: dimension.id,
      text: dimension.text,
      start: dimension.start,
      end: dimension.end,
    }))).toEqual(expected);
    expect(dimensions.every((dimension) => dimension.offset === 2.5)).toBe(true);
    assertValidDimensions(dimensions);
  });

  it("excludes invalid or self-referential transverse grid lines in the line spacing helper", () => {
    const result = buildPr39bIntermediate();
    const validLine = result.grid.lines.find((line) => line.direction === "transverse");
    const validPointId = validLine?.pointIds[0];
    expect(validLine).toBeDefined();
    expect(validPointId).toBeDefined();
    const layer = createEmptyDrawingLayer("test-plan-dimensions");

    appendPlanLineSpacingDimensions(layer, {
      ...result,
      grid: {
        ...result.grid,
        lines: [
          {
            ...validLine!,
            id: "GL-invalid-missing",
            pointIds: ["missing-start", "missing-end"],
          },
          {
            ...validLine!,
            id: "GL-invalid-self",
            pointIds: [validPointId!, validPointId!],
          },
          ...result.grid.lines,
        ],
      },
    });

    const dimensions = layer.primitives.filter(
      (primitive): primitive is DrawingDimension => primitive.kind === "dimension",
    );
    expect(dimensions.some((dimension) => dimension.id.includes("GL-invalid"))).toBe(false);
    assertValidDimensions(dimensions);
  });

  it("emits existing cross-section dimensions as adjacent source offset spacing without duplicates", () => {
    const result = buildPr39bIntermediate();
    const settings = createDrawingSettingsFromDraft(result, undefined);
    const section = result.sections[0]!;
    const output = createCrossSectionDrawingBuilder(section.physicalDistance).build({ result, settings });
    const dimensions = collectDimensions(output.sheet.viewports[0]!).filter((dimension) =>
      dimension.id.startsWith("cross-section-section-dimension-"),
    );
    const expected = section.points.slice(0, -1).map((startPoint, index) => {
      const endPoint = section.points[index + 1]!;
      const textY = Math.min(startPoint.z, endPoint.z) - 0.75;
      return {
        id: `cross-section-section-dimension-${section.id}-${startPoint.id}-${endPoint.id}`,
        start: { x: startPoint.offset, y: startPoint.z },
        end: { x: endPoint.offset, y: endPoint.z },
        offset: -0.75,
        text: Math.abs(endPoint.offset - startPoint.offset).toFixed(2),
        textPosition: {
          x: (startPoint.offset + endPoint.offset) / 2,
          y: textY,
        },
      };
    });

    expect(dimensions).toEqual(expected.map((dimension) => ({ kind: "dimension" as const, ...dimension })));
    assertValidDimensions(dimensions);
  });

  it("keeps DrawingDimension DXF parity through the existing decomposition mapper", () => {
    const result = buildPr39bIntermediate();
    const settings = createDrawingSettingsFromDraft(result, undefined);
    const planSheet = createPlanDrawingBuilder().build({ result, settings }).sheet;
    const crossSectionSheet = createCrossSectionDrawingBuilder(result.sections[0]?.physicalDistance).build({
      result,
      settings,
    }).sheet;
    const document: DrawingDocument = {
      version: "0.1.0",
      sheets: [planSheet, crossSectionSheet],
      stationAxes: settings.stationAxes,
      diagnostics: [],
    };

    const dimensions = collectDocumentDimensions(document);
    const mapped = mapDrawingDocumentToDxf(document);
    const decomposedDiagnostics = mapped.diagnostics.filter(
      (diagnostic) => diagnostic.code === "DXF_DIMENSION_DECOMPOSED",
    );

    expect(dimensions.length).toBeGreaterThan(0);
    expect(decomposedDiagnostics).toHaveLength(dimensions.length);
    expect(mapped.document.entities.some((entity) => entity.kind === "line")).toBe(true);
    expect(mapped.document.entities.some((entity) => entity.kind === "text")).toBe(true);
    for (const dimension of dimensions) {
      expect(mapped.document.entities.some((entity) => entity.kind === "text" && entity.text === dimension.text)).toBe(
        true,
      );
    }
  });

  it("keeps direct segment helper output stable and skips zero-length source spans", () => {
    const result = buildPr39bIntermediate();
    const layer = createEmptyDrawingLayer("test-segment-dimensions");
    appendAlignmentSegmentDimensions(layer, {
      ...result,
      horizontal: {
        ...result.horizontal,
        segments: [
          {
            ...result.horizontal.segments[0]!,
            id: "HSEG-zero",
            endPhysicalDistance: result.horizontal.segments[0]!.startPhysicalDistance,
          },
          ...result.horizontal.segments,
        ],
      },
    });
    const dimensions = layer.primitives.filter(
      (primitive): primitive is DrawingDimension => primitive.kind === "dimension",
    );

    expect(dimensions.map((dimension) => dimension.id)).toEqual(
      result.horizontal.segments.map((segment) => `plan-segment-dimension-${segment.id}`),
    );
    assertValidDimensions(dimensions);
  });
});
