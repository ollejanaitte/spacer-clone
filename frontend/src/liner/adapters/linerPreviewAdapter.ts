import { buildIntermediateResult } from "../core/pipeline/pipeline";
import { createIssue, LINER_DIAGNOSTIC_CODES } from "../core/diagnostics";
import type {
  AlignmentSamplePoint,
  CanonicalLinerIntermediateResult,
  ComputationDiagnostic,
  GridPointResult,
  Vec2,
} from "../core/types";
import { toLinerUiDiagnosticDisplay, type LinerUiDiagnosticDisplay } from "../uiPreparation";
import type { LinerDraft } from "./linerUiAdapter";

const WIDTH = 1000;
const HEIGHT = 700;
const PAD = 70;

export type LinerGridPreviewScreenPoint = {
  sx: number;
  sy: number;
};

export type LinerGridPreviewAxisPoint = LinerGridPreviewScreenPoint & {
  id: string;
  physicalDistance: number;
  displayedStation: number;
  segmentId: string;
};

export type LinerGridPreviewPoint = LinerGridPreviewScreenPoint & {
  id: string;
  physicalDistance: number;
  displayedStation: number;
  offset: number;
  longitudinalIndex: number;
  transverseIndex: number;
};

export type LinerGridPreviewLine = {
  id: string;
  direction: "longitudinal" | "transverse";
  points: LinerGridPreviewScreenPoint[];
};

export type LinerGridPreviewBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  scale: number;
};

export type LinerGridPreviewSummary = {
  totalLength: number;
  axisPointCount: number;
  gridPointCount: number;
  gridLineCount: number;
  stationCount: number;
  diagnosticCount: number;
};

export type LinerGridPreviewViewModel = {
  width: number;
  height: number;
  padding: number;
  bounds: LinerGridPreviewBounds;
  axisPolyline: LinerGridPreviewAxisPoint[];
  gridPoints: LinerGridPreviewPoint[];
  gridLines: LinerGridPreviewLine[];
  summary: LinerGridPreviewSummary;
  diagnostics: LinerUiDiagnosticDisplay[];
};

export type LinerPreviewAdapterResult = {
  intermediate: CanonicalLinerIntermediateResult;
  viewModel: LinerGridPreviewViewModel;
};

type Projection = {
  bounds: LinerGridPreviewBounds;
  project(point: Vec2): LinerGridPreviewScreenPoint;
};

export function buildLinerPreviewFromDraft(draft: LinerDraft): LinerPreviewAdapterResult {
  const inputDiagnostics = collectPreviewInputDiagnostics(draft);
  const intermediate = buildIntermediateResult(toPreviewSafeDraft(draft));
  const diagnostics = [...inputDiagnostics, ...intermediate.diagnostics];
  const projection = createProjection(intermediate.horizontal.sampledPoints, intermediate.grid.points);
  const gridPointById = new Map<string, GridPointResult>();
  for (const point of intermediate.grid.points) {
    gridPointById.set(point.id, point);
  }

  const gridPoints = intermediate.grid.points.map((point): LinerGridPreviewPoint => ({
    id: point.id,
    physicalDistance: point.physicalDistance,
    displayedStation: point.displayedStation,
    offset: point.offset,
    longitudinalIndex: point.labels.longitudinalIndex,
    transverseIndex: point.labels.transverseIndex,
    ...projection.project(point),
  }));

  const gridLines = intermediate.grid.lines
    .map((line): LinerGridPreviewLine => ({
      id: line.id,
      direction: line.direction,
      points: line.pointIds
        .map((pointId) => gridPointById.get(pointId))
        .filter((point): point is GridPointResult => Boolean(point))
        .map((point) => projection.project(point)),
    }))
    .filter((line) => line.points.length >= 2);

  const viewModel: LinerGridPreviewViewModel = {
    width: WIDTH,
    height: HEIGHT,
    padding: PAD,
    bounds: projection.bounds,
    axisPolyline: intermediate.horizontal.sampledPoints.map((point): LinerGridPreviewAxisPoint => ({
      id: `${point.segmentId}-${point.physicalDistance}`,
      physicalDistance: point.physicalDistance,
      displayedStation: point.displayedStation,
      segmentId: point.segmentId,
      ...projection.project(point),
    })),
    gridPoints,
    gridLines,
    summary: {
      totalLength: intermediate.horizontal.totalLength,
      axisPointCount: intermediate.horizontal.sampledPoints.length,
      gridPointCount: intermediate.grid.points.length,
      gridLineCount: intermediate.grid.lines.length,
      stationCount: intermediate.stations.entries.length,
      diagnosticCount: diagnostics.length,
    },
    diagnostics: diagnostics.map(toLinerUiDiagnosticDisplay),
  };

  return {
    intermediate,
    viewModel,
  };
}

function toPreviewSafeDraft(draft: LinerDraft): LinerDraft {
  if (isPositiveFiniteNumber(draft.sampleInterval)) {
    return draft;
  }

  return {
    ...draft,
    sampleInterval: 1,
  };
}

function collectPreviewInputDiagnostics(draft: LinerDraft): ComputationDiagnostic[] {
  if (isPositiveFiniteNumber(draft.sampleInterval)) {
    return [];
  }

  return [
    createIssue("error", LINER_DIAGNOSTIC_CODES.gridSpacingInvalid, {
      messageKey: "liner.errors.grid_spacing",
      entityType: "linerDraft",
      field: "sampleInterval",
    }),
  ];
}

function createProjection(
  axisPoints: readonly AlignmentSamplePoint[],
  gridPoints: readonly GridPointResult[],
): Projection {
  const rawPoints = [
    ...axisPoints.map((point) => ({ x: point.x, y: point.y })),
    ...gridPoints.map((point) => ({ x: point.x, y: point.y })),
  ].filter(isFinitePoint);

  if (rawPoints.length === 0) {
    return {
      bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1, scale: 1 },
      project: () => ({ sx: WIDTH / 2, sy: HEIGHT / 2 }),
    };
  }

  const minX = Math.min(...rawPoints.map((point) => point.x));
  const maxX = Math.max(...rawPoints.map((point) => point.x));
  const minY = Math.min(...rawPoints.map((point) => point.y));
  const maxY = Math.max(...rawPoints.map((point) => point.y));
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const scale = Math.min((WIDTH - PAD * 2) / spanX, (HEIGHT - PAD * 2) / spanY);
  const contentWidth = spanX * scale;
  const contentHeight = spanY * scale;
  const offsetX = (WIDTH - contentWidth) / 2;
  const offsetY = (HEIGHT - contentHeight) / 2;

  return {
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      scale,
    },
    project(point: Vec2): LinerGridPreviewScreenPoint {
      if (!isFinitePoint(point)) {
        return { sx: WIDTH / 2, sy: HEIGHT / 2 };
      }
      return {
        sx: offsetX + (point.x - minX) * scale,
        sy: HEIGHT - (offsetY + (point.y - minY) * scale),
      };
    },
  };
}

function isFinitePoint(point: Vec2): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function isPositiveFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
