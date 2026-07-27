/**
 * Phase 1 archetype fixture builders for AP-00 tests.
 * IN_SCOPE inputs use scope-contract constants only — no ADOPTED numerics.
 */

import {
  PHASE1_GIRDER_COUNT_MAX,
  PHASE1_GIRDER_COUNT_MIN,
  PHASE1_SKEW_DEGREES_REQUIRED,
} from "../phase1ScopeGuard";
import {
  Phase1Alignment,
  Phase1AnalysisType,
  Phase1DeckType,
  Phase1GirderDepth,
  Phase1GirderSection,
  Phase1SpanSystem,
  type Phase1BridgeScopeInput,
} from "../types";

/** Midpoint girder count within the accepted Phase 1 range (scope contract, not a golden numeric). */
export const PHASE1_FIXTURE_GIRDER_COUNT_MID =
  PHASE1_GIRDER_COUNT_MIN +
  Math.floor((PHASE1_GIRDER_COUNT_MAX - PHASE1_GIRDER_COUNT_MIN) / 2);

/** Canonical IN_SCOPE narrow archetype for positive guard tests. */
export function buildInScopePhase1Archetype(
  overrides: Partial<Phase1BridgeScopeInput> = {},
): Phase1BridgeScopeInput {
  return {
    alignment: Phase1Alignment.STRAIGHT,
    girderDepth: Phase1GirderDepth.EQUAL,
    deckType: Phase1DeckType.NON_COMPOSITE_RC_SLAB,
    girderSection: Phase1GirderSection.PLATE_GIRDER,
    spanSystem: Phase1SpanSystem.SIMPLE_SINGLE,
    skewDegrees: PHASE1_SKEW_DEGREES_REQUIRED,
    analysisType: Phase1AnalysisType.STATIC_LINEAR,
    girderCount: PHASE1_FIXTURE_GIRDER_COUNT_MID,
    ...overrides,
  };
}

export type Phase1ArchetypePreset =
  | "MIN_GIRDERS"
  | "MAX_GIRDERS"
  | "CONTINUOUS_SPAN"
  | "UNKNOWN_DECK"
  | "CURVED_ALIGNMENT";

const PRESET_OVERRIDES: Record<Phase1ArchetypePreset, Partial<Phase1BridgeScopeInput>> = {
  MIN_GIRDERS: { girderCount: PHASE1_GIRDER_COUNT_MIN },
  MAX_GIRDERS: { girderCount: PHASE1_GIRDER_COUNT_MAX },
  CONTINUOUS_SPAN: { spanSystem: Phase1SpanSystem.CONTINUOUS },
  UNKNOWN_DECK: { deckType: Phase1DeckType.UNKNOWN },
  CURVED_ALIGNMENT: { alignment: Phase1Alignment.CURVED },
};

/** Build a scoped archetype from a named preset (IN_SCOPE or fail-closed negative). */
export function buildPhase1ArchetypePreset(
  preset: Phase1ArchetypePreset,
): Phase1BridgeScopeInput {
  return buildInScopePhase1Archetype(PRESET_OVERRIDES[preset]);
}
