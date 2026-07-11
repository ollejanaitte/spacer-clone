import { describe, expect, it } from "vitest";
import { bridgeRegressionFixtures } from "../__fixtures__/bridgeRegressionFixtures";
import {
  createMinimalLinerBridgeForStructureParity,
  semanticParityGoldenFixtureName,
  withIsolatedNode,
  withRemovedMember,
  withSectionPropertyChange,
  withShiftedNodeCoordinate,
  withSupportFixityChange,
} from "../__fixtures__/semanticParityGoldenFixtures";
import {
  compareGeneratedProjectModels,
  createLinerStructureOnlySourceMeta,
  createSemanticParityReportForGeneratedModels,
  generateBridgeDefinitionProjectModelFromBridgeProject,
  generateBridgeDefinitionProjectModelFromLinerBridge,
  SEMANTIC_PARITY_GOLDEN_GENERATED_AT,
} from "../semanticParity/generatedModelParity";
import {
  compareRealRouteModels,
  createRealRouteSemanticParityEnvelope,
  generateExplicitBridgeDefinitionProjectModel,
  generateRealRouteProjectModels,
  readGoldenSemanticParityEnvelope,
  serializeGoldenSemanticParityEnvelope,
  shuffleProjectModelArrays,
} from "./semanticParityHelpers";

describe("semantic parity real-route golden", () => {
  it("matches deterministic golden report for single-span-simple real route", () => {
    const fixture = bridgeRegressionFixtures.find((entry) => entry.name === semanticParityGoldenFixtureName);
    expect(fixture).toBeDefined();

    const actualEnvelope = createRealRouteSemanticParityEnvelope(fixture!.name, fixture!.project);
    const goldenEnvelope = readGoldenSemanticParityEnvelope("single-span-simple-real-route");
    const actual = serializeGoldenSemanticParityEnvelope(actualEnvelope);
    const golden = serializeGoldenSemanticParityEnvelope(goldenEnvelope);

    expect(actual).toBe(golden);
    expect(actualEnvelope.report.status).toBe(goldenEnvelope.report.status);
  });

  it("detects intentional geometry differences with stable golden report", () => {
    const fixture = bridgeRegressionFixtures.find((entry) => entry.name === semanticParityGoldenFixtureName);
    expect(fixture).toBeDefined();

    const baseline = generateRealRouteProjectModels(fixture!.project).legacy;
    const shifted = withShiftedNodeCoordinate(baseline, baseline.nodes[0].id, { x: 0.5 });
    const envelope = createSemanticParityReportForGeneratedModels(baseline, shifted, {
      leftSource: "legacy",
      rightSource: "legacy",
      leftLabel: "geometry-baseline",
      rightLabel: "geometry-shifted",
      leftSourceMeta: {
        generatorRoute: "fixture/geometry-baseline",
        metadata: { fixtureName: "intentional-geometry-difference" },
      },
      rightSourceMeta: {
        generatorRoute: "fixture/geometry-shifted",
        metadata: { fixtureName: "intentional-geometry-difference" },
      },
    });

    expect(envelope.report.status).toBe("different");
    expect(envelope.report.metrics.geometry.equivalent).toBe(false);

    const actual = serializeGoldenSemanticParityEnvelope(envelope);
    const golden = serializeGoldenSemanticParityEnvelope(
      readGoldenSemanticParityEnvelope("intentional-geometry-difference"),
    );
    expect(actual).toBe(golden);
  });

  it("detects intentional topology differences with stable golden report", () => {
    const fixture = bridgeRegressionFixtures.find((entry) => entry.name === semanticParityGoldenFixtureName);
    expect(fixture).toBeDefined();

    const baseline = generateRealRouteProjectModels(fixture!.project).legacy;
    const memberToRemove = baseline.members[0]?.id;
    expect(memberToRemove).toBeDefined();

    const disconnected = withRemovedMember(baseline, memberToRemove!);
    const envelope = createSemanticParityReportForGeneratedModels(baseline, disconnected, {
      leftSource: "legacy",
      rightSource: "legacy",
      leftLabel: "topology-baseline",
      rightLabel: "topology-missing-member",
      leftSourceMeta: {
        generatorRoute: "fixture/topology-baseline",
        metadata: { fixtureName: "intentional-topology-difference" },
      },
      rightSourceMeta: {
        generatorRoute: "fixture/topology-missing-member",
        metadata: { fixtureName: "intentional-topology-difference" },
      },
    });

    expect(envelope.report.status).toBe("different");

    const actual = serializeGoldenSemanticParityEnvelope(envelope);
    const golden = serializeGoldenSemanticParityEnvelope(
      readGoldenSemanticParityEnvelope("intentional-topology-difference"),
    );
    expect(actual).toBe(golden);
  });

  it("detects intentional support and property differences with stable golden report", () => {
    const fixture = bridgeRegressionFixtures.find((entry) => entry.name === semanticParityGoldenFixtureName);
    expect(fixture).toBeDefined();

    const baseline = generateRealRouteProjectModels(fixture!.project).legacy;
    const supportNodeId = baseline.supports[0]?.nodeId;
    const sectionId = baseline.sections[0]?.id;
    expect(supportNodeId).toBeDefined();
    expect(sectionId).toBeDefined();

    let mutated = withSupportFixityChange(baseline, supportNodeId!, { ux: false, uy: false, uz: false });
    mutated = withSectionPropertyChange(mutated, sectionId!, { area: (mutated.sections[0]?.area ?? 0) * 1.5 });

    const envelope = createSemanticParityReportForGeneratedModels(baseline, mutated, {
      leftSource: "legacy",
      rightSource: "legacy",
      leftLabel: "support-property-baseline",
      rightLabel: "support-property-mutated",
      leftSourceMeta: {
        generatorRoute: "fixture/support-property-baseline",
        metadata: { fixtureName: "intentional-support-property-difference" },
      },
      rightSourceMeta: {
        generatorRoute: "fixture/support-property-mutated",
        metadata: { fixtureName: "intentional-support-property-difference" },
      },
    });

    expect(envelope.report.status).toBe("different");
    expect(envelope.report.metrics.support.fixityMismatchCount).toBeGreaterThan(0);

    const actual = serializeGoldenSemanticParityEnvelope(envelope);
    const golden = serializeGoldenSemanticParityEnvelope(
      readGoldenSemanticParityEnvelope("intentional-support-property-difference"),
    );
    expect(actual).toBe(golden);
  });
});

