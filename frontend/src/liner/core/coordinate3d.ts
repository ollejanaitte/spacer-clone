import { resolveCrossSectionTemplateForPhysicalDistance } from "./crossSectionTemplateResolution";
import { validateCrossSectionTemplates } from "./crossSectionTemplateValidation";
import { createIssue, hasFatalIssues, LINER_DIAGNOSTIC_CODES } from "./diagnostics";
import { elevationAt } from "./elevationAt";
import { resolveCrossfallOffset, resolveCrossfallState, validateCrossSlopeIntervals } from "./grid/crossfallResolution";
import {
  evaluateAlignmentAtDistance,
  totalAlignmentLength,
  validateAlignment,
} from "./geometry/horizontal";
import type { BuildIntermediateInput } from "./pipeline/pipeline";
import { displayedStationAtPhysicalDistance } from "./station/stationRules";
import { DEFAULT_TOLERANCES } from "./tolerances";
import type {
  AlignmentElement,
  LocalFrame,
  ResolvedCrossfallState,
  ValidationIssue,
  ZProvenance,
} from "./types";
import { offsetPoint } from "./vector";
import { validateVerticalAlignment } from "./validateVerticalAlignment";
import { resolveStationOffsetLines, validateWidthChangePoints } from "./width/widthResolution";
import type {
  CrossSectionOffsetLineDraft,
  HorizontalElementDraft,
  LinerDomainDraftVNext,
} from "../schema/types";

export type Coordinate3dInput = BuildIntermediateInput | LinerDomainDraftVNext;

export type Coordinate3dError = {
  code: string;
  diagnostics: ValidationIssue[];
};

export type Coordinate3dResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: Coordinate3dError };

export type PointAtStationOffsetValue = {
  x: number;
  y: number;
  z: number;
  physicalDistance: number;
  displayedStation: number;
  offset: number;
  azimuth: number;
  localFrame: LocalFrame;
  elementId: string;
  zProvenance: ZProvenance;
};

export type CrossSectionOffsetLineElevation = {
  id: string;
  offset: number;
  elevation: number;
  z: number;
  x: number;
  y: number;
  role?: string;
  label?: string;
};

export type CrossSectionAtStationValue = {
  physicalDistance: number;
  displayedStation: number;
  profileElevation: number;
  crossfall: ResolvedCrossfallState;
  templateId?: string;
  offsetLines: CrossSectionOffsetLineElevation[];
};

const COORDINATE_MEASURED_GRID_UNSUPPORTED = "LINER_COORDINATE_MEASURED_GRID_UNSUPPORTED";
const COORDINATE_INVALID_STATION = "LINER_COORDINATE_INVALID_STATION";
const COORDINATE_INVALID_OFFSET = "LINER_COORDINATE_INVALID_OFFSET";
const COORDINATE_STATION_OUT_OF_RANGE = "LINER_COORDINATE_STATION_OUT_OF_RANGE";
const COORDINATE_PROFILE_COVERAGE_GAP = "LINER_COORDINATE_PROFILE_COVERAGE_GAP";

function isLinerDomainDraftVNext(input: Coordinate3dInput): input is LinerDomainDraftVNext {
  return "generationSettings" in input && "sampling" in input;
}

function toAlignmentElement(element: HorizontalElementDraft): AlignmentElement {
  if (element.type === "straight") {
    return {
      type: "straight",
      id: element.id,
      start: element.start,
      azimuth: element.azimuth,
      length: element.length,
    };
  }
  if (element.type === "arc") {
    return {
      type: "arc",
      id: element.id,
      start: element.start,
      azimuth: element.azimuth,
      radius: element.radius,
      turn: element.turn,
      length: element.length,
    };
  }
  return {
    type: "clothoid",
    id: element.id,
    start: element.start,
    azimuth: element.azimuth,
    clothoidParameter: element.clothoidParameter,
    startRadius: element.startRadius,
    endRadius: element.endRadius,
    turn: element.turn,
    length: element.length,
  };
}

