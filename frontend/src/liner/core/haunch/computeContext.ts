import type { AlignmentBundleDraft, HaunchAnchorDraft, HaunchDefinitionDraft, HaunchSide } from "../../schema/types";
import type { ComputationDiagnostic, SectionSliceResult, StationTableEntry } from "../types";
import { DEFAULT_TOLERANCES } from "../tolerances";
import type { LineOffsetEntry } from "../ldist/sectionLineIntersection";
import {
  createHaunchDiagnostic,
  LINER_HAUNCH_DIAGNOSTIC_CODES,
} from "./diagnostics";
import {
  findSectionAtStation,
  intersectGirderAtSection,
  resolveAnchorTopElevation,
  resolveLateralOffsetM,
  resolveProfileElevationAt,
} from "./anchorResolution";
import { HAUNCH_ALGORITHM_VERSION, type HaunchResultRow } from "./types";
import type { CanonicalLinerIntermediateResult } from "../types";

export interface HaunchComputeContext {
  intermediate: CanonicalLinerIntermediateResult;
  lineOffsetMap: ReadonlyMap<string, LineOffsetEntry>;
  alignments: readonly AlignmentBundleDraft[];
  sourceRevision: string;
  diagnostics: ComputationDiagnostic[];
}

export function resolveLineIdsForDefinition(
  definition: HaunchDefinitionDraft,
  alignments: readonly AlignmentBundleDraft[],
): string[] {
  if (definition.lineIds?.length) {
    return [...definition.lineIds];
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

export function filterLineIdsBySide(
  lineIds: readonly string[],
  side: HaunchSide | undefined,
  lineOffsetMap: ReadonlyMap<string, LineOffsetEntry>,
): string[] {
  if (!side || side === "both") {
    return [...lineIds];
  }
  return lineIds.filter((lineId) => {
    const offset = lineOffsetMap.get(lineId)?.offset;
    if (offset === undefined) {
      return false;
    }
    if (side === "left") {
      return offset < -DEFAULT_TOLERANCES.offset;
    }
    return offset > DEFAULT_TOLERANCES.offset;
  });
}

export function resolveSideForLine(
  lineId: string,
  lineOffsetMap: ReadonlyMap<string, LineOffsetEntry>,
): HaunchSide | undefined {
  const offset = lineOffsetMap.get(lineId)?.offset;
  if (offset === undefined) {
    return undefined;
  }
  if (offset < -DEFAULT_TOLERANCES.offset) {
    return "left";
  }
  if (offset > DEFAULT_TOLERANCES.offset) {
    return "right";
  }
  return undefined;
}

export function emitHaunchRow(
  ctx: HaunchComputeContext,
  definition: HaunchDefinitionDraft,
  station: StationTableEntry,
  lineId: string | undefined,
  zTop: number,
  rows: HaunchResultRow[],
): void {
  const zRef = resolveProfileElevationAt(station.physicalDistance, ctx.intermediate);
  if (zRef === null) {
    ctx.diagnostics.push(
      createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.profileUnavailable, {
        entityId: definition.id,
        physicalDistance: station.physicalDistance,
      }),
    );
    return;
  }
  const thickness = zTop - zRef;
  if (thickness < -DEFAULT_TOLERANCES.elevation) {
    ctx.diagnostics.push(
      createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.negativeThickness, {
        entityId: definition.id,
        physicalDistance: station.physicalDistance,
        entityPath: lineId,
      }),
    );
    return;
  }
  rows.push({
    definitionId: definition.id,
    type: definition.family,
    stationPhysicalDistance: station.physicalDistance,
    displayedStation: station.displayedStation,
    haunchTopElevationM: zTop,
    haunchThicknessM: thickness,
    side: lineId ? resolveSideForLine(lineId, ctx.lineOffsetMap) : definition.side,
    lineId,
    sourceRevision: ctx.sourceRevision,
    algorithmVersion: HAUNCH_ALGORITHM_VERSION,
  });
}

export function resolveTopElevationAtAnchorStation(
  ctx: HaunchComputeContext,
  definitionId: string,
  anchor: HaunchAnchorDraft,
): number | null {
  const zRef = resolveProfileElevationAt(anchor.stationPhysicalDistanceM, ctx.intermediate);
  if (zRef === null) {
    ctx.diagnostics.push(
      createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.profileUnavailable, {
        entityId: definitionId,
        physicalDistance: anchor.stationPhysicalDistanceM,
      }),
    );
    return null;
  }
  return resolveAnchorTopElevation(anchor, zRef);
}