describe("semantic parity real-route comparison", () => {
  it("compares legacy and bridge-definition routes through real generators", () => {
    const fixture = bridgeRegressionFixtures[0];
    const report = compareRealRouteModels(fixture.name, fixture.project);

    expect(report.counts.left.nodes).toBeGreaterThan(0);
    expect(report.counts.right.nodes).toBeGreaterThan(0);
    expect(["equivalent", "different", "indeterminate", "invalid"]).toContain(report.status);
  });

  it("uses explicit bridge-definition adapter route for project model generation", () => {
    const fixture = bridgeRegressionFixtures[0];
    const facadeModel = generateRealRouteProjectModels(fixture.project).bridgeDefinition;
    const explicitModel = generateExplicitBridgeDefinitionProjectModel(fixture.project);

    const report = compareGeneratedProjectModels(facadeModel, explicitModel, {
      leftSource: "bridgeDefinition",
      rightSource: "bridgeDefinition",
      leftLabel: "facade-route",
      rightLabel: "explicit-adapter-route",
    });

    expect(report.mismatches).toHaveLength(0);
    expect(report.counts.matched.nodes).toBe(report.counts.left.nodes);
    expect(report.counts.matched.members).toBe(report.counts.left.members);
    expect(report.counts.left).toEqual(report.counts.right);
  });

  it("produces identical golden reports when project arrays are reordered", () => {
    const fixture = bridgeRegressionFixtures[0];
    const models = generateRealRouteProjectModels(fixture.project);
    const baselineEnvelope = createRealRouteSemanticParityEnvelope(fixture.name, fixture.project);
    const shuffledEnvelope = createSemanticParityReportForGeneratedModels(
      shuffleProjectModelArrays(models.legacy),
      shuffleProjectModelArrays(models.bridgeDefinition),
      {
        leftSource: "legacy",
        rightSource: "bridgeDefinition",
        leftLabel: baselineEnvelope.sources.left.label,
        rightLabel: baselineEnvelope.sources.right.label,
        leftSourceMeta: baselineEnvelope.sources.left,
        rightSourceMeta: baselineEnvelope.sources.right,
        generatedAt: SEMANTIC_PARITY_GOLDEN_GENERATED_AT,
      },
    );

    const baselineGolden = serializeGoldenSemanticParityEnvelope(baselineEnvelope);
    const shuffledGolden = serializeGoldenSemanticParityEnvelope(shuffledEnvelope);

    expect(shuffledGolden).toBe(baselineGolden);
  });

  it("marks isolated-node topology mutation as invalid or different", () => {
    const fixture = bridgeRegressionFixtures[0];
    const baseline = generateRealRouteProjectModels(fixture.project).legacy;
    const mutated = withIsolatedNode(baseline, {
      id: "isolated-semantic-node",
      x: 99,
      y: 99,
      z: 0,
    });

    const report = compareGeneratedProjectModels(baseline, mutated, {
      leftSource: "legacy",
      rightSource: "legacy",
    });

    expect(["invalid", "different"]).toContain(report.status);
    expect(report.metrics.topology.left.isolatedNodeCount).toBe(0);
    expect(report.metrics.topology.right.isolatedNodeCount).toBeGreaterThan(0);
  });
});

