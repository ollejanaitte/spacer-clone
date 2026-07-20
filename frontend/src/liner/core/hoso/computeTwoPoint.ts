import type { HosoDefinitionDraft } from "../../schema/types";
import type { StationTableEntry } from "../types";
import { DEFAULT_TOLERANCES } from "../tolerances";
import { createHosoDiagnostic, LINER_HOSO_DIAGNOSTIC_CODES } from "./diagnostics";
import {
  anchorThicknessAtSd,
  emitHosoRow,
  evaluateLinearValue,
  lateralOffsetForLine,
  resolveLineIdsForDefinition,
  resolveReferenceLineId,
  type HosoComputeContext,
} from "./computeContext";
import type { HosoResultRow } from "./types";

type TwoPointDefinition = Extract<HosoDefinitionDraft, { family: "two_point" }>;

export function computeTwoPoint(
  definition: TwoPointDefinition,
  stations: readonly StationTableEntry[],
  ctx: HosoComputeContext,
  rows: HosoResultRow[],
): void {
  const lineIds = resolveLineIdsForDefinition(definition, ctx.alignments);
  const referenceLineId = resolveReferenceLineId(definition, lineIds);
  const [anchor1, anchor2] = definition.anchors;
  const p1 = anchorThicknessAtSd(ctx, definition, anchor1, referenceLineId);
  const p2 = anchorThicknessAtSd(ctx, definition, anchor2, referenceLineId);
  if (!p1 || !p2) {
    return;
  }

  const chordLength = Math.hypot(p2.s - p1.s, p2.d - p1.d);
  if (chordLength <= DEFAULT_TOLERANCES.length) {
    ctx.diagnostics.push(
      createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.degenerateGeometry, {
        entityId: definition.id,
        entityPath: "anchors",
      }),
    );
    return;
  }

  for (const station of stations) {
    for (const lineId of lineIds) {
      const d = lateralOffsetForLine(lineId, referenceLineId, ctx.lineOffsetMap) ?? 0;
      const s = station.physicalDistance;
      const lambda =
        ((s - p1.s) * (p2.s - p1.s) + (d - p1.d) * (p2.d - p1.d)) / (chordLength * chordLength);
      const clampedLambda = Math.max(0, Math.min(1, lambda));
      const thicknessM = evaluateLinearValue(0, p1.t, 1, p2.t, clampedLambda);
      if (thicknessM === null) {
        continue;
      }
      emitHosoRow(ctx, definition, station, lineId, d, thicknessM, rows);
    }
  }
}
