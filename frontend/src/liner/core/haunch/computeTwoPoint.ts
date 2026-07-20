import type { HaunchDefinitionDraft } from "../../schema/types";
import type { StationTableEntry } from "../types";
import { createHaunchDiagnostic, LINER_HAUNCH_DIAGNOSTIC_CODES } from "./diagnostics";
import {
  emitHaunchRow,
  evaluateLinearZ,
  filterLineIdsBySide,
  resolveLineIdsForDefinition,
  resolveTopElevationAtAnchorStation,
  type HaunchComputeContext,
} from "./computeContext";
import type { HaunchResultRow } from "./types";

type TwoPointDefinition = Extract<
  HaunchDefinitionDraft,
  { family: "two_point" }
>;

export function computeTwoPoint(
  definition: TwoPointDefinition,
  stations: readonly StationTableEntry[],
  ctx: HaunchComputeContext,
  rows: HaunchResultRow[],
): void {
  const lineIds = filterLineIdsBySide(
    resolveLineIdsForDefinition(definition, ctx.alignments),
    definition.side,
    ctx.lineOffsetMap,
  );

  if (definition.variant === "two_support_points") {
    const [anchor1, anchor2] = definition.anchors;
    const z1 = resolveTopElevationAtAnchorStation(ctx, definition.id, anchor1);
    const z2 = resolveTopElevationAtAnchorStation(ctx, definition.id, anchor2);
    if (z1 === null || z2 === null) {
      return;
    }
    const s1 = anchor1.stationPhysicalDistanceM;
    const s2 = anchor2.stationPhysicalDistanceM;
    for (const station of stations) {
      const zTop = evaluateLinearZ(s1, z1, s2, z2, station.physicalDistance);
      if (zTop === null) {
        ctx.diagnostics.push(
          createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.degenerateGeometry, {
            entityId: definition.id,
            physicalDistance: station.physicalDistance,
          }),
        );
        continue;
      }
      for (const lineId of lineIds) {
        emitHaunchRow(ctx, definition, station, lineId, zTop, rows);
      }
    }
    return;
  }

  const z0 = resolveTopElevationAtAnchorStation(ctx, definition.id, definition.anchor);
  if (z0 === null) {
    return;
  }
  const s0 = definition.anchor.stationPhysicalDistanceM;
  const gradient = definition.longitudinalGradient;
  for (const station of stations) {
    const zTop = z0 + gradient * (station.physicalDistance - s0);
    for (const lineId of lineIds) {
      emitHaunchRow(ctx, definition, station, lineId, zTop, rows);
    }
  }
}
