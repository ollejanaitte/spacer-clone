import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APOLLO_TESTS_DIR = join(import.meta.dirname);
const EXPECTED_APOLLO_TEST_MODULES = [
  "ApolloNumericInput.test.tsx",
  "ApolloPhase1Shell.test.tsx",
  "ApolloRouteHost.test.tsx",
  "BridgeStructureInputPanel.test.tsx",
  "CompositionAwareInput.test.tsx",
  "adoption.test.ts",
  "apolloSourceHygiene.test.ts",
  "apolloStlExport.test.ts",
  "apolloSuite.test.ts",
  "bridgeStructureQuantities.test.ts",
  "bridgeStructureVisualization.test.ts",
  "bridgeStructureWorkflow.test.ts",
  "bracingSystemGeometry.test.ts",
  "bulkEdit.test.ts",
  "clipboard.test.ts",
  "continuousGirderLayout.test.ts",
  "continuousGirderSample.test.ts",
  "continuousGirderVisualization.test.ts",
  "dirtyFingerprint.test.ts",
  "entryGuard.test.ts",
  "errors.test.ts",
  "featureFlag.test.ts",
  "history.test.ts",
  "importExport.test.ts",
  "numericAuthorityGuard.test.ts",
  "numericInput.test.ts",
  "phase1ScopeGuard.test.ts",
  "projectId.test.ts",
  "searchFilter.test.ts",
  "sectionProperties.test.ts",
  "selection.test.ts",
  "simpleSingleSpanSample.test.ts",
  "simpleSingleSpanWorkflow.test.ts",
  "testingHelpers.test.ts",
  "unit2Draft.test.ts",
  "unsavedChangesGuard.test.ts",
  "validationNavigator.test.ts",
  "visualizationBoundsBracing.test.ts",
  "visualizationBuilder.test.ts",
  "workspace.test.ts",
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
