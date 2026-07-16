import { hasFatalIssues } from "../diagnostics";
import {
  resolveCrossSectionTemplateById,
  resolveCrossSectionTemplateForPhysicalDistance,
} from "../crossSectionTemplateResolution";
import { generateGridPoints } from "../grid/gridGeneration";
import { resolveCrossfallState } from "../grid/crossfallResolution";
import { generateMeasuredGridPoints } from "../grid/measuredGridGeneration";
import {
  evaluateAlignmentAtDistance,
  totalAlignmentLength,
  validateAlignment,
} from "../geometry/horizontal";
import { elevationAt } from "../elevationAt";
import { SAMPLING_INTERVAL_DISPLAY, sampleDisplay } from "../sampling";
import { displayedStationAtPhysicalDistance, generateStations } from "../station/stationRules";
import { validateVerticalAlignment } from "../validateVerticalAlignment";
import {
  sampleVerticalDisplay,
  type VerticalSamplePoint,
} from "../verticalSampling";
import type {
  AlignmentElement,
  AlignmentEvaluation,
  AlignmentSamplePoint,
  CanonicalLinerIntermediateResult,
  ComputationDiagnostic,
  DependencyNodeKind,
  DependencySnapshot,
  FrameGenerationHintResult,
  GeneratedStation,
  GridPointPreparation,
  GridCellResult,
  GridLineResult,
  GridPointResult,
  GridPreparationInput,
  GridResult,
  HorizontalGeometryResult,
  HorizontalPiPointResult,
  HorizontalSegmentResult,
  LinearAlignment,
  PierResult,
  ProfileSamplePoint,
  ProfileSegmentResult,
  GradeBreakResult,
  SectionSliceResult,
  SpanResult,
  StationDefinition,
  StationTableEntry,
  StationTableResult,
  VerticalGeometryResult,
} from "../types";
import { sourceRevisionFor } from "./sourceRevision";
import type {
  CrossSlopeIntervalDraft,
  CrossSectionTemplateDraft,
  GridDefinitionDraft,
  LinerDrawingSettingsDraft,
  MeasuredGridDraft,
  VerticalAlignmentDraft,
} from "../../schema/types";

export type BuildIntermediateInput = {
  alignment: LinearAlignment;
  stationDefinition: StationDefinition;
  verticalAlignment?: VerticalAlignmentDraft;
  crossSections?: CrossSectionTemplateDraft[];
  gridDefinitions?: GridDefinitionDraft[];
  crossSlopeIntervals?: CrossSlopeIntervalDraft[];
  measuredGrid?: MeasuredGridDraft;
  offsets?: number[];
  sampleInterval?: number;
  z?: number;
  selectedCrossSectionStation?: number;
  drawingSettings?: LinerDrawingSettingsDraft;
  computedAt?: string;
};

function toSamplePoint(evaluation: AlignmentEvaluation): AlignmentSamplePoint {
  return {
    physicalDistance: evaluation.physicalDistance,
    displayedStation: evaluation.displayedStation,
    x: evaluation.point.x,
    y: evaluation.point.y,
    azimuth: evaluation.azimuth,
    curvature: evaluation.curvature,
    segmentId: evaluation.elementId,
    localFrame: evaluation.localFrame,
  };
}

function buildHorizontalSegments(
  alignment: LinearAlignment,
  stationDefinition: StationDefinition,
): HorizontalSegmentResult[] {
  const segments: HorizontalSegmentResult[] = [];
  let startPhysicalDistance = 0;

  for (const element of alignment.elements) {
    const endPhysicalDistance = startPhysicalDistance + element.length;
    const startDisplayedStation = displayedStationAtPhysicalDistance(
      startPhysicalDistance,
      stationDefinition,
      startPhysicalDistance > 0,
    );
    const endDisplayedStation = displayedStationAtPhysicalDistance(
      endPhysicalDistance,
      stationDefinition,
    );
    const startEvaluation = evaluateAlignmentAtDistance(
      alignment,
      startPhysicalDistance,
      startDisplayedStation,
    );
    const endEvaluation = evaluateAlignmentAtDistance(
      alignment,
      endPhysicalDistance,
      endDisplayedStation,
    );

    segments.push({
      id: `HSEG-${element.id}`,
      sourceElementId: element.id,
      type: element.type as AlignmentElement["type"],
      startPhysicalDistance,
      endPhysicalDistance,
      startDisplayedStation,
      endDisplayedStation,
      startAzimuth: startEvaluation.azimuth,
      endAzimuth: endEvaluation.azimuth,
      startCurvature: startEvaluation.curvature,
      endCurvature: endEvaluation.curvature,
    });

    startPhysicalDistance = endPhysicalDistance;
  }

  return segments;
}

