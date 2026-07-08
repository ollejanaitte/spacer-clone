import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { makeInitialBridgeProject } from "../../bridge/BridgeWizardState";
import type { BridgeProject } from "../../bridge/types";
import {
  createBridgeDefinitionFromBridgeProject,
  validateBridgeProjectForBridgeDefinition,
} from "./fromBridgeProject";
import { BRIDGE_DEFINITION_SCHEMA_VERSION_LITERAL } from "../types";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const bridgeDefinitionSchema = JSON.parse(
  readFileSync(join(repoRoot, "schemas/bridge-definition.schema.json"), "utf8"),
);

function compileBridgeDefinitionValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  return ajv.compile(bridgeDefinitionSchema);
}

function createMinimalBridgeProject(): BridgeProject {
  return {
    id: "bridge-project-minimal",
    name: "Minimal Bridge Project",
    schemaVersion: "0.1.0",
    crossSection: {
      lane_count: 2,
      lane_width: 3.5,
      median_width: 0,
      sidewalk_width: 0,
      barrier_width: 0,
    },
    spans: [{ index: 1, length: 30, offset: 0 }],
    impactFactor: { value: 0, auto: true },
    lines: [],
    loads: [],
    generationSettings: {
      mesh_division: 4,
      mesh_density: "standard",
    },
  };
}

function createRichBridgeProject(): BridgeProject {
  return {
    ...createMinimalBridgeProject(),
    id: "bridge-project-rich",
    name: "Rich Bridge Project",
    spans: [
      { index: 1, length: 20, offset: 0 },
      { index: 2, length: 25, offset: 0 },
    ],
    impactFactor: { value: 0.2, auto: false },
    lines: [
      {
        id: "line-traffic-1",
        type: "traffic",
        name: "Traffic Line 1",
        points: [
          [0, -3.5, 0],
          [45, -3.5, 0],
        ],
      },
      {
        id: "line-load-1",
        type: "load",
        name: "Load Line 1",
        points: [
          [0, 3.5, 0],
          [45, 3.5, 0],
        ],
      },
      {
        id: "line-ref-1",
        type: "reference",
        name: "Reference Line",
        points: [
          [0, 0, 0],
          [45, 0, 0],
        ],
      },
    ],
    loads: [
      {
        id: "load-1",
        type: "distributed",
        name: "DL",
        magnitude: 10,
        direction: "-Y",
        line_id: "line-load-1",
        loadCaseId: "LC-DL",
      },
      {
        id: "load-2",
        type: "vehicle",
        name: "LL",
        magnitude: 100,
        direction: "-Y",
      },
    ],
    generationSettings: {
      mesh_division: 8,
      mesh_density: "fine",
      girder_spacing_override: 2.5,
      materialId: "mat-steel",
      sectionId: "sec-girder",
    },
  };
}

