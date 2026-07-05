import type { NormalizationContext } from "./normalizationContext";

export type PostConditionSeverity = "error" | "warning";

export type NormalizationPostConditionResult = {
  readonly severity: PostConditionSeverity;
  readonly code: NormalizationPostConditionCode;
  readonly message: string;
  readonly value: number | readonly number[];
  readonly label: string;
};

export const POST_CONDITION_CODES = {
  PROFILE_STATION_NEGATIVE: "LINER_PROFILE_STATION_NEGATIVE",
  PROFILE_ELEMENT_REVERSED: "LINER_PROFILE_ELEMENT_REVERSED",
  PROFILE_ELEMENT_OVERFLOW: "LINER_PROFILE_ELEMENT_OVERFLOW",
  PROFILE_ADJACENCY_GAP: "LINER_PROFILE_ADJACENCY_GAP",
  PROFILE_END_COVERAGE_GAP: "LINER_PROFILE_END_COVERAGE_GAP",
  SPAN_START_NEGATIVE: "LINER_SPAN_START_NEGATIVE",
  SPAN_END_EXCEEDS_ALIGNMENT: "LINER_SPAN_END_EXCEEDS_ALIGNMENT",
  SPAN_REVERSED: "LINER_SPAN_REVERSED",
  CROSS_SECTION_STATION_NEGATIVE: "LINER_CROSS_SECTION_STATION_NEGATIVE",
  CROSS_SECTION_STATION_OVERFLOW: "LINER_CROSS_SECTION_STATION_OVERFLOW",
  EXPLICIT_STATION_OVERFLOW: "LINER_EXPLICIT_STATION_OVERFLOW",
  EXPLICIT_STATIONS_NOT_MONOTONIC: "LINER_EXPLICIT_STATIONS_NOT_MONOTONIC",
  EXPLICIT_STATION_DUPLICATE: "LINER_EXPLICIT_STATION_DUPLICATE",
} as const;

export type NormalizationPostConditionCode =
  (typeof POST_CONDITION_CODES)[keyof typeof POST_CONDITION_CODES];