function buildHorizontalResult(
  alignment: LinearAlignment,
  stationDefinition: StationDefinition,
  totalLength: number,
  sampleInterval: number,
  canEvaluate: boolean,
): HorizontalGeometryResult {
  const sampledPoints: AlignmentSamplePoint[] = [];
  const segments = canEvaluate ? buildHorizontalSegments(alignment, stationDefinition) : [];
  const piPoints: HorizontalPiPointResult[] = [];

  if (canEvaluate) {
    if (sampleInterval === SAMPLING_INTERVAL_DISPLAY) {
      sampledPoints.push(...sampleDisplay(alignment, stationDefinition));
    } else {
      for (let distance = 0; distance < totalLength; distance += sampleInterval) {
        sampledPoints.push(
          toSamplePoint(
            evaluateAlignmentAtDistance(
              alignment,
              distance,
              displayedStationAtPhysicalDistance(distance, stationDefinition, distance > 0),
            ),
          ),
        );
      }
      sampledPoints.push(
        toSamplePoint(
          evaluateAlignmentAtDistance(
            alignment,
            totalLength,
            displayedStationAtPhysicalDistance(totalLength, stationDefinition),
          ),
        ),
      );
    }
  }

  return {
    totalLength,
    segments,
    sampledPoints,
    piPoints,
  };
}

function buildStationTableResult(
  stations: GeneratedStation[],
  stationDefinition: StationDefinition,
): StationTableResult {
  const entries: StationTableEntry[] = stations.map((station) => ({
    entryId: station.id,
    displayedStation: station.displayedStation,
    physicalDistance: station.physicalDistance,
    equationId: station.source === "equation" ? station.sourceId : undefined,
    sortIndex: station.sortIndex,
    provenance: {
      source: station.source,
      sourceId: station.sourceId,
    },
  }));

  return {
    entries,
    originDisplayedStation: stationDefinition.originDisplayedStation,
    increasingDirection: "forward",
  };
}

function buildVerticalResult(
  verticalAlignment: VerticalAlignmentDraft | undefined,
  stations: GeneratedStation[],
  totalLength: number,
  fallbackZ: number,
): VerticalGeometryResult {
  if (verticalAlignment === undefined || verticalAlignment.elements.length === 0) {
    const segmentId = "VP-default";
    const sampledPoints: ProfileSamplePoint[] = stations.map((station) => ({
      physicalDistance: station.physicalDistance,
      displayedStation: station.displayedStation,
      profileElevation: fallbackZ,
      grade: 0,
      segmentId,
    }));
    const segments: ProfileSegmentResult[] = totalLength > 0
      ? [
          {
            id: segmentId,
            startPhysicalDistance: 0,
            endPhysicalDistance: totalLength,
            startDisplayedStation: stations[0]?.displayedStation ?? 0,
            endDisplayedStation: stations.at(-1)?.displayedStation ?? totalLength,
            startElevation: fallbackZ,
            endElevation: fallbackZ,
            startGrade: 0,
            endGrade: 0,
          },
        ]
      : [];
    return {
      profileElevation: fallbackZ,
      segments,
      sampledPoints,
      gradeBreaks: [],
    };
  }

  const verticalSamples: VerticalSamplePoint[] = sampleVerticalDisplay(verticalAlignment);
  const sampledPoints: ProfileSamplePoint[] = verticalSamples.map((sample) => ({
    physicalDistance: sample.station,
    displayedStation: sample.station,
    profileElevation: sample.elevation,
    grade: sample.grade,
    segmentId: sample.sourceElementId,
  }));

  const segments: ProfileSegmentResult[] = verticalAlignment.elements.map((element) => {
    const base: ProfileSegmentResult = {
      id: element.id,
      startPhysicalDistance: element.startStation,
      endPhysicalDistance: element.endStation,
      startDisplayedStation: element.startStation,
      endDisplayedStation: element.endStation,
      startElevation:
        element.type === "grade"
          ? element.startElevation
          : (element.startElevation ?? 0),
      endElevation: elevationAt(element.endStation, verticalAlignment) ?? fallbackZ,
      startGrade: element.type === "grade" ? element.grade : element.startGrade,
      endGrade: element.type === "grade" ? element.grade : element.endGrade,
    };
    if (element.type === "parabolic") {
      // Equal-tangent vertical curve: BVC/EVC at element ends; PVI at mid-station.
      base.pvcPhysicalDistance = element.startStation;
      base.pvtPhysicalDistance = element.endStation;
      base.pviPhysicalDistance = element.startStation + element.length / 2;
    }
    return base;
  });

  const gradeBreaks: GradeBreakResult[] = [];
  for (const segment of segments) {
    if (segment.pvcPhysicalDistance === undefined || segment.pvtPhysicalDistance === undefined) {
      continue;
    }
    gradeBreaks.push({
      id: `${segment.id}-bvc`,
      physicalDistance: segment.pvcPhysicalDistance,
      displayedStation: segment.pvcPhysicalDistance,
      outgoingGrade: segment.startGrade,
    });
    gradeBreaks.push({
      id: `${segment.id}-evc`,
      physicalDistance: segment.pvtPhysicalDistance,
      displayedStation: segment.pvtPhysicalDistance,
      incomingGrade: segment.endGrade,
    });
  }

  const startElevation = elevationAt(0, verticalAlignment) ?? fallbackZ;

  return {
    profileElevation: startElevation,
    segments,
    sampledPoints,
    gradeBreaks,
  };
}

