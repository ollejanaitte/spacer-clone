import type { ValueStatus } from "./businessReadiness";

export type ConfirmationBlockReason =
  | "NOT_AUTHORIZED"
  | "BLOCKED"
  | "CYCLE_GUARD"
  | "NEEDS_CONFIRMATION"
  | "VALIDATION_ERROR";

export interface ConfirmationGateState {
  readonly blocked: boolean;
  readonly blockReasons: readonly ConfirmationBlockReason[];
  readonly warningCount: number;
  readonly needsUserConfirmation: boolean;
  readonly nextAction: string | null;
}

export interface ConfirmationGateInput {
  readonly notAuthorizedSections: readonly string[];
  readonly needsUserConfirmation: boolean;
  readonly cycleGuardActive: boolean;
  readonly validationErrors: number;
  readonly validationWarnings: number;
  readonly nextAction?: string | null;
}

export function evaluateConfirmationGate(input: ConfirmationGateInput): ConfirmationGateState {
  const blockReasons: ConfirmationBlockReason[] = [];

  if (input.notAuthorizedSections.length > 0) {
    blockReasons.push("NOT_AUTHORIZED");
  }
  if (input.validationErrors > 0) {
    blockReasons.push("VALIDATION_ERROR");
  }
  if (input.cycleGuardActive) {
    blockReasons.push("CYCLE_GUARD");
  }
  if (input.needsUserConfirmation) {
    blockReasons.push("NEEDS_CONFIRMATION");
  }

  // A blocked state is authoritative; an empty reason list means not blocked.
  const blocked =
    input.notAuthorizedSections.length > 0 ||
    input.validationErrors > 0 ||
    input.cycleGuardActive;

  return {
    blocked,
    blockReasons,
    warningCount: input.validationWarnings,
    needsUserConfirmation: input.needsUserConfirmation,
    nextAction: input.nextAction ?? null,
  };
}

export function isStatusBlocking(status: ValueStatus): boolean {
  return status === "NOT_AUTHORIZED";
}