export function normalizeCoordinate3dInput(input: Coordinate3dInput): BuildIntermediateInput {
  if (!isLinerDomainDraftVNext(input)) {
    return input;
  }

  const defaultTemplate = input.crossSections[0];
  const offsets = defaultTemplate?.offsetLines.map((line) => line.offset) ?? [0];
  const gradeElement = input.verticalAlignment.elements.find((element) => element.type === "grade");
  const z = gradeElement?.type === "grade" ? gradeElement.startElevation : 0;

  return {
    alignment: {
      id: input.alignment.id,
      linerModelId: input.linerModelId,
      coordinatePolicyId: input.coordinatePolicyId,
      elements: input.alignment.elements.map(toAlignmentElement),
    },
    stationDefinition: input.stationDefinition,
    verticalAlignment: input.verticalAlignment,
    crossSections: input.crossSections,
    crossSlopeIntervals: input.crossSlopeIntervals,
    measuredGrid: input.measuredGrid,
    offsets,
    sampleInterval: input.sampling.display.maxChordLength,
    selectedCrossSectionStation: input.selectedCrossSectionStation,
    drawingSettings: input.drawingSettings,
    widthChangePoints: input.widthChangePoints,
    z,
    ...(input.crossSections.length > 1 || input.gridDefinitions.length > 1
      ? { gridDefinitions: input.gridDefinitions }
      : {}),
  };
}

type ResolvedCoordinateContext = {
  input: BuildIntermediateInput;
  diagnostics: ValidationIssue[];
  totalLength: number;
  canEvaluate: boolean;
};

function fail<T>(code: string, diagnostics: ValidationIssue[]): Coordinate3dResult<T> {
  return { ok: false, error: { code, diagnostics } };
}

function ok<T>(value: T): Coordinate3dResult<T> {
  return { ok: true, value };
}

function verticalProfileEndStation(input: BuildIntermediateInput): number {
  if (input.verticalAlignment === undefined) {
    return 0;
  }
  let maxEnd = 0;
  for (const element of input.verticalAlignment.elements) {
    maxEnd = Math.max(maxEnd, element.endStation);
  }
  return maxEnd;
}

function isEndCoverageMiss(input: BuildIntermediateInput, physicalDistance: number): boolean {
  const profileEnd = verticalProfileEndStation(input);
  return physicalDistance > profileEnd + DEFAULT_TOLERANCES.station;
}

function resolveProfileElevation(
  input: BuildIntermediateInput,
  physicalDistance: number,
): number | null {
  if (input.verticalAlignment !== undefined) {
    return elevationAt(physicalDistance, input.verticalAlignment);
  }
  const fallback = input.z ?? 0;
  return Number.isFinite(fallback) ? fallback : null;
}

function collectDiagnostics(input: BuildIntermediateInput): ResolvedCoordinateContext {
  const diagnostics: ValidationIssue[] = validateAlignment(input.alignment);
  const totalLength = totalAlignmentLength(input.alignment);
  diagnostics.push(...validateVerticalAlignment(input.verticalAlignment, totalLength));
  diagnostics.push(...validateCrossSlopeIntervals(input.crossSlopeIntervals, totalLength));
  diagnostics.push(...validateWidthChangePoints(input.widthChangePoints, totalLength));
  diagnostics.push(...validateCrossSectionTemplates({
    crossSections: input.crossSections,
    gridDefinitions: input.gridDefinitions,
    alignmentTotalLength: totalLength,
  }));

  return {
    input,
    diagnostics,
    totalLength,
    canEvaluate: !hasFatalIssues(diagnostics),
  };
}

function resolveCoordinateContext(input: Coordinate3dInput): ResolvedCoordinateContext {
  return collectDiagnostics(normalizeCoordinate3dInput(input));
}

