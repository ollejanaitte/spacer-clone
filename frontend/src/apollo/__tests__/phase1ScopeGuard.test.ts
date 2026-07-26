import { describe, expect, it } from "vitest";
import {
  classifyPhase1Scope,
  isPhase1ScopeAccepted,
  PHASE1_GIRDER_COUNT_MAX,
  PHASE1_GIRDER_COUNT_MIN,
  PHASE1_SKEW_DEGREES_REQUIRED,
  validatePhase1Scope,
} from "../phase1ScopeGuard";
import {
  Phase1Alignment,
  Phase1AnalysisType,
  Phase1DeckType,
  Phase1GirderDepth,
  Phase1GirderSection,
  Phase1ScopeStatus,
  Phase1SpanSystem,
  type Phase1BridgeScopeInput,
} from "../types";

const NARROW_ARCHETYPE: Phase1BridgeScopeInput = {
  alignment: Phase1Alignment.STRAIGHT,
  girderDepth: Phase1GirderDepth.EQUAL,
  deckType: Phase1DeckType.NON_COMPOSITE_RC_SLAB,
  girderSection: Phase1GirderSection.PLATE_GIRDER,
  spanSystem: Phase1SpanSystem.SIMPLE_SINGLE,
  skewDegrees: PHASE1_SKEW_DEGREES_REQUIRED,
  analysisType: Phase1AnalysisType.STATIC_LINEAR,
  girderCount: 5,
};

function withScope(
  overrides: Partial<Phase1BridgeScopeInput>,
): Phase1BridgeScopeInput {
  return { ...NARROW_ARCHETYPE, ...overrides };
}

