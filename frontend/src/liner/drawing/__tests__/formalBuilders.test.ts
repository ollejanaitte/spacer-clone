import { describe, expect, it } from "vitest";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import {
  createCrossSectionDrawingBuilder,
  createDrawingSettingsFromDraft,
  createPlanDrawingBuilder,
  createProfileDrawingBuilder,
} from "../builders/formalBuilders";
import { FORMAL_DRAWING_LAYOUT } from "../builders/formalPaperLayout";
import { createPaperDefinition } from "../model/paper";
import type { DrawingViewport } from "../model/document";
import type { DrawingText } from "../model/primitives";
import { createPoint2, type Bounds2, type Point2 } from "../model/geometry";
import { transformPoint2 } from "../transforms/affineTransform2";
import { ja } from "../../../i18n/ja";
import type { LinearAlignment } from "../../core/types";

function collectAllText(viewport: DrawingViewport): DrawingText[] {
  return viewport.layers
    .flatMap((layer) => layer.primitives)
    .filter((primitive): primitive is DrawingText => primitive.kind === "text");
}

function pointInsideBounds(point: Point2, bounds: Bounds2, epsilon = 1e-3): boolean {
  return (
    point.x >= bounds.minX - epsilon
    && point.x <= bounds.maxX + epsilon
    && point.y >= bounds.minY - epsilon
    && point.y <= bounds.maxY + epsilon
  );
}

function clipRatioForCenterline(viewport: DrawingViewport): number {
  const centerline = viewport.layers
    .flatMap((layer) => layer.primitives)
    .find((primitive) => primitive.kind === "polyline" && primitive.id === "plan-centerline");
  if (!centerline || centerline.kind !== "polyline") {
    return 0;
  }
  const insideCount = centerline.points.filter((point) =>
    pointInsideBounds(transformPoint2(viewport.transform, point), viewport.paperBounds),
  ).length;
  return insideCount / centerline.points.length;
}

function buildCurveAlignment(kind: "arc" | "clothoid"): LinearAlignment {
  if (kind === "arc") {
    return {
      id: "alignment-arc",
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
  }
  return {
    id: "alignment-clothoid",
    linerModelId: "liner-model-clothoid",
    coordinatePolicyId: "global",
    elements: [
      {
        id: "C1",
        type: "clothoid",
        start: { x: 20000, y: 15000 },
        azimuth: Math.PI / 4,
        clothoidParameter: 100,
        length: 60,
        startRadius: null,
        endRadius: 500,
        turn: "left",
      },
    ],
  };
}

function buildCurveIntermediate(kind: "arc" | "clothoid") {
  const alignment = buildCurveAlignment(kind);
  const totalLength = kind === "arc" ? 80 : 60;
  return buildIntermediateResult({
    alignment,
    stationDefinition: {
      originDisplayedStation: 0,
      explicitStations: [0, totalLength / 2, totalLength],
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
          endStation: kind === "arc" ? 80 : 60,
          startElevation: 10,
          grade: 0,
          length: kind === "arc" ? 80 : 60,
        },
      ],
    },
    z: 10,
    crossSlopeIntervals: [
      {
        id: "CF-flat",
        startPhysicalDistance: 0,
        endPhysicalDistance: kind === "arc" ? 80 : 60,
        mode: "flat",
        leftSlopePercent: 0,
        rightSlopePercent: 0,
      },
    ],
  });
}

function collectModelPoints(viewport: DrawingViewport): Point2[] {
  const points: Point2[] = [];
  for (const layer of viewport.layers) {
    if (layer.coordinateSpace === "paper") {
      continue;
    }
    for (const primitive of layer.primitives) {
      if (primitive.kind === "polyline") {
        points.push(...primitive.points);
      } else if (primitive.kind === "text") {
        points.push(primitive.position);
      }
    }
  }
  return points;
}

function collectPrimitives(viewport: DrawingViewport) {
  return viewport.layers.flatMap((layer) => layer.primitives);
}

function collectPaperText(viewport: DrawingViewport): DrawingText[] {
  return viewport.layers
    .filter((layer) => layer.coordinateSpace === "paper")
    .flatMap((layer) => layer.primitives)
    .filter((primitive): primitive is DrawingText => primitive.kind === "text");
}

function viewportScale(viewport: DrawingViewport): number {
  return Math.abs(viewport.transform.a);
}