function buildGridResult(
  gridPoints: Omit<GridPointResult, "gridDefinitionId" | "memberGroupKey">[],
  linerModelId: string,
): GridResult {
  const gridDefinitionId = `GRID-${linerModelId}-default`;
  const points: GridPointResult[] = gridPoints.map((point) => ({
    ...point,
    gridDefinitionId,
  }));
  const byLongitudinal = new Map<number, GridPointResult[]>();
  const byTransverse = new Map<number, GridPointResult[]>();

  for (const point of points) {
    const longitudinal = byLongitudinal.get(point.labels.longitudinalIndex) ?? [];
    longitudinal.push(point);
    byLongitudinal.set(point.labels.longitudinalIndex, longitudinal);

    const transverse = byTransverse.get(point.labels.transverseIndex) ?? [];
    transverse.push(point);
    byTransverse.set(point.labels.transverseIndex, transverse);
  }

  const lines: GridLineResult[] = [];
  for (const [transverseIndex, linePoints] of [...byTransverse.entries()].sort((a, b) => a[0] - b[0])) {
    const orderedPoints = [...linePoints].sort(
      (a, b) => a.labels.longitudinalIndex - b.labels.longitudinalIndex,
    );
    lines.push({
      id: `GL-${linerModelId}-L-${transverseIndex.toString().padStart(3, "0")}`,
      gridDefinitionId,
      direction: "longitudinal",
      index: transverseIndex,
      pointIds: orderedPoints.map((point) => point.id),
      role: orderedPoints[0]?.roles[0] ?? "main_girder",
    });
  }
  for (const [longitudinalIndex, linePoints] of [...byLongitudinal.entries()].sort((a, b) => a[0] - b[0])) {
    const orderedPoints = [...linePoints].sort(
      (a, b) => a.labels.transverseIndex - b.labels.transverseIndex,
    );
    lines.push({
      id: `GL-${linerModelId}-T-${longitudinalIndex.toString().padStart(3, "0")}`,
      gridDefinitionId,
      direction: "transverse",
      index: longitudinalIndex,
      pointIds: orderedPoints.map((point) => point.id),
      role: "cross_girder",
    });
  }

  const pointByIndex = new Map<string, GridPointResult>();
  for (const point of points) {
    pointByIndex.set(`${point.labels.longitudinalIndex}:${point.labels.transverseIndex}`, point);
  }
  const longitudinalIndices = [...byLongitudinal.keys()].sort((a, b) => a - b);
  const transverseIndices = [...byTransverse.keys()].sort((a, b) => a - b);
  const cells: GridCellResult[] = [];
  for (let li = 0; li < longitudinalIndices.length - 1; li += 1) {
    for (let ti = 0; ti < transverseIndices.length - 1; ti += 1) {
      const l0 = longitudinalIndices[li];
      const l1 = longitudinalIndices[li + 1];
      const t0 = transverseIndices[ti];
      const t1 = transverseIndices[ti + 1];
      const p00 = pointByIndex.get(`${l0}:${t0}`);
      const p10 = pointByIndex.get(`${l1}:${t0}`);
      const p11 = pointByIndex.get(`${l1}:${t1}`);
      const p01 = pointByIndex.get(`${l0}:${t1}`);
      if (p00 && p10 && p11 && p01) {
        cells.push({
          id: `GC-${linerModelId}-${l0.toString().padStart(3, "0")}-${t0.toString().padStart(3, "0")}`,
          cornerPointIds: [p00.id, p10.id, p11.id, p01.id],
        });
      }
    }
  }

  return { points, lines, cells };
}

