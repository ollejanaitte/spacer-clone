/**
 * Road editor integration helpers (Phase 7.2 FROZEN D-05 / Phase 7.3 WP-G).
 *
 * Immutable slice updaters for the LinerDraft editor state used by the rescued
 * legacy editors. Each updater returns a new draft (never mutates) so the UI
 * can commit atomically through roadEditorDraft.commitRoadEditorDraft.
 */

import type { BuildIntermediateInput } from "../../../liner/core/pipeline/pipeline";
import type {
  VerticalAlignmentDraft,
  CrossSectionTemplateDraft,
  CrossSlopeIntervalDraft,
  CrossSlopeDraft,
  StationDefinitionDraft,
  WidthChangePointDraft,
} from "../../../liner/schema/types";

export function updateVerticalAlignment(
  draft: BuildIntermediateInput,
  verticalAlignment: VerticalAlignmentDraft,
): BuildIntermediateInput {
  return { ...draft, verticalAlignment };
}

export function updateCrossSectionTemplate(
  draft: BuildIntermediateInput,
  index: number,
  template: CrossSectionTemplateDraft,
): BuildIntermediateInput {
  const crossSections = [...(draft.crossSections ?? [])];
  crossSections[index] = template;
  return { ...draft, crossSections };
}

export function updateWidthChangePoints(
  draft: BuildIntermediateInput,
  widthChangePoints: WidthChangePointDraft[],
): BuildIntermediateInput {
  return { ...draft, widthChangePoints };
}

export function updateCrossSlopeIntervals(
  draft: BuildIntermediateInput,
  crossSlopeIntervals: CrossSlopeIntervalDraft[],
): BuildIntermediateInput {
  return { ...draft, crossSlopeIntervals };
}

export function updateStationDefinition(
  draft: BuildIntermediateInput,
  stationDefinition: StationDefinitionDraft,
): BuildIntermediateInput {
  return { ...draft, stationDefinition };
}

export function updateCrossSectionCrossSlope(
  draft: BuildIntermediateInput,
  index: number,
  crossSlope: CrossSlopeDraft | undefined,
): BuildIntermediateInput {
  const crossSections = [...(draft.crossSections ?? [])];
  crossSections[index] = { ...crossSections[index], crossSlope };
  return { ...draft, crossSections };
}
