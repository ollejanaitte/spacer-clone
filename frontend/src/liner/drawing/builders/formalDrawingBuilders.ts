import { formatStationDisplay } from "../../core/station/stationFormat";
import type { CanonicalLinerIntermediateResult, GridLineResult, GridPointResult, ProfileSamplePoint, SectionSliceResult } from "../../core/types";
import { boundsFromPoints2, createPoint2, type Bounds2, type Point2 } from "../model/geometry";
import { createDrawingDiagnostic, type DrawingDiagnostic } from "../model/diagnostics";
import {
  createEmptyDrawingLayer,
  type DrawingDocument,
  type DrawingLayer,
  type DrawingSheet,
  type DrawingViewport,
} from "../model/document";
import { createPaperDefinition, paperContentBoundsMm, type PaperDefinition } from "../model/paper";
import type { DrawingPrimitive } from "../model/primitives";
import type { StationAxis } from "../model/stationAxis";
import { composeAffineTransform2, identityAffineTransform2 } from "../transforms/affineTransform2";
import { fitViewportTransform2 } from "../transforms/viewportTransform";
import type { BuildDrawingContext, DrawingBuilder, DrawingBuilderOutput, DrawingSettings } from "./types";

type DrawablePoint = Point2 & { label?: string };

const SHEET_VERSION = "0.1.0";
const DEFAULT_STATION_AXIS_ID = "station-axis-main";

function makeStationAxis(result: CanonicalLinerIntermediateResult): StationAxis {
  const labels = result.stations.entries.map((entry) => ({
    id: entry.entryId,
    physicalDistance: entry.physicalDistance,
    displayedStation: entry.displayedStation,
    label: formatStationDisplay(entry.displayedStation),
    kind:
      entry.physicalDistance === 0
        ? "start"
        : entry.physicalDistance === result.horizontal.totalLength
          ? "end"
          : entry.equationId
            ? "equation"
            : "interval",
  })) satisfies StationAxis["stationLabels"];

  return {
    id: DEFAULT_STATION_AXIS_ID,
    startPhysicalDistance: 0,
    endPhysicalDistance: result.horizontal.totalLength,
    startModelX: 0,
    endModelX: result.horizontal.totalLength,
    stationLabels: labels,
  };
}

function createSettingsWithAxis(
  result: CanonicalLinerIntermediateResult,
  settings: DrawingSettings,
): DrawingSettings {
  if (settings.stationAxes.length > 0) {
    return settings;
  }
  return {
    ...settings,
    stationAxes: [makeStationAxis(result)],
  };
}

function pointBounds(points: readonly DrawablePoint[]): Bounds2 {
  return boundsFromPoints2(points);
}

function primitivePoints(primitive: DrawingPrimitive): Point2[] {
  if (primitive.kind === "line") {
    return [primitive.start, primitive.end];
  }
  if (primitive.kind === "polyline") {
    return primitive.points;
  }
  if (primitive.kind === "arc") {
    return [
      createPoint2(primitive.center.x - primitive.radius, primitive.center.y - primitive.radius),
      createPoint2(primitive.center.x + primitive.radius, primitive.center.y + primitive.radius),
    ];
  }
  if (primitive.kind === "circle") {
    return [
      createPoint2(primitive.center.x - primitive.radius, primitive.center.y - primitive.radius),
      createPoint2(primitive.center.x + primitive.radius, primitive.center.y + primitive.radius),
    ];
  }
  if (primitive.kind === "text") {
    return [primitive.position];
  }
  return [primitive.start, primitive.end, primitive.textPosition ?? primitive.start];
}

function boundsFromPrimitives(primitives: readonly DrawingPrimitive[]): Bounds2 {
  const points = primitives.flatMap((primitive) => primitivePoints(primitive));
  return boundsFromPoints2(points);
}

function primitiveLayer(id: string, name: string, primitives: DrawingPrimitive[]): DrawingLayer {
  return {
    id,
    name,
    visible: true,
    primitives,
  };
}

function buildSheetViewport(
  kind: DrawingViewport["kind"],
  paper: PaperDefinition,
  modelBounds: Bounds2,
  primitives: DrawingPrimitive[],
  stationAxisId?: string,
): DrawingViewport {
  const paperBounds = paperContentBoundsMm(paper);
  return {
    id: `${kind}-viewport`,
    kind,
    modelBounds,
    paperBounds,
    transform: fitViewportTransform2(modelBounds, paperBounds, { marginMm: paper.marginMm, invertY: true }),
    layers: [primitiveLayer(`${kind}-layer`, kind, primitives)],
    stationAxisId,
  };
}

