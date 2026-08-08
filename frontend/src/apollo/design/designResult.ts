/**
 * Design result model (Phase 7).
 *
 * Container for design results (reactions / member forces / checks). All numeric
 * values remain NOT_AUTHORIZED until the Phase A numeric-authorization gates clear
 * (OWN-026); the framework carries authorization + traceability.
 */

export type DesignAuthorization = "NOT_GRANTED";

export type DesignCheckPart = {
  id: string;
  kind: "mainGirder" | "crossBeam" | "bracing" | "deck" | "bearing" | "stiffener" | "splice";
  state: "NOT_AUTHORIZED";
  message: string;
};

export type DesignResult = {
  bridgeId: string;
  authorization: DesignAuthorization;
  reactions: { state: "NOT_AUTHORIZED"; message: string };
  memberForces: { state: "NOT_AUTHORIZED"; message: string };
  checks: DesignCheckPart[];
  traceability: { entityId: string; source: string }[];
};

export function emptyNotAuthorizedResult(
  bridgeId: string,
  checks: string[],
  traceability: { entityId: string; source: string }[] = [],
): DesignResult {
  return {
    bridgeId,
    authorization: "NOT_GRANTED",
    reactions: {
      state: "NOT_AUTHORIZED",
      message: "Reactions not authorized (NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED).",
    },
    memberForces: {
      state: "NOT_AUTHORIZED",
      message: "Member forces not authorized (NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED).",
    },
    checks: checks.map((id) => ({
      id,
      kind: "mainGirder",
      state: "NOT_AUTHORIZED",
      message: "Check not authorized (Phase A numeric gate pending).",
    })),
    traceability,
  };
}
