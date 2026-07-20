import type {
  AlignmentBundleDraft,
  CrossSectionTemplateDraft,
  CrossSlopeIntervalDraft,
  HosoAnchorDraft,
  HosoDefinitionDraft,
} from "../../schema/types";
import type { ComputationDiagnostic, SectionSliceResult, StationTableEntry } from "../types";
import { DEFAULT_TOLERANCES } from "../tolerances";
import {
  buildLineOffsetMap,
  findSectionPointForLine,
  type LineOffsetEntry,
} from "../ldist/sectionLineIntersection";
import {
  createHosoDiagnostic,
  LINER_HOSO_DIAGNOSTIC_CODES,
} from "./diagnostics";
import {
  resolveReferenceElevation,
} from "./referenceResolution";
import { HOSO_ALGORITHM_VERSION, type HosoResultRow } from "./types";
import type { CanonicalLinerIntermediateResult } from "../types";

export interface HosoComputeContext {
  intermediate: CanonicalLinerIntermediateResult;
  lineOffsetMap: ReadonlyMap<string, LineOffsetEntry>;
  alignments: readonly AlignmentBundleDraft[];
  crossSectionTemplate: CrossSectionTemplateDraft | undefined;
  crossSlopeIntervals: readonly CrossSlopeIntervalDraft[] | undefined;
  sourceRevision: string;
  diagnostics: ComputationDiagnostic[];
}

export function buildHosoLineOffsetMap(
  alignments: readonly AlignmentBundleDraft[],
): ReadonlyMap<string, LineOffsetEntry> {
  return buildLineOffsetMap(alignments);
}

export function resolveLineIdsForDefinition(
  definition: HosoDefinitionDraft,
  alignments: readonly AlignmentBundleDraft[],
): string[] {
  if (definition.offsetBands?.length) {
    const lineIds = new Set<string>();
    for (const band of definition.offsetBands) {
      lineIds.add(band.upperLineId);
      lineIds.add(band.lowerLineId);
    }
    return [...lineIds];
  }
  const bundle = alignments.find((entry) => entry.id === definition.alignmentId);
  if (!bundle) {
    return [];
  }
  const lineIds: string[] = [];
  for (const template of bundle.crossSections) {
    for (const line of template.offsetLines) {
      lineIds.push(line.id);
    }
  }
  return lineIds;
}

export function lateralOffsetForLine(
  lineId: string,
  referenceLineId: string,
  lineOffsetMap: ReadonlyMap<string, LineOffsetEntry>,
): number | null {
  const lineOffset = lineOffsetMap.get(lineId)?.offset;
  const refOffset = lineOffsetMap.get(referenceLineId)?.offset;
  if (lineOffset === undefined || refOffset === undefined) {
    return null;
  }
  return lineOffset - refOffset;
}

export function findSectionAtStation(
  sections: readonly SectionSliceResult[],
  physicalDistance: number,
): SectionSliceResult | null {
  const match = sections.find(
    (section) => Math.abs(section.physicalDistance - physicalDistance) <= DEFAULT_TOLERANCES.station,
  );
  return match ?? null;
}

export function evaluateLinearValue(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
): number | null {
  if (Math.abs(x2 - x1) <= DEFAULT_TOLERANCES.length) {
    return null;
  }
  return y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
}

export function solveThicknessPlaneCoefficients(
  points: { s: number; d: number; t: number }[],
): { a: number; b: number; c: number } | null {
  if (points.length !== 3) {
    return null;
  }
  const [p1, p2, p3] = points;
  const det =
    p1.s * (p2.d - p3.d)
    + p2.s * (p3.d - p1.d)
    + p3.s * (p1.d - p2.d);
  if (Math.abs(det) <= DEFAULT_TOLERANCES.length) {
    return null;
  }
  const a =
    (
      p1.t * (p2.d - p3.d)
      + p2.t * (p3.d - p1.d)
      + p3.t * (p1.d - p2.d)
    ) / det;
  const b =
    (
      p1.t * (p3.s - p2.s)
      + p2.t * (p1.s - p3.s)
      + p3.t * (p2.s - p1.s)
    ) / det;
  const c =
    (
      p1.t * (p2.s * p3.d - p3.s * p2.d)
      + p2.t * (p3.s * p1.d - p1.s * p3.d)
      + p3.t * (p1.s * p2.d - p2.s * p1.d)
    ) / det;
  return { a, b, c };
}

export function areCollinearSd(points: { s: number; d: number }[]): boolean {
  if (points.length < 3) {
    return false;
  }
  const [p1, p2, p3] = points;
  const area2 = Math.abs(
    (p2.s - p1.s) * (p3.d - p1.d) - (p3.s - p1.s) * (p2.d - p1.d),
  );
  return area2 <= DEFAULT_TOLERANCES.length;
}

