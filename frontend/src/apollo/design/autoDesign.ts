/**
 * Automatic design / section decision framework (Phase 8).
 *
 * Declares section candidates and runs the design iteration loop (candidate ->
 * check -> NG -> next candidate). Because numeric checks are NOT_AUTHORIZED until
 * the Phase A gates clear, the decision state stays PENDING_AUTHORIZATION; the
 * framework carries candidates, iteration state and traceability without
 * fabricating converged results.
 */

import type { GeometrySnapshot } from "../geometry";
import type { DesignConditions } from "./designConditions";
import { RB001_DESIGN_CONDITIONS } from "./designConditions";
import type { DesignResult } from "./designResult";
import { runChecks } from "./checkFramework";

export type SectionCandidate = {
  id: string;
  depthM: number;
  flangeWidthM: number;
  webThicknessM: number;
  flangeThicknessM: number;
  source: string;
};

/** Declared RB-001 main-girder section candidates (golden-derived where available). */
export const RB001_SECTION_CANDIDATES: SectionCandidate[] = [
  {
    id: "SEC-AG1-BASE",
    depthM: 2.7, // G-GEO-0008 girder height
    flangeWidthM: 0.62, // G-GEO-0020 upper flange width
    webThicknessM: 0.014, // G-GEO-0022 web thickness
    flangeThicknessM: 0.03,
    source: "RB-001 golden (G-GEO-0008/0020/0022) + declared flange thickness",
  },
];

export type DesignIterationState = {
  candidateIndex: number;
  decision: "PENDING_AUTHORIZATION";
  reason: string;
};

export type DesignIteration = {
  bridgeId: string;
  candidates: SectionCandidate[];
  selectedCandidateId: string | null;
  state: DesignIterationState;
  result: DesignResult;
};

/**
 * Run the declared design iteration. The first candidate is selected as the
 * working candidate; the check step is NOT_AUTHORIZED so the decision remains
 * PENDING_AUTHORIZATION (no fabricated convergence).
 */
export function runDesignIteration(input: {
  snapshot: GeometrySnapshot;
  conditions?: DesignConditions;
  candidates?: SectionCandidate[];
}): DesignIteration {
  const conditions = input.conditions ?? RB001_DESIGN_CONDITIONS;
  const candidates = input.candidates ?? RB001_SECTION_CANDIDATES;
  const result = runChecks({ snapshot: input.snapshot, conditions });
  return {
    bridgeId: input.snapshot.bridgeId,
    candidates,
    selectedCandidateId: candidates[0]?.id ?? null,
    state: {
      candidateIndex: 0,
      decision: "PENDING_AUTHORIZATION",
      reason: "Numeric checks NOT_AUTHORIZED (Phase A gate); section decision requires GRANTED checks.",
    },
    result,
  };
}
