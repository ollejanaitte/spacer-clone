import {
  createGuardIssue,
  createGuardResult,
  type ApolloGuardIssue,
  type ApolloGuardResult,
} from "./errors";
import {
  Phase1Alignment,
  Phase1AnalysisType,
  Phase1DeckType,
  Phase1GirderDepth,
  Phase1GirderSection,
  Phase1ScopeStatus,
  Phase1SpanSystem,
  type Phase1BridgeScopeInput,
  type Phase1ScopeStatus as Phase1ScopeStatusType,
} from "./types";

export const PHASE1_SKEW_DEGREES_REQUIRED = 90;
export const PHASE1_GIRDER_COUNT_MIN = 4;
export const PHASE1_GIRDER_COUNT_MAX = 6;

const DYNAMIC_ANALYSIS_TYPES = new Set<Phase1BridgeScopeInput["analysisType"]>([
  Phase1AnalysisType.EIGEN,
  Phase1AnalysisType.RESPONSE_SPECTRUM,
  Phase1AnalysisType.TIME_HISTORY,
]);

function collectScopeIssues(input: Phase1BridgeScopeInput): ApolloGuardIssue[] {
  const issues: ApolloGuardIssue[] = [];

  if (input.alignment === Phase1Alignment.CURVED) {
    issues.push(createGuardIssue("AP00_SCOPE_CURVED_ALIGNMENT", "alignment"));
  } else if (input.alignment === Phase1Alignment.UNKNOWN) {
    issues.push(createGuardIssue("AP00_SCOPE_ALIGNMENT_UNKNOWN", "alignment"));
  }

  if (input.girderDepth === Phase1GirderDepth.VARIABLE) {
    issues.push(createGuardIssue("AP00_SCOPE_VARIABLE_DEPTH", "girderDepth"));
  } else if (input.girderDepth === Phase1GirderDepth.UNKNOWN) {
    issues.push(createGuardIssue("AP00_SCOPE_DEPTH_UNKNOWN", "girderDepth"));
  }

  if (input.deckType === Phase1DeckType.COMPOSITE) {
    issues.push(createGuardIssue("AP00_SCOPE_COMPOSITE_DECK", "deckType"));
  } else if (input.deckType === Phase1DeckType.STEEL_DECK) {
    issues.push(createGuardIssue("AP00_SCOPE_STEEL_DECK", "deckType"));
  } else if (input.deckType === Phase1DeckType.PC_SLAB) {
    issues.push(createGuardIssue("AP00_SCOPE_PC_SLAB", "deckType"));
  } else if (input.deckType === Phase1DeckType.UNKNOWN) {
    issues.push(createGuardIssue("AP00_SCOPE_DECK_UNKNOWN", "deckType"));
  }

  if (input.girderSection === Phase1GirderSection.BOX_GIRDER) {
    issues.push(createGuardIssue("AP00_SCOPE_BOX_GIRDER", "girderSection"));
  } else if (input.girderSection === Phase1GirderSection.UNKNOWN) {
    issues.push(createGuardIssue("AP00_SCOPE_SECTION_UNKNOWN", "girderSection"));
  }

  if (input.spanSystem === Phase1SpanSystem.CONTINUOUS) {
    issues.push(createGuardIssue("AP00_SCOPE_CONTINUOUS", "spanSystem"));
  } else if (input.spanSystem === Phase1SpanSystem.MULTI_SPAN) {
    issues.push(createGuardIssue("AP00_SCOPE_MULTI_SPAN", "spanSystem"));
  } else if (input.spanSystem === Phase1SpanSystem.UNKNOWN) {
    issues.push(createGuardIssue("AP00_SCOPE_SPAN_UNKNOWN", "spanSystem"));
  }

  if (input.skewDegrees === null) {
    issues.push(createGuardIssue("AP00_SCOPE_SKEW_UNKNOWN", "skewDegrees"));
  } else if (input.skewDegrees !== PHASE1_SKEW_DEGREES_REQUIRED) {
    issues.push(createGuardIssue("AP00_SCOPE_SKEW_NOT_90", "skewDegrees"));
  }

  if (input.analysisType === Phase1AnalysisType.NONLINEAR) {
    issues.push(createGuardIssue("AP00_SCOPE_NONLINEAR_ANALYSIS", "analysisType"));
  } else if (DYNAMIC_ANALYSIS_TYPES.has(input.analysisType)) {
    issues.push(createGuardIssue("AP00_SCOPE_DYNAMIC_ANALYSIS", "analysisType"));
  } else if (input.analysisType === Phase1AnalysisType.UNKNOWN) {
    issues.push(createGuardIssue("AP00_SCOPE_ANALYSIS_UNKNOWN", "analysisType"));
  }

  if (input.girderCount === null) {
    issues.push(createGuardIssue("AP00_SCOPE_GIRDER_COUNT_UNKNOWN", "girderCount"));
  } else if (
    input.girderCount < PHASE1_GIRDER_COUNT_MIN ||
    input.girderCount > PHASE1_GIRDER_COUNT_MAX
  ) {
    issues.push(createGuardIssue("AP00_SCOPE_GIRDER_COUNT_OUT_OF_RANGE", "girderCount"));
  }

  return issues;
}

function hasUnresolvedIssue(issues: readonly ApolloGuardIssue[]): boolean {
  return issues.some((issue) => issue.code.endsWith("_UNKNOWN"));
}

export function classifyPhase1Scope(input: Phase1BridgeScopeInput): Phase1ScopeStatusType {
  const issues = collectScopeIssues(input);
  if (issues.length === 0) {
    return Phase1ScopeStatus.IN_SCOPE;
  }
  if (hasUnresolvedIssue(issues)) {
    return Phase1ScopeStatus.UNRESOLVED;
  }
  return Phase1ScopeStatus.OUT_OF_SCOPE;
}

export function validatePhase1Scope(input: Phase1BridgeScopeInput): ApolloGuardResult & {
  scopeStatus: Phase1ScopeStatusType;
} {
  const issues = collectScopeIssues(input);
  const scopeStatus = classifyPhase1Scope(input);
  return {
    ...createGuardResult(issues),
    scopeStatus,
  };
}

export function isPhase1ScopeAccepted(input: Phase1BridgeScopeInput): boolean {
  return validatePhase1Scope(input).ok;
}
