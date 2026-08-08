/**
 * Phase 3-2: BridgeGeometry numeric generator.
 *
 * Consumes the shared BridgeProject.Alignment (Phase 3-1 output) and the bridge
 * placement conditions (liner pier/span drafts) and deterministically derives the
 * bridge geometry facts: bridge length, span definitions, support lines
 * (station / skew / position / tangent), and deck width.
 *
 * IMPORTANT: bridge geometry values are NEVER back-imported from the
 * superstructure tool's fixed values or sample values. They are derived from
 * BridgeProject.Alignment + the explicit placement conditions only.
 *
 * Out of scope: superstructure design, substructure design, analysis, reactions,
 * workflow engine.
 */

import type { PierDraft, SpanDraft } from "../liner/schema/types";
import {
  BRIDGE_PROJECT_GEOMETRY_TOOL_ID,
  type BridgeProjectAlignment,
  type BridgeProjectBridgeGeometry,
  type BpSupport,
  type BpSpan,
  bpConfirmed,
  bpDerived,
  bpMissing,
} from "./types";
import {
  BridgeProjectAdapterError,
  BP_CODES,
  assertAscendingStations,
  assertBpValueShape,
  assertFinite,
  assertSpanSumEqualsLength,
} from "./validation";

export interface BridgeGeometryGeneratorOptions {
  readonly bridgeId?: string;
  /** User-confirmed deck width (m). When absent, derived from the cross-section width. */
  readonly deckWidthM?: number;
  readonly deckWidthSourceReference?: string;
  /** Bridge center / reference line offset (default 0 = centerline). */
  readonly centerOffsetM?: number;
  readonly spanToleranceM?: number;
}

interface SupportCandidate {
  readonly supportId: string;
  readonly kind: "abutment" | "pier" | "virtual_pier";
  readonly stationM: number;
  readonly skewRad?: number;
}

function roundStation(station: number): number {
  return Math.round(station / 1e-6) * 1e-6;
}

function findSample(
  alignment: BridgeProjectAlignment,
  station: number,
  supportId: string,
) {
  const sample = alignment.stations.find(
    (entry) =>
      entry.supportId === supportId ||
      (entry.stationM.value !== undefined &&
        Math.abs(entry.stationM.value - station) <= 1e-6),
  );
  if (sample === undefined) {
    throw new BridgeProjectAdapterError(
      BP_CODES.STATION_OUT_OF_RANGE,
      `No alignment sample for support ${supportId} at station ${station}.`,
    );
  }
  return sample;
}

function collectSupportCandidates(
  alignment: BridgeProjectAlignment,
  piers: readonly PierDraft[] | null | undefined,
): SupportCandidate[] {
  if (piers !== undefined && piers !== null && piers.length > 0) {
    const candidates = piers
      .filter(
        (pier) =>
          typeof pier.physicalDistance === "number" && Number.isFinite(pier.physicalDistance),
      )
      .map((pier) => ({
        supportId: pier.id,
        kind: pier.kind as SupportCandidate["kind"],
        stationM: pier.physicalDistance,
        skewRad: pier.skewAngleRad,
      }));
    if (candidates.length > 0) {
      return candidates;
    }
  }

  // Fall back to support-station samples in the shared alignment.
  const samples = alignment.stations.filter((entry) => entry.supportId !== undefined);
  if (samples.length === 0) {
    throw new BridgeProjectAdapterError(
      BP_CODES.BRIDGE_EXTENT_MISSING,
      "No pier/abutment placement info and no support-station samples in the alignment.",
    );
  }
  return samples.map((sample) => ({
    supportId: sample.supportId!,
    kind: "virtual_pier" as const,
    stationM: sample.stationM.value!,
  }));
}

