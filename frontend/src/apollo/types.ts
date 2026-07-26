/** Apollo Phase 1 status and authority types — reusable by AP-01/AP-02. */

export const TargetStandardStatus = {
  NOT_SELECTED: "NOT_SELECTED",
  SELECTED: "SELECTED",
  FROZEN: "FROZEN",
} as const;
export type TargetStandardStatus =
  (typeof TargetStandardStatus)[keyof typeof TargetStandardStatus];

export const NumericAuthority = {
  PLACEHOLDER: "PLACEHOLDER",
  USER_PROVIDED_UNVERIFIED: "USER_PROVIDED_UNVERIFIED",
  SOURCE_TRACED: "SOURCE_TRACED",
  ADOPTED: "ADOPTED",
} as const;
export type NumericAuthority = (typeof NumericAuthority)[keyof typeof NumericAuthority];

export const ImplementationAuthorization = {
  NOT_AUTHORIZED: "NOT_AUTHORIZED",
  CONDITIONAL: "CONDITIONAL",
  AUTHORIZED: "AUTHORIZED",
} as const;
export type ImplementationAuthorization =
  (typeof ImplementationAuthorization)[keyof typeof ImplementationAuthorization];

export const Phase1ScopeStatus = {
  IN_SCOPE: "IN_SCOPE",
  OUT_OF_SCOPE: "OUT_OF_SCOPE",
  UNRESOLVED: "UNRESOLVED",
} as const;
export type Phase1ScopeStatus =
  (typeof Phase1ScopeStatus)[keyof typeof Phase1ScopeStatus];

export const Phase1Alignment = {
  STRAIGHT: "STRAIGHT",
  CURVED: "CURVED",
  UNKNOWN: "UNKNOWN",
} as const;
export type Phase1Alignment = (typeof Phase1Alignment)[keyof typeof Phase1Alignment];

export const Phase1GirderDepth = {
  EQUAL: "EQUAL",
  VARIABLE: "VARIABLE",
  UNKNOWN: "UNKNOWN",
} as const;
export type Phase1GirderDepth =
  (typeof Phase1GirderDepth)[keyof typeof Phase1GirderDepth];

export const Phase1DeckType = {
  NON_COMPOSITE_RC_SLAB: "NON_COMPOSITE_RC_SLAB",
  COMPOSITE: "COMPOSITE",
  STEEL_DECK: "STEEL_DECK",
  PC_SLAB: "PC_SLAB",
  UNKNOWN: "UNKNOWN",
} as const;
export type Phase1DeckType = (typeof Phase1DeckType)[keyof typeof Phase1DeckType];

export const Phase1GirderSection = {
  PLATE_GIRDER: "PLATE_GIRDER",
  BOX_GIRDER: "BOX_GIRDER",
  UNKNOWN: "UNKNOWN",
} as const;
export type Phase1GirderSection =
  (typeof Phase1GirderSection)[keyof typeof Phase1GirderSection];

export const Phase1SpanSystem = {
  SIMPLE_SINGLE: "SIMPLE_SINGLE",
  CONTINUOUS: "CONTINUOUS",
  MULTI_SPAN: "MULTI_SPAN",
  UNKNOWN: "UNKNOWN",
} as const;
export type Phase1SpanSystem = (typeof Phase1SpanSystem)[keyof typeof Phase1SpanSystem];

export const Phase1AnalysisType = {
  STATIC_LINEAR: "STATIC_LINEAR",
  NONLINEAR: "NONLINEAR",
  EIGEN: "EIGEN",
  RESPONSE_SPECTRUM: "RESPONSE_SPECTRUM",
  TIME_HISTORY: "TIME_HISTORY",
  UNKNOWN: "UNKNOWN",
} as const;
export type Phase1AnalysisType =
  (typeof Phase1AnalysisType)[keyof typeof Phase1AnalysisType];

/** Narrow Phase 1 bridge archetype input for scope preflight. */
export type Phase1BridgeScopeInput = {
  readonly alignment: Phase1Alignment;
  readonly girderDepth: Phase1GirderDepth;
  readonly deckType: Phase1DeckType;
  readonly girderSection: Phase1GirderSection;
  readonly spanSystem: Phase1SpanSystem;
  /** Skew angle in degrees; Phase 1 requires exactly 90. */
  readonly skewDegrees: number | null;
  readonly analysisType: Phase1AnalysisType;
  /** Main girder count; Phase 1 accepts 4–6 inclusive. */
  readonly girderCount: number | null;
};

/** Numeric record subject to authority guards. */
export type NumericValueRecord = {
  readonly value: number | null | undefined;
  readonly authority: NumericAuthority;
  readonly sourceLocator?: string | null;
  readonly decisionId?: string | null;
  readonly quantityKind?: string;
};

export type NumericAuthorityContext = {
  readonly targetStandardStatus: TargetStandardStatus;
};

export const GoldenRegistrationKind = {
  GOLDEN_EXPECTED: "GOLDEN_EXPECTED",
  SEMANTIC_ONLY: "SEMANTIC_ONLY",
  PLANNING_PLACEHOLDER: "PLANNING_PLACEHOLDER",
} as const;
export type GoldenRegistrationKind =
  (typeof GoldenRegistrationKind)[keyof typeof GoldenRegistrationKind];

export type GoldenExpectedRegistrationInput = {
  readonly registrationKind: GoldenRegistrationKind;
  readonly fixtureId?: string;
};
