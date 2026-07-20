import type { ComputationDiagnostic } from "../types";
import { computeAuto } from "./computeAuto";
import { buildHosoLineOffsetMap, type HosoComputeContext } from "./computeContext";
import { computeLongitudinal } from "./computeLongitudinal";
import { computeThreePoint } from "./computeThreePoint";
import { computeTransverse } from "./computeTransverse";
import { computeTwoPoint } from "./computeTwoPoint";
import { resolveHosoAlignmentBundles } from "./resolveHosoAlignmentBundles";
import { filterStationsForDefinition } from "./resolveHosoScope";
import type { HosoComputeInput, HosoComputeOutput, HosoResultRow } from "./types";
import {
  buildHosoValidationContext,
  validateHosoDefinitions,
} from "./validateHosoDefinitions";

export function computeHosoResults(input: HosoComputeInput): HosoComputeOutput {
  const rows: HosoResultRow[] = [];
  const diagnostics: ComputationDiagnostic[] = [];

  const alignments = resolveHosoAlignmentBundles({
    linerAlignments: input.linerAlignments,
    activeAlignmentId: input.activeAlignmentId,
    crossSections: input.crossSections,
    fallbackAlignmentId:
      input.fallbackAlignmentId ?? input.intermediate.horizontal.segments[0]?.id ?? "alignment-1",
  });

  const context = buildHosoValidationContext(alignments, input.intermediate);
  diagnostics.push(...validateHosoDefinitions(input.definitions, context));

  const validationErrors = diagnostics.filter((entry) => entry.level === "error");
  if (validationErrors.length > 0) {
    return { rows, diagnostics };
  }

  const crossSectionTemplate = input.crossSections?.[0];
  const computeCtx: HosoComputeContext = {
    intermediate: input.intermediate,
    lineOffsetMap: buildHosoLineOffsetMap(alignments),
    alignments,
    crossSectionTemplate,
    crossSlopeIntervals: input.crossSlopeIntervals,
    sourceRevision: input.sourceRevision,
    diagnostics,
  };

  input.definitions.forEach((definition) => {
    if (definition.enabled === false) {
      return;
    }

    const stations = filterStationsForDefinition(
      definition,
      input.intermediate.stations.entries,
    );

    if (definition.family === "auto") {
      computeAuto(definition, stations, computeCtx, rows);
    } else if (definition.family === "longitudinal") {
      computeLongitudinal(definition, stations, computeCtx, rows);
    } else if (definition.family === "transverse") {
      computeTransverse(definition, stations, computeCtx, rows);
    } else if (definition.family === "two_point") {
      computeTwoPoint(definition, stations, computeCtx, rows);
    } else if (definition.family === "three_point") {
      computeThreePoint(definition, stations, computeCtx, rows);
    }
  });

  return { rows, diagnostics };
}