function resolveSpanLengthM(
  supportById: Map<string, BpSupport>,
  startSupportId: string,
  endSupportId: string,
): { start: number; end: number } {
  const start = supportById.get(startSupportId);
  const end = supportById.get(endSupportId);
  if (start === undefined || end === undefined) {
    throw new BridgeProjectAdapterError(
      BP_CODES.SUPPORT_MISMATCH,
      `Span references unknown support (${startSupportId}->${endSupportId}).`,
    );
  }
  const startStation = start.stationM.value;
  const endStation = end.stationM.value;
  assertFinite(startStation!, `span start station`);
  assertFinite(endStation!, `span end station`);
  if (endStation! <= startStation!) {
    throw new BridgeProjectAdapterError(
      BP_CODES.STATION_ORDER_INVALID,
      `Span ${startSupportId}->${endSupportId} has non-ascending stations.`,
    );
  }
  return { start: startStation!, end: endStation! };
}

function buildSpans(
  supportById: Map<string, BpSupport>,
  spans: readonly SpanDraft[] | null | undefined,
  toleranceM: number,
): BpSpan[] {
  const orderedSupportIds = Array.from(supportById.keys());
  const result: BpSpan[] = [];

  if (spans !== undefined && spans !== null && spans.length > 0) {
    spans.forEach((span, index) => {
      const startId = span.pierIdStart ?? orderedSupportIds[index];
      const endId = span.pierIdEnd ?? orderedSupportIds[index + 1];
      const { start, end } = resolveSpanLengthM(supportById, startId, endId);
      result.push({
        spanId: span.id,
        startSupportId: startId,
        endSupportId: endId,
        startStationM: bpConfirmed(start, "m", startId),
        endStationM: bpConfirmed(end, "m", endId),
        lengthM: bpDerived(
          end - start,
          "m",
          "endSupport.station - startSupport.station",
          BRIDGE_PROJECT_GEOMETRY_TOOL_ID,
        ),
      });
    });
    return result;
  }

  for (let i = 0; i < orderedSupportIds.length - 1; i += 1) {
    const startId = orderedSupportIds[i]!;
    const endId = orderedSupportIds[i + 1]!;
    const { start, end } = resolveSpanLengthM(supportById, startId, endId);
    result.push({
      spanId: `SPAN-${i + 1}`,
      startSupportId: startId,
      endSupportId: endId,
      startStationM: bpConfirmed(start, "m", startId),
      endStationM: bpConfirmed(end, "m", endId),
      lengthM: bpDerived(
        end - start,
        "m",
        "consecutive support stations",
        BRIDGE_PROJECT_GEOMETRY_TOOL_ID,
      ),
    });
  }
  if (result.length === 0) {
    throw new BridgeProjectAdapterError(
      BP_CODES.SUPPORT_MISMATCH,
      "At least two supports are required to derive spans.",
    );
  }
  return result;
}

/**
 * Build the shared BridgeProject.BridgeGeometry from the shared alignment and
 * the explicit bridge placement conditions. Deterministic.
 */
