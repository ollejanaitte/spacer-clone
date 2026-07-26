import {
  createGuardIssue,
  createGuardResult,
  type ApolloGuardIssue,
  type ApolloGuardResult,
} from "./errors";
import {
  GoldenRegistrationKind,
  NumericAuthority,
  TargetStandardStatus,
  type GoldenExpectedRegistrationInput,
  type NumericAuthorityContext,
  type NumericValueRecord,
} from "./types";

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isTreatableAsAdopted(authority: NumericAuthority): boolean {
  return authority === NumericAuthority.ADOPTED;
}

/** Returns the numeric value or null; never coerces null/undefined to zero. */
export function resolveNumericValue(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return value;
}

export function assertNoNullCoercion(value: number | null | undefined): ApolloGuardResult {
  if (value === null || value === undefined) {
    return createGuardResult([createGuardIssue("AP00_NUMERIC_NULL_COERCION")]);
  }
  return createGuardResult([]);
}

export function validateNumericAuthority(
  record: NumericValueRecord,
  context: NumericAuthorityContext,
  path = "value",
): ApolloGuardResult {
  const issues: ApolloGuardIssue[] = [];

  if (record.authority === NumericAuthority.ADOPTED) {
    if (context.targetStandardStatus === TargetStandardStatus.NOT_SELECTED) {
      issues.push(
        createGuardIssue("AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD", `${path}.authority`),
      );
    }
    if (!isNonEmptyString(record.sourceLocator)) {
      issues.push(createGuardIssue("AP00_NUMERIC_ADOPTED_MISSING_SOURCE", `${path}.sourceLocator`));
    }
    if (!isNonEmptyString(record.decisionId)) {
      issues.push(createGuardIssue("AP00_NUMERIC_ADOPTED_MISSING_DECISION", `${path}.decisionId`));
    }
  }

  return createGuardResult(issues);
}

export function rejectPlaceholderAsAdopted(
  authority: NumericAuthority,
  path = "authority",
): ApolloGuardResult {
  if (authority === NumericAuthority.PLACEHOLDER) {
    return createGuardResult([createGuardIssue("AP00_NUMERIC_PLACEHOLDER_AS_ADOPTED", path)]);
  }
  return createGuardResult([]);
}

export function validateGoldenExpectedRegistration(
  input: GoldenExpectedRegistrationInput,
): ApolloGuardResult {
  if (input.registrationKind === GoldenRegistrationKind.GOLDEN_EXPECTED) {
    return createGuardResult([
      createGuardIssue(
        "AP00_NUMERIC_GOLDEN_EXPECTED_FORBIDDEN",
        input.fixtureId !== undefined ? `fixtureId:${input.fixtureId}` : "registrationKind",
      ),
    ]);
  }
  return createGuardResult([]);
}

export function validateNumericRecord(
  record: NumericValueRecord,
  context: NumericAuthorityContext,
  path = "value",
): ApolloGuardResult {
  const issues: ApolloGuardIssue[] = [
    ...validateNumericAuthority(record, context, path).issues,
  ];

  if (record.authority !== NumericAuthority.PLACEHOLDER) {
    issues.push(...assertNoNullCoercion(record.value).issues);
  }

  return createGuardResult(issues);
}

/** Use when a numeric record is consumed as authoritative (fail-closed on PLACEHOLDER). */
export function validateNumericRecordForAdoption(
  record: NumericValueRecord,
  context: NumericAuthorityContext,
  path = "value",
): ApolloGuardResult {
  const issues: ApolloGuardIssue[] = [
    ...rejectPlaceholderAsAdopted(record.authority, `${path}.authority`).issues,
    ...validateNumericRecord(record, context, path).issues,
  ];
  return createGuardResult(issues);
}
