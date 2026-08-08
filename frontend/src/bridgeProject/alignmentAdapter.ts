/**
 * Phase 3-1: Alignment -> BridgeProject Adapter.
 *
 * Converts the Liner road-alignment domain (Coordinate3dInput) into the shared
 * BridgeProject.Alignment representation. All geometry evaluation is delegated to
 * the Liner solvers (pointAtStationOffset / crossSectionAtStation /
 * evaluateAlignmentAtDistance) — this adapter NEVER reimplements alignment math.
 *
 * Responsibilities:
 *  - domain -> BridgeProject conversion (deterministic)
 *  - unit normalization (m / rad / % / ratio / 1/m)
 *  - status / provenance attribution (DERIVED for model-derived values,
 *    CONFIRMED for input support stations)
 *  - validation + fail-closed (non-finite / station order / out-of-range)
 *
 * Out of scope: superstructure/substructure design, analysis, reactions,
 * workflow engine.
 */

import {
  type Coordinate3dInput,
  normalizeCoordinate3dInput,
  pointAtStationOffset,
  crossSectionAtStation,
} from "../liner/core/coordinate3d";
import { evaluateAlignmentAtDistance } from "../liner/core/geometry/horizontal";
import type { BuildIntermediateInput } from "../liner/core/pipeline/pipeline";
import type { PierDraft } from "../liner/schema/types";
import {
  BRIDGE_PROJECT_ALIGNMENT_TOOL_ID,
  type BpAlignmentStation,
  type BridgeProjectAlignment,
  type BpCoordinateSystem,
  type BpUnitContext,
  bpConfirmed,
  bpDerived,
  bpMissing,
} from "./types";
import {
  BridgeProjectAdapterError,
  BP_CODES,
  assertAscendingStations,
  assertBpValueShape,
  assertCoordinateSystemKnown,
  assertFinite,
  assertStationInRange,
} from "./validation";

const COORDINATE_SYSTEM: BpCoordinateSystem = {
  name: "liner-global",
  handedness: "right",
  verticalAxis: "z",
  stationConvention: {
    tangentDirection: "+x",
    offsetSign: "right_positive",
    elevationSign: "up_positive",
  },
  angleUnit: "rad",
};

const UNIT_CONTEXT: BpUnitContext = {
  length: "m",
  angle: "rad",
  crossfall: "%",
  grade: "ratio",
  curvature: "1/m",
};

const DEFAULT_SAMPLE_INTERVAL_M = 10;
const STATION_ROUND = 1e-6;
const GRADE_EPSILON_M = 0.5;

export interface AlignmentAdapterOptions {
  readonly alignmentId?: string;
  /** Explicit bridge start/end station (default: derived from support stations). */
  readonly bridgeStartStationM?: number;
  readonly bridgeEndStationM?: number;
  /** Sampling interval for deterministic station samples (default 10 m). */
  readonly sampleIntervalM?: number;
  /** Explicit support stations (default: derived from draft piers/spans). */
  readonly supportStationsM?: readonly number[];
}

interface SupportStationInfo {
  readonly station: number;
  readonly id: string;
  readonly kind: string;
}

function roundStation(station: number): number {
  return Math.round(station / STATION_ROUND) * STATION_ROUND;
}

function collectSupportStations(draft: BuildIntermediateInput): SupportStationInfo[] {
  const piers: PierDraft[] = (draft.piers ?? []).filter(
    (pier) => typeof pier.physicalDistance === "number" && Number.isFinite(pier.physicalDistance),
  );
  const fromPiers = piers.map((pier) => ({
    station: pier.physicalDistance,
    id: pier.id,
    kind: pier.kind,
  }));

  if (fromPiers.length > 0) {
    return fromPiers;
  }

  const spans = draft.spans ?? [];
  if (spans.length > 0) {
    const stations = new Map<number, string>();
    spans.forEach((span) => {
      if (Number.isFinite(span.startPhysicalDistance)) {
        stations.set(roundStation(span.startPhysicalDistance), span.pierIdStart ?? `S-${span.startPhysicalDistance}`);
      }
      if (Number.isFinite(span.endPhysicalDistance)) {
        stations.set(roundStation(span.endPhysicalDistance), span.pierIdEnd ?? `S-${span.endPhysicalDistance}`);
      }
    });
    const entries = Array.from(stations.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([station, id]) => ({ station, id, kind: "virtual_pier" as const }));
    if (entries.length > 0) {
      return entries;
    }
  }

  return [];
}

