import type { StationEquation, ToleranceConfig } from "../../../core/types";
import { DEFAULT_TOLERANCES } from "../../../core/tolerances";

export type NormalizationDiagnostic = {
  readonly level: "info" | "warning";
  readonly code:
    | "LINER_ORIGIN_STATION_AMBIGUOUS"
    | "LINER_PLAN_SPAN_LENGTH_MISMATCH"
    | "LINER_PROFILE_REANCHORED"
    | "LINER_CROSS_SLOPE_REANCHORED";
  readonly detail: string;
  readonly candidateValues: readonly number[];
};

export type NormalizationDiagnostics = readonly NormalizationDiagnostic[];

export type NormalizationInvariantErrorCode =
  | "LINER_INVARIANT_OUT_OF_RANGE"
  | "LINER_INVARIANT_NOT_MONOTONIC";

export class NormalizationInvariantError extends Error {
  constructor(
    message: string,
    public readonly code: NormalizationInvariantErrorCode,
    public readonly value: number | readonly number[],
    public readonly label: string,
  ) {
    super(message);
    this.name = "NormalizationInvariantError";
  }
}

export class AggregateNormalizationError extends Error {
  constructor(
    public readonly results: ReadonlyArray<{ code: string; message: string }>,
  ) {
    super(`Normalization post-conditions failed: ${results.length} error(s)`);
    this.name = "AggregateNormalizationError";
  }
}

export interface NormalizationContext {
  readonly originStation: number;
  readonly alignmentLength: number;
  readonly planLength: number;
  readonly spanReach: number;
  readonly stationEquations: readonly StationEquation[];
  readonly tolerance: Pick<ToleranceConfig, "station">;
  toNormalized(station: number, label?: string): number;
  toOriginal(normalized: number, label?: string): number;
  assertInRange(v: number, label: string): void;
  assertMonotonic(stations: readonly number[], label: string): void;
  readonly diagnostics: NormalizationDiagnostics;
}

function decideOriginStation(input: {
  sectionStations: readonly (number | null | undefined)[];
  spanStartStations: readonly (number | null | undefined)[];
}): { value: number; candidates: number[]; ambiguous: boolean } {
  const defined = (v: number | null | undefined): v is number =>
    v != null && Number.isFinite(v);

  const candidates: number[] = [];
  const sectionFirst = input.sectionStations.find(defined);
  if (sectionFirst != null) candidates.push(sectionFirst);
  for (const v of input.spanStartStations) if (defined(v)) candidates.push(v);
  if (candidates.length === 0) return { value: 0, candidates: [], ambiguous: false };
  const value = Math.min(...candidates);
  const max = Math.max(...candidates);
  const ambiguous = candidates.length > 1 && max - value > 1e-6;
  return { value, candidates, ambiguous };
}

function decideAlignmentLength(input: {
  planLength: number;
  spanEndStations: readonly (number | null | undefined)[];
  originStation: number;
}): { value: number; planLength: number; spanReach: number; mismatch: boolean } {
  const defined = (v: number | null | undefined): v is number =>
    v != null && Number.isFinite(v);
  const spanReach = input.spanEndStations
    .filter(defined)
    .reduce((m, v) => Math.max(m, v - input.originStation), 0);
  const value = Math.max(input.planLength, spanReach);
  const mismatch = Math.abs(value - input.planLength) > 1e-6;
  return { value, planLength: input.planLength, spanReach, mismatch };
}

export function buildNormalizationContext(input: {
  sectionStations: readonly (number | null | undefined)[];
  spanStartStations: readonly (number | null | undefined)[];
  spanEndStations: readonly (number | null | undefined)[];
  planLength: number;
  stationEquations?: readonly StationEquation[];
  tolerance?: Pick<ToleranceConfig, "station">;
}): NormalizationContext {
  const tolerance = input.tolerance ?? DEFAULT_TOLERANCES;

  const origin = decideOriginStation({
    sectionStations: input.sectionStations,
    spanStartStations: input.spanStartStations,
  });
  const length = decideAlignmentLength({
    planLength: input.planLength,
    spanEndStations: input.spanEndStations,
    originStation: origin.value,
  });

  const eqs = input.stationEquations ?? [];
  const diagnostics: NormalizationDiagnostic[] = [];
  if (origin.ambiguous) {
    diagnostics.push({
      level: "warning",
      code: "LINER_ORIGIN_STATION_AMBIGUOUS",
      detail: `sectionStations[0] and spanStartStations differ: candidates=[${origin.candidates.join(", ")}]`,
      candidateValues: origin.candidates,
    });
  }
  if (length.mismatch) {
    diagnostics.push({
      level: "info",
      code: "LINER_PLAN_SPAN_LENGTH_MISMATCH",
      detail: `planLength=${length.planLength} vs spanReach=${length.spanReach} (alignmentLength=${length.value})`,
      candidateValues: [length.planLength, length.spanReach],
    });
  }

  const ctx: NormalizationContext = Object.freeze({
    originStation: origin.value,
    alignmentLength: length.value,
    planLength: length.planLength,
    spanReach: length.spanReach,
    stationEquations: Object.freeze([...eqs]),
    tolerance: Object.freeze({ station: tolerance.station }),

    toNormalized(station: number, _label?: string): number {
      if (eqs.length === 0) return station - origin.value;
      throw new Error("Phase C: station equations not yet supported");
    },
    toOriginal(normalized: number, _label?: string): number {
      if (eqs.length === 0) return normalized + origin.value;
      throw new Error("Phase C: station equations not yet supported");
    },
    assertInRange(v: number, label: string): void {
      if (v < -tolerance.station || v > length.value + tolerance.station) {
        throw new NormalizationInvariantError(
          `value ${v} out of range [${-tolerance.station}, ${length.value + tolerance.station}] at "${label}"`,
          "LINER_INVARIANT_OUT_OF_RANGE",
          v,
          label,
        );
      }
    },
    assertMonotonic(stations: readonly number[], label: string): void {
      for (let i = 1; i < stations.length; i++) {
        if (stations[i]! <= stations[i - 1]! - tolerance.station) {
          throw new NormalizationInvariantError(
            `monotonicity violated at index ${i}: ${stations[i - 1]} >= ${stations[i]} at "${label}"`,
            "LINER_INVARIANT_NOT_MONOTONIC",
            [stations[i - 1]!, stations[i]!],
            label,
          );
        }
      }
    },
    diagnostics: Object.freeze(diagnostics) as NormalizationDiagnostics,
  });
  return ctx;
}
