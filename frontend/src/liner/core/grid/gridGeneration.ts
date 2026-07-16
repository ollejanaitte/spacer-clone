import { elevationAt } from "../elevationAt";
import { resolveCrossSectionTemplateForPhysicalDistance } from "../crossSectionTemplateResolution";
import { createIssue, LINER_DIAGNOSTIC_CODES } from "../diagnostics";
import { evaluateAlignmentAtDistance } from "../geometry/horizontal";
import { formatStationDisplay } from "../station/stationFormat";
import { DEFAULT_TOLERANCES } from "../tolerances";
import type {
  GeneratedStation,
  GridPointPreparation,
  GridPreparationInput,
  MemberPreparation,
  NodePreparation,
  ValidationIssue,
} from "../types";
import { offsetPoint } from "../vector";
import {
  resolveCrossfallOffset,
  resolveCrossfallState,
  validateCrossSlopeIntervals,
} from "./crossfallResolution";
import {
  resolveStationOffsetLines,
  validateWidthChangePoints,
} from "../width/widthResolution";
import type { CrossSectionOffsetLineDraft } from "../../schema/types";

function padIndex(index: number): string {
  return index.toString().padStart(3, "0");
}

function resolveProfileElevation(
  input: GridPreparationInput,
  physicalDistance: number,
): number | null {
  if (input.verticalAlignment !== undefined) {
    return elevationAt(physicalDistance, input.verticalAlignment);
  }
  const fallback = input.z ?? 0;
  return Number.isFinite(fallback) ? fallback : null;
}

function verticalProfileEndStation(input: GridPreparationInput): number {
  if (input.verticalAlignment === undefined) {
    return 0;
  }
  let maxEnd = 0;
  for (const element of input.verticalAlignment.elements) {
    maxEnd = Math.max(maxEnd, element.endStation);
  }
  return maxEnd;
}

function isEndCoverageMiss(input: GridPreparationInput, physicalDistance: number): boolean {
  const profileEnd = verticalProfileEndStation(input);
  return physicalDistance > profileEnd + DEFAULT_TOLERANCES.station;
}

export function gridPointId(
  linerModelId: string,
  longitudinalIndex: number,
  transverseIndex: number,
): string {
  return `GP-${linerModelId}-${padIndex(longitudinalIndex)}-${padIndex(transverseIndex)}`;
}

export function generateGridPoints(input: GridPreparationInput): {
  gridPoints: GridPointPreparation[];
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [
    ...validateCrossSlopeIntervals(input.crossSlopeIntervals, input.alignmentTotalLength),
    ...validateWidthChangePoints(input.widthChangePoints, input.alignmentTotalLength ?? 0),
  ];
  const sortedStations = [...input.stations].sort(
    (a, b) => a.physicalDistance - b.physicalDistance,
  );
  const gridPoints: GridPointPreparation[] = [];

  for (const [longitudinalIndex, station] of sortedStations.entries()) {
    const base = evaluateAlignmentAtDistance(
      input.alignment,
      station.physicalDistance,
      station.displayedStation,
    );
    const profileElevation = resolveProfileElevation(input, station.physicalDistance);

    if (profileElevation === null) {
      const endCoverageMiss = isEndCoverageMiss(input, station.physicalDistance);
      issues.push(
        createIssue(
          endCoverageMiss ? "warning" : "error",
          endCoverageMiss
            ? LINER_DIAGNOSTIC_CODES.profileEndCoverageGap
            : LINER_DIAGNOSTIC_CODES.profileCoverageGap,
          {
            station: station.physicalDistance,
            entityType: "verticalAlignment",
            detail: `No vertical profile elevation at station ${formatStationDisplay(station.physicalDistance)}.`,
          },
        ),
      );
      continue;
    }

    const resolvedTemplate = resolveCrossSectionTemplateForPhysicalDistance(
      {
        crossSections: input.crossSections,
        gridDefinitions: input.gridDefinitions,
      },
      station.physicalDistance,
    );
    const crossfallState = resolveCrossfallState(
      {
        crossSectionTemplate: resolvedTemplate,
        crossSlopeIntervals: input.crossSlopeIntervals,
      },
      station.physicalDistance,
      station.displayedStation,
    );
    const stationOffsetLines: CrossSectionOffsetLineDraft[] = resolvedTemplate?.offsetLines.length
      ? resolveStationOffsetLines(
        resolvedTemplate,
        input.widthChangePoints,
        station.physicalDistance,
      ).sort((left, right) => left.offset - right.offset)
      : [...input.offsets].sort((a, b) => a - b).map((offset, index) => ({
          id: `offset-${index}`,
          offset,
          elevation: 0,
          role: index === 0 ? "edge" : "custom",
        }));

    for (const [transverseIndex, offsetLine] of stationOffsetLines.entries()) {
      const offset = offsetLine.offset;
      const planPoint = offsetPoint(base.point, base.azimuth, offset);
      const crossfallOffset = resolveCrossfallOffset(crossfallState, offset);
      const templateElevation = Number.isFinite(offsetLine.elevation) ? offsetLine.elevation : 0;
      const z = profileElevation + templateElevation + crossfallOffset;

      gridPoints.push({
        id: gridPointId(input.alignment.linerModelId, longitudinalIndex, transverseIndex),
        physicalDistance: station.physicalDistance,
        displayedStation: station.displayedStation,
        offset,
        x: planPoint.x,
        y: planPoint.y,
        z,
        localFrame: base.localFrame,
        labels: {
          longitudinalIndex,
          transverseIndex,
        },
        source: {
          alignmentId: input.alignment.id,
          stationId: station.id,
          elementId: base.elementId,
          crossSectionTemplateId: resolvedTemplate?.id,
        },
        roles: offsetLine.role === "edge" ? ["edge"] : ["main_girder"],
        zProvenance: {
          profileElevation,
          crossfallOffset,
          structuralReferenceOffset: 0,
          sectionDepthOffset: templateElevation,
          girderEccentricity: 0,
        },
      });
    }
  }

  return { gridPoints, issues };
}

