import { syncActiveBundleToAlignments, type LinerDraft } from "../adapters/linerUiAdapter";
import { computeHaunchResults } from "../core/haunch";
import { computeHosoResults } from "../core/hoso";
import { computeLdistResults } from "../core/ldist";
import { buildIntermediateResult } from "../core/pipeline/pipeline";
import type {
  CanonicalLinerIntermediateResult,
  ComputationDiagnostic,
} from "../core/types";
import type { HaunchResultRow } from "../core/haunch/types";
import type { HosoResultRow } from "../core/hoso/types";
import type { LdistResultRow } from "../core/ldist/types";

export type RoadReportContext = {
  projectName: string;
  intermediate: CanonicalLinerIntermediateResult;
  ldistRows: LdistResultRow[];
  haunchRows: HaunchResultRow[];
  hosoRows: HosoResultRow[];
  diagnostics: ComputationDiagnostic[];
};

export type RoadExportBlockReason = "error_diagnostics" | "stale_source_revision";

export type RoadExportReadiness = {
  canExport: boolean;
  reason?: RoadExportBlockReason;
};

function toPreviewSafeDraft(draft: LinerDraft): LinerDraft {
  if (typeof draft.sampleInterval === "number" && Number.isFinite(draft.sampleInterval) && draft.sampleInterval > 0) {
    return draft;
  }
  return {
    ...draft,
    sampleInterval: 1,
  };
}

export function buildRoadReportContext(
  draft: LinerDraft,
  projectName = "liner",
): RoadReportContext {
  const syncedDraft = syncActiveBundleToAlignments(toPreviewSafeDraft(draft));
  const intermediate = buildIntermediateResult(syncedDraft);
  const ldistOutput = computeLdistResults({
    jobs: syncedDraft.ldistJobs ?? [],
    intermediate,
    sourceRevision: intermediate.sourceRevision,
    linerAlignments: syncedDraft.linerAlignments,
    activeAlignmentId: syncedDraft.activeAlignmentId ?? syncedDraft.alignment.id,
    crossSections: syncedDraft.crossSections,
    fallbackAlignmentId: syncedDraft.alignment.id,
  });
  const haunchOutput = computeHaunchResults({
    definitions: syncedDraft.haunchDefinitions ?? [],
    intermediate,
    sourceRevision: intermediate.sourceRevision,
    linerAlignments: syncedDraft.linerAlignments,
    activeAlignmentId: syncedDraft.activeAlignmentId ?? syncedDraft.alignment.id,
    crossSections: syncedDraft.crossSections,
    fallbackAlignmentId: syncedDraft.alignment.id,
  });
  const hosoOutput = computeHosoResults({
    definitions: syncedDraft.hosoDefinitions ?? [],
    intermediate,
    sourceRevision: intermediate.sourceRevision,
    linerAlignments: syncedDraft.linerAlignments,
    activeAlignmentId: syncedDraft.activeAlignmentId ?? syncedDraft.alignment.id,
    crossSections: syncedDraft.crossSections,
    crossSlopeIntervals: syncedDraft.crossSlopeIntervals,
    fallbackAlignmentId: syncedDraft.alignment.id,
  });

  const diagnostics = [
    ...intermediate.diagnostics,
    ...ldistOutput.diagnostics,
    ...haunchOutput.diagnostics,
    ...hosoOutput.diagnostics,
  ];

  return {
    projectName,
    intermediate,
    ldistRows: ldistOutput.rows,
    haunchRows: haunchOutput.rows,
    hosoRows: hosoOutput.rows,
    diagnostics,
  };
}

export function assessRoadExportReadiness(context: RoadReportContext): RoadExportReadiness {
  if (context.diagnostics.some((diagnostic) => diagnostic.level === "error")) {
    return { canExport: false, reason: "error_diagnostics" };
  }

  const revision = context.intermediate.sourceRevision;
  const stale =
    context.ldistRows.some((row) => row.sourceRevision !== revision) ||
    context.haunchRows.some((row) => row.sourceRevision !== revision) ||
    context.hosoRows.some((row) => row.sourceRevision !== revision);

  if (stale) {
    return { canExport: false, reason: "stale_source_revision" };
  }

  return { canExport: true };
}