function buildPolyline(points: readonly Point2[], id: string, layerId?: string): DrawingPrimitive {
  return {
    kind: "polyline",
    id,
    points: points.map((point) => ({ ...point })),
    layerId,
  };
}

function buildText(id: string, position: Point2, value: string, heightMm = 3, layerId?: string): DrawingPrimitive {
  return {
    kind: "text",
    id,
    position: { ...position },
    value,
    heightMm,
    layerId,
  };
}

function buildLine(id: string, start: Point2, end: Point2, layerId?: string): DrawingPrimitive {
  return {
    kind: "line",
    id,
    start: { ...start },
    end: { ...end },
    layerId,
  };
}

function gridLinesByDirection(result: CanonicalLinerIntermediateResult): GridLineResult[] {
  return result.grid.lines;
}

function planPrimitives(result: CanonicalLinerIntermediateResult): DrawingPrimitive[] {
  const primitives: DrawingPrimitive[] = [];
  const axisPoints = result.horizontal.sampledPoints.map((point) => createPoint2(point.x, point.y));
  primitives.push(buildPolyline(axisPoints, "plan-centerline", "plan-centerline"));

  const gridPointById = new Map(result.grid.points.map((point) => [point.id, point]));
  for (const line of gridLinesByDirection(result).filter((entry) => entry.direction === "longitudinal")) {
    const points = line.pointIds
      .map((pointId) => gridPointById.get(pointId))
      .filter((point): point is GridPointResult => Boolean(point))
      .sort((left, right) => left.physicalDistance - right.physicalDistance)
      .map((point) => createPoint2(point.x, point.y));
    if (points.length >= 2) {
      primitives.push(buildPolyline(points, `plan-grid-${line.id}`, "plan-grid"));
    }
  }

  for (const station of result.stations.entries) {
    const sample = result.horizontal.sampledPoints.find(
      (entry) => Math.abs(entry.physicalDistance - station.physicalDistance) <= 1e-6,
    );
    if (!sample) {
      continue;
    }
    primitives.push(buildLine(`plan-station-line-${station.entryId}`, createPoint2(sample.x, sample.y - 3), createPoint2(sample.x, sample.y + 3), "plan-station"));
    primitives.push(buildText(`plan-station-label-${station.entryId}`, createPoint2(sample.x + 0.5, sample.y + 4), formatStationDisplay(station.displayedStation), 2.5, "plan-station"));
  }

  const firstPoint = result.horizontal.sampledPoints[0];
  if (firstPoint) {
    primitives.push(buildText("plan-north", createPoint2(firstPoint.x, firstPoint.y + 10), "N", 4, "plan-annotation"));
  }

  for (const segment of result.horizontal.segments) {
    const middle = result.horizontal.sampledPoints.find(
      (entry) => entry.physicalDistance >= segment.startPhysicalDistance && entry.physicalDistance <= segment.endPhysicalDistance,
    );
    if (middle) {
      primitives.push(
        buildText(
          `plan-segment-${segment.id}`,
          createPoint2(middle.x, middle.y - 6),
          segment.type === "arc" ? `R=${segment.startCurvature === 0 ? "∞" : (1 / Math.abs(segment.startCurvature)).toFixed(0)}` : segment.type,
          2.2,
          "plan-annotation",
        ),
      );
    }
  }

  return primitives;
}

function profilePrimitives(result: CanonicalLinerIntermediateResult): DrawingPrimitive[] {
  const primitives: DrawingPrimitive[] = [];
  const profilePoints = result.vertical.sampledPoints.map((point) =>
    createPoint2(point.physicalDistance, point.profileElevation),
  );
  primitives.push(buildPolyline(profilePoints, "profile-line", "profile-line"));

  const groundPoints = result.vertical.sampledPoints.length > 0
    ? result.vertical.sampledPoints.map((point) => createPoint2(point.physicalDistance, point.profileElevation - 0.5))
    : [];
  if (groundPoints.length >= 2) {
    primitives.push(buildPolyline(groundPoints, "ground-line", "profile-ground"));
  }

  for (const station of result.stations.entries) {
    primitives.push(buildLine(`profile-station-line-${station.entryId}`, createPoint2(station.physicalDistance, result.vertical.profileElevation - 5), createPoint2(station.physicalDistance, result.vertical.profileElevation + 5), "profile-station"));
    primitives.push(buildText(`profile-station-label-${station.entryId}`, createPoint2(station.physicalDistance + 0.25, result.vertical.profileElevation + 6), formatStationDisplay(station.displayedStation), 2.5, "profile-station"));
  }

  for (const breakPoint of result.vertical.gradeBreaks) {
    primitives.push(buildText(`profile-grade-break-${breakPoint.id}`, createPoint2(breakPoint.physicalDistance, result.vertical.profileElevation + 8), `i=${breakPoint.incomingGrade ?? 0}`, 2.2, "profile-annotation"));
  }

  return primitives;
}

