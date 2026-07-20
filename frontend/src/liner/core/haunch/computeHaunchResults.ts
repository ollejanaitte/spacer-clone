import type { HaunchDefinitionDraft } from "../../schema/types";
import type { ComputationDiagnostic } from "../types";
import { buildHaunchLineOffsetMap } from "./anchorResolution";
import { type HaunchComputeContext } from "./computeContext";
import { computePlane } from "./computePlane";
import { computeRange } from "./computeRange";
import { computeThreePoint } from "./computeThreePoint";
import { computeTwoPoint } from "./computeTwoPoint";
import {
  buildHaunchValidationContext,
  validateHaunchDefinitions,
} from "./validateHaunchDefinitions";
import { resolveHaunchAlignmentBundles } from "./resolveHaunchAlignmentBundles";
import {
  buildHaunchScopeResolver,
  filterStationsForDefinition,
} from "./resolveHaunchScope";
import type { HaunchComputeInput, HaunchComputeOutput, HaunchResultRow } from "./types";

export function computeHaunchResults(input: HaunchComputeInput): HaunchComputeOutput {
  const rows: HaunchResultRow[] = [];
  const diagnostics: ComputationDiagnostic[] = [];

  const alignments = resolveHaunchAlignmentBundles({
    linerAlignments: input.linerAlignments,
    activeAlignmentId: input.activeAlignmentId,
    crossSections: input.crossSections,
    fallbackAlignmentId:
      input.fallbackAlignmentId ?? input.intermediate.horizontal.segments[0]?.id ?? "alignment-1",
  });
  const context = buildHaunchValidationContext(alignments, input.intermediate);
  diagnostics.push(...validateHaunchDefinitions(input.definitions, context));

  const validationErrors = diagnostics.filter((entry) => entry.level === "error");
  if (validationErrors.length > 0) {
    return { rows, diagnostics };
  }

  const scopeResolver = buildHaunchScopeResolver(
    input.definitions,
    input.intermediate.stations.entries,
  );
  diagnostics.push(...scopeResolver.scopeDiagnostics);

  const scopeErrors = diagnostics.filter((entry) => entry.level === "error");
  if (scopeErrors.length > 0) {
    return { rows, diagnostics };
  }

  const computeCtx: HaunchComputeContext = {
    intermediate: input.intermediate,
    lineOffsetMap: buildHaunchLineOffsetMap(alignments),
    alignments,
    sourceRevision: input.sourceRevision,
    diagnostics,
  };

  input.definitions.forEach((definition, index) => {
    if (definition.enabled === false) {
      return;
    }

    const stations = filterStationsForDefinition(
      definition,
      input.intermediate.stations.entries,
      (station) => scopeResolver.isStationInScope(station, index),
    );

    if (definition.family === "two_point") {
      computeTwoPoint(definition, stations, computeCtx, rows);
    } else if (definition.family === "three_point") {
      computeThreePoint(definition, stations, computeCtx, rows);
    } else if (definition.family === "plane" && definition.variant === "one_point_two_gradients") {
      computePlane(definition, stations, computeCtx, rows);
    } else if (definition.family === "range") {
      computeRange(definition, computeCtx);
    }
  });

  return { rows, diagnostics };
}
