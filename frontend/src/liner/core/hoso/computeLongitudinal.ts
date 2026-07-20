import type { HosoDefinitionDraft } from "../../schema/types";
import type { StationTableEntry } from "../types";
import {
  emitHosoRow,
  evaluateLinearValue,
  lateralOffsetForLine,
  pavementElevationFromThickness,
  resolveLineIdsForDefinition,
  resolveReferenceLineId,
  type HosoComputeContext,
} from "./computeContext";
import { resolveReferenceElevation } from "./referenceResolution";
import type { HosoResultRow } from "./types";

type LongitudinalDefinition = Extract<HosoDefinitionDraft, { family: "longitudinal" }>;

export function computeLongitudinal(
  definition: LongitudinalDefinition,
  stations: readonly StationTableEntry[],
  ctx: HosoComputeContext,
  rows: HosoResultRow[],
): void {
  const lineIds = resolveLineIdsForDefinition(definition, ctx.alignments);
  const referenceLineId = resolveReferenceLineId(definition, lineIds);

  if (definition.variant === "longitudinal_only") {
    const [anchor1, anchor2] = definition.anchors;
    const s1 = anchor1.stationPhysicalDistanceM;
    const s2 = anchor2.stationPhysicalDistanceM;
    const t1 = anchor1.thicknessM;
    const t2 = anchor2.thicknessM;
    for (const station of stations) {
      const thicknessM = evaluateLinearValue(s1, t1, s2, t2, station.physicalDistance);
      if (thicknessM === null) {
        continue;
      }
      for (const lineId of lineIds) {
        const lateralOffsetM =
          lateralOffsetForLine(lineId, referenceLineId, ctx.lineOffsetMap) ?? 0;
        emitHosoRow(ctx, definition, station, lineId, lateralOffsetM, thicknessM, rows);
      }
    }
    return;
  }

  const anchor = definition.anchor;
  const s0 = anchor.stationPhysicalDistanceM;
  const d0 = anchor.lateralOffsetM ?? 0;
  const z0 = pavementElevationFromThickness(
    anchor.thicknessM,
    s0,
    s0,
    d0,
    ctx.intermediate,
    ctx.crossSectionTemplate,
    ctx.crossSlopeIntervals,
  );
  if (z0 === null) {
    return;
  }
  const gParallel = definition.longitudinalGradient;
  const gPerp = definition.transverseGradient;
  const refLineId = definition.referenceLineId ?? referenceLineId;

  for (const station of stations) {
    for (const lineId of lineIds) {
      const d = lateralOffsetForLine(lineId, refLineId, ctx.lineOffsetMap) ?? 0;
      const zPavement =
        z0 + gParallel * (station.physicalDistance - s0) + gPerp * (d - d0);
      const zRef = resolveReferenceElevation(
        station.physicalDistance,
        station.displayedStation,
        d,
        ctx.intermediate,
        ctx.crossSectionTemplate,
        ctx.crossSlopeIntervals,
      );
      if (zRef === null) {
        continue;
      }
      const thicknessM = zPavement - zRef;
      emitHosoRow(ctx, definition, station, lineId, d, thicknessM, rows);
    }
  }
}
