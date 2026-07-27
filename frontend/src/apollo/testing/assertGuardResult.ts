/**
 * Assert helpers for Apollo fail-closed guard results.
 */

import { expect } from "vitest";
import type { ApolloGuardResult } from "../errors";
import type { Phase1ScopeStatus } from "../types";

export type GuardFailExpectation = {
  readonly codes?: readonly string[];
  readonly scopeStatus?: Phase1ScopeStatus;
};

export function assertGuardOk(result: ApolloGuardResult): void {
  expect(result.ok).toBe(true);
  expect(result.issues).toHaveLength(0);
}

export function assertGuardFailsClosed(
  result: ApolloGuardResult,
  expectation: GuardFailExpectation = {},
): void {
  expect(result.ok).toBe(false);
  expect(result.issues.length).toBeGreaterThan(0);

  if (expectation.codes !== undefined) {
    assertGuardIssueCodes(result, expectation.codes);
  }
}

export function assertGuardIssueCodes(
  result: ApolloGuardResult,
  codes: readonly string[],
): void {
  const actualCodes = result.issues.map((issue) => issue.code);
  expect(actualCodes).toEqual(expect.arrayContaining([...codes]));
}

export function assertGuardIssuePaths(
  result: ApolloGuardResult,
  paths: readonly string[],
): void {
  const actualPaths = result.issues
    .map((issue) => issue.path)
    .filter((path): path is string => path !== undefined);
  expect(actualPaths).toEqual(expect.arrayContaining([...paths]));
}
