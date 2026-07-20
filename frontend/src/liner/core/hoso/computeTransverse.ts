import type { HosoDefinitionDraft } from "../../schema/types";
import type { StationTableEntry } from "../types";
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

type TransverseDefinition = Extract<HosoDefinitionDraft, { family: "transverse" }>;

export function computeTransverse(
  definition: TransverseDefinition,
  stations: readonly StationTableEntry[],
  ctx: HosoComputeContext,
  rows: HosoResultRow[],
): void {
  const lineIds = resolveLineIdsForDefinition(definition, ctx.alignments);
  const referenceLineId =
    definition.referenceLineId ?? resolveReferenceLineId(definition, lineIds);
  const [anchor1, anchor2] = definition.anchors;
  const p1 = anchorThicknessAtSd(ctx, definition, anchor1, referenceLineId);
  const p2 = anchorThicknessAtSd(ctx, definition, anchor2, referenceLineId);
  if (!p1 || !p2) {
    return;
  }

  for (const station of stations) {
    for (const lineId of lineIds) {
      const d = lateralOffsetForLine(lineId, referenceLineId, ctx.lineOffsetMap);
      if (d === null) {
        ctx.diagnostics.push(
          createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.crossfallUnavailable, {
            entityId: definition.id,
            physicalDistance: station.physicalDistance,
            entityPath: lineId,
          }),
        );
        continue;
      }
      const thicknessM = evaluateLinearValue(p1.d, p1.t, p2.d, p2.t, d);
      if (thicknessM === null) {
        continue;
      }
      emitHosoRow(ctx, definition, station, lineId, d, thicknessM, rows);
    }
  }
}
