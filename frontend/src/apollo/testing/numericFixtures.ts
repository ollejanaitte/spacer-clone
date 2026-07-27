/**
 * PLACEHOLDER numeric record builders for AP-00 guard tests.
 * Does not emit ADOPTED records or golden expected values.
 */

import {
  GoldenRegistrationKind,
  NumericAuthority,
  TargetStandardStatus,
  type GoldenExpectedRegistrationInput,
  type NumericAuthorityContext,
  type NumericValueRecord,
} from "../types";

export const NOT_SELECTED_NUMERIC_CONTEXT: NumericAuthorityContext = {
  targetStandardStatus: TargetStandardStatus.NOT_SELECTED,
};

export const SELECTED_NUMERIC_CONTEXT: NumericAuthorityContext = {
  targetStandardStatus: TargetStandardStatus.SELECTED,
};

/** PLACEHOLDER record with null value — safe for planning shells. */
export function buildPlaceholderNumericRecord(
  overrides: Partial<NumericValueRecord> = {},
): NumericValueRecord {
  return {
    value: null,
    authority: NumericAuthority.PLACEHOLDER,
    ...overrides,
  };
}

/** USER_PROVIDED_UNVERIFIED record for shell-only paths (non-authoritative). */
export function buildUserProvidedNumericRecord(
  overrides: Partial<NumericValueRecord> = {},
): NumericValueRecord {
  return {
    value: null,
    authority: NumericAuthority.USER_PROVIDED_UNVERIFIED,
    ...overrides,
  };
}

/** Semantic-only golden registration input (no GOLDEN_EXPECTED). */
export function buildSemanticOnlyRegistration(
  overrides: Partial<GoldenExpectedRegistrationInput> = {},
): GoldenExpectedRegistrationInput {
  return {
    registrationKind: GoldenRegistrationKind.SEMANTIC_ONLY,
    ...overrides,
  };
}