function buildFrameHints(): FrameGenerationHintResult {
  return {
    defaultMemberGroupKey: "default",
    memberGroupRules: [],
    supportTemplates: [],
    connectivityMode: "grid_full",
  };
}

function buildSectionResult(
  gridPoints: readonly GridPointPreparation[],
  input: BuildIntermediateInput,
): SectionSliceResult[] {
  if (gridPoints.length === 0) {
    return [];
  }
  const byLongitudinal = new Map<number, GridPointPreparation[]>();
  for (const point of gridPoints) {
    const existing = byLongitudinal.get(point.labels.longitudinalIndex) ?? [];
    existing.push(point);
    byLongitudinal.set(point.labels.longitudinalIndex, existing);
  }
  return [...byLongitudinal.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([longitudinalIndex, sectionPoints]) => {
      const orderedPoints = [...sectionPoints].sort((left, right) => left.offset - right.offset);
      const firstPoint = orderedPoints[0]!;
      const lastPoint = orderedPoints[orderedPoints.length - 1]!;
      const template = resolveCrossSectionTemplateById(
        input.crossSections,
        firstPoint.source.crossSectionTemplateId,
      ) ?? resolveCrossSectionTemplateForPhysicalDistance(input, firstPoint.physicalDistance);
      const offsetLineByIndex = [...(template?.offsetLines ?? [])]
        .sort((left, right) => left.offset - right.offset)
        .map((line) => ({
          role: line.role,
          label: line.label ?? line.id,
        }));
      const crossfall = input.measuredGrid
        ? {
            physicalDistance: firstPoint.physicalDistance,
            displayedStation: firstPoint.displayedStation,
            mode: "independent" as const,
            leftSlopePercent: 0,
            rightSlopePercent: 0,
            pivotDistance: 0,
            source: "measured_grid" as const,
          }
        : resolveCrossfallState(
            {
              crossSectionTemplate: template,
              crossSlopeIntervals: input.crossSlopeIntervals,
            },
            firstPoint.physicalDistance,
            firstPoint.displayedStation,
          );
      return {
        id: `SEC-${input.alignment.linerModelId}-${longitudinalIndex.toString().padStart(3, "0")}`,
        physicalDistance: firstPoint.physicalDistance,
        displayedStation: firstPoint.displayedStation,
        width: lastPoint.offset - firstPoint.offset,
        leftEdge: { offset: firstPoint.offset, z: firstPoint.z },
        rightEdge: { offset: lastPoint.offset, z: lastPoint.z },
        templateId: template?.id ?? "CS-default",
        points: orderedPoints.map((point) => {
          const meta = offsetLineByIndex[point.labels.transverseIndex];
          return {
            id: point.id,
            offset: point.offset,
            z: point.z,
            x: point.x,
            y: point.y,
            label: meta?.label,
            role: meta?.role,
          };
        }),
        crossfall,
      };
    });
}

