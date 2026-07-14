import { describe, expect, it } from "vitest";
import type { CanonicalLinerIntermediateResult } from "../../core/types";
import { createPaperDefinition, isValidPaperDefinition } from "../model/paper";
import {
  boundsFromPoints2,
  createEmptyBounds2,
  createPoint2,
  isEmptyBounds2,
  isFinitePoint2,
  unionBounds2,
} from "../model/geometry";
import {
  composeAffineTransform2,
  identityAffineTransform2,
  rotateAffineTransform2,
  scaleAffineTransform2,
  transformBounds2,
  transformPoint2,
  translateAffineTransform2,
} from "../transforms/affineTransform2";
import {
  createEmptyBandDrawingBuilder,
  createEmptyCrossSectionDrawingBuilder,
  createEmptyPlanDrawingBuilder,
  createEmptyProfileDrawingBuilder,
  createDefaultDrawingSettings,
} from "../builders/emptyBuilders";
import { physicalDistanceToStationAxisX, validateStationAxis } from "../model/stationAxis";
import { validateDrawingDocument } from "../validation/validateDrawingDocument";
import { createDrawingDiagnostic } from "../model/diagnostics";
import { createEmptyDrawingLayer, type DrawingDocument } from "../model/document";

const emptyIntermediate = {
  schemaVersion: "0.2.0",
  computedAt: "2026-07-13T00:00:00.000Z",
  sourceRevision: "test",
  linerModelId: "model-1",
  coordinatePolicyId: "policy-1",
  horizontal: {
    totalLength: 0,
    segments: [],
    sampledPoints: [],
    piPoints: [],
  },
  vertical: {
    profileElevation: 0,
    segments: [],
    sampledPoints: [],
    gradeBreaks: [],
  },
  stations: {
    entries: [],
    originDisplayedStation: 0,
    increasingDirection: "forward" as const,
  },
  grid: {
    points: [],
    lines: [],
    cells: [],
  },
  spans: [],
  piers: [],
  frameHints: {
    defaultMemberGroupKey: "default",
    memberGroupRules: [],
    supportTemplates: [],
    connectivityMode: "grid_full" as const,
  },
  sections: [],
  diagnostics: [],
  dependencyGraph: {
    nodes: [],
    edges: [],
    createdFromSourceRevision: "test",
  },
} satisfies CanonicalLinerIntermediateResult;

describe("drawing geometry", () => {
  it("creates and validates finite points", () => {
    const point = createPoint2(1, 2);
    expect(isFinitePoint2(point)).toBe(true);
    expect(isFinitePoint2({ x: Number.NaN, y: 2 })).toBe(false);
  });

  it("builds bounds from points and keeps empty bounds explicit", () => {
    const empty = createEmptyBounds2();
    expect(isEmptyBounds2(empty)).toBe(true);
    expect(boundsFromPoints2([])).toEqual(empty);

    const bounds = boundsFromPoints2([createPoint2(1, 2), createPoint2(-3, 4)]);
    expect(bounds).toEqual({
      minX: -3,
      minY: 2,
      maxX: 1,
      maxY: 4,
      isEmpty: false,
    });
  });

  it("unions bounds without mutating inputs", () => {
    const left = boundsFromPoints2([createPoint2(0, 0), createPoint2(1, 1)]);
    const right = boundsFromPoints2([createPoint2(-2, -1), createPoint2(2, 3)]);
    expect(unionBounds2(left, right)).toEqual({
      minX: -2,
      minY: -1,
      maxX: 2,
      maxY: 3,
      isEmpty: false,
    });
    expect(left).toEqual({
      minX: 0,
      minY: 0,
      maxX: 1,
      maxY: 1,
      isEmpty: false,
    });
  });
});