function crossSectionPolylinePoints(viewport: DrawingViewport): string | null {
  for (const layer of viewport.layers) {
    for (const primitive of layer.primitives) {
      if (primitive.kind === "polyline" && primitive.id.startsWith("cross-section-")) {
        return primitive.points.map((point) => `${point.x.toFixed(4)},${point.y.toFixed(4)}`).join(" ");
      }
    }
  }
  return null;
}

function bandRowSpanMm(viewport: DrawingViewport): number {
  const rowLine = collectPrimitives(viewport).find(
    (primitive) => primitive.kind === "polyline" && primitive.id.endsWith("row-0"),
  );
  if (!rowLine || rowLine.kind !== "polyline") {
    return 0;
  }
  return Math.abs(rowLine.points[1]!.x - rowLine.points[0]!.x);
}

describe("formal drawing builders (redline)", () => {
  const intermediate = buildIntermediateResult(createDefaultLinerDraft());
  const settings = createDrawingSettingsFromDraft(intermediate, undefined);

  it("uses landscape paper wider than tall for formal sheets", () => {
    const output = createPlanDrawingBuilder().build({ result: intermediate, settings });
    expect(output.sheet.paper.widthMm).toBeGreaterThan(output.sheet.paper.heightMm);
    expect(createPaperDefinition("A2", "landscape", 10)).toMatchObject({
      widthMm: 594,
      heightMm: 420,
    });
  });

  it("builds plan sheet with upper geometry and lower band viewports", () => {
    const output = createPlanDrawingBuilder().build({ result: intermediate, settings });
    expect(output.sheet.viewports).toHaveLength(2);
    expect(output.sheet.viewports.map((viewport) => viewport.kind)).toEqual(["plan", "band"]);
  });

  it("fits plan and band primitives with readable viewport scale", () => {
    const output = createPlanDrawingBuilder().build({ result: intermediate, settings });
    const planViewport = output.sheet.viewports[0]!;
    const bandViewport = output.sheet.viewports[1]!;

    expect(viewportScale(planViewport)).toBeGreaterThan(3);
    expect(bandViewport.transform.a).toBe(1);
    expect(collectModelPoints(planViewport).length).toBeGreaterThan(5);
    expect(collectPrimitives(bandViewport).length).toBeGreaterThan(5);
  });

  it("allocates readable paper text and wide band rows for default 100m plan", () => {
    const output = createPlanDrawingBuilder().build({ result: intermediate, settings });
    const bandViewport = output.sheet.viewports[1]!;
    const bandTexts = collectPaperText(bandViewport);
    const bandWidth = bandViewport.paperBounds.maxX - bandViewport.paperBounds.minX;

    expect(bandTexts.length).toBeGreaterThan(0);
    expect(bandTexts.every((text) => text.heightMm >= FORMAL_DRAWING_LAYOUT.minReadableTextHeightMm)).toBe(true);
    expect(bandRowSpanMm(bandViewport)).toBeGreaterThan(bandWidth * 0.7);
  });

  it("fills plan geometry width and keeps content in the upper workspace", () => {
    const output = createPlanDrawingBuilder().build({ result: intermediate, settings });
    const planViewport = output.sheet.viewports[0]!;
    const centerline = planViewport.layers
      .flatMap((layer) => layer.primitives)
      .find((primitive) => primitive.kind === "polyline" && primitive.id === "plan-centerline");
    expect(centerline?.kind).toBe("polyline");
    if (centerline?.kind !== "polyline") {
      return;
    }

    const transformed = centerline.points.map((point) => transformPoint2(planViewport.transform, point));
    const xs = transformed.map((point) => point.x);
    const ys = transformed.map((point) => point.y);
    const paperWidth = planViewport.paperBounds.maxX - planViewport.paperBounds.minX;
    const paperHeight = planViewport.paperBounds.maxY - planViewport.paperBounds.minY;
    const xSpan = Math.max(...xs) - Math.min(...xs);
    const yCenter = (Math.min(...ys) + Math.max(...ys)) / 2;

    expect(xSpan).toBeGreaterThan(paperWidth * 0.72);
    expect(yCenter).toBeGreaterThan(planViewport.paperBounds.minY);
    expect(yCenter).toBeLessThan(planViewport.paperBounds.maxY);
  });

  it("includes plan centerline, station labels, and north/scale annotations", () => {
    const output = createPlanDrawingBuilder().build({ result: intermediate, settings });
    const primitives = collectPrimitives(output.sheet.viewports[0]!);
    expect(primitives.some((primitive) => primitive.kind === "polyline" && primitive.id === "plan-centerline")).toBe(
      true,
    );
    expect(
      primitives.some(
        (primitive) => primitive.kind === "text" && primitive.id.startsWith("plan-station-text-"),
      ),
    ).toBe(true);
    expect(primitives.some((primitive) => primitive.kind === "text" && primitive.id === "plan-north")).toBe(true);
    expect(primitives.some((primitive) => primitive.kind === "text" && primitive.id === "plan-scale")).toBe(true);
  });

  it("builds profile sheet with profile and band viewports sharing station axis", () => {
    const output = createProfileDrawingBuilder().build({ result: intermediate, settings });
    expect(output.sheet.viewports).toHaveLength(2);
    expect(output.sheet.viewports[0]?.kind).toBe("profile");
    expect(output.sheet.viewports[1]?.kind).toBe("band");
    expect(output.sheet.viewports[0]?.stationAxisId).toBe(settings.stationAxes[0]?.id);
    expect(output.sheet.viewports[1]?.stationAxisId).toBe(settings.stationAxes[0]?.id);
  });

  it("fits profile geometry with readable viewport scale and paper band text", () => {
    const output = createProfileDrawingBuilder().build({ result: intermediate, settings });
    const profileViewport = output.sheet.viewports[0]!;
    const bandViewport = output.sheet.viewports[1]!;

    expect(viewportScale(profileViewport)).toBeGreaterThan(3);
    expect(bandViewport.transform.a).toBe(1);
    expect(
      profileViewport.layers
        .flatMap((layer) => layer.primitives)
        .some((primitive) => primitive.kind === "polyline" && primitive.id === "profile-line"),
    ).toBe(true);
    expect(
      collectPaperText(bandViewport).every(
        (text) => text.heightMm >= FORMAL_DRAWING_LAYOUT.minReadableTextHeightMm,
      ),
    ).toBe(true);
  });

  it("aligns profile and band station columns with shared horizontal scale", () => {
    const output = createProfileDrawingBuilder().build({ result: intermediate, settings });
    const profileViewport = output.sheet.viewports[0]!;
    const bandViewport = output.sheet.viewports[1]!;
    const firstStation = intermediate.stations.entries[0]!;
    const lastStation = intermediate.stations.entries.at(-1)!;

    const profileStationLine = profileViewport.layers
      .flatMap((layer) => layer.primitives)
      .find(
        (primitive) =>
          primitive.kind === "polyline" && primitive.id === `profile-grid-v-${firstStation.entryId}`,
      );
    const bandStationLine = bandViewport.layers
      .flatMap((layer) => layer.primitives)
      .find(
        (primitive) =>
          primitive.kind === "polyline" && primitive.id === `band-station-line-${firstStation.entryId}`,
      );
    expect(profileStationLine?.kind).toBe("polyline");
    expect(bandStationLine?.kind).toBe("polyline");
    if (profileStationLine?.kind !== "polyline" || bandStationLine?.kind !== "polyline") {
      return;
    }

    const profileX = transformPoint2(profileViewport.transform, profileStationLine.points[0]!).x;
    const bandX = bandStationLine.points[0]!.x;
    expect(profileX).toBeCloseTo(bandX, 1);

    const profileLastX = transformPoint2(
      profileViewport.transform,
      createPoint2(lastStation.physicalDistance, 0),
    ).x;
    const bandLastX = bandViewport.layers
      .flatMap((layer) => layer.primitives)
      .find(
        (primitive) =>
          primitive.kind === "polyline" && primitive.id === `band-station-line-${lastStation.entryId}`,
      );
    expect(bandLastX?.kind).toBe("polyline");
    if (bandLastX?.kind !== "polyline") {
      return;
    }
    expect(profileLastX).toBeCloseTo(bandLastX.points[0]!.x, 1);
  });

  it("marks missing ground data explicitly in profile diagram and band primitives", () => {
    const output = createProfileDrawingBuilder().build({ result: intermediate, settings });
    const profilePrimitives = collectPrimitives(output.sheet.viewports[0]!);
    const bandLayer = output.sheet.viewports[1]?.layers[0];
    const profileGroundText =
      profilePrimitives.find(
        (primitive) => primitive.kind === "text" && primitive.id === "profile-ground-unavailable",
      ) ?? null;
    const bandGroundTexts =
      bandLayer?.primitives.filter(
        (primitive) =>
          primitive.kind === "text" && primitive.value.includes(ja.liner.formalDrawing.groundLineUnavailable),
      ) ?? [];

    expect(profileGroundText?.kind).toBe("text");
    if (profileGroundText?.kind === "text") {
      expect(profileGroundText.value).toBe(ja.liner.formalDrawing.groundLineUnavailable);
      expect(profileGroundText.heightMm).toBeGreaterThanOrEqual(FORMAL_DRAWING_LAYOUT.minReadableTextHeightMm);
    }
    expect(bandGroundTexts.length).toBeGreaterThan(0);
  });

  it("keeps arc and clothoid centerline samples inside plan geometry paper bounds", () => {
    for (const kind of ["arc", "clothoid"] as const) {
      const result = buildCurveIntermediate(kind);
      const curveSettings = createDrawingSettingsFromDraft(result, undefined);
      const output = createPlanDrawingBuilder().build({ result, settings: curveSettings });
      const planViewport = output.sheet.viewports[0]!;
      expect(clipRatioForCenterline(planViewport)).toBe(1);
      expect(planViewport.modelBounds.minX).toBeGreaterThan(1000);
      expect(planViewport.modelBounds.maxY).toBeGreaterThan(planViewport.modelBounds.minY);
    }
  });

  it("renders BC/EC or KA/KE markers for curved alignments", () => {
    const arcOutput = createPlanDrawingBuilder().build({
      result: buildCurveIntermediate("arc"),
      settings: createDrawingSettingsFromDraft(buildCurveIntermediate("arc"), undefined),
    });
    const arcTexts = collectAllText(arcOutput.sheet.viewports[0]!);
    expect(arcTexts.some((text) => text.value === ja.liner.formalDrawing.planCurvePoints.bc)).toBe(true);
    expect(arcTexts.some((text) => text.value === ja.liner.formalDrawing.planCurvePoints.ec)).toBe(true);

    const clothoidOutput = createPlanDrawingBuilder().build({
      result: buildCurveIntermediate("clothoid"),
      settings: createDrawingSettingsFromDraft(buildCurveIntermediate("clothoid"), undefined),
    });
    const clothoidTexts = collectAllText(clothoidOutput.sheet.viewports[0]!);
    expect(clothoidTexts.some((text) => text.value === ja.liner.formalDrawing.planCurvePoints.ka)).toBe(true);
    expect(clothoidTexts.some((text) => text.value === ja.liner.formalDrawing.planCurvePoints.ke)).toBe(true);
  });

  it("uses readable text heights and staggered plan station labels without horizontal overlap", () => {
    const output = createPlanDrawingBuilder().build({ result: intermediate, settings });
    const planViewport = output.sheet.viewports[0]!;
    const stationTexts = collectAllText(planViewport).filter((text) =>
      text.id.startsWith("plan-station-text-"),
    );
    expect(stationTexts.every((text) => text.heightMm >= FORMAL_DRAWING_LAYOUT.minReadableTextHeightMm)).toBe(
      true,
    );
    const paperPositions = stationTexts.map((text) => text.position);
    for (let leftIndex = 0; leftIndex < paperPositions.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < paperPositions.length; rightIndex += 1) {
        const left = paperPositions[leftIndex]!;
        const right = paperPositions[rightIndex]!;
        const sameBand = Math.abs(left.y - right.y) < FORMAL_DRAWING_LAYOUT.planAnnotationTextHeightMm * 0.2;
        const overlapsX =
          Math.abs(left.x - right.x) < FORMAL_DRAWING_LAYOUT.planAnnotationTextHeightMm * 3.5;
        expect(sameBand && overlapsX).toBe(false);
      }
    }
  });

  it("keeps band row height above value text height plus margin", () => {
    expect(FORMAL_DRAWING_LAYOUT.planRowHeightMm).toBeGreaterThanOrEqual(
      FORMAL_DRAWING_LAYOUT.bandValueTextHeightMm + 2,
    );
    expect(FORMAL_DRAWING_LAYOUT.profileRowHeightMm).toBeGreaterThanOrEqual(
      FORMAL_DRAWING_LAYOUT.bandValueTextHeightMm + 2,
    );
  });

  it("adds cross-section auxiliary centerline at offset zero with label", () => {
    const output = createCrossSectionDrawingBuilder(0).build({ result: intermediate, settings });
    const viewport = output.sheet.viewports[0]!;
    const centerlineLayer = viewport.layers.find((layer) => layer.id === "cross-section-centerline-layer");
    expect(centerlineLayer).toBeDefined();
    const centerline = centerlineLayer?.primitives.find(
      (primitive) => primitive.kind === "line" && primitive.id === "cross-section-centerline",
    );
    expect(centerline?.kind).toBe("line");
    if (centerline?.kind === "line") {
      expect(centerline.start.x).toBe(0);
      expect(centerline.end.x).toBe(0);
      expect(centerlineLayer?.style?.lineType).toBe("dashed");
    }
    const label = centerlineLayer?.primitives.find(
      (primitive) => primitive.kind === "text" && primitive.id === "cross-section-centerline-label",
    );
    expect(label?.kind).toBe("text");
    if (label?.kind === "text") {
      expect(label.value).toBe(ja.liner.formalDrawing.centerlineLabel);
      expect(label.heightMm).toBeGreaterThanOrEqual(FORMAL_DRAWING_LAYOUT.minReadableTextHeightMm);
    }
  });

  it("keeps cross-section centerline at offset zero across crossfall modes", () => {
    const alignment: LinearAlignment = {
      id: "alignment-cross-section",
      linerModelId: "liner-model-1",
      coordinatePolicyId: "global",
      elements: [
        {
          id: "S1",
          type: "straight",
          start: { x: 0, y: 0 },
          azimuth: 0,
          length: 100,
        },
      ],
    };
    const baseInput = {
      alignment,
      stationDefinition: { originDisplayedStation: 0, explicitStations: [0] as number[] },
      crossSections: [
        {
          id: "CS-cross",
          name: "Cross",
          offsetLines: [
            { id: "OL-c", offset: 0, elevation: 0, role: "lane" as const },
            { id: "OL-l", offset: -4, elevation: 0.25, role: "edge" as const },
            { id: "OL-r", offset: 4, elevation: 0.25, role: "edge" as const },
          ],
        },
      ],
      offsets: [-4, 0, 4],
      verticalAlignment: {
        id: "VA-1",
        elements: [
          {
            type: "grade" as const,
            id: "VG-1",
            startStation: 0,
            endStation: 100,
            startElevation: 10,
            grade: 0,
            length: 100,
          },
        ],
      },
      z: 10,
    };

    const flatResult = buildIntermediateResult({
      ...baseInput,
      crossSlopeIntervals: [
        {
          id: "CF-flat",
          startPhysicalDistance: 0,
          endPhysicalDistance: 100,
          mode: "flat",
          leftSlopePercent: 0,
          rightSlopePercent: 0,
        },
      ],
    });
    const crownResult = buildIntermediateResult({
      ...baseInput,
      crossSlopeIntervals: [
        {
          id: "CF-crown",
          startPhysicalDistance: 0,
          endPhysicalDistance: 100,
          mode: "crown",
          leftSlopePercent: 2,
          rightSlopePercent: 2,
          pivotDistance: 0,
        },
      ],
    });

    const flatSettings = createDrawingSettingsFromDraft(flatResult, undefined);
    const crownSettings = createDrawingSettingsFromDraft(crownResult, undefined);
    const flatViewport = createCrossSectionDrawingBuilder(0).build({
      result: flatResult,
      settings: flatSettings,
    }).sheet.viewports[0]!;
    const crownViewport = createCrossSectionDrawingBuilder(0).build({
      result: crownResult,
      settings: crownSettings,
    }).sheet.viewports[0]!;

    const flatCenterline = flatViewport.layers
      .flatMap((layer) => layer.primitives)
      .find((primitive) => primitive.kind === "line" && primitive.id === "cross-section-centerline");
    const crownCenterline = crownViewport.layers
      .flatMap((layer) => layer.primitives)
      .find((primitive) => primitive.kind === "line" && primitive.id === "cross-section-centerline");
    expect(flatCenterline?.kind).toBe("line");
    expect(crownCenterline?.kind).toBe("line");
    if (flatCenterline?.kind === "line" && crownCenterline?.kind === "line") {
      expect(flatCenterline.start.x).toBe(0);
      expect(crownCenterline.start.x).toBe(0);
    }

    const flatPolyline = crossSectionPolylinePoints(flatViewport);
    const crownPolyline = crossSectionPolylinePoints(crownViewport);
    expect(flatPolyline).not.toBeNull();
    expect(crownPolyline).not.toBeNull();
    expect(flatPolyline).not.toBe(crownPolyline);
  });
});