function bandPrimitives(result: CanonicalLinerIntermediateResult): DrawingPrimitive[] {
  const primitives: DrawingPrimitive[] = [];
  const rowHeight = 8;
  const left = 0;
  const right = Math.max(result.horizontal.totalLength, 1);
  const rows = [
    { key: "station", label: "測点", values: result.stations.entries.map((entry) => formatStationDisplay(entry.displayedStation)) },
    { key: "distance", label: "累加距離", values: result.stations.entries.map((entry) => entry.physicalDistance.toFixed(2)) },
    { key: "plan", label: "平面", values: result.stations.entries.map((entry) => `${entry.entryId}`) },
    { key: "grade", label: "勾配", values: result.vertical.sampledPoints.map((point) => point.grade.toFixed(3)) },
  ];

  rows.forEach((row, rowIndex) => {
    const y = rowIndex * rowHeight;
    primitives.push(buildLine(`band-row-${row.key}`, createPoint2(left, y), createPoint2(right, y), "band-grid"));
    primitives.push(buildText(`band-label-${row.key}`, createPoint2(left + 0.5, y + 4.5), row.label, 2.2, "band-label"));
    row.values.slice(0, 12).forEach((value, valueIndex) => {
      const station = result.stations.entries[valueIndex];
      const x = station?.physicalDistance ?? valueIndex * 10;
      primitives.push(buildText(`band-value-${row.key}-${valueIndex}`, createPoint2(x, y + 4.5), value, 2, "band-text"));
    });
  });

  return primitives;
}

function crossSectionPrimitives(
  result: CanonicalLinerIntermediateResult,
  settings: DrawingSettings,
): DrawingPrimitive[] {
  const primitives: DrawingPrimitive[] = [];
  const selectedStation = settings.selectedCrossSectionStation ?? result.sections[0]?.physicalDistance ?? 0;
  const section = result.sections.find(
    (candidate) => Math.abs(candidate.physicalDistance - selectedStation) <= 1e-6,
  )
    ?? result.sections.reduce<SectionSliceResult | undefined>((nearest, candidate) => {
      if (!nearest) return candidate;
      const nearestDistance = Math.abs(nearest.physicalDistance - selectedStation);
      const candidateDistance = Math.abs(candidate.physicalDistance - selectedStation);
      return candidateDistance < nearestDistance ? candidate : nearest;
    }, undefined);

  if (!section) {
    return [buildText("cross-section-empty", createPoint2(0, 0), "横断データなし", 4, "cross-section-annotation")];
  }

  const crossPoints = section.points.map((point) => createPoint2(point.offset, point.z));
  primitives.push(buildPolyline(crossPoints, "cross-section-line", "cross-section-line"));
  primitives.push(buildLine("cross-section-zero", createPoint2(0, section.leftEdge.z), createPoint2(0, section.rightEdge.z), "cross-section-axis"));
  primitives.push(buildText("cross-section-title", createPoint2(section.width / 2, Math.max(section.leftEdge.z, section.rightEdge.z) + 2), `No.${formatStationDisplay(section.displayedStation)}`, 3, "cross-section-annotation"));
  primitives.push(buildText("cross-section-mode", createPoint2(section.width / 2, Math.max(section.leftEdge.z, section.rightEdge.z) + 6), `mode=${section.crossfall.mode}`, 2.5, "cross-section-annotation"));

  for (const point of section.points) {
    primitives.push(buildLine(`cross-section-point-line-${point.id}`, createPoint2(point.offset, point.z - 0.25), createPoint2(point.offset, point.z + 0.25), "cross-section-point"));
    primitives.push(buildText(`cross-section-point-label-${point.id}`, createPoint2(point.offset, point.z + 0.6), point.label ?? point.id, 2.1, "cross-section-point"));
  }

  return primitives;
}