describe("phase1ScopeGuard", () => {
  describe("positive narrow archetype", () => {
    const positiveCases: Array<{ label: string; input: Phase1BridgeScopeInput }> = [
      { label: "baseline 5 girders", input: NARROW_ARCHETYPE },
      {
        label: "minimum girder count",
        input: withScope({ girderCount: PHASE1_GIRDER_COUNT_MIN }),
      },
      {
        label: "maximum girder count",
        input: withScope({ girderCount: PHASE1_GIRDER_COUNT_MAX }),
      },
    ];

    it.each(positiveCases)("$label is IN_SCOPE", ({ input }) => {
      const result = validatePhase1Scope(input);
      expect(result.ok).toBe(true);
      expect(result.scopeStatus).toBe(Phase1ScopeStatus.IN_SCOPE);
      expect(isPhase1ScopeAccepted(input)).toBe(true);
      expect(classifyPhase1Scope(input)).toBe(Phase1ScopeStatus.IN_SCOPE);
    });
  });

  describe("negative out-of-scope cases", () => {
    const negativeCases: Array<{
      label: string;
      input: Phase1BridgeScopeInput;
      codes: string[];
    }> = [
      {
        label: "continuous span",
        input: withScope({ spanSystem: Phase1SpanSystem.CONTINUOUS }),
        codes: ["AP00_SCOPE_CONTINUOUS"],
      },
      {
        label: "multi-span",
        input: withScope({ spanSystem: Phase1SpanSystem.MULTI_SPAN }),
        codes: ["AP00_SCOPE_MULTI_SPAN"],
      },
      {
        label: "skew 45",
        input: withScope({ skewDegrees: 45 }),
        codes: ["AP00_SCOPE_SKEW_NOT_90"],
      },
      {
        label: "composite deck",
        input: withScope({ deckType: Phase1DeckType.COMPOSITE }),
        codes: ["AP00_SCOPE_COMPOSITE_DECK"],
      },
      {
        label: "steel deck",
        input: withScope({ deckType: Phase1DeckType.STEEL_DECK }),
        codes: ["AP00_SCOPE_STEEL_DECK"],
      },
      {
        label: "PC slab",
        input: withScope({ deckType: Phase1DeckType.PC_SLAB }),
        codes: ["AP00_SCOPE_PC_SLAB"],
      },
      {
        label: "box girder",
        input: withScope({ girderSection: Phase1GirderSection.BOX_GIRDER }),
        codes: ["AP00_SCOPE_BOX_GIRDER"],
      },
      {
        label: "curved alignment",
        input: withScope({ alignment: Phase1Alignment.CURVED }),
        codes: ["AP00_SCOPE_CURVED_ALIGNMENT"],
      },
      {
        label: "nonlinear analysis",
        input: withScope({ analysisType: Phase1AnalysisType.NONLINEAR }),
        codes: ["AP00_SCOPE_NONLINEAR_ANALYSIS"],
      },
      {
        label: "eigen analysis",
        input: withScope({ analysisType: Phase1AnalysisType.EIGEN }),
        codes: ["AP00_SCOPE_DYNAMIC_ANALYSIS"],
      },
      {
        label: "response spectrum",
        input: withScope({ analysisType: Phase1AnalysisType.RESPONSE_SPECTRUM }),
        codes: ["AP00_SCOPE_DYNAMIC_ANALYSIS"],
      },
      {
        label: "time history",
        input: withScope({ analysisType: Phase1AnalysisType.TIME_HISTORY }),
        codes: ["AP00_SCOPE_DYNAMIC_ANALYSIS"],
      },
      {
        label: "variable depth",
        input: withScope({ girderDepth: Phase1GirderDepth.VARIABLE }),
        codes: ["AP00_SCOPE_VARIABLE_DEPTH"],
      },
      {
        label: "girder count too low",
        input: withScope({ girderCount: PHASE1_GIRDER_COUNT_MIN - 1 }),
        codes: ["AP00_SCOPE_GIRDER_COUNT_OUT_OF_RANGE"],
      },
      {
        label: "girder count too high",
        input: withScope({ girderCount: PHASE1_GIRDER_COUNT_MAX + 1 }),
        codes: ["AP00_SCOPE_GIRDER_COUNT_OUT_OF_RANGE"],
      },
    ];

    it.each(negativeCases)("$label is OUT_OF_SCOPE with stable codes", ({ input, codes }) => {
      const result = validatePhase1Scope(input);
      expect(result.ok).toBe(false);
      expect(result.scopeStatus).toBe(Phase1ScopeStatus.OUT_OF_SCOPE);
      expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(codes));
    });
  });

  describe("unresolved unknown inputs (fail-closed)", () => {
    const unresolvedCases: Array<{
      label: string;
      input: Phase1BridgeScopeInput;
      codes: string[];
    }> = [
      {
        label: "unknown alignment",
        input: withScope({ alignment: Phase1Alignment.UNKNOWN }),
        codes: ["AP00_SCOPE_ALIGNMENT_UNKNOWN"],
      },
      {
        label: "unknown deck",
        input: withScope({ deckType: Phase1DeckType.UNKNOWN }),
        codes: ["AP00_SCOPE_DECK_UNKNOWN"],
      },
      {
        label: "unknown section",
        input: withScope({ girderSection: Phase1GirderSection.UNKNOWN }),
        codes: ["AP00_SCOPE_SECTION_UNKNOWN"],
      },
      {
        label: "unknown span",
        input: withScope({ spanSystem: Phase1SpanSystem.UNKNOWN }),
        codes: ["AP00_SCOPE_SPAN_UNKNOWN"],
      },
      {
        label: "null skew",
        input: withScope({ skewDegrees: null }),
        codes: ["AP00_SCOPE_SKEW_UNKNOWN"],
      },
      {
        label: "unknown analysis",
        input: withScope({ analysisType: Phase1AnalysisType.UNKNOWN }),
        codes: ["AP00_SCOPE_ANALYSIS_UNKNOWN"],
      },
      {
        label: "unknown depth",
        input: withScope({ girderDepth: Phase1GirderDepth.UNKNOWN }),
        codes: ["AP00_SCOPE_DEPTH_UNKNOWN"],
      },
      {
        label: "null girder count",
        input: withScope({ girderCount: null }),
        codes: ["AP00_SCOPE_GIRDER_COUNT_UNKNOWN"],
      },
    ];

    it.each(unresolvedCases)("$label is UNRESOLVED", ({ input, codes }) => {
      const result = validatePhase1Scope(input);
      expect(result.ok).toBe(false);
      expect(result.scopeStatus).toBe(Phase1ScopeStatus.UNRESOLVED);
      expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(codes));
    });
  });
});