export function runPostConditions(
  ctx: NormalizationContext,
  draft: {
    stationDefinition: { explicitStations?: readonly number[] };
    spans: ReadonlyArray<{ startPhysicalDistance: number; endPhysicalDistance: number }>;
    verticalAlignment: {
      elements: ReadonlyArray<{ startStation: number; endStation: number }>;
    };
    crossSections: ReadonlyArray<{ station?: number; name: string }>;
  },
): NormalizationPostConditionResult[] {
  const results: NormalizationPostConditionResult[] = [];
  const t = ctx.tolerance.station;
  const push = (
    severity: PostConditionSeverity,
    code: NormalizationPostConditionCode,
    message: string,
    value: number | readonly number[],
    label: string,
  ) => results.push({ severity, code, message, value, label });

  const elems = draft.verticalAlignment.elements;
  for (const [i, e] of elems.entries()) {
    if (e.startStation < -t) {
      push(
        "error",
        POST_CONDITION_CODES.PROFILE_STATION_NEGATIVE,
        `profile.elements[${i}].startStation = ${e.startStation} is below 0`,
        e.startStation,
        `profile.elements[${i}].startStation`,
      );
    }
    if (e.startStation >= e.endStation) {
      push(
        "error",
        POST_CONDITION_CODES.PROFILE_ELEMENT_REVERSED,
        `profile.elements[${i}] reversed: start=${e.startStation} >= end=${e.endStation}`,
        [e.startStation, e.endStation],
        `profile.elements[${i}]`,
      );
    }
    if (e.endStation > ctx.alignmentLength + t) {
      push(
        "error",
        POST_CONDITION_CODES.PROFILE_ELEMENT_OVERFLOW,
        `profile.elements[${i}].endStation = ${e.endStation} > alignmentLength ${ctx.alignmentLength}`,
        e.endStation,
        `profile.elements[${i}].endStation`,
      );
    }
  }
  for (let i = 1; i < elems.length; i++) {
    const gap = elems[i - 1]!.endStation - elems[i]!.startStation;
    if (Math.abs(gap) > t) {
      push(
        "error",
        POST_CONDITION_CODES.PROFILE_ADJACENCY_GAP,
        `profile adjacency gap between elements[${i - 1}] and elements[${i}]; gap=${gap}`,
        [elems[i - 1]!.endStation, elems[i]!.startStation],
        `profile.elements[${i - 1}]→[${i}]`,
      );
    }
  }
  const lastEnd = elems[elems.length - 1]?.endStation ?? 0;
  if (lastEnd < ctx.alignmentLength - t) {
    push(
      "warning",
      POST_CONDITION_CODES.PROFILE_END_COVERAGE_GAP,
      `profile ends at ${lastEnd} but alignmentLength=${ctx.alignmentLength} (gap ${ctx.alignmentLength - lastEnd})`,
      lastEnd,
      "profile.elements[].endStation (last)",
    );
  }

  for (const [i, s] of draft.spans.entries()) {
    if (s.startPhysicalDistance < -t) {
      push(
        "error",
        POST_CONDITION_CODES.SPAN_START_NEGATIVE,
        `spans[${i}].startPhysicalDistance = ${s.startPhysicalDistance} < 0`,
        s.startPhysicalDistance,
        `spans[${i}].startPhysicalDistance`,
      );
    }
    if (s.endPhysicalDistance > ctx.alignmentLength + t) {
      push(
        "error",
        POST_CONDITION_CODES.SPAN_END_EXCEEDS_ALIGNMENT,
        `spans[${i}].endPhysicalDistance = ${s.endPhysicalDistance} > alignmentLength ${ctx.alignmentLength}`,
        s.endPhysicalDistance,
        `spans[${i}].endPhysicalDistance`,
      );
    }
    if (s.startPhysicalDistance > s.endPhysicalDistance) {
      push(
        "error",
        POST_CONDITION_CODES.SPAN_REVERSED,
        `spans[${i}] reversed`,
        [s.startPhysicalDistance, s.endPhysicalDistance],
        `spans[${i}]`,
      );
    }
  }

  for (const [i, cs] of draft.crossSections.entries()) {
    if (cs.station == null) continue;
    if (cs.station < -t) {
      push(
        "error",
        POST_CONDITION_CODES.CROSS_SECTION_STATION_NEGATIVE,
        `crossSections[${i}].station = ${cs.station} < 0`,
        cs.station,
        `crossSections[${i}].station`,
      );
    }
    if (cs.station > ctx.alignmentLength + t) {
      push(
        "error",
        POST_CONDITION_CODES.CROSS_SECTION_STATION_OVERFLOW,
        `crossSections[${i}].station = ${cs.station} > alignmentLength ${ctx.alignmentLength}`,
        cs.station,
        `crossSections[${i}].station`,
      );
    }
  }

  const ex = draft.stationDefinition.explicitStations ?? [];
  for (let i = 0; i < ex.length; i++) {
    if (ex[i]! < -t || ex[i]! > ctx.alignmentLength + t) {
      push(
        "error",
        POST_CONDITION_CODES.EXPLICIT_STATION_OVERFLOW,
        `explicitStations[${i}] = ${ex[i]!} outside [0, ${ctx.alignmentLength}]`,
        ex[i]!,
        `explicitStations[${i}]`,
      );
    }
  }
  for (let i = 1; i < ex.length; i++) {
    if (ex[i]! <= ex[i - 1]!) {
      push(
        "error",
        POST_CONDITION_CODES.EXPLICIT_STATIONS_NOT_MONOTONIC,
        `explicitStations not strictly increasing at index ${i}`,
        [ex[i - 1]!, ex[i]!],
        "explicitStations",
      );
    }
    if (Math.abs(ex[i]! - ex[i - 1]!) < t) {
      push(
        "error",
        POST_CONDITION_CODES.EXPLICIT_STATION_DUPLICATE,
        `explicitStations duplicate at index ${i}`,
        [ex[i - 1]!, ex[i]!],
        "explicitStations",
      );
    }
  }

  return results;
}