describe("affine transform 2", () => {
  it("supports identity translate scale rotate composition and bounds", () => {
    const identity = identityAffineTransform2();
    expect(transformPoint2(identity, { x: 1, y: 2 })).toEqual({ x: 1, y: 2 });

    const moved = transformPoint2(translateAffineTransform2(3, 4), { x: 1, y: 2 });
    expect(moved).toEqual({ x: 4, y: 6 });

    const scaled = transformPoint2(scaleAffineTransform2(2, 3), { x: 1, y: 2 });
    expect(scaled).toEqual({ x: 2, y: 6 });

    const rotated = transformPoint2(rotateAffineTransform2(Math.PI / 2), { x: 1, y: 0 });
    expect(rotated.x).toBeCloseTo(0, 9);
    expect(rotated.y).toBeCloseTo(1, 9);

    const aroundCenter = transformPoint2(
      rotateAffineTransform2(Math.PI / 2, { x: 1, y: 1 }),
      { x: 2, y: 1 },
    );
    expect(aroundCenter.x).toBeCloseTo(1, 9);
    expect(aroundCenter.y).toBeCloseTo(2, 9);

    const composed = composeAffineTransform2(
      translateAffineTransform2(1, 2),
      scaleAffineTransform2(2, 2),
    );
    expect(transformPoint2(composed, { x: 3, y: 4 })).toEqual({ x: 8, y: 12 });

    const bounds = transformBounds2(translateAffineTransform2(10, -2), {
      minX: 0,
      minY: 0,
      maxX: 5,
      maxY: 6,
      isEmpty: false,
    });
    expect(bounds).toEqual({
      minX: 10,
      minY: -2,
      maxX: 15,
      maxY: 4,
      isEmpty: false,
    });
  });
});

describe("paper definition", () => {
  it("resolves size and orientation", () => {
    expect(createPaperDefinition("A1", "landscape", 10)).toEqual({
      size: "A1",
      orientation: "landscape",
      widthMm: 841,
      heightMm: 594,
      marginMm: 10,
    });
    expect(createPaperDefinition("A3", "portrait", 5)).toEqual({
      size: "A3",
      orientation: "portrait",
      widthMm: 297,
      heightMm: 420,
      marginMm: 5,
    });
    expect(isValidPaperDefinition(createPaperDefinition("A1", "landscape", 10))).toBe(true);
    expect(isValidPaperDefinition(createPaperDefinition("A1", "landscape", -1))).toBe(false);
    expect(isValidPaperDefinition(createPaperDefinition("A4", "portrait", 200))).toBe(false);
  });
});

describe("station axis", () => {
  it("maps physical distance to model X independently of labels", () => {
    const axis = {
      id: "axis-1",
      startPhysicalDistance: 10,
      endPhysicalDistance: 30,
      startModelX: 100,
      endModelX: 300,
      stationLabels: [
        {
          id: "label-1",
          physicalDistance: 10,
          displayedStation: 10,
          label: "No.10+00",
          kind: "start" as const,
        },
      ],
    };

    expect(physicalDistanceToStationAxisX(axis, 20)).toBe(200);
    expect(physicalDistanceToStationAxisX(axis, 30)).toBe(300);
    expect(validateStationAxis(axis)).toEqual([]);
  });

  it("rejects reversed ranges", () => {
    expect(
      validateStationAxis({
        id: "axis-2",
        startPhysicalDistance: 30,
        endPhysicalDistance: 10,
        startModelX: 0,
        endModelX: 1,
        stationLabels: [],
      }),
    ).toHaveLength(1);
  });
});