function buildSampleStations(
  bridgeStart: number,
  bridgeEnd: number,
  interval: number,
  supportStations: readonly number[],
): number[] {
  const stations = new Set<number>();
  for (let station = bridgeStart; station <= bridgeEnd + 1e-9; station += interval) {
    stations.add(roundStation(station));
  }
  supportStations.forEach((station) => stations.add(roundStation(station)));
  const sorted = Array.from(stations).sort((a, b) => a - b);
  assertAscendingStations(sorted, "sampleStations");
  return sorted;
}

function resolveVerticalGrade(draft: BuildIntermediateInput, station: number): { grade: number } | null {
  // z at offset 0 equals the vertical profile elevation (template/crossfall are 0
  // at the centerline), so the vertical grade is the finite difference of z.
  if (!draft.verticalAlignment) {
    return null;
  }
  const lower = pointAtStationOffset(draft, station - GRADE_EPSILON_M, 0);
  const upper = pointAtStationOffset(draft, station + GRADE_EPSILON_M, 0);
  if (!lower.ok || !upper.ok) {
    return null;
  }
  const grade = (upper.value.z - lower.value.z) / (2 * GRADE_EPSILON_M);
  if (!Number.isFinite(grade)) {
    return null;
  }
  return { grade };
}

function sampleStation(
  draft: BuildIntermediateInput,
  station: number,
  supportById: Map<number, string>,
  interval: number,
  bridgeStart: number,
  bridgeEnd: number,
): BpAlignmentStation {
  assertStationInRange(station, bridgeStart, bridgeEnd, `station`, 1e-6);

  const point = pointAtStationOffset(draft, station, 0);
  if (!point.ok) {
    throw new BridgeProjectAdapterError(
      "BP_STATION_OUT_OF_RANGE",
      `pointAtStationOffset failed at station ${station}: ${point.error.code}`,
    );
  }
  const { x, y, z, azimuth, elementId, physicalDistance } = point.value;
  assertFinite(x, `station ${station} x`);
  assertFinite(y, `station ${station} y`);
  assertFinite(z, `station ${station} z`);
  assertFinite(azimuth, `station ${station} azimuth`);

  const evaluation = evaluateAlignmentAtDistance(
    draft.alignment,
    physicalDistance,
    point.value.displayedStation,
  );
  const curvature = evaluation.curvature;
  assertFinite(curvature, `station ${station} curvature`);

  const cross = crossSectionAtStation(draft, station);
  if (!cross.ok) {
    throw new BridgeProjectAdapterError(
      "BP_STATION_OUT_OF_RANGE",
      `crossSectionAtStation failed at station ${station}: ${cross.error.code}`,
    );
  }

  const crossfall = cross.value.crossfall;
  const crossfallPercent = Number.isFinite(crossfall.rightSlopePercent)
    ? crossfall.rightSlopePercent
    : 0;

  const offsets = cross.value.offsetLines.map((line) => line.offset).filter((offset) => Number.isFinite(offset));
  const hasWidth = offsets.length > 0;
  const widthMin = hasWidth ? Math.min(...offsets) : 0;
  const widthMax = hasWidth ? Math.max(...offsets) : 0;

  const gradeResult = resolveVerticalGrade(draft, station);
  const isSupport = supportById.has(roundStation(station));
  const supportId = supportById.get(roundStation(station));

  return {
    stationM: isSupport
      ? bpConfirmed(station, "m", supportId)
      : bpDerived(station, "m", "sample interval", BRIDGE_PROJECT_ALIGNMENT_TOOL_ID),
    position: {
      x: bpDerived(x, "m", `pointAtStationOffset(${station},0).x`, BRIDGE_PROJECT_ALIGNMENT_TOOL_ID),
      y: bpDerived(y, "m", `pointAtStationOffset(${station},0).y`, BRIDGE_PROJECT_ALIGNMENT_TOOL_ID),
      z: bpDerived(z, "m", `pointAtStationOffset(${station},0).z`, BRIDGE_PROJECT_ALIGNMENT_TOOL_ID),
    },
    azimuthRad: bpDerived(azimuth, "rad", `pointAtStationOffset(${station},0).azimuth`, BRIDGE_PROJECT_ALIGNMENT_TOOL_ID),
    curvaturePerM: bpDerived(curvature, "1/m", `evaluateAlignmentAtDistance(${physicalDistance}).curvature`, BRIDGE_PROJECT_ALIGNMENT_TOOL_ID),
    grade:
      gradeResult === null
        ? bpMissing("ratio", "no vertical profile in the input draft; grade cannot be derived")
        : bpDerived(gradeResult.grade, "ratio", `d(z(${station}+ε),z(${station}-ε))/(2ε)`, BRIDGE_PROJECT_ALIGNMENT_TOOL_ID),
    crossfallPercent: bpDerived(crossfallPercent, "%", `crossSectionAtStation(${station}).crossfall.rightSlopePercent`, BRIDGE_PROJECT_ALIGNMENT_TOOL_ID),
    ...(hasWidth
      ? {
          widthM: bpDerived(widthMax - widthMin, "m", `crossSectionAtStation(${station}).offsetLines range`, BRIDGE_PROJECT_ALIGNMENT_TOOL_ID),
          widthLeftM: bpDerived(-widthMin, "m", `crossSectionAtStation(${station}).offsetLines min`, BRIDGE_PROJECT_ALIGNMENT_TOOL_ID),
          widthRightM: bpDerived(widthMax, "m", `crossSectionAtStation(${station}).offsetLines max`, BRIDGE_PROJECT_ALIGNMENT_TOOL_ID),
        }
      : {}),
    elementId,
    ...(supportId !== undefined ? { supportId } : {}),
  };
}

