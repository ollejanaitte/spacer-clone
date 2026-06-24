import { createIssue, LINER_DIAGNOSTIC_CODES } from "../diagnostics";
import { evaluateAlignmentAtDistance } from "../geometry/horizontal";
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

function padIndex(index: number): string {
  return index.toString().padStart(3, "0");
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
  const issues: ValidationIssue[] = [];
  const z = input.z ?? 0;
  const sortedStations = [...input.stations].sort(
    (a, b) => a.physicalDistance - b.physicalDistance,
  );
  const sortedOffsets = [...input.offsets].sort((a, b) => a - b);
  const gridPoints: GridPointPreparation[] = [];

  for (const [longitudinalIndex, station] of sortedStations.entries()) {
    const base = evaluateAlignmentAtDistance(
      input.alignment,
      station.physicalDistance,
      station.displayedStation,
    );
    for (const [transverseIndex, offset] of sortedOffsets.entries()) {
      const planPoint = offsetPoint(base.point, base.azimuth, offset);
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
        },
        roles: transverseIndex === 0 ? ["edge"] : ["main_girder"],
        zProvenance: {
          profileElevation: z,
          crossfallOffset: 0,
          structuralReferenceOffset: 0,
          sectionDepthOffset: 0,
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