export function buildBridgeProjectGeometry(
  alignment: BridgeProjectAlignment,
  piers?: readonly PierDraft[] | null,
  spans?: readonly SpanDraft[] | null,
  options: BridgeGeometryGeneratorOptions = {},
): BridgeProjectBridgeGeometry {
  const toleranceM = options.spanToleranceM ?? 1e-6;

  const candidates = collectSupportCandidates(alignment, piers);
  candidates.forEach((candidate) => assertFinite(candidate.stationM, `support ${candidate.supportId} station`));
  assertAscendingStations(
    candidates.map((candidate) => candidate.stationM),
    "support stations",
  );

  const supports: BpSupport[] = candidates.map((candidate) => {
    const sample = findSample(alignment, candidate.stationM, candidate.supportId);
    const stationValue = bpConfirmed(candidate.stationM, "m", candidate.supportId);
    const skewValue =
      candidate.skewRad !== undefined && Number.isFinite(candidate.skewRad)
        ? bpConfirmed(candidate.skewRad, "rad", candidate.supportId)
        : ({
            unit: "rad",
            status: "DEFERRED",
            stateReason: `skew not specified for ${candidate.supportId}; pending input.`,
          } as const);
    assertBpValueShape(stationValue, `support ${candidate.supportId} station`);
    assertBpValueShape(skewValue, `support ${candidate.supportId} skew`);
    assertBpValueShape(sample.position.x, `support ${candidate.supportId} x`);
    assertBpValueShape(sample.tangent.x, `support ${candidate.supportId} tangent`);
    assertBpValueShape(sample.transverse.x, `support ${candidate.supportId} transverse`);
    return {
      supportId: candidate.supportId,
      kind: candidate.kind,
      stationM: stationValue,
      skewRad: skewValue,
      position: sample.position,
      tangent: sample.tangent,
      transverse: sample.transverse,
    };
  });

  const supportById = new Map<string, BpSupport>(supports.map((support) => [support.supportId, support]));
  const derivedSpans = buildSpans(supportById, spans, toleranceM);

  const firstStation = supports[0]!.stationM.value!;
  const lastStation = supports[supports.length - 1]!.stationM.value!;
  const bridgeLength = lastStation - firstStation;
  const bridgeLengthValue = bpDerived(
    bridgeLength,
    "m",
    "lastSupport.station - firstSupport.station",
    BRIDGE_PROJECT_GEOMETRY_TOOL_ID,
  );
  assertBpValueShape(bridgeLengthValue, "bridgeLengthM");

  const alignmentLength = alignment.bridgeLengthM.value;
  if (alignmentLength !== undefined && Math.abs(alignmentLength - bridgeLength) > toleranceM) {
    throw new BridgeProjectAdapterError(
      BP_CODES.SPAN_SUM_MISMATCH,
      `Bridge length from supports (${bridgeLength}) disagrees with alignment bridge length (${alignmentLength}).`,
    );
  }
  assertSpanSumEqualsLength(
    derivedSpans.map((span) => span.lengthM.value!),
    bridgeLength,
    "span lengths",
    toleranceM,
  );

  // Deck width: user-confirmed override, else derived from cross-section width, else MISSING.
  let deckWidth;
  if (options.deckWidthM !== undefined) {
    assertFinite(options.deckWidthM, "deckWidthM");
    deckWidth = bpConfirmed(
      options.deckWidthM,
      "m",
      options.deckWidthSourceReference,
      "USER_INPUT",
    );
  } else {
    const widths = alignment.stations
      .map((station) => station.widthM?.value)
      .filter((width): width is number => typeof width === "number" && Number.isFinite(width));
    if (widths.length > 0) {
      const maxWidth = Math.max(...widths);
      deckWidth = bpDerived(
        maxWidth,
        "m",
        "max cross-section width across sampled stations",
        BRIDGE_PROJECT_GEOMETRY_TOOL_ID,
      );
    } else {
      deckWidth = bpMissing("m", "no deck width provided and no cross-section width available");
    }
  }
  assertBpValueShape(deckWidth, "deckWidthM");

  const centerOffset = options.centerOffsetM ?? 0;
  assertFinite(centerOffset, "centerOffsetM");
  const centerOffsetValue = bpConfirmed(centerOffset, "m", undefined, "USER_INPUT");

  return {
    bridgeId: options.bridgeId ?? alignment.alignmentId,
    bridgeStartStationM: bpConfirmed(firstStation, "m", supports[0]!.supportId),
    bridgeEndStationM: bpConfirmed(lastStation, "m", supports[supports.length - 1]!.supportId),
    bridgeLengthM: bridgeLengthValue,
    deckWidthM: deckWidth,
    centerOffsetM: centerOffsetValue,
    supports,
    spans: derivedSpans,
    coordinateSystem: alignment.coordinateSystem,
    unitContext: alignment.unitContext,
    generatedBy: BRIDGE_PROJECT_GEOMETRY_TOOL_ID,
  };
}
