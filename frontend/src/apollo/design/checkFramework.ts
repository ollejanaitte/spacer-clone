/**
 * Design check framework (Phase 7).
 *
 * Defines the check registry for the superstructure design engine. Each check is
 * declared (id, kind, input sources, rule reference) but its numeric execution is
 * NOT_AUTHORIZED until the Phase A numeric-authorization gates clear
 * (STEP1_P05_CALCULATION_RULE_MATRIX, DS-05). The framework carries the declared
 * check set + authorization + traceability without implementing unauthorized
 * equations.
 */

import type { GeometrySnapshot } from "../geometry";
import type { DesignConditions } from "./designConditions";
import { RB001_DESIGN_CONDITIONS } from "./designConditions";
import type { DesignResult } from "./designResult";
import { emptyNotAuthorizedResult } from "./designResult";

export type CheckKind =
  | "mainGirder"
  | "crossBeam"
  | "bracing"
  | "deck"
  | "bearing"
  | "stiffener"
  | "splice";

export type DeclaredCheck = {
  id: string;
  kind: CheckKind;
  ruleReference: string;
  inputSource: string[];
  state: "NOT_AUTHORIZED";
};

/** Declared RB-001 check set (STEP1_P05 CALCULATION_RULE_MATRIX / DS-05). */
export const RB001_DECLARED_CHECKS: DeclaredCheck[] = [
  { id: "GIRDER-AG1-BENDING", kind: "mainGirder", ruleReference: "DS-05 main girder (7 limit states)", inputSource: ["grillage member forces", "section properties"], state: "NOT_AUTHORIZED" },
  { id: "GIRDER-AG1-SHEAR", kind: "mainGirder", ruleReference: "DS-05 main girder (7 limit states)", inputSource: ["grillage member forces"], state: "NOT_AUTHORIZED" },
  { id: "GIRDER-AG2-BENDING", kind: "mainGirder", ruleReference: "DS-05 main girder (7 limit states)", inputSource: ["grillage member forces", "section properties"], state: "NOT_AUTHORIZED" },
  { id: "GIRDER-AG2-SHEAR", kind: "mainGirder", ruleReference: "DS-05 main girder (7 limit states)", inputSource: ["grillage member forces"], state: "NOT_AUTHORIZED" },
  { id: "DECK-BENDING", kind: "deck", ruleReference: "DS-05 RC deck (4 states)", inputSource: ["deck loads", "deck section"], state: "NOT_AUTHORIZED" },
  { id: "CROSSBEAM-CHECK", kind: "crossBeam", ruleReference: "DS-05 floor system (7 states)", inputSource: ["grillage cross-girder forces"], state: "NOT_AUTHORIZED" },
  { id: "BRACING-CHECK", kind: "bracing", ruleReference: "DS-05 floor system (7 states)", inputSource: ["grillage bracing forces"], state: "NOT_AUTHORIZED" },
  { id: "BEARING-CHECK", kind: "bearing", ruleReference: "DS-05 bearing (4 states)", inputSource: ["reactions"], state: "NOT_AUTHORIZED" },
  { id: "STIFFENER-CHECK", kind: "stiffener", ruleReference: "DS-05 stiffener", inputSource: ["member forces"], state: "NOT_AUTHORIZED" },
  { id: "SPLICE-CHECK", kind: "splice", ruleReference: "DS-05 splice", inputSource: ["member forces"], state: "NOT_AUTHORIZED" },
];

export type RunChecksInput = {
  snapshot: GeometrySnapshot;
  conditions?: DesignConditions;
};

/**
 * Run the declared check set. Numeric execution is gated NOT_AUTHORIZED; the
 * framework returns the declared check registry + authorization + traceability.
 */
export function runChecks(input: RunChecksInput): DesignResult {
  const conditions = input.conditions ?? RB001_DESIGN_CONDITIONS;
  const traceability = input.snapshot.girderLines.map((l) => ({
    entityId: l.girderId,
    source: `snapshot girderLine ${l.girderId}`,
  }));
  const result = emptyNotAuthorizedResult(
    input.snapshot.bridgeId,
    RB001_DECLARED_CHECKS.map((c) => c.id),
    traceability,
  );
  return {
    ...result,
    checks: RB001_DECLARED_CHECKS.map((c) => ({
      id: c.id,
      kind: c.kind,
      state: c.state as "NOT_AUTHORIZED",
      message: `Check ${c.id} not authorized (${c.ruleReference}; Phase A numeric gate pending).`,
    })),
    traceability,
  };
}
