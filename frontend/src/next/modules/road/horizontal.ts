import {
  evaluateAlignmentAtDistance,
  evaluateElementAtDistance,
  evaluateElementEndState,
  totalAlignmentLength,
  validateAlignment,
} from "../../../liner/core/geometry/horizontal";
import {
  evaluateStraightElement,
} from "../../../liner/core/geometry/line";
import {
  evaluateCircularArcElement,
  signedArcCurvature,
} from "../../../liner/core/geometry/arc";
import {
  clothoidCurvatureAt,
  evaluateClothoidElement,
} from "../../../liner/core/geometry/clothoid";
import {
  checkC0Continuity,
} from "../../../liner/core/continuityC0";
import {
  checkC1Continuity,
} from "../../../liner/core/continuityC1";
import type {
  AlignmentElement,
  AlignmentEvaluation,
  ElementEvaluation,
  LinearAlignment,
  ValidationIssue,
} from "../../../liner/core/types";

/**
 * Phase 2-02: Horizontal alignment core.
 * Reuses the proven LINER pure-geometry implementation (KEEP/ADAPT per the
 * Phase 2-A audit). No re-implementation; no Project JSON mutation.
 */
export {
  evaluateAlignmentAtDistance,
  evaluateElementAtDistance,
  evaluateElementEndState,
  totalAlignmentLength,
  validateAlignment,
  evaluateStraightElement,
  evaluateCircularArcElement,
  signedArcCurvature,
  clothoidCurvatureAt,
  evaluateClothoidElement,
  checkC0Continuity,
  checkC1Continuity,
};

export type {
  AlignmentElement,
  AlignmentEvaluation,
  ElementEvaluation,
  LinearAlignment,
  ValidationIssue,
};

export interface RoadHorizontalEvaluation {
  readonly ok: boolean;
  readonly issues: readonly ValidationIssue[];
  readonly totalLength: number;
  readonly evaluateAt: (distance: number, station?: number) => AlignmentEvaluation;
}

export function createRoadHorizontal(alignment: LinearAlignment): RoadHorizontalEvaluation {
  const issues = validateAlignment(alignment);
  return {
    ok: issues.length === 0,
    issues,
    totalLength: totalAlignmentLength(alignment),
    evaluateAt: (distance, station) => evaluateAlignmentAtDistance(alignment, distance, station ?? distance),
  };
}
