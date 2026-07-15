import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";

export const CAPABILITY_STATES = [
  "supported",
  "absent",
  "partial",
  "unknown",
] as const;

export type CapabilityState = (typeof CAPABILITY_STATES)[number];

export interface CapabilityBlock {
  readonly state: CapabilityState;
}

const CAPABILITY_STATE_SET = new Set<string>(CAPABILITY_STATES);

export function isCapabilityState(value: string): value is CapabilityState {
  return CAPABILITY_STATE_SET.has(value);
}

export function validateCapabilityBlock(
  block: Partial<CapabilityBlock> | undefined,
  path: string,
): ValidationResult {
  if (block === undefined) {
    return createValidationResult([]);
  }

  const issues: ValidationIssue[] = [];

  if (
    block.state === undefined ||
    typeof block.state !== "string" ||
    !isCapabilityState(block.state)
  ) {
    issues.push(
      createValidationIssue({
        code: "CAPABILITY_STATE_INVALID",
        severity: "error",
        message: `state must be one of: ${CAPABILITY_STATES.join(", ")}.`,
        path: `${path}/state`,
      }),
    );
  }

  return createValidationResult(issues);
}
