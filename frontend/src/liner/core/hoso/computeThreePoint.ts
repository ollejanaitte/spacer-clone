import type { HosoDefinitionDraft } from "../../schema/types";
import type { StationTableEntry } from "../types";
import { createHosoDiagnostic, LINER_HOSO_DIAGNOSTIC_CODES } from "./diagnostics";
import {
  anchorThicknessAtSd,
  areCollinearSd,
  checkMinThicknessBands,
  emitHosoRow,
  lateralOffsetForLine,
  resolveLineIdsForDefinition,
  resolveReferenceLineId,
  solveThicknessPlaneCoefficients,
  type HosoComputeContext,
} from "./computeContext";
import type { HosoResultRow } from "./types";

type ThreePointDefinition = Extract<HosoDefinitionDraft, { family: "three_point" }>;

export function computeThreePoint(
  definition: ThreePointDefinition,
  stations: readonly StationTableEntry[],
  ctx: HosoComputeContext,
  rows: HosoResultRow[],
): void {
  const lineIds = resolveLineIdsForDefinition(definition, ctx.alignments);
  const referenceLineId = resolveReferenceLineId(definition, lineIds);
  const anchorPoints = definition.anchors.map((anchor) =>
    anchorThicknessAtSd(ctx, definition, anchor, referenceLineId),
  );
  if (anchorPoints.some((point) => point === null)) {
    return;
  }
  const points = anchorPoints as { s: number; d: number; t: number }[];
  if (areCollinearSd(points)) {
    ctx.diagnostics.push(
      createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.collinearAnchors, {
        entityId: definition.id,
      }),
    );
    return;
  }
  const coeffs = solveThicknessPlaneCoefficients(points);
  if (!coeffs) {
    ctx.diagnostics.push(
      createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.degenerateGeometry, {
        entityId: definition.id,
      }),
    );
    return;
  }

  for (const station of stations) {
    for (const lineId of lineIds) {
      const d = lateralOffsetForLine(lineId, referenceLineId, ctx.lineOffsetMap) ?? 0;
      const s = station.physicalDistance;
      const thicknessM = coeffs.a * s + coeffs.b * d + coeffs.c;
      checkMinThicknessBands(ctx, definition, thicknessM, lineId, station);
      emitHosoRow(ctx, definition, station, lineId, d, thicknessM, rows);
    }
  }
}
