/**
 * Lane U Wave 2: Road / Bridge workflow builders (pure, FAST-testable).
 *
 * The Road step seeds the shared Project with the Reference Business 001
 * (Gujo Hachiman) road alignment sample (Lane S surface) as a
 * `RoadWorkflowState`. The Bridge step derives a pier/span arrangement from
 * the road's bridge-candidate station range (equal-interval piers matching
 * the candidate nominal span).
 */

import { buildReferenceBusiness001RoadSample, rb001AlignmentLength } from "../liner/samples/reference-business-001/roadAlignment";
import type { BridgeSpanWorkflowState, RoadBridgeCandidate, RoadWorkflowState } from "./workflowState";

export const RB001_BRIDGE_WORKFLOW_NAME = "長良川橋 (支間割設定)" as const;

export function buildRb001RoadWorkflowState(placedAt: string): RoadWorkflowState {
  const sample = buildReferenceBusiness001RoadSample();
  const candidate = sample.bridgeCandidate;
  const bridgeCandidate: RoadBridgeCandidate = {
    startStation: candidate.startStation,
    endStation: candidate.endStation,
    nominalSpanM: candidate.nominalSpanM,
    note: candidate.note,
  };
  return {
    roadId: sample.id,
    alignmentId: sample.horizontal.id,
    name: sample.name,
    totalLengthM: rb001AlignmentLength(),
    bridgeCandidate,
    placedAt,
  };
}

export interface BridgeArrangement {
  readonly piers: readonly { readonly supportId: string; readonly station: number }[];
  readonly spans: readonly BridgeSpanWorkflowState[];
}

/** Equal-interval pier stations strictly inside (start, end). */
export function computePierStations(
  startStation: number,
  endStation: number,
  pierCount: number,
): readonly number[] {
  if (!Number.isFinite(startStation) || !Number.isFinite(endStation)) return [];
  if (endStation <= startStation) return [];
  const count = Math.max(0, Math.floor(pierCount));
  if (count === 0) return [];
  const spanLength = (endStation - startStation) / (count + 1);
  return Array.from({ length: count }, (_, i) => startStation + spanLength * (i + 1));
}

/** Build piers + spans for a bridge range with the given pier count. */
export function computeSpanArrangement(
  startStation: number,
  endStation: number,
  pierCount: number,
): BridgeArrangement {
  const stations = computePierStations(startStation, endStation, pierCount);
  const piers = stations.map((station, i) => ({ supportId: `P${i + 1}`, station }));
  const supports: { readonly supportId: string; readonly station: number }[] = [
    { supportId: "A1", station: startStation },
    ...piers,
    { supportId: "A2", station: endStation },
  ];
  const spans: BridgeSpanWorkflowState[] = supports.slice(0, -1).map((support, i) => {
    const next = supports[i + 1];
    return {
      spanId: `S${i + 1}`,
      index: i + 1,
      startSupportId: support.supportId,
      endSupportId: next.supportId,
      startStation: support.station,
      endStation: next.station,
      length: next.station - support.station,
    };
  });
  return { piers, spans };
}

export function totalSpanLength(spans: readonly BridgeSpanWorkflowState[]): number {
  return spans.reduce((sum, span) => sum + span.length, 0);
}