export function evaluateLinearZ(
  s1: number,
  z1: number,
  s2: number,
  z2: number,
  station: number,
): number | null {
  if (Math.abs(s2 - s1) <= DEFAULT_TOLERANCES.station) {
    return null;
  }
  return z1 + ((station - s1) / (s2 - s1)) * (z2 - z1);
}

export function sectionForStation(
  ctx: HaunchComputeContext,
  station: number,
): SectionSliceResult | null {
  return findSectionAtStation(ctx.intermediate.sections, station);
}

export function solvePlaneCoefficients(
  points: { x: number; y: number; z: number }[],
): { a: number; b: number; c: number } | null {
  if (points.length !== 3) {
    return null;
  }
  const [p1, p2, p3] = points;
  const det =
    p1.x * (p2.y - p3.y)
    + p2.x * (p3.y - p1.y)
    + p3.x * (p1.y - p2.y);
  if (Math.abs(det) <= DEFAULT_TOLERANCES.length) {
    return null;
  }
  const a =
    (
      p1.z * (p2.y - p3.y)
      + p2.z * (p3.y - p1.y)
      + p3.z * (p1.y - p2.y)
    ) / det;
  const b =
    (
      p1.z * (p3.x - p2.x)
      + p2.z * (p1.x - p3.x)
      + p3.z * (p2.x - p1.x)
    ) / det;
  const c =
    (
      p1.z * (p2.x * p3.y - p3.x * p2.y)
      + p2.z * (p3.x * p1.y - p1.x * p3.y)
      + p3.z * (p1.x * p2.y - p2.x * p1.y)
    ) / det;
  return { a, b, c };
}

export function areCollinear(
  points: { x: number; y: number }[],
): boolean {
  if (points.length < 3) {
    return false;
  }
  const [p1, p2, p3] = points;
  const area2 = Math.abs(
    (p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y),
  );
  return area2 <= DEFAULT_TOLERANCES.length;
}

export function solveQuadraticCoefficients(
  points: { u: number; z: number }[],
): { a: number; b: number; c: number } | null {
  if (points.length !== 3) {
    return null;
  }
  const [p1, p2, p3] = points;
  const det =
    p1.u * p1.u * (p2.u - p3.u)
    + p2.u * p2.u * (p3.u - p1.u)
    + p3.u * p3.u * (p1.u - p2.u);
  if (Math.abs(det) <= DEFAULT_TOLERANCES.length) {
    return null;
  }
  const a =
    (
      p1.z * (p2.u - p3.u)
      + p2.z * (p3.u - p1.u)
      + p3.z * (p1.u - p2.u)
    ) / det;
  const b =
    (
      p1.u * p1.u * (p2.z - p3.z)
      + p2.u * p2.u * (p3.z - p1.z)
      + p3.u * p3.u * (p1.z - p2.z)
    ) / det;
  const c =
    (
      p1.z * p2.u * p3.u * (p2.u - p3.u)
      + p2.z * p3.u * p1.u * (p3.u - p1.u)
      + p3.z * p1.u * p2.u * (p1.u - p2.u)
    ) / det;
  return { a, b, c };
}

export function planPointForAnchor(
  ctx: HaunchComputeContext,
  definitionId: string,
  anchor: { stationPhysicalDistanceM: number; lineId?: string; lateralOffsetM?: number },
  defaultLineId: string,
): { x: number; y: number } | null {
  const section = sectionForStation(ctx, anchor.stationPhysicalDistanceM);
  if (!section) {
    ctx.diagnostics.push(
      createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.degenerateGeometry, {
        entityId: definitionId,
        physicalDistance: anchor.stationPhysicalDistanceM,
      }),
    );
    return null;
  }
  const lineId = anchor.lineId ?? defaultLineId;
  const point = intersectGirderAtSection(lineId, section, ctx.lineOffsetMap);
  if (!point) {
    ctx.diagnostics.push(
      createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.degenerateGeometry, {
        entityId: definitionId,
        physicalDistance: anchor.stationPhysicalDistanceM,
        entityPath: lineId,
      }),
    );
    return null;
  }
  if (anchor.lateralOffsetM !== undefined && Math.abs(anchor.lateralOffsetM) > DEFAULT_TOLERANCES.length) {
    return point;
  }
  return point;
}

export function lateralOffsetForLine(
  lineId: string,
  referenceLineId: string,
  lineOffsetMap: ReadonlyMap<string, LineOffsetEntry>,
): number | null {
  const lineOffset = resolveLateralOffsetM(lineId, lineOffsetMap);
  const refOffset = resolveLateralOffsetM(referenceLineId, lineOffsetMap);
  if (lineOffset === null || refOffset === null) {
    return null;
  }
  return lineOffset - refOffset;
}
