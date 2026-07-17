import type { LdistJobDraft } from "../../schema/types";
import type { PierResult, SectionSliceResult } from "../types";
import { distancePointToPierLine } from "../bridge/pierLineGeometry";
import { DEFAULT_TOLERANCES } from "../tolerances";
import {
  intersectLineWithSection,
  resolveAlignmentAzimuth,
  type LineOffsetEntry,
} from "./sectionLineIntersection";

export interface OverhangSideResult {
  overhangM: number;
  side: "left" | "right";
  pierId: string;
}

export function findPiersAtStation(
  piers: readonly PierResult[],
  physicalDistance: number,
): PierResult[] {
  return piers.filter(
    (pier) => Math.abs(pier.physicalDistance - physicalDistance) <= DEFAULT_TOLERANCES.station,
  );
}

export function resolvePierForJob(
  job: LdistJobDraft,
  piersAtStation: readonly PierResult[],
): PierResult | "missing_id" | "invalid_id" | null {
  if (piersAtStation.length === 0) {
    return null;
  }
  if (piersAtStation.length === 1) {
    if (job.pierId && job.pierId !== piersAtStation[0]!.id) {
      return "invalid_id";
    }
    return piersAtStation[0]!;
  }
  if (!job.pierId) {
    return "missing_id";
  }
  const match = piersAtStation.find((pier) => pier.id === job.pierId);
  return match ?? "invalid_id";
}

export function computeOverhangAtStation(
  job: LdistJobDraft,
  pier: PierResult,
  section: SectionSliceResult,
  lineOffsetMap: ReadonlyMap<string, LineOffsetEntry>,
  sampledPoints: readonly { physicalDistance: number; x: number; y: number; azimuth: number }[],
): OverhangSideResult[] {
  const results: OverhangSideResult[] = [];
  const alignmentSample = sampledPoints.find(
    (point) => Math.abs(point.physicalDistance - pier.physicalDistance) <= DEFAULT_TOLERANCES.station,
  );
  if (!alignmentSample) {
    return results;
  }
  const anchor = { x: alignmentSample.x, y: alignmentSample.y };
  const sides: Array<{ side: "left" | "right"; lineId?: string }> = [
    { side: "left", lineId: job.leftLineId },
    { side: "right", lineId: job.rightLineId },
  ];
  for (const entry of sides) {
    if (!entry.lineId) {
      continue;
    }
    const intersection = intersectLineWithSection(entry.lineId, section, lineOffsetMap);
    if (!intersection) {
      continue;
    }
    const overhangM = distancePointToPierLine(
      intersection,
      anchor,
      alignmentSample.azimuth,
      pier.skewAngleRad,
    );
    results.push({
      overhangM,
      side: entry.side,
      pierId: pier.id,
    });
  }
  return results;
}