function buildDependencyGraph(sourceRevision: string): DependencySnapshot {
  const kinds: DependencyNodeKind[] = [
    "horizontal",
    "vertical",
    "stations",
    "grid",
    "spans",
    "piers",
    "frameHints",
    "sections",
    "diagnostics",
  ];
  const nodes = kinds.map((kind) => ({
    id: `liner.${kind}`,
    kind,
    sourceEntityIds: [],
    revision: sourceRevision,
  }));

  return {
    nodes,
    edges: [
      { fromNodeId: "liner.horizontal", toNodeId: "liner.stations", invalidates: true },
      { fromNodeId: "liner.horizontal", toNodeId: "liner.grid", invalidates: true },
      { fromNodeId: "liner.vertical", toNodeId: "liner.grid", invalidates: true },
      { fromNodeId: "liner.grid", toNodeId: "liner.frameHints", invalidates: true },
      { fromNodeId: "liner.grid", toNodeId: "liner.sections", invalidates: true },
    ],
    createdFromSourceRevision: sourceRevision,
  };
}

export function buildIntermediateResult(
  input: BuildIntermediateInput,
): CanonicalLinerIntermediateResult {
  const sourceRevision = sourceRevisionFor({
    alignment: input.alignment,
    stationDefinition: input.stationDefinition,
    verticalAlignment: input.verticalAlignment,
    crossSections: input.crossSections,
    gridDefinitions: input.gridDefinitions,
    crossSlopeIntervals: input.crossSlopeIntervals,
    offsets: input.offsets ?? [0],
    measuredGrid: input.measuredGrid,
    z: input.z ?? 0,
  });
  const diagnostics: ComputationDiagnostic[] = validateAlignment(input.alignment);
  const totalLength = totalAlignmentLength(input.alignment);
  diagnostics.push(...validateVerticalAlignment(input.verticalAlignment, totalLength));
  const stationGeneration = generateStations(input.stationDefinition, totalLength);
  diagnostics.push(...stationGeneration.issues);

  const sampleInterval = input.sampleInterval ?? SAMPLING_INTERVAL_DISPLAY;
  const canEvaluate = !hasFatalIssues(diagnostics);
  const horizontal = buildHorizontalResult(
    input.alignment,
    input.stationDefinition,
    totalLength,
    sampleInterval,
    canEvaluate,
  );
  const z = input.z ?? 0;
  const verticalAlignment = input.verticalAlignment;
  const vertical = buildVerticalResult(
    verticalAlignment,
    stationGeneration.stations,
    totalLength,
    z,
  );
  const stationTable = buildStationTableResult(stationGeneration.stations, input.stationDefinition);

  const gridInput: GridPreparationInput = {
    alignment: input.alignment,
    stations: stationGeneration.stations,
    offsets: input.offsets ?? [0],
    sourceRevision,
    z,
    verticalAlignment,
    crossSections: input.crossSections,
    gridDefinitions: input.gridDefinitions,
    crossSlopeIntervals: input.crossSlopeIntervals,
  };
  if (canEvaluate && input.measuredGrid && (input.crossSlopeIntervals?.length ?? 0) > 0) {
    diagnostics.push(
      {
        level: "warning",
        code: "LINER_CROSSFALL_MEASURED_GRID_PRECEDENCE",
        messageKey: "liner.errors.crossfall_measured_grid_precedence",
        detail:
          "測定格子が有効なため、横断勾配区間による標高補正は適用されません。格子標高が優先されます。",
        entityType: "measuredGrid",
      },
    );
  }
  const gridGeneration =
    canEvaluate && input.measuredGrid
      ? generateMeasuredGridPoints({
          measuredGrid: input.measuredGrid,
          alignment: input.alignment,
          sourceRevision,
        })
      : canEvaluate
        ? generateGridPoints(gridInput)
        : { gridPoints: [], issues: [] };
  diagnostics.push(...gridGeneration.issues);
  const grid = buildGridResult(gridGeneration.gridPoints, input.alignment.linerModelId);
  const spans: SpanResult[] = [];
  const piers: PierResult[] = [];
  const sections = buildSectionResult(gridGeneration.gridPoints, input);

  return {
    schemaVersion: "0.2.0",
    computedAt: input.computedAt ?? new Date().toISOString(),
    sourceRevision,
    linerModelId: input.alignment.linerModelId,
    coordinatePolicyId: input.alignment.coordinatePolicyId,
    horizontal,
    vertical,
    stations: stationTable,
    grid,
    spans,
    piers,
    frameHints: buildFrameHints(),
    sections,
    diagnostics,
    dependencyGraph: buildDependencyGraph(sourceRevision),
  };
}
