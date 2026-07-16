import { createIssue, LINER_DIAGNOSTIC_CODES, hasFatalIssues } from "../diagnostics";
import { displayedStationAtPhysicalDistance } from "../station/stationRules";
import { DEFAULT_TOLERANCES } from "../tolerances";
import type {
  GridPointPreparation,
  PierResult,
  SpanResult,
  StationDefinition,
  ValidationIssue,
} from "../types";
import { normalizeSkewAngleRad } from "./pierLineGeometry";
import type { PierDraft, SpanDraft } from "../../schema/types";

export type BridgeLayoutEvaluationInput = {
  spans: readonly SpanDraft[];
  piers: readonly PierDraft[];
  alignmentTotalLength: number;
  stationDefinition: StationDefinition;
  gridPoints: readonly GridPointPreparation[];
};

export type BridgeLayoutEvaluationResult = {
  spans: SpanResult[];
  piers: PierResult[];
  issues: ValidationIssue[];
};

function nearlyEqualStation(left: number, right: number): boolean {
  return Math.abs(left - right) <= DEFAULT_TOLERANCES.station;
}

function sortedSpans(spans: readonly SpanDraft[]): SpanDraft[] {
  return [...spans].sort((left, right) => {
    if (left.startPhysicalDistance !== right.startPhysicalDistance) {
      return left.startPhysicalDistance - right.startPhysicalDistance;
    }
    return left.id.localeCompare(right.id);
  });
}

function sortedPiers(piers: readonly PierDraft[]): PierDraft[] {
  return [...piers].sort((left, right) => {
    if (left.physicalDistance !== right.physicalDistance) {
      return left.physicalDistance - right.physicalDistance;
    }
    return left.id.localeCompare(right.id);
  });
}

function validateDuplicateIds(
  spans: readonly SpanDraft[],
  piers: readonly PierDraft[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const spanIds = new Set<string>();
  for (const span of spans) {
    if (spanIds.has(span.id)) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.spanDuplicateId, {
          entityType: "span",
          entityId: span.id,
        }),
      );
    }
    spanIds.add(span.id);
  }

  const pierIds = new Set<string>();
  for (const pier of piers) {
    if (pierIds.has(pier.id)) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.pierDuplicateId, {
          entityType: "pier",
          entityId: pier.id,
        }),
      );
    }
    pierIds.add(pier.id);
  }
  return issues;
}

function validateSpanRanges(
  spans: readonly SpanDraft[],
  alignmentTotalLength: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const tolerance = DEFAULT_TOLERANCES.station;

  for (const span of spans) {
    if (span.startPhysicalDistance < -tolerance) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.spanStartNegative, {
          entityType: "span",
          entityId: span.id,
          physicalDistance: span.startPhysicalDistance,
        }),
      );
    }
    if (span.endPhysicalDistance > alignmentTotalLength + tolerance) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.spanEndExceedsAlignment, {
          entityType: "span",
          entityId: span.id,
          physicalDistance: span.endPhysicalDistance,
        }),
      );
    }
    if (span.startPhysicalDistance > span.endPhysicalDistance + tolerance) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.spanReversed, {
          entityType: "span",
          entityId: span.id,
          physicalDistance: span.startPhysicalDistance,
        }),
      );
    }
  }
  return issues;
}

function validatePierRanges(
  piers: readonly PierDraft[],
  alignmentTotalLength: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const tolerance = DEFAULT_TOLERANCES.station;

  for (const pier of piers) {
    if (
      pier.physicalDistance < -tolerance
      || pier.physicalDistance > alignmentTotalLength + tolerance
    ) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.stationOutOfRange, {
          entityType: "pier",
          entityId: pier.id,
          physicalDistance: pier.physicalDistance,
        }),
      );
    }
  }
  return issues;
}

function validateSpanPierReferences(
  spans: readonly SpanDraft[],
  pierIds: ReadonlySet<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const span of spans) {
    for (const [field, pierId] of [
      ["pierIdStart", span.pierIdStart],
      ["pierIdEnd", span.pierIdEnd],
    ] as const) {
      if (pierId === undefined) {
        continue;
      }
      if (!pierIds.has(pierId)) {
        issues.push(
          createIssue("error", LINER_DIAGNOSTIC_CODES.spanPierReferenceMissing, {
            entityType: "span",
            entityId: span.id,
            field,
            detail: pierId,
          }),
        );
      }
    }
  }
  return issues;
}