describe("createBridgeDefinitionFromBridgeProject", () => {
  const validate = compileBridgeDefinitionValidator();

  it("creates a valid BridgeDefinition from a minimal BridgeProject", () => {
    const bridgeProject = createMinimalBridgeProject();
    const result = createBridgeDefinitionFromBridgeProject(bridgeProject);

    expect(result.schemaVersion).toBe(BRIDGE_DEFINITION_SCHEMA_VERSION_LITERAL);
    expect(result.id).toBe("bridge-project-minimal");
    expect(result.name).toBe("Minimal Bridge Project");
    expect(result.source).toEqual({
      kind: "bridgeProject",
      bridgeProjectId: "bridge-project-minimal",
    });
    expect(result.spans).toHaveLength(1);
    expect(result.spans[0]).toMatchObject({
      id: "span-1",
      index: 1,
      startStation: 0,
      endStation: 30,
      length: 30,
    });
    expect(result.crossBeams).toEqual([]);
    expect(result.bearings).toEqual([]);
    expect(result.loads).toEqual([]);
    expect(result.deck.width).toBeGreaterThan(0);
    expect(result.girders.length).toBeGreaterThan(0);
    expect(validate(result)).toBe(true);
  });

  it("does not mutate the input BridgeProject", () => {
    const bridgeProject = createRichBridgeProject();
    const before = structuredClone(bridgeProject);

    createBridgeDefinitionFromBridgeProject(bridgeProject, {
      id: "bd-custom-id",
      name: "Custom Name",
      generatedAt: "2026-07-09T00:00:00.000Z",
    });

    expect(bridgeProject).toEqual(before);
  });

  it("applies options.id, name, and generatedAt deterministically", () => {
    const bridgeProject = createMinimalBridgeProject();
    const generatedAt = "2026-07-09T12:00:00.000Z";

    const result = createBridgeDefinitionFromBridgeProject(bridgeProject, {
      id: "bd-explicit-id",
      name: "Explicit Bridge Name",
      generatedAt,
      coordinatePolicyId: "custom-wizard-policy",
      sourceProjectId: "wizard-project-doc-1",
    });

    expect(result.id).toBe("bd-explicit-id");
    expect(result.name).toBe("Explicit Bridge Name");
    expect(result.metadata.createdAt).toBe(generatedAt);
    expect(result.metadata.updatedAt).toBe(generatedAt);
    expect(result.coordinatePolicy.policyId).toBe("custom-wizard-policy");
    expect(result.source).toEqual({
      kind: "bridgeProject",
      bridgeProjectId: "wizard-project-doc-1",
    });
  });

  it("maps spans, lines, loads, and generationSettings when present", () => {
    const bridgeProject = createRichBridgeProject();
    const result = createBridgeDefinitionFromBridgeProject(bridgeProject);

    expect(result.spans).toHaveLength(2);
    expect(result.spans[0]).toMatchObject({
      id: "span-1",
      startStation: 0,
      endStation: 20,
      length: 20,
    });
    expect(result.spans[1]).toMatchObject({
      id: "span-2",
      startStation: 20,
      endStation: 45,
      length: 25,
    });
    expect(result.supports.length).toBeGreaterThanOrEqual(2);
    expect(result.supports[0]).toMatchObject({
      id: "support-start",
      station: 0,
      kind: "fixed",
      substructureKind: "abutment",
    });
    expect(result.girders).toHaveLength(3);
    expect(result.girders[0]).toMatchObject({
      id: "line-traffic-1",
      role: "main",
      offset: -3.5,
      spanIds: ["span-1", "span-2"],
      sectionRefId: "sec-girder",
      materialRefId: "mat-steel",
    });
    expect(result.girders[2]).toMatchObject({
      id: "line-ref-1",
      role: "custom",
    });
    expect(result.loads).toHaveLength(2);
    expect(result.loads[0]).toMatchObject({
      id: "load-1",
      caseId: "LC-DL",
      target: { kind: "line", refId: "line-load-1" },
      impactFactor: 0.2,
    });
    expect(result.loads[1]).toMatchObject({
      id: "load-2",
      caseId: "LC1",
      target: { kind: "deck", refId: "deck-default" },
      impactFactor: 0.2,
    });
    expect(result.generationSettings).toMatchObject({
      meshDivision: 8,
      meshDensity: "fine",
      girderSpacingOverride: 2.5,
      defaultMaterialId: "mat-steel",
      defaultSectionId: "sec-girder",
    });
    expect(result.alignmentRefs[0]).toMatchObject({
      alignmentId: "bridge-project-rich-ref-line-ref-1",
      originStation: 0,
      totalLength: 45,
    });
    expect(validate(result)).toBe(true);
  });

  it("records missing information as warnings in metadata notes and safe defaults", () => {
    const bridgeProject = createMinimalBridgeProject();
    const warnings = validateBridgeProjectForBridgeDefinition(bridgeProject);

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((warning) => warning.includes("lines"))).toBe(true);
    expect(warnings.some((warning) => warning.includes("loads"))).toBe(true);

    const result = createBridgeDefinitionFromBridgeProject(bridgeProject);
    expect(result.crossBeams).toEqual([]);
    expect(result.bearings).toEqual([]);
    expect(result.loads).toEqual([]);
    expect(result.metadata.notes).toContain("Warnings:");
    expect(result.metadata.notes).toContain("lines");
  });

  it("maps makeInitialBridgeProject fixture and passes JSON Schema validation", () => {
    const bridgeProject = makeInitialBridgeProject("Wizard Sample", "wizard-bridge-1");
    const result = createBridgeDefinitionFromBridgeProject(bridgeProject, {
      generatedAt: "2026-07-09T00:00:00.000Z",
    });

    expect(result.spans.length).toBeGreaterThan(0);
    expect(result.girders.length).toBeGreaterThan(0);
    expect(result.stations.length).toBeGreaterThan(0);
    expect(validate(result)).toBe(true);
  });

  it("throws when spans are empty", () => {
    const bridgeProject = createMinimalBridgeProject();
    bridgeProject.spans = [];

    expect(() => createBridgeDefinitionFromBridgeProject(bridgeProject)).toThrow(
      /spans must contain at least one span/,
    );
  });

  it("throws when no span has a positive length", () => {
    const bridgeProject = createMinimalBridgeProject();
    bridgeProject.spans = [{ index: 1, length: 0, offset: 0 }];

    expect(() => createBridgeDefinitionFromBridgeProject(bridgeProject)).toThrow(
      /no span could be mapped with a positive length/,
    );
  });
});
