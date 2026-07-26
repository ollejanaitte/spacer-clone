/** Stable fail-closed error codes for Apollo Phase 1 guards (AP-00 P02). */

export const AP00_GUARD_ERROR_CODES = {
  AP00_SCOPE_MULTI_SPAN: "AP00_SCOPE_MULTI_SPAN",
  AP00_SCOPE_CONTINUOUS: "AP00_SCOPE_CONTINUOUS",
  AP00_SCOPE_SKEW_NOT_90: "AP00_SCOPE_SKEW_NOT_90",
  AP00_SCOPE_SKEW_UNKNOWN: "AP00_SCOPE_SKEW_UNKNOWN",
  AP00_SCOPE_COMPOSITE_DECK: "AP00_SCOPE_COMPOSITE_DECK",
  AP00_SCOPE_STEEL_DECK: "AP00_SCOPE_STEEL_DECK",
  AP00_SCOPE_PC_SLAB: "AP00_SCOPE_PC_SLAB",
  AP00_SCOPE_BOX_GIRDER: "AP00_SCOPE_BOX_GIRDER",
  AP00_SCOPE_CURVED_ALIGNMENT: "AP00_SCOPE_CURVED_ALIGNMENT",
  AP00_SCOPE_NONLINEAR_ANALYSIS: "AP00_SCOPE_NONLINEAR_ANALYSIS",
  AP00_SCOPE_DYNAMIC_ANALYSIS: "AP00_SCOPE_DYNAMIC_ANALYSIS",
  AP00_SCOPE_VARIABLE_DEPTH: "AP00_SCOPE_VARIABLE_DEPTH",
  AP00_SCOPE_GIRDER_COUNT_OUT_OF_RANGE: "AP00_SCOPE_GIRDER_COUNT_OUT_OF_RANGE",
  AP00_SCOPE_GIRDER_COUNT_UNKNOWN: "AP00_SCOPE_GIRDER_COUNT_UNKNOWN",
  AP00_SCOPE_ALIGNMENT_UNKNOWN: "AP00_SCOPE_ALIGNMENT_UNKNOWN",
  AP00_SCOPE_DECK_UNKNOWN: "AP00_SCOPE_DECK_UNKNOWN",
  AP00_SCOPE_SECTION_UNKNOWN: "AP00_SCOPE_SECTION_UNKNOWN",
  AP00_SCOPE_SPAN_UNKNOWN: "AP00_SCOPE_SPAN_UNKNOWN",
  AP00_SCOPE_ANALYSIS_UNKNOWN: "AP00_SCOPE_ANALYSIS_UNKNOWN",
  AP00_SCOPE_DEPTH_UNKNOWN: "AP00_SCOPE_DEPTH_UNKNOWN",
  AP00_SCOPE_NOT_PLATE_GIRDER: "AP00_SCOPE_NOT_PLATE_GIRDER",
  AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD: "AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD",
  AP00_NUMERIC_ADOPTED_MISSING_SOURCE: "AP00_NUMERIC_ADOPTED_MISSING_SOURCE",
  AP00_NUMERIC_ADOPTED_MISSING_DECISION: "AP00_NUMERIC_ADOPTED_MISSING_DECISION",
  AP00_NUMERIC_PLACEHOLDER_AS_ADOPTED: "AP00_NUMERIC_PLACEHOLDER_AS_ADOPTED",
  AP00_NUMERIC_NULL_COERCION: "AP00_NUMERIC_NULL_COERCION",
  AP00_NUMERIC_GOLDEN_EXPECTED_FORBIDDEN: "AP00_NUMERIC_GOLDEN_EXPECTED_FORBIDDEN",
} as const;

export type ApolloGuardErrorCode =
  (typeof AP00_GUARD_ERROR_CODES)[keyof typeof AP00_GUARD_ERROR_CODES];

export type ApolloGuardIssue = {
  readonly code: ApolloGuardErrorCode;
  readonly message: string;
  readonly path?: string;
};

export type ApolloGuardResult = {
  readonly ok: boolean;
  readonly issues: readonly ApolloGuardIssue[];
};

