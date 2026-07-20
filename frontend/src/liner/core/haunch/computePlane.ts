import type { HaunchDefinitionDraft } from "../../schema/types";
import type { StationTableEntry } from "../types";
import {
  emitHaunchRow,
  filterLineIdsBySide,
  lateralOffsetForLine,
  resolveLineIdsForDefinition,
  resolveTopElevationAtAnchorStation,
  type HaunchComputeContext,
} from "./computeContext";
import type { HaunchResultRow } from "./types";

type PlaneDefinition = Extract<
  HaunchDefinitionDraft,
  { family: "plane"; variant: "one_point_two_gradients" }
>;

export function computePlane(
  definition: PlaneDefinition,
  stations: readonly StationTableEntry[],
  ctx: HaunchComputeContext,
  rows: HaunchResultRow[],
): void {
  const lineIds = filterLineIdsBySide(
    resolveLineIdsForDefinition(definition, ctx.alignments),
    definition.side,
    ctx.lineOffsetMap,
  );
  const referenceLineId =
    definition.referenceLineId
    ?? definition.anchor.lineId
    ?? lineIds[0]
    ?? "";
  const z0 = resolveTopElevationAtAnchorStation(ctx, definition.id, definition.anchor);
  if (z0 === null) {
    return;
  }
  const s0 = definition.anchor.stationPhysicalDistanceM;
  const d0 = definition.anchor.lateralOffsetM ?? 0;
  const gParallel = definition.longitudinalGradient;
  const gPerp = definition.transverseGradient;

  for (const station of stations) {
    for (const lineId of lineIds) {
      const d = lateralOffsetForLine(lineId, referenceLineId, ctx.lineOffsetMap) ?? 0;
      const zTop = z0 + gParallel * (station.physicalDistance - s0) + gPerp * (d - d0);
      emitHaunchRow(ctx, definition, station, lineId, zTop, rows);
    }
  }
}
