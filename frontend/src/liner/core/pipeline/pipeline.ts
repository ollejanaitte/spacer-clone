import { hasFatalIssues } from "../diagnostics";
import { generateGridPoints } from "../grid/gridGeneration";
import {
  evaluateAlignmentAtDistance,
  totalAlignmentLength,
  validateAlignment,
} from "../geometry/horizontal";
import { SAMPLING_INTERVAL_DISPLAY, sampleDisplay } from "../sampling";
import { displayedStationAtPhysicalDistance, generateStations } from "../station/stationRules";
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
  GradeBreakResult,
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
  SectionSliceResult,
  SpanResult,
  StationDefinition,
  StationTableEntry,
  StationTableResult,
  VerticalGeometryResult,
} from "../types";
import { sourceRevisionFor } from "./sourceRevision";
import type {
  CrossSectionTemplateDraft,
  VerticalAlignmentDraft,
} from "../../schema/types";

export type BuildIntermediateInput = {
  alignment: LinearAlignment;
  stationDefinition: StationDefinition;
  verticalAlignment?: VerticalAlignmentDraft;
  crossSections?: CrossSectionTemplateDraft[];
  offsets?: number[];
  sampleInterval?: number;
  z?: number;
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

function buildVerticalResult(stations: GeneratedStation[], totalLength: number, z: number): VerticalGeometryResult {
  const segmentId = "VP-default";
  const sampledPoints: ProfileSamplePoint[] = stations.map((station) => ({
    physicalDistance: station.physicalDistance,
    displayedStation: station.displayedStation,
    profileElevation: z,
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
          startElevation: z,
          endElevation: z,
          startGrade: 0,
          endGrade: 0,
        },
      ]
    : [];
  const gradeBreaks: GradeBreakResult[] = [];

  return {
    profileElevation: z,
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
    offsets: input.offsets ?? [0],
    z: input.z ?? 0,
  });
  const diagnostics: ComputationDiagnostic[] = validateAlignment(input.alignment);
  const totalLength = totalAlignmentLength(input.alignment);
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
  const vertical = buildVerticalResult(stationGeneration.stations, totalLength, z);
  const stationTable = buildStationTableResult(stationGeneration.stations, input.stationDefinition);

  const gridInput: GridPreparationInput = {
    alignment: input.alignment,
    stations: stationGeneration.stations,
    offsets: input.offsets ?? [0],
    sourceRevision,
    z,
  };
  const gridGeneration = canEvaluate
    ? generateGridPoints(gridInput)
    : { gridPoints: [], issues: [] };
  diagnostics.push(...gridGeneration.issues);
  const grid = buildGridResult(gridGeneration.gridPoints, input.alignment.linerModelId);
  const spans: SpanResult[] = [];
  const piers: PierResult[] = [];
  const sections: SectionSliceResult[] = [];

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
