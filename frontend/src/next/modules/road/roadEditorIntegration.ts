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