export function createNodeCandidates(
  gridPoints: GridPointPreparation[],
  sourceRevision: string,
  alignmentId: string,
): NodePreparation[] {
  return gridPoints.map((point) => ({
    id: frameNodeIdFromGridPoint(point.id),
    gridPointId: point.id,
    x: point.x,
    y: point.y,
    z: point.z,
    provenance: {
      alignmentId,
      elementId: point.source.elementId,
      sourceRevision,
    },
  }));
}

export function frameNodeIdFromGridPoint(gridId: string): string {
  const parts = gridId.split("-");
  return `N_LINER_${parts.slice(1).join("_")}`;
}

export function createLongitudinalMemberCandidates(
  stations: GeneratedStation[],
  nodes: NodePreparation[],
  sourceRevision: string,
  alignmentId: string,
): { members: MemberPreparation[]; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const members: MemberPreparation[] = [];
  const nodesByStation = new Map<number, NodePreparation[]>();
  for (const node of nodes) {
    const parts = node.gridPointId.split("-");
    const longitudinalIndex = Number(parts.at(-2));
    const existing = nodesByStation.get(longitudinalIndex) ?? [];
    existing.push(node);
    nodesByStation.set(longitudinalIndex, existing);
  }

  for (let stationIndex = 0; stationIndex < stations.length - 1; stationIndex += 1) {
    const currentNodes = nodesByStation.get(stationIndex) ?? [];
    const nextNodes = nodesByStation.get(stationIndex + 1) ?? [];
    const pairCount = Math.min(currentNodes.length, nextNodes.length);
    for (let transverseIndex = 0; transverseIndex < pairCount; transverseIndex += 1) {
      const nodeI = currentNodes[transverseIndex];
      const nodeJ = nextNodes[transverseIndex];
      if (
        Math.hypot(nodeI.x - nodeJ.x, nodeI.y - nodeJ.y, nodeI.z - nodeJ.z) <=
        DEFAULT_TOLERANCES.length
      ) {
        issues.push(
          createIssue("warning", LINER_DIAGNOSTIC_CODES.zeroLengthMember, {
            entityType: "memberCandidate",
            entityId: nodeI.id,
          }),
        );
        continue;
      }
      members.push({
        id: `M_LINER_${alignmentId}_L_${padIndex(stationIndex)}_${padIndex(transverseIndex)}`,
        nodeIId: nodeI.id,
        nodeJId: nodeJ.id,
        stationIId: stations[stationIndex].id,
        stationJId: stations[stationIndex + 1].id,
        direction: "longitudinal",
        provenance: {
          alignmentId,
          sourceRevision,
        },
      });
    }
  }

  return { members, issues };
}