describe("drawing document", () => {
  function buildDocument(overrides: Partial<DrawingDocument> = {}): DrawingDocument {
    const paper = createPaperDefinition("A1", "landscape", 10);
    const base: DrawingDocument = {
      version: "0.1.0",
      sheets: [
        {
          id: "sheet-1",
          name: "Sheet 1",
          paper,
          viewports: [
            {
              id: "viewport-1",
              kind: "plan",
              modelBounds: createEmptyBounds2(),
              paperBounds: {
                minX: 0,
                minY: 0,
                maxX: 574,
                maxY: 821,
                isEmpty: false,
              },
              transform: identityAffineTransform2(),
              layers: [
                createEmptyDrawingLayer("layer-1"),
              ],
            },
          ],
        },
      ],
      diagnostics: [],
      stationAxes: [],
    };

    return {
      ...base,
      ...overrides,
    };
  }

  it("accepts minimal valid documents", () => {
    expect(validateDrawingDocument(buildDocument())).toEqual({
      diagnostics: [],
      isValid: true,
    });
  });

  it("rejects duplicate ids and invalid geometry", () => {
    const invalid = buildDocument({
      sheets: [
        {
          id: "sheet-1",
          name: "Sheet 1",
          paper: {
            size: "A1",
            orientation: "landscape",
            widthMm: -1,
            heightMm: 0,
            marginMm: -1,
          },
          viewports: [
            {
              id: "viewport-1",
              kind: "plan",
              modelBounds: {
                minX: Number.NaN,
                minY: 0,
                maxX: 1,
                maxY: 1,
                isEmpty: false,
              },
              paperBounds: createEmptyBounds2(),
              transform: {
                a: 1,
                b: 0,
                c: 0,
                d: 1,
                e: Number.POSITIVE_INFINITY,
                f: 0,
              },
              layers: [
                {
                  id: "layer-1",
                  name: "layer-1",
                  visible: true,
                  primitives: [
                    {
                      kind: "polyline",
                      id: "primitive-1",
                      points: [createPoint2(0, 0)],
                    },
                    {
                      kind: "arc",
                      id: "primitive-2",
                      center: createPoint2(0, 0),
                      radius: 0,
                      startAngleRad: 0,
                      endAngleRad: 1,
                    },
                    {
                      kind: "text",
                      id: "primitive-3",
                      position: createPoint2(0, 0),
                      value: "A",
                      heightMm: 0,
                    },
                  ],
                },
                {
                  id: "layer-1",
                  name: "duplicate layer",
                  visible: true,
                  primitives: [],
                },
              ],
            },
            {
              id: "viewport-1",
              kind: "profile",
              modelBounds: createEmptyBounds2(),
              paperBounds: createEmptyBounds2(),
              transform: identityAffineTransform2(),
              layers: [],
            },
          ],
        },
        {
          id: "sheet-1",
          name: "Sheet 1 copy",
          paper: createPaperDefinition("A1", "landscape", 10),
          viewports: [
            {
              id: "viewport-2",
              kind: "profile",
              modelBounds: createEmptyBounds2(),
              paperBounds: createEmptyBounds2(),
              transform: identityAffineTransform2(),
              layers: [],
            },
          ],
        },
      ],
    });

    const result = validateDrawingDocument(invalid);
    expect(result.isValid).toBe(false);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "DRAWING_INVALID_PAPER")).toBe(true);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "DRAWING_INVALID_MODEL_BOUNDS")).toBe(true);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "DRAWING_INVALID_TRANSFORM")).toBe(true);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "DRAWING_POLYLINE_TOO_SHORT")).toBe(true);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "DRAWING_ARC_INVALID_RADIUS")).toBe(true);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "DRAWING_TEXT_INVALID_HEIGHT")).toBe(true);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "DRAWING_DUPLICATE_SHEET_ID")).toBe(true);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "DRAWING_DUPLICATE_LAYER_ID")).toBe(true);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "DRAWING_DUPLICATE_VIEWPORT_ID")).toBe(true);
  });
});

describe("builders", () => {
  it("creates deterministic empty sheets without mutating the source input", () => {
    const settings = createDefaultDrawingSettings();
    const result = structuredClone(emptyIntermediate);

    const planBuilder = createEmptyPlanDrawingBuilder();
    const profileBuilder = createEmptyProfileDrawingBuilder();
    const crossBuilder = createEmptyCrossSectionDrawingBuilder();
    const bandBuilder = createEmptyBandDrawingBuilder();

    const plan = planBuilder.build({ result, settings });
    const profile = profileBuilder.build({ result, settings });
    const cross = crossBuilder.build({ result, settings });
    const band = bandBuilder.build({ result, settings });

    expect(plan.sheet.id).toBe("plan-sheet");
    expect(profile.sheet.id).toBe("profile-sheet");
    expect(cross.sheet.id).toBe("cross_section-sheet");
    expect(band.sheet.id).toBe("band-sheet");
    expect(plan.diagnostics[0]?.code).toBe("DRAWING_BUILDER_EMPTY");
    expect(profile.diagnostics[0]?.code).toBe("DRAWING_BUILDER_EMPTY");
    expect(cross.diagnostics[0]?.code).toBe("DRAWING_BUILDER_EMPTY");
    expect(band.diagnostics[0]?.code).toBe("DRAWING_BUILDER_EMPTY");
    expect(result).toEqual(emptyIntermediate);
  });
});

describe("serialization safety", () => {
  it("remains JSON serializable", () => {
    const document: DrawingDocument = {
      version: "0.1.0",
      sheets: [],
      diagnostics: [
        createDrawingDiagnostic("info", "DRAWING_TEST", "ok"),
      ],
      stationAxes: [],
    };

    expect(() => JSON.stringify(document)).not.toThrow();
  });
});
