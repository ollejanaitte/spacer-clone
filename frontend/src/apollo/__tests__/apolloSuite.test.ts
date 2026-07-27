import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APOLLO_TESTS_DIR = join(import.meta.dirname);
const EXPECTED_APOLLO_TEST_MODULES = [
  "ApolloPhase1Shell.test.tsx",
  "apolloSourceHygiene.test.ts",
  "apolloSuite.test.ts",
  "entryGuard.test.ts",
  "errors.test.ts",
  "featureFlag.test.ts",
  "numericAuthorityGuard.test.ts",
  "phase1ScopeGuard.test.ts",
  "testingHelpers.test.ts",
] as const;

describe("apollo AP-00 test suite discoverability", () => {
  it("documents the npm command to run all Apollo tests", () => {
    expect("npm test -- --run src/apollo").toMatch(/src\/apollo/);
  });

  it("includes every expected AP-00 test module under __tests__", () => {
    const discovered = readdirSync(APOLLO_TESTS_DIR)
      .filter((name) => name.endsWith(".test.ts") || name.endsWith(".test.tsx"))
      .sort();

    expect(discovered).toEqual([...EXPECTED_APOLLO_TEST_MODULES].sort());
  });
});