export function resolveAnchorSd(
  ctx: HosoComputeContext,
  definitionId: string,
  anchor: HosoAnchorDraft,
  referenceLineId: string,
): { s: number; d: number } | null {
  const s = anchor.stationPhysicalDistanceM;
  if (anchor.lateralOffsetM !== undefined) {
    return { s, d: anchor.lateralOffsetM };
  }
  const lineId = anchor.lineId ?? referenceLineId;
  const section = findSectionAtStation(ctx.intermediate.sections, s);
  if (!section) {
    ctx.diagnostics.push(
      createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.degenerateGeometry, {
        entityId: definitionId,
        physicalDistance: s,
      }),
    );
    return null;
  }
  const point = findSectionPointForLine(section, lineId, ctx.lineOffsetMap);
  if (!point) {
    ctx.diagnostics.push(
      createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.lineOutOfRange, {
        entityId: definitionId,
        physicalDistance: s,
        entityPath: lineId,
      }),
    );
    return null;
  }
  const d = lateralOffsetForLine(lineId, referenceLineId, ctx.lineOffsetMap);
  if (d === null) {
    ctx.diagnostics.push(
      createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.invalidReference, {
        entityId: definitionId,
        entityPath: lineId,
      }),
    );
    return null;
  }
  return { s, d };
}

export function emitHosoRow(
  ctx: HosoComputeContext,
  definition: HosoDefinitionDraft,
  station: StationTableEntry,
  lineId: string | undefined,
  lateralOffsetM: number,
  thicknessM: number,
  rows: HosoResultRow[],
): void {
  if (thicknessM < -DEFAULT_TOLERANCES.elevation) {
    ctx.diagnostics.push(
      createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.negativeThickness, {
        entityId: definition.id,
        physicalDistance: station.physicalDistance,
        entityPath: lineId,
      }),
    );
    return;
  }
  const zRef = resolveReferenceElevation(
    station.physicalDistance,
    station.displayedStation,
    lateralOffsetM,
    ctx.intermediate,
    ctx.crossSectionTemplate,
    ctx.crossSlopeIntervals,
  );
  if (zRef === null) {
    ctx.diagnostics.push(
      createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.profileUnavailable, {
        entityId: definition.id,
        physicalDistance: station.physicalDistance,
      }),
    );
    return;
  }
  const zPavement = zRef + thicknessM;
  rows.push({
    definitionId: definition.id,
    type: definition.family,
    stationPhysicalDistance: station.physicalDistance,
    displayedStation: station.displayedStation,
    offsetM: lateralOffsetM,
    pavementThicknessM: thicknessM,
    pavementElevationM: zPavement,
    lineId,
    sourceRevision: ctx.sourceRevision,
    algorithmVersion: HOSO_ALGORITHM_VERSION,
  });
}

export function checkMinThicknessBands(
  ctx: HosoComputeContext,
  definition: HosoDefinitionDraft,
  thicknessM: number,
  lineId: string,
  station: StationTableEntry,
): void {
  if (!definition.offsetBands?.length) {
    return;
  }
  for (const band of definition.offsetBands) {
    if (
      (lineId === band.upperLineId || lineId === band.lowerLineId)
      && band.minPavementThicknessM !== undefined
      && thicknessM + DEFAULT_TOLERANCES.elevation < band.minPavementThicknessM
    ) {
      ctx.diagnostics.push(
        createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.minThickness, {
          entityId: definition.id,
          physicalDistance: station.physicalDistance,
          entityPath: band.id,
        }),
      );
    }
  }
}

export function resolveReferenceLineId(
  definition: HosoDefinitionDraft,
  lineIds: readonly string[],
): string {
  return definition.referenceLineId ?? lineIds[0] ?? "";
}

export function anchorThicknessAtSd(
  ctx: HosoComputeContext,
  definition: HosoDefinitionDraft,
  anchor: HosoAnchorDraft,
  referenceLineId: string,
): { s: number; d: number; t: number } | null {
  const sd = resolveAnchorSd(ctx, definition.id, anchor, referenceLineId);
  if (!sd) {
    return null;
  }
  return { ...sd, t: anchor.thicknessM };
}

export function resolveCrossSectionLineElevation(lineId: string, template: CrossSectionTemplateDraft | undefined): number | null {
  const line = template?.offsetLines.find((entry) => entry.id === lineId);
  if (!line) {
    return null;
  }
  return line.elevation;
}

export { resolveProfileElevationAt, pavementElevationFromThickness } from "./referenceResolution";