/**
 * Build the shared BridgeProject.Alignment from a Liner alignment input.
 * Deterministic: identical input + options always produce identical output.
 */
export function buildBridgeProjectAlignment(
  input: Coordinate3dInput,
  options: AlignmentAdapterOptions = {},
): BridgeProjectAlignment {
  assertCoordinateSystemKnown(COORDINATE_SYSTEM, "alignment");

  let draft: BuildIntermediateInput;
  try {
    draft = normalizeCoordinate3dInput(input);
  } catch (error) {
    throw new BridgeProjectAdapterError(
      "BP_COORDINATE_UNKNOWN",
      `Failed to normalize alignment input: ${(error as Error).message}`,
    );
  }

  const supports = options.supportStationsM
    ? options.supportStationsM.map((station) => ({
        station,
        id: `S-${station}`,
        kind: "virtual_pier" as const,
      }))
    : collectSupportStations(draft);

  if (supports.length === 0) {
    throw new BridgeProjectAdapterError(
      BP_CODES.BRIDGE_EXTENT_MISSING,
      "No support stations found in the draft piers/spans and none provided via options.",
    );
  }

  supports.forEach((support) => assertFinite(support.station, `support ${support.id} station`));

  const supportStations = supports.map((support) => support.station);
  const bridgeStart = options.bridgeStartStationM ?? Math.min(...supportStations);
  const bridgeEnd = options.bridgeEndStationM ?? Math.max(...supportStations);
  assertFinite(bridgeStart, "bridgeStartStationM");
  assertFinite(bridgeEnd, "bridgeEndStationM");
  if (bridgeStart >= bridgeEnd) {
    throw new BridgeProjectAdapterError(
      BP_CODES.STATION_ORDER_INVALID,
      `bridgeStart ${bridgeStart} must be strictly less than bridgeEnd ${bridgeEnd}.`,
    );
  }

  const interval = options.sampleIntervalM ?? DEFAULT_SAMPLE_INTERVAL_M;
  assertFinite(interval, "sampleIntervalM");
  if (interval <= 0) {
    throw new BridgeProjectAdapterError(
      BP_CODES.STATION_ORDER_INVALID,
      `sampleIntervalM must be positive (got ${interval}).`,
    );
  }

  const supportById = new Map<number, string>();
  supports.forEach((support) => supportById.set(roundStation(support.station), support.id));

  const sampleStations = buildSampleStations(bridgeStart, bridgeEnd, interval, supportStations);
  const stations = sampleStations.map((station) =>
    sampleStation(draft, station, supportById, interval, bridgeStart, bridgeEnd),
  );

  const bridgeStartValue = bpConfirmed(bridgeStart, "m");
  const bridgeEndValue = bpConfirmed(bridgeEnd, "m");
  const bridgeLengthValue = bpDerived(
    bridgeEnd - bridgeStart,
    "m",
    "bridgeEndStation - bridgeStartStation",
    BRIDGE_PROJECT_ALIGNMENT_TOOL_ID,
  );
  assertBpValueShape(bridgeStartValue, "bridgeStartStationM");
  assertBpValueShape(bridgeEndValue, "bridgeEndStationM");
  assertBpValueShape(bridgeLengthValue, "bridgeLengthM");

  const alignmentId =
    options.alignmentId ?? draft.activeAlignmentId ?? draft.alignment?.id ?? "default";

  return {
    alignmentId,
    coordinateSystem: COORDINATE_SYSTEM,
    unitContext: UNIT_CONTEXT,
    bridgeStartStationM: bridgeStartValue,
    bridgeEndStationM: bridgeEndValue,
    bridgeLengthM: bridgeLengthValue,
    stations,
    sampledIntervalM: interval,
    generatedBy: BRIDGE_PROJECT_ALIGNMENT_TOOL_ID,
  };
}

/** Re-export the error type for consumers. */
export { BridgeProjectAdapterError };