export const AP00_GUARD_ERROR_MESSAGES: Record<ApolloGuardErrorCode, string> = {
  AP00_SCOPE_MULTI_SPAN:
    "Multi-span bridge systems are OUT_OF_PHASE1; Phase 1 accepts simple single span only.",
  AP00_SCOPE_CONTINUOUS:
    "Continuous girder systems are OUT_OF_PHASE1; Phase 1 accepts simple single span only.",
  AP00_SCOPE_SKEW_NOT_90:
    "Skewed bridges are OUT_OF_PHASE1; Phase 1 requires 90° skew.",
  AP00_SCOPE_SKEW_UNKNOWN:
    "Skew angle is required; null or unknown skew cannot proceed.",
  AP00_SCOPE_COMPOSITE_DECK:
    "Composite deck action is OUT_OF_PHASE1; Phase 1 accepts non-composite RC slab on steel plate girder only.",
  AP00_SCOPE_STEEL_DECK:
    "Steel deck systems are OUT_OF_PHASE1.",
  AP00_SCOPE_PC_SLAB: "Prestressed concrete slab systems are OUT_OF_PHASE1.",
  AP00_SCOPE_BOX_GIRDER:
    "Box girder sections are OUT_OF_PHASE1; Phase 1 accepts plate girder only.",
  AP00_SCOPE_CURVED_ALIGNMENT:
    "Curved alignment as Apollo design target is OUT_OF_PHASE1; Phase 1 accepts straight bridges only.",
  AP00_SCOPE_NONLINEAR_ANALYSIS:
    "Nonlinear analysis is OUT_OF_PHASE1; Phase 1 accepts static linear only.",
  AP00_SCOPE_DYNAMIC_ANALYSIS:
    "Dynamic or seismic analysis is OUT_OF_PHASE1; Phase 1 accepts static linear only.",
  AP00_SCOPE_VARIABLE_DEPTH:
    "Variable-depth girders are OUT_OF_PHASE1; Phase 1 accepts equal depth only.",
  AP00_SCOPE_GIRDER_COUNT_OUT_OF_RANGE:
    "Main girder count must be 4–6 for Phase 1 narrow archetype.",
  AP00_SCOPE_GIRDER_COUNT_UNKNOWN:
    "Main girder count is required; null or unknown count cannot proceed.",
  AP00_SCOPE_ALIGNMENT_UNKNOWN:
    "Bridge alignment is required; unknown alignment cannot proceed.",
  AP00_SCOPE_DECK_UNKNOWN:
    "Deck type is required; unknown deck type cannot proceed.",
  AP00_SCOPE_SECTION_UNKNOWN:
    "Girder section type is required; unknown section cannot proceed.",
  AP00_SCOPE_SPAN_UNKNOWN:
    "Span system is required; unknown span system cannot proceed.",
  AP00_SCOPE_ANALYSIS_UNKNOWN:
    "Analysis type is required; unknown analysis type cannot proceed.",
  AP00_SCOPE_DEPTH_UNKNOWN:
    "Girder depth classification is required; unknown depth cannot proceed.",
  AP00_SCOPE_NOT_PLATE_GIRDER:
    "Phase 1 accepts steel plate girder superstructure only.",
  AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD:
    "ADOPTED numerics are forbidden while Target Standard is NOT_SELECTED.",
  AP00_NUMERIC_ADOPTED_MISSING_SOURCE:
    "ADOPTED numerics require a non-empty source_locator.",
  AP00_NUMERIC_ADOPTED_MISSING_DECISION:
    "ADOPTED numerics require a non-empty decision_id.",
  AP00_NUMERIC_PLACEHOLDER_AS_ADOPTED:
    "PLACEHOLDER authority must not be treated as ADOPTED.",
  AP00_NUMERIC_NULL_COERCION:
    "Null or unknown numeric values must not be coerced to zero.",
  AP00_NUMERIC_GOLDEN_EXPECTED_FORBIDDEN:
    "Golden expected value registration is NOT_AUTHORIZED (DEC-S1-0011).",
};

export function createGuardIssue(
  code: ApolloGuardErrorCode,
  path?: string,
): ApolloGuardIssue {
  return {
    code,
    message: AP00_GUARD_ERROR_MESSAGES[code],
    ...(path !== undefined ? { path } : {}),
  };
}

export function createGuardResult(issues: readonly ApolloGuardIssue[]): ApolloGuardResult {
  return {
    ok: issues.length === 0,
    issues,
  };
}
