import type { HosoDefinitionDraft } from "../../schema/types";
import type { StationTableEntry } from "../types";
import { DEFAULT_TOLERANCES } from "../tolerances";
import { createHosoDiagnostic, LINER_HOSO_DIAGNOSTIC_CODES } from "./diagnostics";
import {
  emitHosoRow,
  lateralOffsetForLine,
  resolveCrossSectionLineElevation,
  resolveLineIdsForDefinition,
  resolveReferenceLineId,
  type HosoComputeContext,
} from "./computeContext";
import type { HosoResultRow } from "./types";

type AutoDefinition = Extract<HosoDefinitionDraft, { family: "auto" }>;

const AUTO_MAX_ITERATIONS = 20;

export function computeAuto(
  definition: AutoDefinition,
  stations: readonly StationTableEntry[],
  ctx: HosoComputeContext,
  rows: HosoResultRow[],
): void {
  const lineIds = resolveLineIdsForDefinition(definition, ctx.alignments);
  const referenceLineId = resolveReferenceLineId(definition, lineIds);

  for (const station of stations) {
    for (const lineId of lineIds) {
      const lateralOffsetM = lateralOffsetForLine(lineId, referenceLineId, ctx.lineOffsetMap) ?? 0;
      const lineElevation = resolveCrossSectionLineElevation(lineId, ctx.crossSectionTemplate);
      if (lineElevation === null) {
        ctx.diagnostics.push(
          createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.lineOutOfRange, {
            entityId: definition.id,
            physicalDistance: station.physicalDistance,
            entityPath: lineId,
          }),
        );
        continue;
      }

      let thicknessM = lineElevation;
      let converged = true;
      for (let iteration = 0; iteration < AUTO_MAX_ITERATIONS; iteration += 1) {
        const previous = thicknessM;
        thicknessM = lineElevation;
        if (Math.abs(thicknessM - previous) <= DEFAULT_TOLERANCES.elevation) {
          break;
        }
        if (iteration === AUTO_MAX_ITERATIONS - 1) {
          converged = false;
        }
      }
      if (!converged) {
        ctx.diagnostics.push(
          createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.autoNotConverged, {
            entityId: definition.id,
            physicalDistance: station.physicalDistance,
            entityPath: lineId,
          }),
        );
        continue;
      }
      emitHosoRow(ctx, definition, station, lineId, lateralOffsetM, thicknessM, rows);
    }
  }
}
