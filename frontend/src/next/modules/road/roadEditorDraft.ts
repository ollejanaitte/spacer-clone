/**
 * Road editor draft bridge (Phase 7.2 FROZEN D-05 / Phase 7.3 WP-B..F).
 *
 * The legacy LINER editors operate on `LinerDraft` (BuildIntermediateInput).
 * This module bridges the canonical roadData (LinerDomainDraftVNext) to that
 * editor draft and back, so that the rescued editors commit atomically to the
 * Single Source of Truth (modules.road.data.roadData).
 *
 * Commit protocol (FROZEN):
 *   UI edit -> validate -> atomic canonical commit -> checksum -> autosave.
 */

import type { LinerDomainDraftVNext } from "../../../liner/schema/types";
import type { BuildIntermediateInput } from "../../../liner/core/pipeline/pipeline";
import {
  buildIntermediateInputFromDomainDraft,
} from "../../../liner/adapters/linerProjectDraft";
import {
  buildCanonicalRoadData,
  computeRoadDataChecksum,
  type CanonicalRoadData,
  type RoadDataMeta,
} from "./roadDataSchema";

export type RoadEditorDraftResult =
  | { ok: true; draft: BuildIntermediateInput }
  | { ok: false; issues: readonly { path: string; message: string }[] };

/** Load an editor draft from the canonical roadData. */
export function loadRoadEditorDraft(canonical: CanonicalRoadData): RoadEditorDraftResult {
  try {
    const draft = buildIntermediateInputFromDomainDraft(canonical.domainDraft);
    return { ok: true, draft };
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          path: "roadData.domainDraft",
          message: `cannot build editor draft from canonical roadData: ${String(error)}`,
        },
      ],
    };
  }
}

/**
 * Reconstruct a canonical domain draft from an editor draft.
 * The editor draft's ACTIVE fields (alignment / stationDefinition /
 * verticalAlignment / crossSections / crossSlopeIntervals / widthChangePoints)
 * are authoritative; `linerAlignments` supplies the other bundles (and the
 * active bundle's identity).
 */
export function buildDomainDraftFromLinerDraft(
  draft: BuildIntermediateInput,
): LinerDomainDraftVNext {
  const fallbackBundle = {
    id: draft.alignment.id,
    name: draft.alignment.id,
    enabled: true,
    sortIndex: 0,
    alignment: draft.alignment as unknown as LinerDomainDraftVNext["alignments"][0]["alignment"],
    stationDefinition: draft.stationDefinition as unknown as LinerDomainDraftVNext["alignments"][0]["stationDefinition"],
    verticalAlignment: draft.verticalAlignment,
    crossSections: draft.crossSections,
    crossSlopeIntervals: draft.crossSlopeIntervals,
    gridDefinitions: [],
    spans: [],
    piers: [],
    widthChangePoints: draft.widthChangePoints,
  } as unknown as LinerDomainDraftVNext["alignments"][0];

  const alignments = Array.isArray(draft.linerAlignments) && draft.linerAlignments.length > 0
    ? (draft.linerAlignments.map((bundle, index) =>
        bundle.id === draft.activeAlignmentId || bundle.id === draft.alignment.id || index === 0
          ? {
              ...bundle,
              alignment: draft.alignment,
              stationDefinition: draft.stationDefinition,
              verticalAlignment: draft.verticalAlignment,
              crossSections: draft.crossSections,
              crossSlopeIntervals: draft.crossSlopeIntervals,
              widthChangePoints: draft.widthChangePoints,
            }
          : bundle,
      ) as unknown as LinerDomainDraftVNext["alignments"])
    : [fallbackBundle];

  return {
    id: draft.alignment.linerModelId ?? "road",
    linerModelId: draft.alignment.linerModelId ?? "road",
    coordinatePolicyId: draft.alignment.coordinatePolicyId ?? null as unknown as string,
    alignments,
    activeAlignmentId: draft.activeAlignmentId,
    activeLineId: draft.activeLineId,
    ...(draft.measuredGrid ? { measuredGrid: draft.measuredGrid } : {}),
    ...(draft.drawingSettings ? { drawingSettings: draft.drawingSettings } : {}),
    ...(draft.ldistJobs?.length ? { ldistJobs: draft.ldistJobs } : {}),
    ...(draft.haunchDefinitions?.length ? { haunchDefinitions: draft.haunchDefinitions } : {}),
    ...(draft.hosoDefinitions?.length ? { hosoDefinitions: draft.hosoDefinitions } : {}),
    selectedCrossSectionStation: draft.selectedCrossSectionStation,
    generationSettings: {},
    sampling: {
      display: { maxChordLength: draft.sampleInterval ?? 0.5, maxSagitta: 0.01, minSegmentsPerElement: 4 },
      dxf: { maxChordLength: 0.1, maxSagitta: 0.005, minSegmentsPerElement: 4 },
      frame: { maxMemberLength: 0.25, maxSagitta: 0.005, stationIntervalFallback: 0.25 },
    },
  };
}

/**
 * Atomic canonical commit from an editor draft: rebuild the domain draft,
 * recompute the checksum, and return a new CanonicalRoadData. Never mutates
 * the input; fail-closed on malformed drafts.
 */
export function commitRoadEditorDraft(
  draft: BuildIntermediateInput,
  meta: RoadDataMeta,
): RoadEditorDraftResult & { canonical?: CanonicalRoadData } {
  try {
    const domainDraft = buildDomainDraftFromLinerDraft(draft);
    const canonical = buildCanonicalRoadData(domainDraft, meta);
    return { ok: true, draft, canonical };
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          path: "roadData",
          message: `cannot commit editor draft to canonical roadData: ${String(error)}`,
        },
      ],
    };
  }
}

/** Compute the checksum of an editor draft's canonical projection (for stale). */
export function editorDraftChecksum(draft: BuildIntermediateInput): string {
  return computeRoadDataChecksum(buildDomainDraftFromLinerDraft(draft));
}
