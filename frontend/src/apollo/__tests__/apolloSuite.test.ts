import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APOLLO_TESTS_DIR = join(import.meta.dirname);
const EXPECTED_APOLLO_TEST_MODULES = [
  "AnalysisDevelopmentProbePanel.test.tsx",
  "ApolloNumericInput.test.tsx",
  "ApolloPhase1Shell.test.tsx",
  "ApolloRouteHost.test.tsx",
  "BridgeStructureInputPanel.test.tsx",
  "CompositionAwareInput.test.tsx",
  "DeckAppurtenanceHaunchPanels.test.tsx",
  "DemandCheckDevelopmentPanel.test.tsx",
  "WorkflowControlScreen.test.tsx",
  "adoption.test.ts",
  "apolloSourceHygiene.test.ts",
  "apolloStlExport.test.ts",
  "apolloSuite.test.ts",
  "artifactBundle.test.ts",
  "bracingSystemGeometry.test.ts",
  "bridgeStructureQuantities.test.ts",
  "bridgeStructureVisualization.test.ts",
  "bridgeStructureWorkflow.test.ts",
  "bulkEdit.test.ts",
  "clipboard.test.ts",
  "continuousGirderLayout.test.ts",
  "continuousGirderSample.test.ts",
  "continuousGirderVisualization.test.ts",
  "dirtyFingerprint.test.ts",
  "drawingModel.test.ts",
  "drawingSetModel.test.ts",
  "entryGuard.test.ts",
  "errors.test.ts",
  "featureFlag.test.ts",
  "history.test.ts",
  "importExport.test.ts",
  "numericAuthorityGuard.test.ts",
  "numericInput.test.ts",
  "outputIntegration.test.ts",
  "phase1ScopeGuard.test.ts",
  "projectId.test.ts",
  "quantityModel.test.ts",
  "reportModel.test.ts",
  "searchFilter.test.ts",
  "sectionProperties.test.ts",
  "selection.test.ts",
  "simpleSingleSpanSample.test.ts",
  "simpleSingleSpanWorkflow.test.ts",
  "step4bAppurtenanceHaunch.test.ts",
  "step4c2AppurtenanceHaunchSolids.test.ts",
  "step4c3AppurtenanceHaunchQuantity.test.ts",
  "step4c4AppurtenanceHaunchLoad.test.ts",
  "step4c5AppurtenanceHaunchAnalysis.test.ts",
  "step4c6Integration.test.ts",
  "step5p3PavementMarkings.test.ts",
  "step5p4p5TopologyLAngle.test.ts",
  "step5p6p7IntegrationCloseout.test.ts",
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