function validateStation(
  context: ResolvedCoordinateContext,
  station: number,
): Coordinate3dResult<never> | null {
  if (!Number.isFinite(station)) {
    return fail(COORDINATE_INVALID_STATION, [
      createIssue("error", LINER_DIAGNOSTIC_CODES.stationOutOfRange, {
        station,
        detail: "Station must be a finite number.",
      }),
    ]);
  }

  if (context.input.measuredGrid) {
    return fail(COORDINATE_MEASURED_GRID_UNSUPPORTED, [
      {
        level: "error",
        code: COORDINATE_MEASURED_GRID_UNSUPPORTED,
        detail: "3D coordinate API does not evaluate measured-grid geometry.",
        entityType: "measuredGrid",
      },
    ]);
  }

  if (!context.canEvaluate) {
    return fail("LINER_COORDINATE_FATAL_DIAGNOSTICS", context.diagnostics);
  }

  if (
    station < -DEFAULT_TOLERANCES.station
    || station > context.totalLength + DEFAULT_TOLERANCES.station
  ) {
    return fail(COORDINATE_STATION_OUT_OF_RANGE, [
      createIssue("error", LINER_DIAGNOSTIC_CODES.stationOutOfRange, {
        station,
        detail: `Station ${station} is outside alignment length ${context.totalLength}.`,
      }),
    ]);
  }

  return null;
}

function clampStation(station: number, totalLength: number): number {
  return Math.min(Math.max(station, 0), totalLength);
}

function resolveStationEvaluation(
  context: ResolvedCoordinateContext,
  station: number,
): Coordinate3dResult<{
  physicalDistance: number;
  displayedStation: number;
  profileElevation: number;
  base: ReturnType<typeof evaluateAlignmentAtDistance>;
  resolvedTemplate: ReturnType<typeof resolveCrossSectionTemplateForPhysicalDistance>;
  crossfallState: ResolvedCrossfallState;
}> {
  const stationFailure = validateStation(context, station);
  if (stationFailure) {
    return stationFailure;
  }

  const physicalDistance = clampStation(station, context.totalLength);
  const displayedStation = displayedStationAtPhysicalDistance(
    physicalDistance,
    context.input.stationDefinition,
    physicalDistance > 0,
  );
  const profileElevation = resolveProfileElevation(context.input, physicalDistance);
  if (profileElevation === null) {
    const endCoverageMiss = isEndCoverageMiss(context.input, physicalDistance);
    return fail(COORDINATE_PROFILE_COVERAGE_GAP, [
      createIssue(
        endCoverageMiss ? "warning" : "error",
        endCoverageMiss
          ? LINER_DIAGNOSTIC_CODES.profileEndCoverageGap
          : LINER_DIAGNOSTIC_CODES.profileCoverageGap,
        {
          station: physicalDistance,
          entityType: "verticalAlignment",
          detail: `No vertical profile elevation at station ${physicalDistance}.`,
        },
      ),
    ]);
  }

  const base = evaluateAlignmentAtDistance(
    context.input.alignment,
    physicalDistance,
    displayedStation,
  );
  const resolvedTemplate = resolveCrossSectionTemplateForPhysicalDistance(
    {
      crossSections: context.input.crossSections,
      gridDefinitions: context.input.gridDefinitions,
    },
    physicalDistance,
  );
  const crossfallState = resolveCrossfallState(
    {
      crossSectionTemplate: resolvedTemplate,
      crossSlopeIntervals: context.input.crossSlopeIntervals,
    },
    physicalDistance,
    displayedStation,
  );

  return ok({
    physicalDistance,
    displayedStation,
    profileElevation,
    base,
    resolvedTemplate,
    crossfallState,
  });
}

function resolveOffsetLines(
  input: BuildIntermediateInput,
  physicalDistance: number,
  resolvedTemplate: ReturnType<typeof resolveCrossSectionTemplateForPhysicalDistance>,
): CrossSectionOffsetLineDraft[] {
  if (resolvedTemplate?.offsetLines.length) {
    return resolveStationOffsetLines(
      resolvedTemplate,
      input.widthChangePoints,
      physicalDistance,
    ).sort((left, right) => left.offset - right.offset);
  }

  return [...(input.offsets ?? [0])].sort((left, right) => left - right).map((offset, index) => ({
    id: `offset-${index}`,
    offset,
    elevation: 0,
    role: index === 0 ? "edge" as const : "custom" as const,
  }));
}