function buildDocument(
  result: CanonicalLinerIntermediateResult,
  settings: DrawingSettings,
): DrawingDocument {
  const normalizedSettings = createSettingsWithAxis(result, settings);
  const stationAxis = normalizedSettings.stationAxes[0]!;
  const planPaper = normalizedSettings.planPaper;
  const profilePaper = normalizedSettings.profilePaper;
  const crossSectionPaper = normalizedSettings.crossSectionPaper;
  const bandPaper = normalizedSettings.bandPaper;
  const planViewport = buildSheetViewport(
    "plan",
    planPaper,
    boundsFromPrimitives(planPrimitives(result)),
    planPrimitives(result),
    stationAxis.id,
  );
  const profileViewport = buildSheetViewport(
    "profile",
    profilePaper,
    boundsFromPrimitives(profilePrimitives(result)),
    profilePrimitives(result),
    stationAxis.id,
  );
  const bandViewport = buildSheetViewport(
    "band",
    bandPaper,
    boundsFromPrimitives(bandPrimitives(result)),
    bandPrimitives(result),
    stationAxis.id,
  );
  const crossViewport = buildSheetViewport(
    "cross_section",
    crossSectionPaper,
    boundsFromPrimitives(crossSectionPrimitives(result, normalizedSettings)),
    crossSectionPrimitives(result, normalizedSettings),
  );

  return {
    version: SHEET_VERSION,
    sheets: [
      {
        id: "plan-sheet",
        name: "平面線形図",
        paper: planPaper,
        viewports: [planViewport],
      },
      {
        id: "profile-sheet",
        name: "縦断線形図",
        paper: profilePaper,
        viewports: [profileViewport, bandViewport],
      },
      {
        id: "cross-section-sheet",
        name: "横断図",
        paper: crossSectionPaper,
        viewports: [crossViewport],
      },
    ],
    stationAxes: normalizedSettings.stationAxes,
    diagnostics: [],
  };
}

export function createFormalDrawingSettings(
  result: CanonicalLinerIntermediateResult,
  selectedCrossSectionStation?: number,
): DrawingSettings {
  return {
    version: "0.1.0",
    planPaper: createPaperDefinition("A1", "landscape", 10),
    profilePaper: createPaperDefinition("A1", "landscape", 10),
    crossSectionPaper: createPaperDefinition("A2", "landscape", 10),
    bandPaper: createPaperDefinition("A3", "landscape", 10),
    stationAxes: [makeStationAxis(result)],
    selectedCrossSectionStation,
  };
}

export function buildFormalDrawingDocument(
  result: CanonicalLinerIntermediateResult,
  settings: DrawingSettings,
): DrawingDocument {
  return buildDocument(result, settings);
}

export function createPlanDrawingBuilder(): DrawingBuilder {
  return {
    kind: "plan",
    build(context: BuildDrawingContext): DrawingBuilderOutput {
      const sheet = buildDocument(context.result, context.settings).sheets[0]!;
      return { sheet, diagnostics: [] };
    },
  };
}

export function createProfileDrawingBuilder(): DrawingBuilder {
  return {
    kind: "profile",
    build(context: BuildDrawingContext): DrawingBuilderOutput {
      const sheet = buildDocument(context.result, context.settings).sheets[1]!;
      return { sheet, diagnostics: [] };
    },
  };
}

export function createBandDrawingBuilder(): DrawingBuilder {
  return {
    kind: "band",
    build(context: BuildDrawingContext): DrawingBuilderOutput {
      const sheet = buildDocument(context.result, context.settings).sheets[1]!;
      return { sheet, diagnostics: [] };
    },
  };
}

export function createCrossSectionDrawingBuilder(): DrawingBuilder {
  return {
    kind: "cross_section",
    build(context: BuildDrawingContext): DrawingBuilderOutput {
      const sheet = buildDocument(context.result, context.settings).sheets[2]!;
      return { sheet, diagnostics: [] };
    },
  };
}

export function buildFormalDrawingDiagnostics(result: CanonicalLinerIntermediateResult): DrawingDiagnostic[] {
  return result.diagnostics.length > 0
    ? result.diagnostics.map((diagnostic) =>
        createDrawingDiagnostic(
          diagnostic.level,
          String(diagnostic.code),
          diagnostic.messageKey ?? diagnostic.detail ?? String(diagnostic.code),
          { source: diagnostic.entityId ?? diagnostic.entityType },
        ),
      )
    : [];
}
