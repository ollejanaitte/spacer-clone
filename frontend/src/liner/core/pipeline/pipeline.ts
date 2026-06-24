import { hasFatalIssues } from "../diagnostics";
import { generateGridPoints, createLongitudinalMemberCandidates, createNodeCandidates } from "../grid/gridGeneration";
import {
  evaluateAlignmentAtDistance,
  totalAlignmentLength,
  validateAlignment,
} from "../geometry/horizontal";
import { generateStations } from "../station/stationRules";
import type {
  AlignmentEvaluation,
  AlignmentSamplePoint,
  GridPreparationInput,
  LinearAlignment,
  LinerIntermediateResult,
  StationDefinition,
  ValidationIssue,
} from "../types";
import { sourceRevisionFor } from "./sourceRevision";

export type BuildIntermediateInput = {
  alignment: LinearAlignment;
  stationDefinition: StationDefinition;
  offsets?: number[];
  sampleInterval?: number;
  z?: number;
};

export function buildIntermediateResult(
  input: BuildIntermediateInput,
): LinerIntermediateResult {
  const sourceRevision = sourceRevisionFor({
    alignment: input.alignment,
    stationDefinition: input.stationDefinition,
    offsets: input.offsets ?? [0],
    z: input.z ?? 0,
  });
  const issues: ValidationIssue[] = validateAlignment(input.alignment);
  const totalLength = totalAlignmentLength(input.alignment);
  const stationResult = generateStations(input.stationDefinition, totalLength);
  issues.push(...stationResult.issues);

  const sampleInterval = input.sampleInterval ?? Math.max(totalLength, 1);
  const toSamplePoint = (evaluation: AlignmentEvaluation): AlignmentSamplePoint => ({
    physicalDistance: evaluation.physicalDistance,
    displayedStation: evaluation.displayedStation,
    x: evaluation.point.x,
    y: evaluation.point.y,
    azimuth: evaluation.azimuth,
    curvature: evaluation.curvature,
    segmentId: evaluation.elementId,
    localFrame: evaluation.localFrame,
  });
  const sampledPoints: AlignmentSamplePoint[] = [];
  if (!hasFatalIssues(issues)) {
    for (let distance = 0; distance < totalLength; distance += sampleInterval) {
      sampledPoints.push(
        toSamplePoint(evaluateAlignmentAtDistance(input.alignment, distance, distance)),
      );
    }
    sampledPoints.push(
      toSamplePoint(
        evaluateAlignmentAtDistance(input.alignment, totalLength, totalLength),
      ),
    );
  }

  const gridInput: GridPreparationInput = {
    alignment: input.alignment,
    stations: stationResult.stations,
    offsets: input.offsets ?? [0],
    sourceRevision,
    z: input.z,
  };
  const gridResult = hasFatalIssues(issues)
    ? { gridPoints: [], issues: [] }
    : generateGridPoints(gridInput);
  issues.push(...gridResult.issues);
  const nodeCandidates = createNodeCandidates(
    gridResult.gridPoints,
    sourceRevision,
    input.alignment.id,
  );
  const memberResult = createLongitudinalMemberCandidates(
    stationResult.stations,
    nodeCandidates,
    sourceRevision,
    input.alignment.id,
  );
  issues.push(...memberResult.issues);

  return {
    schemaVersion: "0.2.0",
    sourceRevision,
    linerModelId: input.alignment.linerModelId,
    coordinatePolicyId: input.alignment.coordinatePolicyId,
    horizontal: {
      totalLength,
      sampledPoints,
      issues: validateAlignment(input.alignment),
    },
    stations: stationResult.stations,
    gridPoints: gridResult.gridPoints,
    nodeCandidates,
    memberCandidates: memberResult.members,
    issues,
  };
}