function validateBearingOffsets(piers: readonly PierDraft[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const pier of piers) {
    const offsets = pier.bearingOffsets ?? [];
    const seen = new Set<number>();
    for (const bearing of offsets) {
      if (!Number.isFinite(bearing.offset)) {
        issues.push(
          createIssue("error", LINER_DIAGNOSTIC_CODES.pierBearingOffsetInvalid, {
            entityType: "pier",
            entityId: pier.id,
            field: "bearingOffsets",
          }),
        );
        continue;
      }
      if (seen.has(bearing.transverseIndex)) {
        issues.push(
          createIssue("error", LINER_DIAGNOSTIC_CODES.pierBearingOffsetDuplicateIndex, {
            entityType: "pier",
            entityId: pier.id,
            field: "bearingOffsets",
          }),
        );
      }
      seen.add(bearing.transverseIndex);
    }
  }
  return issues;
}

export function validateBridgeLayout(input: BridgeLayoutEvaluationInput): ValidationIssue[] {
  const pierIds = new Set(input.piers.map((pier) => pier.id));
  return [
    ...validateDuplicateIds(input.spans, input.piers),
    ...validateSpanRanges(input.spans, input.alignmentTotalLength),
    ...validatePierRanges(input.piers, input.alignmentTotalLength),
    ...validateSpanPierReferences(input.spans, pierIds),
    ...validateBearingOffsets(input.piers),
  ];
}

function resolveSupportLinePointIds(
  pier: PierDraft,
  gridPoints: readonly GridPointPreparation[],
): string[] {
  const stationMatches = gridPoints.filter((point) =>
    nearlyEqualStation(point.physicalDistance, pier.physicalDistance),
  );
  if (stationMatches.length === 0) {
    return [];
  }

  const bearingOffsets = pier.bearingOffsets ?? [];
  if (bearingOffsets.length === 0) {
    return [...stationMatches]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((point) => point.id);
  }

  const matched = stationMatches.filter((point) =>
    bearingOffsets.some(
      (bearing) => Math.abs(point.offset - bearing.offset) <= DEFAULT_TOLERANCES.offset,
    ),
  );
  return [...matched]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((point) => point.id);
}

function buildSpanResults(
  spans: readonly SpanDraft[],
  stationDefinition: StationDefinition,
): SpanResult[] {
  return sortedSpans(spans).map((span) => ({
    id: span.id,
    startPhysicalDistance: span.startPhysicalDistance,
    endPhysicalDistance: span.endPhysicalDistance,
    startDisplayedStation: displayedStationAtPhysicalDistance(
      span.startPhysicalDistance,
      stationDefinition,
      span.startPhysicalDistance > 0,
    ),
    endDisplayedStation: displayedStationAtPhysicalDistance(
      span.endPhysicalDistance,
      stationDefinition,
    ),
    ...(span.pierIdStart !== undefined ? { pierIdStart: span.pierIdStart } : {}),
    ...(span.pierIdEnd !== undefined ? { pierIdEnd: span.pierIdEnd } : {}),
  }));
}

function buildPierResults(
  piers: readonly PierDraft[],
  stationDefinition: StationDefinition,
  gridPoints: readonly GridPointPreparation[],
): PierResult[] {
  return sortedPiers(piers).map((pier) => {
    const displayedStation = displayedStationAtPhysicalDistance(
      pier.physicalDistance,
      stationDefinition,
      pier.physicalDistance > 0,
    );
    const skewAngleRad = normalizeSkewAngleRad(pier.skewAngleRad ?? 0);

    return {
      id: pier.id,
      physicalDistance: pier.physicalDistance,
      displayedStation,
      skewAngleRad,
      ...(pier.bearingOffsets !== undefined && pier.bearingOffsets.length > 0
        ? {
            bearingOffsets: [...pier.bearingOffsets].sort(
              (left, right) => left.transverseIndex - right.transverseIndex,
            ),
          }
        : {}),
      supportLinePointIds: resolveSupportLinePointIds(pier, gridPoints),
    };
  });
}

export function evaluateBridgeLayout(
  input: BridgeLayoutEvaluationInput,
): BridgeLayoutEvaluationResult {
  const issues = validateBridgeLayout(input);
  if (hasFatalIssues(issues)) {
    return { spans: [], piers: [], issues };
  }

  if (input.spans.length === 0 && input.piers.length === 0) {
    return { spans: [], piers: [], issues };
  }

  return {
    spans: buildSpanResults(input.spans, input.stationDefinition),
    piers: buildPierResults(input.piers, input.stationDefinition, input.gridPoints),
    issues,
  };
}