describe("semantic parity liner structure-only route", () => {
  it("generates a project model from liner bridge without load mapping", () => {
    const linerBridge = createMinimalLinerBridgeForStructureParity();
    const project = generateBridgeDefinitionProjectModelFromLinerBridge(linerBridge, {
      generatedAt: SEMANTIC_PARITY_GOLDEN_GENERATED_AT,
    });

    expect(project.nodes.length).toBeGreaterThan(0);
    expect(project.members.length).toBeGreaterThan(0);
    expect(project.nodalLoads).toHaveLength(0);
    expect(project.memberLoads).toHaveLength(0);

    const sourceMeta = createLinerStructureOnlySourceMeta("liner-structure-only", linerBridge);
    expect(sourceMeta.metadata?.loadsMapped).toBe(false);
    expect(sourceMeta.generatorRoute).toBe("liner-bridge/bridge-definition");
  });

  it("compares liner route against bridge-project route as structure-only reference", () => {
    const linerBridge = createMinimalLinerBridgeForStructureParity();
    const linerModel = generateBridgeDefinitionProjectModelFromLinerBridge(linerBridge, {
      generatedAt: SEMANTIC_PARITY_GOLDEN_GENERATED_AT,
    });

    const bridgeProjectFixture = bridgeRegressionFixtures.find((entry) => entry.name === "single-span-simple");
    expect(bridgeProjectFixture).toBeDefined();

    const bridgeProjectModel = generateBridgeDefinitionProjectModelFromBridgeProject(
      bridgeProjectFixture!.project,
      { generatedAt: SEMANTIC_PARITY_GOLDEN_GENERATED_AT },
    );

    const report = compareGeneratedProjectModels(bridgeProjectModel, linerModel, {
      leftSource: "bridgeDefinition",
      rightSource: "liner",
      leftLabel: "bridge-project-route",
      rightLabel: "liner-structure-only",
      leftSourceMeta: {
        generatorRoute: "bridge-project/bridge-definition",
        metadata: { fixtureName: "single-span-simple", loadsMapped: true },
      },
      rightSourceMeta: createLinerStructureOnlySourceMeta("liner-structure-only", linerBridge),
    });

    expect(report.counts.left.nodes).toBeGreaterThan(0);
    expect(report.counts.right.nodes).toBeGreaterThan(0);
    expect(["equivalent", "different", "indeterminate", "invalid"]).toContain(report.status);
  });
});