function templateElevationAtOffset(
  offsetLines: readonly CrossSectionOffsetLineDraft[],
  offset: number,
): number {
  const match = offsetLines.find((line) =>
    Math.abs(line.offset - offset) <= DEFAULT_TOLERANCES.offset,
  );
  if (!match) {
    return 0;
  }
  return Number.isFinite(match.elevation) ? match.elevation : 0;
}

function buildZProvenance(
  profileElevation: number,
  crossfallOffset: number,
  templateElevation: number,
): ZProvenance {
  return {
    profileElevation,
    crossfallOffset,
    structuralReferenceOffset: 0,
    sectionDepthOffset: templateElevation,
    girderEccentricity: 0,
  };
}

export function elevationAtStation(
  input: Coordinate3dInput,
  station: number,
): Coordinate3dResult<number> {
  const context = resolveCoordinateContext(input);
  const evaluation = resolveStationEvaluation(context, station);
  if (!evaluation.ok) {
    return evaluation;
  }
  return ok(evaluation.value.profileElevation);
}

export function pointAtStationOffset(
  input: Coordinate3dInput,
  station: number,
  offset: number,
): Coordinate3dResult<PointAtStationOffsetValue> {
  if (!Number.isFinite(offset)) {
    return fail(COORDINATE_INVALID_OFFSET, [
      {
        level: "error",
        code: COORDINATE_INVALID_OFFSET,
        detail: "Offset must be a finite number.",
        entityType: "offset",
      },
    ]);
  }

  const context = resolveCoordinateContext(input);
  const evaluation = resolveStationEvaluation(context, station);
  if (!evaluation.ok) {
    return evaluation;
  }

  const {
    physicalDistance,
    displayedStation,
    profileElevation,
    base,
    resolvedTemplate,
    crossfallState,
  } = evaluation.value;
  const offsetLines = resolveOffsetLines(context.input, physicalDistance, resolvedTemplate);
  const templateElevation = templateElevationAtOffset(offsetLines, offset);
  const crossfallOffset = resolveCrossfallOffset(crossfallState, offset);
  const planPoint = offsetPoint(base.point, base.azimuth, offset);
  const z = profileElevation + templateElevation + crossfallOffset;

  return ok({
    x: planPoint.x,
    y: planPoint.y,
    z,
    physicalDistance,
    displayedStation,
    offset,
    azimuth: base.azimuth,
    localFrame: base.localFrame,
    elementId: base.elementId,
    zProvenance: buildZProvenance(profileElevation, crossfallOffset, templateElevation),
  });
}

export function crossSectionAtStation(
  input: Coordinate3dInput,
  station: number,
): Coordinate3dResult<CrossSectionAtStationValue> {
  const context = resolveCoordinateContext(input);
  const evaluation = resolveStationEvaluation(context, station);
  if (!evaluation.ok) {
    return evaluation;
  }

  const {
    physicalDistance,
    displayedStation,
    profileElevation,
    base,
    resolvedTemplate,
    crossfallState,
  } = evaluation.value;
  const offsetLines = resolveOffsetLines(context.input, physicalDistance, resolvedTemplate);

  return ok({
    physicalDistance,
    displayedStation,
    profileElevation,
    crossfall: crossfallState,
    templateId: resolvedTemplate?.id,
    offsetLines: offsetLines.map((line) => {
      const crossfallOffset = resolveCrossfallOffset(crossfallState, line.offset);
      const templateElevation = Number.isFinite(line.elevation) ? line.elevation : 0;
      const planPoint = offsetPoint(base.point, base.azimuth, line.offset);
      return {
        id: line.id,
        offset: line.offset,
        elevation: templateElevation,
        z: profileElevation + templateElevation + crossfallOffset,
        role: line.role,
        label: line.label ?? line.id,
        x: planPoint.x,
        y: planPoint.y,
      };
    }),
  });
}
